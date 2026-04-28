document.addEventListener('DOMContentLoaded', function() {
    // عناصر واجهة المستخدم
    const lessonsContainer = document.getElementById('lessons-container');
    const showAddBtn = document.getElementById('show-add-form-btn');
    const addForm = document.getElementById('add-lesson-form');
    const lessonTitle = document.getElementById('lesson-title');
    const audioFile = document.getElementById('audio-file');
    const uploadBtn = document.getElementById('upload-btn');
    const statusMsg = document.getElementById('status-msg');

    // عناصر نموذج التعديل
    const editForm = document.getElementById('edit-lesson-form');
    const editLessonId = document.getElementById('edit-lesson-id');
    const editLessonTitle = document.getElementById('edit-lesson-title');
    const editAudioFile = document.getElementById('edit-audio-file');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editStatusMsg = document.getElementById('edit-status-msg');

    // حالة المدير
    let isAdmin = false;

    // دوال مساعدة
    function formatSize(bytes) {
        if (!bytes) return 'غير معروف';
        const units = ['ب', 'ك.ب', 'م.ب', 'ج.ب'];
        let i = 0;
        let size = bytes;
        while (size >= 1024 && i < units.length - 1) {
            size /= 1024;
            i++;
        }
        return size.toFixed(1) + ' ' + units[i];
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'غير معروف';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getAudioDuration(fileUrl) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = fileUrl;
            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration === Infinity || isNaN(audio.duration)) {
                    resolve('غير معروف');
                } else {
                    const mins = Math.floor(audio.duration / 60);
                    const secs = Math.floor(audio.duration % 60);
                    resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
                }
            });
            audio.addEventListener('error', () => resolve('غير معروف'));
            setTimeout(() => resolve('غير معروف'), 3000);
        });
    }

    // جلب الدروس
    async function fetchLessons() {
        try {
            const res = await fetch('data.json?t=' + Date.now());
            const lessons = await res.json();
            renderLessons(lessons);
        } catch (err) {
            lessonsContainer.innerHTML = '<p>تعذر تحميل الدروس. تأكد من وجود data.json</p>';
            console.error(err);
        }
    }

    // عرض الدروس مع أزرار التحكم إذا كان مديراً
    async function renderLessons(lessons) {
        if (!lessons.length) {
            lessonsContainer.innerHTML = '<p>لا توجد دروس بعد.</p>';
            return;
        }

        const items = await Promise.all(lessons.map(async (lesson) => {
            const duration = await getAudioDuration(lesson.file);
            return `
                <div class="lesson-item" data-id="${lesson.id}">
                    <h3>${lesson.title}</h3>
                    <div class="lesson-meta">
                        <span>📅 ${formatDate(lesson.date)}</span>
                        <span>📁 ${formatSize(lesson.size)}</span>
                        <span>⏱️ ${duration}</span>
                    </div>
                    <audio controls>
                        <source src="${lesson.file}" type="audio/mpeg">
                        متصفحك لا يدعم تشغيل الصوت.
                    </audio>
                    <br>
                    <a href="${lesson.file}" download class="download-btn">⬇️ تحميل الدرس</a>
                    ${isAdmin ? `
                        <div class="admin-btns">
                            <button class="edit-btn" data-id="${lesson.id}">✏️ تعديل</button>
                            <button class="delete-btn" data-id="${lesson.id}">🗑️ حذف</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }));
        lessonsContainer.innerHTML = items.join('');

        // ربط أحداث أزرار التعديل والحذف
        if (isAdmin) {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', openEditForm);
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', deleteLesson);
            });
        }
    }

    // تسجيل الدخول كمدير
    showAddBtn.addEventListener('click', () => {
        const password = prompt('أدخل كلمة المرور للإضافة:');
        if (password === null) return;
        if (password === '0000') {
            isAdmin = true;
            showAddBtn.style.display = 'none';
            addForm.style.display = 'block';
            statusMsg.textContent = '';
            // إعادة تحميل الدروس لإظهار أزرار التعديل والحذف
            fetchLessons();
        } else {
            alert('❌ كلمة المرور غير صحيحة!');
        }
    });

    // إضافة درس جديد
    uploadBtn.addEventListener('click', async () => {
        const title = lessonTitle.value.trim();
        const file = audioFile.files[0];
        if (!title || !file) {
            statusMsg.textContent = 'يرجى ملء جميع الحقول.';
            return;
        }

        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('title', title);
        formData.append('audio', file);
        formData.append('password', '0000');

        statusMsg.textContent = 'جاري الرفع...';
        try {
            const res = await fetch('add.php', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                statusMsg.textContent = '✅ تمت إضافة الدرس بنجاح!';
                lessonTitle.value = '';
                audioFile.value = '';
                // لا نعيد إظهار زر الإضافة، نبقى في وضع الإدارة
                fetchLessons();
            } else {
                statusMsg.textContent = 'خطأ: ' + data.message;
            }
        } catch (err) {
            statusMsg.textContent = 'فشل الاتصال بالخادم.';
        }
    });

    // فتح نموذج تعديل الدرس
    async function openEditForm(e) {
        const id = e.target.dataset.id;
        // نجلب الدرس من البيانات المخزنة محلياً (نعيد fetch لضمان الدقة)
        const res = await fetch('data.json?t=' + Date.now());
        const lessons = await res.json();
        const lesson = lessons.find(l => l.id == id);
        if (!lesson) {
            alert('الدرس غير موجود');
            return;
        }

        editLessonId.value = lesson.id;
        editLessonTitle.value = lesson.title;
        editAudioFile.value = ''; // إفراغ حقل الملف
        editStatusMsg.textContent = '';

        // إخفاء نماذج أخرى وإظهار نموذج التعديل
        addForm.style.display = 'none';
        editForm.style.display = 'block';
        showAddBtn.style.display = 'none'; // يبقى مخفياً
    }

    // حفظ التعديلات
    saveEditBtn.addEventListener('click', async () => {
        const id = editLessonId.value;
        const newTitle = editLessonTitle.value.trim();
        const newFile = editAudioFile.files[0];

        if (!newTitle) {
            editStatusMsg.textContent = 'العنوان مطلوب';
            return;
        }

        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('id', id);
        formData.append('title', newTitle);
        if (newFile) {
            formData.append('audio', newFile);
        }
        formData.append('password', '0000');

        editStatusMsg.textContent = 'جاري الحفظ...';
        try {
            const res = await fetch('add.php', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                editStatusMsg.textContent = '✅ تم تحديث الدرس بنجاح';
                // العودة إلى وضع الإضافة (أو البقاء)
                editForm.style.display = 'none';
                fetchLessons();
            } else {
                editStatusMsg.textContent = 'خطأ: ' + data.message;
            }
        } catch (err) {
            editStatusMsg.textContent = 'فشل الاتصال بالخادم.';
        }
    });

    // إلغاء التعديل
    cancelEditBtn.addEventListener('click', () => {
        editForm.style.display = 'none';
        // العودة إلى نموذج الإضافة (لأننا دخلنا كمدير)
        addForm.style.display = 'block';
        showAddBtn.style.display = 'none';
        editStatusMsg.textContent = '';
    });

    // حذف درس
    async function deleteLesson(e) {
        const id = e.target.dataset.id;
        if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;

        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        formData.append('password', '0000');

        try {
            const res = await fetch('add.php', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                fetchLessons();
            } else {
                alert('خطأ: ' + data.message);
            }
        } catch (err) {
            alert('فشل الاتصال بالخادم.');
        }
    }

    // تحميل الدروس أول مرة وتحديث تلقائي
    fetchLessons();
    setInterval(fetchLessons, 5000);
});