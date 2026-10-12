"use client";
/* eslint-disable @next/next/no-img-element -- User-provided local artwork. */

import { Menu, Pause, Play } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { assetUrl } from "../lib/asset-url";

const quotes = [
  { lead: "Đừng để xuất phát điểm quyết định bạn là ai,", rest: "bởi giá trị của một con người nằm ở những gì họ có thể trở thành" },
  { lead: "Nếu được kỉ luật đúng cách,", rest: "bạn cũng có thể trở thành những người mạnh mẽ nhất" },
];

export const ChessInspiration = memo(function ChessInspiration({ knight, scene, motion, menuOpen, onMenu, onCollection }: {
  knight: string; scene: string; motion: boolean; menuOpen: boolean; onMenu: () => void; onCollection: () => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (motion && !paused && !preference.matches && !document.hidden) {
        timer = setInterval(() => setActive(value => (value + 1) % quotes.length), 10000);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    preference.addEventListener("change", sync);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sync); preference.removeEventListener("change", sync); };
  }, [motion, paused, active]);

  return <section className="inspiration-hero" aria-label="Cảm hứng trước mỗi nước đi">
    <img className="inspiration-scene" src={assetUrl(scene)} alt="" aria-hidden="true" />
    <div className="inspiration-top">
      <button className="inspiration-collection" onClick={onCollection}><img src={knight} width={44} height={50} alt="" /><span>ATELIER COLLECTION<small>BỘ QUÂN CỜ ĐỘC BẢN</small></span></button>
      <button className="game-menu-toggle" onClick={onMenu} aria-label="Mở menu cuộc chơi" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="game-menu-dialog"><Menu size={24} /><span>Cuộc chơi</span></button>
    </div>
    <div className="inspiration-copy">
      <span className="inspiration-kicker">TỪ MỘT QUÂN TỐT · ĐẾN VÔ VÀN KHẢ NĂNG</span>
      <div className="inspiration-quote-space">
        <blockquote key={active} className="inspiration-quote"><span className="inspiration-open-quote" aria-hidden="true">“</span><p><em>{quotes[active].lead}</em><span>{quotes[active].rest}<span aria-hidden="true">”</span></span></p></blockquote>
      </div>
      <div className="inspiration-controls"><div className="quote-dots" aria-label="Chọn câu nói">{quotes.map((_, index) => <button key={index} aria-label={"Câu nói " + (index + 1)} aria-pressed={index === active} onClick={() => setActive(index)}><span /></button>)}</div><span className="quote-count">0{active + 1} <i>/</i> 02</span>{motion && <button className="quote-pause" aria-label={paused ? "Tiếp tục luân phiên câu nói" : "Tạm dừng luân phiên câu nói"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>}</div>
    </div>
    <figure className="inspiration-art"><img src={assetUrl("/chess-becoming.webp")} width={720} height={720} fetchPriority="high" alt="Quân tốt vàng trên bàn cờ, phía sau là bóng hình vương miện — tiềm năng trở thành của mỗi người." /><figcaption><span /> TIỀM NĂNG KHÔNG CÓ GIỚI HẠN</figcaption></figure>
  </section>;
});
