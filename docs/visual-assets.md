# Ảnh cho giao diện Nước Cờ

## Bàn hai nguyên tố và bộ quân huyền thoại

`public/boards/vip/icefire.png` và `public/boards/vip/celestial.png` là hai ảnh người dùng cung cấp, được giữ nguyên. Lưới chơi được căn theo mép thật trong từng ảnh. Bàn tự phản chiếu ảnh và đổi mép căn khi đổi góc nhìn để quân Trắng bắt đầu trong băng/thiên giới, quân Đen trong dung nham/địa ngục. Các lớp CSS riêng gồm tuyết/tàn lửa, hơi lạnh/khói nóng, tia sáng xoay, sóng giao thoa, viền và mạch sáng theo từng ô. Chuyển động mới dừng theo tùy chọn giảm chuyển động của thiết bị và tạm dừng khi mở hộp chọn.

`scripts/generate-mythic-pieces.mjs` tạo 24 SVG mới trong `public/pieces/dragon-abyss/` và `public/pieces/celestial/`. Hắc Long dùng vảy, long cốt, vương miện sừng và pháo đài rồng; Thiên thần & Ác quỷ dùng hình dáng riêng cho hai phe: pha lê, cánh lông, hào quang đối đầu hắc thạch, cánh màng, sừng và vết nứt dung nham. Xe/Hậu/Vua có thêm cánh năng lượng, ấn xoay và vệ tinh sáng, bao gồm quân được phong cấp và quân đang kéo. Chạy `node scripts/generate-mythic-pieces.mjs` để tái tạo riêng 24 tài nguyên mới.

Các bàn hai phe còn có 64 lớp SVG riêng theo ô: nhánh băng kết tinh, bề mặt đóng băng lan dần, khe nứt dung nham và dòng sáng chảy bên trong. Mỗi nửa có 36 hạt chuyển động; phía nóng có 14 lưỡi lửa và hai dòng dung nham, phía lạnh có 12 mũi băng đang kết tinh. Thiên giới thay mũi băng bằng lông vũ, sao, ánh kim và hào quang xoay. Đôi cánh ảnh gốc chuyển động riêng ở viền. Lớp thời tiết nằm dưới quân cờ và dấu ô đi hợp lệ. Quãng đường hạt dùng kích thước nửa bàn thực tế để giữ chuyển động đúng trên mọi màn hình.

Riêng nửa băng của Băng & Dung nham có thêm 18 bông tuyết SVG sáu cánh (14–26px), quay và bay theo gió, 7 tinh thể băng nổi, 9 điểm lóe sáng, hai quầng sáng lạnh và ba vệt gió cuộn. Từng ô băng có ánh phản chiếu quét qua; sương lạnh và tuyết nhỏ cùng đổi hướng. Các lớp này gắn với miền băng, không tràn sang nửa dung nham hay bàn thiên thần.

Bàn Thiên thần & Ác quỷ có cánh PNG nhiều lớp lông chuyển động ngay trên viền ảnh gốc, với biên độ vỗ rõ và ánh vàng. Hai bên thiên giới có hai dải ánh kim chuyển động ngược chiều, 10 điểm sao, hai vệt phản chiếu và 12 lông vũ rơi. Địa ngục có thêm hai dòng nóng chảy với lõi vàng, 5 hồ dung nham gợn sóng, hai lớp hơi nóng và lửa cuộn; các khe nứt sáng và dòng dung nham theo ô được tăng chuyển động riêng. Toàn bộ hiệu ứng phụ nằm dưới quân, theo đúng miền khi đổi góc nhìn và tạm dừng cùng hộp chọn.

## Ảnh đối đầu — `public/chess-duel.png`

Ảnh người dùng cung cấp, 1672 × 941, giữ nguyên bản gốc. Banner phía trên bàn cờ sử dụng ảnh với lớp phủ tối và vị trí cắt riêng cho máy tính, điện thoại. Ảnh cũng làm nền rất nhẹ sau các bảng để giữ bàn cờ và điều khiển dễ đọc.

## Sáu bộ quân — `public/pieces/{set}/*.svg`

72 SVG được vẽ bằng đường vector trong `scripts/generate-chess-pieces.mjs`, tương ứng 36 thiết kế riêng của sáu loại quân trong sáu bộ. Hai màu của cùng một quân giữ chung hình dáng. Bộ Hoa anh đào mới dùng ngọc hồng, hắc kim, hoa năm cánh, thành quách và mã giáp samurai. Hoàng gia dùng đường cong Staunton; Nguyên tố dùng pha lê; Tinh vân dùng quỹ đạo; Ngọc phong dùng bệ sen; Cơ giáp dùng giáp đa giác. Chạy `node scripts/generate-chess-pieces.mjs` để tạo lại các tài nguyên.

## Bìa và chuyển động

`scripts/generate-chess-covers.mjs` tạo ba phong cảnh SVG gốc: Dạ anh đào, Thành băng nguyệt và Cổng tinh vân. Cùng ảnh đối đầu, bốn bìa có chuyển động pan/zoom và ánh sáng nhẹ bằng CSS, có thể tắt riêng. Tám hiệu ứng canvas chạy tối đa 30 khung/giây với mật độ thấp hơn trên điện thoại, dừng khi tab ẩn và tôn trọng tùy chọn giảm chuyển động của hệ thống. Anh đào đỏ mặc định hòa với những tàn lửa nhỏ. Năm mặt bàn có màu, vân và viền ánh sáng riêng; bật/tắt hiệu ứng cũng điều khiển ánh viền.

