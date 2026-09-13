import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NegotiationsLoading() {
  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[200px]" />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-[42px] w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row py-4 gap-4">
            <Skeleton className="h-10 w-full md:w-[300px]" />
            <div className="flex gap-2 md:ml-auto">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
