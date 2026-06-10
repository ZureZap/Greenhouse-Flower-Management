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

// Hiển thị modal thêm thiết bị mới (không phải phê duyệt)
export function showAddDeviceModal() {
  // Reset form
  document.getElementById('dev-name').value = '';
  document.getElementById('dev-type').value = 'Temperature';
  document.getElementById('dev-zone').value = 'Khu A - Giàn 1';
  // Tạo MAC giả
  const fakeMac = 'AA:BB:CC:' + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0');
  document.getElementById('dev-mac').value = fakeMac;
  // Lưu ý: cần phân biệt chế độ "thêm mới" và "phê duyệt"
  // Có thể dùng một biến toàn cục tạm: window._addingNew = true
  window._addingNew = true;
  openModal('device-modal');
}

// Sửa hàm approveDevice để xử lý cả thêm mới và phê duyệt
export function approveDevice() {
  const name = document.getElementById('dev-name').value;
  const type = document.getElementById('dev-type').value;
  const zone = document.getElementById('dev-zone').value;
  const mac = document.getElementById('dev-mac').value;
  
  if (window._addingNew) {
    // Thêm thiết bị mới (trạng thái ACTIVE luôn, hoặc PENDING tùy logic)
    const newDevice = {
      id: Date.now().toString(),
      name,
      type,
      macAddress: mac,
      zone,
      status: 'ACTIVE',
      lastHeartbeat: new Date(),
      batteryLevel: type !== 'Actuator' ? 100 : undefined
    };
    state.devices.push(newDevice);
    showToast('Đã thêm thiết bị mới');
    window._addingNew = false;
  } else {
    // Phê duyệt thiết bị đang chờ (code cũ)
    const id = state.pendingDeviceId;
    const dev = state.devices.find(d => d.id === id);
    if (dev) {
      dev.name = name;
      dev.type = type;
      dev.zone = zone;
      dev.status = 'ACTIVE';
      showToast('Thiết bị đã được phê duyệt');
    }
  }
  closeModal('device-modal');
  renderDevices();
}

// Expose to global for inline onclick
window.openDeviceApproval = openDeviceApproval;
window.approveDevice = approveDevice;
window.showAddDeviceModal = showAddDeviceModal;