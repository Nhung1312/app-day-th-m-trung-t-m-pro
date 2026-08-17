import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQz-4TAujSNhDV8wQY82-wnCTGJtdxhsM",
  authDomain: "quan-ly-day-them-f7b1e.firebaseapp.com",
  projectId: "quan-ly-day-them-f7b1e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestoreDb = getFirestore(app);
const provider = new GoogleAuthProvider();
let currentUser = null; 

// ================= DATA STRUCTURE =================
const defaultData = { classes: [], students: [], holidays: [], sessions: [], attendance: [], tuitions: [], settings: { bankId: 'MB', bankAcc: '123456789' } };
let db = JSON.parse(localStorage.getItem('tutoringData')) || defaultData;

document.getElementById('btn-login').addEventListener('click', () => signInWithPopup(auth, provider));

// LẮNG NGHE REAL-TIME TỪ FIREBASE (SEPAY TỰ ĐỘNG CẬP NHẬT GIAO DIỆN)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; 
        document.getElementById('login-screen').style.display = 'none';
        const docRef = doc(firestoreDb, "DuLieuDayThem", user.uid);
        
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                // Nếu dữ liệu đến từ Server (SePay) thay vì từ thay đổi local
                if (!docSnap.metadata.hasPendingWrites) {
                    db = Object.assign({}, defaultData, docSnap.data());
                    localStorage.setItem('tutoringData', JSON.stringify(db));
                    updateDashboard();
                    if(document.getElementById('view-tuition').classList.contains('active')) renderTuition();
                    showToast("🔔 Dữ liệu tài khoản vừa được cập nhật!", "success");
                }
            } else {
                setDoc(docRef, db);
            }
        });
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
});

async function saveData() {
    localStorage.setItem('tutoringData', JSON.stringify(db));
    updateDashboard();
    if (currentUser) {
        try { await setDoc(doc(firestoreDb, "DuLieuDayThem", currentUser.uid), db); } 
        catch (e) { console.error("Lỗi đồng bộ mây:", e); }
    }
}

// Bỏ qua các hàm Tiện ích (showToast, getTodayStr) và các hàm View cũ để gọn...
// (Bạn hãy GIỮ NGUYÊN các hàm Quản lý Lớp, Lịch, Import như cũ trong file gốc của bạn nhé)

// ================= TÀI CHÍNH & SEPAY =================

window.saveBankSettings = function() {
    db.settings.bankId = document.getElementById('set-bank-id').value;
    db.settings.bankAcc = document.getElementById('set-bank-acc').value;
    saveData(); closeModal('modal-settings'); showToast("Đã lưu cấu hình Ngân hàng!");
}

// Hàm lõi: Tính tiền (Thu đầu kỳ, trừ Vắng Phép đợt trước)
function getTuitionData(classId) {
    let result = [];
    let studentsInClass = db.students.filter(s => s.classId == classId);
    let cls = db.classes.find(c => c.id == classId);
    if (!cls) return result;

    let cycle = parseInt(cls.cycle) || 10;

    studentsInClass.forEach(stu => {
        let fee = parseInt(stu.customFee) || parseInt(cls.fee) || 0;
        let paidCycles = db.tuitions.filter(t => t.studentId == stu.id).length;
        let currentCycleNum = paidCycles + 1; // Kỳ đang cần thu

        // Tính số buổi phép của kỳ trước để khấu trừ
        let discountCount = 0;
        if (paidCycles > 0) {
            let classSessions = db.sessions.filter(s => s.classId == cls.id && s.status === 'completed').sort((a,b)=>a.date.localeCompare(b.date));
            let prevStart = (paidCycles - 1) * cycle;
            let prevEnd = paidCycles * cycle;
            let prevSessIds = classSessions.slice(prevStart, prevEnd).map(s => String(s.id));
            discountCount = db.attendance.filter(a => a.studentId == stu.id && a.status === 'phép' && prevSessIds.includes(String(a.sessionId))).length;
        }

        let upfrontFee = cycle * fee;
        let discountFee = discountCount * fee;
        let finalAmount = upfrontFee - discountFee;

        // Nội dung CK chuẩn xác cho SePay nhận diện: HP [Mã HS]
        let ckContent = `HP ${stu.id}`; 
        let qrLink = `https://img.vietqr.io/image/${db.settings.bankId}-${db.settings.bankAcc}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(ckContent)}`;

        let isPaid = db.tuitions.find(t => t.studentId == stu.id && t.cycleNumber === currentCycleNum) ? true : false;

        result.push({
            stu: stu, cls: cls, cycleNum: currentCycleNum, cycleSessions: cycle,
            upfrontFee: upfrontFee, discountCount: discountCount, discountFee: discountFee, 
            finalAmount: finalAmount, isPaid: isPaid, qrLink: qrLink, ckContent: ckContent
        });
    });
    return result;
}

