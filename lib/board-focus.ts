// Fullscreen is optional: the same view-only layout works when a browser declines it.
export function createBoardFocus(root: { requestFullscreen?: () => Promise<void> }, onChange: (active: boolean) => void,
  doc: Document = document, win: Window = window) {
  let active = false;
  let native = false;
  let disposed = false;
  let previousOverflow = "";
  const setActive = (next: boolean) => {
    if (active === next) return;
    active = next;
    if (next) { previousOverflow = doc.body.style.overflow; doc.body.style.overflow = "hidden"; }
    else doc.body.style.overflow = previousOverflow;
    if (!disposed) onChange(next);
  };
  const leaveNative = () => {
    if (doc.fullscreenElement === root && doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
  };
  const exit = () => { setActive(false); leaveNative(); };
  const onFullscreen = () => {
    if (doc.fullscreenElement === root) {
      native = true;
      if (!active || disposed) leaveNative();
    } else if (native) { native = false; setActive(false); }
  };
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && active) exit(); };
  doc.addEventListener("fullscreenchange", onFullscreen);
  win.addEventListener("keydown", onKey);
  return {
    async enter() {
      if (active || disposed) return;
      setActive(true);
      try {
        await root.requestFullscreen?.();
        if (!active || disposed) leaveNative();
      } catch { /* Keep the fitted, view-only fallback when fullscreen is unavailable. */ }
    },
    exit,
    dispose() {
      disposed = true;
      doc.removeEventListener("fullscreenchange", onFullscreen);
      win.removeEventListener("keydown", onKey);
      setActive(false);
      leaveNative();
    },
  };
}
