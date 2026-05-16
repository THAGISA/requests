import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { QuickStatsCards } from './components/QuickStatsCards'
import { KPICards } from './components/KPICards'
import {
  RefreshCw, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface AgingItem {
  reference: string
  title: string
  entity: string
  awaiting: string
  daysPending: number
  amount: number
  currency: string
}

interface MonthlySpendItem {
  month: string
  actual: number
  forecast: number
}

interface EntitySpendItem {
  name: string
  amount: number
}

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedCount: 0,
    pendingCount: 0,
    returnedCount: 0,
    rejectedCount: 0,
    totalAmount: 0,
    approvedAmount: 0,
    pendingAmount: 0,
    capexAmount: 0,
    opexAmount: 0,
    pendingApprovals: 0,
    avgApprovalDays: 0
  })
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpendItem[]>([])
  const [spendByEntity, setSpendByEntity] = useState<EntitySpendItem[]>([])
  const [agingData, setAgingData] = useState<AgingItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: requests, error: reqError } = await supabase
        .from('funding_requests')
        .select(`
          *,
          legal_entity:legal_entities(name, code)
        `)
        .order('created_at', { ascending: false })

      if (reqError) throw reqError

      const totalRequests = requests?.length || 0
      const approvedCount = requests?.filter(r => r.status === 'Approved').length || 0
      const pendingCount = requests?.filter(r => r.status === 'Pending').length || 0
      const returnedCount = requests?.filter(r => r.status === 'Returned').length || 0
      const rejectedCount = requests?.filter(r => r.status === 'Rejected').length || 0

      const totalAmount = requests?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const approvedAmount = requests?.reduce((sum, r) =>
        r.status === 'Approved' ? sum + (r.amount || 0) : sum, 0
      ) || 0
      const pendingAmount = requests?.reduce((sum, r) =>
        r.status === 'Pending' ? sum + (r.amount || 0) : sum, 0
      ) || 0

      const capexAmount = requests?.reduce((sum, r) =>
        r.budget_type === 'CAPEX' ? sum + (r.amount || 0) : sum, 0
      ) || 0
      const opexAmount = totalAmount - capexAmount

      const { count: pendingApprovals } = await supabase
        .from('approval_actions')
        .select('*', { count: 'exact', head: true })
        .eq('approver_email', user?.email)
        .eq('action', 'pending')

      setStats({
        totalRequests,
        approvedCount,
        pendingCount,
        returnedCount,
        rejectedCount,
        totalAmount,
        approvedAmount,
        pendingAmount,
        capexAmount,
        opexAmount,
        pendingApprovals: pendingApprovals || 0,
        avgApprovalDays: 4.2
      })

      const monthlyMap = new Map<string, MonthlySpendItem>()
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      requests?.forEach(r => {
        const date = new Date(r.submitted_at || r.created_at)
        const monthName = months[date.getMonth()]

        if (!monthlyMap.has(monthName)) {
          monthlyMap.set(monthName, { month: monthName, actual: 0, forecast: 0 })
        }
        const entry = monthlyMap.get(monthName)!
        entry.actual += r.amount || 0
        entry.forecast += (r.amount || 0) * 1.1
      })

      setMonthlySpend(Array.from(monthlyMap.values()))

      const entityMap = new Map<string, EntitySpendItem>()
      requests?.forEach(r => {
        const entityCode = r.legal_entity?.code || 'Unknown'
        if (!entityMap.has(entityCode)) {
          entityMap.set(entityCode, { name: entityCode, amount: 0 })
        }
        entityMap.get(entityCode)!.amount += r.amount || 0
      })
      setSpendByEntity(Array.from(entityMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 8))

      const aging: AgingItem[] = (requests || [])
        .filter(r => r.status === 'Pending')
        .map(r => {
          const daysPending = Math.floor((Date.now() - new Date(r.submitted_at || r.created_at).getTime()) / (1000 * 3600 * 24))
          return {
            reference: r.request_number || r.id.slice(0, 8),
            title: r.title,
            entity: r.legal_entity?.name?.split(' ').slice(0, 2).join(' ') || '',
            awaiting: r.current_approver || 'Line Manager',
            daysPending,
            amount: r.amount || 0,
            currency: r.currency
          }
        })
        .sort((a, b) => b.daysPending - a.daysPending)
        .slice(0, 10)
      setAgingData(aging)

    } catch (err) {
      const error = err as Error
      console.error('Error fetching dashboard data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getDaysColor = (days: number): string => {
    if (days > 30) return 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium'
    if (days > 14) return 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium'
    return 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Signed In</h3>
            <p className="text-gray-600 mb-4">Please sign in to view your dashboard</p>
            <Button asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Chart colors using Tailwind theme colors
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name || user?.email?.split('@')[0]}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
            Azure AD · seacom.com
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Cards */}
      <QuickStatsCards
        totalRequests={stats.totalRequests}
        approvedCount={stats.approvedCount}
        pendingCount={stats.pendingCount}
        returnedCount={stats.returnedCount}
        rejectedCount={stats.rejectedCount}
      />

      {/* KPI Cards */}
      <KPICards
        totalAmount={stats.totalAmount}
        totalRequests={stats.totalRequests}
        approvedAmount={stats.approvedAmount}
        approvedCount={stats.approvedCount}
        pendingAmount={stats.pendingAmount}
        pendingCount={stats.pendingCount}
        avgApprovalDays={stats.avgApprovalDays}
      />

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">Monthly Spend vs Forecast (USD)</CardTitle>
            <CardDescription>Actual spend vs projected forecast</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                <Legend />
                <Area type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} name="Actual Spend" />
                <Area type="monotone" dataKey="forecast" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">Spend by Legal Entity (USD)</CardTitle>
            <CardDescription>Top 8 entities by spend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendByEntity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis type="category" dataKey="name" width={100} stroke="#6b7280" />
                <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                <Bar dataKey="amount">
                  {spendByEntity.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* CAPEX vs OPEX */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">CAPEX vs OPEX Split</CardTitle>
            <CardDescription>Capital vs Operational Expenditure</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie
                  data={[
                    { name: 'CAPEX', value: stats.capexAmount },
                    { name: 'OPEX', value: stats.opexAmount }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill="hsl(var(--chart-1))" />
                  <Cell fill="hsl(var(--chart-2))" />
                </Pie>
                <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                <span className="text-sm">CAPEX: ${(stats.capexAmount / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                <span className="text-sm">OPEX: ${(stats.opexAmount / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">Approval Velocity</CardTitle>
            <CardDescription>Average days to approve by week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={[
                { week: 'W1 Feb', days: 6 },
                { week: 'W2 Feb', days: 5 },
                { week: 'W3 Feb', days: 4.5 },
                { week: 'W4 Feb', days: 3.8 },
                { week: 'W1 Mar', days: 3.2 },
                { week: 'W2 Mar', days: 2.9 },
                { week: 'W3 Mar', days: 2.5 },
                { week: 'W4 Mar', days: 2.8 },
                { week: 'W1 Apr', days: 2.3 },
                { week: 'W2 Apr', days: 2.1 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area type="monotone" dataKey="days" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Request Aging Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Request Aging – Pending Approvals</CardTitle>
          <CardDescription>Requests awaiting approval with days pending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Reference</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Title</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Entity</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Awaiting</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Days Pending</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-500">Loading...</td></tr>
                ) : agingData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-500">No pending approvals</td></tr>
                ) : (
                  agingData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs text-gray-600">{item.reference}</td>
                      <td className="p-3 font-medium text-gray-800">{item.title}</td>
                      <td className="p-3 text-gray-600">{item.entity}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="bg-gray-100">{item.awaiting}</Badge>
                      </td>
                      <td className="p-3">
                        <span className={getDaysColor(item.daysPending)}>
                          {item.daysPending} days
                        </span>
                      </td>
                      <td className="p-3 font-mono font-medium text-gray-800">
                        {item.currency} {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
