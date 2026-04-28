import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase.js';
import { getUserProfile } from '../services/userService.js';
import { presenceService } from '../services/presenceService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const uidRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser && uidRef.current) {
        presenceService.setOffline(uidRef.current).catch(() => {});
      }

      setUser(firebaseUser);
      uidRef.current = firebaseUser?.uid ?? null;

      if (firebaseUser) {
        presenceService.setOnline(firebaseUser.uid).catch(() => {});
        try {
          const data = await getUserProfile(firebaseUser.uid);
          setProfile(data);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const stopHeartbeat = presenceService.startHeartbeat(user.uid);

    const handleBeforeUnload = () => {
      if (uidRef.current) {
        presenceService.setOffline(uidRef.current).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      stopHeartbeat();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const refreshProfile = async () => {
    if (user) {
      const data = await getUserProfile(user.uid);
      setProfile(data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
