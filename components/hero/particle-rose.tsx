'use client';

import { type RefObject, useEffect, useRef } from "react";
import { ASCII_ROSE } from "@/lib/ascii-rose";
import { sfx } from "@/lib/sfx";

export type RoseMode =
  | "rest"
  | "cube"
  | "caret"
  | "shiver"
  | "churn"
  | "art"
  | "hi"
  | "paper";

type Rgb = [number, number, number];

interface Particle {
  activateAt: number;
  art?: Rgb;
  caretX: number;
  caretY: number;
  ch: string;
  color: string;
  cubeX: number;
  cubeY: number;
  cubeZ: number;
  docX: number;
  docY: number;
  gridX: number;
  gridY: number;
  hiX: number;
  hiY: number;
  homeX: number;
  homeY: number;
  ramp: number;
  rgb: Rgb;
  seed: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

const SPRING = 0.028;
const DAMPING = 0.86;
const REPEL_FORCE = 3.4;
const TAU = Math.PI * 2;
const ACTIVATE_FADE_MS = 350;

const BLEED = 1.24;

const BLUSH_RADIUS_RATIO = 0.26;
const BLUSH_STRENGTH = 0.8;

const CHURN_RATE = 2.2;

const RAMP_GLYPHS = ["@#S", "%?", "*+", ";:"];
// Canvas text doesn't trigger @font-face loads; request our glyphs explicitly.
const CANVAS_GLYPHS = `hi${RAMP_GLYPHS.join("")}`;

const PALETTE_VARS: [string, Rgb][] = [
  ["--rose-0", [124, 16, 48]],
  ["--rose-1", [163, 18, 60]],
  ["--rose-2", [206, 41, 85]],
  ["--rose-3", [227, 92, 124]],
  ["--rose-4", [240, 160, 178]],
  ["--rose-glow", [239, 127, 154]],
];
const GLOW = PALETTE_VARS.length - 1;
const UI_ACCENT_RGB: Rgb = [0, 137, 238];
const UI_TINT = 0.24;

const tintArt = ([r, g, b]: Rgb): Rgb => [
  Math.round(r * (1 - UI_TINT) + UI_ACCENT_RGB[0] * UI_TINT),
  Math.round(g * (1 - UI_TINT) + UI_ACCENT_RGB[1] * UI_TINT),
  Math.round(b * (1 - UI_TINT) + UI_ACCENT_RGB[2] * UI_TINT),
];

const rampFor = (ch: string) => {
  const index = RAMP_GLYPHS.findIndex((glyphs) => glyphs.includes(ch));
  return index === -1 ? GLOW - 1 : index;
};
const toCss = ([r, g, b]: Rgb) => `rgb(${r},${g},${b})`;

function readPalette(host: HTMLElement): Rgb[] {
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
  host.appendChild(probe);
  const palette = PALETTE_VARS.map(([variable, fallback]): Rgb => {
    probe.style.color = `var(${variable})`;
    const channels = getComputedStyle(probe)
      .color.match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    return channels?.length === 3 ? (channels as Rgb) : fallback;
  });
  probe.remove();
  return palette;
}

function buildParticles(
  size: number,
  scattered: boolean,
  fontFamily: string
): Particle[] {
  const lines = ASCII_ROSE.split("\n");
  const rows = lines.length;
  const cols = Math.max(...lines.map((line) => line.length));
  const inner = size / BLEED;
  const pad = (size - inner) / 2;
  const cellW = inner / cols;
  const cellH = inner / rows;
  const center = size / 2;
  const maxRadius = inner / 2;
  const particles: Particle[] = [];

  for (let row = 0; row < rows; row += 1) {
    const line = lines[row];
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      if (ch === " ") {
        continue;
      }
      const homeX = pad + col * cellW + cellW / 2;
      const homeY = pad + row * cellH + cellH / 2;
      const radius = Math.hypot(homeX - center, homeY - center);
      const angle =
        Math.atan2(homeY - center, homeX - center) +
        (Math.random() - 0.5) * 1.7;
      particles.push({
        ch,
        color: "",
        seed: Math.random(),
        ramp: rampFor(ch),
        rgb: [0, 0, 0],
        homeX,
        homeY,
        gridX: homeX,
        gridY: homeY,
        docX: homeX,
        docY: homeY,
        caretX: homeX,
        caretY: homeY,
        cubeX: 0,
        cubeY: 0,
        cubeZ: 0,
        hiX: homeX,
        hiY: homeY,
        x: scattered ? center + Math.cos(angle) * radius * 0.18 : homeX,
        y: scattered ? center + Math.sin(angle) * radius * 0.18 : homeY,
        vx: 0,
        vy: 0,
        activateAt: scattered
          ? (radius / maxRadius) * 620 + Math.random() * 220
          : 0,
      });
    }
  }

