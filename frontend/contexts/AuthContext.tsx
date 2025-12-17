import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface User {
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('access_token');
      const storedUser = await SecureStore.getItemAsync('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (newToken: string, newUser: User) => {
    try {
      await SecureStore.setItemAsync('access_token', newToken);
      await SecureStore.setItemAsync('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Error saving auth:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
