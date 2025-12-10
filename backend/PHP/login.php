<?php 
require 'index.php';
$login_page = '/Uni2-Go/frontend/pages/login.html';
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Iniciar_Sesion') {
    if (!empty($_POST['correoUsuario']) && !empty($_POST['contrasena'])) {
        $correo = $_POST['correoUsuario'];
        $contrasena = $_POST['contrasena'];
        $sql = "SELECT `email`, `password_hash` FROM users WHERE email = '$correo'  AND password_hash = '$contrasena'";
        $result = $con->query($sql);
        $row = $result->fetch_assoc();
        
        if ($row === null) {
            header("Location: $login_page?error=db_error");
            exit();
        } else{
            ?>
            <script>
                window.location.href = '/Uni2-Go/frontend/pages/calendario.html';
            </script>
            <?php
        }

    }
}



?>