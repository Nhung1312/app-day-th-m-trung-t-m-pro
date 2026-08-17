// --- HỆ THỐNG FIREBASE ĐĂNG NHẬP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQz-4TAujSNhDV8wQY82-wnCTGJtdxhsM",
  authDomain: "quan-ly-day-them-f7b1e.firebaseapp.com",
  projectId: "quan-ly-day-them-f7b1e",
  storageBucket: "quan-ly-day-them-f7b1e.firebasestorage.app",
  messagingSenderId: "613673074776",
  appId: "1:613673074776:web:639fe0c51ae83b56a8ca2d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestoreDb = getFirestore(app);
const provider = new GoogleAuthProvider();

const loginScreen = document.getElementById('login-screen');
const btnLogin = document.getElementById('btn-login');

btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider).then((result) => {
        console.log("Đăng nhập thành công:", result.user.email);
    }).catch((error) => {
        alert("Lỗi đăng nhập: " + error.message);
    });
});

let currentUser = null; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginScreen.style.display = 'none';
        console.log("Đã đăng nhập:", user.email);

        const userRef = doc(firestoreDb, 'nguoi_dung', user.uid);
        let hasAccess = true; 

        try {
            const docUserSnap = await getDoc(userRef);
            const ngayHienTai = new Date();

            if (!docUserSnap.exists()) {
                let ngayHetHan = new Date();
                ngayHetHan.setDate(ngayHienTai.getDate() + 30);

                await setDoc(userRef, {
                    email: user.email,
                    ngay_dang_ky: ngayHienTai.toISOString(),
                    ngay_het_han: ngayHetHan.toISOString()
                });
                console.log("Tặng 30 ngày trải nghiệm!");
            } else {
                const duLieu = docUserSnap.data();
                const ngayHetHan = new Date(duLieu.ngay_het_han);

                // TÍNH SỐ NGÀY CÒN LẠI
                const timeDiff = ngayHetHan.getTime() - ngayHienTai.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysLeft <= 0) {
                    hasAccess = false;
                    document.getElementById('man-hinh-thu-phi').style.display = 'block';

                    let emailElements = document.getElementsByClassName('email-user');
                    for (let i = 0; i < emailElements.length; i++) {
                        emailElements[i].innerText = user.email.split('@')[0];
                    }
                } else {
                    document.getElementById('man-hinh-thu-phi').style.display = 'none';
                    console.log("Tài khoản còn hạn đến: ", ngayHetHan.toLocaleDateString());

                    // CẢNH BÁO KHI CÒN <= 5 NGÀY
                    if (daysLeft <= 5) {
                        const banner = document.getElementById('trial-warning-banner');
                        if (banner) {
                            banner.style.display = 'flex';
                            document.getElementById('trial-days-left').innerText = daysLeft;
                            const upgradePrefix = document.getElementById('upgrade-email-prefix');
                            if (upgradePrefix) upgradePrefix.innerText = user.email.split('@')[0];
                        }
                    }
                }
            }
        } catch (error) {
            console.log("Lỗi kiểm tra bản quyền:", error);
        }

        if (hasAccess) {
            // NÂNG CẤP LÊN ONSNAPSHOT ĐỂ NGHE SEPAY THEO THỜI GIAN THỰC
            const docRef = doc(firestoreDb, "DuLieuDayThem", user.uid);
            onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    if (!docSnap.metadata.hasPendingWrites) {
                        db = Object.assign({}, defaultData, docSnap.data());
                        db.settings = db.settings || { bankId: 'MB', bankAcc: '123456789' };
                        localStorage.setItem('tutoringData', JSON.stringify(db));
                        if (typeof updateDashboard === 'function') updateDashboard();
                        if (typeof renderClasses === 'function') renderClasses();
                        if (document.getElementById('view-tuition')?.classList.contains('active')) {
                            if (typeof renderTuition === 'function') renderTuition();
                        }
                        if (document.getElementById('view-statistics')?.classList.contains('active')) {
                            if (typeof renderStatistics === 'function') renderStatistics();
                        }
                        console.log("☁️ Dữ liệu đã được đồng bộ từ mây!");
                    }
                } else {
                    setDoc(docRef, db);
                }
            });

            if (typeof generateSchedules === 'function') generateSchedules();
        }

    } else {
        currentUser = null;
        loginScreen.style.display = 'flex';
    }
});

// TÍNH NĂNG ĐĂNG XUẤT 
window.logoutApp = function() {
    if(confirm("Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?")) {
        signOut(auth).then(() => {
            localStorage.removeItem('tutoringData'); 
            location.reload();
        });
    }
};

// ================= DATA STRUCTURE =================
const defaultData = { 
    classes: [], 
    students: [], 
    holidays: [], 
    sessions: [], 
    attendance: [], 
    tuitions: [],
    settings: { bankId: 'MB', bankAcc: '123456789' }
};

let stored = JSON.parse(localStorage.getItem('tutoringData'));
let db = stored ? Object.assign({}, defaultData, stored) : defaultData;
db.classes = db.classes || []; db.students = db.students || []; db.holidays = db.holidays || [];
db.sessions = db.sessions || []; db.attendance = db.attendance || []; db.tuitions = db.tuitions || [];
db.settings = db.settings || { bankId: 'MB', bankAcc: '123456789' };

async function saveData() {
    localStorage.setItem('tutoringData', JSON.stringify(db));
    updateDashboard(); 

    if (currentUser) {
        try {
            const docRef = doc(firestoreDb, "DuLieuDayThem", currentUser.uid);
            await setDoc(docRef, db);
            console.log("☁️ Đã lưu dữ liệu lên mây thành công!");
        } catch (e) {
            console.error("Lỗi khi đồng bộ lên mây: ", e);
        }
    }
}

function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function parseDateVi(dStr) { 
    if(!dStr) return '--/--';
    const d = new Date(dStr); 
    const dd = String(d.getDate()).padStart(2, '0'); 
    const mm = String(d.getMonth() + 1).padStart(2, '0'); 
    return `${dd}/${mm}`; 
}

window.onload = () => { 
    generateSchedules(); updateDashboard(); renderClasses(); populateClassSelects(); 
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
    }
};

function showToast(msg, type='success') {
    const box = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i> <span>${msg}</span>`; box.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(), 300); }, 2500);
}

function switchView(id, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
    
    if(id === 'view-home') updateDashboard();
    if(id === 'view-classes') renderClasses();
    if(id === 'view-students') renderStudents();
    if(id === 'view-tuition') renderTuition();
    if(id === 'view-statistics') renderStatistics();
    if(id === 'view-calendar') {
        let activeTabBtn = document.querySelector('#view-calendar .tab-btn.active');
        if(activeTabBtn) activeTabBtn.click();
        else switchCalTab('study', document.querySelectorAll('#view-calendar .tab-btn')[0]);
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function showLoading(show, text="Đang xử lý...") { document.getElementById('loading-text').innerText = text; document.getElementById('loading-overlay').classList.toggle('hidden', !show); }

// ================= LỊCH ĐIỀU HƯỚNG 4 TAB =================
function switchCalTab(tabId, el) {
    document.querySelectorAll('#view-calendar .tab-btn').forEach(btn => btn.classList.remove('active'));
    if(el) el.classList.add('active');
    document.querySelectorAll('.cal-tab').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    if(tabId === 'holiday') renderHolidays();
    if(tabId === 'study') renderUpcomingClasses();
    if(tabId === 'makeup') renderMakeups();
    if(tabId === 'month') renderMonthClasses();
}

function renderUpcomingClasses() {
    const list = document.getElementById('upcoming-list'); list.innerHTML = ''; let todayStr = getTodayStr();
    let upcomings = db.sessions.filter(s => s.date >= todayStr && s.status !== 'canceled').sort((a,b) => { if(a.date !== b.date) return (a.date || "").localeCompare(b.date || ""); return String(a.start || "").localeCompare(String(b.start || "")); }).slice(0, 20); 
    if(upcomings.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Không có lịch học sắp tới.</div>'; return; }
    upcomings.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        let badge = s.isMakeup ? `<span class="date-badge" style="background:var(--warning-bg); color:var(--warning);">Dạy bù</span>` : '';
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong style="color:var(--primary-dark); font-size:1.05rem;">${cls.name}</strong><small style="color:var(--text-main); font-weight:700;">${parseDateVi(s.date)} • Từ ${s.start||'--:--'} đến ${s.end||'--:--'} ${s.note ? `(${s.note})` : ''}</small></div>${badge}</div>`;
    });
}

