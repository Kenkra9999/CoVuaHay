import { assetUrl } from "./asset-url.ts";

export const PIECE_SETS = [
  { id: "dragon-abyss", name: "Hắc Long – Dragon Abyss", subtitle: "Long hồn thức tỉnh. Vực sâu chuyển mình.", white: "Bạch long pha lê", black: "Hắc long tử diễm", caption: "Giáp vảy rồng, vương miện sừng và pháo đài long cốt. Long hồn cuộn quanh Xe, Hậu và Vua.", number: "07" },
  { id: "celestial", name: "Thiên thần & Ác quỷ", subtitle: "Ánh sáng thánh khiết. Hắc hỏa bất diệt.", white: "Pha lê thiên sứ", black: "Hắc thạch dung nham", caption: "Cánh thiên thần, hào quang pha lê đối đầu sừng quỷ và trái tim dung nham. Hai hình dáng riêng cho mỗi phe.", number: "08" },
  { id: "sakura", name: "Hoa anh đào", subtitle: "Thanh tao. Kiêu hãnh. Sắc bén.", white: "Bạch ngọc hồng", black: "Hắc kim anh đào", caption: "Vương miện cánh hoa, mã giáp samurai và thành quách dưới dấu ấn anh đào đỏ.", number: "06" },
  { id: "elemental", name: "Dung nham & Băng giá", subtitle: "Hai nguyên tố. Một cuộc đối đầu.", white: "Băng pha lê", black: "Dung nham", caption: "Pha lê xanh lạnh đối đầu đá núi lửa với những đường nứt rực lửa.", number: "01" },
  { id: "royal", name: "Hoàng gia", subtitle: "Thanh lịch trong từng đường nét.", white: "Ngà & vàng", black: "Hắc kim", caption: "Vương miện tinh xảo, thân quân chạm khắc và đế kim loại sang trọng.", number: "02" },
  { id: "nebula", name: "Tinh vân", subtitle: "Một ván cờ giữa các vì sao.", white: "Nguyệt bạc", black: "Tử tinh", caption: "Bạc ánh trăng và tím thiên hà, những quỹ đạo ôm lấy từng quân cờ.", number: "03" },
  { id: "jade", name: "Ngọc phong", subtitle: "Tĩnh tại bên ngoài. Sắc bén bên trong.", white: "Bạch ngọc", black: "Lục ngọc", caption: "Ngọc chạm, bệ sen và những đường nét gợi kiến trúc phương Đông.", number: "04" },
  { id: "mecha", name: "Cơ giáp", subtitle: "Chính xác. Mạnh mẽ. Tương lai.", white: "Titan băng", black: "Graphite đỏ", caption: "Giáp đa giác, lõi năng lượng và những chiến binh máy trên 64 ô.", number: "05" },
] as const;

export type PieceSetId = typeof PIECE_SETS[number]["id"];
export const DEFAULT_PIECE_SET: PieceSetId = "sakura";
export function validPieceSet(value: unknown): value is PieceSetId {
  return PIECE_SETS.some(set => set.id === value);
}

export function pieceImage(piece: { color: string; type: string }, set: PieceSetId = DEFAULT_PIECE_SET, litePieces = false) {
  return assetUrl("/pieces/" + (litePieces ? "lite/" : "") + set + "/" + piece.color + piece.type.toUpperCase() + ".svg");
}
