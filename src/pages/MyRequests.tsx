import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const statusColors = {
  Draft: 'bg-gray-500',
  Pending: 'bg-yellow-500',
  Approved: 'bg-green-500',
  Rejected: 'bg-red-500',
  Returned: 'bg-orange-500'
}

export default function MyRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('funding_requests')
        .select('*')
        .eq('requester_email', user?.email)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(req =>
    req.title?.toLowerCase().includes(search.toLowerCase()) ||
    req.request_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 mt-1">View and track your funding requests</p>
        </div>
        <Button onClick={() => navigate('/new-request')} className="bg-blue-600">
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Browse all your submitted funding requests</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or request number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No requests found. Create your first request!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>{req.currency} {req.amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[req.status as keyof typeof statusColors] || 'bg-gray-500'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/request/${req.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
