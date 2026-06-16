/**
 * state.js
 * Quản lý trạng thái toàn cục của ứng dụng (dữ liệu mô phỏng).
 * Tuân thủ ERD với các bảng: Gateway, Device, Zone, Recipe, ...
 */

export const state = {
    // -------------------- GATEWAY --------------------
    gateways: [
        { id: 'gw-1', name: 'Gateway A', greenhouse_id: 'gh-1', status: 'ONLINE', gateway_address: '192.168.1.1' },
        { id: 'gw-2', name: 'Gateway B', greenhouse_id: 'gh-2', status: 'ONLINE', gateway_address: '192.168.1.2' }
    ],

    // -------------------- THIẾT BỊ IOT --------------------
    devices: [
        {
            id: 'dev-1',
            name: 'Cảm biến nhiệt độ #1',
            device_type: 'SENSOR',
            metric_type: 'Temperature',
            macAddress: 'AA:BB:CC:DD:EE:01',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: 85
        },
        {
            id: 'dev-2',
            name: 'Cảm biến độ ẩm #1',
            device_type: 'SENSOR',
            metric_type: 'Humidity',
            macAddress: 'AA:BB:CC:DD:EE:02',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: 92
        },
        {
            id: 'dev-3',
            name: 'Hệ thống phun sương',
            device_type: 'OUTPUT_DEVICE',
            metric_type: 'Actuator',
            macAddress: 'AA:BB:CC:DD:EE:03',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        },
        {
            id: 'dev-4',
            name: 'Quạt thông gió',
            device_type: 'OUTPUT_DEVICE',
            metric_type: 'Actuator',
            macAddress: 'AA:BB:CC:DD:EE:04',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        },
        {
            id: 'dev-5',
            name: 'Đèn chiếu sáng',
            device_type: 'OUTPUT_DEVICE',
            metric_type: 'Actuator',
            macAddress: 'AA:BB:CC:DD:EE:05',
            zone_id: 'zone-2',
            gateway_id: 'gw-2',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        },
        {
            id: 'dev-6',
            name: 'Điều hòa nhiệt độ',
            device_type: 'OUTPUT_DEVICE',
            metric_type: 'Actuator',
            macAddress: 'AA:BB:CC:DD:EE:06',
            zone_id: 'zone-2',
            gateway_id: 'gw-2',
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        },
        {
            id: 'dev-7',
            name: 'Cảm biến ánh sáng #1',
            device_type: 'SENSOR',
            metric_type: 'Light',
            macAddress: 'AA:BB:CC:DD:EE:07',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'OFFLINE',
            lastHeartbeat: new Date(Date.now() - 300000),
            batteryLevel: undefined
        },
        {
            id: 'dev-8',
            name: 'Cảm biến CO2 #1',
            device_type: 'SENSOR',
            metric_type: 'CO2',
            macAddress: 'AA:BB:CC:DD:EE:08',
            zone_id: 'zone-1',
            gateway_id: 'gw-1',
            status: 'NEEDS_REPLACEMENT',
            lastHeartbeat: new Date(Date.now() - 180000),
            batteryLevel: 12
        },
        {
            id: 'dev-9',
            name: 'Thiết bị mới #1',
            device_type: 'SENSOR',
            metric_type: 'Temperature',
            macAddress: 'AA:BB:CC:DD:EE:09',
            zone_id: null,
            gateway_id: null,
            status: 'PENDING',
            lastHeartbeat: new Date(),
            batteryLevel: undefined
        }
    ],
    pendingDeviceId: null,

    // -------------------- CONTROL PROPERTIES (1-1 với OUTPUT_DEVICE) --------------------
    controlProperties: [
        {
            device_id: 'dev-3',
            mode: 'AUTO',
            isActive: true,
            valuePercent: 75,
            autoResetTime: null
        },
        {
            device_id: 'dev-4',
            mode: 'AUTO',
            isActive: false,
            valuePercent: 0,
            autoResetTime: null
        },
        {
            device_id: 'dev-5',
            mode: 'MANUAL',
            isActive: true,
            valuePercent: 100,
            autoResetTime: new Date(Date.now() + 7200000)
        },
        {
            device_id: 'dev-6',
            mode: 'AUTO',
            isActive: true,
            valuePercent: 60,
            autoResetTime: null
        }
    ],

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
                            greenhouse_id: 'gh-1',
                            temperature: 24.5,
                            humidity: 72,
                            status: 'optimal',
                            recipe_id: 'rec-1',
                            children: [
                                { id: 'rack-1', name: 'Giàn 1', type: 'rack', devices: 5 },
                                { id: 'rack-2', name: 'Giàn 2', type: 'rack', devices: 4 }
                            ]
                        },
                        {
                            id: 'zone-2',
                            name: 'Khu vực 2 - Hoa Cúc',
                            type: 'zone',
                            greenhouse_id: 'gh-1',
                            temperature: 22.8,
                            humidity: 68,
                            status: 'normal',
                            recipe_id: 'rec-2',
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
                            greenhouse_id: 'gh-2',
                            temperature: 26.2,
                            humidity: 80,
                            status: 'high',
                            recipe_id: 'rec-3',
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
    zoneExpanded: { 'farm-1': true, 'gh-1': true },
    selectedZone: null,

    // -------------------- CÔNG THỨC (RECIPES) --------------------
    recipes: [
        {
            id: 'rec-1',
            name: 'Công thức Hoa Hồng',
            flower_type: 'Hoa Hồng',
            creator_id: 'u2',
            creator_name: 'Kỹ thuật viên A',
            description: 'Dành cho vụ xuân hè, ưa ẩm',
            created_date: '2025-03-01',
            status: 'active',
            stages: [
                {
                    id: 'st-1',
                    name: 'Giai đoạn ươm',
                    start_day: 1,
                    end_day: 10,
                    completed: true,
                    currentDay: 10,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 22, max_value: 26 },
                        { metric_type: 'SoilHumidity', min_value: 70, max_value: 85 }
                    ]
                },
                {
                    id: 'st-2',
                    name: 'Phát triển lá',
                    start_day: 11,
                    end_day: 25,
                    completed: false,
                    currentDay: 8,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 24, max_value: 28 },
                        { metric_type: 'SoilHumidity', min_value: 65, max_value: 80 }
                    ]
                },
                {
                    id: 'st-3',
                    name: 'Ra nụ',
                    start_day: 26,
                    end_day: 37,
                    completed: false,
                    currentDay: null,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 22, max_value: 26 },
                        { metric_type: 'SoilHumidity', min_value: 60, max_value: 75 }
                    ]
                },
                {
                    id: 'st-4',
                    name: 'Nở hoa',
                    start_day: 38,
                    end_day: 45,
                    completed: false,
                    currentDay: null,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 20, max_value: 24 },
                        { metric_type: 'SoilHumidity', min_value: 55, max_value: 70 }
                    ]
                }
            ]
        },
        {
            id: 'rec-2',
            name: 'Công thức Hoa Cúc',
            flower_type: 'Hoa Cúc',
            creator_id: 'u2',
            creator_name: 'Kỹ thuật viên A',
            description: 'Chịu hạn tốt, ít cần chăm sóc',
            created_date: '2025-03-15',
            status: 'delayed',
            stages: [
                {
                    id: 'st-5',
                    name: 'Giai đoạn ươm',
                    start_day: 1,
                    end_day: 8,
                    completed: true,
                    currentDay: 8,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 20, max_value: 24 },
                        { metric_type: 'SoilHumidity', min_value: 65, max_value: 80 }
                    ]
                },
                {
                    id: 'st-6',
                    name: 'Phát triển',
                    start_day: 9,
                    end_day: 26,
                    completed: false,
                    currentDay: 12,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 22, max_value: 26 },
                        { metric_type: 'SoilHumidity', min_value: 60, max_value: 75 }
                    ]
                },
                {
                    id: 'st-7',
                    name: 'Ra nụ',
                    start_day: 27,
                    end_day: 36,
                    completed: false,
                    currentDay: null,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 20, max_value: 24 },
                        { metric_type: 'SoilHumidity', min_value: 55, max_value: 70 }
                    ]
                }
            ]
        },
        {
            id: 'rec-3',
            name: 'Công thức Hoa Lan',
            flower_type: 'Hoa Lan',
            creator_id: 'u2',
            creator_name: 'Kỹ thuật viên A',
            description: 'Cần độ ẩm cao, ánh sáng vừa phải',
            created_date: '2025-03-10',
            status: 'active',
            stages: [
                {
                    id: 'st-8',
                    name: 'Giai đoạn ươm',
                    start_day: 1,
                    end_day: 14,
                    completed: true,
                    currentDay: 14,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 24, max_value: 28 },
                        { metric_type: 'SoilHumidity', min_value: 75, max_value: 90 }
                    ]
                },
                {
                    id: 'st-9',
                    name: 'Phát triển lá',
                    start_day: 15,
                    end_day: 34,
                    completed: true,
                    currentDay: 20,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 26, max_value: 30 },
                        { metric_type: 'SoilHumidity', min_value: 70, max_value: 85 }
                    ]
                },
                {
                    id: 'st-10',
                    name: 'Ra nụ',
                    start_day: 35,
                    end_day: 49,
                    completed: false,
                    currentDay: 5,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 24, max_value: 28 },
                        { metric_type: 'SoilHumidity', min_value: 65, max_value: 80 }
                    ]
                },
                {
                    id: 'st-11',
                    name: 'Nở hoa',
                    start_day: 50,
                    end_day: 59,
                    completed: false,
                    currentDay: null,
                    thresholds: [
                        { metric_type: 'Temperature', min_value: 22, max_value: 26 },
                        { metric_type: 'SoilHumidity', min_value: 60, max_value: 75 }
                    ]
                }
            ]
        }
    ],
    growthAdjustId: null,

    // -------------------- CẢNH BÁO (ALERTS) --------------------
    alerts: [
        {
            id: 'a1',
            title: 'Nhiệt độ vượt ngưỡng',
            description: 'Nhiệt độ tại Nhà kính A vượt ngưỡng cấu hình (28°C) liên tục trong 10 phút',
            severity: 'critical',
            status: 'active',
            zone_id: 'zone-1',
            zone: 'Khu vực 1 - Hoa Hồng', // tạm giữ để hiển thị, sau sẽ dùng zone_id
            timestamp: new Date(Date.now() - 900000),
            escalationLevel: 2
        },
        {
            id: 'a2',
            title: 'Độ ẩm đất thấp',
            description: 'Độ ẩm đất giảm xuống 45%, thấp hơn ngưỡng tối thiểu 60%',
            severity: 'warning',
            status: 'acknowledged',
            zone_id: 'zone-2',
            zone: 'Khu vực 2 - Hoa Cúc',
            timestamp: new Date(Date.now() - 1800000),
            escalationLevel: 1,
            acknowledgedBy: 'Nguyễn Văn A'
        },
        {
            id: 'a3',
            title: 'Cảm biến mất kết nối',
            description: 'Cảm biến #CS-04 không phản hồi heartbeat trong 5 phút',
            severity: 'warning',
            status: 'active',
            zone_id: 'zone-3',
            zone: 'Khu vực 3 - Hoa Lan',
            timestamp: new Date(Date.now() - 300000),
            escalationLevel: 1
        },
        {
            id: 'a4',
            title: 'Bảo trì định kỳ',
            description: 'Hệ thống phun sương cần bảo trì sau 30 ngày hoạt động',
            severity: 'info',
            status: 'active',
            zone_id: 'zone-1',
            zone: 'Khu vực 1 - Hoa Hồng',
            timestamp: new Date(Date.now() - 86400000),
            escalationLevel: 0
        },
        {
            id: 'a5',
            title: 'Nhiệt độ bất thường',
            description: 'Nhiệt độ tại Nhà kính B lên đến 32°C, có nguy cơ ảnh hưởng đến cây trồng',
            severity: 'critical',
            status: 'active',
            zone_id: 'zone-3',
            zone: 'Khu vực 3 - Hoa Lan',
            timestamp: new Date(Date.now() - 1200000),
            escalationLevel: 2
        }
    ],

    // -------------------- NHẬT KÝ HỆ THỐNG (AUDIT TRAIL) --------------------
    logs: [
        {
            id: 'l1',
            timestamp: new Date(Date.now() - 300000),
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
            id: 'l2',
            timestamp: new Date(Date.now() - 600000),
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
            id: 'l3',
            timestamp: new Date(Date.now() - 900000),
            userId: 'U001',
            userName: 'Nguyễn Văn A',
            userRole: 'Operator',
            action: 'CREATE',
            resource: 'Thiết bị mới: Cảm biến nhiệt độ #5',
            newValue: 'Gán vào Khu B - Giàn 3',
            ipAddress: '192.168.1.105'
        },
        {
            id: 'l4',
            timestamp: new Date(Date.now() - 1800000),
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
            id: 'l5',
            timestamp: new Date(Date.now() - 3600000),
            userId: 'U002',
            userName: 'Trần Thị B',
            userRole: 'Agronomist',
            action: 'CREATE',
            resource: 'Công thức mới: Hoa Lan #2',
            newValue: '4 giai đoạn, 57 ngày',
            ipAddress: '192.168.1.102'
        },
        {
            id: 'l6',
            timestamp: new Date(Date.now() - 7200000),
            userId: 'U001',
            userName: 'Nguyễn Văn A',
            userRole: 'Operator',
            action: 'DELETE',
            resource: 'Thiết bị: Cảm biến cũ #CS-01',
            oldValue: 'Khu A - Giàn 1',
            ipAddress: '192.168.1.105'
        },
        {
            id: 'l7',
            timestamp: new Date(Date.now() - 450000),
            userId: 'U004',
            userName: 'Phạm Thị D',
            userRole: 'Technician',
            action: 'UPDATE',
            resource: 'Cảm biến nhiệt độ #2 - Trạng thái',
            oldValue: 'OFFLINE',
            newValue: 'ACTIVE',
            ipAddress: '192.168.1.108'
        }
    ],

    // ===================== AUTH MOCK DATA =====================
    users: [
        {
            id: 'u1',
            username: 'owner1',
            password: '123456',
            email: 'owner@farm.com',
            phone: '0909123456',
            role: 'OWNER',
            status: 'ACTIVE'
        },
        {
            id: 'u2',
            username: 'tech1',
            password: '123456',
            email: 'tech@farm.com',
            phone: '0909123457',
            role: 'TECHNICIAN',
            status: 'ACTIVE'
        },
        {
            id: 'u3',
            username: 'op1',
            password: '123456',
            email: 'operator@farm.com',
            phone: '0909123458',
            role: 'OPERATOR',
            status: 'ACTIVE'
        },
        {
            id: 'u4',
            username: 'pendingUser',
            password: '123456',
            email: 'pending@farm.com',
            phone: '0909123459',
            role: 'OPERATOR',
            status: 'PENDING'
        }
    ],
    currentUser: null
};