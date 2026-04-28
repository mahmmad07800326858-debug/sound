const lessonsContainer = document.getElementById('lessons-container');
const showAddBtn = document.getElementById('show-add-form-btn');
const addForm = document.getElementById('add-lesson-form');
const lessonTitle = document.getElementById('lesson-title');
const audioFile = document.getElementById('audio-file');
const uploadBtn = document.getElementById('upload-btn');
const statusMsg = document.getElementById('status-msg');

// تحميل الدروس من الخادم
async function fetchLessons() {
    try {
        const res = await fetch('data.json?t=' + Date.now());
        const lessons = await res.json();
        renderLessons(lessons);
    } catch (err) {
        lessonsContainer.innerHTML = '<p>تعذر تحميل الدروس.</p>';
    }
}

// عرض الدروس مع مشغّل وزر تحميل
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
            <br>
            <a href="${lesson.file}" download class="download-btn">⬇️ تحميل الدرس</a>
        </div>
    `).join('');
}

// إظهار نموذج الإضافة بعد التحقق من كلمة المرور
showAddBtn.addEventListener('click', () => {
    const password = prompt('أدخل كلمة المرور للإضافة:');
    if (password === '0000') {
        addForm.style.display = 'block';
        showAddBtn.style.display = 'none'; // نخفي الزر الأساسي أثناء الإضافة
        statusMsg.textContent = '';
    } else if (password !== null) {
        alert('كلمة المرور غير صحيحة!');
    }
});

// رفع درس جديد
uploadBtn.addEventListener('click', async () => {
    const title = lessonTitle.value.trim();
    const file = audioFile.files[0];

    if (!title || !file) {
        statusMsg.textContent = 'يرجى ملء جميع الحقول.';
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('audio', file);
    formData.append('password', '0000'); // تأكيد أمني للخادم

    statusMsg.textContent = 'جاري الرفع...';
    try {
        const res = await fetch('add.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            statusMsg.textContent = 'تمت إضافة الدرس بنجاح!';
            lessonTitle.value = '';
            audioFile.value = '';
            // إخفاء نموذج الإضافة وإظهار زر الإضافة مجدداً
            addForm.style.display = 'none';
            showAddBtn.style.display = 'inline-block';
            fetchLessons(); // تحديث فوري للقائمة
        } else {
            statusMsg.textContent = 'خطأ: ' + data.message;
        }
    } catch (err) {
        statusMsg.textContent = 'فشل الاتصال بالخادم.';
    }
});

// التحميل الأول ثم التحديث كل 5 ثوانٍ
fetchLessons();
setInterval(fetchLessons, 5000);