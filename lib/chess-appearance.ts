export const BOARD_STYLES = [
  { id: "sakura", name: "Hoa anh đào", subtitle: "Ngọc hồng · hắc mộc", mark: "桜", world: "sakura" },
  { id: "lava", name: "Dung nham", subtitle: "Hổ phách · đá núi lửa", mark: "✦", world: "inferno" },
  { id: "royal", name: "Hoàng gia", subtitle: "Ngà cổ · vàng hoàng kim", mark: "♛", world: "royal" },
  { id: "frost", name: "Băng tuyết", subtitle: "Pha lê · xanh cực địa", mark: "❄", world: "frost" },
  { id: "nebula", name: "Tinh vân", subtitle: "Nguyệt bạc · tím thiên hà", mark: "✧", world: "citadel" },
] as const;
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
