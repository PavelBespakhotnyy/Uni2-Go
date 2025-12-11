<?php 
require 'index.php';
$login_page = '/Uni2-Go/frontend/pages/login.html';
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Iniciar_Sesion') {
    if (!empty($_POST['correoUsuario']) && !empty($_POST['contrasena'])) {
        $correo = $_POST['correoUsuario'];
        $contrasena = $_POST['contrasena'];
        $fecha_actualizada = date('Y-m-d H:i:s');
        $sql = "SELECT `email`, `password_hash` FROM users WHERE email = '$correo'  AND password_hash = '$contrasena'";
        $result = $con->query($sql);
        $row = $result->fetch_assoc();
        
        if (password_verify($contrasena, $row['password_hash'])) {
            ?>
            <script>
                alert('Error: Las contraseña o el correo no coincide. Por favor, verifícala.'); 
                window.location.href = '/Uni2-Go/frontend/pages/login.html';
            </script>
            <?php
        } else{
            $sql2 = "UPDATE `users` SET `updated_at`='$fecha_actualizada' WHERE email = '$correo'";
            $result2 = $con->query($sql2);
            ?>
            <script>
                window.location.href = '/Uni2-Go/frontend/pages/calendario.html?correo=<?php echo $correo;?>';
            </script>
            <?php
        }

    }
}



?>