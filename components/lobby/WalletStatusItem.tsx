import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WalletStatusItemProps {
  title: string;
  description: string;
  isConnected: boolean;
  statusText: { connected: string; required: string };
  actionButton?: React.ReactNode;
  extraContent?: React.ReactNode;
}

export function WalletStatusItem({
  title,
  description,
  isConnected,
  statusText,
  actionButton,
  extraContent,
}: WalletStatusItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-card to-muted/30 rounded-lg border">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected
              ? 'bg-green-500 shadow-lg shadow-green-500/30'
              : 'bg-red-500 shadow-lg shadow-red-500/30'
          }`}
        />
        <div>
          <span className="text-sm font-medium">{title}</span>
          <p className="text-xs text-muted-foreground">{description}</p>
          {extraContent}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={isConnected ? 'default' : 'secondary'}
          className="text-xs"
        >
          {isConnected ? statusText.connected : statusText.required}
        </Badge>
        {actionButton}
      </div>
    </div>
  );
}
