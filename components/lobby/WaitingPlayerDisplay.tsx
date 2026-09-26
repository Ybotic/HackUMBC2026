import { Users } from 'lucide-react';

export function WaitingPlayerDisplay() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="relative">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        <p className="text-base font-medium mb-2">Waiting for challenger...</p>
        <p className="text-sm text-muted-foreground">
          Share the lobby link to invite someone!
        </p>
      </div>
    </div>
  );
}