function renderMakeups() {
    const list = document.getElementById('makeup-list'); list.innerHTML = '';
    let makeups = db.sessions.filter(s => s.isMakeup).sort((a,b) => (b.date||"").localeCompare(a.date||""));
    if(makeups.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Chưa có lịch dạy bù nào được tạo.</div>'; return; }
    makeups.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong style="color:var(--primary-dark); font-size:1.05rem;">${cls.name}</strong><small>${parseDateVi(s.date)} • ${s.start||'--:--'} - ${s.end||'--:--'}</small><small class="text-orange">${s.note||''}</small></div><button class="btn-outline-action text-red" onclick="deleteSession('${s.id}')"><i class="fas fa-trash"></i></button></div>`;
    });
}

function saveMakeup() {
    let classId = document.getElementById('makeup-class').value; let date = document.getElementById('makeup-date').value; let start = document.getElementById('makeup-start').value; let end = document.getElementById('makeup-end').value; let note = document.getElementById('makeup-note').value || 'Dạy bù';
    if(!classId || !date || !start || !end) return showToast("Vui lòng nhập đủ ngày và giờ!", "error");
    db.sessions.push({ id: 'sess_' + Date.now(), classId: parseInt(classId), date: date, start: start, end: end, status: 'pending', isMakeup: true, note: note });
    saveData(); closeModal('modal-add-makeup'); renderMakeups(); showToast("✅ Đã thêm lịch dạy bù vào Hệ thống!");
}

function deleteSession(id) { if(confirm("Xóa lịch dạy bù này?")) { db.sessions = db.sessions.filter(s => String(s.id) !== String(id)); saveData(); renderMakeups(); showToast("Đã xóa lịch bù!"); } }

function renderMonthClasses() {
    const list = document.getElementById('month-list'); list.innerHTML = '';
    let today = new Date(); let y = today.getFullYear(), m = today.getMonth();
    let monthStart = new Date(y, m, 1).toISOString().split('T')[0]; let monthEnd = new Date(y, m + 1, 0).toISOString().split('T')[0];
    let monthSessions = db.sessions.filter(s => s.date >= monthStart && s.date <= monthEnd).sort((a,b) => (a.date||"").localeCompare(b.date||""));
    if(monthSessions.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Tháng này không có lịch học.</div>'; return; }
    let byDate = {}; monthSessions.forEach(s => { if(!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s); });
    Object.keys(byDate).forEach(date => {
        let items = byDate[date].sort((a,b)=>String(a.start||"").localeCompare(String(b.start||""))).map(s => {
            let cls = db.classes.find(c => c.id == s.classId);
            let color = s.status === 'canceled' ? 'color:var(--danger)' : (s.isMakeup ? 'color:var(--warning)' : 'color:var(--primary-dark)');
            let strike = s.status === 'canceled' ? 'text-decoration:line-through; opacity:0.6;' : '';
            let pointer = s.status !== 'canceled' ? 'cursor:pointer;' : '';
            let onClick = s.status !== 'canceled' ? `onclick="openAttendance('${s.id}', '${cls?cls.name:''}')"` : '';
            let checkIcon = s.status === 'completed' ? '<i class="fas fa-check-circle text-green" style="margin-left:5px;"></i>' : '';
            return `<div ${onClick} style="margin-top:6px; font-size:0.85rem; font-weight:700; ${strike} ${color} ${pointer}">• ${s.start||'--:--'}: ${cls?cls.name:'Lớp xóa'} ${s.status === 'canceled' ? '(Nghỉ)' : ''} ${s.isMakeup ? '(Dạy bù)' : ''} ${checkIcon}</div>`;
        }).join('');
        list.innerHTML += `<div class="list-item" style="flex-direction:column; align-items:flex-start;"><strong style="color:var(--text-main); font-size:1.1rem;"><i class="fas fa-calendar-day" style="color:#cbd5e1;"></i> ${parseDateVi(date)}</strong><div style="width:100%; border-top:1px dashed #eee; margin-top:8px; padding-top:4px;">${items}</div></div>`;
    });
}

// ================= AUTO SCHEDULING =================
function isHoliday(dateStr, classId) {
    const d = new Date(dateStr);
    for(let h of db.holidays) {
        if(h.classId === 'ALL' || h.classId == classId) {
            let start = new Date(h.start); start.setHours(0,0,0,0); let end = new Date(h.end); end.setHours(23,59,59,999);
            if(d >= start && d <= end) return h;
        }
    }
    return null;
}

function generateSchedules() {
    const today = new Date(); const maxDate = new Date(); maxDate.setDate(today.getDate() + 90);
    db.classes.forEach(cls => {
        if(!cls.tkb || cls.tkb.length === 0) return; let currDate = new Date(cls.startDate); if(isNaN(currDate)) return;
        db.sessions = db.sessions.filter(s => { if (s.classId != cls.id) return true; if (s.isMakeup) return true; if (s.status === 'completed') return true; return false; });
        while(currDate <= maxDate) {
            let dStr = currDate.toISOString().split('T')[0]; let dow = currDate.getDay() === 0 ? 8 : currDate.getDay() + 1; 
            cls.tkb.forEach(t => {
                if(t.dayOfWeek == dow) {
                    let hol = isHoliday(dStr, cls.id);
                    let exist = db.sessions.find(s => s.classId == cls.id && s.date === dStr && s.start === t.start && !s.isMakeup);
                    if(!exist) { db.sessions.push({ id: 'sess_' + Date.now() + Math.floor(Math.random()*10000), classId: cls.id, date: dStr, start: t.start, end: t.end, status: hol ? 'canceled' : 'pending', isMakeup: false, note: hol ? `Nghỉ: ${hol.name}` : '' }); }
                }
            });
            currDate.setDate(currDate.getDate() + 1);
        }
    });
    saveData(); 
}

// ================= DASHBOARD & QUÉT RÁC TỰ ĐỘNG =================
function updateDashboard() {
    db.sessions = db.sessions.filter(s => db.classes.some(c => c.id == s.classId)); 
    db.students = db.students.filter(s => db.classes.some(c => c.id == s.classId)); 
    db.tuitions = db.tuitions.filter(t => db.students.some(st => st.id == t.studentId)); 
    db.attendance = db.attendance.filter(a => db.sessions.some(s => String(s.id) === String(a.sessionId)));
    
    document.getElementById('dash-total-classes').innerText = db.classes.length; 
    document.getElementById('dash-total-students').innerText = db.students.length;
    let todayStr = getTodayStr(); document.getElementById('dash-today-date').innerText = parseDateVi(todayStr);
    
    const missedList = document.getElementById('dash-missed-list'); if (missedList) missedList.innerHTML = '';
    let missedSessions = db.sessions.filter(s => s.date < todayStr && s.status === 'pending').sort((a,b) => (a.date||"").localeCompare(b.date||""));
    if(missedSessions.length > 0 && missedList) {
        missedList.innerHTML = `<div class="section-title"><h3 class="text-red">⚠️ QUÊN ĐIỂM DANH (${missedSessions.length})</h3></div>`;
        missedSessions.forEach(s => {
            let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
            let classSessions = db.sessions.filter(x => x.classId == cls.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
            let sessionIndex = classSessions.findIndex(x => String(x.id) === String(s.id)) + 1;
            missedList.innerHTML += `<div class="dash-sched-card" style="border-left-color: var(--danger); background: #fef2f2;"><div class="dsc-time">${parseDateVi(s.date)} • ${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class text-red">🔴 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex}</div><button class="btn-att-now" style="background: var(--danger);" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-exclamation-triangle"></i> ĐIỂM DANH BÙ NGAY</button></div>`;
        });
    }

    let todays = db.sessions.filter(s => s.date === todayStr).sort((a,b) => String(a.start||"").localeCompare(String(b.start||"")));
    let activeTodays = todays.filter(s => s.status !== 'canceled'); document.getElementById('dash-today-sessions').innerText = activeTodays.length;
    
    // Đếm học sinh nợ tiền tự động
    let dueCount = 0;
    db.classes.forEach(c => {
        let tData = getTuitionData(c.id);
        dueCount += tData.filter(d => !d.isPaid).length;
    });
    const dashDue = document.getElementById('dash-tuition-due');
    if(dashDue) dashDue.innerText = dueCount;

    let globalHol = db.holidays.find(h => { let sd = new Date(h.start); sd.setHours(0,0,0,0); let ed = new Date(h.end); ed.setHours(23,59,59,999); let td = new Date(todayStr); return h.classId === 'ALL' && td >= sd && td <= ed; });
    const list = document.getElementById('dash-schedule-list'); list.innerHTML = '';
    if(activeTodays.length === 0) { 
        if (globalHol) { list.innerHTML = `<div class="holiday-card-large"><h3>🎉 HÔM NAY NGHỈ</h3><span>${globalHol.name}</span></div>`; } 
        else { list.innerHTML = '<div class="text-center text-muted mt-20" style="font-weight:600;">Hôm nay không có lịch học.</div>'; }
        return; 
    }

    const now = new Date(); const currentMins = now.getHours() * 60 + now.getMinutes();

    activeTodays.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        let stuCount = db.students.filter(st => st.classId == cls.id).length;
        let classSessions = db.sessions.filter(x => x.classId == cls.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
        let sessionIndex = classSessions.findIndex(x => String(x.id) === String(s.id)) + 1;
        let isDone = s.status === 'completed'; let startParts = (s.start||"00:00").split(':'); let startMins = parseInt(startParts[0]||0)*60 + parseInt(startParts[1]||0); let isUpcoming = !isDone && (startMins - currentMins <= 60 && startMins - currentMins >= -120);

        if (isUpcoming) { list.innerHTML += `<div class="dash-sched-card highlight"><div class="dsc-badge">🔔 SẮP ĐẾN GIỜ HỌC</div><div class="dsc-time">${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class">🔵 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex} • ${stuCount} học sinh</div><button class="btn-att-now" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-clipboard-check"></i> ĐIỂM DANH NGAY</button></div>`;
        } else { list.innerHTML += `<div class="dash-sched-card ${isDone ? 'done' : ''}"><div class="dsc-time">${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class">🔵 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex} • ${stuCount} học sinh</div>${isDone ? `<button class="btn-att done" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-check-double"></i> ĐÃ ĐIỂM DANH (Bấm sửa)</button>` : `<button class="btn-att" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-clipboard-check"></i> ĐIỂM DANH</button>`}</div>`; }
    });
}

// ================= ĐIỂM DANH =================
let currentAttSessionId = null;
function openAttendance(sessionId, className) {
    currentAttSessionId = String(sessionId); const session = db.sessions.find(s => String(s.id) === currentAttSessionId);
    if(!session) return showToast("Không tìm thấy dữ liệu buổi học!", "error");
    document.getElementById('att-class-name').innerText = className; document.getElementById('att-date-info').innerText = `${parseDateVi(session.date)} (${session.start||'--:--'} - ${session.end||'--:--'})`;
    
    let stus = db.students.filter(s => s.classId == session.classId); let html = '';
    stus.forEach(stu => {
        let record = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stu.id);
        let status = record ? record.status : 'có mặt'; let cl = status === 'vắng' ? 'vắng' : (status === 'phép' ? 'phép' : '');
        html += `<div class="att-student ${cl}" id="att-row-${stu.id}"><div class="att-name">${stu.name}</div><div class="att-actions"><button class="att-btn ${status==='có mặt'?'active có mặt':''}" onclick="setAtt(${stu.id}, 'có mặt')"><i class="fas fa-check"></i></button><button class="att-btn ${status==='phép'?'active phép':''}" onclick="setAtt(${stu.id}, 'phép')">P</button><button class="att-btn ${status==='vắng'?'active vắng':''}" onclick="setAtt(${stu.id}, 'vắng')"><i class="fas fa-times"></i></button></div></div>`;
    });
    document.getElementById('att-student-list').innerHTML = html; openModal('modal-attendance');
}

function setAtt(stuId, status) {
    const row = document.getElementById(`att-row-${stuId}`); row.className = `att-student ${status === 'có mặt' ? '' : status}`;
    const btns = row.querySelectorAll('.att-btn'); btns.forEach(b => b.className = 'att-btn');
    if(status==='có mặt') btns[0].classList.add('active', 'có', 'mặt'); if(status==='phép') btns[1].classList.add('active', 'phép'); if(status==='vắng') btns[2].classList.add('active', 'vắng');
    let exist = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stuId);
    if(exist) exist.status = status; else db.attendance.push({ sessionId: currentAttSessionId, studentId: stuId, status: status });
}

