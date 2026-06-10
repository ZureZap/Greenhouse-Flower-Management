/**
 * logs.js
 * Quản lý trang Nhật ký hệ thống - hiển thị danh sách các thao tác của người dùng (Audit Trail),
 * hỗ trợ lọc theo hành động và vai trò, thống kê tổng số bản ghi, số lần ghi đè và số người dùng hoạt động.
 */

import { state } from './state.js';

// ===================== HÀM RENDER DỮ LIỆU =====================

/**
 * Cập nhật nội dung trang Nhật ký dựa trên bộ lọc hiện tại
 * - Cập nhật 3 card thống kê: tổng bản ghi, số lần ghi đè, số người dùng
 * - Lọc và hiển thị bảng log theo hành động và vai trò
 * Được gọi khi:
 *   - Lần đầu render trang
 *   - Người dùng thay đổi bộ lọc (onchange của select)
 *   - Dữ liệu logs thay đổi (trong tương lai)
 */
export function renderLogs() {
    // Kiểm tra các phần tử bộ lọc tồn tại (tránh lỗi khi gọi sớm)
    const filterAction = document.getElementById('log-filter-action');
    const filterRole = document.getElementById('log-filter-role');
    if (!filterAction || !filterRole) return;

    // Lấy giá trị lọc
    const actionFilter = filterAction.value;
    const roleFilter = filterRole.value;

    // Lọc danh sách log theo điều kiện
    const filteredLogs = state.logs.filter(log =>
        (actionFilter === 'ALL' || log.action === actionFilter) &&
        (roleFilter === 'ALL' || log.userRole === roleFilter)
    );

    // --- Cập nhật 3 card thống kê ---
    const totalEl = document.getElementById('log-total');
    if (totalEl) totalEl.textContent = state.logs.length;

    const overridesEl = document.getElementById('log-overrides');
    if (overridesEl) overridesEl.textContent = state.logs.filter(log => log.action === 'OVERRIDE').length;

    const usersEl = document.getElementById('log-users');
    if (usersEl) usersEl.textContent = new Set(state.logs.map(log => log.userId)).size;

    // --- Ánh xạ hành động sang chip class và icon ---
    const actionMap = {
        CREATE:   ['chip-success', '➕ Tạo mới'],
        UPDATE:   ['chip-info',    '✏️ Cập nhật'],
        DELETE:   ['chip-error',   '🗑 Xóa'],
        OVERRIDE: ['chip-warning', '⚙ Ghi đè']
    };

    // --- Ánh xạ vai trò người dùng sang chip class ---
    const roleMap = {
        'Super Admin': 'chip-error',
        'Agronomist':  'chip-info',
        'Operator':    'chip-default'
    };

    // --- Render bảng log ---
    const tableBody = document.getElementById('log-table');
    if (tableBody) {
        tableBody.innerHTML = filteredLogs.map(log => `
            <tr>
                <!-- Thời gian -->
                <td style="font-size:0.82rem">${log.timestamp.toLocaleString('vi-VN')}</td>
                
                <!-- Người dùng (tên + ID) -->
                <td>
                    <div style="font-weight:500">${log.userName}</div>
                    <div style="font-size:0.75rem;color:#9ca3af">${log.userId}</div>
                </td>
                
                <!-- Vai trò -->
                <td><span class="chip ${roleMap[log.userRole] || 'chip-default'}">${log.userRole}</span></td>
                
                <!-- Hành động (chip) -->
                <td><span class="chip ${(actionMap[log.action] || ['chip-default', ''])[0]}">${(actionMap[log.action] || ['', log.action])[1]}</span></td>
                
                <!-- Tài nguyên -->
                <td style="font-size:0.82rem;max-width:200px">${log.resource}</td>
                
                <!-- Giá trị cũ -->
                <td><span style="font-size:0.82rem;color:#9ca3af;text-decoration:line-through">${log.oldValue || '-'}</span></td>
                
                <!-- Giá trị mới -->
                <td><span style="font-size:0.82rem;color:#10b981;font-weight:500">${log.newValue || '-'}</span></td>
                
                <!-- IP Address (mono font) -->
                <td><span class="mono">${log.ipAddress}</span></td>
            </tr>
        `).join('');
    }
}