Lựa chọn giao diện lưu trong nhóm `nuocco:boardTheme`, `nuocco:pieceSet`, `nuocco:effect`, `nuocco:particles`, `nuocco:cover` và `nuocco:coverMotion`. Tùy chọn cũ được chuyển đổi, không thay đổi dữ liệu ván đấu hoặc phòng online.

## Nền chiến trường — `public/chess-battlefield.png`

Tạo riêng bằng ImageGen tích hợp, 1536 × 1024. Nền phủ toàn viewport bằng CSS `background-size: cover`, thêm lớp tối để giữ bàn cờ và chữ rõ nét.

Prompt: cinematic dark fantasy chess battlefield; monumental obsidian and ivory knights, rooks and kings at the edges, ruined medieval fortress, smoky teal charcoal sky, copper gold embers and bronze sunset. Central 65 percent dark and quiet for the board and controls. Weathered stone, realistic strategy game art, no people, blood, text, logos or watermark.

## Ảnh chia sẻ phiên bản toàn màn hình & AI — `public/og-v3.png`

Tạo bằng ImageGen tích hợp; giữ nguyên các phiên bản cũ.

Prompt:

> Use case: ads-marketing. Create one complete landscape social preview card for a Vietnamese chess webapp called "Nước Cờ". Premium editorial chess club style: near-black olive background, champagne bronze highlights, elegant cream serif typography, a large beautifully lit walnut chess board with classic ivory and ebony Staunton pieces on the right, no oversized hero statue. Left aligned exact Vietnamese text: "Nước Cờ" as brand, "Làm chủ từng nước cờ." as main headline, "Đấu AI · Mời bạn bằng mã" as supporting line. Small understated bronze THE CHESS CLUB caption. Generous negative space, cinematic warm light, tasteful high-end craftsmanship, very legible at small link-preview sizes. Only these texts, no invented UI labels, no watermarks. Wide approximately 1.91:1 composition.

Ảnh được tạo bằng ImageGen tích hợp. Bản gốc được giữ nguyên; các ảnh mới có tên riêng để không ghi đè ảnh xem trước cũ.

## Hero — `public/hero-chess.png`

Prompt:

> Use case: product-mockup. Asset type: wide 2.4:1 website hero photograph for a sophisticated chess webapp. Create an editorial luxury chess photograph, close-up of one elegant ebony Staunton knight and one ivory Staunton king on a walnut and ivory chessboard, authentic recognizable chess shapes, refined moderate proportions. Dramatic warm amber side lighting, subtle chiaroscuro, deep charcoal background, slightly smoky atmospheric depth, realistic grain on wood, polished but not shiny plastic. The main pieces sit in the right third; the left half stays very dark with soft blurred board texture and negative space for a website headline. A couple of distant chess pieces out of focus, coherent credible scene. Palette charcoal #151714, brass #c9a675, ivory #efe4ce, warm brown. Photorealistic, luxurious, quiet focus, restrained cinematic composition, wide landscape. No text, no logos, no watermark.

## Ảnh xem trước liên kết — `public/og-v2.png`

Prompt:

> Use case: ads-marketing. Asset type: landscape 1.91:1 social preview card for the finished Vietnamese chess webapp Nước Cờ. Complete cohesive card with exact typography. Refined chess club aesthetic, charcoal black background #151714, warm brass #c9a675 typography, ivory accent. Right half: photographic elegant ebony Staunton knight and ivory king on a walnut chessboard, warm cinematic side lighting and subtle depth of field. Left half: large tasteful editorial serif text exactly "Nước Cờ"; second line exactly "Làm chủ từng nước cờ."; smaller clean sans text exactly "Chơi cùng bạn bè. Kết nối bằng mã phòng.". Keep all Vietnamese diacritics correct. Premium, readable, generous space, no additional text or logos, no watermark.
## Cánh ảnh gốc chuyển động — Thiên thần & Ác quỷ

Chỉnh sửa bằng công cụ ImageGen tích hợp, từ `public/boards/vip/celestial.png`. Giữ bản gốc cho ảnh chọn bàn; bản nền `celestial-wingless.png` và lớp PNG trong suốt `celestial-wings.png` nằm cùng thư mục, được đóng gói vào bản dựng.

Prompt nền: precise-object-edit; remove only the two large white feather wings at the top center of the supplied chessboard; inpaint matching sky and clouds; preserve the central golden halo, spear, side feather ornaments, frame, exact 8×8 grid and ice/hell halves; same square framing, no text.

Prompt tách cánh: background-extraction; extract only the two original top-center white and gold feather wings onto a true transparent square canvas; preserve feather detail and ivory/gold palette; remove board, sky, halo, spear and side decorations; no text or new objects.

Hai cánh PNG được thu về kích thước viền gốc và vỗ riêng quanh gốc cánh, có hào quang thở và bụi ánh kim. Toàn bộ lớp cánh lật theo phía quân Trắng, không chặn thao tác; chế độ giảm chuyển động của thiết bị tắt animation. Không còn đôi cánh SVG lớn phủ giữa các ô cờ.
