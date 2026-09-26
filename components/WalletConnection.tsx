'use client';

import {
  ChevronDown,
  Wallet,
  WifiOff,
  Wifi,
  User,
  Check,
  Coins,
} from 'lucide-react';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePictureManager } from '@/components/ProfilePictureManager';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect } from 'react';

// global ref to prevent duplicate error toasts from multiple instances
let lastErrorShown = '';

export function WalletConnection() {
  const {
    isReady,
    isConnecting,
    accounts,
    selectedAccount,
    selectedAccountIndex,
    connectWallet,
    disconnectWallet,
    wallets,
    error,
  } = useSolana();

  const { isInitialized } = useSolanaNFT();

  // Fetch user data
  const userData = useQuery(
    api.users.getUser,
    selectedAccount?.address ? { address: selectedAccount.address } : 'skip',
  );

  // Create user if not exists
  const createOrGetUser = useMutation(api.users.createOrGetUser);

  useEffect(() => {
    if (error && error !== lastErrorShown) {
      lastErrorShown = error;
      toast.error(error);

      setTimeout(() => {
        if (lastErrorShown === error) {
          lastErrorShown = '';
        }
      }, 1000);
    }
  }, [error]);

  // Create user when wallet connects
  useEffect(() => {
    if (selectedAccount?.address && userData === null) {
      createOrGetUser({ address: selectedAccount.address }).catch((err) => {
        console.error('Failed to create user:', err);
      });
    }
  }, [selectedAccount?.address, userData, createOrGetUser]);

  if (!isReady) {
    return (
      <div className="flex">
        <Button
          onClick={() => {
            if (wallets.length === 1) {
              connectWallet(wallets[0]).catch(() => undefined);
            }
          }}
          disabled={isConnecting || wallets.length !== 1}
          variant="outline"
          size="sm"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isConnecting
            ? 'Connecting...'
            : wallets.length === 0
              ? 'Install Solana Wallet'
              : wallets.length === 1
                ? `Connect ${wallets[0].name}`
                : 'Select Wallet'}
        </Button>
        {wallets.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {wallets.map((wallet) => (
                <DropdownMenuItem
                  key={wallet.name}
                  onClick={() => connectWallet(wallet).catch(() => undefined)}
                >
                  Connect {wallet.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <div className="relative">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={userData?.profilePicture}
                  alt={selectedAccount?.meta.name || 'User avatar'}
                />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              {userData?.credits && userData.credits > 0 && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[12px] h-3 px-1">
                  {userData.credits >= 1000
                    ? `${Math.floor(userData.credits / 1000)}k`
                    : userData.credits >= 100
                      ? '99+'
                      : userData.credits}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-sm">
              {selectedAccount?.meta.name ||
                selectedAccount?.address.slice(0, 6)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="pb-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Wallet Connected</span>
              <div className="flex items-center gap-1">
                {isInitialized ? (
                  <>
                    <Wifi className="h-3 w-3 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      Solana
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-destructive" />
                    <span className="text-xs text-destructive font-medium">
                      Disconnected
                    </span>
                  </>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-md mx-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Shards
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                  {userData?.credits || 0}
                </span>
                <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Earn shards by winning battles!
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-md">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 pt-0.5 pr-1.5 -ml-1.5">
                <ProfilePictureManager
                  userAddress={selectedAccount?.address || ''}
                  currentProfilePicture={userData?.profilePicture}
                  userName={selectedAccount?.meta.name}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                    Current Account
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedAccountIndex + 1} of {accounts.length}
                  </Badge>
                </div>
                <div className="font-semibold text-sm mb-2 text-foreground">
                  {selectedAccount?.meta.name ||
                    `Account ${selectedAccountIndex + 1}`}
                </div>
                <div className="text-xs text-muted-foreground font-mono break-all leading-relaxed">
                  {selectedAccount?.address}
                </div>
              </div>
            </div>
          </div>

          {accounts.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Switch Account ({accounts.length} available)
              </DropdownMenuLabel>

              <div className="max-h-48 overflow-y-auto">
                {accounts.map((account, index) => (
                  <DropdownMenuItem
                    key={account.address}
                    disabled={index === selectedAccountIndex}
                    className="px-3 py-3 cursor-pointer hover:bg-accent focus:bg-accent"
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm truncate">
                            {account.meta.name || `Account ${index + 1}`}
                          </div>
                          {index === selectedAccountIndex && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {account.address}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => disconnectWallet().catch(() => undefined)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
          >
            <WifiOff className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
