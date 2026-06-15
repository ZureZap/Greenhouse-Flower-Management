/**
 * growth.js
 * Quản lý trang Chu kỳ sinh trưởng - thêm, sửa, xóa, điều chỉnh công thức.
 */

import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';

// ===================== HÀM TIỆN ÍCH =====================
function calcProgress(formula) {
    const totalDays = formula.stages.reduce((sum, stage) => sum + stage.duration, 0);
    const doneDays = formula.stages.reduce((sum, stage) => {
        if (stage.completed) return sum + stage.duration;
        if (stage.currentDay) return sum + stage.currentDay;
        return sum;
    }, 0);
    return Math.round((doneDays / totalDays) * 100);
}

function daysLeft(formula) {
    const totalDays = formula.stages.reduce((sum, stage) => sum + stage.duration, 0);
    const doneDays = formula.stages.reduce((sum, stage) => {
        if (stage.completed) return sum + stage.duration;
        if (stage.currentDay) return sum + stage.currentDay;
        return sum;
    }, 0);
    return totalDays - doneDays;
}

function generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

// ===================== RENDER DANH SÁCH =====================
export function renderGrowth() {
    const statusClassMap = { active: 'chip-success', delayed: 'chip-warning', completed: 'chip-default' };
    const statusLabelMap = { active: 'Đang hoạt động', delayed: 'Bị trễ', completed: 'Hoàn thành' };
    const growthList = document.getElementById('growth-list');
    if (!growthList) return;

    if (!state.formulas || state.formulas.length === 0) {
        growthList.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Chưa có công thức nào. Hãy tạo mới.</div>';
        return;
    }

    growthList.innerHTML = state.formulas.map(formula => {
        const progressPercent = calcProgress(formula);
        const remainingDays = daysLeft(formula);
        const progressColor = formula.status === 'delayed' ? '#f59e0b' : '#10b981';

        const stagesHtml = formula.stages.map((stage, index) => {
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

        return `
            <div class="card" style="margin-bottom:16px" data-id="${formula.id}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px">
                    <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:56px;height:56px;border-radius:12px;background:#10b98120;display:flex;align-items:center;justify-content:center;font-size:26px;">🌸</div>
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
                            ? `<button class="btn btn-outline-primary btn-sm adjust-btn" data-id="${formula.id}">⏱ Điều chỉnh chu kỳ</button>` 
                            : ''}
                        <button class="btn-icon edit-btn" data-id="${formula.id}" title="Sửa">✏️</button>
                        <button class="btn-icon delete-btn" data-id="${formula.id}" title="Xóa">🗑️</button>
                    </div>
                </div>
                <div style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <span style="font-size:0.85rem;color:#6b7280">Tiến độ tổng thể</span>
                        <span style="font-size:0.85rem;font-weight:600">${progressPercent}% - Còn ${remainingDays} ngày</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${progressPercent}%;background:${progressColor}"></div></div>
                </div>
                <div class="grid grid-4">${stagesHtml}</div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.08);font-size:0.78rem;color:#9ca3af">
                    Ngày bắt đầu: ${formula.startDate}
                </div>
            </div>
        `;
    }).join('');

    // Gắn sự kiện
    document.querySelectorAll('.adjust-btn').forEach(btn => {
        btn.onclick = () => openGrowthAdjust(btn.dataset.id);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => editFormula(btn.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteFormula(btn.dataset.id);
    });
}

// ===================== XÓA CÔNG THỨC =====================
function deleteFormula(id) {
    if (confirm('Bạn có chắc chắn muốn xóa công thức này?')) {
        state.formulas = state.formulas.filter(f => f.id !== id);
        renderGrowth();
        showToast('Đã xóa công thức', 'info');
    }
}

// ===================== THÊM / SỬA CÔNG THỨC (MODAL DÙNG CHUNG) =====================
let tempStages = [];
let editingFormulaId = null;

function renderStageInputs() {
    const container = document.getElementById('stages-container');
    if (!container) return;
    container.innerHTML = tempStages.map((stage, idx) => `
        <div class="stage-row" style="border:1px solid #e5e7eb; padding:12px; margin-bottom:8px; border-radius:8px;">
            <div style="display:flex; gap:8px; margin-bottom:8px;">
                <div style="flex:2"><label>Tên giai đoạn</label><input class="form-input stage-name" data-idx="${idx}" value="${escapeHtml(stage.name)}"></div>
                <div style="flex:1"><label>Ngày</label><input class="form-input stage-duration" data-idx="${idx}" type="number" min="1" value="${stage.duration}"></div>
                <button class="btn-icon remove-stage" data-idx="${idx}" style="margin-top:24px">🗑️</button>
            </div>
            <div style="display:flex; gap:8px;">
                <div style="flex:1"><label>Nhiệt độ (°C)</label><input class="form-input stage-temp" data-idx="${idx}" type="number" step="0.1" value="${stage.temperature}"></div>
                <div style="flex:1"><label>Độ ẩm đất (%)</label><input class="form-input stage-hum" data-idx="${idx}" type="number" value="${stage.soilHumidity}"></div>
            </div>
        </div>
    `).join('');

    // Cập nhật giá trị vào tempStages khi thay đổi
    document.querySelectorAll('.stage-name').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].name = e.target.value; };
    });
    document.querySelectorAll('.stage-duration').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].duration = parseInt(e.target.value) || 1; };
    });
    document.querySelectorAll('.stage-temp').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].temperature = parseFloat(e.target.value) || 0; };
    });
    document.querySelectorAll('.stage-hum').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].soilHumidity = parseInt(e.target.value) || 0; };
    });
    document.querySelectorAll('.remove-stage').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            tempStages.splice(idx, 1);
            renderStageInputs();
        };
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function openFormulaModal(editFormulaData = null) {
    if (editFormulaData) {
        editingFormulaId = editFormulaData.id;
        tempStages = editFormulaData.stages.map(s => ({
            id: s.id || generateId(),
            name: s.name,
            duration: s.duration,
            temperature: s.temperature,
            soilHumidity: s.soilHumidity,
            completed: s.completed || false,
            currentDay: s.currentDay || null
        }));
    } else {
        editingFormulaId = null;
        tempStages = [{
            id: generateId(),
            name: '',
            duration: 1,
            temperature: 22,
            soilHumidity: 70,
            completed: false,
            currentDay: null
        }];
    }

    const modalTitle = editFormulaData ? 'Chỉnh sửa công thức' : 'Tạo công thức sinh trưởng mới';
    const nameValue = editFormulaData ? editFormulaData.name : '';
    const flowerValue = editFormulaData ? editFormulaData.flowerType : '';
    const zoneValue = editFormulaData ? editFormulaData.zone : '';
    const startDateValue = editFormulaData ? editFormulaData.startDate : new Date().toISOString().slice(0,10);

    const modalHtml = `
        <div class="modal-overlay" id="formula-modal">
            <div class="modal" style="width: 700px; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-title">${modalTitle}</div>
                <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                    <div class="form-group">
                        <label class="form-label">Tên công thức</label>
                        <input class="form-input" id="formula-name" value="${escapeHtml(nameValue)}" placeholder="VD: Công thức Hoa Hồng">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Loại hoa</label>
                        <input class="form-input" id="formula-flower" value="${escapeHtml(flowerValue)}" placeholder="Hoa Hồng, Hoa Cúc, ...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Khu vực áp dụng</label>
                        <input class="form-input" id="formula-zone" value="${escapeHtml(zoneValue)}" placeholder="Khu A - Vùng 1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ngày bắt đầu</label>
                        <input class="form-input" type="date" id="formula-start" value="${startDateValue}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Các giai đoạn</label>
                        <div id="stages-container"></div>
                        <button type="button" class="btn btn-outline btn-sm" id="add-stage-btn" style="margin-top:8px">+ Thêm giai đoạn</button>
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 16px;">
                    <button class="btn btn-outline" id="cancel-formula">Hủy</button>
                    <button class="btn btn-primary" id="save-formula">Lưu</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    renderStageInputs();
    openModal('formula-modal');

    document.getElementById('add-stage-btn').onclick = () => {
        tempStages.push({
            id: generateId(),
            name: '',
            duration: 1,
            temperature: 22,
            soilHumidity: 70,
            completed: false,
            currentDay: null
        });
        renderStageInputs();
    };
    document.getElementById('cancel-formula').onclick = () => {
        closeModal('formula-modal');
        document.getElementById('formula-modal').remove();
    };
    document.getElementById('save-formula').onclick = () => {
        const name = document.getElementById('formula-name').value.trim();
        const flowerType = document.getElementById('formula-flower').value.trim();
        const zone = document.getElementById('formula-zone').value.trim();
        const startDate = document.getElementById('formula-start').value;
        if (!name || !flowerType || !zone || !startDate) {
            showToast('Vui lòng điền đầy đủ thông tin', 'warning');
            return;
        }
        if (tempStages.length === 0) {
            showToast('Cần ít nhất một giai đoạn', 'warning');
            return;
        }
        for (let i = 0; i < tempStages.length; i++) {
            if (!tempStages[i].name.trim()) {
                showToast(`Giai đoạn ${i+1} chưa có tên`, 'warning');
                return;
            }
        }
        const stages = tempStages.map(s => ({
            id: s.id,
            name: s.name,
            duration: parseInt(s.duration) || 1,
            temperature: parseFloat(s.temperature) || 0,
            soilHumidity: parseInt(s.soilHumidity) || 0,
            completed: s.completed || false,
            currentDay: s.currentDay || null
        }));

        if (editingFormulaId) {
            // Cập nhật công thức cũ
            const index = state.formulas.findIndex(f => f.id === editingFormulaId);
            if (index !== -1) {
                state.formulas[index] = {
                    ...state.formulas[index],
                    name,
                    flowerType,
                    zone,
                    startDate,
                    stages
                };
                showToast('Đã cập nhật công thức', 'success');
            }
        } else {
            // Thêm mới
            const newFormula = {
                id: generateId(),
                name,
                flowerType,
                zone,
                startDate,
                status: 'active',
                stages
            };
            state.formulas.push(newFormula);
            showToast('Đã thêm công thức mới', 'success');
        }
        closeModal('formula-modal');
        document.getElementById('formula-modal').remove();
        renderGrowth();
    };
}

function editFormula(id) {
    const formula = state.formulas.find(f => f.id === id);
    if (formula) openFormulaModal(formula);
    else showToast('Không tìm thấy công thức', 'error');
}

// ===================== ĐIỀU CHỈNH CHU KỲ =====================
export function openGrowthAdjust(id) {
    state.growthAdjustId = id;
    const input = document.getElementById('extend-days');
    if (input) input.value = 0;
    openModal('growth-modal');
}

export function applyGrowthAdjust() {
    const extendDays = parseInt(document.getElementById('extend-days')?.value, 10) || 0;
    if (extendDays <= 0) {
        showToast('Nhập số ngày hợp lệ', 'warning');
        return;
    }
    const formula = state.formulas.find(f => f.id === state.growthAdjustId);
    if (formula) {
        const stageIndex = formula.stages.findIndex(stage => !stage.completed);
        if (stageIndex >= 0) formula.stages[stageIndex].duration += extendDays;
        formula.status = 'active';
    }
    closeModal('growth-modal');
    renderGrowth();
    showToast(`Đã kéo dài chu kỳ thêm ${extendDays} ngày`);
}

// ===================== RENDER TOÀN BỘ TRANG =====================
export function renderGrowthPage() {
    const container = document.getElementById('page-growth');
    if (!container) return;

    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Chu kỳ Sinh trưởng</div>
                <div class="page-sub">Theo dõi và điều chỉnh công thức sinh trưởng</div>
            </div>
            <button class="btn btn-primary" id="add-growth-btn">➕ Tạo công thức mới</button>
        </div>
        <div id="growth-list"></div>
        <div class="modal-overlay" id="growth-modal">
            <div class="modal">
                <div class="modal-title">Điều chỉnh chu kỳ sinh trưởng</div>
                <p style="font-size:0.875rem;color:#6b7280;margin-bottom:16px">Kéo dài giai đoạn hiện tại khi cây chậm phát triển</p>
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

    renderGrowth();
    document.getElementById('add-growth-btn').onclick = () => openFormulaModal(null);
}

window.openGrowthAdjust = openGrowthAdjust;
window.applyGrowthAdjust = applyGrowthAdjust;