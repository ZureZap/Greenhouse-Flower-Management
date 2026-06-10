import { state } from './state.js';

let areaChart, radarChart, lineChart;

function generateTimeLabels() {
  const now = new Date();
  return Array.from({length: 24}, (_, i) => '' + ((now.getHours() - 23 + i + 24) % 24) + ':00');
}

export function initDashboardCharts() {
  const labels = generateTimeLabels();
  const tempData = labels.map(() => 22 + Math.random() * 6);
  const humData = labels.map(() => 65 + Math.random() * 20);
  const lightData = labels.map(() => 300 + Math.random() * 500);
  const co2Data = labels.map(() => 400 + Math.random() * 200);

  areaChart = new Chart(document.getElementById('areaChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {label: 'Nhiệt độ (°C)', data: tempData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', fill: true, tension: 0.4, pointRadius: 0},
        {label: 'Độ ẩm (%)', data: humData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.4, pointRadius: 0}
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { color: '#f0f0f0' } }, y: { grid: { color: '#f0f0f0' } } } }
  });

  radarChart = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: ['Nhiệt độ', 'Độ ẩm', 'Ánh sáng', 'CO2', 'pH đất'],
      datasets: [
        {label: 'Thực tế', data: [85, 75, 90, 80, 88], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.4)', pointBackgroundColor: '#10b981'},
        {label: 'Tối ưu', data: [90, 80, 85, 75, 90], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', pointBackgroundColor: '#3b82f6'}
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { r: { min: 0, max: 100, ticks: { display: false } } } }
  });

  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {label: 'Ánh sáng (lux)', data: lightData, borderColor: '#f59e0b', tension: 0.4, pointRadius: 0, yAxisID: 'y'},
        {label: 'CO2 (ppm)', data: co2Data, borderColor: '#10b981', tension: 0.4, pointRadius: 0, yAxisID: 'y1'}
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { color: '#f0f0f0' } }, y: { grid: { color: '#f0f0f0' }, position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
  });
}