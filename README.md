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
