<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <link rel="icon" href="/images/calendar.ico" type="image/x-icon">
        <link rel="apple-touch-icon" href="/images/calendar.ico">
        <title>Registrarse</title>
        <link rel="stylesheet" href="/css/preloader.css">
        <link rel="stylesheet" href="/css/style.css">

    </head>
    <body>

        <div id="preloader">
            <div class="loader"></div>
        </div>

        <div id="content">

            <a href="/">
                <img src="/images/flecha 1.svg">
            </a>

            <!-- Validation Errors -->
            @if ($errors->any())
                <div style="color: red; margin-bottom: 1rem;">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('register') }}" id="registroForm">
                @csrf

                <img src="/images/logo_Uni2_Go.svg" alt="Logo Uni2 Go">

                <h1>Regístrate</h1>
        
                <div>
                    <label>Nombre de usuario</label><br>
                    <input type="text" name="name" value="{{ old('name') }}" required autofocus>
                </div>

                <!-- Campos adicionales (Pendientes de implementar en backend) -->
                <div>
                    <label>Apellido de usuario</label><br>
                    <input type="text" name="usuarioApellido" value="{{ old('usuarioApellido') }}">
                </div>
        
                <div>
                    <label>Fecha de nacimiento</label><br>
                    <input type="date" name="nacimiento" value="{{ old('nacimiento') }}">
                </div>
        
                <div>
                    <label>Correo Electrónico</label><br>
                    <input type="email" name="email" value="{{ old('email') }}" required pattern="[a-z0-9._%+-]+@[a-z0-9._%-]+\.[a-z]{2,}">
                </div>
        
                <div>
                    <label>Teléfono</label><br>
                    <input type="number" name="Telefono" value="{{ old('Telefono') }}">
                </div>
        
                <div>
                    <label>Contraseña</label><br>
                    <input type="password" name="password" id="contrasena" required pattern="[0-9]{6,}">
                </div>
        
                <div>
                    <label>Confirmar Contraseña</label><br>
                    <input type="password" name="password_confirmation" id="confcontrasena" required>
                </div>
                
                <input type="submit" name="enviar" value="Registrarse">
                
                <div style="margin-top: 20px; text-align: center;">
                    <a href="{{ route('login') }}">¿Ya estás registrado?</a>
                </div>
            </form>

            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const form = document.getElementById('registroForm');

                    form.addEventListener('submit', function(event) {
                        const contrasena = document.getElementById('contrasena').value;
                        const confContrasena = document.getElementById('confcontrasena').value;

                        // Verificamos si las contraseñas no coinciden
                        if (contrasena !== confContrasena) {
            
                            // 1. Detenemos el envío del formulario SOLO si hay error
                            event.preventDefault(); 
            
                            // 2. Alertamos y limpiamos
                            alert('Error: Las contraseñas no coinciden. Por favor, verifícalas.');
                            document.getElementById('confcontrasena').value = ''; 
                        } 
       
                    });
                });
            </script>
        </div>

        <script type="module" src="/js/main.js"></script>
        <script type="module" src="/js/preloader.js"></script>

    </body>
</html>
