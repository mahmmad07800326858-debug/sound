<?php
// تأكد من وجود مجلد uploads في نفس المسار
$uploadDir = 'uploads/';
$dataFile = 'data.json';

// كلمة المرور الصحيحة
$correctPassword = '0000';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'طريقة غير مسموحة']);
    exit;
}

$password = isset($_POST['password']) ? $_POST['password'] : '';
if ($password !== $correctPassword) {
    echo json_encode(['success' => false, 'message' => 'كلمة المرور غير صحيحة']);
    exit;
}

$title = isset($_POST['title']) ? trim($_POST['title']) : '';
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

// إنشاء اسم فريد
$newName = uniqid('lesson_', true) . '.' . $ext;
$destination = $uploadDir . $newName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode(['success' => false, 'message' => 'فشل حفظ الملف']);
    exit;
}

// تحديث ملف data.json
$lessons = [];
if (file_exists($dataFile)) {
    $lessons = json_decode(file_get_contents($dataFile), true);
    if (!is_array($lessons)) $lessons = [];
}
$lessons[] = [
    'title' => $title,
    'file' => $destination
];
file_put_contents($dataFile, json_encode($lessons, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo json_encode(['success' => true, 'message' => 'تم إضافة الدرس']);
?>