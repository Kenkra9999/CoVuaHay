"use client";

import { memo, useEffect, useRef } from "react";
import type { Atmosphere } from "@/lib/chess-appearance";

type Particle = { x: number; y: number; size: number; speed: number; phase: number; drift: number; ember: boolean };
const colors: Record<Atmosphere, string> = { sakura: "#e5516b", snow: "#d8f4ff", embers: "#ffa557", gold: "#e9cc87", fireflies: "#c6f391", stars: "#d6c4ff", aurora: "#8dded8", rain: "#a5c7e5" };

export const ChessAtmosphere = memo(function ChessAtmosphere({ effect, enabled }: { effect: Atmosphere; enabled: boolean }) {
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
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 600 ? 38 : 76;
      points = Array.from({ length: count }, (_, index) => ({ x: Math.random() * width, y: Math.random() * height,
        size: effect === "sakura" ? 3 + Math.random() * 4 : .8 + Math.random() * 2.1,
        speed: 12 + Math.random() * 30, phase: Math.random() * Math.PI * 2, drift: 8 + Math.random() * 18,
        ember: effect === "sakura" && index % 3 === 0 }));
    };
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - last < 1000 / 30) return;
      const dt = Math.min((time - (last || time)) / 1000, .05);
      last = time; elapsed += dt;
      ctx.clearRect(0, 0, width, height);
      if (effect === "aurora") {
        for (let i = 0; i < 3; i++) {
          const x = width * (.25 + i * .25) + Math.sin(elapsed * .12 + i) * 60;
          const glow = ctx.createRadialGradient(x, height * .22, 0, x, height * .22, width * .48);
          glow.addColorStop(0, i === 1 ? "#a78be51d" : "#56cfb51b"); glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        }
      }
      for (const point of points) {
        const rising = point.ember || ["embers", "gold", "fireflies"].includes(effect);
        point.y += (rising ? -1 : 1) * point.speed * dt * (effect === "rain" ? 4 : 1);
        point.x += Math.sin(elapsed * .45 + point.phase) * point.drift * dt + (effect === "rain" ? -28 * dt : effect === "stars" ? 22 * dt : 2 * dt);
        if (point.y > height + 16) point.y = -16;
        if (point.y < -16) point.y = height + 16;
        if (point.x > width + 16) point.x = -16;
        if (point.x < -16) point.x = width + 16;
        ctx.save(); ctx.translate(point.x, point.y);
        ctx.globalAlpha = .35 + .3 * Math.sin(elapsed * .7 + point.phase) ** 2;
        ctx.fillStyle = point.ember ? "#ffa85e" : colors[effect];
        if (effect === "sakura" && !point.ember) {
          ctx.rotate(point.phase + elapsed * .35);
          ctx.scale(.6 + .4 * Math.abs(Math.sin(elapsed * .6 + point.phase)), 1);
          ctx.beginPath(); ctx.moveTo(0, -point.size);
          ctx.bezierCurveTo(point.size * 1.5, -point.size * .2, point.size, point.size, 0, point.size * 1.25);
          ctx.bezierCurveTo(-point.size, point.size * .4, -point.size, -point.size * .8, 0, -point.size);
          ctx.fill();
        } else if (effect === "rain" || effect === "stars") {
          ctx.strokeStyle = colors[effect]; ctx.lineWidth = effect === "rain" ? .7 : 1;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(effect === "rain" ? 3 : -point.size * 5, -point.size * (effect === "rain" ? 7 : 5)); ctx.stroke();
        } else {
          const size = point.ember ? 1.1 : point.size;
          if (effect === "embers" || effect === "fireflies" || point.ember) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
          ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
          if (effect === "snow" && point.size > 2.5) {
            ctx.strokeStyle = colors.snow; ctx.lineWidth = .7;
            for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-point.size * 2, 0); ctx.lineTo(point.size * 2, 0); ctx.stroke(); }
          }
        }
        ctx.restore();
      }
    };
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      ctx.clearRect(0, 0, width, height);
      if (enabled && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(draw);
    };
    resize(); sync();
    const onResize = () => { resize(); sync(); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", sync); reducedMotion.removeEventListener("change", sync); };
  }, [effect, enabled]);
  return <canvas ref={ref} className="battlefield-canvas" data-effect={effect} data-enabled={enabled} aria-hidden="true" />;
});
