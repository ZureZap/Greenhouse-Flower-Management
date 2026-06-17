/**
 * devices.js
 * Quản lý trang Thiết bị IoT - thêm, sửa, xóa, phê duyệt, menu dropdown (⋯)
 * Hỗ trợ nhập MAC thủ công, auto-format, validation, kiểm tra trùng lặp,
 * và lọc theo greenhouse (qua zone_id).
 */

import { showToast, openModal, closeModal } from './app.js';
import {
    getDevices,
    createDevice,
    updateDevice,
    deleteDevice as deleteDeviceApi,
    getGateways,
    getControlProperties,
    updateControlProperty,
    getZones
} from './api.js';
import {
    getGreenhouses,
    getGreenhouseIdByZoneId,
    getZoneOptions,
    getZoneName
} from './utils.js';

// ===================== BIẾN TOÀN CỤC =====================
let pendingDeviceId = null;
let filterGreenhouseId = null;
let currentMenu = null;
let devices = [];
let gateways = [];
let zones = [];

// ===================== HÀM LẤY DỮ LIỆU =====================
async function loadData() {
    try {
        [devices, gateways, zones] = await Promise.all([
            getDevices(),
            getGateways(),
            getZones()
        ]);
    } catch (err) {
        showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
        throw err;
    }
}

function getGatewayOptions() {
    return gateways.map(g => ({ id: g.id, name: g.name }));
}

function getGatewayName(gatewayId) {
    const gw = gateways.find(g => g.id === gatewayId);
    return gw ? gw.name : gatewayId;
}

// ===================== TIỆN ÍCH HIỂN THỊ =====================
function deviceStatusChip(status) {
    const statusMap = {
        ACTIVE: ['chip-success', '✔ Hoạt động'],
        OFFLINE: ['chip-warning', '⚠ Mất kết nối'],
        NEEDS_REPLACEMENT: ['chip-error', '✖ Cần thay thế'],
        PENDING: ['chip-default', '⏳ Chờ phê duyệt']
    };
    const [chipClass, chipText] = statusMap[status] || ['chip-default', status];
    return `<span class="chip ${chipClass}">${chipText}</span>`;
}

function batteryChip(batteryLevel) {
    if (!batteryLevel && batteryLevel !== 0) return '-';
    let chipClass = 'chip-success';
    if (batteryLevel <= 50) chipClass = 'chip-warning';
    if (batteryLevel <= 20) chipClass = 'chip-error';
    return `<span class="chip ${chipClass}">${batteryLevel}%</span>`;
}

// ===================== HÀM XỬ LÝ MAC =====================
function formatMacInput(inputElement) {
    let value = inputElement.value.toUpperCase().replace(/[^A-F0-9]/g, '');
    if (value.length > 12) value = value.slice(0, 12);
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 2 === 0) formatted += ':';
        formatted += value[i];
    }
    inputElement.value = formatted;
}

function isValidMac(mac) {
    const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
    return macRegex.test(mac);
}

function isMacExists(mac, excludeId = null) {
    return devices.some(d => d.macAddress === mac && d.id !== excludeId);
}

function validateMacInput() {
    const macInput = document.getElementById('dev-mac');
    const errorSpan = document.getElementById('mac-error');
    if (!macInput || !errorSpan) return true;
    const mac = macInput.value;
    if (!isValidMac(mac)) {
        errorSpan.textContent = 'MAC không hợp lệ (định dạng AA:BB:CC:DD:EE:FF)';
        errorSpan.style.display = 'block';
        return false;
    }
    errorSpan.style.display = 'none';
    return true;
}

function attachMacFormatEvents() {
    const macInput = document.getElementById('dev-mac');
    if (!macInput) return;
    macInput.removeEventListener('input', macFormatHandler);
    macInput.addEventListener('input', macFormatHandler);
}

function macFormatHandler(e) {
    formatMacInput(e.target);
    validateMacInput();
}

