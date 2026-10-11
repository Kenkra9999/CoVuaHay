# Nước Cờ — The Chess Atelier

Ứng dụng cờ vua với bàn cờ rộng tự co giãn, chữ và nút dễ đọc, năm bộ quân SVG riêng cùng sáu không gian màu. Chơi với Stockfish, hai người trên cùng thiết bị hoặc online bằng mã phòng. Hỗ trợ chuột, bàn phím, chạm và kéo quân trên điện thoại.

## Chạy trên máy

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ mà lệnh in ra, thường là http://localhost:3000. Online qua Internet cần bản triển khai Worker với cơ sở dữ liệu D1; localhost chỉ dùng trên máy đang chạy ứng dụng.

Schema nằm trong `db/schema.ts`, migration trong `drizzle/`. Áp dụng migration vào D1 trước khi chạy các API phòng. API không tự thay đổi schema. Sites quản lý migration cho bản triển khai theo binding `DB` trong `.openai/hosting.json`. Với server local, dùng Wrangler D1 và các tệp SQL trong `drizzle/`, áp dụng mỗi migration một lần theo thứ tự. Dữ liệu local dùng thư mục `.wrangler/state`.

## Chơi và khám phá

- **Đấu với AI:** Stockfish WASM chạy trên thiết bị, bốn mức từ dễ đến kỳ thủ. Chọn cầm Trắng hoặc Đen, hoàn tác và tiếp tục ván sau khi tải lại.
- **Cùng thiết bị:** hai người luân phiên đi quân, sửa tên ngay trên thẻ người chơi. Ván được lưu trên trình duyệt.
- **Trợ lý AI:** ba phương án, mũi tên gợi ý, đánh giá lợi thế, biến dự kiến và phân tích sâu. Đánh giá dương có lợi cho Trắng; `M` là khoảng cách chiếu hết dự kiến. Gợi ý cũng dùng được trong phòng online.
- **Biên bản:** xem lại từng nước, trở về ván trực tiếp, sao chép FEN và tải PGN có tên người chơi.
- **Không gian:** sáu chủ đề, bốn màu bàn, hiệu ứng nền, âm thanh, xoay bàn và toàn màn hình. Các lựa chọn được lưu sau khi tải lại.
- **Bộ quân:** nút **Đổi bộ quân** ngay trên bàn mở bộ sưu tập, xem đủ Vua, Hậu, Xe, Tượng, Mã và Tốt của cả hai bên. Mặc định **Hoàng gia** (ngà vàng và hắc kim), cùng **Dung nham & Băng giá**, **Tinh vân**, **Ngọc phong** và **Cơ giáp**. Đổi bộ ngay trong ván, tự lưu trên thiết bị và giữ lựa chọn đã lưu trước đó. 60 SVG được vẽ riêng với 30 dáng quân theo bộ; hai bên cùng dáng để dễ nhận diện vai trò. Tạo lại bằng `node scripts/generate-chess-pieces.mjs`.
- **Ảnh chủ đạo:** banner điện ảnh dùng ảnh đối đầu hắc kim–ngà vàng do người dùng cung cấp, lưu tại `public/chess-duel.png`. Lớp phủ giữ chữ rõ, bố cục tự điều chỉnh trên điện thoại; nền bàn chơi chỉ dùng ảnh ở mức nhẹ.
- **Hiệu năng giao diện:** bàn cờ được memo hóa để tránh vẽ lại theo nhịp đồng hồ; giữ danh sách nước đi ổn định khi đồng bộ không thay đổi thế cờ. Hiệu ứng nền giới hạn 30 khung hình/giây và dừng khi tab bị ẩn; tôn trọng tùy chọn giảm chuyển động của hệ điều hành.

## Phòng online

1. Chọn **Tạo phòng**, nhập tên và kéo thanh thời gian: 5–100 phút **mỗi bên**, tối đa 60–300 giây **mỗi nước**. Đồng hồ chưa chạy khi đang đợi người thứ hai.
2. Chia sẻ mã sáu ký tự hoặc link mời. Người tạo cầm Trắng; người đầu tiên vào bằng mã nhận Đen. Phòng đủ hai ghế thì người đến sau chỉ xem.
3. Người chơi sửa tên trực tiếp trên thẻ của mình. Máy còn lại nhận tên mới qua lần đồng bộ tiếp theo, thường trong khoảng một giây khi trang đang mở.
4. Nước đi được máy chủ kiểm tra, lưu và đồng bộ; mỗi ghế có token riêng. Có đề nghị hòa, chấp nhận/từ chối, thu hồi đề nghị và xin thua.
5. Tải lại hoặc mở lại trên **cùng trình duyệt còn dữ liệu lưu** sẽ khôi phục phòng và ghế. Cũng có thể nhập lại mã, mở link hoặc chọn phòng gần đây. Mã phòng chỉ xác định trận; quyền ghế đã có được khôi phục bằng token trên trình duyệt.
6. Đồng hồ dựa trên thời gian máy chủ và tiếp tục chạy khi đóng trang. Hết thời gian tổng hoặc giới hạn một nước đều xử thua; khi quay lại sẽ thấy kết quả **Bạn đã thua do quá giờ**. Kết quả được ghi vào D1 khi có yêu cầu tiếp theo, kể cả khi cả hai đã đóng trang.

Nếu đổi thiết bị, dùng trình duyệt riêng tư hoặc xóa dữ liệu trình duyệt, mã mời không chuyển quyền một ghế đã có người giữ. Cần giữ dữ liệu trình duyệt cũ để tiếp tục chơi ghế đó. Người được mời cũng cần quyền mở website nếu website đang ở chế độ riêng tư.

## Kiểm tra

```bash
npm test
```

Kiểm tra engine cục bộ, Stockfish WASM thật, đồng hồ và biên thời gian, TypeScript, build và worker.

Các kiểm tra API cần một server local đang chạy:

```bash
node --test tests/rooms.integration.test.mjs tests/rooms-clock.integration.test.mjs
```

Đặt `CHESS_TEST_DB` thành đường dẫn SQLite D1 local để kiểm tra cả tình huống hết giờ khi đóng trang. Fixture chỉ được dùng với server loopback và các phòng do kiểm tra tạo; không trỏ vào dữ liệu production. Không có biến này, các kiểm tra cần sửa thời gian fixture sẽ được bỏ qua.

## Tài nguyên và triển khai

Quân cờ SVG hiện tại được thiết kế riêng cho Nước Cờ. Bộ Cburnett trước đây đến từ [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard), theo [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Các ảnh xem trước và nền cũ được tạo riêng bằng ImageGen.

Engine [Stockfish.js](https://github.com/nmrugg/stockfish.js/tree/v19.0.1) được phân phối theo GNU GPL v3. JavaScript, WASM, giấy phép và liên kết mã nguồn tương ứng nằm trong `public/engine/`; giữ nguyên thông báo bản quyền.

Dự án dùng vinext và Cloudflare Workers. Khi cập nhật qua Sites, giữ nguyên project ID, binding `DB` và các migration. Hosting tĩnh không chạy được `/api/rooms` vì luồng online cần Worker và D1.
