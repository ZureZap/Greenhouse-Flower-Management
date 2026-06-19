/**
 * app.js
 * Ứng dụng chính - điều phối các trang, xử lý điều hướng, modal, xác thực,
 * và hiển thị icon chuông phê duyệt cho OWNER.
 */

import { renderDashboardPage } from "./dashboard.js";
import { renderDevicesPage } from "./devices.js";
import { renderZonesPage } from "./zones.js";
import { renderGrowthPage } from "./growth.js";
import { renderControlPage } from "./control.js";
import { renderAlertsPage } from "./alerts.js";
import { renderLogsPage } from "./logs.js";
import { renderLoginPage } from "./pages/login.js";
import { renderRegisterPage } from "./pages/register.js";
import { renderUserApprovalPage } from "./pages/userApproval.js";
import { isLoggedIn, logout, getCurrentUser } from "./auth.js";

// ===================== TIỆN ÍCH CHUNG =====================

export function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

// ===================== ĐIỀU HƯỚNG =====================

let isAuth = false;

function renderPage(pageName) {
  const pageMap = {
    dashboard: renderDashboardPage,
    devices: renderDevicesPage,
    zones: renderZonesPage,
    growth: renderGrowthPage,
    control: renderControlPage,
    alerts: renderAlertsPage,
    logs: renderLogsPage,
    login: renderLoginPage,
    register: renderRegisterPage,
    "user-approval": renderUserApprovalPage
  };
  const renderFn = pageMap[pageName];
  if (renderFn) renderFn();
  else renderDashboardPage();
}

function handleRoute() {
  let hash = window.location.hash.slice(1) || "dashboard";
  const publicPages = ["login", "register"];
  const isPublic = publicPages.includes(hash);

  if (!isAuth && !isPublic) {
    window.location.hash = "login";
    return;
  }
  if (isAuth && isPublic) {
    window.location.hash = "dashboard";
    return;
  }
  // Cập nhật active menu (chỉ khi đã đăng nhập và không phải public)
  if (isAuth && !isPublic) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.dataset.page === hash) item.classList.add("active");
      else item.classList.remove("active");
    });
  }
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  const activePage = document.getElementById(`page-${hash}`);
  if (activePage) activePage.classList.add("active");
  renderPage(hash);
}

// ===================== THÀNH PHẦN SIDEBAR =====================

function addLogoutButton() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav || document.getElementById("logout-item")) return;
  const logoutBtn = document.createElement("a");
  logoutBtn.id = "logout-item";
  logoutBtn.className = "nav-item";
  logoutBtn.href = "#";
  logoutBtn.innerHTML = '<span class="nav-icon">🚪</span> Đăng xuất';
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
    isAuth = false;
    window.location.hash = "login";
    window.dispatchEvent(new Event("auth-changed"));
    document.getElementById("sidebar").style.display = "none";
    // Xóa icon chuông khi logout
    const bell = document.getElementById("bell-container");
    if (bell) bell.remove();
  });
  nav.appendChild(logoutBtn);
}

function addOwnerMenu() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav || document.getElementById("owner-approval-item")) return;
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.role === "OWNER") {
    const approvalItem = document.createElement("a");
    approvalItem.id = "owner-approval-item";
    approvalItem.className = "nav-item";
    approvalItem.href = "#";
    approvalItem.innerHTML = '<span class="nav-icon">📋</span> Danh sách tài khoản';
    approvalItem.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = "user-approval";
    });
    // Chèn trước nút logout
    const logoutBtn = document.getElementById("logout-item");
    if (logoutBtn) nav.insertBefore(approvalItem, logoutBtn);
    else nav.appendChild(approvalItem);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (isAuth) {
    sidebar.style.display = "flex";
    addLogoutButton();
    addOwnerMenu();
  } else {
    sidebar.style.display = "none";
  }
}

// ===================== KHỞI TẠO =====================

isAuth = isLoggedIn();
toggleSidebar();

window.addEventListener("hashchange", () => handleRoute());

window.addEventListener("auth-changed", () => {
  isAuth = isLoggedIn();
  toggleSidebar();
  handleRoute();
});

// Sự kiện click menu
document.querySelectorAll(".nav-item").forEach((menuItem) => {
  menuItem.addEventListener("click", (e) => {
    if (!isAuth) return;
    e.preventDefault();
    const pageName = menuItem.dataset.page;
    if (pageName) window.location.hash = pageName;
  });
});

// Đóng modal khi click overlay
document.body.addEventListener("click", (e) => {
  if (e.target.classList?.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

window.closeModal = closeModal;
window.openModal = openModal;

// Khởi chạy route đầu tiên
handleRoute();
