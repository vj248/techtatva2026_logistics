import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 bg-gray-100 text-center p-4">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mt-4">Page Not Found</h2>
      <p className="text-gray-500 mt-2 mb-8">The page you are looking for does not exist or you do not have permission to view it.</p>
      <Button asChild>
        <Link href="/">
          Return Home
        </Link>
      </Button>
    </div>
  )
}
