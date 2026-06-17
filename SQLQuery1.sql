-- ============================================
-- Script tạo Database SmartFarmDB và chèn dữ liệu mẫu
-- Tương thích với SQL Server
-- ============================================

-- 1. Kiểm tra và tạo database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartFarmDB')
BEGIN
    CREATE DATABASE SmartFarmDB;
END;
GO

USE SmartFarmDB;
GO

-- ============================================
-- TẠO CÁC BẢNG
-- ============================================

-- 3. User
CREATE TABLE [User] (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    user_name NVARCHAR(100) NOT NULL,
    password NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    phone_number NVARCHAR(20),
    role NVARCHAR(30) NOT NULL CHECK (role IN (N'Chủ trang trại', N'Kỹ thuật viên', N'Nhân viên vận hành'))
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

-- 7. Zone
CREATE TABLE Zone (
    zone_id INT IDENTITY(1,1) PRIMARY KEY,
    greenhouse_id INT NOT NULL,
    recipe_id INT NULL,
    zone_name NVARCHAR(100) NOT NULL,
    start_date DATE,
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
    FOREIGN KEY (gateway_id) REFERENCES Gateway(gateway_id),
    FOREIGN KEY (zone_id) REFERENCES Zone(zone_id)
);
GO

-- 10. ControlProperties (bổ sung từ state.js)
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
    FOREIGN KEY (stage_id) REFERENCES GrowthStage(stage_id)
);
GO

