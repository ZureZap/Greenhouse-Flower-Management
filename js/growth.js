/**
 * growth.js
 * Quản lý Công thức sinh trưởng (Recipe), Giai đoạn (GrowthStage), Ngưỡng (Threshold).
 * Tuân theo ERD: Recipe (1) -> GrowthStage (N) -> Threshold (N)
 * Hỗ trợ: thêm, sửa, xóa, điều chỉnh chu kỳ (kéo dài stage).
 */

import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';
import { generateId, escapeHtml } from './utils.js';

// ===================== HÀM TIỆN ÍCH TÍNH TOÁN =====================

/**
 * Tính phần trăm tiến độ của công thức
 * @param {Object} recipe - Công thức
 * @returns {number} Phần trăm (0-100)
 */
function calcProgress(recipe) {
    const total = recipe.stages.reduce((s, st) => s + (st.end_day - st.start_day + 1), 0);
    const done = recipe.stages.reduce((s, st) => {
        if (st.completed) return s + (st.end_day - st.start_day + 1);
        if (st.currentDay) return s + (st.currentDay - st.start_day + 1);
        return s;
    }, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
}

/**
 * Tính số ngày còn lại của công thức
 * @param {Object} recipe - Công thức
 * @returns {number} Số ngày còn lại
 */
function daysLeft(recipe) {
    const total = recipe.stages.reduce((s, st) => s + (st.end_day - st.start_day + 1), 0);
    const done = recipe.stages.reduce((s, st) => {
        if (st.completed) return s + (st.end_day - st.start_day + 1);
        if (st.currentDay) return s + (st.currentDay - st.start_day + 1);
        return s;
    }, 0);
    return total - done;
}

// ===================== RENDER DANH SÁCH =====================

export function renderGrowth() {
    const container = document.getElementById('growth-list');
    if (!container) return;

    const recipes = state.recipes || [];
    if (recipes.length === 0) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Chưa có công thức nào. Hãy tạo mới.</div>';
        return;
    }

    const statusMap = { active: 'chip-success', delayed: 'chip-warning', completed: 'chip-default' };
    const statusLabel = { active: 'Đang hoạt động', delayed: 'Bị trễ', completed: 'Hoàn thành' };

    container.innerHTML = recipes.map(recipe => {
        const progress = calcProgress(recipe);
        const left = daysLeft(recipe);
        const progColor = recipe.status === 'delayed' ? '#f59e0b' : '#10b981';

        const stagesHtml = recipe.stages.map((stage, idx) => {
            let stageClass = 'stage-pending';
            if (stage.completed) stageClass = 'stage-completed';
            else if (stage.currentDay && !stage.completed) stageClass = 'stage-current';

            const thresholdsHtml = (stage.thresholds || []).map(th =>
                `<span class="chip chip-default" style="font-size:0.7rem">
                    ${th.metric_type}: ${th.min_value} - ${th.max_value}
                </span>`
            ).join('');

            return `
                <div class="${stageClass} stage-card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                        <div style="font-weight:600;font-size:0.875rem">${idx + 1}. ${stage.name}</div>
                        ${stage.completed ? '<span class="chip chip-success" style="font-size:0.7rem">Hoàn thành</span>' : ''}
                    </div>
                    <div style="font-size:0.78rem;color:#6b7280;margin-bottom:6px">
                        Ngày ${stage.start_day} - ${stage.end_day} ${stage.currentDay ? `(đã: ${stage.currentDay})` : ''}
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">${thresholdsHtml}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="card" style="margin-bottom:16px" data-id="${recipe.id}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px">
                    <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:56px;height:56px;border-radius:12px;background:#10b98120;display:flex;align-items:center;justify-content:center;font-size:26px;">🌿</div>
                        <div>
                            <div style="font-size:1.05rem;font-weight:600;margin-bottom:6px">${recipe.name}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap">
                                <span class="chip chip-outlined-primary">${recipe.flower_type}</span>
                                <span class="chip chip-default">${recipe.creator_name || 'Kỹ thuật viên'}</span>
                                <span class="chip ${statusMap[recipe.status]}">${statusLabel[recipe.status]}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center">
                        ${recipe.status === 'delayed'
                            ? `<button class="btn btn-outline-primary btn-sm adjust-btn" data-id="${recipe.id}">⏱ Điều chỉnh chu kỳ</button>`
                            : ''}
                        <button class="btn-icon edit-btn" data-id="${recipe.id}" title="Sửa">✏️</button>
                        <button class="btn-icon delete-btn" data-id="${recipe.id}" title="Xóa">🗑️</button>
                    </div>
                </div>
                <div style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <span style="font-size:0.85rem;color:#6b7280">Tiến độ tổng thể</span>
                        <span style="font-size:0.85rem;font-weight:600">${progress}% - Còn ${left} ngày</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:${progColor}"></div></div>
                </div>
                <div class="grid grid-4">${stagesHtml}</div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.08);font-size:0.78rem;color:#9ca3af">
                    Ngày tạo: ${recipe.created_date || 'N/A'} | ${recipe.description || ''}
                </div>
            </div>
        `;
    }).join('');

    // Gắn sự kiện
    document.querySelectorAll('.adjust-btn').forEach(btn => {
        btn.onclick = () => openGrowthAdjust(btn.dataset.id);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => editRecipe(btn.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteRecipe(btn.dataset.id);
    });
}

// ===================== XÓA CÔNG THỨC =====================
function deleteRecipe(id) {
    if (confirm('Bạn có chắc chắn muốn xóa công thức này?')) {
        state.recipes = state.recipes.filter(r => r.id !== id);
        renderGrowth();
        showToast('Đã xóa công thức', 'info');
    }
}

// ===================== SỬA CÔNG THỨC =====================
function editRecipe(id) {
    const recipe = state.recipes.find(r => r.id === id);
    if (recipe) openRecipeModal(recipe);
    else showToast('Không tìm thấy công thức', 'error');
}

// ===================== THÊM / SỬA CÔNG THỨC (MODAL) =====================
let tempStages = [];
let editingRecipeId = null;

function renderStageInputs() {
    const container = document.getElementById('stages-container');
    if (!container) return;
    container.innerHTML = tempStages.map((stage, idx) => `
        <div class="stage-row" style="border:1px solid #e5e7eb; padding:12px; margin-bottom:8px; border-radius:8px;">
            <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                <div style="flex:2; min-width:120px;">
                    <label>Tên giai đoạn</label>
                    <input class="form-input stage-name" data-idx="${idx}" value="${escapeHtml(stage.name)}" placeholder="Tên giai đoạn">
                </div>
                <div style="flex:1; min-width:80px;">
                    <label>Ngày bắt đầu</label>
                    <input class="form-input stage-start" data-idx="${idx}" type="number" min="1" value="${stage.start_day}">
                </div>
                <div style="flex:1; min-width:80px;">
                    <label>Ngày kết thúc</label>
                    <input class="form-input stage-end" data-idx="${idx}" type="number" min="1" value="${stage.end_day}">
                </div>
                <div style="flex:1; min-width:100px;">
                    <button class="btn-icon remove-stage" data-idx="${idx}" style="margin-top:24px;">🗑️</button>
                </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <div style="flex:1; min-width:150px;">
                    <label>Ngưỡng (metric:min-max)</label>
                    <input class="form-input stage-thresholds" data-idx="${idx}" value="${(stage.thresholds||[]).map(t=>t.metric_type+':'+t.min_value+'-'+t.max_value).join(', ')}" placeholder="VD: Temperature:22-26, SoilHumidity:70-85">
                </div>
            </div>
        </div>
    `).join('');

    // Cập nhật tempStages khi thay đổi
    document.querySelectorAll('.stage-name').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].name = e.target.value; };
    });
    document.querySelectorAll('.stage-start').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].start_day = parseInt(e.target.value) || 1; };
    });
    document.querySelectorAll('.stage-end').forEach(inp => {
        inp.oninput = (e) => { tempStages[e.target.dataset.idx].end_day = parseInt(e.target.value) || 1; };
    });
    document.querySelectorAll('.stage-thresholds').forEach(inp => {
        inp.oninput = (e) => {
            const raw = e.target.value;
            const thresholds = raw.split(',').map(t => t.trim()).filter(t => t).map(t => {
                const parts = t.split(':');
                if (parts.length === 2) {
                    const range = parts[1].split('-');
                    if (range.length === 2) {
                        return { metric_type: parts[0].trim(), min_value: parseFloat(range[0]), max_value: parseFloat(range[1]) };
                    }
                }
                return null;
            }).filter(t => t);
            tempStages[e.target.dataset.idx].thresholds = thresholds;
        };
    });
    document.querySelectorAll('.remove-stage').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            tempStages.splice(idx, 1);
            renderStageInputs();
        };
    });
}

