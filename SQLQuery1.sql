-- ============================================
-- Script tạo Database SmartFarmDB và chèn dữ liệu mẫu
-- ============================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartFarmDB')
BEGIN
    CREATE DATABASE SmartFarmDB;
END;
GO

USE SmartFarmDB;
GO

-- 3. User (Đã sửa Role thành tiếng Anh và thêm cột status)
CREATE TABLE [User] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    user_name NVARCHAR(100) NOT NULL,
    password NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    phone_number NVARCHAR(20),
    role NVARCHAR(30) NOT NULL CHECK (role IN ('OWNER', 'TECHNICIAN', 'OPERATOR')),
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED')),
    CONSTRAINT UQ_User_UserName UNIQUE (user_name),
    CONSTRAINT UQ_User_Email UNIQUE (email)
);
GO

-- 4. Farm
CREATE TABLE Farm (
    farm_id INT IDENTITY(1,1) PRIMARY KEY,
    owner_id INT NOT NULL,
    address NVARCHAR(MAX),
    farm_name NVARCHAR(100) NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES [User](user_id)
);
GO

-- 5. Greenhouse
CREATE TABLE Greenhouse (
    greenhouse_id INT IDENTITY(1,1) PRIMARY KEY,
    farm_id INT NOT NULL,
    greenhouse_name NVARCHAR(100) NOT NULL,
    location_gps NVARCHAR(100),
    FOREIGN KEY (farm_id) REFERENCES Farm(farm_id)
);
GO

-- 6. Recipe
CREATE TABLE Recipe (
    recipe_id INT IDENTITY(1,1) PRIMARY KEY,
    creator INT NOT NULL,
    recipe_name NVARCHAR(100) NOT NULL,
    flower_type NVARCHAR(100),
    description NVARCHAR(MAX),
    status NVARCHAR(20) NOT NULL DEFAULT N'active' CHECK (status IN (N'active', N'delayed', N'completed')),
    created_date DATE NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (creator) REFERENCES [User](user_id)
);
GO

-- 7. Zone (Đã thêm temperature, humidity, status)
CREATE TABLE Zone (
    zone_id INT IDENTITY(1,1) PRIMARY KEY,
    greenhouse_id INT NOT NULL,
    recipe_id INT NULL,
    zone_name NVARCHAR(100) NOT NULL,
    start_date DATE,
    temperature DECIMAL(5,2) NULL,
    humidity INT NULL,
    status NVARCHAR(20) NULL,
    FOREIGN KEY (greenhouse_id) REFERENCES Greenhouse(greenhouse_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id)
);
GO

-- 8. Gateway
CREATE TABLE Gateway (
    gateway_id INT IDENTITY(1,1) PRIMARY KEY,
    greenhouse_id INT NOT NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE')),
    gateway_address NVARCHAR(100),
    FOREIGN KEY (greenhouse_id) REFERENCES Greenhouse(greenhouse_id)
);
GO

-- 9. Device
CREATE TABLE Device (
    device_id INT IDENTITY(1,1) PRIMARY KEY,
    gateway_id INT NOT NULL,
    zone_id INT NOT NULL,
    device_name NVARCHAR(100) NOT NULL,
    device_type NVARCHAR(20) NOT NULL CHECK (device_type IN ('SENSOR', 'OUTPUT_DEVICE')),
    metric_type NVARCHAR(50) NOT NULL,
    mac_address NVARCHAR(17) NULL,
    battery_level INT NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('ONLINE', 'OFFLINE', 'ERROR', 'NEEDS_REPLACEMENT', 'PENDING')) DEFAULT 'PENDING',
    last_heartbeat DATETIME2 NOT NULL DEFAULT GETDATE(),
    CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100),
    FOREIGN KEY (gateway_id) REFERENCES Gateway(gateway_id),
    FOREIGN KEY (zone_id) REFERENCES Zone(zone_id)
);
GO

-- SQL Server UNIQUE constraint chi cho phep mot NULL; filtered index phu hop hon cho MAC tuy chon.
CREATE UNIQUE INDEX UX_Device_MacAddress
ON Device(mac_address)
WHERE mac_address IS NOT NULL;
GO

-- 10. ControlProperties
CREATE TABLE ControlProperties (
    device_id INT PRIMARY KEY,
    mode NVARCHAR(10) NOT NULL CHECK (mode IN ('AUTO', 'MANUAL')),
    is_active BIT NOT NULL DEFAULT 0,
    value_percent INT NOT NULL DEFAULT 0 CHECK (value_percent BETWEEN 0 AND 100),
    auto_reset_time DATETIME2 NULL,
    FOREIGN KEY (device_id) REFERENCES Device(device_id) ON DELETE CASCADE
);
GO

