"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";
import { pieceTravels, pieceTravelMs, squarePoint, type MotionPiece } from "@/lib/chess-motion";

const svgNS = "http://www.w3.org/2000/svg";
function shape(tag: string, attributes: Record<string, string | number>) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export const PieceMotion = memo(function PieceMotion({ pieces, orientation }: { pieces: MotionPiece[]; orientation: "w" | "b" }) {
  const ref = useRef<SVGSVGElement>(null);
  const previous = useRef<{ pieces: MotionPiece[]; orientation: "w" | "b" } | null>(null);
  const active = useRef(new Map<SVGElement, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const effects = active.current;
    const clear = () => { effects.forEach((timer, node) => { clearTimeout(timer); node.remove(); }); effects.clear(); };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => { if (reduced.matches) clear(); };
    const onHidden = () => { if (document.hidden) clear(); };
    reduced.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onHidden);
    return () => { clear(); reduced.removeEventListener("change", onMotion); document.removeEventListener("visibilitychange", onHidden); };
  }, []);

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = { pieces, orientation };
    const layer = ref.current;
    if (!layer) return;
    if (old?.orientation !== orientation) {
      active.current.forEach((timer, node) => { clearTimeout(timer); node.remove(); }); active.current.clear();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) return;
    for (const travel of pieceTravels(old.pieces, pieces)) {
      const from = squarePoint(travel.from, orientation), to = squarePoint(travel.to, orientation);
      const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
      const role = travel.piece.type === "k" ? "king" : travel.piece.type === "q" ? "queen" : "ordinary";
      const royal = role !== "ordinary", duration = pieceTravelMs(travel.piece.type);
      const group = shape("g", { class: "travel-effect travel-" + role + " piece-" + travel.piece.color, "data-travel-role": role });
      group.style.setProperty("--travel-time", duration + "ms");
      group.style.setProperty("--travel-length", String(length));
      group.style.setProperty("--travel-dx", dx + "px"); group.style.setProperty("--travel-dy", dy + "px");
      group.style.setProperty("--travel-angle", Math.atan2(dy, dx) * 180 / Math.PI + "deg");
      const d = `M${from.x} ${from.y}L${to.x} ${to.y}`;
      group.appendChild(shape("path", { d, class: "flight-haze" })); group.appendChild(shape("path", { d, class: "flight-thread" }));
      if (royal) {
        const nx = -dy / length * 7, ny = dx / length * 7;
        for (const sign of (role === "queen" ? [-1.5, -.55, .55, 1.5] : [-1, 1])) group.appendChild(shape("path", {
          d: `M${from.x + nx * sign} ${from.y + ny * sign}Q${(from.x + to.x) / 2 + nx * sign * 2} ${(from.y + to.y) / 2 + ny * sign * 2} ${to.x} ${to.y}`,
          class: "flight-ribbon", pathLength: length,
        }));
      }
      for (let i = 0; i < (role === "king" ? 12 : role === "queen" ? 14 : 3); i++) {
        const mote = shape("circle", { cx: from.x, cy: from.y, r: royal ? 1.8 + i % 3 * .7 : 1.6, class: "flight-mote" });
        mote.style.setProperty("--flight-delay", i * 17 + "ms");
        group.appendChild(mote);
      }
      const landing = shape("g", { class: "flight-landing", transform: `translate(${to.x} ${to.y})` });
      if (role === "queen") {
        landing.appendChild(shape("path", { d: "M-21 23C-32 4-22-11-13-28M21 23C32 4 22-11 13-28", class: "flight-queen-air" }));
      } else landing.appendChild(shape("circle", { r: royal ? 31 : 23, class: "flight-landing-ring" }));
      if (role === "king") {
        landing.appendChild(shape("circle", { r: 22, class: "flight-landing-inner" }));
        for (let i = 0; i < (role === "king" ? 8 : 6); i++) landing.appendChild(shape("path", {
          d: "M0 -27L0 -36", transform: "rotate(" + i * (role === "king" ? 45 : 60) + ")", class: "flight-landing-ray",
        }));
        if (role === "king") landing.appendChild(shape("path", { d: "M0 -36L36 0L0 36L-36 0Z", class: "flight-sovereign-seal" }));
      }
      group.appendChild(landing); layer.appendChild(group);
      const effects = active.current;
      effects.set(group, setTimeout(() => { group.remove(); effects.delete(group); }, 1500));
    }
  }, [pieces, orientation]);
  return <svg ref={ref} className="piece-motion-layer" viewBox="0 0 800 800" aria-hidden="true" />;
});
