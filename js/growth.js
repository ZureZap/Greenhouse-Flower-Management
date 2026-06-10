/**
 * growth.js
 * Quản lý trang Chu kỳ sinh trưởng - hiển thị danh sách các công thức trồng hoa,
 * theo dõi tiến độ từng giai đoạn, cho phép điều chỉnh kéo dài chu kỳ khi cây chậm phát triển.
 */

import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';

// ===================== HÀM TIỆN ÍCH TÍNH TOÁN =====================

/**
 * Tính phần trăm tiến độ tổng thể của một công thức
 * @param {Object} formula - Công thức sinh trưởng
 * @returns {number} Phần trăm hoàn thành (0-100)
 */
function calcProgress(formula) {
    const totalDays = formula.stages.reduce((sum, stage) => sum + stage.duration, 0);
    const doneDays = formula.stages.reduce((sum, stage) => {
        if (stage.completed) return sum + stage.duration;
        if (stage.currentDay) return sum + stage.currentDay;
        return sum;
    }, 0);
    return Math.round((doneDays / totalDays) * 100);
}

/**
 * Tính số ngày còn lại của công thức
 * @param {Object} formula - Công thức sinh trưởng
 * @returns {number} Số ngày còn lại
 */
function daysLeft(formula) {
    const totalDays = formula.stages.reduce((sum, stage) => sum + stage.duration, 0);
    const doneDays = formula.stages.reduce((sum, stage) => {
        if (stage.completed) return sum + stage.duration;
        if (stage.currentDay) return sum + stage.currentDay;
        return sum;
    }, 0);
    return totalDays - doneDays;
}

// ===================== RENDER DỮ LIỆU =====================

/**
 * Cập nhật danh sách các công thức sinh trưởng
 * Được gọi mỗi khi có thay đổi (thêm, sửa, điều chỉnh)
 */
export function renderGrowth() {
    // Ánh xạ trạng thái sang class CSS và nhãn hiển thị
    const statusClassMap = {
        active: 'chip-success',
        delayed: 'chip-warning',
        completed: 'chip-default'
    };
    const statusLabelMap = {
        active: 'Đang hoạt động',
        delayed: 'Bị trễ',
        completed: 'Hoàn thành'
    };

    const growthList = document.getElementById('growth-list');
    if (!growthList) return;

    // Render từng công thức
    growthList.innerHTML = state.formulas.map(formula => {
        const progressPercent = calcProgress(formula);
        const remainingDays = daysLeft(formula);
        const progressColor = formula.status === 'delayed' ? '#f59e0b' : '#10b981';

        // Render các giai đoạn (stages)
        const stagesHtml = formula.stages.map((stage, index) => {
            // Xác định class cho stage dựa trên trạng thái
            let stageClass = 'stage-pending';
            if (stage.completed) stageClass = 'stage-completed';
            else if (stage.currentDay && !stage.completed) stageClass = 'stage-current';

            return `
                <div class="${stageClass} stage-card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                        <div style="font-weight:600;font-size:0.875rem">${index + 1}. ${stage.name}</div>
                        ${stage.completed ? '<span class="chip chip-success" style="font-size:0.7rem">Hoàn thành</span>' : ''}
                    </div>
                    <div style="font-size:0.78rem;color:#6b7280;margin-bottom:6px">
                        ${stage.currentDay ? `${stage.currentDay}/${stage.duration} ngày` : `${stage.duration} ngày`}
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                        <span class="chip chip-default" style="font-size:0.7rem">${stage.temperature}°C</span>
                        <span class="chip chip-default" style="font-size:0.7rem">${stage.soilHumidity}% ẩm</span>
                    </div>
                </div>
            `;
        }).join('');

        // Card tổng thể của công thức
        return `
            <div class="card" style="margin-bottom:16px">
                <!-- Header: ảnh, tên, loại hoa, khu vực, trạng thái -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px">
                    <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:56px;height:56px;border-radius:12px;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
                            🌸
                        </div>
                        <div>
                            <div style="font-size:1.05rem;font-weight:600;margin-bottom:6px">${formula.name}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap">
                                <span class="chip chip-outlined-primary">${formula.flowerType}</span>
                                <span class="chip chip-default">${formula.zone}</span>
                                <span class="chip ${statusClassMap[formula.status]}">${statusLabelMap[formula.status]}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center">
                        ${formula.status === 'delayed'
                            ? `<button class="btn btn-outline-primary btn-sm" onclick="window.openGrowthAdjust('${formula.id}')">⏱ Điều chỉnh chu kỳ</button>`
                            : ''
                        }
                        <button class="btn-icon">✏️</button>
                    </div>
                </div>

                <!-- Thanh tiến độ tổng thể -->
                <div style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <span style="font-size:0.85rem;color:#6b7280">Tiến độ tổng thể</span>
                        <span style="font-size:0.85rem;font-weight:600">${progressPercent}% - Còn ${remainingDays} ngày</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${progressPercent}%;background:${progressColor}"></div>
                    </div>
                </div>

                <!-- Các giai đoạn -->
                <div class="grid grid-4">${stagesHtml}</div>

                <!-- Ngày bắt đầu -->
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.08);font-size:0.78rem;color:#9ca3af">
                    Ngày bắt đầu: ${formula.startDate}
                </div>
            </div>
        `;
    }).join('');
}