-- 11. GrowthStage
CREATE TABLE GrowthStage (
    stage_id INT IDENTITY(1,1) PRIMARY KEY,
    recipe_id INT NOT NULL,
    stage_name NVARCHAR(100) NOT NULL,
    start_day INT NOT NULL,
    end_day INT NOT NULL,
    completed BIT NOT NULL DEFAULT 0,
    current_day INT NULL,
    CHECK (start_day >= 0 AND end_day >= start_day),
    CHECK (current_day IS NULL OR current_day >= 0),
    FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id)
);
GO

-- 12. Threshold
CREATE TABLE Threshold (
    threshold_id INT IDENTITY(1,1) PRIMARY KEY,
    stage_id INT NOT NULL,
    metric_type NVARCHAR(50) NOT NULL,
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
    FOREIGN KEY (stage_id) REFERENCES GrowthStage(stage_id)
);
GO

-- 13. SensorData
CREATE TABLE SensorData (
    device_id INT NOT NULL,
    [timestamp] DATETIME2 NOT NULL,
    raw_value DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (device_id, [timestamp]),
    FOREIGN KEY (device_id) REFERENCES Device(device_id)
);
GO

-- 14. Log
CREATE TABLE [Log] (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    device_id INT NOT NULL,
    user_id INT NULL,
    action NVARCHAR(255) NOT NULL,
    triggered_by NVARCHAR(10) NOT NULL CHECK (triggered_by IN ('USER', 'SYSTEM')),
    log_time DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (device_id) REFERENCES Device(device_id),
    FOREIGN KEY (user_id) REFERENCES [User](user_id),
    CHECK ((triggered_by = 'SYSTEM' AND user_id IS NULL) OR (triggered_by = 'USER' AND user_id IS NOT NULL))
);
GO

-- 15. AlertLog
CREATE TABLE AlertLog (
    alert_id INT IDENTITY(1,1) PRIMARY KEY,
    zone_id INT NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    severity NVARCHAR(20) NOT NULL CHECK (severity IN ('SIGNIFICANT', 'WARNING', 'CRITICAL')),
    status NVARCHAR(20) NOT NULL CHECK (status IN ('UNSOLVED', 'ACKNOWLEDGED', 'RESOLVED')) DEFAULT 'UNSOLVED',
    created_at DATETIME2 DEFAULT GETDATE(),
    resolved_at DATETIME2 NULL,
    acknowledged_by NVARCHAR(100) NULL,
    escalation_level INT NOT NULL DEFAULT 0,
    FOREIGN KEY (zone_id) REFERENCES Zone(zone_id)
);
GO

-- ============================================
-- CHÈN DỮ LIỆU MẪU 
-- ============================================

-- 1. Users: du 3 vai tro va 1 tai khoan cho duyet
SET IDENTITY_INSERT [User] ON;
INSERT INTO [User] (user_id, user_name, password, email, phone_number, role, status) VALUES
(1, 'greenhouse_owner', 'demo123', 'owner@greenhouse.local', '0901000001', 'OWNER', 'ACTIVE'),
(2, 'agronomist', 'demo123', 'tech@greenhouse.local', '0901000002', 'TECHNICIAN', 'ACTIVE'),
(3, 'operator_a', 'demo123', 'operator@greenhouse.local', '0901000003', 'OPERATOR', 'ACTIVE'),
(4, 'pending_operator', 'demo123', 'pending@greenhouse.local', '0901000004', 'OPERATOR', 'PENDING');
SET IDENTITY_INSERT [User] OFF;
GO

-- 2. Farm
SET IDENTITY_INSERT Farm ON;
INSERT INTO Farm (farm_id, owner_id, address, farm_name) VALUES
(1, 1, N'Phường 8, Đà Lạt', N'Trang trại Hoa Đà Lạt'),
(2, 1, N'Xã Xuân Thọ, Đà Lạt', N'Trang trại Thử nghiệm IoT');
SET IDENTITY_INSERT Farm OFF;
GO

-- 3. Greenhouse
SET IDENTITY_INSERT Greenhouse ON;
INSERT INTO Greenhouse (greenhouse_id, farm_id, greenhouse_name, location_gps) VALUES
(1, 1, N'Nhà kính Hoa Hồng', '11.9404,108.4583'),
(2, 1, N'Nhà kính Hoa Lan', '11.9410,108.4590'),
(3, 2, N'Nhà kính Kiểm thử', '11.9500,108.4700');
SET IDENTITY_INSERT Greenhouse OFF;
GO

