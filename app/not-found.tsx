import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-background flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <SearchX className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>

            <p className="text-muted-foreground mb-6">
              Sorry, we couldn't find the page you're looking for.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