// ===================== RENDER TOÀN BỘ TRANG =====================
export async function renderDevicesPage() {
    const container = document.getElementById('page-devices');
    if (!container) return;

    try {
        await loadData();
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:#ef4444;">Lỗi tải dữ liệu: ${err.message}</div>`;
        return;
    }

    const greenhouses = getGreenhouses();
    const gatewaysOpt = getGatewayOptions();

    container.innerHTML = `
        <div class="page-header" style="position: relative;">
            <div>
                <div class="page-title">Quản lý Thiết bị IoT</div>
                <div class="page-sub">Theo dõi vòng đời và sức khỏe thiết bị cảm biến</div>
            </div>
            <div style="position: absolute; top: 0; right: 0; display: flex; gap: 12px; align-items: center;">
                <div>
                    <label style="font-size:0.85rem; color:#6b7280; margin-right:6px;">🏠 Nhà kính:</label>
                    <select id="greenhouse-filter" class="form-select" style="width:auto; display:inline-block;">
                        <option value="">-- Tất cả --</option>
                        ${greenhouses.map(gh => `<option value="${gh.id}">${gh.name}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-primary" onclick="window.showAddDeviceModal()">➕ Thêm thiết bị</button>
            </div>
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
                            <th>Metric</th>
                            <th>Gateway</th>
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

        <!-- Modal thêm / sửa / phê duyệt -->
        <div class="modal-overlay" id="device-modal">
            <div class="modal">
                <div class="modal-title" id="device-modal-title">Thêm thiết bị mới</div>
                <div class="form-group">
                    <label class="form-label">Tên thiết bị</label>
                    <input class="form-input" id="dev-name" type="text">
                </div>
                <div class="form-group">
                    <label class="form-label">Loại thiết bị</label>
                    <select class="form-select" id="dev-type">
                        <option value="SENSOR">Cảm biến (SENSOR)</option>
                        <option value="OUTPUT_DEVICE">Thiết bị đầu ra (OUTPUT_DEVICE)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Loại dữ liệu (Metric)</label>
                    <select class="form-select" id="dev-metric">
                        <option value="Temperature">Nhiệt độ</option>
                        <option value="Humidity">Độ ẩm</option>
                        <option value="Light">Ánh sáng</option>
                        <option value="CO2">CO2</option>
                        <option value="Actuator">Điều khiển</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gateway</label>
                    <select class="form-select" id="dev-gateway">
                        ${gatewaysOpt.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gán vào khu vực</label>
                    <select class="form-select" id="dev-zone">
                        <!-- Sẽ được populate động khi mở modal -->
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">MAC Address</label>
                    <input class="form-input" id="dev-mac" type="text" placeholder="AA:BB:CC:DD:EE:FF" maxlength="17">
                    <div id="mac-error" class="form-helper" style="color: #ef4444; display: none;"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('device-modal')">Hủy</button>
                    <button class="btn btn-primary" onclick="window.approveDevice()">Lưu</button>
                </div>
            </div>
        </div>
    `;

    // Sự kiện lọc greenhouse
    const filterSelect = document.getElementById('greenhouse-filter');
    filterSelect.addEventListener('change', (e) => {
        filterGreenhouseId = e.target.value || null;
        renderDevices();
    });

    await renderDevices();
    attachGlobalEvents();
}

// ===================== CẬP NHẬT DỮ LIỆU =====================
export async function renderDevices() {
    // Lọc theo greenhouse
    let filteredDevices = devices;
    if (filterGreenhouseId) {
        filteredDevices = devices.filter(d => {
            const ghId = getGreenhouseIdByZoneId(d.zone_id);
            return ghId === filterGreenhouseId;
        });
    }

    // Cập nhật 4 card thống kê
    const statsContainer = document.getElementById('device-stats');
    if (statsContainer) {
        const total = filteredDevices.length;
        const active = filteredDevices.filter(d => d.status === 'ACTIVE').length;
        const offline = filteredDevices.filter(d => d.status === 'OFFLINE').length;
        const replace = filteredDevices.filter(d => d.status === 'NEEDS_REPLACEMENT').length;
        const stats = [
            { label: 'Tổng thiết bị', value: total, color: '#3b82f6' },
            { label: 'Đang hoạt động', value: active, color: '#10b981' },
            { label: 'Mất kết nối', value: offline, color: '#f59e0b' },
            { label: 'Cần thay thế', value: replace, color: '#ef4444' }
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

    // Cập nhật bảng danh sách thiết bị
    const tableBody = document.getElementById('device-table');
    if (tableBody) {
        if (filteredDevices.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#6b7280;">
                ${filterGreenhouseId ? 'Không có thiết bị nào trong nhà kính này.' : 'Chưa có thiết bị.'}
            </td></tr>`;
            return;
        }
        tableBody.innerHTML = filteredDevices.map(device => `
            <tr>
                <td>${device.name}</td>
                <td>${device.device_type}</td>
                <td>${device.metric_type}</td>
                <td>${getGatewayName(device.gateway_id)}</td>
                <td>${getZoneName(device.zone_id)}</td>
                <td>${deviceStatusChip(device.status)}</td>
                <td>${batteryChip(device.batteryLevel)}</td>
                <td style="font-size:0.85rem">${device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString('vi-VN') : '-'}</td>
                <td>
                    ${device.status === 'PENDING'
                        ? `<button class="btn btn-primary btn-sm" onclick="window.openDeviceApproval('${device.id}')">Phê duyệt</button>`
                        : `<button class="btn-icon action-dots" data-id="${device.id}" title="Thao tác">⋯</button>`
                    }
                </td>
            </tr>
        `).join('');
    }
}

