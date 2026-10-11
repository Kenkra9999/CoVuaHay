export const PIECE_SETS = [
  { id: "elemental", name: "Dung nham & Băng giá", subtitle: "Hai nguyên tố. Một cuộc đối đầu.", white: "Băng pha lê", black: "Dung nham", caption: "Pha lê xanh lạnh đối đầu đá núi lửa với những đường nứt rực lửa.", number: "01" },
  { id: "royal", name: "Hoàng gia", subtitle: "Thanh lịch trong từng đường nét.", white: "Ngà & vàng", black: "Hắc kim", caption: "Vương miện tinh xảo, thân quân chạm khắc và đế kim loại sang trọng.", number: "02" },
  { id: "nebula", name: "Tinh vân", subtitle: "Một ván cờ giữa các vì sao.", white: "Nguyệt bạc", black: "Tử tinh", caption: "Bạc ánh trăng và tím thiên hà, những quỹ đạo ôm lấy từng quân cờ.", number: "03" },
  { id: "jade", name: "Ngọc phong", subtitle: "Tĩnh tại bên ngoài. Sắc bén bên trong.", white: "Bạch ngọc", black: "Lục ngọc", caption: "Ngọc chạm, bệ sen và những đường nét gợi kiến trúc phương Đông.", number: "04" },
  { id: "mecha", name: "Cơ giáp", subtitle: "Chính xác. Mạnh mẽ. Tương lai.", white: "Titan băng", black: "Graphite đỏ", caption: "Giáp đa giác, lõi năng lượng và những chiến binh máy trên 64 ô.", number: "05" },
] as const;

export type PieceSetId = typeof PIECE_SETS[number]["id"];
export const DEFAULT_PIECE_SET: PieceSetId = "elemental";
export function validPieceSet(value: unknown): value is PieceSetId {
  return PIECE_SETS.some(set => set.id === value);
}
export function pieceImage(piece: { color: string; type: string }, set: PieceSetId = DEFAULT_PIECE_SET) {
  return "/pieces/" + set + "/" + piece.color + piece.type.toUpperCase() + ".svg";
}
