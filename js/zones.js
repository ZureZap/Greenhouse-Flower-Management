import { state } from './state.js';

function zoneIcon(t) {
  return {farm: '🏕️', greenhouse: '🏠', zone: '⬤', rack: '📡'}[t] || '📦';
}
function zoneTypeName(t) {
  return {farm: 'Khu trại', greenhouse: 'Nhà kính', zone: 'Khu vực', rack: 'Giàn trồng'}[t] || t;
}
function statusChipZ(s) {
  if (!s) return '';
  const m = {optimal: 'chip-success', high: 'chip-warning', normal: 'chip-default'};
  const tx = {optimal: 'Tối ưu', high: 'Cao', normal: 'Bình thường'};
  return ` <span class="chip ${m[s] || 'chip-default'}">${tx[s]}</span>`;
}

function buildTreeHtml(nodes, level = 0) {
  return nodes.map(node => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = state.zoneExpanded[node.id];
    const indent = level * 20;
    const selected = state.selectedZone && state.selectedZone.id === node.id;
    return `<div>
      <div class="tree-item${selected ? ' selected' : ''}" style="padding-left:${12 + indent}px" onclick="window.selectZone('${node.id}')">
        ${hasChildren ? `<span class="tree-toggle" onclick="event.stopPropagation();window.toggleZoneExpand('${node.id}')">${expanded ? '▼' : '▶'}</span>` : '<span style="width:20px;display:inline-block"></span>'}
        <span>${zoneIcon(node.type)}</span> <span>${node.name}</span>${statusChipZ(node.status)}
      </div>
      ${hasChildren && expanded ? `<div style="padding-left:20px">${buildTreeHtml(node.children, level + 1)}</div>` : ''}
    </div>`;
  }).join('');
}

function findZone(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findZone(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function toggleZoneExpand(id) {
  state.zoneExpanded[id] = !state.zoneExpanded[id];
  renderZones();
}

export function selectZone(id) {
  state.selectedZone = findZone(state.zones, id);
  renderZones();
}

export function renderZones() {
  document.getElementById('zone-tree').innerHTML = buildTreeHtml(state.zones, 0);
  const detail = document.getElementById('zone-detail');
  const z = state.selectedZone;
  if (!z) {
    detail.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:400px;text-align:center;color:#9ca3af"><div><div style="font-size:2rem;margin-bottom:8px">🗂️</div><div style="font-size:1rem;font-weight:500;margin-bottom:4px">Chọn một khu vực</div><div style="font-size:0.85rem">Chọn một khu vực từ cây phân cấp để xem chi tiết</div></div></div>';
    return;
  }
  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:48px;height:48px;border-radius:10px;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:22px">${zoneIcon(z.type)}</div><div><div style="font-size:1.1rem;font-weight:600">${z.name}</div><div style="font-size:0.8rem;color:#6b7280">${zoneTypeName(z.type)}</div></div></div>`;
  if (z.type === 'zone') {
    html += `<div class="grid grid-2" style="margin-bottom:16px"><div style="background:#fef3c7;border-radius:10px;padding:16px"><div style="font-size:0.8rem;color:#6b7280;margin-bottom:4px">Nhiệt độ hiện tại</div><div style="font-size:1.8rem;font-weight:600;color:#f59e0b">${z.temperature}°C</div></div><div style="background:#dbeafe;border-radius:10px;padding:16px"><div style="font-size:0.8rem;color:#6b7280;margin-bottom:4px">Độ ẩm hiện tại</div><div style="font-size:1.8rem;font-weight:600;color:#3b82f6">${z.humidity}%</div></div></div>`;
  }
  if (z.children && z.children.length) {
    html += `<div style="font-weight:600;margin-bottom:10px">${z.type === 'zone' ? 'Giàn trồng' : 'Khu vực con'}</div><div class="grid grid-2">${z.children.map(c => `<div class="card" style="background:#f9fafb"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span>${zoneIcon(c.type)}</span><span style="font-weight:600;font-size:0.9rem">${c.name}</span></div>${c.devices ? `<div style="font-size:0.8rem;color:#6b7280">${c.devices} thiết bị</div>` : ''}</div>`).join('')}</div>`;
  }
  if (z.type === 'rack' && z.devices) {
    html += `<div class="card" style="background:#f9fafb;margin-top:12px"><div style="font-weight:600;margin-bottom:6px">Thông tin giàn trồng</div><div style="font-size:0.85rem;color:#6b7280">Số lượng thiết bị: ${z.devices}</div></div>`;
  }
  detail.innerHTML = html;
}

// Expose to global for inline onclick
window.toggleZoneExpand = toggleZoneExpand;
window.selectZone = selectZone;