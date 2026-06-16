/**
 * dashboard.js
 * Quản lý trang Dashboard - hiển thị tổng quan các chỉ số môi trường nhà kính,
 * bao gồm nhiệt độ, độ ẩm, ánh sáng, CO2 và các biểu đồ thống kê.
 * Hỗ trợ chuyển đổi giữa các nhà kính khác nhau.
 * Tích hợp dữ liệu thật từ state (thiết bị, cảnh báo, zone).
 */

import { state } from './state.js';
import { getGreenhouses, getGreenhouseIdByZoneId, getZoneName, getZoneById } from './utils.js';

// --- Biến toàn cục ---
let areaChart, radarChart, lineChart;
let currentGreenhouseId = null;

/**
 * Tạo nhãn thời gian cho 24 giờ (dựa trên giờ hiện tại, quay ngược 23 giờ)
 * @returns {string[]} Mảng 24 nhãn dạng "HH:00"
 */
function generateTimeLabels() {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
        const hour = (now.getHours() - 23 + i + 24) % 24;
        return `${hour}:00`;
    });
}

// ===================== HÀM LẤY ZONE THEO GREENHOUSE =====================
/**
 * Lấy danh sách zone thuộc một greenhouse (dùng zone_id)
 */
function getZonesByGreenhouse(greenhouseId) {
    const zones = [];
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.type === 'zone') {
                const ghId = getGreenhouseIdByZoneId(node.id);
                if (ghId === greenhouseId) {
                    zones.push(node);
                }
            }
            if (node.children) traverse(node.children);
        }
    }
    traverse(state.zones);
    return zones;
}

// ===================== TÍNH TOÁN DỮ LIỆU THỐNG KÊ =====================
function getStatsForGreenhouse(greenhouseId) {
    const zones = getZonesByGreenhouse(greenhouseId);
    const zoneIds = zones.map(z => z.id);

    // Thiết bị: lọc theo zone_id
    const devicesInGreenhouse = state.devices.filter(d => zoneIds.includes(d.zone_id));
    const totalDevices = devicesInGreenhouse.length;
    const activeDevices = devicesInGreenhouse.filter(d => d.status === 'ACTIVE').length;
    const offlineDevices = devicesInGreenhouse.filter(d => d.status === 'OFFLINE').length;
    const needReplace = devicesInGreenhouse.filter(d => d.status === 'NEEDS_REPLACEMENT').length;

    // Cảnh báo: lọc theo zone_id
    const alertsInGreenhouse = state.alerts.filter(a => zoneIds.includes(a.zone_id));
    const criticalAlerts = alertsInGreenhouse.filter(a => a.severity === 'critical' && a.status === 'active').length;
    const warningAlerts = alertsInGreenhouse.filter(a => a.severity === 'warning' && a.status === 'active').length;
    const infoAlerts = alertsInGreenhouse.filter(a => a.severity === 'info' && a.status === 'active').length;

    // Zone đang trồng (có recipe_id)
    const zonesWithRecipe = zones.filter(z => z.recipe_id);

    // Nhiệt độ / độ ẩm trung bình (lấy từ zone nếu có)
    let avgTemp = 0, avgHum = 0;
    const zonesWithTemp = zones.filter(z => z.temperature !== undefined && z.humidity !== undefined);
    if (zonesWithTemp.length > 0) {
        avgTemp = zonesWithTemp.reduce((sum, z) => sum + z.temperature, 0) / zonesWithTemp.length;
        avgHum = zonesWithTemp.reduce((sum, z) => sum + z.humidity, 0) / zonesWithTemp.length;
    } else {
        // Fallback random nếu không có dữ liệu thực
        const seed = greenhouseId.length + greenhouseId.charCodeAt(0);
        avgTemp = 20 + (seed % 8) + Math.random() * 2;
        avgHum = 60 + (seed % 25) + Math.random() * 5;
    }

    return {
        avgTemp,
        avgHum,
        totalDevices,
        activeDevices,
        offlineDevices,
        needReplace,
        criticalAlerts,
        warningAlerts,
        infoAlerts,
        zonesWithRecipe: zonesWithRecipe.length,
        totalZones: zones.length
    };
}

/**
 * Lấy dữ liệu biểu đồ (mô phỏng)
 */
