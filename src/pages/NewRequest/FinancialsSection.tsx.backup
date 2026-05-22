import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CapexLineItem } from './useNewRequestForm'

const YEARS = ['2026', '2027', '2028', '2029', '2030']

interface FinancialsSectionProps {
  capexLineItems: CapexLineItem[]
  quotationValue: number
  grandTotal: number
  onLineItemChange: (itemIndex: number, year: string, value: number) => void
  onQuotationChange: (value: number) => void
  calcLineItemTotal: (item: CapexLineItem) => number
}

export function FinancialsSection({
  capexLineItems,
  quotationValue,
  grandTotal,
  onLineItemChange,
  onQuotationChange,
  calcLineItemTotal,
}: FinancialsSectionProps) {
  const yearTotals = YEARS.map(year =>
    capexLineItems.reduce((sum, item) => sum + (item.years[year] || 0), 0)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>CAPEX Expenditure Table</CardTitle>
        <CardDescription>5-year breakdown by line item ({capexLineItems[0] && Object.keys(capexLineItems[0].years).join(', ')})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-left font-semibold text-gray-700 w-40">Line Item</th>
                {YEARS.map(y => (
                  <th key={y} className="p-3 text-right font-semibold text-gray-700">{y}</th>
                ))}
                <th className="p-3 text-right font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {capexLineItems.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium text-gray-800">{item.name}</td>
                  {YEARS.map(year => (
                    <td key={year} className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={item.years[year] || ''}
                        onChange={e => onLineItemChange(idx, year, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right text-sm"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="p-3 text-right font-semibold text-gray-800">
                    ${calcLineItemTotal(item).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td className="p-3 text-gray-700">Subtotal</td>
                {yearTotals.map((total, i) => (
                  <td key={i} className="p-3 text-right text-gray-800">${total.toLocaleString()}</td>
                ))}
                <td className="p-3 text-right text-gray-800">
                  ${yearTotals.reduce((s, t) => s + t, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Quotation + Grand Total */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation Value (additional)
            </label>
            <Input
              type="number"
              min={0}
              value={quotationValue || ''}
              onChange={e => onQuotationChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Add any vendor quotation amount not in the table above</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col justify-center">
            <p className="text-sm text-blue-700 font-medium mb-1">Grand Total (USD)</p>
            <p className="text-3xl font-bold text-blue-600">${grandTotal.toLocaleString()}</p>
            <p className="text-xs text-blue-500 mt-1">Line items + quotation value</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
