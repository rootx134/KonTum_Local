<?php
include_once __DIR__ . '/../api/config.php';
$database = new Database();
$db = $database->getConnection();
try {
    $db->exec("CREATE TABLE IF NOT EXISTS banners (
      id int(11) NOT NULL AUTO_INCREMENT,
      image_url varchar(255) NOT NULL,
      link_url varchar(255) DEFAULT NULL,
      is_active tinyint(1) DEFAULT 1,
      sort_order int(11) DEFAULT 0,
      created_at timestamp DEFAULT current_timestamp(),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    
    // Check if empty
    $stmt = $db->query("SELECT COUNT(*) FROM banners");
    if ($stmt->fetchColumn() == 0) {
        $db->exec("INSERT INTO banners (image_url, link_url, is_active, sort_order) VALUES
        ('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800', '', 1, 1),
        ('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800', '', 1, 2);");
    }
    echo "Migration Success\n";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
