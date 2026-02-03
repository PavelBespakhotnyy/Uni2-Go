<?php
require_once 'conexion.php';

try {
    // Intentamos listar las colecciones (solo lectura, no borra ni inserta nada)
    $colecciones = $db->collections();
    echo "¡Conexión exitosa! El cliente de Firestore está respondiendo correctamente.";
} catch (Exception $e) {
    echo "Error de comunicación con Firebase: " . $e->getMessage();
}