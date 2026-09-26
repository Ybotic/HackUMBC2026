import { gsap } from 'gsap';
import type {
  AnimationCommand,
  AnimationSequence,
  ScreenTransform,
} from '@/battle/types';

type PendingSequence = {
  sequence: AnimationSequence;
  resolve: () => void;
};

type RunningSequence = PendingSequence & {
  timeline: gsap.core.Timeline;
};

type CommandHandler = (command: AnimationCommand) => void;

function toGsapTransform(transform: Partial<ScreenTransform>) {
  const vars = {} as gsap.TweenVars & Record<string, string | number>;
  if (transform.x !== undefined) vars.left = `${transform.x}%`;
  if (transform.y !== undefined) vars.top = `${transform.y}%`;
  if (transform.scale !== undefined) vars['--piece-scale'] = transform.scale;
  if (transform.rotationZ !== undefined)
    vars['--piece-rotation'] = `${transform.rotationZ}deg`;
  if (transform.rotationX !== undefined) vars.rotationX = transform.rotationX;
  if (transform.rotationY !== undefined) vars.rotationY = transform.rotationY;
  return vars;
}

/** Runs one serializable sequence at a time for a single card, like Unity's CardPositioner. */
export class AnimationQueue {
  private pending: PendingSequence[] = [];
  private running: RunningSequence | null = null;
  private reducedMotion: boolean;
  private disposed = false;

  constructor(
    private readonly node: HTMLElement,
    private readonly onCommand: CommandHandler,
    reducedMotion = false,
  ) {
    this.reducedMotion = reducedMotion;
  }

  enqueue(sequence: AnimationSequence): Promise<void> {
    if (this.disposed) return Promise.resolve();

    return new Promise((resolve) => {
      this.pending.push({ sequence, resolve });
      this.runNext();
    });
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  cancelCurrent() {
    if (!this.running) return;

    const current = this.running;
    this.running = null;
    current.timeline.kill();
    current.resolve();
    this.runNext();
  }

  cancelAll() {
    if (this.running) {
      const current = this.running;
      this.running = null;
      current.timeline.kill();
      current.resolve();
    }

    for (const pending of this.pending.splice(0)) pending.resolve();
  }

  finishImmediately() {
    let guard = 0;
    while ((this.running || this.pending.length > 0) && guard < 1000) {
      guard += 1;
      if (!this.running) {
        this.runNext();
        continue;
      }

      const current = this.running;
      current.timeline.progress(1);
      if (this.running === current) {
        this.running = null;
        current.timeline.kill();
        current.resolve();
      }
    }
  }

  isRunning() {
    return this.running !== null || this.pending.length > 0;
  }

  dispose() {
    this.disposed = true;
    this.cancelAll();
  }

  private runNext() {
    if (this.disposed || this.running || this.pending.length === 0) return;

    const pending = this.pending.shift();
    if (!pending) return;

    const timeline = gsap.timeline({
      onComplete: () => {
        if (this.running?.sequence !== pending.sequence) return;
        this.running = null;
        pending.resolve();
        this.runNext();
      },
    });

    this.running = { ...pending, timeline };

    for (const command of pending.sequence.commands) {
      this.appendCommand(timeline, command);
    }
  }

  private appendCommand(
    timeline: gsap.core.Timeline,
    command: AnimationCommand,
  ) {
    const duration = this.reducedMotion
      ? 0.01
      : command.kind === 'delay'
        ? command.duration
        : 'duration' in command
          ? command.duration
          : 0;

    switch (command.kind) {
      case 'tween': {
        const vars: gsap.TweenVars = {
          ...toGsapTransform(command.to),
          duration,
          ease: command.ease ?? 'power2.out',
        };
        if (command.from) {
          timeline.fromTo(this.node, toGsapTransform(command.from), vars, '>');
        } else {
          timeline.to(this.node, vars, '>');
        }
        break;
      }

      case 'path': {
        const points = command.points;
        if (points.length === 0) break;
        const segmentDuration = duration / points.length;
        for (const point of points) {
          timeline.to(
            this.node,
            {
              left: `${point.x}%`,
              top: `${point.y}%`,
              duration: segmentDuration,
              ease: command.ease ?? 'sine.inOut',
            },
            '>',
          );
        }
        break;
      }

      case 'delay':
        timeline.to({}, { duration, ease: 'none' }, '>');
        break;

      case 'view':
      case 'reparent':
      case 'effect':
      case 'sound':
      case 'event':
        timeline.call(() => this.onCommand(command), [], '>');
        break;
    }
  }
}
