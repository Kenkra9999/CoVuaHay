# Ảnh cho giao diện Nước Cờ

## Ảnh đối đầu — `public/chess-duel.png`

Ảnh người dùng cung cấp, 1672 × 941, giữ nguyên bản gốc. Banner phía trên bàn cờ sử dụng ảnh với lớp phủ tối và vị trí cắt riêng cho máy tính, điện thoại. Ảnh cũng làm nền rất nhẹ sau các bảng để giữ bàn cờ và điều khiển dễ đọc.

## Năm bộ quân — `public/pieces/{set}/*.svg`

60 SVG được vẽ bằng đường vector trong `scripts/generate-chess-pieces.mjs`, tương ứng 30 thiết kế riêng của sáu loại quân trong năm bộ. Hai màu của cùng một quân giữ chung hình dáng. Hoàng gia dùng đường cong Staunton và ngà–hắc kim; Nguyên tố dùng các mảnh pha lê; Tinh vân dùng đường cong và vòng quỹ đạo; Ngọc phong dùng tháp, bệ sen và đầu mã chạm; Cơ giáp dùng giáp góc cạnh và lõi sáng. Chạy `node scripts/generate-chess-pieces.mjs` để tạo lại các tài nguyên.

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
