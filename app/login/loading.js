import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoginLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-[350px]">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[50px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    </div>
  )
}
