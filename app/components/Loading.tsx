export function SummaryCardSkeleton() {
  return (
    <div className="rounded-3xl p-6 shadow-xl bg-white/90 border border-gray-200 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

export function ClaimsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="bg-white/90 border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="flex gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      </div>

      {/* Rows skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white/90 border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="space-y-3">
            <div className="flex gap-4">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-5 bg-gray-200 rounded flex-1" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white/90 border border-gray-200 rounded-2xl p-5 h-64" />
        <div className="bg-white/90 border border-gray-200 rounded-2xl p-5 h-64" />
      </div>
    </div>
  );
}
