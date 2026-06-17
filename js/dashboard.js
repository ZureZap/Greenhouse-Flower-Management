/**
 * dashboard.js
 * Quản lý trang Dashboard - hiển thị tổng quan các chỉ số môi trường nhà kính,
 * hỗ trợ chuyển đổi giữa các nhà kính.
 * Sử dụng API backend thay vì state.js.
 */

import { getGreenhouses, getGreenhouseIdByZoneId, getZoneName, getZoneById } from './utils.js';
import { getDevices, getAlerts, getGreenhouseStats, getGlobalStats, getZones } from './api.js';

// --- Biến toàn cục ---
let areaChart, radarChart, lineChart;
let currentGreenhouseId = null;
let greenhouses = [];
let devices = [];
let alerts = [];
let zones = [];

/**
 * Tạo nhãn thời gian cho 24 giờ (dựa trên giờ hiện tại, quay ngược 23 giờ)
 */
function generateTimeLabels() {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
        const hour = (now.getHours() - 23 + i + 24) % 24;
        return `${hour}:00`;
    });
}

// ===================== LẤY DỮ LIỆU =====================
async function loadDashboardData() {
    try {
        [devices, alerts, zones] = await Promise.all([
            getDevices(),
            getAlerts(),
            getZones()
        ]);
        greenhouses = getGreenhouses(zones);
        // Đảm bảo currentGreenhouseId vẫn hợp lệ sau khi load
        if (greenhouses.length > 0) {
            const saved = localStorage.getItem('selectedGreenhouse');
            if (saved && greenhouses.some(g => String(g.id) === String(saved))) {
                currentGreenhouseId = String(saved);
            } else if (!currentGreenhouseId || !greenhouses.some(g => String(g.id) === String(currentGreenhouseId))) {
                currentGreenhouseId = String(greenhouses[0].id);
            }
        }
    } catch (err) {
        console.error('Lỗi load dashboard data:', err);
        throw err;
    }
}

// ===================== LẤY ZONE THEO GREENHOUSE =====================
function getZonesByGreenhouse(greenhouseId) {
    const result = [];
    function traverse(nodes) {
        for (const node of nodes) {
            if (node.type === 'zone') {
                const ghId = getGreenhouseIdByZoneId(node.id, zones); // truyền zones vào
                if (ghId === greenhouseId) {
                    result.push(node);
                }
            }
            if (node.children) traverse(node.children);
        }
    }
    traverse(zones);
    return result;
}

// ===================== TÍNH TOÁN DỮ LIỆU THỐNG KÊ =====================
function getStatsForGreenhouse(greenhouseId) {
    const ghId = String(greenhouseId);
    const zoneList = getZonesByGreenhouse(ghId);
    const zoneIds = zoneList.map(z => z.id);

    // Thiết bị
    const devsInGh = devices.filter(d => zoneIds.includes(d.zone_id));
    const totalDevices = devsInGh.length;
    const activeDevices = devsInGh.filter(d => d.status === 'ACTIVE').length;
    const offlineDevices = devsInGh.filter(d => d.status === 'OFFLINE').length;
    const needReplace = devsInGh.filter(d => d.status === 'NEEDS_REPLACEMENT').length;

    // Cảnh báo
    const alertsInGh = alerts.filter(a => zoneIds.includes(a.zone_id));
    const criticalAlerts = alertsInGh.filter(a => a.severity === 'critical' && a.status === 'active').length;
    const warningAlerts = alertsInGh.filter(a => a.severity === 'warning' && a.status === 'active').length;
    const infoAlerts = alertsInGh.filter(a => a.severity === 'info' && a.status === 'active').length;

    // Zone đang trồng
    const zonesWithRecipe = zoneList.filter(z => z.recipe_id);

    // Nhiệt độ / độ ẩm trung bình
    let avgTemp = 0, avgHum = 0;
    const zonesWithTemp = zoneList.filter(z => z.temperature !== undefined && z.humidity !== undefined);
    if (zonesWithTemp.length > 0) {
        avgTemp = zonesWithTemp.reduce((sum, z) => sum + z.temperature, 0) / zonesWithTemp.length;
        avgHum = zonesWithTemp.reduce((sum, z) => sum + z.humidity, 0) / zonesWithTemp.length;
    } else {
        const seed = ghId.length + ghId.charCodeAt(0);
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
        totalZones: zoneList.length
    };
}

// ===================== DỮ LIỆU BIỂU ĐỒ =====================
function getChartData(greenhouseId) {
    const ghId = String(greenhouseId);
    const seed = ghId.length + ghId.charCodeAt(0);
    const rand = (min, max) => {
        // Dùng seed để tạo số ngẫu nhiên nhất quán
        let s = seed;
        return function() {
            s = (s * 9301 + 49297) % 233280;
            const rnd = s / 233280;
            return rnd * (max - min) + min;
        };
    };
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 2. Radar chart
    const radarCtx = document.getElementById('radarChart')?.getContext('2d');
    if (radarCtx) {
        const avgTemp = stats.avgTemp;
        const avgHum = stats.avgHum;
        const norm = (val, min, max) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
        const tempScore = norm(avgTemp, 15, 35);
        const humScore = norm(avgHum, 40, 90);
        const lightScore = 65 + Math.random() * 20;
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
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
                    y: { position: 'left', title: { display: true, text: 'Ánh sáng (lux)' } },
                    y1: { position: 'right', title: { display: true, text: 'CO2 (ppm)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }
}

// ===================== RENDER =====================
export async function renderDashboardPage() {
    const container = document.getElementById('page-dashboard');
    if (!container) return;

    try {
        await loadDashboardData();
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:#ef4444;">Lỗi tải dữ liệu: ${err.message}</div>`;
        return;
    }

    if (greenhouses.length === 0) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Không có dữ liệu nhà kính</div>';
        return;
    }

    // Đảm bảo currentGreenhouseId hợp lệ
    if (!currentGreenhouseId || !greenhouses.some(g => String(g.id) === String(currentGreenhouseId))) {
        currentGreenhouseId = String(greenhouses[0].id);
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
                <select id="greenhouse-select" class="form-select" style="width:auto; display:inline-block;" aria-label="Chọn nhà kính">
                    ${greenhouses.map(gh => `<option value="${gh.id}" ${String(gh.id) === String(currentGreenhouseId) ? 'selected' : ''}>${gh.name}</option>`).join('')}
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

        <!-- Biểu đồ -->
        <div class="grid grid-8-4" style="margin-bottom:20px">
            <div class="card">
                <div class="card-title">Biến động 24 giờ qua</div>
                <div class="chart-container" style="height:300px"><canvas id="areaChart"></canvas></div>
            </div>
            <div class="card">
                <div class="card-title">Cân bằng môi trường</div>
                <div class="chart-container" style="height:300px"><canvas id="radarChart"></canvas></div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Xu hướng ánh sáng & CO2</div>
            <div class="chart-container" style="height:250px"><canvas id="lineChart"></canvas></div>
        </div>
    `;

    destroyCharts();
    initCharts(chartData, stats);

    // Sự kiện đổi greenhouse
    const select = document.getElementById('greenhouse-select');
    // Xóa event cũ để tránh duplicate
    select.replaceWith(select.cloneNode(true));
    const newSelect = document.getElementById('greenhouse-select');
    newSelect.addEventListener('change', (e) => {
        const newId = e.target.value;
        currentGreenhouseId = String(newId);
        localStorage.setItem('selectedGreenhouse', newId);
        renderDashboardPage();
    });
}

// Export các hàm cần thiết
export { getGreenhouses };