  const g = Math.ceil(Math.sqrt(particles.length));
  const gridCell = (inner * 0.95) / g;
  const gridOffset = (size - inner * 0.95) / 2;
  particles.forEach((p, index) => {
    p.gridX = gridOffset + ((index % g) + 0.5) * gridCell;
    p.gridY = gridOffset + (Math.floor(index / g) + 0.5) * gridCell;
  });

  const c = size / 2;
  const pageW = inner * 0.58;
  const pageH = inner * 0.8;
  const x0 = c - pageW / 2;
  const y0 = c - pageH / 2;
  const outlineCount = Math.floor(particles.length * 0.55);
  const rules = [0.2, 0.36, 0.52, 0.68, 0.84];
  const perLine = Math.ceil((particles.length - outlineCount) / rules.length);

  particles.forEach((p, index) => {
    if (index < outlineCount) {
      const t = index / outlineCount;
      const perimeter = 2 * (pageW + pageH);
      const d = t * perimeter;
      if (d < pageW) {
        p.docX = x0 + d;
        p.docY = y0;
      } else if (d < pageW + pageH) {
        p.docX = x0 + pageW;
        p.docY = y0 + (d - pageW);
      } else if (d < pageW * 2 + pageH) {
        p.docX = x0 + pageW - (d - pageW - pageH);
        p.docY = y0 + pageH;
      } else {
        p.docX = x0;
        p.docY = y0 + pageH - (d - pageW * 2 - pageH);
      }
    } else {
      const i = index - outlineCount;
      const line = Math.min(Math.floor(i / perLine), rules.length - 1);
      const pos = (i % perLine) / perLine;
      const width = pageW * (line === rules.length - 1 ? 0.5 : 0.8);
      p.docX = x0 + pageW * 0.1 + pos * width;
      p.docY = y0 + pageH * rules[line];
    }
  });

  const stemH = inner * 0.56;
  const stemW = inner * 0.055;
  const barW = inner * 0.17;
  const barH = inner * 0.05;
  const stemCount = Math.floor(particles.length * 0.7);
  const barCount = Math.ceil((particles.length - stemCount) / 2);

  const fillRect = (
    p: Particle,
    i: number,
    count: number,
    w: number,
    h: number,
    cy: number
  ) => {
    const cols = Math.max(3, Math.round(Math.sqrt((count * w) / h)));
    const rows = Math.ceil(count / cols);
    p.caretX = c - w / 2 + ((i % cols) + 0.5) * (w / cols);
    p.caretY = cy - h / 2 + (Math.floor(i / cols) + 0.5) * (h / rows);
  };

  particles.forEach((p, index) => {
    if (index < stemCount) {
      fillRect(p, index, stemCount, stemW, stemH, c);
    } else if (index < stemCount + barCount) {
      fillRect(p, index - stemCount, barCount, barW, barH, c - stemH / 2);
    } else {
      fillRect(
        p,
        index - stemCount - barCount,
        barCount,
        barW,
        barH,
        c + stemH / 2
      );
    }
  });

