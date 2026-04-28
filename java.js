let isAdmin = false;
const lessonsContainer = document.getElementById('lessons-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const addForm = document.getElementById('add-lesson-form');
const passwordInput = document.getElementById('password-input');
const lessonTitle = document.getElementById('lesson-title');
const audioFile = document.getElementById('audio-file');
const addBtn = document.getElementById('add-btn');
const statusMsg = document.getElementById('status-msg');

// دالة جلب الدروس من data.json
async function fetchLessons() {
    try {
        const res = await fetch('data.json?t=' + new Date().getTime());
        const lessons = await res.json();
        renderLessons(lessons);
    } catch (error) {
        lessonsContainer.innerHTML = '<p>تعذر تحميل الدروس.</p>';
    }
}

// عرض الدروس في الصفحة
function renderLessons(lessons) {
    if (!lessons.length) {
        lessonsContainer.innerHTML = '<p>لا توجد دروس بعد.</p>';
        return;
    }
    lessonsContainer.innerHTML = lessons.map(lesson => `
        <div class="lesson-item">
            <h3>${lesson.title}</h3>
            <audio controls>
                <source src="${lesson.file}" type="audio/mpeg">
                متصفحك لا يدعم تشغيل الصوت.
            </audio>
        </div>
    `).join('');
}

// تسجيل الدخول كمدير
loginBtn.addEventListener('click', () => {
    if (passwordInput.value === '0000') {
        isAdmin = true;
        loginBtn.style.display = 'none';
        passwordInput.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        addForm.style.display = 'block';
        statusMsg.textContent = '';
    } else {
        alert('كلمة المرور غير صحيحة');
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
    isAdmin = false;
    loginBtn.style.display = 'inline-block';
    passwordInput.style.display = 'inline-block';
    passwordInput.value = '';
    logoutBtn.style.display = 'none';
    addForm.style.display = 'none';
    statusMsg.textContent = '';
});

// إضافة درس جديد
addBtn.addEventListener('click', async () => {
    if (!lessonTitle.value.trim() || !audioFile.files[0]) {
        statusMsg.textContent = 'يرجى ملء جميع الحقول.';
        return;
    }
    const formData = new FormData();
    formData.append('title', lessonTitle.value.trim());
    formData.append('audio', audioFile.files[0]);
    formData.append('password', '0000'); // للتأكيد في الخادم

    statusMsg.textContent = 'جاري الرفع...';
    try {
        const res = await fetch('add.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            statusMsg.textContent = 'تمت إضافة الدرس بنجاح!';
            lessonTitle.value = '';
            audioFile.value = '';
            fetchLessons(); // تحديث فوري
        } else {
            statusMsg.textContent = 'خطأ: ' + data.message;
        }
    } catch (err) {
        statusMsg.textContent = 'فشل الاتصال بالخادم.';
    }
});

// تحميل الدروس أول مرة ثم كل 5 ثوانٍ
fetchLessons();
setInterval(fetchLessons, 5000);