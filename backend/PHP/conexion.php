<?php
// PHP/conexion.php
require_once __DIR__ . '/../vendor/autoload.php'; 

use Kreait\Firebase\Factory;
use Dotenv\Dotenv;

$rutaEnv = __DIR__ . '/../../frontend/';

try {
    $dotenv = Dotenv::createImmutable($rutaEnv);
    $dotenv->load();

    // 2. PHP necesita estos campos para poder "entrar" a Firebase.
    // Aunque en JS uses apiKey, aquí necesitas reconstruir el acceso de servidor.
    $serviceAccount = [
        'type'         => 'service_account',
        'project_id'   => $_ENV['VITE_FIREBASE_PROJECT_ID'], // Lo saca del .env
        'private_key'  => str_replace('\n', "\n", $_ENV['FIREBASE_PRIVATE_KEY']), // Lo saca del .env
        'client_email' => $_ENV['FIREBASE_CLIENT_EMAIL'], // Lo saca del .env
    ];

    // 3. Inicializamos la conexión directamente con los datos
    $factory = (new Factory)->withServiceAccount($serviceAccount);

    // 4. Obtenemos Firestore
    $firestore = $factory->createFirestore();
    $db = $firestore->database();

    // echo "Conectado directamente a Firebase desde el servidor";

} catch (Exception $e) {
    die("Error de conexión: " . $e->getMessage());
}