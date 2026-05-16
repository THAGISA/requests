import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { Button } from '@/components/ui/button'
import { loginRequest } from '@/lib/msalConfig'
import { Loader2 } from 'lucide-react'

export function LoginButton() {
  const { instance, inProgress } = useMsal()

  const handleLogin = async () => {
    try {
      console.log('Starting login with popup...')
      const response = await instance.loginPopup({
        ...loginRequest,
        redirectUri: window.location.origin,
      })
      console.log('Login successful:', response)
      
      if (response.account) {
        localStorage.setItem('msal_account', JSON.stringify(response.account))
      }
      
      // Reload to update auth state
      window.location.reload()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  if (inProgress === InteractionStatus.Login || inProgress === InteractionStatus.HandleRedirect) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Signing in...
      </Button>
    )
  }

  return (
    <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
      Sign in with Microsoft (SEACOM)
    </Button>
  )
}
