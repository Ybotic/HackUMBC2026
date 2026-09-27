import { preloadQuery } from 'convex/nextjs';
import { connection } from 'next/server';
import { api } from '@/convex/_generated/api';
import { GenerateClient } from './generate-client';

export default async function GeneratePage({
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
  const history = address
    ? await preloadQuery(api.images.getUserImages, { userAddress: address })
    : null;

  return <GenerateClient address={address} history={history} />;
}
