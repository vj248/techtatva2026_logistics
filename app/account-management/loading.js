import { Skeleton } from "@/components/ui/skeleton"

export default function AccountManagementLoading() {
  return (
    <div className="container mx-auto py-6 md:py-10 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      <div className="rounded-md border p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Skeleton className="h-10 w-[250px]" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-[100px]" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4 border-b last:border-0">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-8 w-[60px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