function getChartData(greenhouseId) {
    const seed = greenhouseId.length + greenhouseId.charCodeAt(0);
    const rand = (min, max) => Math.random() * (max - min) + min;
    const labels = generateTimeLabels();
    const baseTemp = 20 + (seed % 8);
    const tempData = labels.map(() => baseTemp + rand(-3, 3));
    const baseHum = 60 + (seed % 25);
    const humData = labels.map(() => baseHum + rand(-10, 10));
    const baseLight = 300 + (seed % 200);
    const lightData = labels.map(() => baseLight + rand(-100, 100));
    const baseCo2 = 400 + (seed % 100);
    const co2Data = labels.map(() => baseCo2 + rand(-50, 50));

    return { tempData, humData, lightData, co2Data };
}

// ===================== BIỂU ĐỒ =====================
function destroyCharts() {
    if (areaChart) { areaChart.destroy(); areaChart = null; }
    if (radarChart) { radarChart.destroy(); radarChart = null; }
    if (lineChart) { lineChart.destroy(); lineChart = null; }
}

function initCharts(data, stats) {
    const labels = generateTimeLabels();
    const { tempData, humData, lightData, co2Data } = data;

    // 1. Area chart
    const areaCtx = document.getElementById('areaChart')?.getContext('2d');
    if (areaCtx) {
        areaChart = new Chart(areaCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Nhiệt độ (°C)',
                        data: tempData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Độ ẩm (%)',
                        data: humData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { grid: { color: '#f0f0f0' } },
                    y: { grid: { color: '#f0f0f0' } }
                }
            }
        });
    }

    // 2. Radar chart
    const radarCtx = document.getElementById('radarChart')?.getContext('2d');
    if (radarCtx) {
        const avgTemp = stats.avgTemp;
        const avgHum = stats.avgHum;
        // Chuẩn hóa về thang 0-100
        const norm = (val, min, max) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
        const tempScore = norm(avgTemp, 15, 35);
        const humScore = norm(avgHum, 40, 90);
        const lightScore = 65 + Math.random() * 20; // fallback
        const co2Score = 70 + Math.random() * 15;
        const phScore = 70 + Math.random() * 20;

        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Nhiệt độ', 'Độ ẩm', 'Ánh sáng', 'CO2', 'pH đất'],
                datasets: [
                    {
                        label: 'Thực tế',
                        data: [tempScore, humScore, lightScore, co2Score, phScore],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.4)',
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Tối ưu',
                        data: [85, 80, 75, 80, 85],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        pointBackgroundColor: '#3b82f6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    // 3. Line chart
    const lineCtx = document.getElementById('lineChart')?.getContext('2d');
    if (lineCtx) {
        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ánh sáng (lux)',
                        data: lightData,
                        borderColor: '#f59e0b',
                        tension: 0.4,
                        pointRadius: 0,
                        yAxisID: 'y'
                    },
                    {
                        label: 'CO2 (ppm)',
                        data: co2Data,
                        borderColor: '#10b981',
                        tension: 0.4,
                        pointRadius: 0,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { grid: { color: '#f0f0f0' } },
                    y: {
                        position: 'left',
                        title: { display: true, text: 'Ánh sáng (lux)' },
                        grid: { color: '#f0f0f0' }
                    },
                    y1: {
                        position: 'right',
                        title: { display: true, text: 'CO2 (ppm)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }
}

// ===================== RENDER DASHBOARD =====================
export function renderDashboardPage() {
    const container = document.getElementById('page-dashboard');
    if (!container) return;

    const greenhouses = getGreenhouses();
    if (greenhouses.length === 0) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Không có dữ liệu nhà kính</div>';
        return;
    }

    // Lấy greenhouse đã chọn từ localStorage hoặc chọn cái đầu
    const saved = localStorage.getItem('selectedGreenhouse');
    if (saved && greenhouses.find(g => g.id === saved)) {
        currentGreenhouseId = saved;
    } else if (!currentGreenhouseId) {
        currentGreenhouseId = greenhouses[0].id;
    }

    const stats = getStatsForGreenhouse(currentGreenhouseId);
    const chartData = getChartData(currentGreenhouseId);

    // Xây dựng giao diện
    container.innerHTML = `
        <div class="page-header" style="position: relative;">
            <div>
                <div class="page-title">Dashboard Tổng quan</div>
                <div class="page-sub">Giám sát thời gian thực các chỉ số môi trường nhà kính</div>
            </div>
            <div style="position: absolute; top: 0; right: 0;">
                <label style="font-size:0.85rem; color:#6b7280; margin-right:8px;">🏠 Nhà kính:</label>
                <select id="greenhouse-select" class="form-select" style="width:auto; display:inline-block;">
                    ${greenhouses.map(gh => `<option value="${gh.id}" ${gh.id === currentGreenhouseId ? 'selected' : ''}>${gh.name}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Hàng card thống kê chính -->
        <div class="grid grid-4" style="margin-bottom:20px">
            <div class="card">
                <div class="stat-icon" style="background:#fef3c7;color:#f59e0b">🌡️</div>
                <div class="stat-label">Nhiệt độ TB</div>
                <div class="stat-value">${stats.avgTemp.toFixed(1)}°C</div>
                <span class="chip chip-default" style="margin-top:6px">${stats.avgTemp > 28 ? 'Cao' : stats.avgTemp < 18 ? 'Thấp' : 'Bình thường'}</span>
            </div>
            <div class="card">
                <div class="stat-icon" style="background:#dbeafe;color:#3b82f6">💧</div>
                <div class="stat-label">Độ ẩm TB</div>
                <div class="stat-value">${stats.avgHum.toFixed(1)}%</div>
                <span class="chip chip-default" style="margin-top:6px">${stats.avgHum > 80 ? 'Cao' : stats.avgHum < 60 ? 'Thấp' : 'Bình thường'}</span>
            </div>
            <div class="card">
                <div class="stat-icon" style="background:#dbeafe;color:#3b82f6">🔌</div>
                <div class="stat-label">Thiết bị</div>
                <div class="stat-value">${stats.totalDevices}</div>
                <span class="chip chip-default" style="margin-top:6px">Online: ${stats.activeDevices} / Offline: ${stats.offlineDevices}</span>
            </div>
            <div class="card">
                <div class="stat-icon" style="background:#fef3c7;color:#f59e0b">🚨</div>
                <div class="stat-label">Cảnh báo đang hoạt động</div>
                <div class="stat-value">${stats.criticalAlerts + stats.warningAlerts + stats.infoAlerts}</div>
                <span class="chip chip-default" style="margin-top:6px">Critical ${stats.criticalAlerts}</span>
            </div>
        </div>

        <!-- Hàng thống kê bổ sung -->
        <div class="grid grid-3" style="margin-bottom:20px">
            <div class="card">
                <div style="font-size:0.85rem; color:#6b7280;">Vùng trồng đang hoạt động</div>
                <div style="font-size:1.8rem; font-weight:600; color:#10b981;">${stats.zonesWithRecipe} / ${stats.totalZones}</div>
            </div>
            <div class="card">
                <div style="font-size:0.85rem; color:#6b7280;">Thiết bị cần thay thế</div>
                <div style="font-size:1.8rem; font-weight:600; color:#ef4444;">${stats.needReplace}</div>
            </div>
            <div class="card">
                <div style="font-size:0.85rem; color:#6b7280;">Cảnh báo (Warning / Info)</div>
                <div style="font-size:1.8rem; font-weight:600; color:#f59e0b;">${stats.warningAlerts + stats.infoAlerts}</div>
            </div>
        </div>

        <div class="grid grid-8-4" style="margin-bottom:20px">
            <div class="card">
                <div class="card-title">Biến động 24 giờ qua</div>
                <div class="chart-container" style="height:300px">
                    <canvas id="areaChart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-title">Cân bằng môi trường</div>
                <div class="chart-container" style="height:300px">
                    <canvas id="radarChart"></canvas>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Xu hướng ánh sáng & CO2</div>
            <div class="chart-container" style="height:250px">
                <canvas id="lineChart"></canvas>
            </div>
        </div>
    `;

    // Khởi tạo biểu đồ
    destroyCharts();
    initCharts(chartData, stats);

    // Sự kiện đổi greenhouse
    const select = document.getElementById('greenhouse-select');
    select.addEventListener('change', (e) => {
        const newId = e.target.value;
        currentGreenhouseId = newId;
        localStorage.setItem('selectedGreenhouse', newId);
        renderDashboardPage();
    });
}

// Export các hàm cần thiết nếu có
export { getGreenhouses };