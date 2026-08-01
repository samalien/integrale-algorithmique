<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$code = isset($data['code']) ? strtoupper(trim($data['code'])) : '';
$device_id = isset($data['device_id']) ? trim($data['device_id']) : '';

if (empty($code) || empty($device_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Code ou device_id manquant']);
    exit;
}

try {
    // Chercher le code
    $stmt = $pdo->prepare("SELECT * FROM codes WHERE code = ?");
    $stmt->execute([$code]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Code invalide']);
        exit;
    }

    // Cas 1 : le code n'a jamais été utilisé sur une machine
    if (empty($row['device_id'])) {
        $update = $pdo->prepare("UPDATE codes SET device_id = ?, used = 1, used_at = NOW() WHERE code = ?");
        $update->execute([$device_id, $code]);

        echo json_encode(['success' => true, 'message' => 'Code activé sur cette machine']);
        exit;
    }

    // Cas 2 : le code est déjà lié à une machine
    if ($row['device_id'] === $device_id) {
        // Même machine → OK
        echo json_encode(['success' => true, 'message' => 'Accès autorisé']);
    } else {
        // Autre machine → refusé
        http_response_code(403);
        echo json_encode(['error' => 'Ce code est déjà utilisé sur une autre machine']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
?>