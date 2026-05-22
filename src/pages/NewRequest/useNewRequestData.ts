import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Department {
  id: string
  name: string
  head_email: string
  chief_email: string
}

interface LegalEntity {
  id: string
  code: string
  name: string
  business_unit: string
}

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
}

export function useNewRequestData() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching departments...')
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .order('name')
        
        if (deptError) console.error('Departments error:', deptError)
        setDepartments(deptData || [])
        console.log('Departments loaded:', deptData?.length || 0)

        console.log('Fetching legal entities...')
        const { data: legalData, error: legalError } = await supabase
          .from('legal_entities')
          .select('*')
          .order('name')
        
        if (legalError) console.error('Legal entities error:', legalError)
        setLegalEntities(legalData || [])
        console.log('Legal entities loaded:', legalData?.length || 0)

        console.log('Fetching currencies...')
        const { data: currencyData, error: currencyError } = await supabase
          .from('currencies')
          .select('*')
          .eq('is_active', true)
          .order('code')
        
        if (currencyError) console.error('Currencies error:', currencyError)
        setCurrencies(currencyData || [])
        console.log('Currencies loaded:', currencyData?.length || 0)

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return {
    departments,
    legalEntities,
    currencies,
    loading
  }
}