-- 4. Recipe
SET IDENTITY_INSERT Recipe ON;
INSERT INTO Recipe (recipe_id, creator, recipe_name, flower_type, description, status, created_date) VALUES
(1, 2, N'Hoa Hồng tiêu chuẩn', N'Hoa Hồng', N'Công thức dùng kiểm thử điều khiển nhiệt độ và độ ẩm đất.', N'active', DATEADD(DAY, -60, CAST(GETDATE() AS DATE))),
(2, 2, N'Hoa Lan độ ẩm cao', N'Hoa Lan', N'Công thức dùng kiểm thử môi trường có độ ẩm cao.', N'active', DATEADD(DAY, -45, CAST(GETDATE() AS DATE))),
(3, 2, N'Hoa Cúc thử nghiệm', N'Hoa Cúc', N'Công thức tạm hoãn để kiểm thử trạng thái.', N'delayed', DATEADD(DAY, -30, CAST(GETDATE() AS DATE)));
SET IDENTITY_INSERT Recipe OFF;
GO

-- 5. Zone (Thêm dữ liệu giả lập cho temp, humid, status)
SET IDENTITY_INSERT Zone ON;
INSERT INTO Zone (zone_id, greenhouse_id, recipe_id, zone_name, start_date, temperature, humidity, status) VALUES
(1, 1, 1, N'Zone Hồng A1', DATEADD(DAY, -18, CAST(GETDATE() AS DATE)), 25.4, 72, 'optimal'),
(2, 1, 1, N'Zone Hồng A2', DATEADD(DAY, -8, CAST(GETDATE() AS DATE)), 30.8, 45, 'warning'),
(3, 2, 2, N'Zone Lan B1', DATEADD(DAY, -25, CAST(GETDATE() AS DATE)), 24.2, 84, 'optimal'),
(4, 3, NULL, N'Zone Chờ gieo trồng', NULL, NULL, NULL, 'inactive');
SET IDENTITY_INSERT Zone OFF;
GO

-- 6. Gateway
SET IDENTITY_INSERT Gateway ON;
INSERT INTO Gateway (gateway_id, greenhouse_id, status, gateway_address) VALUES
(1, 1, 'ONLINE', 'mqtt://192.168.10.11'),
(2, 2, 'ONLINE', 'mqtt://192.168.10.12'),
(3, 3, 'MAINTENANCE', 'mqtt://192.168.10.13');
SET IDENTITY_INSERT Gateway OFF;
GO

-- 7. Device
SET IDENTITY_INSERT Device ON;
INSERT INTO Device (device_id, gateway_id, zone_id, device_name, device_type, metric_type, mac_address, battery_level, status, last_heartbeat) VALUES
(1, 1, 1, N'Cảm biến nhiệt độ Hồng A1', 'SENSOR', 'Temperature', '02:00:00:00:00:01', 88, 'ONLINE', DATEADD(SECOND, -20, GETDATE())),
(2, 1, 1, N'Cảm biến độ ẩm không khí Hồng A1', 'SENSOR', 'Humidity', '02:00:00:00:00:02', 81, 'ONLINE', DATEADD(SECOND, -25, GETDATE())),
(3, 1, 1, N'Cảm biến độ ẩm đất Hồng A1', 'SENSOR', 'SoilHumidity', '02:00:00:00:00:03', 76, 'ONLINE', DATEADD(SECOND, -30, GETDATE())),
(4, 1, 1, N'Bơm tưới Hồng A1', 'OUTPUT_DEVICE', 'Irrigation', '02:00:00:00:00:04', NULL, 'ONLINE', DATEADD(SECOND, -15, GETDATE())),
(5, 1, 1, N'Quạt thông gió Hồng A1', 'OUTPUT_DEVICE', 'Ventilation', '02:00:00:00:00:05', NULL, 'ONLINE', DATEADD(SECOND, -15, GETDATE())),
(6, 1, 2, N'Cảm biến nhiệt độ Hồng A2', 'SENSOR', 'Temperature', '02:00:00:00:00:06', 64, 'ONLINE', DATEADD(SECOND, -10, GETDATE())),
(7, 1, 2, N'Cảm biến ánh sáng Hồng A2', 'SENSOR', 'Light', '02:00:00:00:00:07', 51, 'OFFLINE', DATEADD(MINUTE, -12, GETDATE())),
(8, 1, 2, N'Hệ thống phun sương Hồng A2', 'OUTPUT_DEVICE', 'Misting', '02:00:00:00:00:08', NULL, 'ONLINE', DATEADD(SECOND, -18, GETDATE())),
(9, 2, 3, N'Cảm biến nhiệt độ Lan B1', 'SENSOR', 'Temperature', '02:00:00:00:00:09', 93, 'ONLINE', DATEADD(SECOND, -12, GETDATE())),
(10, 2, 3, N'Cảm biến CO2 Lan B1', 'SENSOR', 'CO2', '02:00:00:00:00:0A', 9, 'NEEDS_REPLACEMENT', DATEADD(MINUTE, -3, GETDATE())),
(11, 2, 3, N'Quạt làm mát Lan B1', 'OUTPUT_DEVICE', 'Cooling', '02:00:00:00:00:0B', NULL, 'ONLINE', DATEADD(SECOND, -14, GETDATE())),
(12, 3, 4, N'Cảm biến mới chờ duyệt', 'SENSOR', 'Temperature', '02:00:00:00:00:0C', 100, 'PENDING', GETDATE()),
(13, 3, 4, N'Cảm biến pH thử nghiệm', 'SENSOR', 'PH', '02:00:00:00:00:0D', 72, 'ONLINE', DATEADD(SECOND, -35, GETDATE())),
(14, 3, 4, N'Cảm biến EC lỗi', 'SENSOR', 'EC', '02:00:00:00:00:0E', 40, 'ERROR', DATEADD(MINUTE, -8, GETDATE()));
SET IDENTITY_INSERT Device OFF;
GO

