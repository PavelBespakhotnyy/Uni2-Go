<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Google\Cloud\Core\Timestamp;

class AuthController extends Controller
{
    protected $auth;
    protected $firestore;

    public function __construct()
    {
        $this->auth = app('firebase.auth');
        $this->firestore = app('firebase.firestore')->database();
    }

    public function login(Request $request)
    {
        $email = $request->input('correoUsuario');
        $password = $request->input('contrasena');

        try {
            // Firebase Admin SDK does not support signInWithEmailAndPassword directly (it's for admin tasks).
            // We use the Firebase Auth REST API for this specific user action from the backend.
            $apiKey = config('services.firebase.api_key');
            $response = \Illuminate\Support\Facades\Http::post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={$apiKey}", [
                'email' => $email,
                'password' => $password,
                'returnSecureToken' => true,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Optional: You could create a Laravel session here if needed, 
                // but for this static integration, we just redirect on success.
                // $uid = $data['localId'];
                // $idToken = $data['idToken'];
                
                // Redirect to frontend calendar
                return redirect()->to('http://localhost/Uni2-Go/frontend/pages/calendario.html');
            } else {
                // Login failed (User not found or wrong password)
                 return redirect()->to('http://localhost/Uni2-Go/frontend/pages/login.html?error=invalid_credentials');
            }

        } catch (\Exception $e) {
            // Log error
            \Illuminate\Support\Facades\Log::error('Firebase Login Error: ' . $e->getMessage());
            return redirect()->to('http://localhost/Uni2-Go/frontend/pages/login.html?error=system_error');
        }
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'usuarioNombre' => 'required|string|max:255',
            'usuarioApellido' => 'required|string|max:255',
            'nacimiento' => 'required|date',
            'Correo' => 'required|string|email|max:255', // Removed unique:users check as we don't use SQL anymore
            'Telefono' => 'required|string|max:20',
            'contrasena' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
             return redirect()->to('http://localhost/Uni2-Go/frontend/pages/registration.html?error=validation');
        }

        try {
            // 1. Create User in Firebase Authentication
            $userProperties = [
                'email' => $request->input('Correo'),
                'emailVerified' => false,
                'password' => $request->input('contrasena'),
                'displayName' => $request->input('usuarioNombre') . ' ' . $request->input('usuarioApellido'),
                'disabled' => false,
            ];

            $createdUser = $this->auth->createUser($userProperties);
            $uid = $createdUser->uid;

            // 2. Store additional user details in Firestore
            $userData = [
                'firstName' => $request->input('usuarioNombre'),
                'lastName' => $request->input('usuarioApellido'),
                'birthDate' => $request->input('nacimiento'),
                'phone' => $request->input('Telefono'),
                'email' => $request->input('Correo'),
                'createdAt' => new \Google\Cloud\Core\Timestamp(new \DateTime()),
            ];

            $this->firestore->collection('users')->document($uid)->set($userData);

            // Redirect to calendar on success
            return redirect()->to('http://localhost/Uni2-Go/frontend/pages/calendario.html');

        } catch (\Kreait\Firebase\Exception\Auth\EmailExists $e) {
            return redirect()->to('http://localhost/Uni2-Go/frontend/pages/registration.html?error=email_exists');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Firebase Register Error: ' . $e->getMessage());
            return redirect()->to('http://localhost/Uni2-Go/frontend/pages/registration.html?error=system_error');
        }
    }
}
