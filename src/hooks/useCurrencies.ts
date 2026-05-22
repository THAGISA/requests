import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  exchange_rate: number
  is_active: boolean
  created_at: string
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const fetchCurrencies = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code', { ascending: true })

      if (error) throw error
      setCurrencies(data || [])
    } catch (err) {
      console.error('Error fetching currencies:', err)
      setError('Failed to load currencies')
    } finally {
      setLoading(false)
    }
  }

  const getCurrencySymbol = (code: string) => {
    const currency = currencies.find(c => c.code === code)
    return currency?.symbol || code
  }

  const formatAmount = (amount: number, currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode)
    const symbol = currency?.symbol || currencyCode
    return `${symbol} ${amount.toLocaleString()}`
  }

  return {
    currencies,
    loading,
    error,
    fetchCurrencies,
    getCurrencySymbol,
    formatAmount
  }
}
