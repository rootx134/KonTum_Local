<?php
include_once __DIR__ . '/../api/config.php';
$database = new Database();
$db = $database->getConnection();
try {
    $db->exec("INSERT INTO categories (name, slug, icon) VALUES ('Check-in', 'check-in', 'fa-camera') ON DUPLICATE KEY UPDATE icon='fa-camera';");
    $db->exec("INSERT INTO categories (name, slug, icon) VALUES ('Đặc sản', 'dac-san', 'fa-bowl-food') ON DUPLICATE KEY UPDATE icon='fa-bowl-food';");
    echo "Categories inserted successfully.\n";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
