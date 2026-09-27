import {
  burn,
  create,
  createCollection,
  fetchAsset,
  fetchAssetsByOwner,
  fetchCollection,
  fetchCollectionsByUpdateAuthority,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import {
  generateSigner,
  publicKey,
  signerIdentity,
  type Signer,
  type Transaction as UmiTransaction,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  assertIsTransactionWithinSizeLimit,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
  getTransactionLifetimeConstraintFromCompiledTransactionMessage,
  isMessageModifyingSigner,
  isMessagePartialSigner,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  type Transaction as KitTransaction,
} from '@solana/kit';
import type { WalletSigner } from '@solana/kit-plugin-wallet';

export interface UserCollection {
  id: string;
  owner: string;
  details: unknown;
  metadata: Record<string, unknown> | null;
}

export interface UserNFT {
  collection: string;
  item: string;
  owner: string;
  itemDetails: unknown;
  itemMetadata: Record<string, unknown> | null;
  collectionMetadata: Record<string, unknown> | null;
}

export interface NFTMintedResult {
  collectionId: string;
  itemId: string;
  owner: string;
  txHash: string;
}

const READ_CACHE_TTL_MS = 30_000;
const RPC_RATE_LIMIT_COOLDOWN_MS = 30_000;
const COLLECTION_FETCH_TIMEOUT_MS = 20_000;
type CoreCollectionAccount = Awaited<ReturnType<typeof fetchCollection>>;

class RpcCooldownError extends Error {}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|too many requests|rate.?limit/i.test(message);
}

