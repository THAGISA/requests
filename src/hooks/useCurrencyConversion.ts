import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  rate: number
  is_base: boolean
}

export function useCurrencyConversion() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code')
      
      if (!error && data) {
        setCurrencies(data)
      }
    } catch (error) {
      console.error('Error fetching currencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const getExchangeRate = (currencyCode: string): number => {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency?.rate || 1
  }

  const convertToUSD = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'USD') return amount
    const rate = getExchangeRate(fromCurrency)
    return amount * rate
  }

  const formatCurrency = (amount: number, currencyCode: string, showUSD: boolean = false): string => {
    const currency = currencies.find(c => c.code === currencyCode)
    const symbol = currency?.symbol || '$'
    
    if (showUSD && currencyCode !== 'USD') {
      const usdAmount = convertToUSD(amount, currencyCode)
      return `$${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`
    }
    
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatUSD = (amount: number): string => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`
  }

  return {
    currencies,
    loading,
    getExchangeRate,
    convertToUSD,
    formatCurrency,
    formatUSD
  }
}
