// src/context/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  import type { Session } from '@supabase/supabase-js';
  import { supabase } from '../lib/supabase';
  
  type AuthContextValue = {
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      let isMounted = true;
  
      const init = async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (error) {
            console.warn('Error getting session', error);
          }
          setSession(data.session ?? null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
  
      init();
  
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        }
      );
  
      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }, []);
  
    const signOut = async () => {
      await supabase.auth.signOut();
    };
  
    return (
      <AuthContext.Provider value={{ session, isLoading, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
  };