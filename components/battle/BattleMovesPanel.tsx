import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Star,
  Swords,
  Flame,
  Zap,
  Shield,
  Target,
  Brain,
  Heart,
  Eye,
  Wind,
  Leaf,
  Sun,
  Sparkles,
  Crown,
  Diamond,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAudioPlayer } from 'react-use-audio-player';
import type { BattleMove } from '@/lib/battle-moves';

interface BattleMovesPanelProps {
  moves: BattleMove[];
  selectedMove: BattleMove | null;
  onMoveSelect: (move: BattleMove) => void;
  onExecuteTurn: () => void;
  isMyTurn: boolean;
  isPending: boolean;
  gameFinished: boolean;
  isExecutingTurn: boolean;
  disabled?: boolean;
}

export function BattleMovesPanel({
  moves,
  selectedMove,
  onMoveSelect,
  onExecuteTurn,
  isMyTurn,
  isPending,
  gameFinished,
  isExecutingTurn,
  disabled = false,
}: BattleMovesPanelProps) {
  const [volume, setVolume] = useState(0.5);
  const {
    togglePlayPause,
    isPlaying,
    setVolume: setAudioVolume,
    load,
    isReady,
    fade,
  } = useAudioPlayer();

  // preload audio when component mounts
  useEffect(() => {
    load('/soundtrack.aac', {
      autoplay: false,
      loop: true,
      initialVolume: volume,
    });
  }, []);

  const handlePlayToggle = () => {
    if (isPlaying) {
      togglePlayPause();
      // fade out over 500ms
      fade(volume, 0, 500);
    } else {
      togglePlayPause();
      // fade in over 500ms when starting/resuming
      fade(0, volume, 500);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (isReady && isPlaying) {
      // smooth volume transition when adjusting
      fade(volume, newVolume, 300);
    } else {
      setAudioVolume(newVolume);
    }
  };

  const getIcon = (iconName: string) => {
    const iconProps = { className: 'size-4' };

    switch (iconName) {
      case 'Flame':
        return <Flame {...iconProps} />;
      case 'Zap':
        return <Zap {...iconProps} />;
      case 'Shield':
        return <Shield {...iconProps} />;
      case 'Swords':
        return <Swords {...iconProps} />;
      case 'Target':
        return <Target {...iconProps} />;
      case 'Brain':
        return <Brain {...iconProps} />;
      case 'Heart':
        return <Heart {...iconProps} />;
      case 'Eye':
        return <Eye {...iconProps} />;
      case 'Wind':
        return <Wind {...iconProps} />;
      case 'Leaf':
        return <Leaf {...iconProps} />;
      case 'Sun':
        return <Sun {...iconProps} />;
      case 'Sparkles':
        return <Sparkles {...iconProps} />;
      case 'Crown':
        return <Crown {...iconProps} />;
      case 'Diamond':
        return <Diamond {...iconProps} />;
      case 'Star':
        return <Star {...iconProps} />;
      default:
        return <Star {...iconProps} />;
    }
  };

  return (
    <Card className="mb-6 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Available Moves</CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayToggle}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title={isPlaying ? 'Pause soundtrack' : 'Play soundtrack'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) =>
                  handleVolumeChange(Number.parseFloat(e.target.value))
                }
                className="w-16 volume-slider"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4">
          <div className="space-y-3 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {moves.map((move) => (
                <Button
                  key={move.name}
                  variant="outline"
                  className={`w-44 h-11 transition-all duration-200 ease-in-out ${
                    selectedMove?.name === move.name
                      ? '!border-primary !border-2 bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'hover:!border-primary hover:border-2 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10 hover:scale-[1.01]'
                  }`}
                  onClick={() => onMoveSelect(move)}
                  disabled={!isMyTurn || isPending || gameFinished || disabled}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(move.iconName)}
                    {move.name}
                  </div>
                </Button>
              ))}
            </div>

            <Button
              className={`w-full h-11 ${
                selectedMove &&
                isMyTurn &&
                !isPending &&
                !isExecutingTurn &&
                !gameFinished
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : ''
              }`}
              onClick={onExecuteTurn}
              disabled={
                isExecutingTurn ||
                !isMyTurn ||
                isPending ||
                !selectedMove ||
                gameFinished ||
                disabled
              }
              variant={
                selectedMove &&
                isMyTurn &&
                !isPending &&
                !isExecutingTurn &&
                !gameFinished
                  ? 'default'
                  : 'outline'
              }
            >
              {gameFinished ? (
                'Battle Complete'
              ) : isExecutingTurn ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : isPending ? (
                'Processing...'
              ) : !isMyTurn ? (
                "Opponent's Turn"
              ) : !selectedMove ? (
                'Select a move'
              ) : (
                'Use move'
              )}
            </Button>
          </div>

          <Card className="flex-1 bg-card/30 p-0">
            <CardContent className="p-4">
              {selectedMove ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium flex items-center gap-2">
                      {getIcon(selectedMove.iconName)}
                      {selectedMove.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Swords className="size-4 text-primary" />
                      <span className="text-lg font-medium">
                        {selectedMove.power}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedMove.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[120px] text-center text-muted-foreground">
                  <p>Select a move to see details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
