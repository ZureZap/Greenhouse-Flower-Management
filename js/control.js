import { state } from './state.js';
import { showToast } from './app.js';

function getTimeRemaining(date) {
  const diff = date - Date.now();
  if (diff <= 0) return '0h 0m';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function renderControls() {
  document.getElementById('control-cards').innerHTML = state.controls.map(c => `
    <div class="control-card ${c.mode === 'MANUAL' ? 'control-manual' : 'control-auto'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div style="display:flex;gap:12px;align-items:center">
          <div style="width:48px;height:48px;border-radius:10px;background:${c.isActive ? '#10b981' : '#d1d5db'};display:flex;align-items:center;justify-content:center;font-size:22px">${c.icon}</div>
          <div><div style="font-weight:600">${c.name}</div><div style="font-size:0.8rem;color:#6b7280">${c.zone}</div></div>
        </div>
        <span class="chip ${c.mode === 'AUTO' ? 'chip-success' : 'chip-warning'}">${c.mode}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="toggle-track ${c.mode === 'MANUAL' ? 'checked' : ''}" onclick="window.toggleControlMode('${c.id}')"></div>
        <span style="font-size:0.875rem">${c.mode === 'AUTO' ? 'Chuyển sang thủ công' : 'Đang ở chế độ thủ công'}</span>
      </div>
      ${c.mode === 'MANUAL' && c.autoResetTime ? `<div class="warn-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-size:0.8rem;font-weight:600">Tự động về AUTO sau: ${getTimeRemaining(c.autoResetTime)}</span><button class="btn btn-outline btn-sm" onclick="window.resetToAuto('${c.id}')">Trả về ngay</button></div>` : ''}
      <div style="margin-bottom:12px">
        <div style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">Công suất: ${c.value}%</div>
        <input type="range" class="slider" value="${c.value}" ${c.mode === 'AUTO' ? 'disabled' : ''} onchange="window.setControlValue('${c.id}', this.value)">
      </div>
      <button class="btn ${c.isActive ? 'btn-error' : 'btn-success'}" style="width:100%" onclick="window.toggleDevice('${c.id}')">${c.isActive ? '🔴 Tắt thiết bị' : '🟢 Bật thiết bị'}</button>
    </div>
  `).join('');
}

export function toggleControlMode(id) {
  const c = state.controls.find(x => x.id === id);
  if (!c) return;
  if (c.mode === 'AUTO') {
    c.mode = 'MANUAL';
    c.autoResetTime = new Date(Date.now() + 2 * 3600000);
    showToast('Chế độ thủ công sẽ tự động tắt sau 2 giờ', 'info');
  } else {
    c.mode = 'AUTO';
    c.autoResetTime = null;
    showToast('Đã chuyển về chế độ tự động');
  }
  renderControls();
}

export function toggleDevice(id) {
  const c = state.controls.find(x => x.id === id);
  if (!c) return;
  if (c.mode === 'AUTO') {
    showToast('Vui lòng chuyển sang chế độ thủ công trước', 'warning');
    return;
  }
  c.isActive = !c.isActive;
  showToast(`${c.isActive ? 'Đã bật' : 'Đã tắt'} ${c.name}`);
  renderControls();
}

export function setControlValue(id, val) {
  const c = state.controls.find(x => x.id === id);
  if (c) c.value = parseInt(val);
  renderControls();
}

export function resetToAuto(id) {
  const c = state.controls.find(x => x.id === id);
  if (c) {
    c.mode = 'AUTO';
    c.autoResetTime = null;
  }
  showToast('Đã trả về chế độ tự động');
  renderControls();
}

window.toggleControlMode = toggleControlMode;
window.toggleDevice = toggleDevice;
window.setControlValue = setControlValue;
window.resetToAuto = resetToAuto;