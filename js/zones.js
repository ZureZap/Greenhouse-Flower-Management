/**
 * zones.js
 * Quản lý trang Vùng trồng - hiển thị cây phân cấp, thêm, sửa, xóa, tìm kiếm vùng.
 * Tuân thủ ERD: Zone có greenhouse_id, recipe_id, start_date.
 */

import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';
import { generateId, getZoneById, escapeHtml, findParentNode } from './utils.js';

// ===================== TIỆN ÍCH =====================
function zoneIcon(type) {
    const map = { farm: '🏕️', greenhouse: '🏠', zone: '⬤', rack: '📡' };
    return map[type] || '📦';
}
function zoneTypeName(type) {
    const map = { farm: 'Khu trại', greenhouse: 'Nhà kính', zone: 'Khu vực', rack: 'Giàn trồng' };
    return map[type] || type;
}
function statusChip(status) {
    if (!status) return '';
    const classMap = { optimal: 'chip-success', high: 'chip-warning', normal: 'chip-default' };
    const labelMap = { optimal: 'Tối ưu', high: 'Cao', normal: 'Bình thường' };
    return `<span class="chip ${classMap[status] || 'chip-default'}">${labelMap[status] || status}</span>`;
}

// ===================== XÂY DỰNG CÂY (CÓ LỌC TÌM KIẾM) =====================
function buildTreeHtml(nodes, keyword = '', level = 0) {
    const filtered = keyword ? filterNodesByName(nodes, keyword) : nodes;
    return filtered.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = state.zoneExpanded[node.id];
        const indent = level * 20;
        const isSelected = state.selectedZone?.id === node.id;

        if (keyword && !node.name.toLowerCase().includes(keyword.toLowerCase()) && hasChildren) {
            const childMatch = filterNodesByName(node.children, keyword).length > 0;
            if (!childMatch) return '';
        }

        return `
            <div class="zone-tree-node" data-zone-id="${node.id}">
                <div class="tree-item${isSelected ? ' selected' : ''}" style="padding-left: ${12 + indent}px">
                    ${hasChildren
                        ? `<span class="tree-toggle" data-toggle-id="${node.id}">${isExpanded ? '▼' : '▶'}</span>`
                        : '<span style="width:20px;display:inline-block"></span>'}
                    <span class="zone-icon">${zoneIcon(node.type)}</span>
                    <span class="zone-name">${node.name}</span>
                    ${statusChip(node.status)}
                </div>
                ${hasChildren && isExpanded ? `<div style="padding-left:20px">${buildTreeHtml(node.children, keyword, level + 1)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function filterNodesByName(nodes, keyword) {
    return nodes.filter(node => {
        if (node.name.toLowerCase().includes(keyword.toLowerCase())) return true;
        if (node.children) {
            node.children = filterNodesByName(node.children, keyword);
            return node.children.length > 0;
        }
        return false;
    });
}

// ===================== TÌM KIẾM VÀ RENDER =====================
let currentSearchKeyword = '';

function renderZoneTree() {
    const treeContainer = document.getElementById('zone-tree');
    if (!treeContainer) return;
    const keyword = document.getElementById('zone-search')?.value || '';
    currentSearchKeyword = keyword;
    const html = buildTreeHtml(state.zones, keyword, 0);
    treeContainer.innerHTML = html || '<div class="no-result">Không tìm thấy vùng phù hợp</div>';
}

// ===================== LẤY DANH SÁCH RECIPE =====================
function getRecipes() {
    return (state.recipes || []).map(r => ({ id: r.id, name: r.name }));
}

// ===================== RENDER CHI TIẾT ZONE =====================
function renderZoneDetail() {
    const container = document.getElementById('zone-detail');
    const zone = state.selectedZone;
    if (!zone) {
        container.innerHTML = `<div class="empty-detail">🗂️ Chọn một khu vực để xem chi tiết</div>`;
        return;
    }

    let html = `
        <div class="detail-header">
            <div class="detail-icon">${zoneIcon(zone.type)}</div>
            <div class="detail-title">
                <div>${zone.name}</div>
                <div class="detail-type">${zoneTypeName(zone.type)}</div>
            </div>
            <div class="detail-actions">
                <button class="btn-icon edit-zone" data-id="${zone.id}" title="Sửa">✏️</button>
                <button class="btn-icon delete-zone" data-id="${zone.id}" title="Xóa">🗑️</button>
            </div>
        </div>
    `;

    if (zone.type === 'zone') {
        // Tìm recipe hiện tại
        const recipes = getRecipes();
        const currentRecipe = recipes.find(r => r.id === zone.recipe_id);
        html += `
            <div class="grid grid-2 zone-metrics">
                <div class="metric-card temp">🌡️ Nhiệt độ: <strong>${zone.temperature}°C</strong></div>
                <div class="metric-card hum">💧 Độ ẩm: <strong>${zone.humidity}%</strong></div>
            </div>
            <div style="margin-bottom:12px;">
                <div><strong>Công thức áp dụng:</strong> ${currentRecipe ? currentRecipe.name : 'Chưa có'}</div>
                <div><strong>Ngày bắt đầu:</strong> ${zone.start_date || 'Chưa có'}</div>
            </div>
        `;
    }

    if (zone.children?.length) {
        const childTitle = zone.type === 'zone' ? 'Giàn trồng' : 'Khu vực con';
        html += `<div class="subtitle">${childTitle}</div><div class="grid grid-2 zone-children">`;
        zone.children.forEach(child => {
            html += `
                <div class="card child-card">
                    <div><span class="child-icon">${zoneIcon(child.type)}</span> ${child.name}</div>
                    ${child.devices ? `<div class="child-devices">📟 ${child.devices} thiết bị</div>` : ''}
                    <div class="child-actions">
                        <button class="btn-icon edit-child" data-id="${child.id}" title="Sửa">✏️</button>
                        <button class="btn-icon delete-child" data-id="${child.id}" title="Xóa">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    if (zone.type === 'rack' && zone.devices) {
        html += `<div class="rack-info">📟 Số lượng thiết bị: ${zone.devices}</div>`;
    }
    container.innerHTML = html;
    attachDetailEvents();
}

function attachDetailEvents() {
    document.querySelectorAll('.edit-zone, .edit-child').forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
    });
    document.querySelectorAll('.delete-zone, .delete-child').forEach(btn => {
        btn.removeEventListener('click', handleDeleteClick);
        btn.addEventListener('click', handleDeleteClick);
    });
}

function handleEditClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    openZoneModal(id);
}
function handleDeleteClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    if (confirm('Xóa vùng này sẽ xóa tất cả vùng con và thiết bị bên trong. Bạn có chắc?')) {
        deleteZoneById(id);
    }
}

// ===================== CRUD ZONE =====================
function deleteZoneById(id) {
    const removeNode = (nodes, id) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
                nodes.splice(i, 1);
                return true;
            }
            if (nodes[i].children && removeNode(nodes[i].children, id)) return true;
        }
        return false;
    };
    removeNode(state.zones, id);
    if (state.selectedZone?.id === id) state.selectedZone = null;
    delete state.zoneExpanded[id];
    renderZones();
    showToast('Đã xóa vùng', 'info');
}

function saveZone(zoneData) {
    const { id, name, type, parentId, greenhouse_id, recipe_id, start_date, temperature, humidity, status } = zoneData;
    if (id) {
        const existing = getZoneById(id);
        if (existing) {
            existing.name = name;
            existing.type = type;
            if (type === 'zone') {
                existing.greenhouse_id = greenhouse_id;
                existing.recipe_id = recipe_id;
                existing.start_date = start_date;
                existing.temperature = temperature;
                existing.humidity = humidity;
                existing.status = status;
            }
            showToast('Đã cập nhật vùng');
        }
    } else {
        const newZone = {
            id: generateId(),
            name,
            type,
            children: [],
            greenhouse_id: greenhouse_id || null,
            recipe_id: recipe_id || null,
            start_date: start_date || null,
        };
        if (type === 'zone') {
            newZone.temperature = temperature || 25;
            newZone.humidity = humidity || 70;
            newZone.status = status || 'normal';
        }
        if (type === 'rack') {
            newZone.devices = 0;
        }
        const parent = parentId ? getZoneById(parentId) : null;
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(newZone);
        } else {
            state.zones.push(newZone);
        }
        showToast('Đã thêm vùng mới');
    }
    renderZones();
}

// ===================== MODAL THÊM/SỬA ZONE =====================
function openZoneModal(editId = null) {
    const zone = editId ? getZoneById(editId) : null;
    const title = zone ? 'Sửa vùng' : 'Thêm vùng mới';

    // Lấy danh sách greenhouse (từ cây) để làm dropdown
    const greenhouseOptions = [];
    function collectGreenhouses(nodes) {
        for (const node of nodes) {
            if (node.type === 'greenhouse') {
                greenhouseOptions.push({ id: node.id, name: node.name });
            }
            if (node.children) collectGreenhouses(node.children);
        }
    }
    collectGreenhouses(state.zones);

    // Lấy danh sách recipe
    const recipeOptions = getRecipes();

    // Lấy danh sách parent
    const parentOptions = [];
    function collectParents(nodes, level = 0) {
        for (const node of nodes) {
            if (node.type !== 'rack') {
                parentOptions.push({ id: node.id, name: '　'.repeat(level) + node.name });
                if (node.children) collectParents(node.children, level + 1);
            }
        }
    }
    collectParents(state.zones);

    const modalHtml = `
        <div class="modal-overlay" id="zone-crud-modal">
            <div class="modal" style="width: 550px; max-width: 95vw;">
                <div class="modal-title">${title}</div>
                <div class="form-group">
                    <label class="form-label">Tên vùng</label>
                    <input class="form-input" id="zone-name" value="${escapeHtml(zone?.name || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Loại vùng</label>
                    <select class="form-select" id="zone-type">
                        <option value="farm" ${zone?.type === 'farm' ? 'selected' : ''}>Khu trại</option>
                        <option value="greenhouse" ${zone?.type === 'greenhouse' ? 'selected' : ''}>Nhà kính</option>
                        <option value="zone" ${zone?.type === 'zone' ? 'selected' : ''}>Khu vực</option>
                        <option value="rack" ${zone?.type === 'rack' ? 'selected' : ''}>Giàn trồng</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Vùng cha</label>
                    <select class="form-select" id="zone-parent">
                        <option value="">-- Không (gốc) --</option>
                        ${parentOptions.map(p => `<option value="${p.id}" ${zone && findParentNode(state.zones, zone.id)?.id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div id="zone-extra-fields" style="display: ${zone?.type === 'zone' ? 'block' : 'none'}">
                    <div class="form-group">
                        <label class="form-label">Thuộc nhà kính</label>
                        <select class="form-select" id="zone-greenhouse">
                            <option value="">-- Không --</option>
                            ${greenhouseOptions.map(gh => `<option value="${gh.id}" ${zone?.greenhouse_id === gh.id ? 'selected' : ''}>${gh.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Công thức áp dụng</label>
                        <select class="form-select" id="zone-recipe">
                            <option value="">-- Không --</option>
                            ${recipeOptions.map(r => `<option value="${r.id}" ${zone?.recipe_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ngày bắt đầu</label>
                        <input class="form-input" type="date" id="zone-start-date" value="${zone?.start_date || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nhiệt độ (°C)</label>
                        <input class="form-input" id="zone-temp" type="number" step="0.1" value="${zone?.temperature || 25}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Độ ẩm (%)</label>
                        <input class="form-input" id="zone-hum" type="number" value="${zone?.humidity || 70}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Trạng thái</label>
                        <select class="form-select" id="zone-status">
                            <option value="optimal" ${zone?.status === 'optimal' ? 'selected' : ''}>Tối ưu</option>
                            <option value="normal" ${zone?.status === 'normal' ? 'selected' : ''}>Bình thường</option>
                            <option value="high" ${zone?.status === 'high' ? 'selected' : ''}>Cao</option>
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" id="cancel-crud">Hủy</button>
                    <button class="btn btn-primary" id="save-crud">Lưu</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('zone-crud-modal');
    openModal('zone-crud-modal');

    const typeSelect = document.getElementById('zone-type');
    const extraDiv = document.getElementById('zone-extra-fields');
    typeSelect.addEventListener('change', () => {
        extraDiv.style.display = typeSelect.value === 'zone' ? 'block' : 'none';
    });

    const saveBtn = document.getElementById('save-crud');
    const cancelBtn = document.getElementById('cancel-crud');
    const saveHandler = () => {
        const name = document.getElementById('zone-name').value.trim();
        const type = typeSelect.value;
        const parentId = document.getElementById('zone-parent').value || null;
        if (!name) {
            showToast('Vui lòng nhập tên vùng', 'warning');
            return;
        }
        const zoneData = {
            id: zone?.id || null,
            name,
            type,
            parentId,
        };
        if (type === 'zone') {
            zoneData.greenhouse_id = document.getElementById('zone-greenhouse').value || null;
            zoneData.recipe_id = document.getElementById('zone-recipe').value || null;
            zoneData.start_date = document.getElementById('zone-start-date').value || null;
            zoneData.temperature = parseFloat(document.getElementById('zone-temp').value);
            zoneData.humidity = parseInt(document.getElementById('zone-hum').value);
            zoneData.status = document.getElementById('zone-status').value;
        }
        saveZone(zoneData);
        closeModal('zone-crud-modal');
        modal.remove();
    };
    saveBtn.addEventListener('click', saveHandler);
    cancelBtn.addEventListener('click', () => {
        closeModal('zone-crud-modal');
        modal.remove();
    });
}

// ===================== RENDER TOÀN BỘ TRANG =====================
export function renderZones() {
    renderZoneTree();
    renderZoneDetail();
}

export function renderZonesPage() {
    const container = document.getElementById('page-zones');
    if (!container) return;
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Quản lý Vùng trồng</div>
                <div class="page-sub">Phân vùng quản lý và trực quan hóa cấu trúc nhà kính</div>
            </div>
            <button class="btn btn-primary" id="add-zone-btn">➕ Thêm khu vực</button>
        </div>
        <div class="zone-search-bar">
            <input type="text" id="zone-search" class="form-input" placeholder="🔍 Tìm kiếm vùng..." style="width: 100%; margin-bottom: 16px;">
        </div>
        <div class="grid grid-5-7">
            <div class="card">
                <div class="card-title">Cấu trúc phân cấp</div>
                <div id="zone-tree"></div>
            </div>
            <div class="card" id="zone-detail"></div>
        </div>
    `;

    renderZones();
    const searchInput = document.getElementById('zone-search');
    searchInput.addEventListener('input', () => renderZoneTree());
    document.getElementById('add-zone-btn').addEventListener('click', () => openZoneModal());
    document.getElementById('zone-tree')?.addEventListener('click', (e) => {
        const toggle = e.target.closest('.tree-toggle');
        if (toggle) {
            const id = toggle.getAttribute('data-toggle-id');
            if (id) toggleZoneExpand(id);
            return;
        }
        const nodeDiv = e.target.closest('.zone-tree-node');
        if (nodeDiv) {
            const id = nodeDiv.getAttribute('data-zone-id');
            if (id) selectZone(id);
        }
    });
}

export function toggleZoneExpand(id) {
    state.zoneExpanded[id] = !state.zoneExpanded[id];
    renderZoneTree();
    renderZoneDetail();
}

export function selectZone(id) {
    const zone = getZoneById(id);
    if (zone) state.selectedZone = zone;
    renderZoneDetail();
}

window.toggleZoneExpand = toggleZoneExpand;
window.selectZone = selectZone;