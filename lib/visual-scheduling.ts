// Input never stops animation; only hidden or covered boards suspend decoration.
export function installVisualScheduling() {
  const html = document.documentElement;
  const board = document.querySelector(".board-column");
  const root = document.querySelector(".site-shell");
  if (!board || !root) return;
  let visible = true;
  html.dataset.visualQuality = "balanced";
  const sync = () => {
    const paused = String(document.hidden || !visible || Boolean(root.querySelector("dialog[open]")));
    if (html.dataset.visualPaused === paused) return;
    html.dataset.visualPaused = paused;
    window.dispatchEvent(new Event("nuocco:visual-state"));
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { rootMargin: "80px" });
  observer.observe(board);
  const dialogs = new MutationObserver(sync);
  dialogs.observe(root, { subtree: true, attributes: true, attributeFilter: ["open"] });
  sync();
  document.addEventListener("visibilitychange", sync);
  return () => {
    observer.disconnect(); dialogs.disconnect();
    document.removeEventListener("visibilitychange", sync);
    delete html.dataset.visualQuality; delete html.dataset.visualPaused;
  };
}
