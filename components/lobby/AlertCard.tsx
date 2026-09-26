import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface AlertCardProps {
  variant: 'warning' | 'success';
  title: string;
  description: string;
  actionButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
}

export function AlertCard({
  variant,
  title,
  description,
  actionButton,
}: AlertCardProps) {
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const colorClasses = isWarning
    ? {
        bg: 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
        border: 'border-orange-200 dark:border-orange-800',
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-600 dark:text-orange-400',
        titleColor: 'text-orange-700 dark:text-orange-300',
        descColor: 'text-orange-600 dark:text-orange-400',
        buttonBorder: 'border-orange-200 dark:border-orange-800',
      }
    : {
        bg: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
        border: 'border-green-200 dark:border-green-800',
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-600 dark:text-green-400',
        titleColor: 'text-green-700 dark:text-green-300',
        descColor: 'text-green-600 dark:text-green-400',
        buttonBorder: 'border-green-200 dark:border-green-800',
      };

  const Icon = isWarning ? AlertCircle : CheckCircle;

  return (
    <div
      className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full ${colorClasses.iconBg} flex items-center justify-center`}
          >
            <Icon className={`h-4 w-4 ${colorClasses.iconColor}`} />
          </div>
          <div>
            <span className={`text-sm font-medium ${colorClasses.titleColor}`}>
              {title}
            </span>
            <p className={`text-xs ${colorClasses.descColor}`}>{description}</p>
          </div>
        </div>
        {actionButton && (
          <Button
            variant="outline"
            size="sm"
            asChild={!!actionButton.href}
            onClick={actionButton.onClick}
            className={colorClasses.buttonBorder}
          >
            {actionButton.href ? (
              <a
                href={actionButton.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                {actionButton.text} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              actionButton.text
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
