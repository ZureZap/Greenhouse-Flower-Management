import { state } from './state.js';
import { showToast, openModal, closeModal } from './app.js';

function calcProgress(f) {
  const total = f.stages.reduce((s, st) => s + st.duration, 0);
  const done = f.stages.reduce((s, st) => {
    if (st.completed) return s + st.duration;
    if (st.currentDay) return s + st.currentDay;
    return s;
  }, 0);
  return Math.round((done / total) * 100);
}
function daysLeft(f) {
  const total = f.stages.reduce((s, st) => s + st.duration, 0);
  const done = f.stages.reduce((s, st) => {
    if (st.completed) return s + st.duration;
    if (st.currentDay) return s + st.currentDay;
    return s;
  }, 0);
  return total - done;
}

export function renderGrowth() {
  const sm = {active: 'chip-success', delayed: 'chip-warning', completed: 'chip-default'};
  const st = {active: 'Đang hoạt động', delayed: 'Bị trễ', completed: 'Hoàn thành'};
  document.getElementById('growth-list').innerHTML = state.formulas.map(f => {
    const prog = calcProgress(f);
    const left = daysLeft(f);
    const pc = f.status === 'delayed' ? '#f59e0b' : '#10b981';
    const stagesHtml = f.stages.map((s, i) => {
      let cls = s.completed ? 'stage-completed' : (s.currentDay && !s.completed ? 'stage-current' : 'stage-pending');
      return `<div class="${cls} stage-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-weight:600;font-size:0.875rem">${i+1}. ${s.name}</div>
          ${s.completed ? '<span class="chip chip-success" style="font-size:0.7rem">Hoàn thành</span>' : ''}
        </div>
        <div style="font-size:0.78rem;color:#6b7280;margin-bottom:6px">${s.currentDay ? s.currentDay+'/'+s.duration+' ngày' : s.duration+' ngày'}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap"><span class="chip chip-default" style="font-size:0.7rem">${s.temperature}°C</span><span class="chip chip-default" style="font-size:0.7rem">${s.soilHumidity}% ẩm</span></div>
      </div>`;
    }).join('');
    return `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:56px;height:56px;border-radius:12px;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🌸</div>
          <div>
            <div style="font-size:1.05rem;font-weight:600;margin-bottom:6px">${f.name}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip chip-outlined-primary">${f.flowerType}</span><span class="chip chip-default">${f.zone}</span><span class="chip ${sm[f.status]}">${st[f.status]}</span></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${f.status === 'delayed' ? `<button class="btn btn-outline-primary btn-sm" onclick="window.openGrowthAdjust('${f.id}')">⏱ Điều chỉnh chu kỳ</button>` : ''}
          <button class="btn-icon">✏️</button>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:0.85rem;color:#6b7280">Tiến độ tổng thể</span><span style="font-size:0.85rem;font-weight:600">${prog}% - Còn ${left} ngày</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${prog}%;background:${pc}"></div></div>
      </div>
      <div class="grid grid-4">${stagesHtml}</div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.08);font-size:0.78rem;color:#9ca3af">Ngày bắt đầu: ${f.startDate}</div>
    </div>`;
  }).join('');
}

export function openGrowthAdjust(id) {
  state.growthAdjustId = id;
  document.getElementById('extend-days').value = 0;
  openModal('growth-modal');
}

export function applyGrowthAdjust() {
  const days = parseInt(document.getElementById('extend-days').value) || 0;
  if (days <= 0) {
    showToast('Nhập số ngày hợp lệ', 'warning');
    return;
  }
  const f = state.formulas.find(x => x.id === state.growthAdjustId);
  if (f) {
    const idx = f.stages.findIndex(s => !s.completed);
    if (idx >= 0) f.stages[idx].duration += days;
    f.status = 'active';
  }
  closeModal('growth-modal');
  renderGrowth();
  showToast(`Đã kéo dài chu kỳ thêm ${days} ngày`);
}

window.openGrowthAdjust = openGrowthAdjust;
window.applyGrowthAdjust = applyGrowthAdjust;