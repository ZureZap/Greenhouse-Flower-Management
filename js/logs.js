import { state } from './state.js';

export function renderLogs() {
  const fa = document.getElementById('log-filter-action').value;
  const fr = document.getElementById('log-filter-role').value;
  const filtered = state.logs.filter(l => (fa === 'ALL' || l.action === fa) && (fr === 'ALL' || l.userRole === fr));
  document.getElementById('log-total').textContent = state.logs.length;
  document.getElementById('log-overrides').textContent = state.logs.filter(l => l.action === 'OVERRIDE').length;
  document.getElementById('log-users').textContent = new Set(state.logs.map(l => l.userId)).size;

  const am = {CREATE: ['chip-success', '➕ Tạo mới'], UPDATE: ['chip-info', '✏️ Cập nhật'], DELETE: ['chip-error', '🗑 Xóa'], OVERRIDE: ['chip-warning', '⚙ Ghi đè']};
  const rm = {'Super Admin': 'chip-error', 'Agronomist': 'chip-info', 'Operator': 'chip-default'};
  document.getElementById('log-table').innerHTML = filtered.map(l => `
    <tr>
      <td style="font-size:0.82rem">${l.timestamp.toLocaleString('vi-VN')}</td>
      <td><div style="font-weight:500">${l.userName}</div><div style="font-size:0.75rem;color:#9ca3af">${l.userId}</div></td>
      <td><span class="chip ${rm[l.userRole] || 'chip-default'}">${l.userRole}</span></td>
      <td><span class="chip ${(am[l.action] || ['chip-default', ''])[0]}">${(am[l.action] || ['', ''])[1] || l.action}</span></td>
      <td style="font-size:0.82rem;max-width:200px">${l.resource}</td>
      <td><span style="font-size:0.82rem;color:#9ca3af;text-decoration:line-through">${l.oldValue || '-'}</span></td>
      <td><span style="font-size:0.82rem;color:#10b981;font-weight:500">${l.newValue || '-'}</span></td>
      <td><span class="mono">${l.ipAddress}</span></td>
    </tr>
  `).join('');
}

// Expose to global for inline onchange
window.renderLogs = renderLogs;