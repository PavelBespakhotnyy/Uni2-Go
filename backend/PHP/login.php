<?php 
require 'index.php'; // llamo el archivo de conexion con la base de datos
//compruebo si han entrado mediante el form
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Iniciar_Sesion') {
    //compruebo si los campos no estan vacios
    if (!empty($_POST['correoUsuario']) && !empty($_POST['contrasena'])) {
        //cada campo lo asocio a una variable
        $correo = $_POST['correoUsuario'];
        $contrasena = $_POST['contrasena'];
        $fecha_actualizada = date('Y-m-d H:i:s');
        $sql = "SELECT `password_hash` FROM users WHERE email = ?"; //generamos una consulta para la tabla de usuarios
        $stmt = $con->prepare($sql); //la preparamos pero aun no se ha enviado
        if ($stmt) { //comprobamos que la consulta este en espera para ejecutarse
            $stmt->bind_param("s",$correo); //rellenamos los campos

            $stmt->execute(); //ejecutamos la consulta
            $result = $stmt->get_result(); //optenemos resultado
            $row = $result->fetch_assoc(); //lo transformamos en un array
            $stmt->close(); //ceramos consulta

            if ($row && password_verify($contrasena, $row['password_hash'])) { //comprobamos que $row se ha convertido en un array y verificamos que la contraseña sea la misma que se guardo en formato hash
                //si row es una array y el hash coincide con la contraseña
                $sql2 = "UPDATE `users` SET `updated_at`= ? WHERE email = ?"; //generamos un update para actualizar cada  vez que entra en la web
                $stmt2 = $con->prepare($sql2); // preparamos el update
                $stmt2->bind_param("ss", $fecha_actualizada, $correo); // rellenamos los campos
                $stmt2->execute(); // ejecutamos el update
                $stmt2->close(); // cerramos el update
                //te dirige a calendario
                ?>
                    <script>
                        window.location.href = '/Uni2-Go/frontend/pages/calendario.html';
                    </script>
                <?php
            } else{
                //si row ha fallado o el hash no coincide
                //salta error y te envia directo al login otra vez
                ?>
                    <script>
                        alert('Error: Las contraseña o el correo no coincide. Por favor, verifícala.'); 
                        window.location.href = '/Uni2-Go/frontend/pages/login.html';
                    </script>
                <?php
            }

        } else {
            //no se ha podido conectar
            echo "Error en la preparación de la consulta: " . $con->error;
        }
        
    }
}



?>