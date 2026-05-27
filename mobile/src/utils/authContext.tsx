import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, signOut, updateUserName, User } from './authStore';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  refresh: async () => {},
  logout: async () => {},
  updateName: async () => ({ ok: false }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    const u = await getCurrentUser();
    setUser(u);
    setReady(true);
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateName = async (name: string) => {
    const result = await updateUserName(name);
    if (result.ok) await refresh();
    return result;
  };

  useEffect(() => { refresh(); }, []);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ isLoggedIn: user !== null, user, refresh, logout, updateName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
