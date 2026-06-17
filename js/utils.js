/**
 * utils.js
 * Các hàm tiện ích dùng chung cho toàn bộ ứng dụng.
 * Hỗ trợ nhận dữ liệu zones từ bên ngoài thông qua API, không phụ thuộc vào state.js.
 */

// ===================== ZONE UTILITIES =====================

/**
 * Lấy danh sách tất cả greenhouse từ cây zones
 * @param {Array} zonesData - Cây zones
 * @returns {Array} Mảng { id, name }
 */
export function getGreenhouses(zonesData = []) {
    const result = [];
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.type === 'greenhouse') {
                result.push({ id: node.id, name: node.name });
            }
            if (node.children) traverse(node.children);
        }
    }
    traverse(zonesData);
    return result;
}

/**
 * Tìm node cha của một node trong cây
 * @param {Array} nodes - Cây zones
 * @param {string} childId - ID của node con
 * @returns {Object|null} Node cha hoặc null
 */
export function findParentNode(nodes, childId) {
    for (const node of nodes) {
        if (node.children) {
            for (const child of node.children) {
                if (child.id === childId) return node;
                const found = findParentNode(node.children, childId);
                if (found) return found;
            }
        }
    }
    return null;
}

/**
 * Tìm một zone theo ID
 * @param {string} zoneId - ID cần tìm
 * @param {Array} nodes - Cây zones
 * @returns {Object|null} Zone hoặc null
 */
export function getZoneById(zoneId, nodes = []) {
    for (const node of nodes) {
        if (node.id === zoneId) return node;
        if (node.children) {
            const found = getZoneById(zoneId, node.children);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Lấy tên zone từ ID
 * @param {string} zoneId - ID của zone
 * @param {Array} zonesData - Cây zones
 * @returns {string} Tên zone hoặc ID nếu không tìm thấy
 */
export function getZoneName(zoneId, zonesData = []) {
    const zone = getZoneById(zoneId, zonesData);
    return zone ? zone.name : zoneId;
}

/**
 * Lấy ID greenhouse chứa một zone
 * @param {string} zoneId - ID của zone
 * @param {Array} zonesData - Cây zones
 * @returns {string|null} ID greenhouse hoặc null
 */
export function getGreenhouseIdByZoneId(zoneId, zonesData = []) {
    const zone = getZoneById(zoneId, zonesData);
    if (!zone) return null;
    let parent = findParentNode(zonesData, zoneId);
    while (parent) {
        if (parent.type === 'greenhouse') return parent.id;
        parent = findParentNode(zonesData, parent.id);
    }
    return null;
}

/**
 * Lấy danh sách zone theo greenhouse
 * @param {string|null} greenhouseId - ID greenhouse (null để lấy tất cả)
 * @param {Array} zonesData - Cây zones
 * @returns {Array} Mảng { id, name }
 */
export function getZoneOptions(greenhouseId = null, zonesData = []) {
    const zones = [];
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.type === 'zone') {
                if (greenhouseId) {
                    const ghId = getGreenhouseIdByZoneId(node.id, zonesData);
                    if (ghId === greenhouseId) {
                        zones.push({ id: node.id, name: node.name });
                    }
                } else {
                    zones.push({ id: node.id, name: node.name });
                }
            }
            if (node.children) traverse(node.children);
        }
    }
    traverse(zonesData);
    return zones;
}

// ===================== ID UTILITIES =====================

/**
 * Sinh ID duy nhất dựa trên timestamp và random
 * @returns {string} ID dạng "timestamp-random"
 */
export function generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

// ===================== HTML UTILITIES =====================

/**
 * Escape các ký tự đặc biệt trong HTML để tránh XSS
 * @param {string} str - Chuỗi cần escape
 * @returns {string} Chuỗi đã escape
 */
export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===================== TIME UTILITIES =====================

/**
 * Chuyển timestamp thành chuỗi thời gian tương đối
 * @param {Date} date - Thời điểm cần tính
 * @returns {string} "5 phút trước", "2 giờ trước", ...
 */
export function timeSince(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s < 60) return s + ' giây trước';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' phút trước';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' giờ trước';
    return Math.floor(h / 24) + ' ngày trước';
}

/**
 * Tính thời gian còn lại từ một thời điểm trong tương lai
 * @param {Date} date - Thời điểm trong tương lai
 * @returns {string} "Xh Ym" hoặc "0h 0m"
 */
export function getTimeRemaining(date) {
    if (!date) return '';
    const diff = date - Date.now();
    if (diff <= 0) return '0h 0m';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
}