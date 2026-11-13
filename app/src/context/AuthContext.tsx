import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/lib/auth';

type AuthContextValue = {
  /** Usuário logado, ou null quando ninguém está logado. */
  user: User | null;
  /** true enquanto o Firebase ainda verifica se existe uma sessão salva (abertura do app). */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Estado global de autenticação.
 * Fica em volta de todo o app (src/app/_layout.tsx), então qualquer tela pode saber
 * quem está logado com useAuth(), sem passar o usuário de tela em tela.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // O Firebase avisa aqui sempre que o usuário entra, sai ou a sessão salva é recuperada.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    // Cancela o "ouvinte" quando o componente sai da tela.
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    initializing,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signOut: async () => {
      await firebaseSignOut(auth);
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email.trim());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Acesso ao estado de autenticação em qualquer tela. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
