import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ContactLoading() {
  return (
    <div className="container mx-auto py-6 md:py-10 px-4 max-w-4xl">
      <div className="mb-10 text-center space-y-2 flex flex-col items-center">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <div className="grid gap-8">
        {/* Section 1 */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-[200px]" />
            </div>
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="grid gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-[40px]" />
                  <Skeleton className="h-9 w-[40px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-[200px]" />
            </div>
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-[40px]" />
                  <Skeleton className="h-9 w-[40px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
