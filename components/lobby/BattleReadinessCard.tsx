import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Swords } from 'lucide-react';

interface BattleReadinessCardProps {
  bothPlayersReady: boolean;
  isCreator: boolean;
  canStartBattle: boolean;
  isStartingBattle: boolean;
  onStartBattle: () => void;
  creatorReady: boolean;
  joinerReady: boolean;
}

export function BattleReadinessCard({
  bothPlayersReady,
  isCreator,
  canStartBattle,
  isStartingBattle,
  onStartBattle,
  creatorReady,
  joinerReady,
}: BattleReadinessCardProps) {
  const getButtonText = () => {
    if (isStartingBattle) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating Battle...
        </>
      );
    }

    if (!bothPlayersReady) return 'Waiting for Players to Ready Up';
    return (
      <>
        <Swords className="h-4 w-4 mr-2" />
        Start Battle!
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Swords className="h-4 w-4 text-primary" />
          </div>
          Start Battle
        </CardTitle>
        <CardDescription>
          Both players must be ready before the battle can begin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="font-medium">Battle Readiness</p>
            <p className="text-sm text-muted-foreground">
              {bothPlayersReady
                ? 'Both players ready!'
                : 'Waiting for all players to be ready'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${creatorReady ? 'bg-primary' : 'bg-gray-300'}`}
            />
            <span className="text-sm">P1</span>
            <div
              className={`w-2 h-2 rounded-full ${joinerReady ? 'bg-primary' : 'bg-gray-300'}`}
            />
            <span className="text-sm">P2</span>
          </div>
        </div>

        {isCreator && (
          <Button
            onClick={onStartBattle}
            disabled={!canStartBattle || isStartingBattle}
            className="w-full"
            size="lg"
          >
            {getButtonText()}
          </Button>
        )}

        {!isCreator && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Waiting for lobby creator to start the battle...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
