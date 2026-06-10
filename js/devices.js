import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';

function deviceStatusChip(s) {
  const m = {ACTIVE: ['chip-success', '✔ Hoạt động'], OFFLINE: ['chip-warning', '⚠ Mất kết nối'], NEEDS_REPLACEMENT: ['chip-error', '✖ Cần thay thế'], PENDING: ['chip-default', '⏳ Chờ phê duyệt']};
  const [cls, txt] = m[s] || ['chip-default', s];
  return `<span class="chip ${cls}">${txt}</span>`;
}

function batteryChip(v) {
  if (!v) return '-';
  const cls = v > 50 ? 'chip-success' : (v > 20 ? 'chip-warning' : 'chip-error');
  return `<span class="chip ${cls}">${v}%</span>`;
}

export function renderDevices() {
  const devs = state.devices;
  const counts = {
    total: devs.length,
    active: devs.filter(d => d.status === 'ACTIVE').length,
    offline: devs.filter(d => d.status === 'OFFLINE').length,
    replace: devs.filter(d => d.status === 'NEEDS_REPLACEMENT').length
  };
  document.getElementById('device-stats').innerHTML = [
    {label: 'Tổng thiết bị', value: counts.total, color: '#3b82f6'},
    {label: 'Đang hoạt động', value: counts.active, color: '#10b981'},
    {label: 'Mất kết nối', value: counts.offline, color: '#f59e0b'},
    {label: 'Cần thay thế', value: counts.replace, color: '#ef4444'}
  ].map(s => `<div class="card"><div class="stat-icon" style="background:${s.color}20;color:${s.color};font-size:1.5rem;font-weight:700">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');

  document.getElementById('device-table').innerHTML = devs.map(d => `
    <tr>
      <td>${d.name}</td>
      <td>${d.type}</td>
      <td><span class="mono">${d.macAddress}</span></td>
      <td>${d.zone || '-'}</td>
      <td>${deviceStatusChip(d.status)}</td>
      <td>${batteryChip(d.batteryLevel)}</td>
      <td style="font-size:0.85rem">${d.lastHeartbeat.toLocaleTimeString('vi-VN')}</td>
      <td>${d.status === 'PENDING' ? `<button class="btn btn-primary btn-sm" onclick="window.openDeviceApproval('${d.id}')">Phê duyệt</button>` : '<button class="btn-icon">⋯</button>'}</td>
    </tr>
  `).join('');
}

export function openDeviceApproval(id) {
  const dev = state.devices.find(d => d.id === id);
  if (!dev) return;
  state.pendingDeviceId = id;
  document.getElementById('dev-name').value = dev.name;
  document.getElementById('dev-type').value = dev.type;
  document.getElementById('dev-zone').value = dev.zone || 'Khu A - Giàn 1';
  document.getElementById('dev-mac').value = dev.macAddress;
  openModal('device-modal');
}

export function approveDevice() {
  const id = state.pendingDeviceId;
  const dev = state.devices.find(d => d.id === id);
  if (!dev) return;
  dev.name = document.getElementById('dev-name').value;
  dev.type = document.getElementById('dev-type').value;
  dev.zone = document.getElementById('dev-zone').value;
  dev.status = 'ACTIVE';
  closeModal('device-modal');
  renderDevices();
  showToast('Thiết bị đã được phê duyệt và kích hoạt');
}

// Expose to global for inline onclick
window.openDeviceApproval = openDeviceApproval;
window.approveDevice = approveDevice;