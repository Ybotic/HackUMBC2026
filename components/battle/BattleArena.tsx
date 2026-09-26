import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { getPlayerDisplayName } from '@/lib/battle-utils';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PlayerArenaData {
  address: string;
  name?: string;
  health: number;
  maxHealth: number;
}

interface BattleArenaProps {
  currentPlayer: PlayerArenaData;
  opponent: PlayerArenaData;
  currentPlayerImage?: string;
  opponentImage?: string;
  currentPlayerNFTName: string;
  opponentNFTName: string;
  currentPlayerNFTType: number;
  opponentNFTType: number;
  turnNumber: number;
}

export function BattleArena({
  currentPlayer,
  opponent,
  currentPlayerImage,
  opponentImage,
  currentPlayerNFTName,
  opponentNFTName,
  currentPlayerNFTType,
  opponentNFTType,
  turnNumber,
}: BattleArenaProps) {
  const [currentPlayerImageLoading, setCurrentPlayerImageLoading] =
    useState(true);
  const [currentPlayerImageError, setCurrentPlayerImageError] = useState(false);
  const [opponentImageLoading, setOpponentImageLoading] = useState(true);
  const [opponentImageError, setOpponentImageError] = useState(false);

  const getTypeEmoji = (nftType: number) => {
    return nftType === 0 ? '🔥' : nftType === 1 ? '💧' : '🌿';
  };

  const SegmentedHealthBar = ({
    health,
    maxHealth,
    isCurrentPlayer,
  }: {
    health: number;
    maxHealth: number;
    isCurrentPlayer: boolean;
  }) => {
    const segments = 18; // Number of health segments to match the design
    const healthPerSegment = maxHealth / segments;
    const filledSegments = Math.ceil(health / healthPerSegment);

    return (
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, index) => (
          <div
            key={index}
            className={`h-6 w-2 rounded-full ${
              index < filledSegments
                ? isCurrentPlayer
                  ? 'bg-green-400'
                  : 'bg-red-500'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="flex-1 mt-6 mb-6 rounded-2xl overflow-hidden relative p-0">
      <div className="flex h-full">
        <div className="flex-1 relative">
          {currentPlayerImage ? (
            <>
              {currentPlayerImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
              )}

              {currentPlayerImageError ? (
                <div className="flex items-center justify-center h-full text-9xl opacity-60">
                  {getTypeEmoji(currentPlayerNFTType)}
                </div>
              ) : (
                <>
                  <Image
                    src={currentPlayerImage}
                    alt="Current Player NFT"
                    fill
                    className="object-cover"
                    onLoad={() => setCurrentPlayerImageLoading(false)}
                    onError={() => {
                      setCurrentPlayerImageLoading(false);
                      setCurrentPlayerImageError(true);
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(0, 0, 0, 0.3) 15%, rgba(0, 0, 0, 0.8) 100%)`,
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-9xl opacity-60">
              {getTypeEmoji(currentPlayerNFTType)}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex items-center justify-center w-full max-w-2xl px-8">
            <p className="text-xl font-bold text-white flex-1 text-right pr-4">
              {currentPlayerNFTName}
            </p>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="85"
              height="70"
              fill="none"
            >
              <path
                fill="#fff"
                d="M.215 10.095h24.573c-.101 0-.227.025-.38.076-.15.05-.48.152-.985.303a6.74 6.74 0 0 0-1.214.531c-.354.202-.783.506-1.289.91-.506.405-.86.86-1.062 1.366-.202.455-.379 1.036-.53 1.744-.102.708 0 1.492.303 2.351.809 2.579 1.795 5.992 2.958 10.239a656.967 656.967 0 0 1 2.882 10.694l1.213 4.399c2.68-8.242 4.88-15.295 6.599-21.16.303-1.113.379-2.073.227-2.882-.101-.81-.38-1.467-.834-1.973-.455-.556-.936-.985-1.441-1.289-.506-.354-.936-.581-1.29-.682l-.606-.228c.253-.05.607-.126 1.062-.227.505-.152 1.542-.531 3.11-1.138a68.345 68.345 0 0 0 4.853-2.275c1.669-.86 3.716-2.099 6.143-3.717a71.776 71.776 0 0 0 7.357-5.536c-.455.708-1.062 1.668-1.82 2.882-.708 1.163-1.896 3.337-3.565 6.522-1.618 3.135-2.907 5.992-3.868 8.57-.86 2.377-2.705 7.686-5.536 15.928-2.781 8.241-5.36 15.901-7.736 22.98l-3.49 10.542C16.193 39.497 10.43 22.432 8.559 17.831c-.455-1.264-1.062-2.376-1.82-3.337-.76-1.011-1.517-1.77-2.276-2.275-.708-.556-1.39-.986-2.048-1.29-.657-.354-1.188-.581-1.592-.682l-.607-.152ZM64.651 19.651a.672.672 0 0 1-.303.076c-3.843.05-6.37 1.214-7.584 3.49-.91 1.769-.683 3.361.682 4.777 1.012 1.011 2.453 1.568 4.323 1.669 2.983.202 5.562.556 7.736 1.062 2.124.455 4.02 1.238 5.689 2.35 1.668 1.113 3.008 2.402 4.02 3.869 1.01 1.415 1.719 3.008 2.123 4.778.455 1.719.581 3.438.38 5.157-.153 1.669-.658 3.312-1.518 4.93-.86 1.567-2.022 2.958-3.489 4.171-1.415 1.214-3.26 2.2-5.536 2.958-2.225.708-4.702 1.062-7.433 1.062h-1.896a27.76 27.76 0 0 0-2.123-.076H56.309c-2.023.101-4.02.506-5.992 1.214-1.972.708-3.615 1.466-4.93 2.275a32.655 32.655 0 0 0-3.792 2.73c-1.213 1.062-1.997 1.795-2.351 2.2-.405.404-.708.733-.91.986C43.744 59.216 47.56 51 49.786 44.679v.456c.05.202.152.581.303 1.138.152.556.38 1.061.683 1.516.354.455.885.885 1.593 1.29.758.404 1.668.657 2.73.758h8.798c1.82-.101 3.312-.48 4.475-1.138 1.213-.707 1.921-1.516 2.123-2.426a4.817 4.817 0 0 0-.076-2.807c-.252-.91-.91-1.694-1.971-2.35-1.062-.709-2.352-1.088-3.868-1.139a108.074 108.074 0 0 1-4.02-.303c-6.017-.354-10.315-2.705-12.893-7.053-2.276-3.793-2.655-7.812-1.138-12.06 1.618-4.449 4.778-7.584 9.48-9.404 2.478-.96 5.208-1.466 8.191-1.517h.759a26.95 26.95 0 0 0 6.598-1.138c2.174-.657 4.02-1.44 5.537-2.35a47.952 47.952 0 0 0 4.095-2.731c1.264-.91 2.2-1.694 2.806-2.351l.91-.91c-5.915 10.163-10.112 18.455-12.59 24.876a.943.943 0 0 0 0-.53c0-.253-.126-.658-.379-1.214a4.4 4.4 0 0 0-1.137-1.593c-.455-.455-1.214-.885-2.276-1.29-1.061-.404-2.35-.656-3.868-.758Z"
              />
            </svg>
            <p className="text-xl font-bold text-white flex-1 text-left pl-4">
              {opponentNFTName}
            </p>
          </div>
        </div>

        <div className="flex-1 relative">
          {opponentImage ? (
            <>
              {opponentImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
              )}

              {opponentImageError ? (
                <div className="flex items-center justify-center h-full text-9xl opacity-60">
                  {getTypeEmoji(opponentNFTType)}
                </div>
              ) : (
                <>
                  <Image
                    src={opponentImage}
                    alt="Opponent NFT"
                    fill
                    className="object-cover"
                    onLoad={() => setOpponentImageLoading(false)}
                    onError={() => {
                      setOpponentImageLoading(false);
                      setOpponentImageError(true);
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(0, 0, 0, 0.3) 15%, rgba(0, 0, 0, 0.8) 100%)`,
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-9xl opacity-60">
              {getTypeEmoji(opponentNFTType)}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-12 right-12">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">
              {currentPlayer.health}/{currentPlayer.maxHealth}
            </p>
            <SegmentedHealthBar
              health={currentPlayer.health}
              maxHealth={currentPlayer.maxHealth}
              isCurrentPlayer={true}
            />
            <p className="text-lg font-medium text-white">
              {getPlayerDisplayName(currentPlayer.address, currentPlayer.name)}
            </p>
          </div>

          <div className="space-y-2 text-right">
            <p className="text-lg font-medium text-white">
              {opponent.health}/{opponent.maxHealth}
            </p>
            <div className="flex justify-end">
              <SegmentedHealthBar
                health={opponent.health}
                maxHealth={opponent.maxHealth}
                isCurrentPlayer={false}
              />
            </div>
            <p className="text-lg font-medium text-white">
              {getPlayerDisplayName(opponent.address, opponent.name)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
