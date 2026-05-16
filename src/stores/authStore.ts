import { create } from 'zustand'

export interface User {
  id: string
  email: string
  full_name: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'submitter' | 'approver' | 'manager' | 'admin'
  department?: string
}

interface AuthStore {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  
  signIn: async (email: string, password: string) => {
    // Azure AD handles this via popup/redirect
    console.log('Sign in with Azure AD')
  },
  
  signUp: async (email: string, password: string) => {
    console.log('Sign up with Azure AD')
  },
  
  signOut: async () => {
    // Clear local state
    set({ user: null, profile: null })
    // Redirect to home
    window.location.href = '/'
  },
}))
