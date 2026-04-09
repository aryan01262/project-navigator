import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Role } from '@/types/planner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: Role;
  signUp: (email: string, password: string, displayName?: string, role?: Role) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>('admin');

  const fetchRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();
    if (data?.role) setRole(data.role as Role);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => fetchRole(session.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string, selectedRole?: Role) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || email, role: selectedRole || 'engineer' },
      },
    });
    // Update profile role after signup
    if (!error && data.user) {
      await supabase.from('profiles').update({ role: selectedRole || 'engineer' }).eq('user_id', data.user.id);
      setRole(selectedRole || 'engineer');
    }
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
