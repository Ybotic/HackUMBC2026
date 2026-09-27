# Mint — Solana TCG

Mint is an AI-assisted trading card game. Players generate card art, mint cards
as Metaplex Core assets on Solana, build a collection, and use those cards in
turn-based battles.

## Architecture

- **Solana Kit + Wallet Standard** — wallet discovery, connection, RPC, and
  transaction signing.
- **Metaplex Core** — single-account digital assets for collectible cards and
  collections.
- **Convex** — realtime lobbies, battle turns, card stat indexing, marketplace
  listings, and AI generation jobs.
- **Pinata/IPFS** — public card images and Metaplex-compatible JSON metadata.
- **Next.js 15** — application UI and metadata upload routes.

Chain-owned state (card ownership, collections, minting, and burning) lives on
Solana. Convex mirrors card data for fast gameplay queries; a wallet sync always
reconciles the mirror against Metaplex Core ownership.

## Local development

### Requirements

- Bun or Node.js
- A Wallet Standard-compatible Solana wallet such as Phantom or Solflare
- A Convex project
- Pinata and AI provider credentials

### Configure

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
PINATA_JWT=
NEXT_PUBLIC_GATEWAY_URL=
```

Connect a Vercel Blob store to the Vercel project for profile-picture uploads.
The Vercel-hosted Next.js route uses the SDK's OIDC authentication automatically
(`VERCEL_OIDC_TOKEN` paired with `BLOB_STORE_ID`) unless
`MINT_READ_WRITE_TOKEN` is configured. `MINT_STORE_ID` can be used when the
store ID is configured under a custom name. For local development, link the
Vercel project and run `vercel env pull` to get the development OIDC
configuration.

Configure `OPENROUTER_API_KEY` in the Convex deployment environment for card-art
generation (`google/gemini-3.1-flash-image`) and AI-generated battle moves.
Mystery-box character descriptions still use the Google AI SDK, so configure
`GOOGLE_GENERATIVE_AI_API_KEY` in Convex as well. The image-generation action
runs on Convex rather than Vercel, so it does not receive Vercel's OIDC token;
configure `MINT_READ_WRITE_TOKEN` in the Convex environment for that upload.

Use a DAS-capable production RPC if the collection grows large. The current
implementation uses Metaplex Core GPA queries so it also works with standard
Solana RPC endpoints during development.

### Run

```bash
bun install
bun run dev
```

Open `http://localhost:3000`, connect a devnet wallet, fund it with devnet SOL,
and mint a card from the Generate page.

## Key paths

- `lib/solana/client.ts` — Solana Kit client and cluster configuration
- `lib/providers/SolanaProvider.tsx` — Wallet Standard React integration
- `lib/solanaNFTManager.ts` — Metaplex Core reads, minting, and burning
- `hooks/useNFTs.ts` — Solana-to-Convex card synchronization
- `convex/battle.ts` — authoritative turn resolution
- `convex/lobby.ts` — realtime lobby and battle creation

## Network configuration

`NEXT_PUBLIC_SOLANA_CLUSTER` accepts `devnet`, `testnet`, or `mainnet`. The RPC
URL and cluster must refer to the same network. Devnet is the default.
