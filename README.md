# Greenhouse Flower Management

Ứng dụng quản lý nhà kính trồng hoa được xây dựng theo mô hình ba lớp:

- **Frontend:** HTML, CSS và JavaScript thuần.
- **Backend:** Node.js, Express và REST API.
- **Database:** Microsoft SQL Server.

Dữ liệu cảm biến hiện được mô phỏng tại backend. MQTT chưa được tích hợp; khi tích hợp, payload MQTT sẽ đi qua cùng luồng xử lý đang dùng cho simulator.

## Chức năng chính

- Dashboard theo dõi nhiệt độ, độ ẩm, ánh sáng, CO2 và cảnh báo.
- Quản lý cấu trúc `Farm → Greenhouse → Zone`.
- Quản lý cảm biến và thiết bị đầu ra.
- Điều khiển thiết bị ở chế độ `AUTO` hoặc `MANUAL`.
- Quản lý Recipe, GrowthStage và Threshold.
- Theo dõi tiến độ Recipe tại từng Zone.
- Điều chỉnh chu kỳ riêng cho từng Zone và lưu lý do.
- Tạo, xác nhận và giải quyết cảnh báo.
- Audit Log cho thao tác người dùng và hành động tự động.
- Quản lý tài khoản, phân quyền và đổi mật khẩu.

Các metric cảm biến đang sử dụng: `Temperature`, `Humidity`, `SoilHumidity`, `Light`, `CO2` và `PH`.

## Cấu trúc thư mục

```text
Greenhouse-Flower-Management/
├── index.html
├── css/                  # Giao diện
├── js/                   # Logic frontend và API client
├── smartfarm-api/        # Express API và simulator
├── SQLQuery1.sql         # Schema và dữ liệu mẫu
└── README.md
```

## Yêu cầu môi trường

- Node.js 18 trở lên.
- Microsoft SQL Server.
- Trình duyệt hiện đại.
- VS Code Live Server hoặc một HTTP server tĩnh.

## Khởi tạo database

1. Mở SQL Server Management Studio.
2. Chạy file `SQLQuery1.sql` trên SQL Server.
3. Script sẽ tạo database `SmartFarmDB`, các bảng và dữ liệu kiểm thử.

> `SQLQuery1.sql` là script khởi tạo đầy đủ và nên chạy trên database sạch. Không chạy lặp lại trên database đã có bảng.

## Cấu hình backend

Trong thư mục `smartfarm-api`, tạo file `.env` dựa trên `.env.example`:

```env
DB_HOST=localhost
DB_DATABASE=SmartFarmDB
DB_USER=sa
DB_PASSWORD=your-password
DB_PORT=1433
PORT=5000
SIMULATION_ENABLED=true
SIMULATION_INTERVAL_MS=10000
```

Không commit file `.env` hoặc mật khẩu thật lên GitHub.

## Chạy ứng dụng

### 1. Backend

```powershell
cd smartfarm-api
npm install
npm start
```

Backend mặc định chạy tại `http://localhost:5000`.

### 2. Frontend

Mở terminal tại thư mục gốc dự án:

```powershell
npx http-server -o
```

Cũng có thể mở `index.html` bằng VS Code Live Server. Không nên mở trực tiếp bằng `file://` vì frontend sử dụng JavaScript modules.

## Tài khoản mẫu

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| OWNER chính | `greenhouse_owner` | `demo123` |
| TECHNICIAN | `agronomist` | `demo123` |
| OPERATOR | `operator_a` | `demo123` |
| Chờ phê duyệt | `pending_operator` | `demo123` |

Hệ thống có thể có nhiều OWNER, nhưng chỉ một tài khoản có `is_primary_owner = 1`:

- OWNER chính không xuất hiện trong danh sách quản lý tài khoản.
- OWNER chính không thể bị xóa, khóa hoặc đổi vai trò.
- OWNER phụ có thể được phân quyền hoặc xóa như tài khoản thông thường.
- Chỉ OWNER đang hoạt động được truy cập trang quản lý tài khoản và các API quản lý user.

Mật khẩu trong bài tập đang lưu dạng văn bản để đơn giản hóa demo. Hệ thống thực tế phải dùng bcrypt/Argon2 và JWT hoặc session an toàn.

## Recipe và tiến độ Zone

`Recipe`, `GrowthStage` và `Threshold` chỉ định nghĩa công thức mẫu. Tiến độ không được lưu trên Recipe mà được tính riêng cho từng Zone dựa trên:

```text
ngày hiện tại = hôm nay - start_date + 1
ngày hiệu chỉnh = ngày hiện tại - cycle_adjustment_days
```

Mỗi Zone hiển thị:

- Giai đoạn hiện tại.
- Phần trăm tiến độ.
- Timeline các GrowthStage.
- Ngày dự kiến hoàn thành.
- Ngưỡng của giai đoạn hiện tại.
- Số ngày và lý do điều chỉnh chu kỳ.

Điều chỉnh một Zone không làm thay đổi Recipe hoặc các Zone khác sử dụng cùng Recipe.

## Backend simulator

Simulator mặc định tạo dữ liệu sau mỗi 10 giây cho các cảm biến đang hoạt động. Mỗi giá trị sẽ:

1. Được lưu vào `SensorData`.
2. Cập nhật nhiệt độ hoặc độ ẩm của Zone nếu phù hợp.
3. Được so sánh với Threshold của GrowthStage hiện tại.
4. Tạo, cập nhật hoặc đóng AlertLog.
5. Điều khiển thiết bị `AUTO` nếu cần.
6. Ghi hành động tự động vào Audit Log.

API kiểm thử simulator:

| Method | Endpoint | Công dụng |
|---|---|---|
| GET | `/api/simulation/status` | Xem trạng thái simulator |
| POST | `/api/simulation/start` | Bắt đầu simulator |
| POST | `/api/simulation/stop` | Dừng simulator |
| POST | `/api/simulation/tick` | Chạy ngay một lượt |
| POST | `/api/simulation/readings` | Gửi một giá trị cảm biến thử |

Ví dụ body cho giá trị thử:

```json
{
  "deviceId": 1,
  "value": 35
}
```

## Audit Log

Audit Log hỗ trợ các loại đối tượng:

```text
DEVICE, ZONE, GREENHOUSE, FARM, RECIPE,
GROWTH_STAGE, ALERT, USER, SIMULATION
```

Log được tạo cho đăng nhập/đăng xuất, đổi mật khẩu, quản lý tài khoản, CRUD cấu trúc nhà kính, thiết bị, công thức, cảnh báo, điều khiển thủ công và hành động tự động của simulator.

## Kiểm thử

Trong thư mục `smartfarm-api`:

```powershell
npm test
npm run test:integration
```

- `npm test`: kiểm tra cú pháp và các hàm logic thuần.
- `npm run test:integration`: kiểm tra luồng `SensorData → AlertLog → AUTO actuator` với SQL Server và tự dọn dữ liệu thử.

## Ghi chú triển khai

- Frontend gọi API tại `http://localhost:5000/api`.
- Dashboard và trang Log tự cập nhật mỗi 10 giây khi đang được mở.
- Nếu thay source backend, cần dừng và chạy lại `npm start`.
- Nếu trình duyệt vẫn dùng JavaScript cũ, nhấn `Ctrl + F5`.
