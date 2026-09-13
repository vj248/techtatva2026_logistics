import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-6 md:py-10 px-4 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[125px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
    </div>
  )
}
