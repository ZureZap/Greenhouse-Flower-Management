import { state } from './state.js';
import { showToast } from './app.js';

function timeSince(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return s + ' giây trước';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' phút trước';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' giờ trước';
  return Math.floor(h / 24) + ' ngày trước';
}

export function renderAlerts() {
  const alerts = state.alerts;
  const active = alerts.filter(a => a.status === 'active');
  const acked = alerts.filter(a => a.status === 'acknowledged');
  const crit = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved');
  document.getElementById('al-active-count').textContent = active.length;
  document.getElementById('al-acked-count').textContent = acked.length;
  const critEl = document.getElementById('al-critical-count');
  critEl.textContent = crit.length;
  critEl.style.color = crit.length > 0 ? '#ef4444' : '#10b981';

  const sevMap = {critical: ['chip-error', '🔴 Nghiêm trọng'], warning: ['chip-warning', '⚠ Cảnh báo'], info: ['chip-info', 'ℹ Thông tin']};
  const bm = {critical: 'alert-critical', warning: 'alert-warning-card', info: 'alert-info-card'};
  document.getElementById('alert-list').innerHTML = alerts.filter(a => a.status !== 'resolved').map(a => `
    <div class="alert-card ${bm[a.severity]}${a.status === 'acknowledged' ? ' alert-acked' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div style="display:flex;gap:12px;flex:1">
          <div style="font-size:24px;flex-shrink:0">${a.severity === 'critical' ? '🔴' : (a.severity === 'warning' ? '⚠️' : 'ℹ️')}</div>
          <div style="flex:1">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
              <span style="font-weight:600">${a.title}</span>
              <span class="chip ${sevMap[a.severity][0]}">${sevMap[a.severity][1]}</span>
              ${a.status === 'acknowledged' ? '<span class="chip chip-success">✔ Đã xác nhận</span>' : ''}
            </div>
            <div style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">${a.description}</div>
            <div style="display:flex;gap:12px;font-size:0.78rem;color:#9ca3af;flex-wrap:wrap">
              <span>📍 ${a.zone}</span>
              <span>🕐 ${timeSince(a.timestamp)}</span>
              ${a.acknowledgedBy ? `<span>✓ ${a.acknowledgedBy}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="btn-icon" onclick="window.dismissAlert('${a.id}')">✖</button>
      </div>
      <div style="display:flex;gap:8px">
        ${a.status === 'active' ? `<button class="btn btn-outline btn-sm" onclick="window.acknowledgeAlert('${a.id}')">Xác nhận đã xem</button>` : ''}
        <button class="btn btn-success btn-sm" onclick="window.resolveAlert('${a.id}')">✔ Đánh dấu đã giải quyết</button>
      </div>
    </div>
  `).join('');

  const steps = [
    {time: 'Phút 0', action: 'Thông báo trên Web/App cho Người vận hành', status: 'completed'},
    {time: 'Phút 15', action: 'Gửi SMS cho Kỹ sư trưởng', status: 'active'},
    {time: 'Phút 30', action: 'Gọi điện tự động cho Quản lý nhà kính', status: 'pending'}
  ];
  document.getElementById('escalation-timeline').innerHTML = steps.map(s => `
    <li class="timeline-item">
      <div class="timeline-dot ${s.status === 'completed' ? 'dot-success' : (s.status === 'active' ? 'dot-warning' : 'dot-default')}">
        ${s.status === 'completed' ? '✔' : (s.status === 'active' ? '●' : '○')}
      </div>
      <div>
        <div style="font-weight:600;font-size:0.875rem">${s.time}</div>
        <div style="font-size:0.82rem;color:#6b7280;margin-top:2px">${s.action}</div>
      </div>
    </li>
  `).join('');
}

export function acknowledgeAlert(id) {
  const a = state.alerts.find(x => x.id === id);
  if (a) {
    a.status = 'acknowledged';
    a.acknowledgedBy = 'Người dùng hiện tại';
  }
  renderAlerts();
  showToast('Đã xác nhận cảnh báo');
}

export function resolveAlert(id) {
  const a = state.alerts.find(x => x.id === id);
  if (a) a.status = 'resolved';
  renderAlerts();
  showToast('Đã giải quyết cảnh báo');
}

export function dismissAlert(id) {
  state.alerts = state.alerts.filter(x => x.id !== id);
  renderAlerts();
  showToast('Đã loại bỏ cảnh báo', 'info');
}

window.acknowledgeAlert = acknowledgeAlert;
window.resolveAlert = resolveAlert;
window.dismissAlert = dismissAlert;