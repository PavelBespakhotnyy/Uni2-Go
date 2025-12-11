<?php 
require 'index.php';

if (isset($_POST['enviar']) && $_POST['enviar'] == 'Registrarse') {
    if (!empty($_POST['usuarioNombre']) && !empty($_POST['usuarioApellido']) && !empty($_POST['nacimiento']) && !empty($_POST['Correo']) && !empty($_POST['Telefono']) && !empty($_POST['contrasena'])) {
        $nombre = $_POST['usuarioNombre'];
        $apellido = $_POST['usuarioApellido'];
        $nacimiento = $_POST['nacimiento'];
        $correo = $_POST['Correo'];
        $telefono = $_POST['Telefono'];
        $contrasena = $_POST['contrasena'];
        // --- PASO CLAVE: GENERAR EL HASH ---
        $contrasena_hash = password_hash($contrasena, PASSWORD_DEFAULT);
        $fecha_creacion = date('Y-m-d H:i:s');
        $fecha_actualizado = $fecha_creacion; 
        $activo = isset($_POST['activo']) ? 1 : 0;
        $sql = "INSERT INTO `users`(`email`, `password_hash`, `first_name`, `last_name`, `phone`, `date_of_birth`, `created_at`, `updated_at`, `is_active`) VALUES ('$correo','$contrasena_hash','$nombre','$apellido','$telefono','$nacimiento','$fecha_creacion','$fecha_actualizado','$activo')";
        $resultado = $con->query($sql);
        
?>
        <script>
            window.location.href = '/Uni2-Go/frontend/pages/login.html';
        </script>
<?php

}
}



?>