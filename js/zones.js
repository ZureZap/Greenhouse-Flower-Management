/**
 * zones.js
 * Quản lý trang Vùng trồng - hiển thị cây phân cấp các khu vực (nhà kính, khu vực, giàn trồng),
 * cho phép xem chi tiết từng vùng, theo dõi nhiệt độ, độ ẩm, danh sách thiết bị con.
 */

import { state } from './state.js';

// ===================== HÀM TIỆN ÍCH HIỂN THỊ =====================

/**
 * Lấy icon tượng trưng cho loại vùng
 * @param {string} type - Loại vùng: 'farm', 'greenhouse', 'zone', 'rack'
 * @returns {string} Emoji icon
 */
function zoneIcon(type) {
    const iconMap = {
        farm: '🏕️',
        greenhouse: '🏠',
        zone: '⬤',
        rack: '📡'
    };
    return iconMap[type] || '📦';
}

/**
 * Chuyển đổi loại vùng sang tên hiển thị tiếng Việt
 * @param {string} type - Loại vùng
 * @returns {string} Tên hiển thị
 */
function zoneTypeName(type) {
    const nameMap = {
        farm: 'Khu trại',
        greenhouse: 'Nhà kính',
        zone: 'Khu vực',
        rack: 'Giàn trồng'
    };
    return nameMap[type] || type;
}

/**
 * Tạo chip hiển thị trạng thái của vùng (tối ưu, cao, bình thường)
 * @param {string} status - Trạng thái: 'optimal', 'high', 'normal'
 * @returns {string} HTML chip hoặc chuỗi rỗng
 */
function statusChipZ(status) {
    if (!status) return '';

    const classMap = {
        optimal: 'chip-success',
        high: 'chip-warning',
        normal: 'chip-default'
    };
    const labelMap = {
        optimal: 'Tối ưu',
        high: 'Cao',
        normal: 'Bình thường'
    };
    const chipClass = classMap[status] || 'chip-default';
    const chipLabel = labelMap[status] || status;
    return `<span class="chip ${chipClass}">${chipLabel}</span>`;
}

// ===================== XÂY DỰNG CÂY PHÂN CẤP =====================

/**
 * Xây dựng HTML cho cây thư mục các vùng (đệ quy)
 * @param {Array} nodes - Danh sách các node vùng
 * @param {number} level - Cấp độ hiện tại (để tính khoảng lề)
 * @returns {string} HTML của cây
 */
function buildTreeHtml(nodes, level = 0) {
    return nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = state.zoneExpanded[node.id];
        const indent = level * 20;  // 20px mỗi cấp
        const isSelected = state.selectedZone && state.selectedZone.id === node.id;

        return `
            <div>
                <div class="tree-item${isSelected ? ' selected' : ''}"
                     style="padding-left: ${12 + indent}px"
                     onclick="window.selectZone('${node.id}')">
                    ${hasChildren
                        ? `<span class="tree-toggle" onclick="event.stopPropagation(); window.toggleZoneExpand('${node.id}')">
                            ${isExpanded ? '▼' : '▶'}
                           </span>`
                        : '<span style="width:20px;display:inline-block"></span>'
                    }
                    <span>${zoneIcon(node.type)}</span>
                    <span>${node.name}</span>
                    ${statusChipZ(node.status)}
                </div>
                ${hasChildren && isExpanded
                    ? `<div style="padding-left: 20px">${buildTreeHtml(node.children, level + 1)}</div>`
                    : ''
                }
            </div>
        `;
    }).join('');
}

/**
 * Tìm kiếm vùng theo ID trong cây (đệ quy)
 * @param {Array} nodes - Danh sách node cần tìm
 * @param {string} id - ID cần tìm
 * @returns {Object|null} Vùng tìm thấy hoặc null
 */