function submitAttendance() {
    try {
        let session = db.sessions.find(s => String(s.id) === currentAttSessionId);
        if(!session) throw new Error("Dữ liệu buổi học bị mất, vui lòng tải lại trang!");
        let stus = db.students.filter(s => s.classId == session.classId);
        stus.forEach(stu => { let exist = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stu.id); if(!exist) db.attendance.push({ sessionId: currentAttSessionId, studentId: stu.id, status: 'có mặt' }); });
        
        session.status = 'completed'; saveData(); 
        if(document.getElementById('view-classes').classList.contains('active')) renderClasses();
        closeModal('modal-attendance'); showToast("Đã lưu điểm danh!");
    } catch(err) { showToast("Lỗi: " + err.message, "error"); }
}

// ================= TÀI CHÍNH TỰ ĐỘNG & SEPAY =================
function saveBankSettings() {
    db.settings = db.settings || {};
    db.settings.bankId = document.getElementById('set-bank-id').value.trim() || 'MB';
    db.settings.bankAcc = document.getElementById('set-bank-acc').value.trim() || '123456789';
    saveData(); closeModal('modal-settings'); showToast("Đã lưu cấu hình Ngân hàng!");
}

function getTuitionData(classId) {
    let result = [];
    let studentsInClass = db.students.filter(s => s.classId == classId);
    let cls = db.classes.find(c => c.id == classId);
    if (!cls) return result;

    let cycle = parseInt(cls.cycle) || 10;

    studentsInClass.forEach(stu => {
        let fee = parseInt(stu.customFee) || parseInt(cls.fee) || 0;
        let paidCycles = db.tuitions.filter(t => t.studentId == stu.id).length;
        let currentCycleNum = paidCycles + 1; 

        // Khấu trừ phép của đợt ngay trước đó
        let discountCount = 0;
        if (paidCycles > 0) {
            let classSessions = db.sessions.filter(s => s.classId == cls.id && s.status === 'completed').sort((a,b)=> (a.date||"").localeCompare(b.date||""));
            let prevStart = (paidCycles - 1) * cycle;
            let prevEnd = paidCycles * cycle;
            let prevSessIds = classSessions.slice(prevStart, prevEnd).map(s => String(s.id));
            discountCount = db.attendance.filter(a => a.studentId == stu.id && a.status === 'phép' && prevSessIds.includes(String(a.sessionId))).length;
        }

        let upfrontFee = cycle * fee;
        let discountFee = discountCount * fee;
        let finalAmount = upfrontFee - discountFee;

        let ckContent = `HP ${stu.id}`; 
        let bankId = (db.settings && db.settings.bankId) ? db.settings.bankId : 'MB';
        let bankAcc = (db.settings && db.settings.bankAcc) ? db.settings.bankAcc : '123456789';
        let qrLink = `https://img.vietqr.io/image/${bankId}-${bankAcc}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(ckContent)}`;

        let isPaid = db.tuitions.find(t => t.studentId == stu.id && t.cycleNumber === currentCycleNum) ? true : false;

        result.push({
            stu: stu, cls: cls, cycleNum: currentCycleNum, cycleSessions: cycle,
            upfrontFee: upfrontFee, discountCount: discountCount, discountFee: discountFee, 
            finalAmount: finalAmount, isPaid: isPaid, qrLink: qrLink, ckContent: ckContent
        });
    });
    return result;
}

