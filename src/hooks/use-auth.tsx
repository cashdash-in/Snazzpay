
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: (isSeller?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        setUser(null);
        setLoading(false);
    }
  }, []);

  const signOut = async (isSeller: boolean = false) => {
    try {
        if(auth) {
            await firebaseSignOut(auth);
        }
        // Call the API route to clear the httpOnly cookie
        await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
        console.error("Error signing out:", error);
    } finally {
        const loginPath = isSeller ? '/seller/login' : '/auth/login';
        router.push(loginPath);
        router.refresh(); // This helps ensure the new state is reflected everywhere
    }
  };

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