function openRecipeModal(editData = null) {
    if (editData) {
        editingRecipeId = editData.id;
        tempStages = editData.stages.map(s => ({
            ...s,
            thresholds: s.thresholds || []
        }));
    } else {
        editingRecipeId = null;
        tempStages = [{
            name: '',
            start_day: 1,
            end_day: 10,
            thresholds: [],
            completed: false,
            currentDay: null
        }];
    }

    const modalTitle = editData ? 'Chỉnh sửa công thức' : 'Tạo công thức sinh trưởng mới';
    const nameValue = editData ? editData.name : '';
    const flowerValue = editData ? editData.flower_type : '';
    const creatorValue = editData ? editData.creator_name : '';
    const descValue = editData ? editData.description : '';
    const dateValue = editData ? editData.created_date : new Date().toISOString().slice(0, 10);

    const modalHtml = `
        <div class="modal-overlay" id="recipe-modal">
            <div class="modal" style="width: 800px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-title">${modalTitle}</div>
                <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                    <div class="form-group">
                        <label class="form-label">Tên công thức</label>
                        <input class="form-input" id="recipe-name" value="${escapeHtml(nameValue)}" placeholder="VD: Công thức Hoa Hồng">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Loại hoa</label>
                        <input class="form-input" id="recipe-flower" value="${escapeHtml(flowerValue)}" placeholder="Hoa Hồng, Hoa Cúc, ...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Người tạo</label>
                        <input class="form-input" id="recipe-creator" value="${escapeHtml(creatorValue)}" placeholder="Tên người tạo">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mô tả</label>
                        <input class="form-input" id="recipe-desc" value="${escapeHtml(descValue)}" placeholder="Mô tả công thức">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ngày tạo</label>
                        <input class="form-input" type="date" id="recipe-date" value="${dateValue}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Các giai đoạn</label>
                        <div id="stages-container"></div>
                        <button type="button" class="btn btn-outline btn-sm" id="add-stage-btn" style="margin-top:8px;">+ Thêm giai đoạn</button>
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 16px;">
                    <button class="btn btn-outline" id="cancel-recipe">Hủy</button>
                    <button class="btn btn-primary" id="save-recipe">Lưu</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    renderStageInputs();
    openModal('recipe-modal');

    document.getElementById('add-stage-btn').onclick = () => {
        tempStages.push({
            name: '',
            start_day: 1,
            end_day: 10,
            thresholds: [],
            completed: false,
            currentDay: null
        });
        renderStageInputs();
    };
    document.getElementById('cancel-recipe').onclick = () => {
        closeModal('recipe-modal');
        document.getElementById('recipe-modal').remove();
    };
    document.getElementById('save-recipe').onclick = () => {
        const name = document.getElementById('recipe-name').value.trim();
        const flower_type = document.getElementById('recipe-flower').value.trim();
        const creator_name = document.getElementById('recipe-creator').value.trim();
        const description = document.getElementById('recipe-desc').value.trim();
        const created_date = document.getElementById('recipe-date').value;
        if (!name || !flower_type || !created_date) {
            showToast('Vui lòng điền đầy đủ thông tin (tên, loại hoa, ngày)', 'warning');
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
            if (tempStages[i].start_day >= tempStages[i].end_day) {
                showToast(`Giai đoạn ${i+1}: ngày bắt đầu phải nhỏ hơn ngày kết thúc`, 'warning');
                return;
            }
        }
        const stages = tempStages.map(s => ({
            id: generateId(),
            name: s.name,
            start_day: s.start_day,
            end_day: s.end_day,
            completed: s.completed || false,
            currentDay: s.currentDay || null,
            thresholds: s.thresholds || []
        }));

        if (editingRecipeId) {
            const index = state.recipes.findIndex(r => r.id === editingRecipeId);
            if (index !== -1) {
                state.recipes[index] = {
                    ...state.recipes[index],
                    name,
                    flower_type,
                    creator_name: creator_name || state.recipes[index].creator_name,
                    description,
                    created_date,
                    stages
                };
                showToast('Đã cập nhật công thức', 'success');
            }
        } else {
            const newRecipe = {
                id: generateId(),
                name,
                flower_type,
                creator_id: 'u2',
                creator_name: creator_name || 'Kỹ thuật viên',
                description,
                created_date,
                status: 'active',
                stages
            };
            state.recipes.push(newRecipe);
            showToast('Đã thêm công thức mới', 'success');
        }
        closeModal('recipe-modal');
        document.getElementById('recipe-modal').remove();
        renderGrowth();
    };
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
    const recipe = state.recipes.find(r => r.id === state.growthAdjustId);
    if (recipe) {
        let targetStage = recipe.stages.find(s => !s.completed && s.currentDay !== null);
        if (!targetStage) {
            targetStage = recipe.stages.find(s => !s.completed);
        }
        if (targetStage) {
            targetStage.end_day += extendDays;
            const idx = recipe.stages.indexOf(targetStage);
            let shift = extendDays;
            for (let i = idx + 1; i < recipe.stages.length; i++) {
                recipe.stages[i].start_day += shift;
                recipe.stages[i].end_day += shift;
            }
        }
        recipe.status = 'active';
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
                <div class="page-sub">Quản lý công thức, giai đoạn và ngưỡng điều kiện</div>
            </div>
            <button class="btn btn-primary" id="add-recipe-btn">➕ Tạo công thức mới</button>
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
    document.getElementById('add-recipe-btn').onclick = () => openRecipeModal(null);
}

window.openGrowthAdjust = openGrowthAdjust;
window.applyGrowthAdjust = applyGrowthAdjust;