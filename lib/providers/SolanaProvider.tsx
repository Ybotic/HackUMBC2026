'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ClientProvider, useClient } from '@solana/react';
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWallets,
  useWalletStatus,
} from '@solana/kit-plugin-wallet/react';
import type { WalletSigner } from '@solana/kit-plugin-wallet';
import type { UiWallet } from '@wallet-standard/ui';
import { solanaClient, type SolanaClient } from '@/lib/solana/client';

export interface SolanaAccount {
  address: string;
  meta: { name?: string; source: string };
  icon?: string;
}

interface SolanaContextValue {
  isInitialized: boolean;
  isReady: boolean;
  isConnecting: boolean;
  error: string | null;
  wallets: readonly UiWallet[];
  accounts: SolanaAccount[];
  selectedAccount: SolanaAccount | null;
  selectedAccountIndex: number;
  signer: WalletSigner | null;
  connectWallet: (wallet?: UiWallet) => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const SolanaContext = createContext<SolanaContextValue | undefined>(undefined);

function SolanaWalletState({ children }: { children: ReactNode }) {
  const client = useClient<SolanaClient>();
  const status = useWalletStatus(client);
  const isInitialized = useIsWalletReady(client);
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);

  const accounts: SolanaAccount[] = connected
    ? connected.wallet.accounts.map((account) => ({
        address: account.address,
        meta: {
          name: account.label || connected.wallet.name,
          source: connected.wallet.name,
        },
        icon: account.icon || connected.wallet.icon,
      }))
    : [];

  const selectedAccount = connected
    ? {
        address: connected.account.address,
        meta: {
          name: connected.account.label || connected.wallet.name,
          source: connected.wallet.name,
        },
        icon: connected.account.icon || connected.wallet.icon,
      }
    : null;

  const selectedAccountIndex = selectedAccount
    ? Math.max(
        0,
        accounts.findIndex(
          (account) => account.address === selectedAccount.address,
        ),
      )
    : 0;

  const connectWallet = async (wallet?: UiWallet) => {
    const target = wallet ?? wallets[0];
    if (!target) {
      throw new Error(
        'No Solana wallet found. Install Phantom, Solflare, or another Wallet Standard wallet.',
      );
    }
    await connect.dispatchAsync(target);
  };

  const disconnectWallet = async () => {
    await disconnect.dispatchAsync();
  };

  const actionError = connect.error ?? disconnect.error;

  return (
    <SolanaContext.Provider
      value={{
        isInitialized,
        isReady: status === 'connected' && !!selectedAccount,
        isConnecting: status === 'connecting' || status === 'reconnecting',
        error: actionError instanceof Error ? actionError.message : null,
        wallets,
        accounts,
        selectedAccount,
        selectedAccountIndex,
        signer: connected?.signer ?? null,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <ClientProvider client={solanaClient}>
      <SolanaWalletState>{children}</SolanaWalletState>
    </ClientProvider>
  );
}

export function useSolana(): SolanaContextValue {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolana must be used within a SolanaProvider');
  }
  return context;
}
