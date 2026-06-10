/**
 * state.js
 * Quản lý trạng thái toàn cục của ứng dụng (dữ liệu mô phỏng).
 * Sau này có thể thay thế bằng dữ liệu thật từ API.
 */

export const state = {
    // -------------------- THIẾT BỊ IOT --------------------
    devices: [
        {
            id: '1',
            name: 'Cảm biến nhiệt độ #1',
            type: 'Temperature',
            macAddress: 'AA:BB:CC:DD:EE:01',
            zone: 'Khu A - Giàn 1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: 85
        },
        {
            id: '2',
            name: 'Cảm biến độ ẩm #1',
            type: 'Humidity',
            macAddress: 'AA:BB:CC:DD:EE:02',
            zone: 'Khu A - Giàn 1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: 92
        },
        {
            id: '3',
            name: 'Bộ điều khiển phun sương',
            type: 'Actuator',
            macAddress: 'AA:BB:CC:DD:EE:03',
            zone: 'Khu A - Giàn 2',
            status: 'ACTIVE',
            lastHeartbeat: new Date()
        },
        {
            id: '4',
            name: 'Cảm biến ánh sáng #1',
            type: 'Light',
            macAddress: 'AA:BB:CC:DD:EE:04',
            zone: 'Khu B - Giàn 1',
            status: 'OFFLINE',
            lastHeartbeat: new Date(Date.now() - 300000),  // 5 phút trước
            batteryLevel: undefined
        },
        {
            id: '5',
            name: 'Cảm biến CO2 #1',
            type: 'CO2',
            macAddress: 'AA:BB:CC:DD:EE:05',
            zone: 'Khu B - Giàn 2',
            status: 'NEEDS_REPLACEMENT',
            lastHeartbeat: new Date(Date.now() - 180000), // 3 phút trước
            batteryLevel: 12
        },
        {
            id: '6',
            name: 'Thiết bị mới #1',
            type: 'Temperature',
            macAddress: 'AA:BB:CC:DD:EE:06',
            zone: '',
            status: 'PENDING',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        }
    ],
    pendingDeviceId: null,  // Lưu ID thiết bị đang chờ phê duyệt

    // -------------------- CẤU TRÚC VÙNG (CÂY PHÂN CẤP) --------------------
    zones: [
        {
            id: 'farm-1',
            name: 'Khu trại Đà Lạt',
            type: 'farm',
            children: [
                {
                    id: 'gh-1',
                    name: 'Nhà kính A',
                    type: 'greenhouse',
                    children: [
                        {
                            id: 'zone-1',
                            name: 'Khu vực 1 - Hoa Hồng',
                            type: 'zone',
                            temperature: 24.5,
                            humidity: 72,
                            status: 'optimal',
                            children: [
                                { id: 'rack-1', name: 'Giàn 1', type: 'rack', devices: 5 },
                                { id: 'rack-2', name: 'Giàn 2', type: 'rack', devices: 4 }
                            ]
                        },
                        {
                            id: 'zone-2',
                            name: 'Khu vực 2 - Hoa Cúc',
                            type: 'zone',
                            temperature: 22.8,
                            humidity: 68,
                            status: 'normal',
                            children: [
                                { id: 'rack-3', name: 'Giàn 1', type: 'rack', devices: 6 }
                            ]
                        }
                    ]
                },
                {
                    id: 'gh-2',
                    name: 'Nhà kính B',
                    type: 'greenhouse',
                    children: [
                        {
                            id: 'zone-3',
                            name: 'Khu vực 1 - Hoa Lan',
                            type: 'zone',
                            temperature: 26.2,
                            humidity: 80,
                            status: 'high',
                            children: [
                                { id: 'rack-4', name: 'Giàn 1', type: 'rack', devices: 7 },
                                { id: 'rack-5', name: 'Giàn 2', type: 'rack', devices: 5 }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    zoneExpanded: { 'farm-1': true, 'gh-1': true },   // Trạng thái mở rộng của các node
    selectedZone: null,                               // Vùng đang được chọn để hiển thị chi tiết

    // -------------------- CÔNG THỨC SINH TRƯỞNG --------------------
    formulas: [
        {
            id: '1',
            name: 'Công thức Hoa Hồng #1',
            flowerType: 'Hoa Hồng',
            zone: 'Khu A - Vùng 1',
            startDate: '20/05/2026',
            status: 'active',   // active, delayed, completed
            stages: [
                { id: 's1', name: 'Giai đoạn ươm', duration: 10, temperature: 24, soilHumidity: 80, completed: true, currentDay: 10 },
                { id: 's2', name: 'Phát triển lá', duration: 15, temperature: 25, soilHumidity: 75, completed: false, currentDay: 8 },
                { id: 's3', name: 'Ra nụ', duration: 12, temperature: 23, soilHumidity: 70, completed: false },
                { id: 's4', name: 'Nở hoa', duration: 8, temperature: 22, soilHumidity: 65, completed: false }
            ]
        },
        {
            id: '2',
            name: 'Công thức Hoa Cúc #1',
            flowerType: 'Hoa Cúc',
            zone: 'Khu A - Vùng 2',
            startDate: '25/05/2026',
            status: 'delayed',
            stages: [
                { id: 's5', name: 'Giai đoạn ươm', duration: 8, temperature: 22, soilHumidity: 75, completed: true, currentDay: 8 },
                { id: 's6', name: 'Phát triển', duration: 18, temperature: 23, soilHumidity: 70, completed: false, currentDay: 12 },
                { id: 's7', name: 'Ra nụ', duration: 10, temperature: 21, soilHumidity: 68, completed: false }
            ]
        },
        {
            id: '3',
            name: 'Công thức Hoa Lan #1',
            flowerType: 'Hoa Lan',
            zone: 'Khu B - Vùng 1',
            startDate: '15/05/2026',
            status: 'active',
            stages: [
                { id: 's8', name: 'Giai đoạn ươm', duration: 14, temperature: 26, soilHumidity: 85, completed: true, currentDay: 14 },
                { id: 's9', name: 'Phát triển lá', duration: 20, temperature: 27, soilHumidity: 80, completed: true, currentDay: 20 },
                { id: 's10', name: 'Ra nụ', duration: 15, temperature: 25, soilHumidity: 78, completed: false, currentDay: 5 },
                { id: 's11', name: 'Nở hoa', duration: 10, temperature: 24, soilHumidity: 75, completed: false }
            ]
        }
    ],
    growthAdjustId: null,   // ID công thức đang được điều chỉnh chu kỳ

    // -------------------- THIẾT BỊ ĐIỀU KHIỂN --------------------
    controls: [
        { id: '1', name: 'Hệ thống phun sương', icon: '💧', zone: 'Khu A', mode: 'AUTO', isActive: true, value: 75, autoResetTime: null },
        { id: '2', name: 'Quạt thông gió', icon: '💨', zone: 'Khu A', mode: 'AUTO', isActive: false, value: 0, autoResetTime: null },
        { id: '3', name: 'Đèn chiếu sáng', icon: '💡', zone: 'Khu B', mode: 'MANUAL', isActive: true, value: 100, autoResetTime: new Date(Date.now() + 7200000) }, // tự động reset sau 2h
        { id: '4', name: 'Điều hòa nhiệt độ', icon: '❄️', zone: 'Khu B', mode: 'AUTO', isActive: true, value: 60, autoResetTime: null }
    ],

    // -------------------- CẢNH BÁO --------------------
    alerts: [
        {
            id: '1',
            title: 'Nhiệt độ vượt ngưỡng',
            description: 'Nhiệt độ tại Khu A vượt ngưỡng cấu hình (28°C) liên tục trong 10 phút',
            severity: 'critical',
            status: 'active',         // active, acknowledged, resolved
            zone: 'Khu A - Vùng 1',
            timestamp: new Date(Date.now() - 900000),  // 15 phút trước
            escalationLevel: 2
        },
        {
            id: '2',
            title: 'Độ ẩm đất thấp',
            description: 'Độ ẩm đất giảm xuống 45%, thấp hơn ngưỡng tối thiểu 60%',
            severity: 'warning',
            status: 'acknowledged',
            zone: 'Khu B - Vùng 2',
            timestamp: new Date(Date.now() - 1800000), // 30 phút trước
            escalationLevel: 1,
            acknowledgedBy: 'Nguyễn Văn A'
        },
        {
            id: '3',
            title: 'Cảm biến mất kết nối',
            description: 'Cảm biến #CS-04 không phản hồi heartbeat trong 5 phút',
            severity: 'warning',
            status: 'active',
            zone: 'Khu A - Vùng 2',
            timestamp: new Date(Date.now() - 300000), // 5 phút trước
            escalationLevel: 1
        },
        {
            id: '4',
            title: 'Bảo trì định kỳ',
            description: 'Hệ thống phun sương cần bảo trì sau 30 ngày hoạt động',
            severity: 'info',
            status: 'active',
            zone: 'Khu A',
            timestamp: new Date(Date.now() - 86400000), // 1 ngày trước
            escalationLevel: 0
        }
    ],

    // -------------------- NHẬT KÝ HỆ THỐNG (AUDIT TRAIL) --------------------
    logs: [
        {
            id: '1',
            timestamp: new Date(Date.now() - 300000), // 5 phút trước
            userId: 'U001',
            userName: 'Nguyễn Văn A',
            userRole: 'Operator',
            action: 'OVERRIDE',
            resource: 'Hệ thống phun sương - Khu A',
            oldValue: 'AUTO',
            newValue: 'MANUAL',
            ipAddress: '192.168.1.105'
        },
        {
            id: '2',
            timestamp: new Date(Date.now() - 600000), // 10 phút trước
            userId: 'U002',
            userName: 'Trần Thị B',
            userRole: 'Agronomist',
            action: 'UPDATE',
            resource: 'Công thức Hoa Hồng #1 - Giai đoạn 2',
            oldValue: '15 ngày',
            newValue: '18 ngày (+3)',
            ipAddress: '192.168.1.102'
        },
        {
            id: '3',
            timestamp: new Date(Date.now() - 900000), // 15 phút trước
            userId: 'U001',
            userName: 'Nguyễn Văn A',
            userRole: 'Operator',
            action: 'CREATE',
            resource: 'Thiết bị mới: Cảm biến nhiệt độ #5',
            newValue: 'Gán vào Khu B - Giàn 3',
            ipAddress: '192.168.1.105'
        },
        {
            id: '4',
            timestamp: new Date(Date.now() - 1800000), // 30 phút trước
            userId: 'U003',
            userName: 'Lê Văn C',
            userRole: 'Super Admin',
            action: 'UPDATE',
            resource: 'Cấu hình cảnh báo - Nhiệt độ',
            oldValue: 'Ngưỡng: 26°C',
            newValue: 'Ngưỡng: 28°C',
            ipAddress: '192.168.1.101'
        },
        {
            id: '5',
            timestamp: new Date(Date.now() - 3600000), // 1 giờ trước
            userId: 'U002',
            userName: 'Trần Thị B',
            userRole: 'Agronomist',
            action: 'CREATE',
            resource: 'Công thức mới: Hoa Lan #2',
            newValue: '4 giai đoạn, 57 ngày',
            ipAddress: '192.168.1.102'
        },
        {
            id: '6',
            timestamp: new Date(Date.now() - 7200000), // 2 giờ trước
            userId: 'U001',
            userName: 'Nguyễn Văn A',
            userRole: 'Operator',
            action: 'DELETE',
            resource: 'Thiết bị: Cảm biến cũ #CS-01',
            oldValue: 'Khu A - Giàn 1',
            ipAddress: '192.168.1.105'
        }
    ]
};