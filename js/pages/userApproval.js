import { state } from '../state.js';
import { approveUser, rejectUser, getCurrentUser } from '../auth.js';
import { showToast } from '../app.js';

export function renderUserApprovalPage() {
    const container = document.getElementById('page-user-approval');
    if (!container) return;
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'OWNER') {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Bạn không có quyền truy cập trang này.</div>';
        return;
    }
    const pendingUsers = state.users.filter(u => u.status === 'PENDING');
    if (pendingUsers.length === 0) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Hiện không có tài khoản nào chờ phê duyệt.</div>';
        return;
    }
    let html = `<div class="page-header"><div><div class="page-title">Phê duyệt tài khoản</div><div class="page-sub">Danh sách người dùng đang chờ kích hoạt</div></div></div>
                <div class="card"><div class="table-wrap"><table><thead><tr><th>Tên đăng nhập</th><th>Email</th><th>Số điện thoại</th><th>Vai trò</th><th>Thao tác</th></tr></thead><tbody>`;
    pendingUsers.forEach(user => {
        html += `<tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>${user.role}</td>
                    <td><button class="btn btn-success btn-sm approve-btn" data-id="${user.id}">✔ Phê duyệt</button>
                        <button class="btn btn-error btn-sm reject-btn" data-id="${user.id}">✖ Từ chối</button></td>
                 </tr>`;
    });
    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            approveUser(btn.getAttribute('data-id'));
            showToast('Đã phê duyệt tài khoản', 'success');
            renderUserApprovalPage();
        });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Từ chối sẽ xóa tài khoản này. Bạn chắc chắn?')) {
                rejectUser(btn.getAttribute('data-id'));
                showToast('Đã từ chối và xóa tài khoản', 'info');
                renderUserApprovalPage();
            }
        });
    });
}