// ===================== RENDER TOÀN BỘ TRANG =====================

/**
 * Tạo toàn bộ khung HTML cho trang Nhật ký hệ thống
 * Được gọi từ app.js khi người dùng chuyển đến trang logs
 */
export function renderLogsPage() {
    const container = document.getElementById('page-logs');
    if (!container) return;

    // Xây dựng cấu trúc trang
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Nhật ký Hệ thống</div>
                <div class="page-sub">Audit Trail - Theo dõi mọi thao tác của người dùng</div>
            </div>
        </div>

        <!-- 3 Card thống kê -->
        <div class="card" style="margin-bottom:16px">
            <div class="grid grid-3">
                <div style="background:#dbeafe;border-radius:8px;padding:16px">
                    <div style="font-size:2rem;font-weight:700;color:#3b82f6" id="log-total">0</div>
                    <div style="font-size:0.85rem;color:#6b7280">Tổng số bản ghi</div>
                </div>
                <div style="background:#fef3c7;border-radius:8px;padding:16px">
                    <div style="font-size:2rem;font-weight:700;color:#f59e0b" id="log-overrides">0</div>
                    <div style="font-size:0.85rem;color:#6b7280">Thao tác ghi đè</div>
                </div>
                <div style="background:#dcfce7;border-radius:8px;padding:16px">
                    <div style="font-size:2rem;font-weight:700;color:#10b981" id="log-users">0</div>
                    <div style="font-size:0.85rem;color:#6b7280">Người dùng hoạt động</div>
                </div>
            </div>
        </div>

        <!-- Bảng log + bộ lọc -->
        <div class="card">
            <!-- Bộ lọc -->
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
                <div>
                    <label class="form-label">Lọc theo hành động</label>
                    <select class="form-select" id="log-filter-action" onchange="renderLogs()" style="width:180px">
                        <option value="ALL">Tất cả</option>
                        <option value="CREATE">Tạo mới</option>
                        <option value="UPDATE">Cập nhật</option>
                        <option value="DELETE">Xóa</option>
                        <option value="OVERRIDE">Ghi đè</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Lọc theo vai trò</label>
                    <select class="form-select" id="log-filter-role" onchange="renderLogs()" style="width:200px">
                        <option value="ALL">Tất cả</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Agronomist">Kỹ sư Nông nghiệp</option>
                        <option value="Operator">Người vận hành</option>
                    </select>
                </div>
            </div>

            <!-- Bảng hiển thị log -->
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Người dùng</th>
                            <th>Vai trò</th>
                            <th>Hành động</th>
                            <th>Tài nguyên</th>
                            <th>Giá trị cũ</th>
                            <th>Giá trị mới</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody id="log-table"></tbody>
                </table>
            </div>

            <!-- Chú thích bảo mật -->
            <div style="background:#fef9c3;border-radius:8px;padding:12px;margin-top:16px;font-size:0.82rem">
                <div style="font-weight:600;margin-bottom:4px">🔒 Bảo mật Audit Trail:</div>
                <div>Không ai có quyền xóa hoặc chỉnh sửa bảng nhật ký này. Mọi thao tác đều được lưu trữ vĩnh viễn.</div>
            </div>
        </div>
    `;

    // Sau khi khung được tạo, đổ dữ liệu ban đầu
    renderLogs();
}

// ===================== EXPOSE GLOBAL =====================
// Hàm renderLogs được gọi trực tiếp từ sự kiện onchange của các select,
// cần được gắn vào window để hoạt động trong phạm vi toàn cục
window.renderLogs = renderLogs;