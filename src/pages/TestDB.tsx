import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDB() {
  const [results, setResults] = useState<any>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      console.log('Testing Supabase connection...')
      
      // Test 1: Check if we can connect
      const { data: healthCheck, error: healthError } = await supabase.from('business_units').select('count', { count: 'exact', head: true })
      console.log('Health check:', { healthCheck, healthError })
      
      // Test 2: Try to get business units
      const { data: buData, error: buError } = await supabase.from('business_units').select('*')
      console.log('Business units:', buData, buError)
      
      // Test 3: Try to get departments
      const { data: deptData, error: deptError } = await supabase.from('departments').select('*')
      console.log('Departments:', deptData, deptError)
      
      // Test 4: Try to get legal entities
      const { data: legalData, error: legalError } = await supabase.from('legal_entities').select('*').limit(5)
      console.log('Legal entities (first 5):', legalData, legalError)
      
      setResults({ buData, deptData, legalData })
      if (buError || deptError || legalError) {
        setError(JSON.stringify({ buError, deptError, legalError }, null, 2))
      }
    }
    
    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Error:</h2>
          <pre className="text-sm overflow-auto">{error}</pre>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Business Units ({results.buData?.length || 0})</h2>
          <pre className="text-sm">{JSON.stringify(results.buData, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Departments ({results.deptData?.length || 0})</h2>
          <pre className="text-sm">{JSON.stringify(results.deptData, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Legal Entities ({results.legalData?.length || 0})</h2>
          <pre className="text-sm">{JSON.stringify(results.legalData, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
