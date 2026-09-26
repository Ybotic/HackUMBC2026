import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check, Swords } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface LobbyStatusCardProps {
  lobby: {
    status: string;
    settings: { isPrivate: boolean };
    createdAt: number;
    joinedPlayerAddress?: string;
  };
  shareUrl: string;
}

export function LobbyStatusCard({ lobby, shareUrl }: LobbyStatusCardProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Lobby link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Card className="border-2 bg-gradient-to-r from-card to-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Swords className="h-5 w-5 text-primary" />
            </div>
            <span>Lobby Status</span>
          </div>
          <Badge
            variant={
              lobby.status === 'ready' || lobby.status === 'started'
                ? 'default'
                : 'secondary'
            }
            className="text-sm px-3 py-1"
          >
            {lobby.status === 'waiting'
              ? 'Waiting for Players'
              : lobby.status === 'ready'
                ? 'Ready to Start'
                : lobby.status === 'started'
                  ? 'Battle Starting...'
                  : lobby.status}
          </Badge>
        </CardTitle>
        <CardDescription className="text-base">
          {lobby.settings.isPrivate ? 'Private lobby' : 'Public lobby'} •
          Created {formatDistanceToNow(lobby.createdAt, { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <div className="font-medium text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Players: {lobby.joinedPlayerAddress ? '2/2' : '1/2'}
              </div>
              <div className="text-muted-foreground">
                {lobby.joinedPlayerAddress
                  ? 'Lobby full - Ready to battle!'
                  : 'Waiting for challenger...'}
              </div>
            </div>
          </div>
          {lobby.settings.isPrivate && (
            <div className="flex items-center justify-end gap-2">
              <div className="text-xs text-muted-foreground">
                Share this link:
              </div>
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm w-64 h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-9"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
