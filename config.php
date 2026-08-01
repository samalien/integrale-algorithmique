<?php
$host = 'localhost';
$dbname = 'solutions_python';
$username = 'root';
$password = ''; // par défaut sur WAMP c’est vide

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Erreur de connexion à la base de données']));
}
?>