function renderTuition() {
    populateClassSelects();
    let select = document.getElementById('tuition-class-select');
    if(!select || !select.value) {
        if(select && select.options.length > 0) select.selectedIndex = 0;
    }
    let cid = select ? select.value : null; 
    
    const list = document.getElementById('tuition-due-list'); 
    if(list) list.innerHTML = '';
    
    if(!cid) {
        if(list) list.innerHTML = '<div class="text-center text-muted" style="padding:30px;">Vui lòng tạo nhóm lớp trước!</div>';
        return;
    }

    let data = getTuitionData(cid);
    let tongDuThu = 0, tongDaThu = 0, tongConNo = 0;

    data.forEach(d => {
        tongDuThu += d.finalAmount;
        if(d.isPaid) tongDaThu += d.finalAmount; else tongConNo += d.finalAmount;

        let statusBtn = d.isPaid 
            ? `<button class="t-badge paid" onclick="toggleTuition(${d.stu.id}, ${d.cls.id}, ${d.cycleNum}, ${d.finalAmount})">✔ Đã nộp</button>`
            : `<button class="t-badge unpaid" onclick="toggleTuition(${d.stu.id}, ${d.cls.id}, ${d.cycleNum}, ${d.finalAmount})">❌ Chưa nộp</button>`;

        if(list) {
            list.innerHTML += `
                <div class="tuition-card" style="margin-bottom: 10px;">
                    <div style="flex:1;">
                        <h4 style="font-size:1.05rem; color:var(--text-main); font-weight:800; margin-bottom:4px;">${d.stu.name}</h4>
                        <p class="text-sm text-muted">Kỳ ${d.cycleNum} (${d.cycleSessions} buổi)</p>
                        ${d.discountCount > 0 ? `<p class="text-sm text-red">Trừ ${d.discountCount} buổi phép: -${d.discountFee.toLocaleString()}đ</p>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <h3 class="text-primary" style="font-size:1.15rem; color:#2563eb; font-weight:800; margin-bottom:6px;">${d.finalAmount.toLocaleString()}đ</h3>
                        ${statusBtn}
                        <div style="display:flex; gap:5px; margin-top:8px; justify-content:flex-end;">
                            <button class="btn-sm text-blue btn-outline-action" onclick="window.open('${d.qrLink}')" title="Mã QR"><i class="fas fa-qrcode"></i></button>
                            <button class="btn-sm text-green btn-outline-action" onclick="remindZalo('${d.stu.name}', '${d.ckContent}', ${d.finalAmount}, '${d.stu.phone || ''}')" title="Nhắc Zalo"><i class="fas fa-comment-dots"></i></button>
                        </div>
                    </div>
                </div>`;
        }
    });

    const elDuThu = document.getElementById('t-du-thu'); if(elDuThu) elDuThu.innerText = tongDuThu.toLocaleString() + 'đ';
    const elDaThu = document.getElementById('t-da-thu'); if(elDaThu) elDaThu.innerText = tongDaThu.toLocaleString() + 'đ';
    const elConNo = document.getElementById('t-con-no'); if(elConNo) elConNo.innerText = tongConNo.toLocaleString() + 'đ';

    // Lịch sử thu tiền
    const histList = document.getElementById('tuition-history-list');
    if (histList) {
        histList.innerHTML = '';
        let sortedTuitions = [...db.tuitions].sort((a, b) => b.id - a.id).slice(0, 30); 
        if(sortedTuitions.length === 0) {
            histList.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Chưa có lịch sử thu tiền.</div>';
        } else {
            sortedTuitions.forEach(t => {
                let stu = db.students.find(s => s.id == t.studentId);
                let cls = stu ? db.classes.find(c => c.id == stu.classId) : null;
                histList.innerHTML += `
                    <div class="list-item">
                        <div class="list-item-info">
                            <strong style="color:var(--success); font-size:1.1rem;">+ ${t.amount.toLocaleString()}đ</strong>
                            <small style="color:var(--text-main); font-weight:700;">${stu ? stu.name : 'HS đã xóa'} (${cls ? cls.name : 'Lớp xóa'})</small>
                            <small class="text-muted">${parseDateVi(t.date)} • Đóng cho Kỳ ${t.cycleNumber || 1}</small>
                        </div>
                        <button class="btn-outline-action text-red" title="Hủy giao dịch" onclick="deleteTuition(${t.id})"><i class="fas fa-trash"></i></button>
                    </div>`;
            });
        }
    }
}

function toggleTuition(stuId, classId, cycleNum, amount) {
    let exist = db.tuitions.find(t => t.studentId == stuId && t.cycleNumber === cycleNum);
    if(exist) {
        db.tuitions = db.tuitions.filter(t => t.id !== exist.id);
        showToast("Đã chuyển về Chưa nộp!");
    } else {
        db.tuitions.push({ id: Date.now(), studentId: stuId, classId: classId, cycleNumber: cycleNum, amount: amount, date: getTodayStr() });
        showToast("✅ Đã ghi nhận thu tiền thành công!");
    }
    saveData(); 
    renderTuition();
}

function deleteTuition(id) {
    if(confirm("Hủy bỏ giao dịch thu tiền này?")) {
        db.tuitions = db.tuitions.filter(t => t.id != id); saveData(); renderTuition(); showToast("Đã hủy giao dịch!");
    }
}

function remindZalo(name, ck, amount, phone) {
    let msg = `[THÔNG BÁO] Trung tâm gửi thông tin học phí kỳ tới của học sinh ${name}.\n💰 Số tiền cần đóng: ${amount.toLocaleString()}đ.\n📌 Cú pháp chuyển khoản: ${ck}\nKính mong Phụ huynh kiểm tra và hoàn thành sớm. Xin cảm ơn!`;
    navigator.clipboard.writeText(msg).then(() => {
        if (phone && phone.trim() !== '') {
            window.open(`https://zalo.me/${phone}`, '_blank');
            showToast("✅ Đã copy và mở Zalo để gửi!");
        } else {
            showToast("✅ Đã copy! (Học sinh chưa có SĐT để mở Zalo)");
        }
    });
}