-- 8. ControlProperties
INSERT INTO ControlProperties (device_id, mode, is_active, value_percent, auto_reset_time) VALUES
(4, 'AUTO', 0, 0, NULL),
(5, 'AUTO', 1, 70, NULL),
(8, 'MANUAL', 1, 85, DATEADD(MINUTE, 30, GETDATE())),
(11, 'AUTO', 1, 60, NULL);
GO

-- 9. GrowthStage (cho từng recipe)
SET IDENTITY_INSERT GrowthStage ON;
INSERT INTO GrowthStage (stage_id, recipe_id, stage_name, start_day, end_day, completed, current_day) VALUES
(1, 1, N'Ươm cây', 1, 10, 1, 10),
(2, 1, N'Phát triển thân lá', 11, 25, 0, 8),
(3, 1, N'Ra nụ và nở hoa', 26, 45, 0, NULL),
(4, 2, N'Ổn định cây con', 1, 14, 1, 14),
(5, 2, N'Phát triển rễ và lá', 15, 35, 0, 11),
(6, 2, N'Ra hoa', 36, 60, 0, NULL),
(7, 3, N'Ươm cây thử nghiệm', 1, 12, 0, NULL),
(8, 3, N'Phát triển thử nghiệm', 13, 30, 0, NULL);
SET IDENTITY_INSERT GrowthStage OFF;
GO

-- 10. Threshold (cho từng stage)
SET IDENTITY_INSERT Threshold ON;
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(1, 1, 'Temperature', 22, 26),
(2, 1, 'SoilHumidity', 65, 80),
(3, 2, 'Temperature', 23, 28),
(4, 2, 'SoilHumidity', 60, 75),
(5, 3, 'Temperature', 20, 26),
(6, 3, 'SoilHumidity', 55, 70),
(7, 4, 'Temperature', 22, 26),
(8, 4, 'Humidity', 75, 90),
(9, 5, 'Temperature', 23, 27),
(10, 5, 'Humidity', 70, 88),
(11, 6, 'Temperature', 21, 25),
(12, 6, 'Humidity', 70, 85),
(13, 7, 'Temperature', 20, 27),
(14, 7, 'SoilHumidity', 55, 75),
(15, 8, 'Temperature', 21, 28),
(16, 8, 'SoilHumidity', 50, 70);
SET IDENTITY_INSERT Threshold OFF;
GO

