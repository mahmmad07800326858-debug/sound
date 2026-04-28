<?php
$uploadDir = 'uploads/';
$dataFile = 'data.json';
$correctPassword = '0000';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'طريقة غير مسموحة']);
    exit;
}

$password = $_POST['password'] ?? '';
if ($password !== $correctPassword) {
    echo json_encode(['success' => false, 'message' => 'كلمة المرور غير صحيحة']);
    exit;
}

$action = $_POST['action'] ?? 'add';

// دالة قراءة الدروس
function getLessons() {
    global $dataFile;
    if (!file_exists($dataFile)) return [];
    $lessons = json_decode(file_get_contents($dataFile), true);
    return is_array($lessons) ? $lessons : [];
}

// دالة حفظ الدروس
function saveLessons($lessons) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($lessons, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// تنفيذ الإجراء المطلوب
switch ($action) {
    case 'add':
        // إضافة درس (موجود سابقاً)
        $title = trim($_POST['title'] ?? '');
        if ($title === '') {
            echo json_encode(['success' => false, 'message' => 'عنوان الدرس مطلوب']);
            exit;
        }
        if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'message' => 'فشل رفع الملف الصوتي']);
            exit;
        }
        $file = $_FILES['audio'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedTypes = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
        if (!in_array($ext, $allowedTypes)) {
            echo json_encode(['success' => false, 'message' => 'نوع الملف غير مسموح به']);
            exit;
        }
        $newName = uniqid('lesson_', true) . '.' . $ext;
        $destination = $uploadDir . $newName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            echo json_encode(['success' => false, 'message' => 'فشل حفظ الملف']);
            exit;
        }
        $lessons = getLessons();
        // إنشاء id فريد (أعلى id + 1)
        $maxId = 0;
        foreach ($lessons as $l) {
            if (isset($l['id']) && $l['id'] > $maxId) $maxId = $l['id'];
        }
        $newLesson = [
            'id' => $maxId + 1,
            'title' => $title,
            'file' => $destination,
            'date' => date('Y-m-d H:i:s'),
            'size' => filesize($destination)
        ];
        $lessons[] = $newLesson;
        saveLessons($lessons);
        echo json_encode(['success' => true, 'message' => 'تم إضافة الدرس']);
        break;

    case 'delete':
        $id = $_POST['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'معرف الدرس مطلوب']);
            exit;
        }
        $lessons = getLessons();
        $found = false;
        foreach ($lessons as $i => $lesson) {
            if ($lesson['id'] == $id) {
                // حذف الملف الصوتي
                if (file_exists($lesson['file'])) {
                    unlink($lesson['file']);
                }
                array_splice($lessons, $i, 1);
                $found = true;
                break;
            }
        }
        if ($found) {
            saveLessons($lessons);
            echo json_encode(['success' => true, 'message' => 'تم حذف الدرس']);
        } else {
            echo json_encode(['success' => false, 'message' => 'الدرس غير موجود']);
        }
        break;

    case 'update':
        $id = $_POST['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'معرف الدرس مطلوب']);
            exit;
        }
        $newTitle = trim($_POST['title'] ?? '');
        if ($newTitle === '') {
            echo json_encode(['success' => false, 'message' => 'العنوان الجديد مطلوب']);
            exit;
        }
        $lessons = getLessons();
        $updated = false;
        foreach ($lessons as &$lesson) {
            if ($lesson['id'] == $id) {
                $lesson['title'] = $newTitle;
                // إذا تم رفع ملف جديد
                if (isset($_FILES['audio']) && $_FILES['audio']['error'] === UPLOAD_ERR_OK) {
                    $file = $_FILES['audio'];
                    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                    $allowedTypes = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
                    if (!in_array($ext, $allowedTypes)) {
                        echo json_encode(['success' => false, 'message' => 'نوع الملف غير مسموح به']);
                        exit;
                    }
                    // حذف الملف القديم
                    if (file_exists($lesson['file'])) {
                        unlink($lesson['file']);
                    }
                    $newName = uniqid('lesson_', true) . '.' . $ext;
                    $destination = $uploadDir . $newName;
                    if (!move_uploaded_file($file['tmp_name'], $destination)) {
                        echo json_encode(['success' => false, 'message' => 'فشل حفظ الملف الجديد']);
                        exit;
                    }
                    $lesson['file'] = $destination;
                    $lesson['size'] = filesize($destination);
                    $lesson['date'] = date('Y-m-d H:i:s'); // تحديث التاريخ
                }
                $updated = true;
                break;
            }
        }
        if ($updated) {
            saveLessons($lessons);
            echo json_encode(['success' => true, 'message' => 'تم تحديث الدرس']);
        } else {
            echo json_encode(['success' => false, 'message' => 'الدرس غير موجود']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'إجراء غير معروف']);
}