<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link rel="icon" href="/images/calendar.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="/images/calendar.ico">
    <title>Iniciar session</title>
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
        
        <!-- Session Status -->
        @if (session('status'))
            <div style="color: green; margin-bottom: 1rem;">
                {{ session('status') }}
            </div>
        @endif

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

        <form method="POST" action="{{ route('login') }}">
            @csrf
            <a>
                <img src="/images/logo_Uni2_Go.svg">
            </a>
            <h1>Inicia Sesión</h1>
            <div>
                <label>Correo electronico</label><br>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus pattern="[a-z0-9._%+-]+@[a-z0-9._%-]+\.[a-z]{2,}">
            </div>
            <div>
                <label>Contraseña</label><br>
                <input type="password" name="password" id="contrasena" required pattern="[0-9]{6,}">
            </div>

            <!-- Remember Me -->
            <div style="width: 100%; text-align: left; margin-bottom: 15px;">
                <label for="remember_me" style="display: inline-flex; align-items: center;">
                    <input id="remember_me" type="checkbox" name="remember" style="width: auto; margin-right: 5px;">
                    <span style="font-size: 14px;">Recuérdame</span>
                </label>
            </div>

            @if (Route::has('password.request'))
                <a href="{{ route('password.request') }}" style="font-size: 14px; margin-bottom: 20px; display: block;">¿Has olvidado tu contraseña?</a>
            @endif
            
            <input type="submit" name="enviar" value="Iniciar Sesion">

        </form>
    </div>

    <script type="module" src="/js/main.js"></script>
    <script type="module" src="/js/preloader.js"></script>

</body>
</html>
