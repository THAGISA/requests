interface QuickStatsCardsProps {
  totalRequests: number
  approvedCount: number
  pendingCount: number
  returnedCount: number
  rejectedCount: number
}

export function QuickStatsCards({ totalRequests, approvedCount, pendingCount, returnedCount, rejectedCount }: QuickStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Total - Blue */}
      <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
        <div className="p-4">
          <div className="text-3xl font-bold">{totalRequests}</div>
          <p className="text-sm text-blue-100 mt-1">Total Requests</p>
          <div className="mt-2 text-blue-200 text-xs">All requests</div>
        </div>
      </div>

      {/* Approved - Green */}
      <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
        <div className="p-4">
          <div className="text-3xl font-bold">{approvedCount}</div>
          <p className="text-sm text-green-100 mt-1">Approved</p>
          <div className="mt-2 text-green-200 text-xs">✓ Completed</div>
        </div>
      </div>

      {/* In Review - Amber */}
      <div className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
        <div className="p-4">
          <div className="text-3xl font-bold">{pendingCount}</div>
          <p className="text-sm text-amber-100 mt-1">In Review</p>
          <div className="mt-2 text-amber-200 text-xs">⏳ Pending</div>
        </div>
      </div>

      {/* Returned - Orange */}
      <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
        <div className="p-4">
          <div className="text-3xl font-bold">{returnedCount}</div>
          <p className="text-sm text-orange-100 mt-1">Returned</p>
          <div className="mt-2 text-orange-200 text-xs">↩️ Needs changes</div>
        </div>
      </div>

      {/* Rejected - Red */}
      <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
        <div className="p-4">
          <div className="text-3xl font-bold">{rejectedCount}</div>
          <p className="text-sm text-red-100 mt-1">Rejected</p>
          <div className="mt-2 text-red-200 text-xs">❌ Declined</div>
        </div>
      </div>
    </div>
  )
}
