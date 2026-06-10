/**
 * control.js
 * Quản lý bảng điều khiển thiết bị trong nhà kính
 * Cho phép chuyển đổi giữa chế độ AUTO và MANUAL, điều chỉnh công suất,
 * bật/tắt thiết bị, và tự động reset về AUTO sau 2 giờ.
 */

import { state } from './state.js';
import { showToast } from './app.js';

/**
 * Tính thời gian còn lại từ thời điểm reset về AUTO
 * @param {Date} date - Thời điểm sẽ tự động reset
 * @returns {string} - Chuỗi định dạng "Xh Ym"
 */
function getTimeRemaining(date) {
    const diff = date - Date.now();
    if (diff <= 0) return '0h 0m';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
}

/**
 * Render danh sách các thiết bị điều khiển
 * Cập nhật nội dung bên trong #control-cards dựa trên state.controls
 */
export function renderControls() {
    const container = document.getElementById('control-cards');
    if (!container) return;

    container.innerHTML = state.controls.map(device => `
        <div class="control-card ${device.mode === 'MANUAL' ? 'control-manual' : 'control-auto'}">
            <!-- Header: icon, tên, khu vực, chế độ -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                <div style="display:flex;gap:12px;align-items:center">
                    <div style="width:48px;height:48px;border-radius:10px;background:${device.isActive ? '#10b981' : '#d1d5db'};display:flex;align-items:center;justify-content:center;font-size:22px">
                        ${device.icon}
                    </div>
                    <div>
                        <div style="font-weight:600">${device.name}</div>
                        <div style="font-size:0.8rem;color:#6b7280">${device.zone}</div>
                    </div>
                </div>
                <span class="chip ${device.mode === 'AUTO' ? 'chip-success' : 'chip-warning'}">${device.mode}</span>
            </div>

            <!-- Toggle chuyển đổi chế độ AUTO/MANUAL -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div class="toggle-track ${device.mode === 'MANUAL' ? 'checked' : ''}" 
                     onclick="window.toggleControlMode('${device.id}')"></div>
                <span style="font-size:0.875rem">
                    ${device.mode === 'AUTO' ? 'Chuyển sang thủ công' : 'Đang ở chế độ thủ công'}
                </span>
            </div>

            <!-- Hiển thị thời gian còn lại và nút reset khi đang ở chế độ MANUAL -->
            ${device.mode === 'MANUAL' && device.autoResetTime ? `
                <div class="warn-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span style="font-size:0.8rem;font-weight:600">
                        Tự động về AUTO sau: ${getTimeRemaining(device.autoResetTime)}
                    </span>
                    <button class="btn btn-outline btn-sm" onclick="window.resetToAuto('${device.id}')">
                        Trả về ngay
                    </button>
                </div>
            ` : ''}

            <!-- Thanh trượt điều chỉnh công suất -->
            <div style="margin-bottom:12px">
                <div style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">
                    Công suất: ${device.value}%
                </div>
                <input type="range" class="slider" value="${device.value}" 
                       ${device.mode === 'AUTO' ? 'disabled' : ''} 
                       onchange="window.setControlValue('${device.id}', this.value)">
            </div>

            <!-- Nút bật/tắt thiết bị -->
            <button class="btn ${device.isActive ? 'btn-error' : 'btn-success'}" 
                    style="width:100%" onclick="window.toggleDevice('${device.id}')">
                ${device.isActive ? '🔴 Tắt thiết bị' : '🟢 Bật thiết bị'}
            </button>
        </div>
    `).join('');
}

/**
 * Tạo toàn bộ khung HTML cho trang Điều khiển
 * Được gọi từ app.js khi người dùng chuyển đến trang control
 */
export function renderControlPage() {
    const container = document.getElementById('page-control');
    if (!container) return;

    // Xây dựng cấu trúc trang: header, 2 card giải thích chế độ, vùng chứa danh sách thiết bị
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Bảng Điều khiển</div>
                <div class="page-sub">Điều khiển tự động và ghi đè thủ công</div>
            </div>
        </div>
        <div class="grid grid-2" style="margin-bottom:20px">
            <!-- Card mô tả chế độ Tự động -->
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

            <!-- Card mô tả chế độ Thủ công -->
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

    // Sau khi DOM có phần tử #control-cards, render danh sách thiết bị
    renderControls();
}

/**
 * Chuyển đổi chế độ điều khiển của thiết bị (AUTO <-> MANUAL)
 * Khi chuyển sang MANUAL, tự động đặt thời gian reset sau 2 giờ
 * @param {string} id - ID của thiết bị
 */
export function toggleControlMode(id) {
    const device = state.controls.find(d => d.id === id);
    if (!device) return;

    if (device.mode === 'AUTO') {
        device.mode = 'MANUAL';
        device.autoResetTime = new Date(Date.now() + 2 * 3600000); // +2 giờ
        showToast('Chế độ thủ công sẽ tự động tắt sau 2 giờ', 'info');
    } else {
        device.mode = 'AUTO';
        device.autoResetTime = null;
        showToast('Đã chuyển về chế độ tự động');
    }
    renderControls();
}

/**
 * Bật hoặc tắt thiết bị (chỉ khả dụng khi ở chế độ MANUAL)
 * @param {string} id - ID của thiết bị
 */
export function toggleDevice(id) {
    const device = state.controls.find(d => d.id === id);
    if (!device) return;

    if (device.mode === 'AUTO') {
        showToast('Vui lòng chuyển sang chế độ thủ công trước', 'warning');
        return;
    }

    device.isActive = !device.isActive;
    showToast(`${device.isActive ? 'Đã bật' : 'Đã tắt'} ${device.name}`);
    renderControls();
}

/**
 * Điều chỉnh giá trị công suất của thiết bị (0-100%)
 * @param {string} id - ID của thiết bị
 * @param {number} value - Giá trị công suất mới
 */
export function setControlValue(id, value) {
    const device = state.controls.find(d => d.id === id);
    if (device) {
        device.value = parseInt(value, 10);
        renderControls();
    }
}

/**
 * Reset thiết bị từ chế độ MANUAL về AUTO ngay lập tức
 * @param {string} id - ID của thiết bị
 */
export function resetToAuto(id) {
    const device = state.controls.find(d => d.id === id);
    if (device) {
        device.mode = 'AUTO';
        device.autoResetTime = null;
    }
    showToast('Đã trả về chế độ tự động');
    renderControls();
}

// Expose các hàm xử lý ra window để inline onclick hoạt động
window.toggleControlMode = toggleControlMode;
window.toggleDevice = toggleDevice;
window.setControlValue = setControlValue;
window.resetToAuto = resetToAuto;