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
        print_r($nombre);
        print_r($apellido);
        print_r($nacimiento);
        print_r($correo);
        print_r($telefono);
        print_r($contrasena);
        /*$sql = "INSERT INTO `users`(`email`, `password_hash`, `first_name`, `last_name`, `phone`, `date_of_birth`, `created_at`, `updated_at`, `is_active`) VALUES ('$correo','$contrasena','$nombre','$apellido','$telefono','$nacimiento','[value-7]','[value-8]','[value-9]')";
        $resultado = $con->query($sql);
        */
?>
        <script>
            window.location.href = '/Uni2-Go/frontend/pages/login.html';
        </script>
<?php

}
}



?>