window.renderTuition = function() {
    // Populate select
    let select = document.getElementById('tuition-class-select');
    if(select.options.length === 0) {
        db.classes.forEach(c => select.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    }
    let cid = select.value; if(!cid) return;

    let data = getTuitionData(cid);
    
    let tongDuThu = 0, tongDaThu = 0, tongConNo = 0;
    const list = document.getElementById('tuition-due-list'); list.innerHTML = '';

    data.forEach(d => {
        tongDuThu += d.finalAmount;
        if(d.isPaid) tongDaThu += d.finalAmount; else tongConNo += d.finalAmount;

        let statusBtn = d.isPaid 
            ? `<button class="t-badge paid" onclick="toggleTuition(${d.stu.id}, ${d.cycleNum}, ${d.finalAmount})">✔ Đã nộp</button>`
            : `<button class="t-badge unpaid" onclick="toggleTuition(${d.stu.id}, ${d.cycleNum}, ${d.finalAmount})">❌ Chưa nộp</button>`;

        list.innerHTML += `
            <div class="tuition-card">
                <div style="flex:1;">
                    <h4 style="font-size:1.1rem; color:var(--text-main); font-weight:800; margin-bottom:4px;">${d.stu.name}</h4>
                    <p class="text-sm text-muted">Kỳ ${d.cycleNum} (${d.cycleSessions} buổi)</p>
                    ${d.discountCount > 0 ? `<p class="text-sm text-red">Trừ ${d.discountCount} phép: -${d.discountFee.toLocaleString()}đ</p>` : ''}
                </div>
                <div style="text-align:right;">
                    <h3 class="text-primary" style="font-size:1.2rem; color:#2563eb; font-weight:800; margin-bottom:8px;">${d.finalAmount.toLocaleString()}đ</h3>
                    ${statusBtn}
                    <div style="display:flex; gap:5px; margin-top:8px; justify-content:flex-end;">
                        <button class="btn-sm text-blue btn-outline-action" onclick="window.open('${d.qrLink}')"><i class="fas fa-qrcode"></i></button>
                        <button class="btn-sm text-green btn-outline-action" onclick="remindZalo('${d.stu.name}', '${d.ckContent}', ${d.finalAmount})"><i class="fas fa-comment-dots"></i></button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('t-du-thu').innerText = tongDuThu.toLocaleString() + 'đ';
    document.getElementById('t-da-thu').innerText = tongDaThu.toLocaleString() + 'đ';
    document.getElementById('t-con-no').innerText = tongConNo.toLocaleString() + 'đ';
}

window.toggleTuition = function(stuId, cycleNum, amount) {
    let exist = db.tuitions.find(t => t.studentId == stuId && t.cycleNumber === cycleNum);
    if(exist) {
        db.tuitions = db.tuitions.filter(t => t.id !== exist.id);
    } else {
        db.tuitions.push({ id: Date.now(), studentId: stuId, cycleNumber: cycleNum, amount: amount, date: new Date().toISOString() });
    }
    saveData(); renderTuition();
}

window.remindZalo = function(name, ck, amount) {
    let msg = `[THÔNG BÁO] TT gửi học phí kỳ này của học sinh ${name}. Số tiền: ${amount.toLocaleString()}đ. Cú pháp CK: ${ck}`;
    navigator.clipboard.writeText(msg);
    showToast("Đã copy tin nhắn để dán vào Zalo!", "success");
}

window.copyClassNotice = function() {
    let cid = document.getElementById('tuition-class-select').value; let cls = db.classes.find(c=>c.id==cid);
    let data = getTuitionData(cid);
    
    let msg = `📢 BẢNG HỌC PHÍ KỲ TỚI - LỚP ${cls.name}\n(Đã tự động khấu trừ các buổi nghỉ phép)\n\n`;
    data.forEach(d => { msg += `- ${d.stu.name}: ${d.finalAmount.toLocaleString()}đ\n`; });
    msg += `\n💳 STK: ${db.settings.bankAcc} (${db.settings.bankId})\n📌 Phụ huynh vui lòng quét Mã QR ở ảnh bên dưới để chuyển khoản chính xác nhất. Xin cảm ơn!`;
    
    navigator.clipboard.writeText(msg);
    showToast("✅ Đã copy thông báo Lớp. Hãy dán vào Nhóm Zalo!");
}

window.showClassQRList = function() {
    let cid = document.getElementById('tuition-class-select').value;
    let data = getTuitionData(cid).filter(d => !d.isPaid); // Chỉ xuất những em chưa nộp
    
    let grid = document.getElementById('qr-grid-container'); grid.innerHTML = '';
    data.forEach(d => {
        grid.innerHTML += `
            <div style="background:white; border-radius:12px; padding:10px; text-align:center; border:1px solid #e2e8f0;">
                <b style="font-size:0.9rem; color:#1e3a8a;">${d.stu.name}</b>
                <p style="font-size:0.8rem; color:#ef4444; font-weight:bold; margin-bottom:5px;">${d.finalAmount.toLocaleString()}đ</p>
                <img src="${d.qrLink}" style="width:100%; border-radius:8px;">
            </div>`;
    });
    openModal('modal-qr-list');
}

// KHÔI PHỤC LẠI CÁC LỆNH GỌI HÀM CŨ TẠI ĐÂY
window.switchView = switchView;
window.switchCalTab = switchCalTab;
window.openModal = openModal;
window.closeModal = closeModal;
// ... (Các hàm Export/Import cũ của bạn)