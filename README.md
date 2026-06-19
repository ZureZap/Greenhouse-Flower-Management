Bài tập lớn cấp tốc: Hệ thống quản lý nhà kính trồng hoa

Có giao diện UI, đã liên kết với SQL server nhưng chưa có MQTT

Cách chạy web:

Cách 1: Chạy bằng vscode

Cách 2: mở bảng terminal tại folder web rồi nhập lệnh "npx http-server -o" rồi nhấn y

## Chạy backend
1. Cài đặt Node.js và SQL Server.
2. Tạo database SmartFarmDB và chạy script SQL.
3. Cấu hình file `.env` với thông tin kết nối.
4. Trong thư mục `smartfarm-api`, chạy:

```bash
npm install
npm start
```

## Tài khoản kiểm thử

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Chủ trang trại | `greenhouse_owner` | `demo123` |
| Kỹ thuật viên | `agronomist` | `demo123` |
| Nhân viên vận hành | `operator_a` | `demo123` |

Tài khoản `pending_operator / demo123` dùng để kiểm thử chức năng phê duyệt.

Dashboard đọc dữ liệu lịch sử từ bảng `SensorData`. Khi tích hợp MQTT, backend chỉ cần ghi payload nhận được vào bảng này.

## Mô phỏng cảm biến tại backend

Backend hiện tự tạo dữ liệu cảm biến định kỳ để kiểm tra toàn bộ logic web trước khi tích hợp MQTT. Cấu hình trong `smartfarm-api/.env`:

```env
SIMULATION_ENABLED=true
SIMULATION_INTERVAL_MS=10000
```

Các API hỗ trợ kiểm thử:

- `GET /api/simulation/status`: xem trạng thái mô phỏng.
- `POST /api/simulation/start`: bắt đầu mô phỏng, có thể truyền `{ "intervalMs": 10000 }`.
- `POST /api/simulation/stop`: dừng mô phỏng.
- `POST /api/simulation/tick`: tạo ngay một lượt dữ liệu cho tất cả cảm biến.
- `POST /api/simulation/readings`: gửi một giá trị thử, ví dụ `{ "deviceId": 1, "value": 35 }`.

Mỗi giá trị được lưu vào `SensorData`, cập nhật nhiệt độ/độ ẩm của vùng, so sánh với `Threshold`, tạo hoặc đóng `AlertLog`, và bật/tắt thiết bị đang ở chế độ `AUTO`. Chạy `npm run test:integration` để kiểm tra luồng này với SQL Server; bài kiểm tra sẽ tự dọn dữ liệu thử và khôi phục trạng thái thiết bị.
