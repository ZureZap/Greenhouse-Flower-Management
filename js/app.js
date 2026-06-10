/**
 * app.js
 * Ứng dụng chính - điều phối các trang, xử lý điều hướng, modal và thông báo.
 * Mỗi trang được quản lý bởi một module riêng (dashboard, devices, zones, growth, control, alerts, logs).
 */

import { state } from './state.js';
import { renderDashboardPage } from './dashboard.js';
import { renderDevicesPage } from './devices.js';
import { renderZonesPage } from './zones.js';
import { renderGrowthPage } from './growth.js';
import { renderControlPage } from './control.js';
import { renderAlertsPage } from './alerts.js';
import { renderLogsPage } from './logs.js';

// ===================== CÁC TIỆN ÍCH CHUNG =====================

/**
 * Hiển thị thông báo dạng toast
 * @param {string} msg - Nội dung thông báo
 * @param {string} type - Loại: 'success', 'warning', 'info', 'error'
 */
export function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Mở modal theo ID
 * @param {string} id - ID của phần tử modal (phải có class 'modal-overlay')
 */
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

/**
 * Đóng modal theo ID
 * @param {string} id - ID của phần tử modal
 */
export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

// ===================== ĐIỀU HƯỚNG CÁC TRANG =====================

// Xử lý sự kiện click trên thanh menu
document.querySelectorAll('.nav-item').forEach(menuItem => {
    menuItem.addEventListener('click', event => {
        event.preventDefault();
        const pageName = menuItem.dataset.page;   // 'dashboard', 'devices', ...

        // Cập nhật trạng thái active cho menu
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        menuItem.classList.add('active');

        // Ẩn tất cả các trang, hiển thị trang được chọn
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');

        // Gọi hàm render tương ứng cho từng trang
        switch (pageName) {
            case 'dashboard': renderDashboardPage(); break;
            case 'devices':   renderDevicesPage();   break;
            case 'zones':     renderZonesPage();     break;
            case 'growth':    renderGrowthPage();    break;
            case 'control':   renderControlPage();   break;
            case 'alerts':    renderAlertsPage();    break;
            case 'logs':      renderLogsPage();      break;
            default: break;
        }
    });
});

// Khi tải trang lần đầu, xác định trang đang active (mặc định là dashboard)
const activePage = document.querySelector('.page.active')?.id?.replace('page-', '') || 'dashboard';
switch (activePage) {
    case 'dashboard': renderDashboardPage(); break;
    case 'devices':   renderDevicesPage();   break;
    case 'zones':     renderZonesPage();     break;
    case 'growth':    renderGrowthPage();    break;
    case 'control':   renderControlPage();   break;
    case 'alerts':    renderAlertsPage();    break;
    case 'logs':      renderLogsPage();      break;
    default: renderDashboardPage();
}

// ===================== XỬ LÝ MODAL =====================

// Đóng modal khi click ra ngoài vùng nội dung (event delegation)
document.body.addEventListener('click', (event) => {
    if (event.target.classList && event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('open');
    }
});

// Expose các hàm tiện ích ra window để có thể gọi từ inline onclick
window.closeModal = closeModal;
window.openModal = openModal;