function copyClassNotice() {
    let cid = document.getElementById('tuition-class-select').value; 
    let cls = db.classes.find(c=>c.id==cid);
    if(!cls) return showToast("Chưa chọn nhóm lớp!", "error");

    let data = getTuitionData(cid);
    let thangHienTai = new Date().getMonth() + 1;
    
    let msg = `📢 BẢNG HỌC PHÍ THÁNG ${thangHienTai} - LỚP ${cls.name}\n(Đã tự động khấu trừ các buổi nghỉ có phép kỳ trước):\n\n`;
    data.forEach(d => { 
        if (d.discountCount > 0) {
            msg += `- ${d.stu.name}: ${d.finalAmount.toLocaleString()}đ (Trừ ${d.discountCount} phép)\n`; 
        } else {
            msg += `- ${d.stu.name}: ${d.finalAmount.toLocaleString()}đ\n`; 
        }
    });
    
    let bankId = (db.settings && db.settings.bankId) ? db.settings.bankId : 'MB';
    let bankAcc = (db.settings && db.settings.bankAcc) ? db.settings.bankAcc : '123456789';
    
    msg += `\n💳 THÔNG TIN CHUYỂN KHOẢN:\n`;
    msg += `- Ngân hàng: ${bankId}\n`;
    msg += `- Số tài khoản: ${bankAcc}\n`;
    msg += `📌 Cú pháp: HP [Mã HS] (Hoặc quét Mã QR ở ảnh bên dưới)\n\n`;
    msg += `(Trân trọng cảm ơn Quý phụ huynh!)`;
    
    navigator.clipboard.writeText(msg).then(() => {
        showToast("✅ Đã copy thông báo. Dán (Paste) vào Nhóm Zalo nhé!");
    });
}

// CẬP NHẬT: Giao diện lưới QR có ảnh Watermark và Tiêu đề
function showClassQRList() {
    let cid = document.getElementById('tuition-class-select').value;
    if(!cid) return showToast("Chưa chọn nhóm lớp!", "error");
    
    let cls = db.classes.find(c => c.id == cid);
    let data = getTuitionData(cid).filter(d => !d.isPaid);
    let grid = document.getElementById('qr-grid-container'); if(!grid) return;
    
    // Đặt tên tiêu đề cho bức ảnh
    document.getElementById('qr-export-title').innerText = `BẢNG MÃ QR HỌC PHÍ - ${cls.name.toUpperCase()}`;
    grid.innerHTML = '';
    
    if(data.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b; font-weight:600;">Tất cả học sinh trong nhóm đã nộp học phí! 🎉</div>';
    } else {
        data.forEach(d => {
            // LƯU Ý: crossorigin="anonymous" đã được thêm vào
            grid.innerHTML += `
                <div style="background: white; border-radius: 12px; padding: 15px; text-align: center; border: 2px solid #f1f5f9; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <b style="font-size: 1rem; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;">${d.stu.name}</b>
                    <p style="font-size: 1.15rem; color: #ef4444; font-weight: 900; margin-bottom: 12px;">${d.finalAmount.toLocaleString()}đ</p>
                    <img src="${d.qrLink}" crossorigin="anonymous" style="width: 100%; max-width: 180px; border-radius: 8px; border: 1px solid #e2e8f0; padding: 4px; background: white;">
                </div>`;
        });
    }
    openModal('modal-qr-list');
}

