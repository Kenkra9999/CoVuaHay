"use client";

import { useEffect } from "react";

// Keep visual scheduling outside React: pointer input must not rerender the game.
export function VisualPerformance() {
  useEffect(() => {
    const html = document.documentElement;
    const board = document.querySelector(".board-column");
    const root = document.querySelector(".site-shell");
    if (!board || !root) return;
    let visible = true, interacting = false;
    let release: ReturnType<typeof setTimeout> | undefined;
    const mobile = window.matchMedia("(max-width: 640px)");
    const setQuality = () => {
      html.dataset.visualQuality = mobile.matches || (navigator.hardwareConcurrency || 8) <= 4 ? "balanced" : "full";
      window.dispatchEvent(new Event("nuocco:visual-state"));
    };
    const sync = () => {
      html.dataset.visualPaused = String(document.hidden || !visible || interacting || Boolean(root.querySelector("dialog[open]")));
      window.dispatchEvent(new Event("nuocco:visual-state"));
    };
    const down = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !board.contains(event.target)) return;
      clearTimeout(release); interacting = true; sync();
    };
    const up = () => { if (interacting) { clearTimeout(release); release = setTimeout(() => { interacting = false; sync(); }, 600); } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { rootMargin: "80px" });
    observer.observe(board);
    const dialogs = new MutationObserver(sync);
    dialogs.observe(root, { subtree: true, attributes: true, attributeFilter: ["open"] });
    setQuality(); sync();
    mobile.addEventListener("change", setQuality);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("pointercancel", up, { passive: true });
    window.addEventListener("blur", up);
    return () => {
      observer.disconnect(); dialogs.disconnect(); clearTimeout(release);
      mobile.removeEventListener("change", setQuality);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("pointerdown", down); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      delete html.dataset.visualQuality; delete html.dataset.visualPaused;
    };
  }, []);
  return null;
}
