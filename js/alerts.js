/**
 * alerts.js
 * Quản lý hệ thống cảnh báo nhà kính
 * Chức năng: hiển thị danh sách cảnh báo, thống kê, cơ chế leo thang,
 * cho phép xác nhận, giải quyết và loại bỏ cảnh báo.
 */

import { state } from './state.js';
import { showToast } from './app.js';

/**
 * Chuyển đổi timestamp thành chuỗi thời gian tương đối (giây, phút, giờ, ngày)
 * @param {Date} date - Thời điểm cảnh báo
 * @returns {string} - Chuỗi thời gian (vd: "5 phút trước")
 */
function timeSince(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s < 60) return s + ' giây trước';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' phút trước';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' giờ trước';
    return Math.floor(h / 24) + ' ngày trước';
}

/**
 * Cập nhật giao diện cảnh báo (thống kê, danh sách, timeline)
 * Được gọi mỗi khi có thay đổi dữ liệu (xác nhận, giải quyết, xóa)
 */
export function renderAlerts() {
    const alerts = state.alerts;

    // --- Cập nhật các chỉ số thống kê ---
    const active = alerts.filter(a => a.status === 'active');
    const acked = alerts.filter(a => a.status === 'acknowledged');
    const critical = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved');

    const activeCountEl = document.getElementById('al-active-count');
    if (activeCountEl) activeCountEl.textContent = active.length;

    const ackedCountEl = document.getElementById('al-acked-count');
    if (ackedCountEl) ackedCountEl.textContent = acked.length;

    const criticalEl = document.getElementById('al-critical-count');
    if (criticalEl) {
        criticalEl.textContent = critical.length;
        criticalEl.style.color = critical.length > 0 ? '#ef4444' : '#10b981';
    }

    // --- Ánh xạ mức độ nghiêm trọng sang class CSS và nhãn hiển thị ---
    const severityMap = {
        critical: ['chip-error', '🔴 Nghiêm trọng'],
        warning:  ['chip-warning', '⚠ Cảnh báo'],
        info:     ['chip-info', 'ℹ Thông tin']
    };

    // Ánh xạ mức độ nghiêm trọng sang class cho card cảnh báo
    const cardClassMap = {
        critical: 'alert-critical',
        warning:  'alert-warning-card',
        info:     'alert-info-card'
    };

    // --- Hiển thị danh sách cảnh báo chưa được giải quyết ---
    const alertList = document.getElementById('alert-list');
    if (alertList) {
        alertList.innerHTML = alerts
            .filter(a => a.status !== 'resolved')
            .map(a => `
                <div class="alert-card ${cardClassMap[a.severity]}${a.status === 'acknowledged' ? ' alert-acked' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                        <div style="display:flex;gap:12px;flex:1">
                            <div style="font-size:24px;flex-shrink:0">
                                ${a.severity === 'critical' ? '🔴' : (a.severity === 'warning' ? '⚠️' : 'ℹ️')}
                            </div>
                            <div style="flex:1">
                                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
                                    <span style="font-weight:600">${a.title}</span>
                                    <span class="chip ${severityMap[a.severity][0]}">${severityMap[a.severity][1]}</span>
                                    ${a.status === 'acknowledged' ? '<span class="chip chip-success">✔ Đã xác nhận</span>' : ''}
                                </div>
                                <div style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">${a.description}</div>
                                <div style="display:flex;gap:12px;font-size:0.78rem;color:#9ca3af;flex-wrap:wrap">
                                    <span>📍 ${a.zone}</span>
                                    <span>🕐 ${timeSince(a.timestamp)}</span>
                                    ${a.acknowledgedBy ? `<span>✓ ${a.acknowledgedBy}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <button class="btn-icon" onclick="window.dismissAlert('${a.id}')">✖</button>
                    </div>
                    <div style="display:flex;gap:8px">
                        ${a.status === 'active'
                            ? `<button class="btn btn-outline btn-sm" onclick="window.acknowledgeAlert('${a.id}')">Xác nhận đã xem</button>`
                            : ''
                        }
                        <button class="btn btn-success btn-sm" onclick="window.resolveAlert('${a.id}')">✔ Đánh dấu đã giải quyết</button>
                    </div>
                </div>
            `).join('');
    }

    // --- Timeline cơ chế leo thang cảnh báo (mô phỏng) ---
    const escalationSteps = [
        { time: 'Phút 0',   action: 'Thông báo trên Web/App cho Người vận hành', status: 'completed' },
        { time: 'Phút 15',  action: 'Gửi SMS cho Kỹ sư trưởng',                    status: 'active' },
        { time: 'Phút 30',  action: 'Gọi điện tự động cho Quản lý nhà kính',       status: 'pending' }
    ];

    const timeline = document.getElementById('escalation-timeline');
    if (timeline) {
        timeline.innerHTML = escalationSteps.map(step => `
            <li class="timeline-item">
                <div class="timeline-dot ${step.status === 'completed' ? 'dot-success' : (step.status === 'active' ? 'dot-warning' : 'dot-default')}">
                    ${step.status === 'completed' ? '✔' : (step.status === 'active' ? '●' : '○')}
                </div>
                <div>
                    <div style="font-weight:600;font-size:0.875rem">${step.time}</div>
                    <div style="font-size:0.82rem;color:#6b7280;margin-top:2px">${step.action}</div>
                </div>
            </li>
        `).join('');
    }
}

/**
 * Tạo toàn bộ khung HTML cho trang Cảnh báo
 * Được gọi từ app.js khi người dùng chuyển đến trang alerts
 */
export function renderAlertsPage() {
    const container = document.getElementById('page-alerts');
    if (!container) return;

    // Xây dựng cấu trúc trang
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Hệ thống Cảnh báo</div>
                <div class="page-sub">Quản lý cảnh báo với cơ chế leo thang tự động</div>
            </div>
        </div>
        <div class="grid grid-3" style="margin-bottom:20px">
            <div class="card">
                <div style="font-size:2.5rem;font-weight:700;color:#ef4444" id="al-active-count">0</div>
                <div style="font-size:0.85rem;color:#6b7280">Cảnh báo đang hoạt động</div>
            </div>
            <div class="card">
                <div style="font-size:2.5rem;font-weight:700;color:#f59e0b" id="al-acked-count">0</div>
                <div style="font-size:0.85rem;color:#6b7280">Đã xác nhận</div>
            </div>
            <div class="card">
                <div style="font-size:2.5rem;font-weight:700" id="al-critical-count">0</div>
                <div style="font-size:0.85rem;color:#6b7280">Mức độ nghiêm trọng</div>
            </div>
        </div>
        <div class="grid grid-8-4-full">
            <div class="card">
                <div class="card-title">Danh sách cảnh báo</div>
                <div id="alert-list"></div>
            </div>
            <div class="card">
                <div class="card-title">Cơ chế Leo thang Cảnh báo</div>
                <ul class="timeline" id="escalation-timeline"></ul>
                <div style="background:#dbeafe;border-radius:8px;padding:12px;margin-top:12px;font-size:0.8rem">
                    <div style="font-weight:600;margin-bottom:6px">Bộ lọc Debouncing & Throttling:</div>
                    <div>• Lỗi > 5 phút mới xử lý</div>
                    <div>• Tối đa 3 tin nhắn/giờ/mã lỗi</div>
                </div>
            </div>
        </div>
    `;

    // Sau khi tạo khung, đổ dữ liệu
    renderAlerts();
}

/**
 * Xác nhận cảnh báo (đã đọc)
 * @param {string} id - ID của cảnh báo
 */
export function acknowledgeAlert(id) {
    const alert = state.alerts.find(a => a.id === id);
    if (alert) {
        alert.status = 'acknowledged';
        alert.acknowledgedBy = 'Người dùng hiện tại';   // Thực tế có thể lấy từ session
    }
    renderAlerts();
    showToast('Đã xác nhận cảnh báo');
}

/**
 * Đánh dấu cảnh báo đã được giải quyết
 * @param {string} id - ID của cảnh báo
 */
export function resolveAlert(id) {
    const alert = state.alerts.find(a => a.id === id);
    if (alert) alert.status = 'resolved';
    renderAlerts();
    showToast('Đã giải quyết cảnh báo');
}

/**
 * Xóa cảnh báo khỏi danh sách (không hiển thị nữa)
 * @param {string} id - ID của cảnh báo
 */
export function dismissAlert(id) {
    state.alerts = state.alerts.filter(a => a.id !== id);
    renderAlerts();
    showToast('Đã loại bỏ cảnh báo', 'info');
}

// Expose các hàm xử lý ra window để inline onclick hoạt động
window.acknowledgeAlert = acknowledgeAlert;
window.resolveAlert = resolveAlert;
window.dismissAlert = dismissAlert;