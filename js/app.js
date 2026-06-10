import { state } from './state.js';
import { initDashboardCharts } from './dashboard.js';
import { renderDevices, approveDevice, openDeviceApproval } from './devices.js';
import { renderZones, selectZone, toggleZoneExpand } from './zones.js';
import { renderGrowth, applyGrowthAdjust, openGrowthAdjust } from './growth.js';
import { renderControls, toggleControlMode, toggleDevice, setControlValue, resetToAuto } from './control.js';
import { renderAlerts, acknowledgeAlert, resolveAlert, dismissAlert } from './alerts.js';
import { renderLogs } from './logs.js';

// Common utilities
export function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function openModal(id) {
  document.getElementById(id).classList.add('open');
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Navigation
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const p = el.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + p).classList.add('active');
    if (p === 'devices') renderDevices();
    if (p === 'zones') renderZones();
    if (p === 'growth') renderGrowth();
    if (p === 'control') renderControls();
    if (p === 'alerts') renderAlerts();
    if (p === 'logs') renderLogs();
  });
});

// Modal overlay close
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) el.classList.remove('open');
  });
});

// Initial render
initDashboardCharts();
renderDevices();
renderZones();
renderGrowth();
renderControls();
renderAlerts();
renderLogs();

// Expose all global functions needed by inline event handlers
window.closeModal = closeModal;
window.openModal = openModal;
window.approveDevice = approveDevice;
window.openDeviceApproval = openDeviceApproval;
window.applyGrowthAdjust = applyGrowthAdjust;
window.openGrowthAdjust = openGrowthAdjust;
window.renderZones = renderZones;
window.selectZone = selectZone;
window.toggleZoneExpand = toggleZoneExpand;
window.toggleControlMode = toggleControlMode;
window.toggleDevice = toggleDevice;
window.setControlValue = setControlValue;
window.resetToAuto = resetToAuto;
window.acknowledgeAlert = acknowledgeAlert;
window.resolveAlert = resolveAlert;
window.dismissAlert = dismissAlert;
window.renderLogs = renderLogs;