/**
 * zones.js
 * Quản lý trang Vùng trồng - hiển thị cây phân cấp, thêm, sửa, xóa, tìm kiếm vùng.
 * Tuân thủ ERD: Zone có greenhouse_id, recipe_id, start_date.
 * Sử dụng API backend thay vì state.js.
 */

import { showToast, openModal, closeModal } from './app.js';
import { generateId, escapeHtml } from './utils.js';
import { getZones, getRecipes, createZone, updateZone, deleteZone } from './api.js';

// ===================== BIẾN TOÀN CỤC =====================
let zones = [];
let zoneExpanded = {};
let selectedZone = null;
let currentSearchKeyword = '';

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

// ===================== TÌM KIẾM =====================
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

// ===================== XÂY DỰNG CÂY =====================
function buildTreeHtml(nodes, keyword = '', level = 0) {
    const filtered = keyword ? filterNodesByName(nodes, keyword) : nodes;
    return filtered.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = zoneExpanded[node.id];
        const indent = level * 20;
        const isSelected = selectedZone?.id === node.id;

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

// ===================== LẤY DANH SÁCH RECIPE =====================
let recipesCache = [];

async function getRecipeList() {
    if (recipesCache.length === 0) {
        try {
            recipesCache = await getRecipes();
        } catch (err) {
            console.error('Lỗi lấy danh sách recipe:', err);
            recipesCache = [];
        }
    }
    return recipesCache.map(r => ({ id: r.id, name: r.name }));
}

// ===================== RENDER CÂY =====================
function renderZoneTree() {
    const treeContainer = document.getElementById('zone-tree');
    if (!treeContainer) return;
    const keyword = document.getElementById('zone-search')?.value || '';
    currentSearchKeyword = keyword;
    const html = buildTreeHtml(zones, keyword, 0);
    treeContainer.innerHTML = html || '<div class="no-result">Không tìm thấy vùng phù hợp</div>';
}

// ===================== RENDER CHI TIẾT =====================
function renderZoneDetail() {
    const container = document.getElementById('zone-detail');
    const zone = selectedZone;
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
        const recipes = getRecipeList();
        const currentRecipe = recipes.find(r => r.id === zone.recipe_id);
        html += `
            <div class="grid grid-2 zone-metrics">
                <div class="metric-card temp">🌡️ Nhiệt độ: <strong>${zone.temperature || '--'}°C</strong></div>
                <div class="metric-card hum">💧 Độ ẩm: <strong>${zone.humidity || '--'}%</strong></div>
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

// ===================== LOAD DỮ LIỆU =====================
async function loadZones() {
    try {
        const flatZones = await getZones();
        // Build tree
        const map = {};
        const tree = [];
        flatZones.forEach(node => {
            map[node.id] = { ...node, children: [] };
        });
        flatZones.forEach(node => {
            if (node.parent_id !== null && map[node.parent_id]) {
                map[node.parent_id].children.push(map[node.id]);
            } else {
                tree.push(map[node.id]);
            }
        });
        zones = tree; // Gán lại biến global
        return zones;
    } catch (err) { showToast('Lỗi tải danh sách vùng: ' + err.message, 'error');
        throw err; }
}

// ===================== RENDER =====================
export async function renderZones() {
    await renderZoneTree();
    await renderZoneDetail();
}

export async function renderZonesPage() {
    const container = document.getElementById('page-zones');
    if (!container) return;

    try {
        await loadZones();
        await getRecipeList();
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:#ef4444;">Lỗi tải dữ liệu: ${err.message}</div>`;
        return;
    }

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

    await renderZones();

    // Sự kiện tìm kiếm
    const searchInput = document.getElementById('zone-search');
    searchInput.addEventListener('input', () => renderZoneTree());

    // Thêm vùng
    document.getElementById('add-zone-btn').addEventListener('click', () => openZoneModal());

    // Sự kiện trên cây
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

// ===================== EXPAND / SELECT =====================
export function toggleZoneExpand(id) {
    zoneExpanded[id] = !zoneExpanded[id];
    renderZoneTree();
    renderZoneDetail();
}

export function selectZone(id) {
    // Tìm zone trong cây
    function findNode(nodes, targetId) {
        for (const node of nodes) {
            if (node.id === targetId) return node;
            if (node.children) {
                const found = findNode(node.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    const zone = findNode(zones, id);
    if (zone) selectedZone = zone;
    renderZoneDetail();
}

// ===================== CRUD =====================
async function deleteZoneById(id) {
    try {
        await deleteZone(id);
        // Cập nhật lại cây (xóa đệ quy)
        function removeNode(nodes, targetId) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === targetId) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && removeNode(nodes[i].children, targetId)) return true;
            }
            return false;
        }
        removeNode(zones, id);
        if (selectedZone?.id === id) selectedZone = null;
        delete zoneExpanded[id];
        renderZones();
        showToast('Đã xóa vùng', 'info');
    } catch (err) {
        showToast('Lỗi xóa vùng: ' + err.message, 'error');
    }
}

async function saveZone(zoneData) {
    try {
        const { id, name, type, parentId, greenhouse_id, recipe_id, start_date, temperature, humidity, status } = zoneData;
        if (id) {
            // Sửa
            await updateZone(id, { name, type, greenhouse_id, recipe_id, start_date, temperature, humidity, status });
            // Cập nhật trong cây
            function updateNode(nodes) {
                for (const node of nodes) {
                    if (node.id === id) {
                        node.name = name;
                        node.type = type;
                        if (type === 'zone') {
                            node.greenhouse_id = greenhouse_id;
                            node.recipe_id = recipe_id;
                            node.start_date = start_date;
                            node.temperature = temperature;
                            node.humidity = humidity;
                            node.status = status;
                        }
                        return true;
                    }
                    if (node.children && updateNode(node.children)) return true;
                }
                return false;
            }
            updateNode(zones);
            showToast('Đã cập nhật vùng');
        } else {
            // Thêm mới
            const newZone = await createZone({
                name,
                type,
                parent_id: parentId,
                greenhouse_id,
                recipe_id,
                start_date,
                temperature: type === 'zone' ? temperature : undefined,
                humidity: type === 'zone' ? humidity : undefined,
                status: type === 'zone' ? status : undefined
            });
            // Thêm vào cây
            const parent = parentId ? findNodeById(zones, parentId) : null;
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(newZone);
            } else {
                zones.push(newZone);
            }
            showToast('Đã thêm vùng mới');
        }
        await renderZones();
    } catch (err) {
        showToast('Lỗi lưu vùng: ' + err.message, 'error');
    }
}

