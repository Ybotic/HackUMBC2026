import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, ImageIcon } from 'lucide-react';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';

interface OpponentNFTDisplayProps {
  nftData: any;
  nftMetadata: any;
  playerColor: string;
}

export function OpponentNFTDisplay({
  nftData,
  nftMetadata,
  playerColor,
}: OpponentNFTDisplayProps) {
  const metadata = getNFTMetadata(nftMetadata?.itemMetadata);
  const imageUrl = getIpfsImageUrl(metadata);
  const nftName = metadata?.name || `NFT #${nftData.item}`;

  return (
    <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl p-4 border-2 border-border">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 border-2 border-border shadow-xl">
            {imageUrl ? (
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
                <ImageIcon className="h-20 w-20 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="absolute -top-2 -right-2">
            <div
              className={`w-6 h-6 rounded-full ${playerColor} border-2 border-white shadow-lg`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-bold">{nftName}</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Collection: {nftData.collection.slice(0, 12)}...
            </p>
            <p className="text-xs text-muted-foreground">
              Item: {nftData.item.slice(0, 12)}...
            </p>
          </div>
          <Badge
            variant={nftData.isReady ? 'default' : 'secondary'}
            className="text-sm px-4 py-2"
          >
            {nftData.isReady ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready to Battle
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing...
              </>
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
}
