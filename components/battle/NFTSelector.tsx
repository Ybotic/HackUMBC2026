'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Swords,
  Shield,
  Zap,
  Brain,
  Target,
  Dices,
  CheckCircle,
  ImageIcon,
  Star,
  Flame,
  Wind,
  Leaf,
  Sun,
  Sparkles,
  Crown,
  Diamond,
  Eye,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { getNFTTypeName, getNFTTypeColor } from '@/lib/battle-utils';

interface NFTSelectorProps {
  nfts: any[];
  selectedNFT: any;
  onNFTSelect: (nft: any) => void;
  isReady: boolean;
  onReadyToggle: () => void;
  disabled?: boolean;
  canBeReady?: boolean;
}

export function NFTSelector({
  nfts,
  selectedNFT,
  onNFTSelect,
  isReady,
  onReadyToggle,
  disabled = false,
  canBeReady = true,
}: NFTSelectorProps) {
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);

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

  if (!nfts || nfts.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No NFTs Available</h3>
          <p className="text-sm text-muted-foreground text-center">
            You need to mint some NFTs first to participate in battles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={isGridCollapsed ? 'space-y-1' : 'space-y-6'}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Choose Your Fighter</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGridCollapsed(!isGridCollapsed)}
            className="h-6 px-2"
          >
            {isGridCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isGridCollapsed ? 'h-0 opacity-0' : 'h-64 opacity-100'
          }`}
        >
          <div className="relative h-64">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-3 p-2">
                {nfts.map((nft) => {
                  const metadata = getNFTMetadata(nft.itemMetadata);
                  const imageUrl = getIpfsImageUrl(metadata);
                  const nftName = metadata?.name || `NFT #${nft.item}`;
                  const typeColor = getNFTTypeColor(nft.stats?.nftType || 0);
                  const isSelected =
                    selectedNFT &&
                    `${selectedNFT.collection}-${selectedNFT.item}` ===
                      `${nft.collection}-${nft.item}`;

                  return (
                    <button
                      key={`${nft.collection}-${nft.item}`}
                      type="button"
                      className={`relative cursor-pointer transition-all duration-200 hover:scale-[1.05] ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => !disabled && onNFTSelect(nft)}
                      disabled={disabled}
                    >
                      <div
                        className={`relative rounded-lg overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 border-2 aspect-square transition-all duration-200 ${
                          isSelected
                            ? 'border-primary shadow-lg shadow-primary/20'
                            : 'border-border hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={nftName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}

                        <div className="absolute top-2 right-2">
                          <div
                            className={`w-4 h-4 rounded-full border border-white shadow-sm ${typeColor}`}
                          />
                        </div>

                        {isSelected && (
                          <div className="absolute bottom-2 right-2">
                            <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {nfts.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {selectedNFT && (
        <div className="space-y-4">
          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help">
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 border-2 border-border shadow-xl">
                        {(() => {
                          const metadata = getNFTMetadata(
                            selectedNFT.itemMetadata,
                          );
                          const imageUrl = getIpfsImageUrl(metadata);
                          const nftName =
                            metadata?.name || `NFT #${selectedNFT.item}`;

                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={nftName}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-16 w-16 text-muted-foreground" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="absolute -top-3 -right-3">
                        <div
                          className={`w-8 h-8 rounded-full border-3 border-white shadow-lg ${getNFTTypeColor(selectedNFT.stats?.nftType || 0)}`}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-semibold">
                        {(() => {
                          const metadata = getNFTMetadata(
                            selectedNFT.itemMetadata,
                          );
                          return metadata?.name || `NFT #${selectedNFT.item}`;
                        })()}
                      </p>
                      <Badge
                        className={getNFTTypeColor(
                          selectedNFT.stats?.nftType || 0,
                        )}
                      >
                        {getNFTTypeName(selectedNFT.stats?.nftType || 0)}
                      </Badge>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <Card className="aspect-square p-3">
                <div className="space-y-3 h-full flex flex-col">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <span className="flex items-center gap-1.5 font-medium text-sm">
                      <Heart className="h-3.5 w-3.5 text-red-500" />
                      Max Health
                    </span>
                    <span className="font-bold text-lg">
                      {selectedNFT.stats?.maxHealth || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs flex-1">
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Swords className="h-4 w-4 text-red-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">ATK</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.attack || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Shield className="h-4 w-4 text-blue-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">DEF</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.defense || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Zap className="h-4 w-4 text-yellow-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">SPD</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.speed || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Target className="h-4 w-4 text-purple-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">STR</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.strength || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Brain className="h-4 w-4 text-green-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">INT</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.intelligence || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 bg-muted/30 rounded-sm text-center">
                      <Dices className="h-4 w-4 text-orange-500 mb-0.5" />
                      <span className="text-xs text-muted-foreground">LCK</span>
                      <span className="font-bold text-base">
                        {selectedNFT.stats?.luck || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {selectedNFT.customMoves && selectedNFT.customMoves.length > 0 && (
            <Card className="p-0 pt-4 pb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  Battle Moves
                </CardTitle>
              </CardHeader>
              <CardContent className="-mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {selectedNFT.customMoves.map((move: any, index: number) => {
                    const power = Math.floor(
                      25 +
                        (selectedNFT.stats?.attack || 0) * 0.6 +
                        (selectedNFT.stats?.strength || 0) * 0.4 +
                        index * 5,
                    );

                    return (
                      <Card
                        key={move.name}
                        className="border-muted p-0 pt-2 pb-2"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getIcon(move.iconName)}
                              <span className="font-medium text-sm">
                                {move.name}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {power} PWR
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {move.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Button
        onClick={onReadyToggle}
        disabled={!selectedNFT || disabled || !canBeReady}
        variant={isReady ? 'default' : 'outline'}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isReady ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Ready for Battle!
          </div>
        ) : !canBeReady ? (
          'Complete wallet setup first'
        ) : !selectedNFT ? (
          'Select an NFT first'
        ) : (
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Mark as Ready
          </div>
        )}
      </Button>
    </div>
  );
}