function findNodeById(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

// ===================== MODAL THÊM/SỬA =====================
function findParentId(nodes, childId) {
    for (const node of nodes) {
        if (node.children && node.children.some(c => c.id === childId)) return node.id;
        if (node.children) {
            const found = findParentId(node.children, childId);
            if (found) return found;
        }
    }
    return null;
}

async function openZoneModal(editId = null) {
    const zone = editId ? findNodeById(zones, editId) : null;
    const title = zone ? 'Sửa vùng' : 'Thêm vùng mới';

    // Lấy danh sách greenhouse từ cây zones
    const greenhouseOptions = [];
    function collectGreenhouses(nodes) {
        for (const node of nodes) {
            if (node.type === 'greenhouse') {
                greenhouseOptions.push({ id: node.id, name: node.name });
            }
            if (node.children) collectGreenhouses(node.children);
        }
    }
    collectGreenhouses(zones);

    // Lấy danh sách recipe
    const recipeOptions = await getRecipeList();

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
    collectParents(zones);

    const parentId = zone ? findParentId(zones, zone.id) : null;

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
                        ${parentOptions.map(p => `<option value="${p.id}" ${p.id === parentId ? 'selected' : ''}>${p.name}</option>`).join('')}
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
    const saveHandler = async () => {
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
        await saveZone(zoneData);
        closeModal('zone-crud-modal');
        modal.remove();
    };
    saveBtn.addEventListener('click', saveHandler);
    cancelBtn.addEventListener('click', () => {
        closeModal('zone-crud-modal');
        modal.remove();
    });
}

// ===================== EXPOSE GLOBAL =====================
window.toggleZoneExpand = toggleZoneExpand;
window.selectZone = selectZone;