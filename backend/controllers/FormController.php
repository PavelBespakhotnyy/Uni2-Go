<?php
// controllers/FormController.php
require_once __DIR__ . '/../PHP/conexion.php';

use Kreait\Firebase\Exception\Auth\EmailExists;
use Kreait\Firebase\Exception\FirebaseException;

// --- FLUJO DE REGISTRO ---
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Registrarse') {
    $name             = $_POST['usuarioNombre'] ?? '';
    $surname          = $_POST['usuarioApellido'] ?? '';
    $dateOfBirth      = $_POST['nacimiento'] ?? '';
    $email            = trim($_POST['Correo'] ?? '');
    $phone            = $_POST['Telefono'] ?? '';
    $password         = $_POST['contrasena'] ?? '';
    $confirmPassword  = $_POST['confcontrasena'] ?? '';

    if ($password !== $confirmPassword) {
        die("Error: Las contraseñas no coinciden.");
    }

    try {
        // 1. Crear usuario en Firebase Auth
        $userProperties = [
            'email' => $email,
            'password' => $password,
        ];
        $createdUser = $auth->createUser($userProperties); // Usamos $auth directamente

        // 2. Guardar datos extra en Firestore
        $db->collection('users')->document($createdUser->uid)->set([
            'name' => $name,
            'surname' => $surname,
            'phone' => $phone,
            'dateOfBirth' => $dateOfBirth,
            'email' => $email,
            'createdAt' => new \DateTimeImmutable('now'),
        ]);

        header("Location: ../../frontend/pages/login.html?registro=exitoso");
        exit();

    } catch (EmailExists $e) {
        header("Location: ../registro.php?error=email_existe");
        exit();
    } catch (FirebaseException $e) {
        die("Error de Firebase: " . $e->getMessage());
    }
}

// --- FLUJO DE INICIO DE SESIÓN ---
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Iniciar Sesion') {
    $email    = $_POST['correoUsuario'] ?? '';
    $password = $_POST['contrasena'] ?? '';

    if (empty($email) || empty($password)) {
        die("El email y la contraseña son obligatorios.");
    }

    try {
        // CORRECCIÓN: Quitamos el $this-> y usamos $auth
        $signInResult = $auth->signInWithEmailAndPassword($email, $password);
        
        // Si llegamos aquí, el login es correcto
        session_start();
        $_SESSION['user_id'] = $signInResult->firebaseUserId();
        
        header("Location: ../../frontend/pages/calendario.html?Inicio=exitoso"); // O a tu página de inicio
        exit();

    } catch (FirebaseException $e) {
        // Error de credenciales o de conexión
        header("Location: ../login.php?error=auth_failed");
        exit();
    }
}