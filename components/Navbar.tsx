'use client';

import { usePathname } from 'next/navigation';
import { Link } from 'next-view-transitions';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Swords, Home, Sparkles, ShoppingCart } from 'lucide-react';
import { WalletConnection } from '@/components/WalletConnection';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Generate', href: '/generate', icon: Sparkles },
  { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { name: 'Battle', href: '/battle', icon: Swords },
];

export function Navbar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { selectedAccount } = useSolana();
  const [marketplacePending, setMarketplacePending] = useState(false);

  useEffect(() => {
    setMarketplacePending(false);
  }, [pathname]);

  const shouldShowNavbar =
    pathname === '/dashboard' ||
    pathname === '/generate' ||
    pathname === '/marketplace' ||
    (pathname.startsWith('/battle') &&
      !pathname.startsWith('/battle/lobby/') &&
      !pathname.startsWith('/battle/play/'));

  if (!shouldShowNavbar) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const renderNavLinks = (isMobile = false) => (
    <div className="flex items-center space-x-1">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={
            (item.href === '/marketplace' || item.href === '/generate') &&
            selectedAccount
              ? `${item.href}?wallet=${encodeURIComponent(selectedAccount.address)}`
              : item.href
          }
          prefetch={
            item.href === '/marketplace' || item.href === '/generate'
              ? true
              : undefined
          }
          onClick={(event) => {
            if (
              item.href === '/marketplace' &&
              pathname !== '/marketplace' &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              setMarketplacePending(true);
            }
          }}
          className={cn(
            'relative isolate flex items-center transition-colors rounded-md',
            isMobile
              ? 'justify-center p-2'
              : 'space-x-2 px-3 py-2 text-sm font-medium',
            isActive(item.href)
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
          title={isMobile ? item.name : undefined}
        >
          {isActive(item.href) && (
            <motion.span
              layoutId={isMobile ? 'mobile-nav-active' : 'desktop-nav-active'}
              className="absolute inset-0 -z-10 rounded-md bg-primary"
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 420, damping: 36 }
              }
            />
          )}
          <item.icon
            className={isMobile ? 'relative h-5 w-5' : 'relative h-4 w-4'}
          />
          {!isMobile && <span className="relative">{item.name}</span>}
          {item.href === '/marketplace' && marketplacePending && (
            <span
              role="status"
              className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none"
            >
              <span className="sr-only">Loading marketplace</span>
            </span>
          )}
        </Link>
      ))}
    </div>
  );

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl bg-gradient-to-r text-white bg-clip-text">
                Mint
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {renderNavLinks()}
            <WalletConnection />
          </div>

          <div className="md:hidden flex items-center space-x-2">
            {renderNavLinks(true)}
            <WalletConnection />
          </div>
        </div>
      </div>
    </nav>
  );
}
