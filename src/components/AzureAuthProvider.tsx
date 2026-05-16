import { useEffect, useState } from 'react'
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus, AccountInfo } from '@azure/msal-browser'
import { msalInstance, loginRequest } from '@/lib/msalConfig'
import { useAuthStore } from '@/stores/authStore'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { instance, inProgress, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const { setUser, setProfile, setLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing accounts
        const currentAccounts = instance.getAllAccounts()
        let account: AccountInfo | null = null
        
        if (currentAccounts.length > 0) {
          account = currentAccounts[0]
        } else {
          // Try to get account from localStorage
          const storedAccount = localStorage.getItem('msal_account')
          if (storedAccount) {
            account = JSON.parse(storedAccount)
          }
        }
        
        if (account && (isAuthenticated || currentAccounts.length > 0)) {
          console.log('User authenticated:', account.username)
          setUser({
            id: account.localAccountId,
            email: account.username || '',
            full_name: account.name || account.username || '',
          })
          setProfile({
            id: account.localAccountId,
            email: account.username || '',
            full_name: account.name || account.username || '',
            role: 'submitter',
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    // Wait for MSAL to be ready
    if (inProgress === InteractionStatus.None) {
      initializeAuth()
    } else {
      const interval = setInterval(() => {
        if (inProgress === InteractionStatus.None) {
          clearInterval(interval)
          initializeAuth()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [instance, inProgress, isAuthenticated, setUser, setProfile, setLoading])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AzureAuthProvider({ children }: { children: React.ReactNode }) {
  const [msalReady, setMsalReady] = useState(false)

  useEffect(() => {
    if (msalInstance) {
      setMsalReady(true)
    }
  }, [])

  if (!msalReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthInitializer>{children}</AuthInitializer>
    </MsalProvider>
  )
}