// ===================== MENU DROPDOWN =====================
function showActionMenu(deviceId, buttonElement) {
    if (currentMenu) currentMenu.remove();
    const menu = document.createElement('div');
    menu.className = 'device-action-menu';
    Object.assign(menu.style, {
        position: 'absolute',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: '1000',
        minWidth: '120px',
        overflow: 'hidden'
    });
    menu.innerHTML = `
        <div class="action-menu-item" data-action="edit" data-id="${deviceId}" 
             style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">✏️ Sửa</div>
        <div class="action-menu-item" data-action="delete" data-id="${deviceId}" 
             style="padding: 8px 12px; cursor: pointer; color: #ef4444;">🗑️ Xóa</div>
    `;
    const rect = buttonElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(menu);
    currentMenu = menu;

    const closeHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== buttonElement) {
            menu.remove();
            currentMenu = null;
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function attachGlobalEvents() {
    document.body.removeEventListener('click', globalClickHandler);
    document.body.addEventListener('click', globalClickHandler);
}

function globalClickHandler(e) {
    const dots = e.target.closest('.action-dots');
    if (dots) {
        e.preventDefault();
        e.stopPropagation();
        const deviceId = dots.getAttribute('data-id');
        showActionMenu(deviceId, dots);
        return;
    }
    const menuItem = e.target.closest('.action-menu-item');
    if (menuItem) {
        const action = menuItem.getAttribute('data-action');
        const id = menuItem.getAttribute('data-id');
        if (action === 'edit') window.editDevice(id);
        if (action === 'delete') window.deleteDevice(id);
        if (currentMenu) currentMenu.remove();
        currentMenu = null;
    }
}

// ===================== XỬ LÝ CRUD =====================
function populateZoneSelect(selectedZoneId = '') {
    const select = document.getElementById('dev-zone');
    if (!select) return;
    const zoneOpts = getZoneOptions(filterGreenhouseId);
    select.innerHTML = `<option value="">-- Không --</option>`;
    zoneOpts.forEach(z => {
        const option = document.createElement('option');
        option.value = z.id;
        option.textContent = z.name;
        if (z.id === selectedZoneId) option.selected = true;
        select.appendChild(option);
    });
    if (filterGreenhouseId && zoneOpts.length === 0) {
        const info = document.createElement('option');
        info.textContent = '⚠ Không có zone trong nhà kính này';
        info.disabled = true;
        select.appendChild(info);
    }
}

export async function openDeviceApproval(id) {
    const device = devices.find(d => d.id === id);
    if (!device) return;
    pendingDeviceId = id;
    document.getElementById('dev-name').value = device.name;
    document.getElementById('dev-type').value = device.device_type;
    document.getElementById('dev-metric').value = device.metric_type;
    document.getElementById('dev-gateway').value = device.gateway_id;
    populateZoneSelect(device.zone_id);
    document.getElementById('dev-mac').value = device.macAddress;
    document.getElementById('device-modal-title').innerText = 'Phê duyệt thiết bị';
    window._addingNew = false;
    window._editingDeviceId = null;
    attachMacFormatEvents();
    openModal('device-modal');
}

export function showAddDeviceModal() {
    document.getElementById('dev-name').value = '';
    document.getElementById('dev-type').value = 'SENSOR';
    document.getElementById('dev-metric').value = 'Temperature';
    document.getElementById('dev-gateway').value = gateways[0]?.id || '';
    populateZoneSelect();
    document.getElementById('dev-mac').value = '';
    document.getElementById('mac-error').style.display = 'none';
    document.getElementById('device-modal-title').innerText = 'Thêm thiết bị mới';
    window._addingNew = true;
    window._editingDeviceId = null;
    attachMacFormatEvents();
    openModal('device-modal');
}

export async function editDevice(id) {
    const device = devices.find(d => d.id === id);
    if (!device) return;
    document.getElementById('dev-name').value = device.name;
    document.getElementById('dev-type').value = device.device_type;
    document.getElementById('dev-metric').value = device.metric_type;
    document.getElementById('dev-gateway').value = device.gateway_id;
    populateZoneSelect(device.zone_id);
    document.getElementById('dev-mac').value = device.macAddress;
    document.getElementById('device-modal-title').innerText = 'Chỉnh sửa thiết bị';
    window._addingNew = false;
    window._editingDeviceId = id;
    attachMacFormatEvents();
    openModal('device-modal');
}

export async function deleteDevice(id) {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
        try {
            await deleteDeviceApi(id);
            devices = devices.filter(d => d.id !== id);
            await renderDevices();
            showToast('Đã xóa thiết bị', 'info');
        } catch (err) {
            showToast('Lỗi xóa thiết bị: ' + err.message, 'error');
        }
    }
}

