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
    let frame = 0, last = 0, width = 0, height = 0, elapsed = 0;
    let points: Particle[] = [];
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 600 ? 110 : Math.min(280, Math.max(220, Math.round(width * height / 6000)));
      points = Array.from({ length: count }, (_, index) => ({ x: Math.random() * width, y: Math.random() * height,
        size: effect === "sakura" ? (width < 600 ? 3.5 : 4.5) + Math.random() * 4.5 : 1.2 + Math.random() * 2.7,
        speed: 26 + Math.random() * 44, phase: Math.random() * Math.PI * 2, drift: 20 + Math.random() * 32,
        ember: effect === "sakura" && index % 5 === 0 }));
    };
    const draw = (time: number, animate = true) => {
      if (animate) frame = requestAnimationFrame(time => draw(time));
      if (animate && time - last < 1000 / 30) return;
      const dt = Math.min((time - (last || time)) / 1000, .05);
      last = time; elapsed += dt;
      ctx.clearRect(0, 0, width, height);
      if (effect === "aurora") {
        for (let i = 0; i < 4; i++) {
          const x = width * (.15 + i * .23) + Math.sin(elapsed * .2 + i) * 95;
          const glow = ctx.createRadialGradient(x, height * .22, 0, x, height * .22, width * .48);
          glow.addColorStop(0, i % 2 ? "#ab87ef48" : "#56e6bc40"); glow.addColorStop(.45, i % 2 ? "#ab87ef18" : "#56e6bc14"); glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        }
      }
      for (const point of points) {
        const rising = point.ember || ["embers", "gold", "fireflies"].includes(effect);
        point.y += (rising ? -1 : 1) * point.speed * dt * (effect === "rain" ? 4 : 1);
        point.x += Math.sin(elapsed * .7 + point.phase) * point.drift * dt + (effect === "rain" ? -45 * dt : effect === "stars" ? 46 * dt : 10 * dt);
        if (point.y > height + 16) point.y = -16;
        if (point.y < -16) point.y = height + 16;
        if (point.x > width + 16) point.x = -16;
        if (point.x < -16) point.x = width + 16;
        ctx.save(); ctx.translate(point.x, point.y);
        ctx.globalAlpha = .5 + .4 * Math.sin(elapsed * .9 + point.phase) ** 2;
        ctx.fillStyle = point.ember ? "#ffa85e" : colors[effect];
        if (effect === "sakura" && !point.ember) {
          ctx.rotate(point.phase + elapsed * .65);
          ctx.scale(.6 + .4 * Math.abs(Math.sin(elapsed * .6 + point.phase)), 1);
          ctx.shadowColor = colors.sakura; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(0, -point.size);
          ctx.bezierCurveTo(point.size * 1.5, -point.size * .2, point.size, point.size, 0, point.size * 1.25);
          ctx.bezierCurveTo(-point.size, point.size * .4, -point.size, -point.size * .8, 0, -point.size);
          ctx.fill();
        } else if (effect === "rain" || effect === "stars") {
          ctx.strokeStyle = colors[effect]; ctx.lineWidth = effect === "rain" ? 1.1 : 1.5;
          ctx.shadowColor = colors[effect]; ctx.shadowBlur = effect === "stars" ? 8 : 3;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(effect === "rain" ? 5 : -point.size * 7, -point.size * (effect === "rain" ? 10 : 7)); ctx.stroke();
        } else {
          const size = point.ember ? 1.8 : point.size;
          if (["embers", "fireflies", "gold", "aurora"].includes(effect) || point.ember) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; }
          ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
          if (effect === "snow" && point.size > 2.5) {
            ctx.strokeStyle = colors.snow; ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-point.size * 2, 0); ctx.lineTo(point.size * 2, 0); ctx.stroke(); }
          }
        }
        ctx.restore();
      }
    };
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      ctx.clearRect(0, 0, width, height);
      if (!document.hidden) {
        if (reducedMotion.matches) draw(0, false);
        else frame = requestAnimationFrame(time => draw(time));
      }
    };
    resize(); sync();
    const onResize = () => { resize(); sync(); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", sync); reducedMotion.removeEventListener("change", sync); };
  }, [effect]);
  return <canvas ref={ref} className="battlefield-canvas" data-effect={effect} aria-hidden="true" />;
});