async function fetchJson(uri: string): Promise<Record<string, unknown> | null> {
  if (!uri) return null;
  try {
    const response = await fetch(
      uri.replace('ipfs://', 'https://ipfs.io/ipfs/'),
    );
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function signatureToBase58(signature: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = BigInt(0);
  for (const byte of signature) value = value * BigInt(256) + BigInt(byte);
  let result = '';
  while (value > BigInt(0)) {
    result = alphabet[Number(value % BigInt(58))] + result;
    value /= BigInt(58);
  }
  for (const byte of signature) {
    if (byte !== 0) break;
    result = `1${result}`;
  }
  return result;
}

export class SolanaNFTManager {
  private readonly readCache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  private readonly pendingReads = new Map<string, Promise<unknown>>();
  private readonly readGenerations = new Map<string, number>();
  private readonly collectionReadCache = new Map<
    string,
    { expiresAt: number; value: CoreCollectionAccount }
  >();
  private rpcReadQueue: Promise<void> = Promise.resolve();
  private rpcCooldownUntil = 0;

  constructor(
    private readonly rpcUrl: string,
    private readonly walletSigner: WalletSigner | null,
  ) {}

  private cachedRead<T>(
    key: string,
    load: () => Promise<T>,
    forceRefresh = false,
  ): Promise<T> {
    if (forceRefresh) this.readCache.delete(key);

    const cached = this.readCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value as T);
    }
    if (cached) this.readCache.delete(key);

    const pending = this.pendingReads.get(key);
    if (pending) return pending as Promise<T>;

    const generation = this.readGenerations.get(key) ?? 0;
    const request = load()
      .then((value) => {
        if ((this.readGenerations.get(key) ?? 0) === generation) {
          this.readCache.set(key, {
            expiresAt: Date.now() + READ_CACHE_TTL_MS,
            value,
          });
        }
        return value;
      })
      .finally(() => {
        if ((this.readGenerations.get(key) ?? 0) === generation) {
          this.pendingReads.delete(key);
        }
      });
    this.pendingReads.set(key, request);
    return request;
  }

  private async runRpcRead<T>(request: () => Promise<T>): Promise<T> {
    const previousRead = this.rpcReadQueue;
    let releaseRead!: () => void;
    this.rpcReadQueue = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });

    await previousRead.catch(() => undefined);
    try {
      const cooldownMs = this.rpcCooldownUntil - Date.now();
      if (cooldownMs > 0) {
        throw new RpcCooldownError(
          `Solana RPC is cooling down after a rate limit. Wait ${Math.ceil(cooldownMs / 1000)} seconds before trying again.`,
        );
      }
      return await request();
    } catch (error) {
      if (!(error instanceof RpcCooldownError) && isRateLimitError(error)) {
        this.rpcCooldownUntil = Math.max(
          this.rpcCooldownUntil,
          Date.now() + RPC_RATE_LIMIT_COOLDOWN_MS,
        );
      }
      throw error;
    } finally {
      releaseRead();
    }
  }

  private invalidateUserReads(userAddress?: string): void {
    if (!userAddress) return;
    for (const key of [`nfts:${userAddress}`, `collections:${userAddress}`]) {
      this.readGenerations.set(key, (this.readGenerations.get(key) ?? 0) + 1);
      this.readCache.delete(key);
      this.pendingReads.delete(key);
    }
  }

  private cacheCollectionAccounts(collections: CoreCollectionAccount[]): void {
    const expiresAt = Date.now() + READ_CACHE_TTL_MS;
    for (const collection of collections) {
      this.collectionReadCache.set(collection.publicKey.toString(), {
        expiresAt,
        value: collection,
      });
    }
  }

  private createUmiSigner(umi: ReturnType<typeof createUmi>): Signer {
    const walletSigner = this.walletSigner;
    if (!walletSigner)
      throw new Error('Connect a signing Solana wallet first.');

    const signOne = async (transaction: UmiTransaction) => {
      const bytes = umi.transactions.serialize(transaction);
      const kitTransaction = getTransactionDecoder().decode(bytes);
      assertIsTransactionWithinSizeLimit(kitTransaction);

      const compiledMessage = getCompiledTransactionMessageDecoder().decode(
        kitTransaction.messageBytes,
      );
      const lifetimeConstraint =
        await getTransactionLifetimeConstraintFromCompiledTransactionMessage(
          compiledMessage,
        );
      const signableTransaction = Object.freeze({
        ...kitTransaction,
        lifetimeConstraint,
      });

      let signed: KitTransaction;
      if (isTransactionModifyingSigner(walletSigner)) {
        [signed] = await walletSigner.modifyAndSignTransactions([
          signableTransaction,
        ]);
      } else if (isTransactionPartialSigner(walletSigner)) {
        const [signatures] = await walletSigner.signTransactions([
          signableTransaction,
        ]);
        signed = {
          ...kitTransaction,
          signatures: { ...kitTransaction.signatures, ...signatures },
        };
      } else {
        throw new Error(
          'This wallet can only sign and send transactions directly, which is not supported for Metaplex minting.',
        );
      }

      return umi.transactions.deserialize(
        new Uint8Array(getTransactionEncoder().encode(signed)),
      );
    };

    return {
      publicKey: publicKey(walletSigner.address),
      signTransaction: signOne,
      signAllTransactions: (transactions) =>
        Promise.all(transactions.map(signOne)),
      signMessage: async (message) => {
        if (isMessageModifyingSigner(walletSigner)) {
          const [signed] = await walletSigner.modifyAndSignMessages([
            { content: message, signatures: {} },
          ]);
          const signature = signed.signatures[walletSigner.address];
          if (!signature) throw new Error('Wallet did not return a signature.');
          return signature;
        }
        if (isMessagePartialSigner(walletSigner)) {
          const [signatures] = await walletSigner.signMessages([
            { content: message, signatures: {} },
          ]);
          const signature = signatures[walletSigner.address];
          if (!signature) throw new Error('Wallet did not return a signature.');
          return signature;
        }
        throw new Error('This wallet does not support message signing.');
      },
    };
  }

  private getUmi(requireSigner = false) {
    const umi = createUmi(this.rpcUrl, {
      // web3.js otherwise retries 429 responses several times, multiplying
      // traffic against shared public RPC endpoints.
      disableRetryOnRateLimit: true,
    }).use(mplCore());
    if (this.walletSigner) {
      umi.use(signerIdentity(this.createUmiSigner(umi)));
    } else if (requireSigner) {
      throw new Error('Connect a signing Solana wallet first.');
    }
    return umi;
  }

  async getUserNFTs(
    userAddress: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<UserNFT[]> {
    return this.cachedRead(
      `nfts:${userAddress}`,
      async () => {
        const umi = this.getUmi();
        const assets = await this.runRpcRead(() =>
          fetchAssetsByOwner(umi, publicKey(userAddress), {
            // Collection plugin derivation performs an extra RPC fetch per
            // collection. Keep owner sync independent of that unreliable read;
            // collection metadata is loaded by getUserCollections below.
            skipDerivePlugins: true,
          }),
        );

        return Promise.all(
          assets.map(async (asset) => {
            const collectionId =
              asset.updateAuthority.type === 'Collection' &&
              asset.updateAuthority.address
                ? asset.updateAuthority.address.toString()
                : 'uncollected';

            let collection: Awaited<ReturnType<typeof fetchCollection>> | null =
              null;
            if (collectionId !== 'uncollected') {
              const cachedCollection =
                this.collectionReadCache.get(collectionId);
              if (cachedCollection && cachedCollection.expiresAt > Date.now()) {
                collection = cachedCollection.value;
              } else if (cachedCollection) {
                this.collectionReadCache.delete(collectionId);
              }
            }

            return {
              collection: collectionId,
              item: asset.publicKey.toString(),
              owner: asset.owner.toString(),
              itemDetails: asset,
              itemMetadata: await fetchJson(asset.uri),
              collectionMetadata: collection
                ? await fetchJson(collection.uri)
                : null,
            };
          }),
        );
      },
      options.forceRefresh,
    );
  }

  async getUserCollections(userAddress: string): Promise<UserCollection[]> {
    return this.cachedRead(`collections:${userAddress}`, async () => {
      const umi = this.getUmi();
      const collections = await this.runRpcRead(() =>
        fetchCollectionsByUpdateAuthority(umi, publicKey(userAddress)),
      );
      const results = await Promise.all(
        collections.map(async (collection) => ({
          id: collection.publicKey.toString(),
          owner: collection.updateAuthority.toString(),
          details: collection,
          metadata: await fetchJson(collection.uri),
        })),
      );

      this.cacheCollectionAccounts(collections);

      return results;
    });
  }

  async createCollection(
    name: string,
    metadataUri: string,
  ): Promise<UserCollection> {
    const umi = this.getUmi(true);
    const collection = generateSigner(umi);
    await createCollection(umi, {
      collection,
      name,
      uri: metadataUri,
    }).sendAndConfirm(umi);
    this.invalidateUserReads(this.walletSigner?.address);

    return {
      id: collection.publicKey.toString(),
      owner: umi.identity.publicKey.toString(),
      details: { publicKey: collection.publicKey.toString() },
      metadata: { name },
    };
  }

  async mintNFT({
    collectionId,
    name,
    metadataUri,
  }: {
    collectionId?: string;
    name: string;
    metadataUri: string;
  }): Promise<NFTMintedResult> {
    const umi = this.getUmi(true);
    const asset = generateSigner(umi);
    let collection: CoreCollectionAccount | undefined;
    if (collectionId) {
      const cachedCollection = this.collectionReadCache.get(collectionId);
      if (cachedCollection && cachedCollection.expiresAt > Date.now()) {
        collection = cachedCollection.value;
      } else {
        if (cachedCollection) this.collectionReadCache.delete(collectionId);
        const loadError =
          'The Solana RPC did not respond while loading this collection. Check your network and try again.';

        // Refresh using the same update-authority query as the collection
        // picker. This avoids relying on a stale list selection followed by a
        // separate, less reliable single-account lookup during minting.
        const collections = await this.runRpcRead(() =>
          withTimeout(
            fetchCollectionsByUpdateAuthority(
              umi,
              publicKey(umi.identity.publicKey),
            ),
            COLLECTION_FETCH_TIMEOUT_MS,
            loadError,
          ),
        );
        this.cacheCollectionAccounts(collections);
        collection = collections.find(
          (candidate) => candidate.publicKey.toString() === collectionId,
        );

        // Keep support for a collection that was selected before a wallet or
        // update-authority change, even if it is not in the refreshed list.
        if (!collection) {
          collection = await this.runRpcRead(() =>
            withTimeout(
              fetchCollection(umi, publicKey(collectionId)),
              COLLECTION_FETCH_TIMEOUT_MS,
              loadError,
            ),
          );
          this.cacheCollectionAccounts([collection]);
        }
      }
    }
    const result = await create(umi, {
      asset,
      collection,
      name,
      uri: metadataUri,
    }).sendAndConfirm(umi);
    this.invalidateUserReads(this.walletSigner?.address);

    return {
      collectionId: collectionId ?? 'uncollected',
      itemId: asset.publicKey.toString(),
      owner: umi.identity.publicKey.toString(),
      txHash: signatureToBase58(result.signature),
    };
  }

  async burnNFT(itemId: string): Promise<{ txHash: string }> {
    const umi = this.getUmi(true);
    const asset = await this.runRpcRead(() =>
      fetchAsset(umi, publicKey(itemId), { skipDerivePlugins: true }),
    );
    const collection =
      asset.updateAuthority.type === 'Collection' &&
      asset.updateAuthority.address
        ? await this.runRpcRead(() =>
            fetchCollection(umi, asset.updateAuthority.address as string),
          )
        : undefined;
    const result = await burn(umi, { asset, collection }).sendAndConfirm(umi);
    this.invalidateUserReads(this.walletSigner?.address);
    return { txHash: signatureToBase58(result.signature) };
  }
}
