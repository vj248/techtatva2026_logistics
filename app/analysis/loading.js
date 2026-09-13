import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from '@/components/DashboardLayout';

export default function AnalysisLoading() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-2 py-4">
          <Skeleton className="h-10 w-full sm:w-80" />
          <Skeleton className="h-10 w-24 ml-auto" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-8 w-1/6" />
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-8 w-1/6" />
                        <Skeleton className="h-8 w-1/6" />
                        <Skeleton className="h-8 w-1/6" />
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