-- 13. SensorData
CREATE TABLE SensorData (
    device_id INT NOT NULL,
    [timestamp] DATETIME2 NOT NULL,
    raw_value DECIMAL(10,2),
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
-- CHÈN DỮ LIỆU MẪU TỪ state.js
-- ============================================

-- 1. Users
SET IDENTITY_INSERT [User] ON;
INSERT INTO [User] (user_id, user_name, password, email, phone_number, role) VALUES
(1, 'owner1', '123456', 'owner@farm.com', '0909123456', N'Chủ trang trại'),
(2, 'tech1', '123456', 'tech@farm.com', '0909123457', N'Kỹ thuật viên'),
(3, 'op1', '123456', 'operator@farm.com', '0909123458', N'Nhân viên vận hành'),
(4, 'pendingUser', '123456', 'pending@farm.com', '0909123459', N'Nhân viên vận hành');
SET IDENTITY_INSERT [User] OFF;
GO

-- 2. Farm
SET IDENTITY_INSERT Farm ON;
INSERT INTO Farm (farm_id, owner_id, address, farm_name) VALUES
(1, 1, '123 Đường Đà Lạt', 'Khu trại Đà Lạt');
SET IDENTITY_INSERT Farm OFF;
GO

-- 3. Greenhouse
SET IDENTITY_INSERT Greenhouse ON;
INSERT INTO Greenhouse (greenhouse_id, farm_id, greenhouse_name, location_gps) VALUES
(1, 1, 'Nhà kính A', 'GPS_A'),
(2, 1, 'Nhà kính B', 'GPS_B');
SET IDENTITY_INSERT Greenhouse OFF;
GO

-- 4. Recipe
SET IDENTITY_INSERT Recipe ON;
INSERT INTO Recipe (recipe_id, creator, recipe_name, flower_type, description, status, created_date) VALUES
(1, 2, N'Công thức Hoa Hồng', N'Hoa Hồng', N'Dành cho vụ xuân hè, ưa ẩm', N'active', '2025-03-01'),
(2, 2, N'Công thức Hoa Cúc', N'Hoa Cúc', N'Chịu hạn tốt, ít cần chăm sóc', N'delayed', '2025-03-15'),
(3, 2, N'Công thức Hoa Lan', N'Hoa Lan', N'Cần độ ẩm cao, ánh sáng vừa phải', N'active', '2025-03-10');
SET IDENTITY_INSERT Recipe OFF;
GO

-- 5. Zone
SET IDENTITY_INSERT Zone ON;
INSERT INTO Zone (zone_id, greenhouse_id, recipe_id, zone_name, start_date) VALUES
(1, 1, 1, N'Khu vực 1 - Hoa Hồng', '2025-01-01'),
(2, 1, 2, N'Khu vực 2 - Hoa Cúc', '2025-01-15'),
(3, 2, 3, N'Khu vực 1 - Hoa Lan', '2025-02-01');
SET IDENTITY_INSERT Zone OFF;
GO

-- 6. Gateway
SET IDENTITY_INSERT Gateway ON;
INSERT INTO Gateway (gateway_id, greenhouse_id, status, gateway_address) VALUES
(1, 1, 'ONLINE', '192.168.1.1'),
(2, 2, 'ONLINE', '192.168.1.2');
SET IDENTITY_INSERT Gateway OFF;
GO

-- 7. Device
SET IDENTITY_INSERT Device ON;
INSERT INTO Device (device_id, gateway_id, zone_id, device_name, device_type, metric_type, mac_address, battery_level, status, last_heartbeat) VALUES
(1, 1, 1, N'Cảm biến nhiệt độ #1', 'SENSOR', 'Temperature', 'AA:BB:CC:DD:EE:01', 85, 'ONLINE', GETDATE()),
(2, 1, 1, N'Cảm biến độ ẩm #1', 'SENSOR', 'Humidity', 'AA:BB:CC:DD:EE:02', 92, 'ONLINE', GETDATE()),
(3, 1, 1, N'Hệ thống phun sương', 'OUTPUT_DEVICE', 'Actuator', 'AA:BB:CC:DD:EE:03', NULL, 'ONLINE', GETDATE()),
(4, 1, 1, N'Quạt thông gió', 'OUTPUT_DEVICE', 'Actuator', 'AA:BB:CC:DD:EE:04', NULL, 'ONLINE', GETDATE()),
(5, 2, 2, N'Đèn chiếu sáng', 'OUTPUT_DEVICE', 'Actuator', 'AA:BB:CC:DD:EE:05', NULL, 'ONLINE', GETDATE()),
(6, 2, 2, N'Điều hòa nhiệt độ', 'OUTPUT_DEVICE', 'Actuator', 'AA:BB:CC:DD:EE:06', NULL, 'ONLINE', GETDATE()),
(7, 1, 1, N'Cảm biến ánh sáng #1', 'SENSOR', 'Light', 'AA:BB:CC:DD:EE:07', NULL, 'OFFLINE', DATEADD(MINUTE, -5, GETDATE())),
(8, 1, 1, N'Cảm biến CO2 #1', 'SENSOR', 'CO2', 'AA:BB:CC:DD:EE:08', 12, 'NEEDS_REPLACEMENT', DATEADD(MINUTE, -3, GETDATE())),
(9, 1, 1, N'Thiết bị mới #1', 'SENSOR', 'Temperature', 'AA:BB:CC:DD:EE:09', NULL, 'PENDING', GETDATE());
SET IDENTITY_INSERT Device OFF;
GO

-- 8. ControlProperties
INSERT INTO ControlProperties (device_id, mode, is_active, value_percent, auto_reset_time) VALUES
(3, 'AUTO', 1, 75, NULL),
(4, 'AUTO', 0, 0, NULL),
(5, 'MANUAL', 1, 100, DATEADD(HOUR, 2, GETDATE())),
(6, 'AUTO', 1, 60, NULL);
GO

-- 9. GrowthStage (cho từng recipe)
SET IDENTITY_INSERT GrowthStage ON;
-- Recipe 1
INSERT INTO GrowthStage (stage_id, recipe_id, stage_name, start_day, end_day, completed, current_day) VALUES
(1, 1, N'Giai đoạn ươm', 1, 10, 1, 10),
(2, 1, N'Phát triển lá', 11, 25, 0, 8),
(3, 1, N'Ra nụ', 26, 37, 0, NULL),
(4, 1, N'Nở hoa', 38, 45, 0, NULL);
-- Recipe 2
INSERT INTO GrowthStage (stage_id, recipe_id, stage_name, start_day, end_day, completed, current_day) VALUES
(5, 2, N'Giai đoạn ươm', 1, 8, 1, 8),
(6, 2, N'Phát triển', 9, 26, 0, 12),
(7, 2, N'Ra nụ', 27, 36, 0, NULL);
-- Recipe 3
INSERT INTO GrowthStage (stage_id, recipe_id, stage_name, start_day, end_day, completed, current_day) VALUES
(8, 3, N'Giai đoạn ươm', 1, 14, 1, 14),
(9, 3, N'Phát triển lá', 15, 34, 1, 20),
(10, 3, N'Ra nụ', 35, 49, 0, 5),
(11, 3, N'Nở hoa', 50, 59, 0, NULL);
SET IDENTITY_INSERT GrowthStage OFF;
GO

-- 10. Threshold (cho từng stage)
SET IDENTITY_INSERT Threshold ON;
-- Stage 1
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(1, 1, 'Temperature', 22, 26),
(2, 1, 'SoilHumidity', 70, 85);
-- Stage 2
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(3, 2, 'Temperature', 24, 28),
(4, 2, 'SoilHumidity', 65, 80);
-- Stage 3
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(5, 3, 'Temperature', 22, 26),
(6, 3, 'SoilHumidity', 60, 75);
-- Stage 4
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(7, 4, 'Temperature', 20, 24),
(8, 4, 'SoilHumidity', 55, 70);
-- Stage 5
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(9, 5, 'Temperature', 20, 24),
(10, 5, 'SoilHumidity', 65, 80);
-- Stage 6
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(11, 6, 'Temperature', 22, 26),
(12, 6, 'SoilHumidity', 60, 75);
-- Stage 7
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(13, 7, 'Temperature', 20, 24),
(14, 7, 'SoilHumidity', 55, 70);
-- Stage 8
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(15, 8, 'Temperature', 24, 28),
(16, 8, 'SoilHumidity', 75, 90);
-- Stage 9
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(17, 9, 'Temperature', 26, 30),
(18, 9, 'SoilHumidity', 70, 85);
-- Stage 10
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(19, 10, 'Temperature', 24, 28),
(20, 10, 'SoilHumidity', 65, 80);
-- Stage 11
INSERT INTO Threshold (threshold_id, stage_id, metric_type, min_value, max_value) VALUES
(21, 11, 'Temperature', 22, 26),
(22, 11, 'SoilHumidity', 60, 75);
SET IDENTITY_INSERT Threshold OFF;
GO

-- 11. AlertLog (Alerts)
SET IDENTITY_INSERT AlertLog ON;
INSERT INTO AlertLog (alert_id, zone_id, message, severity, status, created_at, resolved_at, acknowledged_by, escalation_level) VALUES
(1, 1, N'Nhiệt độ tại Nhà kính A vượt ngưỡng cấu hình (28°C) liên tục trong 10 phút', 'CRITICAL', 'UNSOLVED', DATEADD(MINUTE, -15, GETDATE()), NULL, NULL, 2),
(2, 2, N'Độ ẩm đất giảm xuống 45%, thấp hơn ngưỡng tối thiểu 60%', 'WARNING', 'ACKNOWLEDGED', DATEADD(MINUTE, -30, GETDATE()), NULL, 'Nguyễn Văn A', 1),
(3, 3, N'Cảm biến #CS-04 không phản hồi heartbeat trong 5 phút', 'WARNING', 'UNSOLVED', DATEADD(MINUTE, -5, GETDATE()), NULL, NULL, 1),
(4, 1, N'Hệ thống phun sương cần bảo trì sau 30 ngày hoạt động', 'SIGNIFICANT', 'UNSOLVED', DATEADD(DAY, -1, GETDATE()), NULL, NULL, 0),
(5, 3, N'Nhiệt độ tại Nhà kính B lên đến 32°C, có nguy cơ ảnh hưởng đến cây trồng', 'CRITICAL', 'UNSOLVED', DATEADD(MINUTE, -20, GETDATE()), NULL, NULL, 2);
SET IDENTITY_INSERT AlertLog OFF;
GO

-- 12. Log
SET IDENTITY_INSERT [Log] ON;
INSERT INTO [Log] (log_id, device_id, user_id, action, triggered_by, log_time) VALUES
(1, 3, 3, N'OVERRIDE: AUTO → MANUAL', 'USER', DATEADD(MINUTE, -5, GETDATE())),
(2, 1, 2, N'UPDATE: Công thức Hoa Hồng #1 - Giai đoạn 2, 15 ngày → 18 ngày', 'USER', DATEADD(MINUTE, -10, GETDATE())),
(3, 9, 3, N'CREATE: Thiết bị mới Cảm biến nhiệt độ #5', 'USER', DATEADD(MINUTE, -15, GETDATE())),
(4, 1, 4, N'UPDATE: Cấu hình cảnh báo - Nhiệt độ, ngưỡng 26°C → 28°C', 'USER', DATEADD(MINUTE, -30, GETDATE())),
(5, 9, 2, N'CREATE: Công thức mới Hoa Lan #2', 'USER', DATEADD(HOUR, -1, GETDATE())),
(6, 7, 3, N'DELETE: Cảm biến cũ #CS-01', 'USER', DATEADD(HOUR, -2, GETDATE())),
(7, 2, 4, N'UPDATE: Cảm biến nhiệt độ #2 - Trạng thái OFFLINE → ONLINE', 'USER', DATEADD(MINUTE, -7.5, GETDATE()));
SET IDENTITY_INSERT [Log] OFF;
GO

-- 13. SensorData (không có dữ liệu thực, có thể thêm sau)
-- 14. ZoneExpanded và selectedZone không cần lưu trong DB (chỉ front-end)
-- 15. GrowthAdjustId, pendingDeviceId, currentUser không cần lưu

-- ============================================
-- KẾT THÚC SCRIPT
-- ============================================