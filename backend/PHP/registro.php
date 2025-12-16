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

        $check_sql = "SELECT email FROM users WHERE email = ?";
        $check_stmt = $con->prepare($check_sql);
        
        if ($check_stmt) {
            $check_stmt->bind_param("s", $correo);
            $check_stmt->execute();
            $check_stmt->store_result(); // Almacenar el resultado para contar filas
            
            if ($check_stmt->num_rows > 0) {
                // El correo ya existe
                $check_stmt->close();
                ?>
                <script>
                    alert('Error: Este correo electrónico ya está registrado. Por favor, utiliza uno diferente.');
                    window.location.href = '/Uni2-Go/frontend/pages/registration.html'; // Redirige de vuelta al formulario de registro
                </script>
                <?php
                exit(); // Detiene la ejecución del script
            }
            $check_stmt->close();
        }
        $sql = "INSERT INTO `users` (`email`, `password_hash`, `first_name`, `last_name`, `phone`, `date_of_birth`, `created_at`, `updated_at`, `is_active`) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $con->prepare($sql);
        if ($stmt) {
            // 5. Vincular parámetros ('s' es para los parametros string, 'i'es para los parametros integer)
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
            if ($stmt->execute()) {
                ?>
                    <script>
                    window.location.href = '/Uni2-Go/frontend/pages/login.html';
                    </script>
                <?php
            } else {
                echo "Error al registrar: " . $stmt->error;
            }
            $stmt->close();
        } else {
            
            echo "Error en la preparación de la consulta: " . $con->error;
        }
        


}
}



?>