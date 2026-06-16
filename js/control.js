/**
 * control.js
 * Quản lý bảng điều khiển thiết bị OUTPUT (actuator).
 * Dựa trên ERD: Device (loại OUTPUT_DEVICE) có controlProperties (1-1).
 * Hỗ trợ lọc theo greenhouse.
 */

import { state } from './state.js';
import { showToast } from './app.js';
import { getGreenhouses, getZoneById, getGreenhouseIdByZoneId, getTimeRemaining } from './utils.js';

// ===================== BIẾN TOÀN CỤC =====================
let filterGreenhouseId = null;

// ===================== RENDER =====================
export function renderControls() {
    const container = document.getElementById('control-cards');
    if (!container) return;

    // Lấy danh sách actuator (device_type === 'OUTPUT_DEVICE')
    const actuatorDevices = state.devices.filter(d => d.device_type === 'OUTPUT_DEVICE');
    const controlMap = {};
    (state.controlProperties || []).forEach(cp => {
        controlMap[cp.device_id] = cp;
    });

    let devices = actuatorDevices
        .filter(d => controlMap[d.id])
        .map(d => ({
            ...d,
            control: controlMap[d.id]
        }));

    // Lọc theo greenhouse
    if (filterGreenhouseId) {
        devices = devices.filter(d => {
            const ghId = getGreenhouseIdByZoneId(d.zone_id);
            return ghId === filterGreenhouseId;
        });
    }

    if (devices.length === 0) {
        container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:#6b7280;">
            ${filterGreenhouseId ? 'Không có thiết bị điều khiển nào trong nhà kính này.' : 'Chưa có thiết bị điều khiển.'}
        </div>`;
        return;
    }

    container.innerHTML = devices.map(device => {
        const control = device.control;
        const isManual = control.mode === 'MANUAL';
        const isActive = control.isActive;

        return `
        <div class="control-card ${isManual ? 'control-manual' : 'control-auto'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                <div style="display:flex;gap:12px;align-items:center">
                    <div style="width:48px;height:48px;border-radius:10px;background:${isActive ? '#10b981' : '#d1d5db'};display:flex;align-items:center;justify-content:center;font-size:22px">
                        ${device.icon || '⚙️'}
                    </div>
                    <div>
                        <div style="font-weight:600">${device.name}</div>
                        <div style="font-size:0.8rem;color:#6b7280">${device.zone_id ? (getZoneById(device.zone_id)?.name || 'N/A') : 'N/A'}</div>
                    </div>
                </div>
                <span class="chip ${control.mode === 'AUTO' ? 'chip-success' : 'chip-warning'}">${control.mode}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div class="toggle-track ${isManual ? 'checked' : ''}" 
                     onclick="window.toggleControlMode('${device.id}')"></div>
                <span style="font-size:0.875rem">
                    ${control.mode === 'AUTO' ? 'Chuyển sang thủ công' : 'Đang ở chế độ thủ công'}
                </span>
            </div>
            ${isManual && control.autoResetTime ? `
                <div class="warn-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span style="font-size:0.8rem;font-weight:600">
                        Tự động về AUTO sau: ${getTimeRemaining(control.autoResetTime)}
                    </span>
                    <button class="btn btn-outline btn-sm" onclick="window.resetToAuto('${device.id}')">
                        Trả về ngay
                    </button>
                </div>
            ` : ''}
            <div style="margin-bottom:12px">
                <div style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">
                    Công suất: ${control.valuePercent}%
                </div>
                <input type="range" class="slider" value="${control.valuePercent}" 
                       ${control.mode === 'AUTO' ? 'disabled' : ''} 
                       onchange="window.setControlValue('${device.id}', this.value)">
            </div>
            <button class="btn ${isActive ? 'btn-error' : 'btn-success'}" 
                    style="width:100%" onclick="window.toggleDevice('${device.id}')">
                ${isActive ? '🔴 Tắt thiết bị' : '🟢 Bật thiết bị'}
            </button>
        </div>
    `}).join('');
}

export function renderControlPage() {
    const container = document.getElementById('page-control');
    if (!container) return;

    const greenhouses = getGreenhouses();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Bảng Điều khiển</div>
                <div class="page-sub">Điều khiển tự động và ghi đè thủ công</div>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <div>
                    <label style="font-size:0.85rem; color:#6b7280; margin-right:6px;">🏠 Nhà kính:</label>
                    <select id="greenhouse-filter" class="form-select" style="width:auto; display:inline-block;">
                        <option value="">-- Tất cả --</option>
                        ${greenhouses.map(gh => `<option value="${gh.id}">${gh.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        <div class="grid grid-2" style="margin-bottom:20px">
            <div class="card" style="background:#f0fdf4;border-color:#bbf7d0">
                <div class="card-title">⚡ Chế độ Tự động</div>
                <p style="font-size:0.875rem;color:#6b7280;margin-bottom:12px">
                    Hệ thống Rule Engine tự động điều khiển thiết bị dựa trên công thức sinh trưởng 
                    và dữ liệu cảm biến thời gian thực.
                </p>
                <div style="background:white;border-radius:8px;padding:12px;border:1px solid rgba(0,0,0,0.08)">
                    <div style="font-size:0.75rem;color:#6b7280;margin-bottom:6px">Ví dụ luật tự động:</div>
                    <code style="font-size:0.82rem">
                        IF Nhiệt độ > Cấu hình + 2°C<br>
                        THEN Bật quạt thông gió & Phun sương
                    </code>
                </div>
            </div>
            <div class="card" style="background:#fffbeb;border-color:#fde68a">
                <div class="card-title">✍️ Chế độ Thủ công</div>
                <p style="font-size:0.875rem;color:#6b7280;margin-bottom:12px">
                    Ghi đè tạm thời để can thiệp khẩn cấp. Hệ thống sẽ tự động trở về chế độ AUTO sau 2 giờ.
                </p>
                <div style="background:white;border-radius:8px;padding:12px;border:1px solid rgba(0,0,0,0.08)">
                    <div style="font-size:0.75rem;color:#a16207;font-weight:600;margin-bottom:4px">⚠️ Lưu ý:</div>
                    <div style="font-size:0.82rem">Rule Engine sẽ bỏ qua thiết bị ở chế độ MANUAL</div>
                </div>
            </div>
        </div>
        <div class="grid grid-2" id="control-cards"></div>
    `;

    const filterSelect = document.getElementById('greenhouse-filter');
    filterSelect.addEventListener('change', (e) => {
        filterGreenhouseId = e.target.value || null;
        renderControls();
    });

    renderControls();
}

// ===================== HÀM XỬ LÝ SỰ KIỆN =====================
export function toggleControlMode(deviceId) {
    const device = state.devices.find(d => d.id === deviceId);
    if (!device) return;
    const control = state.controlProperties.find(cp => cp.device_id === deviceId);
    if (!control) return;

    if (control.mode === 'AUTO') {
        control.mode = 'MANUAL';
        control.autoResetTime = new Date(Date.now() + 2 * 3600000);
        showToast('Chế độ thủ công sẽ tự động tắt sau 2 giờ', 'info');
    } else {
        control.mode = 'AUTO';
        control.autoResetTime = null;
        showToast('Đã chuyển về chế độ tự động');
    }
    renderControls();
}

export function toggleDevice(deviceId) {
    const device = state.devices.find(d => d.id === deviceId);
    if (!device) return;
    const control = state.controlProperties.find(cp => cp.device_id === deviceId);
    if (!control) return;

    if (control.mode === 'AUTO') {
        showToast('Vui lòng chuyển sang chế độ thủ công trước', 'warning');
        return;
    }
    control.isActive = !control.isActive;
    showToast(`${control.isActive ? 'Đã bật' : 'Đã tắt'} ${device.name}`);
    renderControls();
}

export function setControlValue(deviceId, value) {
    const control = state.controlProperties.find(cp => cp.device_id === deviceId);
    if (!control) return;
    control.valuePercent = parseInt(value, 10);
    renderControls();
}

export function resetToAuto(deviceId) {
    const control = state.controlProperties.find(cp => cp.device_id === deviceId);
    if (!control) return;
    control.mode = 'AUTO';
    control.autoResetTime = null;
    showToast('Đã trả về chế độ tự động');
    renderControls();
}

// Expose global
window.toggleControlMode = toggleControlMode;
window.toggleDevice = toggleDevice;
window.setControlValue = setControlValue;
window.resetToAuto = resetToAuto;