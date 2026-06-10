/**
 * devices.js
 * Quản lý trang Thiết bị IoT - hiển thị danh sách, thống kê, cho phép thêm mới và phê duyệt thiết bị.
 * Các chức năng: xem danh sách, thống kê trạng thái, thêm thiết bị mới, phê duyệt thiết bị đang chờ.
 */

import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';

// ===================== CÁC HÀM TIỆN ÍCH HIỂN THỊ =====================

/**
 * Tạo chip hiển thị trạng thái của thiết bị
 * @param {string} status - Trạng thái: ACTIVE, OFFLINE, NEEDS_REPLACEMENT, PENDING
 * @returns {string} HTML span chip
 */
function deviceStatusChip(status) {
    const statusMap = {
        ACTIVE:            ['chip-success', '✔ Hoạt động'],
        OFFLINE:           ['chip-warning', '⚠ Mất kết nối'],
        NEEDS_REPLACEMENT: ['chip-error',   '✖ Cần thay thế'],
        PENDING:           ['chip-default', '⏳ Chờ phê duyệt']
    };
    const [chipClass, chipText] = statusMap[status] || ['chip-default', status];
    return `<span class="chip ${chipClass}">${chipText}</span>`;
}

/**
 * Tạo chip hiển thị mức pin
 * @param {number|null} batteryLevel - Mức pin (0-100)
 * @returns {string} HTML chip hoặc dấu gạch ngang nếu không có pin
 */
function batteryChip(batteryLevel) {
    if (!batteryLevel) return '-';
    let chipClass = 'chip-success';
    if (batteryLevel <= 50) chipClass = 'chip-warning';
    if (batteryLevel <= 20) chipClass = 'chip-error';
    return `<span class="chip ${chipClass}">${batteryLevel}%</span>`;
}

// ===================== RENDER TOÀN BỘ TRANG =====================

/**
 * Render toàn bộ giao diện trang Devices (khung + dữ liệu)
 * Được gọi từ app.js khi chuyển đến trang devices
 */
