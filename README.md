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
   npm install
   node server.js