-- 11. SensorData: lich su gia lap de test MQTT, bieu do va canh bao
INSERT INTO SensorData (device_id, [timestamp], raw_value) VALUES
(1, DATEADD(MINUTE, -30, GETDATE()), 24.80),
(1, DATEADD(MINUTE, -20, GETDATE()), 25.00),
(1, DATEADD(MINUTE, -10, GETDATE()), 25.40),
(1, GETDATE(), 25.60),
(2, DATEADD(MINUTE, -30, GETDATE()), 70.00),
(2, DATEADD(MINUTE, -20, GETDATE()), 71.00),
(2, DATEADD(MINUTE, -10, GETDATE()), 72.00),
(3, DATEADD(MINUTE, -30, GETDATE()), 68.00),
(3, DATEADD(MINUTE, -20, GETDATE()), 67.00),
(3, DATEADD(MINUTE, -10, GETDATE()), 66.00),
(6, DATEADD(MINUTE, -30, GETDATE()), 27.50),
(6, DATEADD(MINUTE, -20, GETDATE()), 28.20),
(6, DATEADD(MINUTE, -10, GETDATE()), 29.60),
(6, GETDATE(), 30.80),
(9, DATEADD(MINUTE, -30, GETDATE()), 23.80),
(9, DATEADD(MINUTE, -20, GETDATE()), 24.00),
(9, DATEADD(MINUTE, -10, GETDATE()), 24.20),
(10, DATEADD(MINUTE, -30, GETDATE()), 780.00),
(10, DATEADD(MINUTE, -20, GETDATE()), 820.00),
(10, DATEADD(MINUTE, -10, GETDATE()), 950.00),
(13, DATEADD(MINUTE, -20, GETDATE()), 6.10),
(13, DATEADD(MINUTE, -10, GETDATE()), 6.30),
(14, DATEADD(MINUTE, -20, GETDATE()), 1.80),
(14, DATEADD(MINUTE, -10, GETDATE()), 1.95);
GO

-- 12. AlertLog: du muc do va trang thai xu ly
SET IDENTITY_INSERT AlertLog ON;
INSERT INTO AlertLog (alert_id, zone_id, message, severity, status, created_at, resolved_at, acknowledged_by, escalation_level) VALUES
(1, 2, N'Nhiệt độ Zone Hồng A2 đạt 30.8°C, vượt ngưỡng tối đa.', 'CRITICAL', 'UNSOLVED', DATEADD(MINUTE, -12, GETDATE()), NULL, NULL, 2),
(2, 2, N'Độ ẩm đất Zone Hồng A2 chỉ còn 45%.', 'WARNING', 'ACKNOWLEDGED', DATEADD(MINUTE, -25, GETDATE()), NULL, N'operator_a', 1),
(3, 2, N'Cảm biến ánh sáng Hồng A2 mất heartbeat hơn 10 phút.', 'WARNING', 'UNSOLVED', DATEADD(MINUTE, -10, GETDATE()), NULL, NULL, 1),
(4, 3, N'Pin cảm biến CO2 Lan B1 còn dưới 10%.', 'SIGNIFICANT', 'UNSOLVED', DATEADD(MINUTE, -5, GETDATE()), NULL, NULL, 0),
(5, 4, N'Cảm biến EC thử nghiệm báo lỗi.', 'SIGNIFICANT', 'RESOLVED', DATEADD(HOUR, -2, GETDATE()), DATEADD(HOUR, -1, GETDATE()), N'agronomist', 0);
SET IDENTITY_INSERT AlertLog OFF;
GO

-- 13. Log: thao tac USER va dieu khien SYSTEM
SET IDENTITY_INSERT [Log] ON;
INSERT INTO [Log] (log_id, device_id, user_id, action, triggered_by, log_time) VALUES
(1, 8, 3, N'Chuyển hệ thống phun sương sang MANUAL ở mức 85%.', 'USER', DATEADD(MINUTE, -30, GETDATE())),
(2, 5, NULL, N'Tự động bật quạt do nhiệt độ vượt ngưỡng.', 'SYSTEM', DATEADD(MINUTE, -12, GETDATE())),
(3, 4, NULL, N'Tự động tắt bơm khi độ ẩm đất đạt yêu cầu.', 'SYSTEM', DATEADD(MINUTE, -40, GETDATE())),
(4, 11, NULL, N'Tự động bật quạt làm mát Lan B1.', 'SYSTEM', DATEADD(MINUTE, -20, GETDATE())),
(5, 8, 3, N'Xác nhận cảnh báo độ ẩm thấp tại Zone Hồng A2.', 'USER', DATEADD(MINUTE, -24, GETDATE())),
(6, 5, 1, N'Kiểm tra thủ công quạt thông gió.', 'USER', DATEADD(HOUR, -1, GETDATE())),
(7, 11, 2, N'Điều chỉnh mức quạt làm mát xuống 60%.', 'USER', DATEADD(MINUTE, -15, GETDATE()));
SET IDENTITY_INSERT [Log] OFF;
GO
