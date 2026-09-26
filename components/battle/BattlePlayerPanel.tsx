import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import {
  User,
  Swords,
  Shield,
  Zap,
  Brain,
  Target,
  Dices,
  DoorOpen,
} from 'lucide-react';
import { getPlayerDisplayName, getNFTTypeName } from '@/lib/battle-utils';
import type { NFTStats } from '@/lib/battle-moves';

interface PlayerData {
  address: string;
  name?: string;
  nft: {
    item: string;
    collection: string;
    stats: NFTStats;
  };
  profile?: {
    profilePicture?: string;
  } | null;
}

interface BattlePlayerPanelProps {
  player: PlayerData;
  nftName: string;
  isMyTurn: boolean;
  roomCode?: string;
}

export function BattlePlayerPanel({
  player,
  nftName,
  isMyTurn,
  roomCode,
}: BattlePlayerPanelProps) {
  const isProfileLoading = player.profile === undefined;
  const router = useRouter();

  const handleExitBattle = () => {
    router.push('/battle');
  };

  return (
    <Card className="w-96 m-6 ml-6 rounded-2xl overflow-hidden h-[calc(100vh-3rem)]">
      <CardContent className="p-6 h-full flex flex-col relative">
        <div className="flex-1 space-y-6">
          <div className="flex justify-center">
            {isProfileLoading ? (
              <Skeleton className="w-84 h-84 rounded-lg" />
            ) : (
              <div className="w-84 h-84 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {player.profile?.profilePicture ? (
                  <img
                    src={player.profile.profilePicture}
                    alt="User profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="size-32 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          <div className="text-left space-y-4">
            <div className="flex items-center justify-start gap-2">
              <div
                className={`size-2 rounded-full ${
                  isMyTurn ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              <h2 className="text-lg font-medium">
                {getPlayerDisplayName(player.address, player.name)}
              </h2>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-primary">Name:</span>
                <span className="ml-2">{nftName}</span>
              </div>
              <div>
                <span className="text-primary">ID:</span>
                <span className="ml-2">{player.nft.item}</span>
              </div>
              <div>
                <span className="text-primary">Collection:</span>
                <span className="ml-2">{player.nft.collection}</span>
              </div>
              <div>
                <span className="text-primary">Type:</span>
                <span className="ml-2">
                  {getNFTTypeName(player.nft.stats.nftType)}
                </span>
              </div>
              <div>
                <span className="text-primary">Max Health:</span>
                <span className="ml-2">{player.nft.stats.maxHealth}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Battle Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Swords className="h-3 w-3" />
                  Attack:
                </span>
                <span className="font-medium">{player.nft.stats.attack}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Defense:
                </span>
                <span className="font-medium">{player.nft.stats.defense}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Speed:
                </span>
                <span className="font-medium">{player.nft.stats.speed}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Strength:
                </span>
                <span className="font-medium">{player.nft.stats.strength}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Intelligence:
                </span>
                <span className="font-medium">
                  {player.nft.stats.intelligence}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Dices className="h-3 w-3" />
                  Luck:
                </span>
                <span className="font-medium">{player.nft.stats.luck}</span>
              </div>
            </div>
          </div>
        </div>

        {/* right-4 to align it with the stats above
        TODO: change the layout of the stats with the numbers?*/}
        <div className="absolute bottom-0 left-6 right-4">
          <Separator className="mb-2" />
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{roomCode}</div>
            <button
              type="button"
              onClick={handleExitBattle}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Exit Battle"
            >
              <DoorOpen className="h-6 w-6 text-destructive" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
