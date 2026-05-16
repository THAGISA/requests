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

  const fetchProfile = async (userId: string, email: string, fullName?: string) => {
    try {
      console.log('📝 Fetching profile for user:', userId, email);
      
      // Set a timeout for the profile fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const { data: profileData, error: profileError } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        // Create a fallback profile
        const fallbackProfile = {
          id: userId,
          email: email,
          full_name: fullName || email.split('@')[0],
          role: 'submitter'
        };
        console.log('📝 Using fallback profile:', fallbackProfile);
        setProfile(fallbackProfile as Profile);
        return fallbackProfile;
      }

      if (profileData) {
        console.log('✅ Existing profile found:', profileData);
        setProfile(profileData);
        return profileData;
      } else {
        // Create profile if it doesn't exist
        console.log('🆕 No profile found, creating new profile...');
        const displayName = fullName || email.split('@')[0];
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: displayName,
            role: 'submitter'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Profile creation error:', insertError);
          // Use fallback profile
          const fallbackProfile = {
            id: userId,
            email: email,
            full_name: displayName,
            role: 'submitter'
          };
          setProfile(fallbackProfile as Profile);
          return fallbackProfile;
        }
        
        console.log('✅ New profile created:', newProfile);
        setProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.error('💥 Profile fetch error:', err);
      // Create a fallback profile so the app can still work
      const fallbackProfile = {
        id: userId,
        email: email,
        full_name: fullName || email.split('@')[0],
        role: 'submitter'
      };
      console.log('📝 Using fallback profile due to error:', fallbackProfile);
      setProfile(fallbackProfile as Profile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // Add a global timeout for auth initialization
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.log('⚠️ Auth initialization timeout, forcing loading false');
            setLoading(false);
          }
        }, 15000);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
        }
        
        console.log('📊 Session user:', session?.user?.email);

        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            const userFullName = session.user.user_metadata?.full_name || 
                                 session.user.user_metadata?.name || 
                                 session.user.email?.split('@')[0];
            await fetchProfile(session.user.id, session.user.email || '', userFullName);
          }
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('💥 Auth init error:', err);
        if (isMounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (isMounted) {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const userFullName = session.user.user_metadata?.full_name || 
                               session.user.user_metadata?.name || 
                               session.user.email?.split('@')[0];
          await fetchProfile(session.user.id, session.user.email || '', userFullName);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithAzure = async () => {
    console.log('🔐 Starting Azure sign in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'email openid profile',
      }
    });
    if (error) {
      console.error('❌ Azure sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || '');
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
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
