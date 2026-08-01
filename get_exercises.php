<?php
header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$dbname = 'solutions_python'; // ⚠️ Vérifiez le nom de votre BDD
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Récupérer tous les chapitres
    $stmtChap = $pdo->query("SELECT id, title FROM chapters ORDER BY id ASC");
    $chapters = $stmtChap->fetchAll();

    $db = [];
    foreach ($chapters as $chap) {
        // Récupérer les exercices du chapitre
        $stmtEx = $pdo->prepare("SELECT id, title, statement, code, explanation, simulation_html AS simulationHtml 
                                 FROM exercises 
                                 WHERE chapter_id = ? 
                                 ORDER BY id ASC");
        $stmtEx->execute([$chap['id']]);
        $exercises = $stmtEx->fetchAll();

        // Si $exercises est faux/null, on met un tableau vide []
        $db[] = [
            'id' => (int)$chap['id'],
            'title' => $chap['title'],
            'exercises' => $exercises ? $exercises : []
        ];
    }

    echo json_encode($db, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>