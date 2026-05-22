import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  rate: number
  is_base: boolean
  updated_at: string
  created_at: string
}

export function CurrenciesTab() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newRate, setNewRate] = useState<number>(0)

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
    } catch (error) {
      console.error('Error fetching currencies:', error)
      toast.error('Failed to load currencies')
    } finally {
      setLoading(false)
    }
  }

  const updateExchangeRate = async (id: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .update({ 
          rate: newRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      toast.success('Exchange rate updated successfully')
      await fetchCurrencies()
      setShowEditDialog(false)
      setEditingCurrency(null)
    } catch (error) {
      console.error('Error updating rate:', error)
      toast.error('Failed to update exchange rate')
    }
  }

  const setBaseCurrency = async (id: string) => {
    try {
      // First, set all currencies to is_base = false
      const { error: resetError } = await supabase
        .from('currencies')
        .update({ is_base: false })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

      if (resetError) throw resetError

      // Then set the selected currency as base
      const { error: updateError } = await supabase
        .from('currencies')
        .update({ is_base: true })
        .eq('id', id)

      if (updateError) throw updateError

      toast.success('Base currency updated successfully')
      await fetchCurrencies()
    } catch (error) {
      console.error('Error setting base currency:', error)
      toast.error('Failed to set base currency')
    }
  }

  const addCurrency = async (currency: Omit<Currency, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .insert([{
          ...currency,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error
      
      toast.success('Currency added successfully')
      await fetchCurrencies()
    } catch (error) {
      console.error('Error adding currency:', error)
      toast.error('Failed to add currency')
    }
  }

  const deleteCurrency = async (id: string) => {
    if (!confirm('Are you sure you want to delete this currency?')) return
    
    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Currency deleted successfully')
      await fetchCurrencies()
    } catch (error) {
      console.error('Error deleting currency:', error)
      toast.error('Failed to delete currency')
    }
  }

  const openEditDialog = (currency: Currency) => {
    setEditingCurrency(currency)
    setNewRate(currency.rate)
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Supported Currencies ({currencies.length} Total)</CardTitle>
            <CardDescription>Configure exchange rates and display settings</CardDescription>
          </div>
          <Button variant="outline" onClick={fetchCurrencies}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Exchange Rate (vs USD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((currency) => (
                <TableRow key={currency.id}>
                  <TableCell className="font-medium">{currency.name}</TableCell>
                  <TableCell>{currency.code}</TableCell>
                  <TableCell>{currency.symbol}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{currency.rate.toFixed(4)}</span>
                      {!currency.is_base && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(currency)}
                          className="h-6 px-2"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {currency.is_base ? (
                      <span className="text-green-600 font-medium">Base Currency</span>
                    ) : (
                      <span className="text-gray-500">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {currency.updated_at ? new Date(currency.updated_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!currency.is_base && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(currency)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBaseCurrency(currency.id)}
                          className="text-green-600"
                        >
                          Set as Base
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCurrency(currency.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Exchange Rate Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Exchange Rate</DialogTitle>
            <DialogDescription>
              Update the exchange rate for {editingCurrency?.name} ({editingCurrency?.code}) vs USD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={newRate}
                onChange={(e) => setNewRate(parseFloat(e.target.value))}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-2">
                1 {editingCurrency?.code} = {newRate} USD
              </p>
              <p className="text-sm text-gray-500">
                1 USD = {(1 / newRate).toFixed(2)} {editingCurrency?.code}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingCurrency && updateExchangeRate(editingCurrency.id, newRate)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