  const corners: [number, number, number][] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corners.push([x, y, z]);
      }
    }
  }
  const edges: [number, number][] = [];
  corners.forEach((a, i) => {
    corners.forEach((b, j) => {
      if (
        i < j &&
        Math.abs(a[0] - b[0]) +
          Math.abs(a[1] - b[1]) +
          Math.abs(a[2] - b[2]) ===
          2
      ) {
        edges.push([i, j]);
      }
    });
  });
  particles.forEach((p, index) => {
    const edge = index % edges.length;
    const [ai, bi] = edges[edge];
    const count =
      Math.floor(particles.length / edges.length) +
      (edge < particles.length % edges.length ? 1 : 0);
    const s = (Math.floor(index / edges.length) + 0.5) / count;
    p.cubeX = corners[ai][0] + (corners[bi][0] - corners[ai][0]) * s;
    p.cubeY = corners[ai][1] + (corners[bi][1] - corners[ai][1]) * s;
    p.cubeZ = corners[ai][2] + (corners[bi][2] - corners[ai][2]) * s;
  });

  const sampler = document.createElement("canvas");
  sampler.width = 240;
  sampler.height = 160;
  const sctx = sampler.getContext("2d");
  if (sctx) {
    sctx.font = `600 130px ${fontFamily}`;
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText("hi", 120, 80);
    const { data } = sctx.getImageData(0, 0, 240, 160);
    const points: [number, number][] = [];
    for (let y = 0; y < 160; y += 2) {
      for (let x = 0; x < 240; x += 2) {
        if (data[(y * 240 + x) * 4 + 3] > 128) {
          points.push([x, y]);
        }
      }
    }
    if (points.length > 0) {
      const k = (inner * 0.72) / 240;
      particles.forEach((p, index) => {
        const [sx, sy] =
          points[Math.floor((index / particles.length) * points.length)];
        p.hiX = c + (sx - 120 + Math.random() * 2 - 1) * k;
        p.hiY = c + (sy - 80 + Math.random() * 2 - 1) * k;
      });
    }
  }

  return particles;
}