export function renderDevicesPage() {
    const container = document.getElementById('page-devices');
    if (!container) return;

    // Xây dựng cấu trúc HTML của trang
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Quản lý Thiết bị IoT</div>
                <div class="page-sub">Theo dõi vòng đời và sức khỏe thiết bị cảm biến</div>
            </div>
            <button class="btn btn-primary" onclick="window.showAddDeviceModal()">➕ Thêm thiết bị</button>
        </div>

        <div class="grid grid-4" id="device-stats" style="margin-bottom:20px"></div>

        <div class="card">
            <div class="card-title">Danh sách thiết bị</div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Tên thiết bị</th>
                            <th>Loại</th>
                            <th>MAC Address</th>
                            <th>Khu vực</th>
                            <th>Trạng thái</th>
                            <th>Pin</th>
                            <th>Heartbeat cuối</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="device-table"></tbody>
                </table>
            </div>
        </div>

        <!-- Modal thêm / phê duyệt thiết bị -->
        <div class="modal-overlay" id="device-modal">
            <div class="modal">
                <div class="modal-title">Phê duyệt thiết bị mới</div>
                <div class="form-group">
                    <label class="form-label">Tên thiết bị</label>
                    <input class="form-input" id="dev-name" type="text">
                </div>
                <div class="form-group">
                    <label class="form-label">Loại thiết bị</label>
                    <select class="form-select" id="dev-type">
                        <option value="Temperature">Nhiệt độ</option>
                        <option value="Humidity">Độ ẩm</option>
                        <option value="Light">Ánh sáng</option>
                        <option value="CO2">CO2</option>
                        <option value="Actuator">Điều khiển</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gán vào khu vực</label>
                    <select class="form-select" id="dev-zone">
                        <option value="Khu A - Giàn 1">Khu A - Giàn 1</option>
                        <option value="Khu A - Giàn 2">Khu A - Giàn 2</option>
                        <option value="Khu B - Giàn 1">Khu B - Giàn 1</option>
                        <option value="Khu B - Giàn 2">Khu B - Giàn 2</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">MAC Address</label>
                    <input class="form-input" id="dev-mac" type="text" disabled>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('device-modal')">Hủy</button>
                    <button class="btn btn-primary" onclick="approveDevice()">Phê duyệt & Kích hoạt</button>
                </div>
            </div>
        </div>
    `;

    // Sau khi tạo khung, đổ dữ liệu thống kê và bảng
    renderDevices();
}

// ===================== CẬP NHẬT DỮ LIỆU =====================

/**
 * Cập nhật số liệu thống kê và danh sách thiết bị
 * Dựa vào state.devices hiện tại
 */
export function renderDevices() {
    const devices = state.devices;

    // --- Cập nhật các chỉ số thống kê (4 card) ---
    const statsContainer = document.getElementById('device-stats');
    if (statsContainer) {
        const total   = devices.length;
        const active  = devices.filter(d => d.status === 'ACTIVE').length;
        const offline = devices.filter(d => d.status === 'OFFLINE').length;
        const replace = devices.filter(d => d.status === 'NEEDS_REPLACEMENT').length;

        const stats = [
            { label: 'Tổng thiết bị',  value: total,  color: '#3b82f6' },
            { label: 'Đang hoạt động', value: active, color: '#10b981' },
            { label: 'Mất kết nối',    value: offline,color: '#f59e0b' },
            { label: 'Cần thay thế',   value: replace,color: '#ef4444' }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="card">
                <div class="stat-icon" style="background:${stat.color}20;color:${stat.color};font-size:1.5rem;font-weight:700">
                    ${stat.value}
                </div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    // --- Cập nhật bảng danh sách thiết bị ---
    const tableBody = document.getElementById('device-table');
    if (tableBody) {
        tableBody.innerHTML = devices.map(device => `
            <tr>
                <td>${device.name}</td>
                <td>${device.type}</td>
                <td><span class="mono">${device.macAddress}</span></td>
                <td>${device.zone || '-'}</td>
                <td>${deviceStatusChip(device.status)}</td>
                <td>${batteryChip(device.batteryLevel)}</td>
                <td style="font-size:0.85rem">${device.lastHeartbeat.toLocaleTimeString('vi-VN')}</td>
                <td>
                    ${device.status === 'PENDING'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.openDeviceApproval('${device.id}')">Phê duyệt</button>`
                        : '<button class="btn-icon">⋯</button>'
                    }
                </td>
            </tr>
        `).join('');
    }
}

// ===================== XỬ LÝ SỰ KIỆN (MODAL) =====================

/**
 * Mở modal phê duyệt cho thiết bị đang chờ
 * @param {string} id - ID của thiết bị
 */
export function openDeviceApproval(id) {
    const device = state.devices.find(d => d.id === id);
    if (!device) return;

    state.pendingDeviceId = id;
    document.getElementById('dev-name').value = device.name;
    document.getElementById('dev-type').value = device.type;
    document.getElementById('dev-zone').value = device.zone || 'Khu A - Giàn 1';
    document.getElementById('dev-mac').value = device.macAddress;

    // Đánh dấu là chế độ phê duyệt (không phải thêm mới)
    window._addingNew = false;
    openModal('device-modal');
}

/**
 * Mở modal để thêm thiết bị mới
 * Tự động tạo địa chỉ MAC giả ngẫu nhiên
 */
export function showAddDeviceModal() {
    // Reset form
    document.getElementById('dev-name').value = '';
    document.getElementById('dev-type').value = 'Temperature';
    document.getElementById('dev-zone').value = 'Khu A - Giàn 1';

    // Tạo MAC giả: AA:BB:CC + 6 ký tự hex ngẫu nhiên
    const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    const fakeMac = `AA:BB:CC:${randomHex.slice(0,2)}:${randomHex.slice(2,4)}:${randomHex.slice(4,6)}`;
    document.getElementById('dev-mac').value = fakeMac;

    // Đánh dấu là chế độ thêm mới
    window._addingNew = true;
    openModal('device-modal');
}

/**
 * Xử lý việc lưu thông tin từ modal
 * - Nếu _addingNew = true: thêm thiết bị mới
 * - Ngược lại: phê duyệt thiết bị đang chờ (cập nhật thông tin)
 */
export function approveDevice() {
    const name = document.getElementById('dev-name').value;
    const type = document.getElementById('dev-type').value;
    const zone = document.getElementById('dev-zone').value;
    const mac = document.getElementById('dev-mac').value;

    if (window._addingNew) {
        // --- Thêm thiết bị mới ---
        const newDevice = {
            id: Date.now().toString(),
            name,
            type,
            macAddress: mac,
            zone,
            status: 'ACTIVE',
            lastHeartbeat: new Date(),
            batteryLevel: type !== 'Actuator' ? 100 : undefined
        };
        state.devices.push(newDevice);
        showToast('Đã thêm thiết bị mới');
        window._addingNew = false;
    } else {
        // --- Phê duyệt thiết bị đang chờ ---
        const id = state.pendingDeviceId;
        const device = state.devices.find(d => d.id === id);
        if (device) {
            device.name = name;
            device.type = type;
            device.zone = zone;
            device.status = 'ACTIVE';
            showToast('Thiết bị đã được phê duyệt');
        }
    }

    closeModal('device-modal');
    renderDevices();  // Refresh lại bảng và thống kê
}

// ===================== EXPOSE GLOBAL =====================
// Các hàm này được gọi từ các sự kiện inline (onclick), cần được gắn vào window
window.openDeviceApproval = openDeviceApproval;
window.approveDevice = approveDevice;
window.showAddDeviceModal = showAddDeviceModal;