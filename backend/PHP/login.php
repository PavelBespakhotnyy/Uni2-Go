<?php 
require 'index.php';
$login_page = '/Uni2-Go/frontend/pages/login.html';
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Iniciar_Sesion') {
    if (!empty($_POST['correoUsuario']) && !empty($_POST['contrasena'])) {
        $correo = $_POST['correoUsuario'];
        $contrasena = $_POST['contrasena'];
        $fecha_actualizada = date('Y-m-d H:i:s');
        $sql = "SELECT `password_hash` FROM users WHERE email = ?";
        $stmt = $con->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s",$correo);

            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();

            if ($row && password_verify($contrasena, $row['password_hash'])) {
                $sql2 = "UPDATE `users` SET `updated_at`= ? WHERE email = ?";
                $stmt2 = $con->prepare($sql2);
                $stmt2->bind_param("ss", $fecha_actualizada, $correo);
                $stmt2->execute();
                $stmt2->close();
                ?>
                    <script>
                        window.location.href = '/Uni2-Go/frontend/pages/calendario.html';
                    </script>
                <?php
            } else{
                ?>
                    <script>
                        alert('Error: Las contraseña o el correo no coincide. Por favor, verifícala.'); 
                        window.location.href = '/Uni2-Go/frontend/pages/login.html';
                    </script>
                <?php
            }

        } else {
            echo "Error en la preparación de la consulta: " . $con->error;
        }
        
    }
}



?>