import { preloadQuery } from 'convex/nextjs';
import { connection } from 'next/server';
import { api } from '@/convex/_generated/api';
import { MarketplaceClient } from './marketplace-client';

export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  // Wait for the live Convex data before handing the route to the client.
  await connection();
  const { wallet } = await searchParams;
  const address =
    typeof wallet === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)
      ? wallet
      : null;

  const [auctions, accountData] = await Promise.all([
    preloadQuery(api.marketplace.getActiveAuctions),
    address
      ? Promise.all([
          preloadQuery(api.users.getUser, { address }),
          preloadQuery(api.marketplace.getUserMysteryBoxes, {
            userAddress: address,
          }),
          preloadQuery(api.nft.getUserNFTs, { address }),
        ])
      : null,
  ]);

  return (
    <MarketplaceClient
      address={address}
      auctions={auctions}
      user={accountData?.[0]}
      boxes={accountData?.[1]}
      nfts={accountData?.[2]}
    />
  );
}
