# Classic map demo

Demo độc lập theo yêu cầu thử chế độ Classic. Toàn bộ hình ảnh được vẽ trực tiếp bằng Canvas, không dùng ảnh hoặc thư viện ngoài. Không sửa frontend chính, backend hoặc database.

## Mở demo

Mở `index.html` bằng trình duyệt: có thể nhấp đúp file, không cần cài dependency và không cần chạy backend.

Nếu cần xem qua localhost, chạy từ thư mục gốc dự án:

```powershell
node demo/classic/server.mjs
```

Truy cập `http://127.0.0.1:4173`. Dừng server bằng Ctrl+C. Đổi cổng bằng biến `DEMO_PORT` nếu 4173 đang được sử dụng.

## Luật demo

- Bàn 24 × 24 ô. Một hàng tường bao quanh, phần sân chơi bên trong là 22 × 22 ô.
- Rắn ban đầu dài 3 đốt, đi sang phải, tốc độ cố định 8 ô/giây.
- Mồi đầu tiên ở phía trước để dễ thử tăng trưởng. Ăn mồi tăng 1 đốt; các mồi sau sinh ngẫu nhiên trong ô trống.
- Chạm tường hoặc thân rắn: Game Over. Đi vào ô đuôi đang rời đi vẫn hợp lệ.
- Không quay ngược 180°. Hàng đợi giữ tối đa 2 lần đổi hướng.
- Phủ kín sân: hoàn thành.
- Chuyển tab hoặc mất focus cửa sổ: tự tạm dừng, người chơi chủ động tiếp tục.
- Các thông số trên phục vụ demo, chưa phải cấu hình Classic chính thức.

Điều khiển: mũi tên/WASD, các nút hướng hoặc vuốt trên bàn chơi. Space/P/Esc để tạm dừng và tiếp tục. Có nút Chơi lại.

## Dành cho FE

- `engine.js`: logic Classic thuần JavaScript, không phụ thuộc DOM. Namespace `ClassicSnake` có `ClassicGame` và `DIRECTIONS`.
- `game.js`: vòng lặp thời gian, Canvas, bàn phím và cập nhật giao diện.
- `style.css`: giao diện đơn giản của demo.
- `server.mjs`: server xem thử, chỉ phục vụ các file demo, không phải Backend API.
- `engine.test.mjs`: kiểm thử luật bàn chơi và rắn.

Tường được xác định bằng `ClassicGame.isWall({ x, y })`: các ô có x/y bằng 0 hoặc 23 là tường. Renderer và va chạm dùng cùng quy tắc, tránh vẽ một bản đồ nhưng tính va chạm trên bản đồ khác.

Demo chỉ hiển thị **số mồi đã ăn** và **chiều dài**, chưa gán hệ số điểm, chưa gọi API lưu thành tích. Backend giữ nguyên trạng thái điểm chưa cấu hình.

Kiểm thử từ thư mục gốc:

```powershell
node --test demo/classic/engine.test.mjs
```