// TÍNH NĂNG MỚI: Chụp và tải ảnh QR cả lớp
function taiAnhQRCaLop() {
    const exportArea = document.getElementById('qr-export-area');
    const clsName = document.getElementById('qr-export-title').innerText.replace('BẢNG MÃ QR HỌC PHÍ - ', '');
    
    showLoading(true, "AI đang xử lý ghép ảnh, vui lòng đợi...");
    
    // Thả nổi chiều cao để chụp được toàn bộ ảnh dài dù bị khuất cuộn chuột
    const originalMaxHeight = exportArea.style.maxHeight;
    const originalOverflow = exportArea.style.overflow;
    exportArea.style.maxHeight = 'none';
    exportArea.style.overflow = 'visible';

    // Đợi 0.5s để các ảnh load xong rồi chụp
    setTimeout(() => {
        html2canvas(exportArea, {
            useCORS: true,       // Bắt buộc để đọc được link ảnh từ vietqr
            scale: 2,            // Giúp ảnh nét gấp đôi
            backgroundColor: "#ffffff"
        }).then(canvas => {
            // Trả lại giao diện cuộn chuột như cũ
            exportArea.style.maxHeight = originalMaxHeight;
            exportArea.style.overflow = originalOverflow;

            // Tự động tải xuống
            const link = document.createElement('a');
            let thangHienTai = new Date().getMonth() + 1;
            link.download = `ToanMatsuda_QR_HocPhi_${clsName}_T${thangHienTai}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            showLoading(false);
            showToast("✅ Đã tải ảnh thành công! Hãy gửi vào nhóm Zalo.");
        }).catch(err => {
            showLoading(false);
            showToast("❌ Lỗi khi xuất ảnh: " + err.message, "error");
        });
    }, 500);
}

// TÍNH NĂNG MỚI: XUẤT FILE EXCEL CHUẨN (.XLSX) DÙNG THƯ VIỆN SHEETJS
function exportTuitionExcel() {
    let cid = document.getElementById('tuition-class-select').value;
    if(!cid) return showToast("Chưa chọn nhóm lớp để xuất file!", "error");

    let cls = db.classes.find(c => c.id == cid);
    let data = getTuitionData(cid);

    if(data.length === 0) {
        return showToast("Không có dữ liệu học sinh trong lớp này!", "error");
    }

    // Tạo mảng dữ liệu chuẩn bị cho Excel
    let excelData = [];
    
    // Tạo dòng tiêu đề
    excelData.push(["STT", "Họ và tên", "Số điện thoại", "Kỳ thu", "Số buổi", "Học phí dự kiến", "Số buổi phép", "Tiền trừ phép", "Tổng cần thu", "Trạng thái"]);

    // Điền dữ liệu từng học sinh
    data.forEach((d, index) => {
        excelData.push([
            index + 1, 
            d.stu.name, 
            d.stu.phone ? String(d.stu.phone) : "", // Ép kiểu chuỗi để Excel không làm mất số 0 ở đầu SĐT
            d.cycleNum, 
            d.cycleSessions, 
            d.upfrontFee, 
            d.discountCount, 
            d.discountFee, 
            d.finalAmount, 
            d.isPaid ? "Đã nộp" : "Chưa nộp"
        ]);
    });

    // Tạo một Workbook (file Excel) mới
    let wb = XLSX.utils.book_new();
    
    // Chuyển mảng dữ liệu thành một Worksheet (trang tính)
    let ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Làm đẹp file Excel: Tự động căn chỉnh độ rộng các cột cho vừa vặn chữ
    let wscols = [
        {wch: 5},  // Cột STT
        {wch: 25}, // Cột Tên
        {wch: 15}, // Cột SĐT
        {wch: 8},  // Kỳ
        {wch: 10}, // Số buổi
        {wch: 15}, // HP dự kiến
        {wch: 15}, // Buổi phép
        {wch: 15}, // Tiền trừ
        {wch: 15}, // Tổng thu
        {wch: 12}  // Trạng thái
    ];
    ws['!cols'] = wscols;

    // Gắn trang tính vào file Excel
    XLSX.utils.book_append_sheet(wb, ws, "Danh Sach Thu Tien");

    // Xuất file và tự động tải xuống
    let thangHienTai = new Date().getMonth() + 1;
    let fileName = `DanhSachThuTien_${cls.name.replace(/ /g, '_')}_Thang${thangHienTai}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    showToast("✅ Đã xuất file Excel chuẩn (.xlsx) thành công!");
}

// ================= QUẢN LÝ LỚP HỌC =================
function openAddStudentForClass(cid) { document.getElementById('stu-id').value = ''; document.getElementById('stu-name').value = ''; document.getElementById('stu-phone').value = ''; document.getElementById('stu-custom-fee').value = ''; document.getElementById('stu-start').value = getTodayStr(); document.getElementById('stu-class').value = cid; openModal('modal-add-student'); }

function renderClasses() {
    const list = document.getElementById('class-list'); list.innerHTML = '';
    
    const searchInput = document.getElementById('search-class');
    const filterText = searchInput ? searchInput.value.toLowerCase() : "";
    
    let filteredClasses = db.classes.filter(c => c.name.toLowerCase().includes(filterText));
    
    if(filteredClasses.length === 0) {
        list.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Không tìm thấy nhóm lớp nào!</div>';
    }
    
    filteredClasses.forEach(c => {
        let stuCount = db.students.filter(s => s.classId == c.id).length; let tkbText = c.tkb.map(t => `T${t.dayOfWeek}(${t.start})`).join(', ');
        let classSessions = db.sessions.filter(x => x.classId == c.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
        let completedCount = classSessions.filter(s => s.status === 'completed').length; let cycle = parseInt(c.cycle) || 10; let nextTargetIndex = Math.floor(completedCount / cycle) * cycle + cycle; 
        
        let nextDateText = "Chưa xác định";
        if(classSessions.length >= nextTargetIndex) { let nextSess = classSessions[nextTargetIndex - 1]; if(nextSess) nextDateText = parseDateVi(nextSess.date); } else if (classSessions.length > 0) { nextDateText = "Đang lên lịch..."; }

        list.innerHTML += `<div class="sched-card" style="border-left-color: var(--primary);"><div class="sched-info"><h4 style="margin-bottom:6px;">${c.name}</h4><p class="text-sm">Học phí: ${parseInt(c.fee).toLocaleString()}đ/b • Lịch: ${tkbText || 'Chưa xếp'}</p><div style="margin-top:12px; padding:10px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;"><div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.85rem; font-weight:700;"><span style="color:var(--text-main);">Đã dạy: <b class="text-blue">${completedCount}</b> buổi</span><span class="text-muted">Mốc thu: ${cycle}b</span></div><div style="font-size:0.8rem; color:#b45309; font-weight:600; display:flex; align-items:center; gap:6px;"><i class="fas fa-bolt"></i> Dự kiến thu (Buổi ${nextTargetIndex}): ${nextDateText}</div></div></div><div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:12px; margin-top:12px;"><span class="text-sm" style="font-weight:700;"><i class="fas fa-users text-blue"></i> ${stuCount} học sinh</span><div style="display:flex; gap:8px;"><button class="btn-outline-action text-green" onclick="openAddStudentForClass(${c.id})" title="Thêm học sinh"><i class="fas fa-user-plus"></i></button><button class="btn-outline-action text-orange" onclick="editClass(${c.id})" title="Sửa nhóm"><i class="fas fa-pen"></i></button><button class="btn-outline-action text-red" onclick="deleteClass(${c.id})" title="Xóa nhóm"><i class="fas fa-trash"></i></button></div></div></div>`;
    });
    populateClassSelects();
}

function deleteClass(id) { if(confirm("CẢNH BÁO ĐỎ: Xóa nhóm lớp sẽ XÓA VĨNH VIỄN toàn bộ dữ liệu của lớp này. Bạn chắc chắn chứ?")) { db.classes = db.classes.filter(c => c.id != id); saveData(); renderClasses(); showToast("Đã xóa nhóm lớp!"); } }
function addTkbRow(day=2, start='18:00', end='20:00') { const div = document.createElement('div'); div.className = 'form-row tkb-row mb-15'; div.style.alignItems = 'center'; div.innerHTML = `<select class="tkb-day" style="flex: 1; padding: 12px 5px; text-align: center; min-width: 60px;"><option value="2">T2</option><option value="3">T3</option><option value="4">T4</option><option value="5">T5</option><option value="6">T6</option><option value="7">T7</option><option value="8">CN</option></select><input type="time" class="tkb-start" value="${start}" style="flex: 1.2; padding: 12px 5px; text-align: center;"><input type="time" class="tkb-end" value="${end}" style="flex: 1.2; padding: 12px 5px; text-align: center;"><button class="btn-outline-action text-red" style="flex-shrink: 0; width: 44px; height: 44px; padding: 0;" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`; div.querySelector('.tkb-day').value = day; document.getElementById('tkb-container').appendChild(div); }
function saveClass() { let id = document.getElementById('class-id').value; let name = document.getElementById('cl-name').value; let fee = document.getElementById('cl-fee').value; let cycle = document.getElementById('cl-cycle').value; let start = document.getElementById('cl-start').value; if(!name || !start) return showToast("Nhập đủ thông tin!", "error"); let tkb = []; document.querySelectorAll('.tkb-row').forEach(row => { tkb.push({ dayOfWeek: parseInt(row.querySelector('.tkb-day').value), start: row.querySelector('.tkb-start').value, end: row.querySelector('.tkb-end').value }); }); let obj = { id: id ? parseInt(id) : Date.now(), name, fee, cycle, startDate: start, tkb }; if(id) db.classes[db.classes.findIndex(c => c.id == id)] = obj; else db.classes.push(obj); saveData(); closeModal('modal-add-class'); renderClasses(); generateSchedules(); showToast("Đã lưu Nhóm!"); }
function editClass(id) { let c = db.classes.find(x => x.id == id); if(!c) return; document.getElementById('class-id').value = c.id; document.getElementById('cl-name').value = c.name; document.getElementById('cl-fee').value = c.fee; document.getElementById('cl-cycle').value = c.cycle; document.getElementById('cl-start').value = c.startDate; document.getElementById('tkb-container').innerHTML = ''; c.tkb.forEach(t => addTkbRow(t.dayOfWeek, t.start, t.end)); openModal('modal-add-class'); }

function populateClassSelects() {
    let html = '<option value="">-- Tất cả nhóm --</option>'; let htmlForm = ''; let htmlHol = '<option value="ALL">Tất cả nhóm lớp</option>';
    db.classes.forEach(c => { html += `<option value="${c.id}">${c.name}</option>`; htmlForm += `<option value="${c.id}">${c.name}</option>`; htmlHol += `<option value="${c.id}">${c.name}</option>`;});
    const filters = document.getElementById('filter-class-stu'); if(filters) filters.innerHTML = html;
    const formClass = document.getElementById('stu-class'); if(formClass) formClass.innerHTML = htmlForm;
    const formImp = document.getElementById('import-class-select'); if(formImp) formImp.innerHTML = htmlForm;
    const formHol = document.getElementById('hol-class'); if(formHol) formHol.innerHTML = htmlHol;
    const formMakeup = document.getElementById('makeup-class'); if(formMakeup) formMakeup.innerHTML = htmlForm;
    const formTuit = document.getElementById('tuition-class-select'); if(formTuit && formTuit.options.length === 0) formTuit.innerHTML = htmlForm;
}

// ================= QUẢN LÝ HỌC SINH =================
function renderStudents() { 
    const list = document.getElementById('student-list'); 
    list.innerHTML = ''; 
    let txt = document.getElementById('search-student').value.toLowerCase(); 
    let cid = document.getElementById('filter-class-stu').value; 
    let filtered = db.students.filter(s => s.name.toLowerCase().includes(txt) && (cid === '' || s.classId == cid)); 
    
    filtered.forEach(s => { 
        let cls = db.classes.find(c => c.id == s.classId); 
        list.innerHTML += `<div class="list-item">
            <div class="list-item-info">
                <strong>${s.name}</strong>
                <small>${cls ? cls.name : 'Lớp đã xóa'} • ${s.phone || 'Không có SĐT'}</small>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn-outline-action text-orange" onclick="editStudent(${s.id})" title="Sửa học sinh"><i class="fas fa-pen"></i></button>
                <button class="btn-outline-action text-red" onclick="deleteStudent(${s.id})" title="Xóa học sinh"><i class="fas fa-trash"></i></button>
            </div>
        </div>`; 
    }); 
}

function saveStudent() { 
    let id = document.getElementById('stu-id').value;
    let cid = document.getElementById('stu-class').value; 
    let name = document.getElementById('stu-name').value; 
    if(!cid || !name) return showToast("Nhập đủ tên và chọn lớp!", "error"); 
    
    let obj = { 
        id: id ? parseInt(id) : Date.now(), 
        classId: parseInt(cid), 
        name: name, 
        phone: document.getElementById('stu-phone').value, 
        customFee: document.getElementById('stu-custom-fee').value, 
        startDate: document.getElementById('stu-start').value || getTodayStr() 
    };

    if(id) {
        let idx = db.students.findIndex(s => s.id == id);
        if(idx > -1) db.students[idx] = obj;
    } else {
        db.students.push(obj); 
    }

    saveData(); 
    closeModal('modal-add-student'); 
    renderStudents(); 
    showToast(id ? "Đã cập nhật học sinh!" : "Đã thêm học sinh!"); 
}

function editStudent(id) {
    let s = db.students.find(x => x.id == id);
    if(!s) return;
    document.getElementById('stu-id').value = s.id;
    document.getElementById('stu-class').value = s.classId;
    document.getElementById('stu-name').value = s.name;
    document.getElementById('stu-phone').value = s.phone || '';
    document.getElementById('stu-custom-fee').value = s.customFee || '';
    document.getElementById('stu-start').value = s.startDate || getTodayStr();
    openModal('modal-add-student');
}

function deleteStudent(id) { if(confirm("Xóa học sinh này?")) { db.students = db.students.filter(s => s.id != id); saveData(); renderStudents(); } }

// ================= LỊCH NGHỈ =================
function renderHolidays() {
    const list = document.getElementById('holiday-list'); list.innerHTML = '';
    db.holidays.forEach(h => {
        let target = h.classId === 'ALL' ? 'Tất cả nhóm' : (db.classes.find(c=>c.id==h.classId)?.name || 'Lớp');
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong>🎉 ${h.name}</strong><small>${parseDateVi(h.start)} - ${parseDateVi(h.end)} • Áp dụng: ${target}</small></div><div style="display:flex; gap:8px;"><button class="btn-outline-action text-orange" onclick="editHoliday(${h.id})"><i class="fas fa-pen"></i></button><button class="btn-outline-action text-red" onclick="deleteHoliday(${h.id})"><i class="fas fa-trash"></i></button></div></div>`;
    });
}
function openAddHoliday() { document.getElementById('hol-id').value = ''; document.getElementById('hol-name').value = ''; document.getElementById('hol-start').value = ''; document.getElementById('hol-end').value = ''; document.getElementById('hol-class').value = 'ALL'; openModal('modal-add-holiday'); }
function editHoliday(id) { let h = db.holidays.find(x => x.id == id); if(!h) return; document.getElementById('hol-id').value = h.id; document.getElementById('hol-name').value = h.name; document.getElementById('hol-start').value = h.start; document.getElementById('hol-end').value = h.end; document.getElementById('hol-class').value = h.classId; openModal('modal-add-holiday'); }
function saveHoliday() {
    let id = document.getElementById('hol-id').value; let name = document.getElementById('hol-name').value, start = document.getElementById('hol-start').value, end = document.getElementById('hol-end').value; let cid = document.getElementById('hol-class').value; if(!name || !start || !end) return showToast("Nhập đủ thông tin!", "error");
    if(id) { let index = db.holidays.findIndex(h => h.id == id); if(index > -1) db.holidays[index] = { id: parseInt(id), name, start, end, classId: cid }; } else { db.holidays.push({ id: Date.now(), name, start, end, classId: cid }); }
    saveData(); generateSchedules(); closeModal('modal-add-holiday'); if(document.getElementById('view-calendar').classList.contains('active')) renderHolidays(); showToast("Đã lưu lịch nghỉ & Cập nhật Lịch học!");
}
function deleteHoliday(id) { if(confirm("Xóa lịch nghỉ?")) { db.holidays = db.holidays.filter(h => h.id != id); saveData(); generateSchedules(); renderHolidays(); } }

// ================= SAO LƯU & KHÔI PHỤC =================
function backupData() {
    let dataStr = JSON.stringify(db); let blob = new Blob([dataStr], {type: "application/json"}); let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; let date = new Date().toISOString().split('T')[0]; a.download = `DuLieuDayThem_${date}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast("Đã tải bản sao lưu (File .json) xuống máy!");
}
function restoreData(event) {
    let file = event.target.files[0]; if(!file) return; let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            if(parsed.classes && parsed.students) { 
                if(confirm("CẢNH BÁO: Dữ liệu hiện tại trên trình duyệt sẽ bị GHI ĐÈ hoàn toàn bởi dữ liệu từ file này. Bạn có chắc chắn muốn khôi phục?")) { db = parsed; saveData(); closeModal('modal-settings'); alert("Khôi phục thành công! Nhấn OK để tải lại ứng dụng."); location.reload(); }
            } else { showToast("File khôi phục không hợp lệ!", "error"); }
        } catch(err) { showToast("Lỗi đọc file!", "error"); }
    };
    reader.readAsText(file); event.target.value = ''; 
}

// ================= IMPORT =================
let parsedData = [];
function openImportModal() { if(db.classes.length === 0) { showToast("Bạn cần TẠO NHÓM LỚP trước khi Import!", "error"); switchView('view-classes', document.querySelectorAll('.nav-item')[1]); return; } document.getElementById('import-step-1').classList.remove('hidden'); document.getElementById('import-step-2').classList.add('hidden'); document.getElementById('import-footer').classList.add('hidden'); openModal('modal-import'); }
async function handleImportFile(event) { const file = event.target.files[0]; if(!file) return; const ext = file.name.split('.').pop().toLowerCase(); showLoading(true, "Đang trích xuất dữ liệu..."); parsedData = []; try { if(ext === 'xlsx' || ext === 'xls' || ext === 'csv') { await extractExcel(file); } else if (ext === 'docx') { await extractWord(file); } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') { await extractImageOCR(file); } else { throw new Error("Định dạng không hỗ trợ!"); } } catch (e) { showToast(e.message || "Lỗi xử lý file!", "error"); } showLoading(false); event.target.value = ''; }
async function extractExcel(file) { const data = await file.arrayBuffer(); const workbook = XLSX.read(data); parseTableToStudents(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1})); }
async function extractWord(file) { const data = await file.arrayBuffer(); const result = await mammoth.extractRawText({arrayBuffer: data}); parseTableToStudents(result.value.split('\n').filter(l => l.trim().length > 0).map(l => l.split(/\t| {2,}/))); }
async function extractImageOCR(file) { if(typeof Tesseract === 'undefined') throw new Error("Thư viện OCR chưa tải xong!"); showLoading(true, "AI đang quét ảnh. Vui lòng đợi 5-15s..."); const result = await Tesseract.recognize(file, 'vie'); parseTableToStudents(result.data.text.split('\n').filter(l => l.trim().length > 0).map(l => l.split(/ {2,}|\t/))); }

function parseTableToStudents(rows) {
    if(rows.length < 1) throw new Error("File trống hoặc không dạng bảng!"); 
    
    let headerIdx = -1; 
    // 1. Quét sâu tới 15 dòng đầu để tìm dòng chứa tiêu đề
    for(let i=0; i<Math.min(15, rows.length); i++) { 
        let text = rows[i].join(' ').toLowerCase(); 
        // Nhận diện dòng chứa "họ và tên" hoặc "stt"
        if(text.includes('họ') || text.includes('tên') || text.includes('stt')) { 
            headerIdx = i; 
            break; 
        } 
    } 
    if(headerIdx === -1) headerIdx = 0; 
    
    let headers = rows[headerIdx].map(h => String(h).toLowerCase().trim()); 
    
    // 2. BỘ NHẬN DIỆN THÔNG MINH (Cập nhật từ khóa cho file của TT)
    let nameCol = headers.findIndex(h => h.includes('tên') || h.includes('name')); 
    // Thêm từ khóa 'đt' để bắt chính xác cột "Sô ĐT PH" của bạn
    let phoneCol = headers.findIndex(h => h.includes('sđt') || h.includes('thoại') || h.includes('phone') || h.includes('đt')); 
    let feeCol = headers.findIndex(h => h.includes('phí') || h.includes('tiền')); 
    
    if(nameCol === -1) nameCol = 1; 
    parsedData = [];

    // 3. Đọc dữ liệu học sinh
    for(let i = headerIdx + 1; i < rows.length; i++) { 
        let r = rows[i]; 
        if(!r || r.length < nameCol+1) continue; 
        
        let name = String(r[nameCol] || '').trim(); 
        if(name.length < 2 || !isNaN(name) || name.toLowerCase().includes('tổng')) continue; 
        
        parsedData.push({ 
            name: name, 
            phone: phoneCol !== -1 ? String(r[phoneCol] || '').replace(/[^0-9]/g,'') : '', 
            customFee: feeCol !== -1 ? String(r[feeCol] || '').replace(/[^0-9]/g,'') : '' 
        }); 
    }
    
    if(parsedData.length === 0) throw new Error("Không tìm thấy dữ liệu học sinh!"); 
    
    // 4. Hiển thị bảng xác nhận (Có thêm CSS để ô nhập liệu đẹp hơn)
    document.getElementById('import-step-1').classList.add('hidden'); 
    document.getElementById('import-step-2').classList.remove('hidden'); 
    document.getElementById('import-footer').classList.remove('hidden'); 
    
    let tb = document.getElementById('import-preview-body'); 
    tb.innerHTML = ''; 
    parsedData.forEach((s, i) => { 
        tb.innerHTML += `<tr>
            <td><input type="text" id="imp-name-${i}" value="${s.name}" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td>
            <td><input type="text" id="imp-phone-${i}" value="${s.phone}" placeholder="Trống" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td>
            <td><input type="number" id="imp-fee-${i}" value="${s.customFee}" placeholder="Mặc định" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td>
        </tr>`; 
    });
}

function confirmImport() { let cid = document.getElementById('import-class-select').value; let count = 0; parsedData.forEach((s, i) => { let finalName = document.getElementById(`imp-name-${i}`).value.trim(); if(finalName) { db.students.push({ id: Date.now() + i, classId: parseInt(cid), name: finalName, phone: document.getElementById(`imp-phone-${i}`).value, customFee: document.getElementById(`imp-fee-${i}`).value, startDate: getTodayStr() }); count++; } }); saveData(); closeModal('modal-import'); renderStudents(); showToast(`🎉 Đã nhập ${count} học sinh!`); }

// ================= THỐNG KÊ & BÁO CÁO =================
function renderStatistics() {
    let totalExpected = 0;
    let totalCollected = 0;
    
    db.tuitions.forEach(t => totalCollected += t.amount);
    
    let classStats = {};
    db.classes.forEach(c => {
        classStats[c.id] = { name: c.name, expected: 0, collected: 0, stuCount: 0 };
        let stus = db.students.filter(s => s.classId == c.id);
        classStats[c.id].stuCount = stus.length;
        
        stus.forEach(stu => {
            let fee = parseInt(stu.customFee) || parseInt(c.fee) || 0;
            let attended = db.attendance.filter(a => a.studentId == stu.id && a.status === 'có mặt').length;
            classStats[c.id].expected += (attended * fee);
        });
    });
    
    db.tuitions.forEach(t => {
        if(classStats[t.classId]) {
            classStats[t.classId].collected += t.amount;
        }
    });

    totalExpected = Object.values(classStats).reduce((sum, cls) => sum + cls.expected, 0);

    document.getElementById('stat-expected').innerText = totalExpected.toLocaleString() + 'đ';
    document.getElementById('stat-collected').innerText = totalCollected.toLocaleString() + 'đ';

    const list = document.getElementById('stat-class-list');
    if(!list) return;
    list.innerHTML = '';
    
    let sortedClasses = Object.values(classStats).sort((a,b) => b.expected - a.expected);
    
    if(sortedClasses.length === 0) {
        list.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Chưa có dữ liệu lớp học.</div>';
    } else {
        sortedClasses.forEach(cls => {
            let percent = cls.expected > 0 ? Math.round((cls.collected / cls.expected) * 100) : 0;
            if(percent > 100) percent = 100; 
            
            list.innerHTML += `
                <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 1.05rem; color: var(--text-main);">${cls.name} <span class="text-sm text-muted" style="font-weight:600;">(${cls.stuCount} HS)</span></strong>
                        <strong class="text-green">+${cls.collected.toLocaleString()}đ</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); font-weight:700;">
                        <span>Kỳ vọng: ${cls.expected.toLocaleString()}đ</span>
                        <span>Đạt: ${percent}%</span>
                    </div>
                    <div style="width: 100%; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percent}%; background: var(--success); transition: 0.5s;"></div>
                    </div>
                </div>
            `;
        });
    }
}

// ================= GẮN HÀM VÀO WINDOW =================
window.switchView = switchView;
window.switchCalTab = switchCalTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveData = saveData;
window.updateDashboard = updateDashboard;
window.renderClasses = renderClasses;
window.renderStudents = renderStudents;
window.deleteStudent = deleteStudent;
window.saveStudent = saveStudent;
window.editStudent = editStudent;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.saveClass = saveClass;
window.generateSchedules = generateSchedules;
window.addTkbRow = addTkbRow;
window.backupData = backupData;
window.restoreData = restoreData;
window.openAddHoliday = openAddHoliday;
window.openImportModal = openImportModal;
window.handleImportFile = handleImportFile;
window.confirmImport = confirmImport;
window.editHoliday = editHoliday;
window.deleteHoliday = deleteHoliday;
window.saveHoliday = saveHoliday;
window.deleteSession = deleteSession;
window.saveMakeup = saveMakeup;
window.deleteTuition = deleteTuition;
window.openAttendance = openAttendance;
window.setAtt = setAtt;
window.submitAttendance = submitAttendance;
window.openAddStudentForClass = openAddStudentForClass;
window.renderStatistics = renderStatistics;
window.saveBankSettings = saveBankSettings;
window.renderTuition = renderTuition;
window.toggleTuition = toggleTuition;
window.remindZalo = remindZalo;
window.copyClassNotice = copyClassNotice;
window.showClassQRList = showClassQRList;
window.taiAnhQRCaLop = taiAnhQRCaLop;
window.exportTuitionExcel = exportTuitionExcel;
