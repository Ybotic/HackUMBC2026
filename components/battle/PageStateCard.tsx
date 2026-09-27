'use client';

import { useRouter } from 'next/navigation';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageStateCardProps {
  // Content
  title?: string;
  message: string;

  // Visual state
  variant?: 'loading' | 'error' | 'info' | 'warning' | 'walletConnect';
  icon?: ReactNode;

  // Action
  buttonText?: string;
  buttonAction?: () => void;
  redirectTo?: string;

  // Styling
  maxWidth?: string;
  compact?: boolean;
}

export function PageStateCard({
  title,
  message,
  variant = 'info',
  icon,
  buttonText,
  buttonAction,
  redirectTo,
  maxWidth = 'max-w-md',
  compact = false,
}: PageStateCardProps) {
  const router = useRouter();
  const { connectWallet, isConnecting } = useSolana();

  const handleClick = () => {
    if (variant === 'walletConnect') {
      connectWallet().catch(() => undefined);
    } else if (buttonAction) {
      buttonAction();
    } else if (redirectTo) {
      router.push(redirectTo);
    }
  };

  const getDefaultProps = () => {
    switch (variant) {
      case 'loading':
        return {
          icon: <Loader2 className="h-8 w-8 animate-spin" />,
        };
      case 'walletConnect':
        return {
          title: title || 'Wallet Not Connected',
          icon: <Wallet className="h-8 w-8" />,
          buttonText: isConnecting ? 'Connecting...' : 'Connect Wallet',
        };
      default:
        return {};
    }
  };

  const defaultProps = getDefaultProps();
  const displayIcon = icon ?? defaultProps.icon;
  const displayTitle = title ?? defaultProps.title;
  const displayButtonText = buttonText ?? defaultProps.buttonText;

  return (
    <div
      className={`bg-background flex items-center justify-center ${compact ? 'min-h-[55vh]' : 'h-[calc(100vh-4rem)]'}`}
    >
      <Card className={`w-full ${maxWidth}`}>
        <CardContent className="pt-6">
          <div className="text-center">
            {displayIcon && (
              <div className="mb-4 flex justify-center">{displayIcon}</div>
            )}

            {displayTitle && (
              <h2 className="text-xl font-semibold mb-2">{displayTitle}</h2>
            )}

            <p className="text-muted-foreground mb-4">{message}</p>

            {displayButtonText && (
              <Button
                onClick={handleClick}
                className="w-full"
                disabled={variant === 'walletConnect' && isConnecting}
              >
                {displayButtonText}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
