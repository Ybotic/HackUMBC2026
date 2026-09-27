import type { CSSProperties } from 'react';

export type BattleIconName =
  | 'spark'
  | 'flame'
  | 'shield'
  | 'sound'
  | 'muted'
  | 'settings'
  | 'refresh'
  | 'switch'
  | 'play'
  | 'plus'
  | 'chevron'
  | 'clock'
  | 'chat'
  | 'help';

const iconPaths: Record<BattleIconName, string> = {
  spark:
    'M12 2.5 14.7 9.3 21.5 12l-6.8 2.7L12 21.5l-2.7-6.8L2.5 12l6.8-2.7L12 2.5Z',
  flame:
    'M12.2 22c4 0 7-2.8 7-6.7 0-2.5-1.4-4.7-4.1-7.3.1 2-1 3.3-2.1 3.8.3-3.6-1.1-6.8-4.4-9.3.6 4.1-1 6.4-2.5 8.5-1.3 1.8-2.2 3.4-2.2 5.1 0 3.4 3 5.9 8.3 5.9Z',
  shield:
    'M12 3 20 6v5.2c0 5.1-3.3 8.5-8 10.8-4.7-2.3-8-5.7-8-10.8V6l8-3Zm-3.2 9 2.1 2.1 4.5-4.7',
  sound:
    'M4 10v4h3l5 4V6l-5 4H4Zm12-.8a4 4 0 0 1 0 5.6m2.5-8a7.5 7.5 0 0 1 0 10.4',
  muted: 'M4 10v4h3l5 4V6l-5 4H4Zm12 1 5 5m0-5-5 5',
  settings:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m9-8h-2m-14 0H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6',
  refresh:
    'M20 7v5h-5M4 17v-5h5m9.4-2A7 7 0 0 0 6.3 7L4 9m16 6-2.3 2A7 7 0 0 1 5.6 14',
  switch: 'M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4',
  play: 'm8 5 11 7-11 7V5Z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm8 10 4 4 4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  chat: 'M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.4-3.5A7.1 7.1 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.4-11a2.5 2.5 0 1 1 4.6 1.4c-.8 1.1-2.2 1.4-2.2 3.1m0 2.7h.01',
};

export function Icon({
  name,
  size = 18,
  className,
  style,
}: {
  name: BattleIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
