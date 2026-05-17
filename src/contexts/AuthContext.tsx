import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: string;
  full_name: string;
  email: string;
  department?: string;
  business_unit?: string;
  avatar_url?: string;
  created_at?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  signInWithAzure: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, userEmail: string): Promise<Profile | null> => {
    try {
      console.log('Loading profile for user:', userId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      if (profileData) {
        console.log('Profile loaded from DB:', profileData.role);
        setProfile(profileData);
        return profileData;
      }

      console.log('Creating new profile with submitter role');
      const newProfile = {
        id: userId,
        email: userEmail,
        full_name: userEmail.split('@')[0],
        role: 'submitter',
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError);
        return null;
      }

      console.log('Profile created:', insertedProfile.role);
      setProfile(insertedProfile);
      return insertedProfile;
    } catch (err) {
      console.error('Profile load error:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          if (session?.user) {
            console.log('Session found:', session.user.email);
            setUser(session.user);
            await loadProfile(session.user.id, session.user.email || '');
          } else {
            console.log('No session found');
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('Auth initialization complete');
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (!isMounted) return;

      // Skip INITIAL_SESSION — initAuth already handled it
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user.email);
        setUser(session.user);
        await loadProfile(session.user.id, session.user.email || '');
        if (isMounted) setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setProfile(null);
        if (isMounted) setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Silent token refresh — update user but don't flash loading
        setUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithAzure = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'email openid profile',
      }
    });
    if (error) {
      console.error('Azure sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id, user.email || '');
    }
  };

  const userRole = profile?.role || 'submitter';
  const isAdmin = userRole === 'admin';

  console.log('Auth state - role:', userRole, 'loading:', loading);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        loading,
        isAdmin,
        signOut,
        signInWithAzure,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
