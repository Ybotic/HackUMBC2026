'use client';

import { useEffect, useState } from 'react';
import { isMuted, onMuteChange } from '../sfx';
import type { BattleSnapshot } from './tracker';
import { BattleAnnouncerTracker } from './tracker';
import { AnnouncerPlayback, hasAnnouncerClips } from './playback';

const STORAGE_KEY = 'battle-announcer';

export function useBattleAnnouncer(
  battleId: string,
  address: string | undefined,
  battle: BattleSnapshot | null | undefined,
) {
  const [enabled, setEnabled] = useState(false);
  const [caption, setCaption] = useState('');
  const [playback, setPlayback] = useState<AnnouncerPlayback | null>(null);
  const [tracker, setTracker] = useState<BattleAnnouncerTracker | null>(null);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === 'on');
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    const player = new AnnouncerPlayback(setCaption);
    const cursor = new BattleAnnouncerTracker(battleId, address);
    player.setMuted(isMuted());
    const unsubscribe = onMuteChange((muted) => player.setMuted(muted));
    const storage = (event: StorageEvent) => {
      if (event.key === 'sound' || event.key === null)
        player.setMuted(isMuted());
    };
    const unlock = () => player.allowInteraction();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('storage', storage);
    setPlayback(player);
    setTracker(cursor);
    setCaption('');
    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('storage', storage);
      player.dispose();
    };
  }, [battleId, address]);

  useEffect(() => {
    playback?.setEnabled(enabled);
  }, [playback, enabled]);
  useEffect(() => {
    if (battle && battle.battleId === battleId && tracker && playback) {
      playback.setMuted(isMuted());
      playback.announce(tracker.consume(battle));
    }
  }, [battle, battleId, tracker, playback]);

  function toggle() {
    const next = !enabled;
    playback?.allowInteraction(); // The toggle itself is a user gesture.
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  }
  return { enabled, caption, toggle, hasClips: hasAnnouncerClips };
}
