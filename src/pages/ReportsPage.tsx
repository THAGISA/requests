import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, TrendingUp, DollarSign, FileCheck, Clock, Calendar, Download, RefreshCw, Target, Zap, BarChart3, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { format, subMonths, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

interface ApprovalTime {
  requestId: string
  requestNumber: string
  title: string
  submittedAt: Date
  approvedAt: Date
  timeToApproveHours: number
  timeToApproveDays: number
}

export default function Reports() {
  const { userRole } = useAuth()
  const { formatUSD } = useCurrencyConversion()
  const [loading, setLoading] = useState(true)
  const [totalRequests, setTotalRequests] = useState(0)
  const [totalAmountUSD, setTotalAmountUSD] = useState(0)
  const [approvedAmountUSD, setApprovedAmountUSD] = useState(0)
  const [avgApprovalTimeHours, setAvgApprovalTimeHours] = useState(0)
  const [avgApprovalTimeDays, setAvgApprovalTimeDays] = useState(0)
  const [fastestApproval, setFastestApproval] = useState<ApprovalTime | null>(null)
  const [slowestApproval, setSlowestApproval] = useState<ApprovalTime | null>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [forecastData, setForecastData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [budgetTypeData, setBudgetTypeData] = useState<any[]>([])
  const [departmentMetrics, setDepartmentMetrics] = useState<any[]>([])

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Fetch all funding requests
      const { data: requests, error } = await supabase
        .from('funding_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!requests) return

      // Calculate totals
      const totalUSD = requests.reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
      const approvedUSD = requests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
      
      setTotalRequests(requests.length)
      setTotalAmountUSD(totalUSD)
      setApprovedAmountUSD(approvedUSD)

      // Calculate approval times
      const { data: approvalActions } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('action', 'approved')
        .order('created_at', { ascending: true })

      const approvalTimes: ApprovalTime[] = []
      
      if (approvalActions && approvalActions.length > 0) {
        // Group by request_id to find first approval action for each request
        const approvalMap = new Map()
        approvalActions.forEach(action => {
          if (!approvalMap.has(action.request_id)) {
            approvalMap.set(action.request_id, action)
          }
        })
        
        // Calculate time to approve for each request
        for (const [requestId, approvalAction] of approvalMap) {
          const request = requests.find(r => r.id === requestId)
          if (request && request.created_at) {
            const submittedAt = new Date(request.created_at)
            const approvedAt = new Date(approvalAction.created_at)
            const timeToApproveHours = differenceInHours(approvedAt, submittedAt)
            const timeToApproveDays = differenceInDays(approvedAt, submittedAt)
            
            approvalTimes.push({
              requestId,
              requestNumber: request.request_number,
              title: request.title,
              submittedAt,
              approvedAt,
              timeToApproveHours,
              timeToApproveDays
            })
          }
        }
        
        // Calculate averages
        const totalHours = approvalTimes.reduce((sum, a) => sum + a.timeToApproveHours, 0)
        const avgHours = totalHours / approvalTimes.length
        const avgDays = avgHours / 24
        
        setAvgApprovalTimeHours(Math.round(avgHours))
        setAvgApprovalTimeDays(Math.round(avgDays * 10) / 10)
        
        // Find fastest and slowest approvals
        const sortedByTime = [...approvalTimes].sort((a, b) => a.timeToApproveHours - b.timeToApproveHours)
        setFastestApproval(sortedByTime[0])
        setSlowestApproval(sortedByTime[sortedByTime.length - 1])
      }

      // Process monthly data (6 months history)
      const sixMonthsAgo = subMonths(new Date(), 6)
      const monthlyMap = new Map()
      
      requests.forEach(req => {
        const reqDate = new Date(req.created_at)
        if (reqDate >= sixMonthsAgo) {
          const month = format(reqDate, 'MMM yyyy')
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { month, actual: 0, count: 0, approved: 0 })
          }
          const data = monthlyMap.get(month)
          data.actual += req.amount_usd || req.amount
          data.count++
          if (req.status === 'Approved') data.approved += req.amount_usd || req.amount
        }
      })
      
      const monthlyArray = Array.from(monthlyMap.values())
      
      // Calculate forecast for next 6 months
      const avgMonthlySpend = monthlyArray.reduce((sum, m) => sum + m.actual, 0) / (monthlyArray.length || 1)
      const growthRate = 0.05 // 5% monthly growth assumption
      
      const forecastMonths = ['Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026']
      const forecastArray = forecastMonths.map((month, index) => ({
        month,
        forecast: avgMonthlySpend * Math.pow(1 + growthRate, index + 1),
        lowerBound: avgMonthlySpend * Math.pow(1 + growthRate - 0.02, index + 1),
        upperBound: avgMonthlySpend * Math.pow(1 + growthRate + 0.02, index + 1)
      }))
      
      setMonthlyData(monthlyArray)
      setForecastData(forecastArray)

      // Status distribution
      const statusCount = { Approved: 0, Pending: 0, Rejected: 0, Returned: 0, Draft: 0 }
      requests.forEach(req => {
        if (statusCount[req.status as keyof typeof statusCount] !== undefined) {
          statusCount[req.status as keyof typeof statusCount]++
        }
      })
      setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })))

      // Budget type distribution
      const capexTotal = requests.filter(r => r.budget_type === 'CAPEX').reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
      const opexTotal = requests.filter(r => r.budget_type === 'OPEX').reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
      setBudgetTypeData([
        { name: 'CAPEX', value: capexTotal },
        { name: 'OPEX', value: opexTotal }
      ])

      // Department metrics with approval times
      const deptMap = new Map()
      for (const req of requests) {
        const deptName = req.department || 'Unassigned'
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { name: deptName, amount: 0, count: 0, approvedCount: 0, totalApprovalTime: 0 })
        }
        const data = deptMap.get(deptName)
        data.amount += req.amount_usd || req.amount
        data.count++
        if (req.status === 'Approved') data.approvedCount++
        
        // Find approval time for this request
        const approval = approvalTimes.find(a => a.requestId === req.id)
        if (approval) {
          data.totalApprovalTime += approval.timeToApproveHours
        }
      }
      
      const deptMetrics = Array.from(deptMap.values()).map(dept => ({
        ...dept,
        approvalRate: dept.count > 0 ? (dept.approvedCount / dept.count) * 100 : 0,
        avgApprovalTime: dept.approvedCount > 0 ? Math.round(dept.totalApprovalTime / dept.approvedCount) : 0
      })).sort((a, b) => b.amount - a.amount).slice(0, 5)
      
      setDepartmentMetrics(deptMetrics)

    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (hours: number): string => {
    if (hours < 24) return `${hours} hours`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} days`
    return `${days} days, ${remainingHours} hours`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const exportToCSV = async () => {
    try {
      const { data: requests } = await supabase
        .from('funding_requests')
        .select('*')
        .order('created_at', { ascending: false })
      
      const headers = ['Request #', 'Title', 'Amount', 'Currency', 'Amount (USD)', 'Status', 'Created At', 'Approval Time (Hours)']
      const csvData = requests?.map(r => {
        // Find approval time
        const approvalTime = avgApprovalTimeHours
        return [
          r.request_number,
          r.title,
          r.amount,
          r.currency,
          (r.amount_usd || r.amount).toFixed(2),
          r.status,
          format(new Date(r.created_at), 'yyyy-MM-dd'),
          approvalTime
        ]
      }) || []
      
      const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reports_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Analytics & Reports
          </h1>
          <p className="text-gray-500 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchReportData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Requests</p>
                <p className="text-3xl font-bold mt-2">{totalRequests}</p>
              </div>
              <FileCheck className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Value (USD)</p>
                <p className="text-3xl font-bold mt-2">{formatUSD(totalAmountUSD)}</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Avg Approval Time</p>
                <p className="text-3xl font-bold mt-2">{avgApprovalTimeDays}d</p>
                <p className="text-xs opacity-75 mt-1">({avgApprovalTimeHours} hours)</p>
              </div>
              <Clock className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Approved Value</p>
                <p className="text-3xl font-bold mt-2">{formatUSD(approvedAmountUSD)}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Fastest Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fastestApproval ? (
              <div>
                <p className="text-2xl font-bold text-green-600">{fastestApproval.title}</p>
                <p className="text-sm text-gray-500 mt-1">Request #{fastestApproval.requestNumber}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-gray-600">Time to approve:</span>
                  <Badge className="bg-green-100 text-green-700">
                    {formatTime(fastestApproval.timeToApproveHours)}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Submitted: {format(fastestApproval.submittedAt, 'MMM dd, yyyy')} → Approved: {format(fastestApproval.approvedAt, 'MMM dd, yyyy')}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No approved requests yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-600" />
              Slowest Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slowestApproval ? (
              <div>
                <p className="text-2xl font-bold text-red-600">{slowestApproval.title}</p>
                <p className="text-sm text-gray-500 mt-1">Request #{slowestApproval.requestNumber}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-gray-600">Time to approve:</span>
                  <Badge className="bg-red-100 text-red-700">
                    {formatTime(slowestApproval.timeToApproveHours)}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Submitted: {format(slowestApproval.submittedAt, 'MMM dd, yyyy')} → Approved: {format(slowestApproval.approvedAt, 'MMM dd, yyyy')}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No approved requests yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend with Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Monthly Funding Trend & Forecast (USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatUSD(value)} />
              <Tooltip formatter={(value: number) => formatUSD(value)} />
              <Legend />
              <Bar data={monthlyData} dataKey="actual" fill="#3B82F6" name="Actual Spend" barSize={40} />
              <Line data={forecastData} dataKey="forecast" stroke="#F59E0B" name="Forecast (5% growth)" strokeWidth={2} dot={{ r: 4 }} />
              <Area data={forecastData} dataKey="upperBound" stroke="#FCD34D" fill="#FEF3C7" name="Upper Bound" opacity={0.3} />
              <Area data={forecastData} dataKey="lowerBound" stroke="#FEF3C7" fill="#FEF3C7" name="Lower Bound" opacity={0.3} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-4 text-center">
            📈 6-month forecast based on 5% monthly growth projection | Historical data shows actual spend
          </p>
        </CardContent>
      </Card>

      {/* Department Performance with Approval Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Department Performance & Approval Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Total Value</th>
                  <th className="text-center py-3 px-4">Approval Rate</th>
                  <th className="text-center py-3 px-4">Avg Approval Time</th>
                </tr>
              </thead>
              <tbody>
                {departmentMetrics.map((dept, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{dept.name}</td>
                    <td className="py-3 px-4 text-right">{dept.count}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatUSD(dept.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${dept.approvalRate}%` }} />
                        </div>
                        <span className="text-sm">{dept.approvalRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={dept.avgApprovalTime < 48 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
                        {formatTime(dept.avgApprovalTime)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution & Budget Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {statusData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CAPEX vs OPEX (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatUSD(value)} />
                <Tooltip formatter={(value: number) => formatUSD(value)} />
                <Bar dataKey="value" fill="#3B82F6">
                  {budgetTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
