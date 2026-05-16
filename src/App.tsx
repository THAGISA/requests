import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Layout } from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import MyRequests from "@/pages/MyRequests"
import NewRequest from "@/pages/NewRequest"
import ApprovalsInbox from "@/pages/ApprovalsInbox"
import Reports from "@/pages/Reports"
import Admin from "@/pages/Admin"
import ViewRequest from "@/pages/ViewRequest"
import Login from "@/pages/Login"

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/new-request" element={<NewRequest />} />
        <Route path="/new" element={<Navigate to="/new-request" replace />} />
        <Route path="/approvals" element={<ApprovalsInbox />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/request/:id" element={<ViewRequest />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
