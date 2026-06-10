/**
 * dashboard.js
 * Quản lý trang Dashboard - hiển thị tổng quan các chỉ số môi trường nhà kính,
 * bao gồm nhiệt độ, độ ẩm, ánh sáng, CO2 và các biểu đồ thống kê.
 */

import { state } from './state.js';

// --- Biến toàn cục lưu các đối tượng biểu đồ để có thể hủy khi cần ---
let areaChart, radarChart, lineChart;

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

/**
 * Hủy các biểu đồ cũ để giải phóng bộ nhớ trước khi tạo mới
 */
function destroyCharts() {
    if (areaChart) {
        areaChart.destroy();
        areaChart = null;
    }
    if (radarChart) {
        radarChart.destroy();
        radarChart = null;
    }
    if (lineChart) {
        lineChart.destroy();
        lineChart = null;
    }
}

/**
 * Khởi tạo tất cả các biểu đồ trên Dashboard
 * Bao gồm: biểu đồ diện tích (nhiệt độ + độ ẩm), biểu đồ radar (cân bằng môi trường),
 * biểu đồ đường (ánh sáng + CO2)
 */
function initCharts() {
    const labels = generateTimeLabels();

    // Dữ liệu mô phỏng (sau này có thể thay bằng dữ liệu thật từ API)
    const tempData = labels.map(() => 22 + Math.random() * 6);      // Nhiệt độ: 22-28°C
    const humData = labels.map(() => 65 + Math.random() * 20);     // Độ ẩm: 65-85%
    const lightData = labels.map(() => 300 + Math.random() * 500); // Ánh sáng: 300-800 lux
    const co2Data = labels.map(() => 400 + Math.random() * 200);   // CO2: 400-600 ppm

    // 1. Biểu đồ diện tích (Area Chart) cho Nhiệt độ & Độ ẩm
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

    // 2. Biểu đồ radar (Radar Chart) so sánh thực tế và tối ưu
    const radarCtx = document.getElementById('radarChart')?.getContext('2d');
    if (radarCtx) {
        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Nhiệt độ', 'Độ ẩm', 'Ánh sáng', 'CO2', 'pH đất'],
                datasets: [
                    {
                        label: 'Thực tế',
                        data: [85, 75, 90, 80, 88],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.4)',
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Tối ưu',
                        data: [90, 80, 85, 75, 90],
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
                        ticks: { display: false } // Ẩn số trên trục để gọn gàng
                    }
                }
            }
        });
    }

    // 3. Biểu đồ đường (Line Chart) cho Ánh sáng & CO2 (2 trục Y khác nhau)
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
                        grid: { drawOnChartArea: false } // Không vẽ lưới trùng lặp
                    }
                }
            }
        });
    }
}

/**
 * Render toàn bộ trang Dashboard
 * - Tạo cấu trúc HTML (các thẻ card, vùng chứa biểu đồ)
 * - Hủy biểu đồ cũ và khởi tạo biểu đồ mới
 * Được gọi từ app.js khi người dùng chuyển đến trang dashboard
 */
export function renderDashboardPage() {
    const container = document.getElementById('page-dashboard');
    if (!container) return;

    // Xây dựng giao diện Dashboard
    container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Dashboard Tổng quan</div>
                <div class="page-sub">Giám sát thời gian thực các chỉ số môi trường nhà kính</div>
            </div>
        </div>
        <div class="grid grid-4" style="margin-bottom:20px">
            <!-- Card Nhiệt độ -->
            <div class="card">
                <div class="stat-icon" style="background:#fef3c7;color:#f59e0b">🌡️</div>
                <div class="stat-label">Nhiệt độ TB</div>
                <div class="stat-value">24.5°C</div>
                <span class="chip chip-default" style="margin-top:6px">Bình thường</span>
            </div>
            <!-- Card Độ ẩm -->
            <div class="card">
                <div class="stat-icon" style="background:#dbeafe;color:#3b82f6">💧</div>
                <div class="stat-label">Độ ẩm TB</div>
                <div class="stat-value">72%</div>
                <span class="chip chip-default" style="margin-top:6px">Bình thường</span>
            </div>
            <!-- Card Cường độ sáng -->
            <div class="card">
                <div class="stat-icon" style="background:#fef3c7;color:#f59e0b">☀️</div>
                <div class="stat-label">Cường độ sáng</div>
                <div class="stat-value">550 lux</div>
                <span class="chip chip-warning" style="margin-top:6px">Cao</span>
            </div>
            <!-- Card CO2 -->
            <div class="card">
                <div class="stat-icon" style="background:#d1fae5;color:#10b981">🌬️</div>
                <div class="stat-label">CO2</div>
                <div class="stat-value">485 ppm</div>
                <span class="chip chip-success" style="margin-top:6px">Tối ưu</span>
            </div>
        </div>
        <div class="grid grid-8-4" style="margin-bottom:20px">
            <!-- Biểu đồ biến động 24h -->
            <div class="card">
                <div class="card-title">Biến động 24 giờ qua</div>
                <div class="chart-container" style="height:300px">
                    <canvas id="areaChart"></canvas>
                </div>
            </div>
            <!-- Biểu đồ cân bằng môi trường -->
            <div class="card">
                <div class="card-title">Cân bằng môi trường</div>
                <div class="chart-container" style="height:300px">
                    <canvas id="radarChart"></canvas>
                </div>
            </div>
        </div>
        <!-- Biểu đồ xu hướng ánh sáng & CO2 -->
        <div class="card">
            <div class="card-title">Xu hướng ánh sáng & CO2</div>
            <div class="chart-container" style="height:250px">
                <canvas id="lineChart"></canvas>
            </div>
        </div>
    `;

    // Dọn dẹp và vẽ lại biểu đồ
    destroyCharts();
    initCharts();
}