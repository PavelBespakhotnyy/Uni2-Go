<?php
// controllers/FormController.php
require_once __DIR__ . '/../PHP/conexion.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name            = $_POST['name'] ?? '';
    $surname         = $_POST['surname'] ?? '';
    $dateOfBirth     = $_POST['dateOfBirth'] ?? '';
    $email           = $_POST['email'] ?? '';
    $phone           = $_POST['phone'] ?? '';
    $password        = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirmPassword'] ?? '';
    // --- ZONA DE HASH ---
    $passwordSegura = password_hash($password, PASSWORD_BCRYPT);
    // --- ZONA DE VALIDACIÓN ---
    $errores = [];
    if (empty($name)) $errores[] = "El nombre es requerido.";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errores[] = "Email no válido.";

    if (empty($errores)) {
        // --- ZONA DE INSERCIÓN ---
        try {
            $nuevoUsuario = $db->collection('users')->newDocument();
            $nuevoUsuario->set([
                'name'              => $name,
                'surname'           => $surname,
                'phone'             => $phone,
                'dateOfBirth'       => $dateOfBirth,
                'email'             => $email,
                'passwordhash'      => $passwordSegura,
                'createdAt'         => new \DateTime()
            ]);
            
            // Redirigir con éxito
            header("Location: ../index.php?mensaje=success");
        } catch (Exception $e) {
            echo "Error al insertar: " . $e->getMessage();
        }
    } else {
        // Si hay errores, podrías manejarlos aquí
        print_r($errores);
    }
}