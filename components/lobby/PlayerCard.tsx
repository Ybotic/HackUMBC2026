import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User } from 'lucide-react';

interface PlayerCardProps {
  playerNumber: number;
  title: string;
  playerName?: string;
  playerAddress?: string;
  isCurrentUser: boolean;
  nftData?: any;
  isJoined: boolean;
  gradientColor: string;
  avatarColors: string;
  children?: React.ReactNode;
}

export function PlayerCard({
  playerNumber,
  title,
  playerName,
  playerAddress,
  isCurrentUser,
  nftData,
  isJoined,
  gradientColor,
  avatarColors,
  children,
}: PlayerCardProps) {
  return (
    <Card
      className={`relative overflow-hidden ${isCurrentUser ? 'ring-2 ring-primary shadow-lg' : ''}`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientColor} to-transparent pointer-events-none`}
      />
      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors} flex items-center justify-center text-white font-bold shadow-lg`}
            >
              {playerNumber}
            </div>
            <div>
              <span className="text-lg">{title}</span>
              {isCurrentUser && (
                <div className="flex items-center gap-1 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  You
                </div>
              )}
            </div>
          </div>
          {nftData?.isReady && (
            <Badge variant="default" className="bg-green-500 text-white">
              Ready
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-base">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {isJoined
              ? playerName || `${playerAddress?.slice(0, 8)}...`
              : 'Waiting for player to join...'}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">{children}</CardContent>
    </Card>
  );
}
