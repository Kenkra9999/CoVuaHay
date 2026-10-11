export const STANDARD_BOARDS = [
  { id: "sakura", name: "Hoa anh đào", subtitle: "Ngọc hồng · hắc mộc", mark: "桜", world: "sakura" },
  { id: "lava", name: "Dung nham", subtitle: "Hổ phách · đá núi lửa", mark: "✦", world: "inferno" },
  { id: "royal", name: "Hoàng gia", subtitle: "Ngà cổ · vàng hoàng kim", mark: "♛", world: "royal" },
  { id: "frost", name: "Băng tuyết", subtitle: "Pha lê · xanh cực địa", mark: "❄", world: "frost" },
  { id: "nebula", name: "Tinh vân", subtitle: "Nguyệt bạc · tím thiên hà", mark: "✧", world: "citadel" },
] as const;
// Insets match the playable grid inside each supplied artwork, independent of screen size.
export const VIP_BOARDS = [
  { id: "vip-sovereign", name: "Hoàng kim", subtitle: "Vân ngà · ánh vàng vương giả", mark: "♛", world: "royal", art: "/boards/vip/sovereign.png", inset: "7.7% 7.5% 8.4% 7.7%" },
  { id: "vip-cosmos", name: "Thiên hà", subtitle: "Tinh vân trôi · sao bừng sáng", mark: "✧", world: "citadel", art: "/boards/vip/cosmos.png", inset: "5.1% 5.3% 5.9% 5.2%" },
  { id: "vip-neon", name: "Neon", subtitle: "Mạch điện tím · xung sáng xanh", mark: "ϟ", world: "citadel", art: "/boards/vip/neon.png", inset: "6.4% 6.8% 7.3% 6.7%" },
  { id: "vip-dragon", name: "Thanh long", subtitle: "Long khí · ngọc lục phát sáng", mark: "龍", world: "sakura", art: "/boards/vip/dragon.png", inset: "9.5% 9.6% 9.9% 9.9%" },
  { id: "vip-imperial", name: "Đế chế đỏ", subtitle: "Hồng ngọc · tàn lửa hoàng kim", mark: "✦", world: "inferno", art: "/boards/vip/imperial.png", inset: "5.6% 5.6% 6.4% 5.6%" },
] as const;
export const BOARD_STYLES = [...STANDARD_BOARDS, ...VIP_BOARDS] as const;
export const ATMOSPHERES = [
  { id: "sakura", name: "Anh đào đỏ", subtitle: "Cánh hoa & tàn lửa", mark: "❀" },
  { id: "snow", name: "Tuyết mùa đông", subtitle: "Bông tuyết trong gió", mark: "❄" },
  { id: "embers", name: "Tàn dung nham", subtitle: "Đốm lửa bay lên", mark: "♨" },
  { id: "gold", name: "Bụi hoàng kim", subtitle: "Ánh vàng lấp lánh", mark: "✦" },
  { id: "fireflies", name: "Đom đóm", subtitle: "Khu vườn phát sáng", mark: "✺" },
  { id: "stars", name: "Mưa sao băng", subtitle: "Vệt sáng thiên hà", mark: "✧" },
  { id: "aurora", name: "Cực quang", subtitle: "Dải sáng phương Bắc", mark: "≋" },
  { id: "rain", name: "Mưa đêm", subtitle: "Giọt bạc trong sương", mark: "☂" },
] as const;
export const COVER_SCENES = [
  { id: "duel", name: "Đối đầu vương giả", subtitle: "Hai sắc quân. Một chiến trường.", image: "/chess-duel.png" },
  { id: "sakura", name: "Dạ anh đào", subtitle: "Một cuộc đấu dưới trăng đỏ.", image: "/covers/sakura.svg" },
  { id: "frost", name: "Thành băng nguyệt", subtitle: "Tĩnh lặng giữa trời tuyết.", image: "/covers/frost.svg" },
  { id: "nebula", name: "Cổng tinh vân", subtitle: "64 ô. Vô hạn vì sao.", image: "/covers/nebula.svg" },
] as const;
export type BoardStyle = typeof BOARD_STYLES[number]["id"];
export type Atmosphere = typeof ATMOSPHERES[number]["id"];
export type CoverScene = typeof COVER_SCENES[number]["id"];
export type VisualAppearance = { boardTheme: BoardStyle; effect: Atmosphere; cover: CoverScene; particlesOn: true; motionOn: boolean };
export const DEFAULT_VISUALS: VisualAppearance = { boardTheme: "sakura", effect: "sakura", cover: "duel", particlesOn: true, motionOn: true };

// Older palette names migrate without touching saved games or room state.
export function restoreVisuals(read: (key: string) => string | null): VisualAppearance {
  const board = read("nuocco:boardTheme");
  const legacy = new Map<string, BoardStyle>([["walnut", "royal"], ["midnight", "nebula"], ["crimson", "lava"]]);
  return {
    boardTheme: BOARD_STYLES.find(item => item.id === board)?.id || (board && legacy.get(board)) || DEFAULT_VISUALS.boardTheme,
    effect: ATMOSPHERES.find(item => item.id === read("nuocco:effect"))?.id || DEFAULT_VISUALS.effect,
    cover: COVER_SCENES.find(item => item.id === read("nuocco:cover"))?.id || DEFAULT_VISUALS.cover,
    particlesOn: true,
    motionOn: read("nuocco:coverMotion") !== "false",
  };
}
