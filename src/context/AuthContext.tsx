import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'stock_manager' | 'preparator' | 'auditor' | 'order_validator';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  roles: AppRole[];
  isStockManager: boolean;
  isPreparator: boolean;
  isAuditor: boolean;
  hasAdminPanelAccess: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  // Tracks whether the initial session has been checked AND its roles loaded.
  // Prevents `/admin` from redirecting to `/` during the race between
  // session restore and the user_roles query.
  const [sessionChecked, setSessionChecked] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setRolesLoaded(false);
          setTimeout(() => { loadRoles(session.user.id); }, 0);
        } else {
          setIsAdmin(false);
          setRoles([]);
          setRolesLoaded(true);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadRoles(session.user.id);
      } else {
        setRolesLoaded(true);
      }
      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only mark loading complete once both session is checked AND roles are loaded
  useEffect(() => {
    if (sessionChecked && rolesLoaded) setIsLoading(false);
  }, [sessionChecked, rolesLoaded]);

  const loadRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      if (error) {
        setRoles([]); setIsAdmin(false); return;
      }
      const list = (data || []).map((r: any) => r.role as AppRole);
      setRoles(list);
      setIsAdmin(list.includes('admin'));
    } catch {
      setRoles([]); setIsAdmin(false);
    } finally {
      setRolesLoaded(true);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) return { error };

      // Create customer profile after signup
      if (data.user) {
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: data.user.id,
            email: email,
            first_name: firstName || '',
            last_name: lastName || '',
          });
        
        if (customerError) {
          console.error('Error creating customer profile:', customerError);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setRoles([]);
  };

  const isStockManager = roles.includes('stock_manager');
  const isPreparator = roles.includes('preparator');
  const isAuditor = roles.includes('auditor');
  const hasAdminPanelAccess = isAdmin || isStockManager || isPreparator || isAuditor;

  return (
    <AuthContext.Provider
      value={{
        user, session, isLoading, isAdmin, roles,
        isStockManager, isPreparator, isAuditor, hasAdminPanelAccess,
        signUp, signIn, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
