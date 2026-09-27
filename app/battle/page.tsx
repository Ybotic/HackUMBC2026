import { preloadQuery } from 'convex/nextjs';
import { connection } from 'next/server';
import { api } from '@/convex/_generated/api';
import { BattleClient } from './battle-client';

export default async function BattlePage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  await connection();
  const { wallet } = await searchParams;
  const address =
    typeof wallet === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)
      ? wallet
      : null;

  const [publicLobbies, playerData] = await Promise.all([
    preloadQuery(api.lobby.getPublicLobbies),
    address
      ? Promise.all([
          preloadQuery(api.battle.getUserActiveBattles, {
            userAddress: address,
          }),
          preloadQuery(api.battle.getUserBattleHistory, {
            userAddress: address,
          }),
          preloadQuery(api.nft.getUserNFTs, { address }),
        ])
      : null,
  ]);

  return (
    <BattleClient
      address={address}
      publicLobbies={publicLobbies}
      activeBattles={playerData?.[0]}
      history={playerData?.[1]}
      nfts={playerData?.[2]}
    />
  );
}