function findZone(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findZone(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

// ===================== XỬ LÝ SỰ KIỆN NGƯỜI DÙNG =====================

/**
 * Mở rộng / thu gọn một vùng trong cây
 * @param {string} id - ID của vùng
 */
export function toggleZoneExpand(id) {
    state.zoneExpanded[id] = !state.zoneExpanded[id];
    renderZones();  // Refresh lại cây
}

/**
 * Chọn một vùng để hiển thị chi tiết
 * @param {string} id - ID của vùng
 */
export function selectZone(id) {
    state.selectedZone = findZone(state.zones, id);
    renderZones();
}

// ===================== HIỂN THỊ CHI TIẾT VÙNG =====================

/**
 * Render thông tin chi tiết của vùng đang được chọn (bên phải)
 * Bao gồm: icon, tên, loại, nhiệt độ/độ ẩm (nếu là zone), danh sách con, số lượng thiết bị
 */
function renderZoneDetail() {
    const detailContainer = document.getElementById('zone-detail');
    if (!detailContainer) return;

    const selectedZone = state.selectedZone;
    if (!selectedZone) {
        detailContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:400px;text-align:center;color:#9ca3af">
                <div>
                    <div style="font-size:2rem;margin-bottom:8px">🗂️</div>
                    <div style="font-size:1rem;font-weight:500;margin-bottom:4px">Chọn một khu vực</div>
                    <div style="font-size:0.85rem">Chọn một khu vực từ cây phân cấp để xem chi tiết</div>
                </div>
            </div>
        `;
        return;
    }

    // Header thông tin chung
    let html = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
            <div style="width:48px;height:48px;border-radius:10px;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:22px">
                ${zoneIcon(selectedZone.type)}
            </div>
            <div>
                <div style="font-size:1.1rem;font-weight:600">${selectedZone.name}</div>
                <div style="font-size:0.8rem;color:#6b7280">${zoneTypeName(selectedZone.type)}</div>
            </div>
        </div>
    `;

    // Nếu là vùng cấp zone (có nhiệt độ, độ ẩm)
    if (selectedZone.type === 'zone') {
        html += `
            <div class="grid grid-2" style="margin-bottom:16px">
                <div style="background:#fef3c7;border-radius:10px;padding:16px">
                    <div style="font-size:0.8rem;color:#6b7280;margin-bottom:4px">Nhiệt độ hiện tại</div>
                    <div style="font-size:1.8rem;font-weight:600;color:#f59e0b">${selectedZone.temperature}°C</div>
                </div>
                <div style="background:#dbeafe;border-radius:10px;padding:16px">
                    <div style="font-size:0.8rem;color:#6b7280;margin-bottom:4px">Độ ẩm hiện tại</div>
                    <div style="font-size:1.8rem;font-weight:600;color:#3b82f6">${selectedZone.humidity}%</div>
                </div>
            </div>
        `;
    }

    // Hiển thị danh sách các vùng con (nếu có)
    if (selectedZone.children && selectedZone.children.length) {
        const childTitle = selectedZone.type === 'zone' ? 'Giàn trồng' : 'Khu vực con';
        html += `<div style="font-weight:600;margin-bottom:10px">${childTitle}</div>`;
        html += `<div class="grid grid-2">`;
        html += selectedZone.children.map(child => `
            <div class="card" style="background:#f9fafb">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span>${zoneIcon(child.type)}</span>
                    <span style="font-weight:600;font-size:0.9rem">${child.name}</span>
                </div>
                ${child.devices ? `<div style="font-size:0.8rem;color:#6b7280">${child.devices} thiết bị</div>` : ''}
            </div>
        `).join('');
        html += `</div>`;
    }

    // Nếu là giàn trồng (rack) và có thông tin thiết bị
    if (selectedZone.type === 'rack' && selectedZone.devices) {
        html += `
            <div class="card" style="background:#f9fafb;margin-top:12px">
                <div style="font-weight:600;margin-bottom:6px">Thông tin giàn trồng</div>
                <div style="font-size:0.85rem;color:#6b7280">Số lượng thiết bị: ${selectedZone.devices}</div>
            </div>
        `;
    }

    detailContainer.innerHTML = html;
}

// ===================== RENDER TOÀN BỘ GIAO DIỆN =====================

/**
 * Cập nhật toàn bộ nội dung động của trang Zones
 * - Cây phân cấp
 * - Chi tiết vùng đang chọn
 * Được gọi sau mỗi lần mở rộng/thu gọn hoặc chọn vùng
 */
export function renderZones() {
    const treeContainer = document.getElementById('zone-tree');
    if (treeContainer) {
        treeContainer.innerHTML = buildTreeHtml(state.zones, 0);
    }
    renderZoneDetail();
}

/**
 * Tạo toàn bộ khung HTML cho trang Quản lý Vùng
 * Được gọi từ app.js khi người dùng chuyển đến trang zones
 */
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
        <div class="grid grid-5-7">
            <!-- Cột trái: cây phân cấp -->
            <div class="card">
                <div class="card-title">Cấu trúc phân cấp</div>
                <div id="zone-tree"></div>
            </div>
            <!-- Cột phải: chi tiết vùng -->
            <div class="card" id="zone-detail">
                <!-- Nội dung sẽ được renderZoneDetail() điền vào -->
            </div>
        </div>
    `;

    // Đổ dữ liệu ban đầu
    renderZones();

    // Gắn sự kiện cho nút "Thêm khu vực" (tạm thời chỉ thông báo)
    const addButton = document.getElementById('add-zone-btn');
    if (addButton) {
        addButton.addEventListener('click', () => {
            alert('Tính năng đang phát triển');
        });
    }
}

// ===================== EXPOSE GLOBAL =====================
// Các hàm được gọi từ inline onclick trong cây (window.selectZone, window.toggleZoneExpand)
window.toggleZoneExpand = toggleZoneExpand;
window.selectZone = selectZone;