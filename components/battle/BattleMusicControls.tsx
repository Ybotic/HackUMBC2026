'use client';

import { useRef, useState } from 'react';

const musicTracks = [
  {
    id: 'pokemon',
    title: 'Pokémon FireRed',
    file: 'pokemon-fire-red-battle.mp3',
  },
  {
    id: 'clash-of-clans',
    title: 'Clash of Clans',
    file: 'clash-of-clans-battle.mp3',
  },
  {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    file: 'game-of-thrones-theme.mp3',
  },
] as const;

export function BattleMusicControls() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrackRef = useRef<string | null>(null);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [status, setStatus] = useState('Music is off.');

  function stopMusic() {
    currentTrackRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setActiveTrack(null);
    setStatus('Music is off.');
  }

  async function playTrack(track: (typeof musicTracks)[number]) {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeTrack === track.id && !audio.paused) {
      stopMusic();
      return;
    }

    currentTrackRef.current = track.id;
    setActiveTrack(track.id);
    setStatus(`Loading ${track.title}…`);
    audio.pause();
    audio.src = `/music/${track.file}`;
    audio.load();

    try {
      await audio.play();
      if (currentTrackRef.current === track.id)
        setStatus(`Playing ${track.title}.`);
    } catch {
      if (currentTrackRef.current !== track.id) return;
      currentTrackRef.current = null;
      setActiveTrack(null);
      setStatus(
        `Could not load ${track.title}. Add its licensed MP3 to public/music/${track.file}.`,
      );
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }

  return (
    <section className="live-music" aria-label="Background music">
      <h2>Battle music</h2>
      <div
        className="live-music-options"
        role="group"
        aria-label="Music options"
      >
        <button
          type="button"
          aria-pressed={activeTrack === null}
          onClick={stopMusic}
        >
          Off
        </button>
        {musicTracks.map((track) => (
          <button
            key={track.id}
            type="button"
            aria-pressed={activeTrack === track.id}
            onClick={() => void playTrack(track)}
          >
            {track.title}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
      <audio ref={audioRef} loop preload="none" />
    </section>
  );
}