export default function ParticleRose({
  artFadeRef,
  artUrl = null,
  className = "",
  intro = true,
  mode = "rest",
}: {
  artFadeRef: RefObject<number>;
  artUrl?: string | null;
  className?: string;
  intro?: boolean;
  mode?: RoseMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<RoseMode>(mode);
  modeRef.current = mode;
  const wakeRef = useRef<() => void>(() => undefined);
  const loadArtRef = useRef<(url: string | null) => void>(() => undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the canvas loop intentionally reads mutable refs without restarting
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && container && context)) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const fontFamily =
      getComputedStyle(document.body)
        .getPropertyValue("--font-geist-mono")
        .trim() || "monospace";
    const canvasFont = `600 32px ${fontFamily}`;

    let particles: Particle[] = [];
    let size = 0;
    let raf = 0;
    let startedAt = 0;
    let initialized = false;
    let hasArt = false;
    let artImage: HTMLImageElement | null = null;
    let baseFont = "";
    let artFont = "";
    let activationEnd = 0;
    let idleWakeTimer: ReturnType<typeof setTimeout> | undefined;
    let palette = readPalette(container);
    const pointer = { active: false, x: -9999, y: -9999 };
    let inViewport = true;

    const tint = () => {
      for (const p of particles) {
        p.rgb = palette[p.ramp];
        p.color = toCss(p.rgb);
      }
    };

    const applyArt = () => {
      hasArt = false;
      if (!artImage || particles.length === 0) {
        return;
      }
      const g = Math.ceil(Math.sqrt(particles.length));
      try {
        const sampler = document.createElement("canvas");
        sampler.width = g;
        sampler.height = g;
        const samplerContext = sampler.getContext("2d");
        if (!samplerContext) {
          return;
        }

        const source = document.createElement("canvas");
        const sourceScale = Math.min(1, 320 / artImage.naturalWidth);
        source.width = Math.max(1, Math.round(artImage.naturalWidth * sourceScale));
        source.height = Math.max(1, Math.round(artImage.naturalHeight * sourceScale));
        const sourceContext = source.getContext("2d");
        if (!sourceContext) {
          return;
        }
        sourceContext.drawImage(artImage, 0, 0, source.width, source.height);
        const sourceData = sourceContext.getImageData(
          0,
          0,
          source.width,
          source.height
        ).data;
        let minX = source.width;
        let minY = source.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < source.height; y += 1) {
          for (let x = 0; x < source.width; x += 1) {
            const offset = (y * source.width + x) * 4;
            if (
              sourceData[offset + 3] > 16 &&
              Math.min(
                sourceData[offset],
                sourceData[offset + 1],
                sourceData[offset + 2]
              ) < 236
            ) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        if (maxX < minX || maxY < minY) {
          minX = 0;
          minY = 0;
          maxX = source.width - 1;
          maxY = source.height - 1;
        } else {
          const padding = Math.ceil(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.06);
          minX = Math.max(0, minX - padding);
          minY = Math.max(0, minY - padding);
          maxX = Math.min(source.width - 1, maxX + padding);
          maxY = Math.min(source.height - 1, maxY + padding);
        }
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        const scale = Math.min(g / cropWidth, g / cropHeight);
        const drawWidth = cropWidth * scale;
        const drawHeight = cropHeight * scale;
        samplerContext.drawImage(
          source,
          minX,
          minY,
          cropWidth,
          cropHeight,
          (g - drawWidth) / 2,
          (g - drawHeight) / 2,
          drawWidth,
          drawHeight
        );
        const { data } = samplerContext.getImageData(0, 0, g, g);

        const background = new Uint8Array(g * g);
        const queue = new Int32Array(g * g);
        let head = 0;
        let tail = 0;
        const markBackground = (index: number) => {
          if (background[index]) {
            return;
          }
          const offset = index * 4;
          const transparent = data[offset + 3] < 16;
          const nearWhite =
            data[offset] > 232 &&
            data[offset + 1] > 232 &&
            data[offset + 2] > 232;
          if (transparent || nearWhite) {
            background[index] = 1;
            queue[tail] = index;
            tail += 1;
          }
        };
        for (let edge = 0; edge < g; edge += 1) {
          markBackground(edge);
          markBackground((g - 1) * g + edge);
          markBackground(edge * g);
          markBackground(edge * g + g - 1);
        }
        while (head < tail) {
          const index = queue[head];
          head += 1;
          const x = index % g;
          const y = Math.floor(index / g);
          if (x > 0) markBackground(index - 1);
          if (x < g - 1) markBackground(index + 1);
          if (y > 0) markBackground(index - g);
          if (y < g - 1) markBackground(index + g);
        }
        particles.forEach((p, index) => {
          const o = index * 4;
          p.art = background[index]
            ? undefined
            : tintArt([data[o], data[o + 1], data[o + 2]]);
        });
        hasArt = true;
      } catch {
        for (const p of particles) {
          p.art = undefined;
        }
      }
    };

    loadArtRef.current = (url) => {
      artImage = null;
      hasArt = false;
      if (!url) {
        return;
      }
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        artImage = image;
        applyArt();
        if (reduceMotion) {
          drawStatic();
        } else {
          start();
        }
      };
      image.src = url;
    };

    const setup = (scattered: boolean) => {
      size = container.clientWidth * BLEED;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = buildParticles(
        size,
        scattered && !reduceMotion,
        fontFamily
      );
      activationEnd = particles.reduce(
        (end, particle) => Math.max(end, particle.activateAt),
        0
      );
      tint();
      const rows = ASCII_ROSE.split("\n").length;
      const inner = size / BLEED;
      const gridCell = (inner * 0.95) / Math.ceil(Math.sqrt(particles.length));
      baseFont = `600 ${(inner / rows) * 1.05}px ${fontFamily}`;
      artFont = `700 ${gridCell * 1.5}px ${fontFamily}`;
      context.font = baseFont;
      context.textAlign = "center";
      context.textBaseline = "middle";
      applyArt();
    };

    const drawStatic = () => {
      const artMode = modeRef.current === "art" && hasArt;
      context.font = artMode ? artFont : baseFont;
      context.globalAlpha = 1;
      context.clearRect(0, 0, size, size);
      if (modeRef.current === "art" && !hasArt) {
        return;
      }
      for (const p of particles) {
        if (artMode) {
          if (!p.art) {
            continue;
          }
          context.fillStyle = toCss(p.art);
          context.fillText("#", p.gridX, p.gridY);
          continue;
        }
        context.fillStyle = p.color;
        context.fillText(p.ch, p.homeX, p.homeY);
      }
    };

    let petal: {
      p: Particle;
      phase: "fall" | "return";
      startAt: number;
      x0: number;
      y0: number;
    } | null = null;
    let nextPetalAt = performance.now() + 9000 + Math.random() * 8000;

    const tick = (now: number) => {
      if (!startedAt) {
        startedAt = now;
      }
      const elapsed = now - startedAt;
      const t = now / 1000;
      const mode = modeRef.current;
      const center = size / 2;
      const repelRadius = size * 0.16;
      const blushRadius = size * BLUSH_RADIUS_RATIO;
      const [glowR, glowG, glowB] = palette[GLOW];
      const resting = mode === "rest";
      const artMode = mode === "art" && hasArt;
      const cubeAngle = t * 0.7;
      const cubeCos = Math.cos(cubeAngle);
      const cubeSin = Math.sin(cubeAngle);
      const cubeScale = (size / BLEED) * 0.26;
      // No album art to dress up in: just breathe slowly instead of pulsing to a beat.
      const artScale = 1 + 0.025 * Math.sin(t * TAU * 0.3);
      const blink =
        mode === "caret"
          ? 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((t * TAU) / 1.2))
          : 1;
      context.font = artMode ? artFont : baseFont;
      context.clearRect(0, 0, size, size);
      if (mode === "art" && !hasArt) {
        raf = 0;
        return;
      }

      if (resting && !petal && now > nextPetalAt) {
        const p = particles[Math.floor(Math.random() * particles.length)];
        petal = { p, phase: "fall", startAt: now, x0: p.x, y0: p.y };
      }
      if (petal && !resting) {
        petal = null;
        nextPetalAt = now + 9000 + Math.random() * 8000;
      }

      for (const p of particles) {
        if (elapsed < p.activateAt) {
          continue;
        }

        let alpha =
          Math.min(1, (elapsed - p.activateAt) / ACTIVATE_FADE_MS) * blink;
        let blush = 0;
        let { ch } = p;

        if (petal?.p === p) {
          if (petal.phase === "fall") {
            const u = (now - petal.startAt) / 2800;
            if (u >= 1) {
              petal.phase = "return";
              petal.startAt = now;
              p.x = p.homeX;
              p.y = p.homeY;
              p.vx = 0;
              p.vy = 0;
              alpha = 0;
            } else {
              p.x = petal.x0 + Math.sin(u * TAU * 1.2) * size * 0.02;
              p.y = petal.y0 + u * u * size * 0.3;
              alpha *= 1 - u;
            }
          } else {
            const u = (now - petal.startAt) / 900;
            if (u >= 1) {
              petal = null;
              nextPetalAt = now + 14_000 + Math.random() * 10_000;
            } else {
              alpha *= u;
            }
          }
        } else {
          const dx = p.homeX - center;
          const dy = p.homeY - center;
          let targetX = p.homeX;
          let targetY = p.homeY;
          switch (mode) {
            case "cube": {
              const x1 = p.cubeX * cubeCos + p.cubeZ * cubeSin;
              const z1 = -p.cubeX * cubeSin + p.cubeZ * cubeCos;
              const y1 = p.cubeY * 0.9135 - z1 * 0.4067;
              targetX = center + x1 * cubeScale;
              targetY = center + y1 * cubeScale;
              break;
            }
            case "caret":
              targetX = p.caretX;
              targetY = p.caretY;
              break;
            case "hi":
              targetX = p.hiX;
              targetY = p.hiY;
              break;
            case "art":
              if (hasArt) {
                targetX = p.gridX;
                targetY = p.gridY;
              } else {
                targetX = center + dx * artScale;
                targetY = center + dy * artScale;
              }
              break;
            case "churn": {
              const u = t * CHURN_RATE + p.seed * 9;
              const band = RAMP_GLYPHS[p.ramp] ?? p.ch;
              ch = band[Math.floor(u) % band.length];
              blush = u % 1 < 0.06 ? 0.5 : 0;
              break;
            }
            case "paper":
              targetX = p.docX;
              targetY = p.docY;
              break;
            case "shiver":
              targetX += (Math.random() - 0.5) * 4;
              targetY += (Math.random() - 0.5) * 4;
              break;
            default:
              break;
          }
          p.vx += (targetX - p.x) * SPRING;
          p.vy += (targetY - p.y) * SPRING;

          if (pointer.active) {
            const pointerDx = p.x - pointer.x;
            const pointerDy = p.y - pointer.y;
            const dist = Math.hypot(pointerDx, pointerDy);
            if (dist < repelRadius && dist > 0.01) {
              const force = (1 - dist / repelRadius) * REPEL_FORCE;
              p.vx += (pointerDx / dist) * force;
              p.vy += (pointerDy / dist) * force;
            }
            blush =
              dist < blushRadius
                ? (1 - dist / blushRadius) * BLUSH_STRENGTH
                : 0;
          }

          p.vx *= DAMPING;
          p.vy *= DAMPING;
          p.x += p.vx;
          p.y += p.vy;
        }

        context.globalAlpha = alpha;
        if (artMode) {
          if (!p.art) {
            continue;
          }
          const k = artFadeRef.current ** 1.5;
          const [r, g, b] = p.art;
          const [rr, rg, rb] = p.rgb;
          context.fillStyle = `rgb(${r + (rr - r) * k},${g + (rg - g) * k},${b + (rb - b) * k})`;
          context.fillText("#", p.x, p.y);
        } else if (blush > 0) {
          const [r, g, b] = p.rgb;
          context.fillStyle = `rgb(${r + (glowR - r) * blush},${g + (glowG - g) * blush},${b + (glowB - b) * blush})`;
          context.fillText(ch, p.x, p.y);
        } else {
          context.fillStyle = p.color;
          context.fillText(ch, p.x, p.y);
        }
      }
      context.globalAlpha = 1;
      const settled =
        resting &&
        !pointer.active &&
        !petal &&
        elapsed >= activationEnd + ACTIVATE_FADE_MS &&
        particles.every(
          (particle) =>
            Math.abs(particle.vx) < 0.015 &&
            Math.abs(particle.vy) < 0.015 &&
            Math.abs(particle.x - particle.homeX) < 0.5 &&
            Math.abs(particle.y - particle.homeY) < 0.5
        );
      if (settled) {
        drawStatic();
        raf = 0;
        scheduleIdleWake();
        return;
      }
      raf = inViewport && !document.hidden ? requestAnimationFrame(tick) : 0;
    };

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const start = () => {
      if (
        initialized &&
        !reduceMotion &&
        inViewport &&
        !document.hidden &&
        !raf
      ) {
        clearTimeout(idleWakeTimer);
        idleWakeTimer = undefined;
        raf = requestAnimationFrame(tick);
      }
    };
    const scheduleIdleWake = () => {
      if (idleWakeTimer || document.hidden) {
        return;
      }
      idleWakeTimer = setTimeout(
        () => {
          idleWakeTimer = undefined;
          nextPetalAt = performance.now();
          start();
        },
        Math.max(0, nextPetalAt - performance.now())
      );
    };

    const restart = (scattered: boolean) => {
      stop();
      setup(scattered);
      initialized = true;
      if (reduceMotion) {
        drawStatic();
      } else {
        startedAt = 0;
        start();
      }
    };

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerMove = (event: PointerEvent) => {
      const local = toLocal(event);
      pointer.x = local.x;
      pointer.y = local.y;
      pointer.active = true;
      start();
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const onPointerLift = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        onPointerLeave();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const local = toLocal(event);
      pointer.active = true;
      pointer.x = local.x;
      pointer.y = local.y;
      start();
      const burstRadius = size * 0.38;
      for (const p of particles) {
        const dx = p.x - local.x;
        const dy = p.y - local.y;
        const dist = Math.hypot(dx, dy);
        if (dist < burstRadius && dist > 0.01) {
          const force = (1 - dist / burstRadius) * 22;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }
      sfx("bloom");
    };

    let cancelled = false;
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };
    // Intro waits for the real font, else Safari draws it twice.
    Promise.all([
      document.fonts.load(canvasFont, CANVAS_GLYPHS).catch(() => undefined),
      document.fonts.ready,
    ]).then(() => {
      if (!cancelled) {
        restart(intro);
      }
    });
    wakeRef.current = start;

    const resizeObserver = new ResizeObserver(() => {
      // First draw belongs to the font promise above.
      if (initialized && container.clientWidth * BLEED !== size) {
        restart(false);
      }
    });
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? false;
        if (inViewport) {
          start();
        } else {
          stop();
        }
      },
      { rootMargin: "200px" }
    );
    intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", onPointerLift, { passive: true });
    canvas.addEventListener("pointercancel", onPointerLift, { passive: true });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const onThemeChange = () => {
      palette = readPalette(container);
      tint();
      if (reduceMotion) {
        drawStatic();
      } else {
        start();
      }
    };
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelled = true;
      stop();
      clearTimeout(idleWakeTimer);
      idleWakeTimer = undefined;
      wakeRef.current = () => undefined;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerLift);
      canvas.removeEventListener("pointercancel", onPointerLift);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mode changes wake a loop held outside React state
  useEffect(() => {
    wakeRef.current();
  }, [mode]);

  useEffect(() => {
    loadArtRef.current(artUrl);
  }, [artUrl]);

  const inset = `${(((BLEED - 1) / 2) * 100).toFixed(0)}%`;

  return (
    <div
      className={`relative aspect-square cursor-crosshair ${className}`}
      ref={containerRef}
    >
      <canvas
        aria-label="An interactive rose made of ascii characters, move your cursor through it"
        className="absolute block touch-none"
        ref={canvasRef}
        role="img"
        style={{
          top: `-${inset}`,
          left: `-${inset}`,
          width: `${BLEED * 100}%`,
          height: `${BLEED * 100}%`,
        }}
      />
    </div>
  );
}
