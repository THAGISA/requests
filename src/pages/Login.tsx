import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Shield, AlertCircle } from 'lucide-react'

export default function Login() {
  const { signInWithAzure } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAzureLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithAzure()
      // The page will redirect to Azure login
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SEACOM Funding Portal
          </CardTitle>
          <CardDescription className="text-base">
            Capital & Operating Expenditure Approval System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Secure Authentication</span>
            </div>
            <p className="text-sm text-blue-700">
              Sign in with your SEACOM Microsoft Azure AD credentials to access funding requests, approvals, and reports.
            </p>
          </div>
          
          <Button 
            onClick={handleAzureLogin} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            {loading ? 'Redirecting...' : 'Sign in with Microsoft (SEACOM)'}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-3 h-3" />
            <span>Powered by Microsoft Azure AD & Supabase</span>
          </div>
          
          <p className="text-xs text-center text-gray-400">
            By signing in, you agree to the SEACOM security policies and terms of use.
            Your identity will be verified through Azure Active Directory.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
