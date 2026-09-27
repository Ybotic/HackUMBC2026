import manifest from '../../public/announcer/manifest.json' with {
  type: 'json',
};
import { createLinePicker, priority, type AnnouncerEvent } from './dialogue.ts';

export const hasAnnouncerClips = Object.keys(manifest).length > 0;

type Clip = { id: string; text: string; event: AnnouncerEvent };
type AudioClip = Pick<
  HTMLAudioElement,
  'play' | 'pause' | 'onended' | 'onerror' | 'src'
>;

export class AnnouncerPlayback {
  private pick = createLinePicker();
  private queue: Clip[] = [];
  private current?: Clip;
  private audio?: AudioClip;
  private generation = 0;
  private enabled = false;
  private muted = false;
  private interacted = false;
  private readonly caption: (line: string) => void;
  private readonly createAudio: (url: string) => AudioClip;
  private readonly clips: Record<string, string>;

  constructor(
    caption: (line: string) => void,
    createAudio: (url: string) => AudioClip = (url) => new Audio(url),
    clips: Record<string, string> = manifest,
  ) {
    this.caption = caption;
    this.createAudio = createAudio;
    this.clips = clips;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.stop();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.stop();
  }
  allowInteraction() {
    this.interacted = true;
  }

  announce(events: AnnouncerEvent[]) {
    if (!events.length) return;
    const incoming = events.map(this.pick);
    // Even muted or without clips, always expose the most important caption.
    const best = incoming.reduce((a, b) =>
      priority[b.event] > priority[a.event] ? b : a,
    );
    if (!this.enabled || this.muted || !this.interacted) {
      this.caption(best.text);
      return;
    }
    if (!this.clips[best.id]) {
      this.caption(best.text);
      this.stop();
      return;
    }
    if (priority[best.event] === 100) {
      this.stop();
      this.queue = [best];
      this.next();
      return;
    }
    // Ambient lines should not displace a confirmed combat event from this update.
    const candidates = incoming.filter(
      (clip) => priority[clip.event] >= 40 || priority[best.event] < 40,
    );
    // No long narration backlog: keep at most two current, high-priority lines.
    this.queue = [...this.queue, ...candidates]
      .sort((a, b) => priority[b.event] - priority[a.event])
      .slice(0, 2);
    if (
      this.current &&
      this.queue.length &&
      priority[this.queue[0].event] > priority[this.current.event]
    )
      this.interrupt();
    if (!this.current) this.next();
  }

  private interrupt() {
    this.generation++;
    this.audio?.pause();
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.src = '';
    }
    this.audio = undefined;
    this.current = undefined;
  }

  private next() {
    while (this.queue.length) {
      const clip = this.queue.shift();
      if (!clip) break;
      this.caption(clip.text);
      const url = this.clips[clip.id];
      if (!url) continue;
      try {
        const audio = this.createAudio(url);
        this.current = clip;
        this.audio = audio;
        const token = ++this.generation;
        const done = () => {
          if (token !== this.generation) return;
          this.interrupt();
          this.next();
        };
        audio.onended = done;
        audio.onerror = done;
        void Promise.resolve(audio.play()).catch(done);
        return;
      } catch {
        /* Playback failures never interrupt battle state or captions. */
      }
    }
  }

  private stop() {
    this.queue = [];
    this.interrupt();
  }
  dispose() {
    this.stop();
  }
}
