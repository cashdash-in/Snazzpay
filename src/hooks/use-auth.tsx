
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
        await firebaseSignOut(auth);
        await fetch('/api/auth/session', { method: 'DELETE' });
        
        const role = getCookie('userRole');
        let loginPath = '/auth/login'; // Default
        
        if (role === 'seller') {
            loginPath = '/seller/login';
        } else if (role === 'vendor') {
            loginPath = '/vendor/login';
        } else if (role === 'partner-pay') {
            loginPath = '/partner-pay/login';
        } else if (role === 'logistics') {
            loginPath = '/logistics-secure/login';
        }

        // Use router.push for client-side navigation
        router.push(loginPath);
        // No need for router.refresh() here, as state changes should re-render
        
    } catch (error) {
        console.error("Error signing out:", error);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