// ===================== XỬ LÝ ĐIỀU CHỈNH CHU KỲ =====================

/**
 * Mở modal điều chỉnh chu kỳ cho công thức bị trễ
 * @param {string} id - ID của công thức
 */
export function openGrowthAdjust(id) {
    state.growthAdjustId = id;
    const input = document.getElementById('extend-days');
    if (input) input.value = 0;
    openModal('growth-modal');
}

/**
 * Áp dụng việc kéo dài chu kỳ (thêm số ngày vào giai đoạn hiện tại chưa hoàn thành)
 * Được gọi từ nút "Áp dụng" trong modal
 */
export function applyGrowthAdjust() {
    const extendDays = parseInt(document.getElementById('extend-days')?.value, 10) || 0;
    if (extendDays <= 0) {
        showToast('Nhập số ngày hợp lệ', 'warning');
        return;
    }

    const formula = state.formulas.find(f => f.id === state.growthAdjustId);
    if (formula) {
        // Tìm giai đoạn đầu tiên chưa hoàn thành
        const stageIndex = formula.stages.findIndex(stage => !stage.completed);
        if (stageIndex >= 0) {
            formula.stages[stageIndex].duration += extendDays;
        }
        formula.status = 'active'; // Chuyển trạng thái về active
    }

    closeModal('growth-modal');
    renderGrowth();  // Refresh lại danh sách
    showToast(`Đã kéo dài chu kỳ thêm ${extendDays} ngày`);
}

// ===================== RENDER TOÀN BỘ TRANG =====================

/**
 * Tạo toàn bộ khung HTML cho trang Chu kỳ sinh trưởng
 * Được gọi từ app.js khi người dùng chuyển đến trang growth
 */
export function renderGrowthPage() {
    const container = document.getElementById('page-growth');
    if (!container) return;

    // Xây dựng cấu trúc trang
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Chu kỳ Sinh trưởng</div>
                <div class="page-sub">Theo dõi và điều chỉnh công thức sinh trưởng</div>
            </div>
            <button class="btn btn-primary" id="add-growth-btn">➕ Tạo công thức mới</button>
        </div>
        <div id="growth-list"></div>

        <!-- Modal điều chỉnh chu kỳ -->
        <div class="modal-overlay" id="growth-modal">
            <div class="modal">
                <div class="modal-title">Điều chỉnh chu kỳ sinh trưởng</div>
                <p style="font-size:0.875rem;color:#6b7280;margin-bottom:16px">
                    Kéo dài giai đoạn hiện tại khi gặp thời tiết cực đoan hoặc cây chậm phát triển
                </p>
                <div class="form-group">
                    <label class="form-label">Số ngày kéo dài</label>
                    <input class="form-input" id="extend-days" type="number" value="0" min="0">
                    <div class="form-helper">Hệ thống sẽ tự động dời các giai đoạn tiếp theo</div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('growth-modal')">Hủy</button>
                    <button class="btn btn-primary" onclick="applyGrowthAdjust()">Áp dụng</button>
                </div>
            </div>
        </div>
    `;

    // Sau khi có DOM, đổ dữ liệu
    renderGrowth();

    // Gắn sự kiện cho nút "Tạo công thức mới" (tạm thời chỉ thông báo)
    const addButton = document.getElementById('add-growth-btn');
    if (addButton) {
        addButton.addEventListener('click', () => {
            alert('Tính năng đang phát triển');
        });
    }
}

// ===================== EXPOSE GLOBAL =====================
// Các hàm được gọi từ inline onclick cần được gắn vào window
window.openGrowthAdjust = openGrowthAdjust;
window.applyGrowthAdjust = applyGrowthAdjust;