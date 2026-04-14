import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegistrationPage from './pages/RegistrationPage.jsx';
import RecoverPasswordPage from './pages/RecoverPasswordPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import GruposPage from './pages/GruposPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import ListaDeComprasPage from './pages/ListaDeComprasPage.jsx';
import SobreNosotrosPage from './pages/SobreNosotrosPage.jsx';
import UserPage from './pages/UserPage.jsx';

// Redirect logged-in users away from auth pages
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/calendar" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/registration" element={<AuthRoute><RegistrationPage /></AuthRoute>} />
          <Route path="/recover-password" element={<AuthRoute><RecoverPasswordPage /></AuthRoute>} />

          {/* Protected */}
          <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/grupos" element={<PrivateRoute><GruposPage /></PrivateRoute>} />
          <Route path="/friends" element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
          <Route path="/lista-compras" element={<PrivateRoute><ListaDeComprasPage /></PrivateRoute>} />
          <Route path="/sobre-nosotros" element={<PrivateRoute><SobreNosotrosPage /></PrivateRoute>} />
          <Route path="/user" element={<PrivateRoute><UserPage /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
