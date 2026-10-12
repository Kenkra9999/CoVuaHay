"use client";

import { memo, useEffect, useRef } from "react";
import type { Atmosphere } from "@/lib/chess-appearance";

type Particle = { x: number; y: number; size: number; speed: number; phase: number; drift: number; ember: boolean };
const colors: Record<Atmosphere, string> = { sakura: "#fa365c", snow: "#e6faff", embers: "#ffad57", gold: "#ffdc88", fireflies: "#d1ff91", stars: "#e8d7ff", aurora: "#a0ffdf", rain: "#c8e5ff" };

export const ChessAtmosphere = memo(function ChessAtmosphere({ effect }: { effect: Atmosphere }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const risingEffect = ["embers", "gold", "fireflies"].includes(effect);
    let frame = 0, last = 0, width = 0, height = 0, elapsed = 0;
    let sampled = 0, slowFrames = 0, previousFrame = 0;
    let points: Particle[] = [];
    // Bake paths and soft shadows once. Animation frames only blit cached sprites.
    const sprite = (ember: boolean) => {
      const tile = document.createElement("canvas"); tile.width = 160; tile.height = 160;
      const paint = tile.getContext("2d")!;
      paint.translate(80, 80);
      paint.fillStyle = paint.strokeStyle = ember ? "#ffa85e" : colors[effect];
      paint.shadowColor = paint.fillStyle;
      paint.shadowBlur = effect === "rain" ? 3 : effect === "sakura" && !ember ? 4 : 10;
      const size = 8;
      if (effect === "sakura" && !ember) {
        paint.beginPath(); paint.moveTo(0, -size);
        paint.bezierCurveTo(size * 1.5, -size * .2, size, size, 0, size * 1.25);
        paint.bezierCurveTo(-size, size * .4, -size, -size * .8, 0, -size); paint.fill();
      } else if (effect === "rain" || effect === "stars") {
        paint.lineWidth = effect === "rain" ? 2 : 3;
        paint.beginPath(); paint.moveTo(0, 0); paint.lineTo(effect === "rain" ? 10 : -56, effect === "rain" ? -72 : -56); paint.stroke();
      } else {
        paint.beginPath(); paint.arc(0, 0, size, 0, Math.PI * 2); paint.fill();
        if (effect === "snow") {
          paint.lineWidth = 2;
          for (let i = 0; i < 3; i++) { paint.rotate(Math.PI / 3); paint.beginPath(); paint.moveTo(-16, 0); paint.lineTo(16, 0); paint.stroke(); }
        }
      }
      return tile;
    };
    const particleSprite = sprite(false), emberSprite = effect === "sakura" ? sprite(true) : particleSprite;
    const auroraSprites = ["#56e6bc40", "#ab87ef48"].map(color => {
      const tile = document.createElement("canvas"); tile.width = tile.height = 256;
      const paint = tile.getContext("2d")!;
      const glow = paint.createRadialGradient(128, 128, 0, 128, 128, 128);
      glow.addColorStop(0, color); glow.addColorStop(1, "transparent");
      paint.fillStyle = glow; paint.fillRect(0, 0, 256, 256); return tile;
    });
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const balanced = document.documentElement.dataset.visualQuality === "balanced";
      const count = width < 600 ? 48 : balanced ? 72 : Math.min(120, Math.max(80, Math.round(width * height / 12000)));
      points = Array.from({ length: count }, (_, index) => ({ x: Math.random() * width, y: Math.random() * height,
        size: effect === "sakura" ? (width < 600 ? 3.5 : 4.5) + Math.random() * 4.5 : 1.2 + Math.random() * 2.7,
        speed: 26 + Math.random() * 44, phase: Math.random() * Math.PI * 2, drift: 20 + Math.random() * 32,
        ember: effect === "sakura" && index % 5 === 0 }));
    };
    const draw = (time: number, animate = true) => {
      if (animate) frame = requestAnimationFrame(time => draw(time));
      const balanced = document.documentElement.dataset.visualQuality === "balanced";
      if (animate && previousFrame) {
        sampled++; if (time - previousFrame > 34) slowFrames++;
        if (!balanced && sampled >= 120 && slowFrames > 24) {
          document.documentElement.dataset.visualQuality = "balanced";
          resize(); sampled = slowFrames = 0;
        }
      }
      previousFrame = time;
      if (animate && time - last < 1000 / (balanced ? 30 : 60) - 1) return;
      const dt = Math.min((time - (last || time)) / 1000, .05);
      last = time; elapsed += dt;
      ctx.clearRect(0, 0, width, height);
      if (effect === "aurora") {
        for (let i = 0; i < 4; i++) {
          const x = width * (.15 + i * .23) + Math.sin(elapsed * .2 + i) * 95;
          ctx.drawImage(auroraSprites[i % 2], x - width * .48, height * .22 - width * .48, width * .96, width * .96);
        }
      }
      for (const point of points) {
        const rising = point.ember || risingEffect;
        point.y += (rising ? -1 : 1) * point.speed * dt * (effect === "rain" ? 4 : 1);
        point.x += Math.sin(elapsed * .7 + point.phase) * point.drift * dt + (effect === "rain" ? -45 * dt : effect === "stars" ? 46 * dt : 10 * dt);
        if (point.y > height + 16) point.y = -16;
        if (point.y < -16) point.y = height + 16;
        if (point.x > width + 16) point.x = -16;
        if (point.x < -16) point.x = width + 16;
        ctx.save(); ctx.translate(point.x, point.y);
        ctx.globalAlpha = .5 + .4 * Math.sin(elapsed * .9 + point.phase) ** 2;
        if (effect === "sakura" && !point.ember) {
          ctx.rotate(point.phase + elapsed * .65);
          ctx.scale(.6 + .4 * Math.abs(Math.sin(elapsed * .6 + point.phase)), 1);
        }
        const size = point.ember ? 1.8 : point.size;
        ctx.drawImage(point.ember ? emberSprite : particleSprite, -size * 10, -size * 10, size * 20, size * 20);
        ctx.restore();
      }
    };
    const sync = () => {
      cancelAnimationFrame(frame); last = previousFrame = sampled = slowFrames = 0;
      if (!document.hidden && document.documentElement.dataset.visualPaused !== "true") {
        if (reducedMotion.matches) draw(0, false);
        else frame = requestAnimationFrame(time => draw(time));
      }
    };
    resize(); sync();
    const onResize = () => { resize(); sync(); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    window.addEventListener("nuocco:visual-state", sync);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); window.removeEventListener("resize", onResize); window.removeEventListener("nuocco:visual-state", sync); document.removeEventListener("visibilitychange", sync); reducedMotion.removeEventListener("change", sync); };
  }, [effect]);
  return <canvas ref={ref} className="battlefield-canvas" data-effect={effect} aria-hidden="true" />;
});
