import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div id="preloader">
        <div className="loader"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
