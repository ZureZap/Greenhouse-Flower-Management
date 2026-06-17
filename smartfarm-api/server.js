// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getConnection, sql } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ======================================================================
// 1. API AUTH (Đăng nhập, đăng ký, lấy thông tin user)
// ======================================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const pool = await getConnection();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query(`
                SELECT user_id AS id, user_name AS username, email, phone_number, role, status
                FROM [User]
                WHERE (user_name = @username OR email = @username) AND password = @password
            `);
        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
        }
        const user = result.recordset[0];
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Tài khoản chưa được phê duyệt' });
        }
        // Tạo token giả (trong thực tế nên dùng JWT)
        const token = 'fake-jwt-token-' + Date.now();
        res.json({ ...user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email, phone, role } = req.body;
        const pool = await getConnection();
        // Kiểm tra tồn tại
        const check = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query(`SELECT * FROM [User] WHERE user_name = @username OR email = @email`);
        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã tồn tại' });
        }
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone)
            .input('role', sql.NVarChar, role || 'Nhân viên vận hành')
            .query(`
                INSERT INTO [User] (user_name, password, email, phone_number, role, status)
                OUTPUT INSERTED.user_id AS id, INSERTED.user_name AS username, INSERTED.email, INSERTED.phone_number, INSERTED.role, INSERTED.status
                VALUES (@username, @password, @email, @phone, @role, 'PENDING')
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
    try {
        // Tạm thời lấy user từ token (giả lập)
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const userId = token.split('-').pop(); // lấy phần cuối làm userId
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT user_id AS id, user_name AS username, email, phone_number, role, status FROM [User] WHERE user_id = @id`);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 2. API USERS (quản lý tài khoản – chỉ OWNER)
// ======================================================================

// GET /api/users
app.get('/api/users', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT user_id AS id, user_name AS username, email, phone_number, role, status FROM [User]
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id/role
app.put('/api/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('role', sql.NVarChar, role)
            .query(`UPDATE [User] SET role = @role WHERE user_id = @id`);
        res.json({ message: 'Cập nhật role thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id/status (phê duyệt / từ chối)
app.put('/api/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'ACTIVE' hoặc 'REJECTED' (xóa)
        const pool = await getConnection();
        if (status === 'REJECTED') {
            await pool.request()
                .input('id', sql.Int, id)
                .query(`DELETE FROM [User] WHERE user_id = @id`);
        } else {
            await pool.request()
                .input('id', sql.Int, id)
                .input('status', sql.NVarChar, status)
                .query(`UPDATE [User] SET status = @status WHERE user_id = @id`);
        }
        res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 3. API FARMS & GREENHOUSES
// ======================================================================

app.get('/api/farms', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT farm_id AS id, farm_name AS name, address, owner_id FROM Farm
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/greenhouses', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT greenhouse_id AS id, farm_id, greenhouse_name AS name, location_gps FROM Greenhouse
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/greenhouses/:farmId', async (req, res) => {
    try {
        const { farmId } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('farmId', sql.Int, farmId)
            .query(`
                SELECT greenhouse_id AS id, farm_id, greenhouse_name AS name, location_gps
                FROM Greenhouse WHERE farm_id = @farmId
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 4. API ZONES (cây phân cấp – dùng CTE đệ quy)
// ======================================================================

app.get('/api/zones', async (req, res) => {
    try {
        const pool = await getConnection();
        // Dùng CAST ở phần Anchor để đồng bộ kiểu dữ liệu (NVARCHAR(20) và INT)
        const result = await pool.request().query(`
            WITH ZoneTree AS (
                -- Lấy tất cả Farm (root) - Ép kiểu rõ ràng ở đây
                SELECT 
                    farm_id AS id,
                    farm_name AS name,
                    CAST('farm' AS NVARCHAR(20)) AS type,
                    CAST(NULL AS INT) AS parent_id,
                    0 AS level,
                    CAST(farm_id AS NVARCHAR(MAX)) AS path
                FROM Farm
                UNION ALL
                -- Greenhouse
                SELECT 
                    greenhouse_id AS id,
                    greenhouse_name AS name,
                    CAST('greenhouse' AS NVARCHAR(20)) AS type,
                    farm_id AS parent_id,
                    level + 1,
                    path + ':' + CAST(greenhouse_id AS NVARCHAR(10))
                FROM Greenhouse g
                INNER JOIN ZoneTree zt ON g.farm_id = zt.id AND zt.type = 'farm'
                UNION ALL
                -- Zone
                SELECT 
                    zone_id AS id,
                    zone_name AS name,
                    CAST('zone' AS NVARCHAR(20)) AS type,
                    greenhouse_id AS parent_id,
                    level + 1,
                    path + ':' + CAST(zone_id AS NVARCHAR(10))
                FROM Zone z
                INNER JOIN ZoneTree zt ON z.greenhouse_id = zt.id AND zt.type = 'greenhouse'
            )
            SELECT * FROM ZoneTree ORDER BY path
        `);
        // Trả về danh sách flat, front-end sẽ parse thành cây
        res.json(result.recordset);
    } catch (err) {
        console.error('GET /api/zones error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 5. API DEVICES (đã có, giữ nguyên)
// ======================================================================

app.get('/api/devices', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                device_id AS id,
                device_name AS name,
                device_type,
                metric_type,
                mac_address AS macAddress,
                zone_id,
                gateway_id,
                status,
                battery_level AS batteryLevel,
                last_heartbeat AS lastHeartbeat
            FROM Device
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    device_id AS id,
                    device_name AS name,
                    device_type,
                    metric_type,
                    mac_address AS macAddress,
                    zone_id,
                    gateway_id,
                    status,
                    battery_level AS batteryLevel,
                    last_heartbeat AS lastHeartbeat
                FROM Device WHERE device_id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const { name, device_type, metric_type, macAddress, zone_id, gateway_id, batteryLevel } = req.body;
        const pool = await getConnection();
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('device_type', sql.NVarChar, device_type)
            .input('metric_type', sql.NVarChar, metric_type)
            .input('macAddress', sql.NVarChar, macAddress)
            .input('zone_id', sql.Int, zone_id)
            .input('gateway_id', sql.Int, gateway_id)
            .input('batteryLevel', sql.Int, batteryLevel)
            .input('status', sql.NVarChar, 'ACTIVE')
            .input('lastHeartbeat', sql.DateTime2, new Date())
            .query(`
                INSERT INTO Device (device_name, device_type, metric_type, mac_address, zone_id, gateway_id, battery_level, status, last_heartbeat)
                OUTPUT INSERTED.device_id AS id
                VALUES (@name, @device_type, @metric_type, @macAddress, @zone_id, @gateway_id, @batteryLevel, @status, @lastHeartbeat)
            `);
        const newId = result.recordset[0].id;
        if (device_type === 'OUTPUT_DEVICE') {
            await pool.request()
                .input('device_id', sql.Int, newId)
                .input('mode', sql.NVarChar, 'AUTO')
                .input('is_active', sql.Bit, 0)
                .input('value_percent', sql.Int, 0)
                .query(`
                    INSERT INTO ControlProperties (device_id, mode, is_active, value_percent, auto_reset_time)
                    VALUES (@device_id, @mode, @is_active, @value_percent, NULL)
                `);
        }
        res.status(201).json({ id: newId, message: 'Thêm thiết bị thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, device_type, metric_type, macAddress, zone_id, gateway_id, status, batteryLevel } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('device_type', sql.NVarChar, device_type)
            .input('metric_type', sql.NVarChar, metric_type)
            .input('macAddress', sql.NVarChar, macAddress)
            .input('zone_id', sql.Int, zone_id)
            .input('gateway_id', sql.Int, gateway_id)
            .input('status', sql.NVarChar, status)
            .input('batteryLevel', sql.Int, batteryLevel)
            .query(`
                UPDATE Device SET
                    device_name = @name,
                    device_type = @device_type,
                    metric_type = @metric_type,
                    mac_address = @macAddress,
                    zone_id = @zone_id,
                    gateway_id = @gateway_id,
                    status = @status,
                    battery_level = @batteryLevel
                WHERE device_id = @id
            `);
        res.json({ message: 'Cập nhật thiết bị thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Device WHERE device_id = @id`);
        res.json({ message: 'Xóa thiết bị thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 6. API CONTROL PROPERTIES
// ======================================================================

app.get('/api/control-properties', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                cp.device_id,
                cp.mode,
                cp.is_active AS isActive,
                cp.value_percent AS valuePercent,
                cp.auto_reset_time AS autoResetTime,
                d.device_name AS name,
                d.zone_id,
                d.gateway_id
            FROM ControlProperties cp
            JOIN Device d ON cp.device_id = d.device_id
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/control-properties/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { mode, isActive, valuePercent, autoResetTime } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('deviceId', sql.Int, deviceId)
            .input('mode', sql.NVarChar, mode)
            .input('isActive', sql.Bit, isActive)
            .input('valuePercent', sql.Int, valuePercent)
            .input('autoResetTime', sql.DateTime2, autoResetTime)
            .query(`
                UPDATE ControlProperties SET
                    mode = @mode,
                    is_active = @isActive,
                    value_percent = @valuePercent,
                    auto_reset_time = @autoResetTime
                WHERE device_id = @deviceId
            `);
        res.json({ message: 'Cập nhật control property thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 7. API GATEWAYS
// ======================================================================

app.get('/api/gateways', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT gateway_id AS id, greenhouse_id, status, gateway_address AS address
            FROM Gateway
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 8. API RECIPES (Công thức sinh trưởng)
// ======================================================================

app.get('/api/recipes', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                recipe_id AS id,
                recipe_name AS name,
                flower_type,
                creator AS creator_id,
                description,
                status,
                created_date
            FROM Recipe
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    recipe_id AS id,
                    recipe_name AS name,
                    flower_type,
                    creator AS creator_id,
                    description,
                    status,
                    created_date
                FROM Recipe WHERE recipe_id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy công thức' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recipes', async (req, res) => {
    try {
        const { name, flower_type, creator_id, description, status, created_date } = req.body;
        const pool = await getConnection();
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('flower_type', sql.NVarChar, flower_type)
            .input('creator_id', sql.Int, creator_id)
            .input('description', sql.NVarChar, description)
            .input('status', sql.NVarChar, status || 'active')
            .input('created_date', sql.Date, created_date || new Date().toISOString().slice(0,10))
            .query(`
                INSERT INTO Recipe (recipe_name, flower_type, creator, description, status, created_date)
                OUTPUT INSERTED.recipe_id AS id
                VALUES (@name, @flower_type, @creator_id, @description, @status, @created_date)
            `);
        res.status(201).json({ id: result.recordset[0].id, message: 'Thêm công thức thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, flower_type, creator_id, description, status, created_date } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('flower_type', sql.NVarChar, flower_type)
            .input('creator_id', sql.Int, creator_id)
            .input('description', sql.NVarChar, description)
            .input('status', sql.NVarChar, status)
            .input('created_date', sql.Date, created_date)
            .query(`
                UPDATE Recipe SET
                    recipe_name = @name,
                    flower_type = @flower_type,
                    creator = @creator_id,
                    description = @description,
                    status = @status,
                    created_date = @created_date
                WHERE recipe_id = @id
            `);
        res.json({ message: 'Cập nhật công thức thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Recipe WHERE recipe_id = @id`);
        res.json({ message: 'Xóa công thức thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 9. API GROWTH STAGES & THRESHOLDS
// ======================================================================

app.get('/api/recipes/:recipeId/stages', async (req, res) => {
    try {
        const { recipeId } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('recipeId', sql.Int, recipeId)
            .query(`
                SELECT 
                    stage_id AS id,
                    stage_name AS name,
                    start_day,
                    end_day,
                    completed,
                    current_day AS currentDay
                FROM GrowthStage
                WHERE recipe_id = @recipeId
                ORDER BY start_day
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stages/:stageId/thresholds', async (req, res) => {
    try {
        const { stageId } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('stageId', sql.Int, stageId)
            .query(`
                SELECT 
                    threshold_id AS id,
                    metric_type,
                    min_value,
                    max_value
                FROM Threshold
                WHERE stage_id = @stageId
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 10. API ALERTS
// ======================================================================

app.get('/api/alerts', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                alert_id AS id,
                zone_id,
                message AS description,
                severity,
                status,
                created_at AS timestamp,
                resolved_at,
                acknowledged_by AS acknowledgedBy,
                escalation_level AS escalationLevel
            FROM AlertLog
        `);
        // Chuyển đổi severity: 'SIGNIFICANT' → 'info', 'WARNING' → 'warning', 'CRITICAL' → 'critical'
        const alerts = result.recordset.map(a => ({
            ...a,
            severity: a.severity === 'SIGNIFICANT' ? 'info' : a.severity.toLowerCase()
        }));
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/alerts/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, acknowledgedBy } = req.body; // 'ACKNOWLEDGED', 'RESOLVED'
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar, status)
            .input('acknowledgedBy', sql.NVarChar, acknowledgedBy)
            .input('resolvedAt', sql.DateTime2, status === 'RESOLVED' ? new Date() : null)
            .query(`
                UPDATE AlertLog SET
                    status = @status,
                    acknowledged_by = @acknowledgedBy,
                    resolved_at = @resolvedAt
                WHERE alert_id = @id
            `);
        res.json({ message: 'Cập nhật trạng thái cảnh báo thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM AlertLog WHERE alert_id = @id`);
        res.json({ message: 'Xóa cảnh báo thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 11. API LOGS
// ======================================================================

app.get('/api/logs', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                log_id AS id,
                device_id,
                user_id,
                action,
                triggered_by AS triggeredBy,
                log_time AS timestamp
            FROM [Log]
            ORDER BY log_time DESC
        `);
        // Lấy thêm thông tin user và device nếu cần (có thể join)
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 12. API STATISTICS (cho Dashboard)
// ======================================================================

app.get('/api/stats/greenhouse/:greenhouseId', async (req, res) => {
    try {
        const { greenhouseId } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('greenhouseId', sql.Int, greenhouseId)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM Device d JOIN Zone z ON d.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId) AS totalDevices,
                    (SELECT COUNT(*) FROM Device d JOIN Zone z ON d.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND d.status = 'ONLINE') AS activeDevices,
                    (SELECT COUNT(*) FROM Device d JOIN Zone z ON d.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND d.status = 'OFFLINE') AS offlineDevices,
                    (SELECT COUNT(*) FROM Device d JOIN Zone z ON d.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND d.status = 'NEEDS_REPLACEMENT') AS needReplace,
                    (SELECT COUNT(*) FROM AlertLog a JOIN Zone z ON a.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND a.status != 'RESOLVED') AS activeAlerts,
                    (SELECT COUNT(*) FROM AlertLog a JOIN Zone z ON a.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND a.severity = 'CRITICAL' AND a.status != 'RESOLVED') AS criticalAlerts,
                    (SELECT COUNT(*) FROM AlertLog a JOIN Zone z ON a.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND a.severity = 'WARNING' AND a.status != 'RESOLVED') AS warningAlerts,
                    (SELECT COUNT(*) FROM AlertLog a JOIN Zone z ON a.zone_id = z.zone_id WHERE z.greenhouse_id = @greenhouseId AND a.severity = 'SIGNIFICANT' AND a.status != 'RESOLVED') AS infoAlerts,
                    (SELECT COUNT(*) FROM Zone WHERE greenhouse_id = @greenhouseId) AS totalZones,
                    (SELECT COUNT(*) FROM Zone WHERE greenhouse_id = @greenhouseId AND recipe_id IS NOT NULL) AS zonesWithRecipe
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 13. API GLOBAL STATS (tổng hợp tất cả)
// ======================================================================

app.get('/api/stats/global', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Device) AS totalDevices,
                (SELECT COUNT(*) FROM Device WHERE status = 'ONLINE') AS activeDevices,
                (SELECT COUNT(*) FROM Device WHERE status = 'OFFLINE') AS offlineDevices,
                (SELECT COUNT(*) FROM Device WHERE status = 'NEEDS_REPLACEMENT') AS needReplace,
                (SELECT COUNT(*) FROM AlertLog WHERE status != 'RESOLVED') AS activeAlerts,
                (SELECT COUNT(*) FROM AlertLog WHERE severity = 'CRITICAL' AND status != 'RESOLVED') AS criticalAlerts,
                (SELECT COUNT(*) FROM AlertLog WHERE severity = 'WARNING' AND status != 'RESOLVED') AS warningAlerts,
                (SELECT COUNT(*) FROM AlertLog WHERE severity = 'SIGNIFICANT' AND status != 'RESOLVED') AS infoAlerts,
                (SELECT COUNT(*) FROM Zone) AS totalZones,
                (SELECT COUNT(*) FROM Zone WHERE recipe_id IS NOT NULL) AS zonesWithRecipe
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 14. API ZONES CRUD
// ======================================================================

// POST /api/zones - Thêm mới vùng (farm, greenhouse, zone)
app.post('/api/zones', async (req, res) => {
    try {
        const { name, type, parent_id, greenhouse_id, recipe_id, start_date, temperature, humidity, status } = req.body;
        const pool = await getConnection();

        let newId = null;

        if (type === 'farm') {
            // Thêm farm - owner_id tạm lấy từ user đăng nhập (mặc định 1)
            const ownerId = 1; // TODO: lấy từ token thực tế
            const result = await pool.request()
                .input('name', sql.NVarChar, name)
                .input('ownerId', sql.Int, ownerId)
                .query(`
                    INSERT INTO Farm (farm_name, owner_id, address)
                    OUTPUT INSERTED.farm_id AS id
                    VALUES (@name, @ownerId, '')
                `);
            newId = result.recordset[0].id;
        } else if (type === 'greenhouse') {
            // Thêm greenhouse - cần farm_id từ parent_id
            if (!parent_id) {
                return res.status(400).json({ error: 'Thiếu farm_id (parent_id)' });
            }
            // Kiểm tra parent_id có tồn tại trong Farm không
            const checkFarm = await pool.request()
                .input('farmId', sql.Int, parent_id)
                .query('SELECT farm_id FROM Farm WHERE farm_id = @farmId');
            if (checkFarm.recordset.length === 0) {
                return res.status(400).json({ error: 'Farm không tồn tại' });
            }
            const result = await pool.request()
                .input('name', sql.NVarChar, name)
                .input('farmId', sql.Int, parent_id)
                .query(`
                    INSERT INTO Greenhouse (greenhouse_name, farm_id, location_gps)
                    OUTPUT INSERTED.greenhouse_id AS id
                    VALUES (@name, @farmId, '')
                `);
            newId = result.recordset[0].id;
        } else if (type === 'zone') {
            // Thêm zone - cần greenhouse_id từ parent_id hoặc từ body
            let ghId = greenhouse_id || parent_id;
            if (!ghId) {
                return res.status(400).json({ error: 'Thiếu greenhouse_id hoặc parent_id' });
            }
            // Kiểm tra greenhouse tồn tại
            const checkGh = await pool.request()
                .input('ghId', sql.Int, ghId)
                .query('SELECT greenhouse_id FROM Greenhouse WHERE greenhouse_id = @ghId');
            if (checkGh.recordset.length === 0) {
                return res.status(400).json({ error: 'Greenhouse không tồn tại' });
            }
            const result = await pool.request()
                .input('name', sql.NVarChar, name)
                .input('ghId', sql.Int, ghId)
                .input('recipeId', sql.Int, recipe_id || null)
                .input('startDate', sql.Date, start_date || null)
                .input('temperature', sql.Decimal(5,2), temperature || null)
                .input('humidity', sql.Int, humidity || null)
                .input('status', sql.NVarChar, status || null)
                .query(`
                    INSERT INTO Zone (zone_name, greenhouse_id, recipe_id, start_date, temperature, humidity, status)
                    OUTPUT INSERTED.zone_id AS id
                    VALUES (@name, @ghId, @recipeId, @startDate, @temperature, @humidity, @status)
                `);
            newId = result.recordset[0].id;
        } else {
            return res.status(400).json({ error: 'Loại vùng không hợp lệ' });
        }

        res.status(201).json({ id: newId, message: 'Thêm vùng thành công' });
    } catch (err) {
        console.error('POST /api/zones error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/zones/:id - Cập nhật vùng (chỉ hỗ trợ zone)
app.put('/api/zones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, greenhouse_id, recipe_id, start_date, temperature, humidity, status } = req.body;
        const pool = await getConnection();

        // Kiểm tra zone tồn tại
        const checkZone = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT zone_id FROM Zone WHERE zone_id = @id');
        if (checkZone.recordset.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy vùng (zone)' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('recipeId', sql.Int, recipe_id || null)
            .input('startDate', sql.Date, start_date || null)
            .input('temperature', sql.Decimal(5,2), temperature || null)
            .input('humidity', sql.Int, humidity || null)
            .input('status', sql.NVarChar, status || null)
            .query(`
                UPDATE Zone SET
                    zone_name = @name,
                    recipe_id = @recipeId,
                    start_date = @startDate,
                    temperature = @temperature,
                    humidity = @humidity,
                    status = @status
                WHERE zone_id = @id
            `);

        res.json({ message: 'Cập nhật vùng thành công' });
    } catch (err) {
        console.error('PUT /api/zones/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/zones/:id - Xóa vùng (cascade)
app.delete('/api/zones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        // Kiểm tra xem id thuộc bảng nào
        const checkZone = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT zone_id FROM Zone WHERE zone_id = @id');
        if (checkZone.recordset.length > 0) {
            // Xóa zone
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Zone WHERE zone_id = @id');
            return res.json({ message: 'Xóa zone thành công' });
        }

        // Kiểm tra greenhouse
        const checkGreenhouse = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT greenhouse_id FROM Greenhouse WHERE greenhouse_id = @id');
        if (checkGreenhouse.recordset.length > 0) {
            // Xóa các zone thuộc greenhouse
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Zone WHERE greenhouse_id = @id');
            // Xóa greenhouse
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Greenhouse WHERE greenhouse_id = @id');
            return res.json({ message: 'Xóa greenhouse và các zone thành công' });
        }

        // Kiểm tra farm
        const checkFarm = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT farm_id FROM Farm WHERE farm_id = @id');
        if (checkFarm.recordset.length > 0) {
            // Lấy danh sách greenhouse trong farm
            const ghList = await pool.request()
                .input('farmId', sql.Int, id)
                .query('SELECT greenhouse_id FROM Greenhouse WHERE farm_id = @farmId');
            for (let gh of ghList.recordset) {
                await pool.request()
                    .input('ghId', sql.Int, gh.greenhouse_id)
                    .query('DELETE FROM Zone WHERE greenhouse_id = @ghId');
            }
            await pool.request()
                .input('farmId', sql.Int, id)
                .query('DELETE FROM Greenhouse WHERE farm_id = @farmId');
            await pool.request()
                .input('farmId', sql.Int, id)
                .query('DELETE FROM Farm WHERE farm_id = @farmId');
            return res.json({ message: 'Xóa farm và toàn bộ cấu trúc bên dưới thành công' });
        }

        res.status(404).json({ error: 'Không tìm thấy vùng' });
    } catch (err) {
        console.error('DELETE /api/zones/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// 15. API GROWTH STAGES (CRUD)
// ======================================================================

// POST /api/recipes/:recipeId/stages - Thêm stage mới
app.post('/api/recipes/:recipeId/stages', async (req, res) => {
    try {
        const { recipeId } = req.params;
        const { name, start_day, end_day, completed, currentDay, thresholds } = req.body;
        const pool = await getConnection();

        // Kiểm tra recipe tồn tại
        const checkRecipe = await pool.request()
            .input('recipeId', sql.Int, recipeId)
            .query('SELECT recipe_id FROM Recipe WHERE recipe_id = @recipeId');
        if (checkRecipe.recordset.length === 0) {
            return res.status(404).json({ error: 'Recipe không tồn tại' });
        }

        // Thêm stage
        const result = await pool.request()
            .input('recipeId', sql.Int, recipeId)
            .input('name', sql.NVarChar, name)
            .input('start_day', sql.Int, start_day)
            .input('end_day', sql.Int, end_day)
            .input('completed', sql.Bit, completed || false)
            .input('currentDay', sql.Int, currentDay || null)
            .query(`
                INSERT INTO GrowthStage (recipe_id, stage_name, start_day, end_day, completed, current_day)
                OUTPUT INSERTED.stage_id AS id
                VALUES (@recipeId, @name, @start_day, @end_day, @completed, @currentDay)
            `);
        const newStageId = result.recordset[0].id;

        // Thêm thresholds nếu có
        if (thresholds && thresholds.length > 0) {
            for (let th of thresholds) {
                await pool.request()
                    .input('stageId', sql.Int, newStageId)
                    .input('metric_type', sql.NVarChar, th.metric_type)
                    .input('min_value', sql.Decimal(10,2), th.min_value)
                    .input('max_value', sql.Decimal(10,2), th.max_value)
                    .query(`
                        INSERT INTO Threshold (stage_id, metric_type, min_value, max_value)
                        VALUES (@stageId, @metric_type, @min_value, @max_value)
                    `);
            }
        }

        res.status(201).json({ id: newStageId, message: 'Thêm stage thành công' });
    } catch (err) {
        console.error('POST /api/recipes/:recipeId/stages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/stages/:stageId - Cập nhật stage
app.put('/api/stages/:stageId', async (req, res) => {
    try {
        const { stageId } = req.params;
        const { name, start_day, end_day, completed, currentDay, thresholds } = req.body;
        const pool = await getConnection();

        // Kiểm tra stage tồn tại
        const checkStage = await pool.request()
            .input('stageId', sql.Int, stageId)
            .query('SELECT stage_id FROM GrowthStage WHERE stage_id = @stageId');
        if (checkStage.recordset.length === 0) {
            return res.status(404).json({ error: 'Stage không tồn tại' });
        }

        // Cập nhật stage
        await pool.request()
            .input('stageId', sql.Int, stageId)
            .input('name', sql.NVarChar, name)
            .input('start_day', sql.Int, start_day)
            .input('end_day', sql.Int, end_day)
            .input('completed', sql.Bit, completed)
            .input('currentDay', sql.Int, currentDay || null)
            .query(`
                UPDATE GrowthStage SET
                    stage_name = @name,
                    start_day = @start_day,
                    end_day = @end_day,
                    completed = @completed,
                    current_day = @currentDay
                WHERE stage_id = @stageId
            `);

        // Xóa thresholds cũ
        await pool.request()
            .input('stageId', sql.Int, stageId)
            .query('DELETE FROM Threshold WHERE stage_id = @stageId');

        // Thêm thresholds mới nếu có
        if (thresholds && thresholds.length > 0) {
            for (let th of thresholds) {
                await pool.request()
                    .input('stageId', sql.Int, stageId)
                    .input('metric_type', sql.NVarChar, th.metric_type)
                    .input('min_value', sql.Decimal(10,2), th.min_value)
                    .input('max_value', sql.Decimal(10,2), th.max_value)
                    .query(`
                        INSERT INTO Threshold (stage_id, metric_type, min_value, max_value)
                        VALUES (@stageId, @metric_type, @min_value, @max_value)
                    `);
            }
        }

        res.json({ message: 'Cập nhật stage thành công' });
    } catch (err) {
        console.error('PUT /api/stages/:stageId error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/stages/:stageId
app.delete('/api/stages/:stageId', async (req, res) => {
    try {
        const { stageId } = req.params;
        const pool = await getConnection();

        // Xóa thresholds trước
        await pool.request()
            .input('stageId', sql.Int, stageId)
            .query('DELETE FROM Threshold WHERE stage_id = @stageId');

        // Xóa stage
        await pool.request()
            .input('stageId', sql.Int, stageId)
            .query('DELETE FROM GrowthStage WHERE stage_id = @stageId');

        res.json({ message: 'Xóa stage thành công' });
    } catch (err) {
        console.error('DELETE /api/stages/:stageId error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ======================================================================
// Khởi động server
// ======================================================================

(async () => {
    try {
        const pool = await getConnection();
        console.log('✅ Database connected successfully');
        const test = await pool.request().query('SELECT 1 AS test');
        console.log('✅ Test query successful:', test.recordset);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
})();

app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});