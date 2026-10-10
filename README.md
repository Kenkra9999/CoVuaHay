# Nước Cờ

Webapp cờ vua với nền chiến trường phủ toàn màn hình, bàn cờ xanh ngọc / đá đêm và menu ba gạch thu gọn. Chơi với Stockfish, trên cùng một thiết bị hoặc cùng bạn bè qua mã phòng 6 ký tự. Giao diện hỗ trợ chuột, bàn phím và thao tác chạm/kéo trên điện thoại.

## Chạy trên máy

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ mà lệnh `npm run dev` in ra, thường là `http://localhost:3000`. Bản chạy trên `localhost` chỉ dùng được trên máy của bạn. Để bạn bè chơi qua Internet, cần đưa ứng dụng cùng cơ sở dữ liệu D1 lên máy chủ.

```bash
npm test
```

Lệnh trên kiểm tra engine cục bộ, Stockfish WASM thực (ba biến hợp lệ, ba mức độ, chiếu hết, chuẩn hóa đánh giá theo quân trắng và hủy tìm kiếm), TypeScript, bản build và worker. `npm run db:generate` tạo migration khi thay đổi `db/schema.ts`.

## Cách chơi

- Nút ba gạch ở góc trái mở menu chọn chế độ, độ khó và màu quân. Đóng bằng nút ×, phím Escape hoặc bấm ra ngoài ngăn kéo.
- “Đấu với AI” dùng Stockfish 19 bản lite WASM chạy trong Web Worker, không cần API key. Có ba mức Dễ / Vừa / Khó, chọn cầm trắng hoặc đen. Ván AI không được lưu khi tải lại trang.
- “Gợi ý nước đi” dùng Stockfish ở sức mạnh tối đa, độc lập với mức độ đối thủ. Khoanh quân cần đi và vẽ mũi tên đến ô đích, kể cả khi xoay bàn cờ. Nút mắt ẩn/hiện mũi tên; chọn một trong ba phương án để đổi gợi ý.
- Phân tích hiển thị đánh giá lợi thế, độ sâu và chuỗi nước dự kiến của hai bên. Điểm luôn theo góc nhìn quân trắng: số dương có lợi cho trắng, số âm có lợi cho đen; `M` là số nước chiếu hết dự kiến. “Phân tích sâu” tăng thời gian tìm kiếm. Giải thích chiến thuật được tạo từ nước đi và kết quả engine; các biến là dự đoán khi hai bên đi tối ưu. Gợi ý được xóa khi thế cờ thay đổi.
- Tệp Stockfish được phục vụ ngay từ `public/engine/` (khoảng 1,9 MB), không tải engine từ CDN khi chơi. Giấy phép và liên kết mã nguồn tương ứng nằm trong `public/engine/README.md` và `COPYING.txt`.
- Nút biểu tượng toàn màn hình trên thanh đầu phóng ứng dụng ra toàn màn hình nếu trình duyệt hỗ trợ; trên iPhone tùy trình duyệt, bố cục vẫn tự co giãn.
- “Chơi online” hoặc “Mời bạn chơi” tạo mã riêng. “Chia sẻ mã” sao chép mã 6 ký tự; “Sao chép link” sao chép liên kết mời. Người tạo cầm quân trắng.
- “Nhập mã mời” luôn hiện trên thanh đầu và phần kết nối, kể cả khi đã ở một phòng. Nhập mã khác để chuyển phòng. Phòng cũ không bị xóa khi bạn rời giao diện.
- Người thứ hai nhập mã để nhận quân đen. Phòng chỉ có hai ghế; người đến sau có thể xem ván cờ.
- Chạm vào quân rồi chạm ô đích, hoặc kéo quân để đi. Luật cờ vua, chiếu hết, hòa và phong cấp được kiểm tra bằng `chess.js` trên cả giao diện và máy chủ.
- Ván online được lưu trong Cloudflare D1 và đồng bộ giữa hai thiết bị khoảng mỗi 1,3 giây. Mã phòng và quyền chơi vẫn dùng được sau khi tải lại trang trên cùng trình duyệt.

## Đưa lên mạng sau này

Dự án dùng vinext và Cloudflare Workers. `.openai/hosting.json` khai báo binding D1 tên `DB`; schema nằm trong `db/schema.ts`, migration trong `drizzle/`. API tự tạo bảng nếu chưa tồn tại ở lần dùng đầu tiên. Khi triển khai bằng Sites, giữ nguyên binding D1 và cấu trúc dự án. Chỉ đưa mã nguồn lên hosting tĩnh sẽ không chạy được tính năng phòng online vì các API `/api/rooms` cần Worker và D1.

## Ghi nhận

Quân cờ Cburnett từ [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard), giấy phép [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Ảnh xem trước liên kết `public/og.png` được tạo riêng cho dự án bằng công cụ ImageGen.

Nền chiến trường `public/chess-battlefield.png` được tạo riêng bằng ImageGen. Engine [Stockfish.js](https://github.com/nmrugg/stockfish.js/tree/v19.0.1) được phân phối theo GNU GPL v3; bản JavaScript và WASM giữ nguyên thông báo bản quyền của dự án gốc.