export async function approveDevice() {
    const name = document.getElementById('dev-name').value;
    const deviceType = document.getElementById('dev-type').value;
    const metricType = document.getElementById('dev-metric').value;
    const gatewayId = document.getElementById('dev-gateway').value;
    const zoneId = document.getElementById('dev-zone').value;
    let mac = document.getElementById('dev-mac').value;

    if (!validateMacInput()) {
        showToast('MAC address không đúng định dạng', 'warning');
        return;
    }
    const excludeId = window._editingDeviceId || null;
    if (isMacExists(mac, excludeId)) {
        showToast('MAC address đã tồn tại trong hệ thống', 'warning');
        return;
    }
    if (!gatewayId) {
        showToast('Vui lòng chọn Gateway', 'warning');
        return;
    }
    if (!zoneId) {
        showToast('Vui lòng chọn khu vực', 'warning');
        return;
    }

    const deviceData = { name, device_type: deviceType, metric_type: metricType, macAddress: mac, zone_id: zoneId, gateway_id: gatewayId };

    try {
        if (window._editingDeviceId) {
            // Sửa
            await updateDevice(window._editingDeviceId, deviceData);
            const idx = devices.findIndex(d => d.id === window._editingDeviceId);
            if (idx !== -1) {
                devices[idx] = { ...devices[idx], ...deviceData };
            }
            showToast('Đã cập nhật thiết bị');
            window._editingDeviceId = null;
        } else if (window._addingNew) {
            // Thêm mới
            const newDevice = await createDevice(deviceData);
            devices.push(newDevice);
            showToast('Đã thêm thiết bị mới');
            window._addingNew = false;
        } else {
            // Phê duyệt (cập nhật status)
            const id = pendingDeviceId;
            await updateDevice(id, { ...deviceData, status: 'ACTIVE' });
            const dev = devices.find(d => d.id === id);
            if (dev) {
                Object.assign(dev, deviceData, { status: 'ACTIVE' });
            }
            showToast('Thiết bị đã được phê duyệt');
        }
        closeModal('device-modal');
        await renderDevices();
    } catch (err) {
        showToast('Lỗi lưu thiết bị: ' + err.message, 'error');
    }
}

// ===================== EXPOSE GLOBAL =====================
window.openDeviceApproval = openDeviceApproval;
window.approveDevice = approveDevice;
window.showAddDeviceModal = showAddDeviceModal;
window.editDevice = editDevice;
window.deleteDevice = deleteDevice;