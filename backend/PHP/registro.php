<?php 
require 'index.php'; // llamo el archivo de conexion con la base de datos
//compruebo si han entrado mediante el form 
if (isset($_POST['enviar']) && $_POST['enviar'] == 'Registrarse') {
    //compruebo si los campos no estan vacios
    if (!empty($_POST['usuarioNombre']) && !empty($_POST['usuarioApellido']) && !empty($_POST['nacimiento']) && !empty($_POST['Correo']) && !empty($_POST['Telefono']) && !empty($_POST['contrasena'])) {
        //cada campo lo asocio a una variable
        $nombre = $_POST['usuarioNombre'];
        $apellido = $_POST['usuarioApellido'];
        $nacimiento = $_POST['nacimiento'];
        $correo = $_POST['Correo'];
        $telefono = $_POST['Telefono'];
        $contrasena = $_POST['contrasena'];
        //genero el formato hash y lo asocio a una variable
        $contrasena_hash = password_hash($contrasena, PASSWORD_DEFAULT);
        $fecha_creacion = date('Y-m-d H:i:s'); //guardamos la fecha y hora de hoy
        $fecha_actualizado = $fecha_creacion; 
        $activo = isset($_POST['activo']) ? 1 : 0; // asociamos una boolean para marcar que esta activo
        
        $check_sql = "SELECT email FROM users WHERE email = ?"; //generamos una consulta para la tabla de usuarios
        $check_stmt = $con->prepare($check_sql); //la preparamos pero aun no se ha enviado
        
        if ($check_stmt) { //comprobamos que la consulta este en espera para ejecutarse
            $check_stmt->bind_param("s", $correo); //rellenamos los campos marcando 'bind_param("el tipo de parametro", "y la informacion que asociamos en ese parametro")'
            $check_stmt->execute(); //ejecutamos la consulta
            $check_stmt->store_result(); // Almacenamos el resultado para contar filas
            
            if ($check_stmt->num_rows > 0) { //revisamos si ya existe ese correo en la tabla de usuarios
                // El correo ya existe
                $check_stmt->close(); //cerramos consulta
                ?>
                <script>
                    alert('Error: Este correo electrónico ya está registrado. Por favor, utiliza uno diferente.');
                    window.location.href = '/Uni2-Go/frontend/pages/registration.html'; // Redirige de vuelta al formulario de registro
                </script>
                <?php
                exit(); // Detiene la ejecución del script
            }
            $check_stmt->close(); //cerramos consulta
        }
        $sql = "INSERT INTO `users` (`email`, `password_hash`, `first_name`, `last_name`, `phone`, `date_of_birth`, `created_at`, `updated_at`, `is_active`) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"; //generamos una insercion
        $stmt = $con->prepare($sql); //la preparamos pero aun no se ha enviado
        if ($stmt) { //comprobamos que la insercion este en espera para ejecutarse
            // Vincular parámetros ('s' es para los parametros string, 'i'es para los parametros integer)
            // Tipos: ssssssssi (9 parámetros, todos strings excepto el último que es un entero)
            $stmt->bind_param("ssssssssi", 
                $correo, 
                $contrasena_hash, 
                $nombre, 
                $apellido, 
                $telefono, 
                $nacimiento, 
                $fecha_creacion, 
                $fecha_actualizado, 
                $activo
            );
            if ($stmt->execute()) { //comprovamos si se ha ejecutado bien
                //se ha ejecutado correctamente y te envia a la pagina de login
                ?>
                    <script>
                    window.location.href = '/Uni2-Go/frontend/pages/login.html';
                    </script>
                <?php
            } else {
                //algun parametro o la insercion ha fallado
                echo "Error al registrar: " . $stmt->error;
            }
            $stmt->close(); //cerramos insercion
        } else {
            //no se ha podido conectar
            echo "Error en la preparación de la consulta: " . $con->error;
        }
        


}
}



?>