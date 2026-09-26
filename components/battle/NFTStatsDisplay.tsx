import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Swords, Shield, Zap, Brain, Target, Dices } from 'lucide-react';
import { getNFTTypeName, getNFTTypeColor } from '@/lib/battle-utils';

interface NFTStatsDisplayProps {
  stats: {
    attack: number;
    defense: number;
    intelligence: number;
    luck: number;
    speed: number;
    strength: number;
    nftType: number;
    maxHealth: number;
  };
}

export function NFTStatsDisplay({ stats }: NFTStatsDisplayProps) {
  const typeName = getNFTTypeName(stats.nftType);
  const typeColor = getNFTTypeColor(stats.nftType);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Type</span>
        <Badge className={typeColor}>{typeName}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Swords className="h-3 w-3" />
            Attack:
          </span>
          <span className="font-medium">{stats.attack}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Defense:
          </span>
          <span className="font-medium">{stats.defense}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Speed:
          </span>
          <span className="font-medium">{stats.speed}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Strength:
          </span>
          <span className="font-medium">{stats.strength}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Intelligence:
          </span>
          <span className="font-medium">{stats.intelligence}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Dices className="h-3 w-3" />
            Luck:
          </span>
          <span className="font-medium">{stats.luck}</span>
        </div>
      </div>
      <Separator />
      <div className="flex justify-between items-center font-semibold text-sm">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Max Health:
        </span>
        <span className="text-green-600 font-bold">{stats.maxHealth} HP</span>
      </div>
    </div>
  );
}
