/**
 * zones.js
 * Quản lý trang Vùng trồng - hiển thị cây phân cấp, thêm, sửa, xóa, tìm kiếm vùng.
 * Tuân thủ ERD: Zone có greenhouse_id, recipe_id, start_date.
 * Sử dụng API backend thay vì state.js.
 */

import { showToast, openModal, closeModal } from "./app.js";
import { buildZoneTree, escapeHtml } from "./utils.js";
import {
  getZones,
  getRecipes,
  getStages,
  getThresholds,
  createZone,
  updateZone,
  updateZoneCycle,
  deleteZone
} from "./api.js";

// ===================== BIẾN TOÀN CỤC =====================
let zones = [];
let zoneExpanded = {};
let selectedZone = null;
let currentSearchKeyword = "";

// ===================== TIỆN ÍCH =====================
function zoneIcon(type) {
  const map = { farm: "🏕️", greenhouse: "🏠", zone: "⬤", rack: "📡" };
  return map[type] || "📦";
}

function zoneTypeName(type) {
  const map = {
    farm: "Khu trại",
    greenhouse: "Nhà kính",
    zone: "Khu vực",
    rack: "Giàn trồng"
  };
  return map[type] || type;
}

function statusChip(status) {
  if (!status) return "";
  const classMap = {
    optimal: "chip-success",
    warning: "chip-warning",
    high: "chip-warning",
    normal: "chip-default",
    inactive: "chip-default"
  };
  const labelMap = {
    optimal: "Tối ưu",
    warning: "Cảnh báo",
    high: "Cao",
    normal: "Bình thường",
    inactive: "Chưa hoạt động"
  };
  return `<span class="chip ${classMap[status] || "chip-default"}">${labelMap[status] || status}</span>`;
}

// ===================== TÌM KIẾM =====================
function filterNodesByName(nodes, keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  return nodes.reduce((result, node) => {
    const children = node.children ? filterNodesByName(node.children, keyword) : [];
    if (node.name.toLowerCase().includes(normalizedKeyword) || children.length > 0) {
      result.push({ ...node, children });
    }
    return result;
  }, []);
}

// ===================== XÂY DỰNG CÂY =====================
function buildTreeHtml(nodes, keyword = "", level = 0) {
  const filtered = keyword ? filterNodesByName(nodes, keyword) : nodes;
  return filtered
    .map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = keyword ? true : zoneExpanded[node._key];
      const indent = level * 20;
      const isSelected = selectedZone?._key === node._key;

      if (keyword && !node.name.toLowerCase().includes(keyword.toLowerCase()) && hasChildren) {
        const childMatch = filterNodesByName(node.children, keyword).length > 0;
        if (!childMatch) return "";
      }

      return `
            <div class="zone-tree-node" data-zone-key="${node._key}">
                <div class="tree-item${isSelected ? " selected" : ""}" style="padding-left: ${12 + indent}px">
                    ${
                      hasChildren
                        ? `<span class="tree-toggle" data-toggle-key="${node._key}">${isExpanded ? "▼" : "▶"}</span>`
                        : '<span style="width:20px;display:inline-block"></span>'
                    }
                    <span class="zone-icon">${zoneIcon(node.type)}</span>
                    <span class="zone-name">${escapeHtml(node.name)}</span>
                    ${statusChip(node.status)}
                </div>
                ${hasChildren && isExpanded ? `<div style="padding-left:20px">${buildTreeHtml(node.children, keyword, level + 1)}</div>` : ""}
            </div>
        `;
    })
    .join("");
}

// ===================== LẤY DANH SÁCH RECIPE =====================
let recipesCache = [];

async function getRecipeList(forceReload = false) {
  if (forceReload || recipesCache.length === 0) {
    try {
      recipesCache = await getRecipes();
      await Promise.all(
        recipesCache.map(async (recipe) => {
          recipe.stages = await getStages(recipe.id);
          await Promise.all(
            recipe.stages.map(async (stage) => {
              stage.thresholds = await getThresholds(stage.id);
            })
          );
        })
      );
    } catch (err) {
      console.error("Lỗi lấy danh sách recipe:", err);
      recipesCache = [];
    }
  }
  return recipesCache.map((r) => ({ id: r.id, name: r.name }));
}

// ===================== RENDER CÂY =====================
function renderZoneTree() {
  const treeContainer = document.getElementById("zone-tree");
  if (!treeContainer) return;
  const keyword = document.getElementById("zone-search")?.value || "";
  currentSearchKeyword = keyword;
  const html = buildTreeHtml(zones, keyword, 0);
  treeContainer.innerHTML = html || '<div class="no-result">Không tìm thấy vùng phù hợp</div>';
}

function getZoneCycle(zone) {
  const recipe = recipesCache.find((item) => String(item.id) === String(zone.recipe_id));
  const stages = [...(recipe?.stages || [])].sort((a, b) => a.start_day - b.start_day);
  if (!recipe || !zone.start_date || stages.length === 0) return null;

  const startDate = new Date(`${zone.start_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(startDate.getTime())) return null;

  const elapsedDay = Math.floor((today - startDate) / 86400000) + 1;
  const adjustmentDays = Math.max(0, Number(zone.cycle_adjustment_days) || 0);
  const currentDay = Math.max(0, elapsedDay - adjustmentDays);
  const totalDays = Math.max(...stages.map((stage) => Number(stage.end_day) || 0));
  const progress = totalDays > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0;
  const currentStage = stages.find(
    (stage) => currentDay >= stage.start_day && currentDay <= stage.end_day
  );
  const expectedEndDate = new Date(startDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + totalDays + adjustmentDays - 1);

  return {
    recipe,
    stages,
    currentStage,
    currentDay,
    totalDays,
    progress,
    adjustmentDays,
    expectedEndDate
  };
}

function renderCurrentThresholds(zone, stage) {
  if (!stage?.thresholds?.length) return '<div class="form-helper">Chưa cấu hình ngưỡng.</div>';
  const actualValues = { Temperature: zone.temperature, Humidity: zone.humidity };
  return stage.thresholds
    .map((threshold) => {
      const actual = actualValues[threshold.metric_type];
      const hasActual = actual !== null && actual !== undefined && Number.isFinite(Number(actual));
      const inRange =
        hasActual &&
        Number(actual) >= Number(threshold.min_value) &&
        Number(actual) <= Number(threshold.max_value);
      return `<div class="card" style="padding:10px">
        <strong>${escapeHtml(threshold.metric_type)}</strong>: ${threshold.min_value} - ${threshold.max_value}
        <span class="chip ${!hasActual ? "chip-default" : inRange ? "chip-success" : "chip-warning"}" style="margin-left:6px">
          ${!hasActual ? "Chưa có dữ liệu" : `${actual} - ${inRange ? "Đạt" : "Ngoài ngưỡng"}`}
        </span>
      </div>`;
    })
    .join("");
}

// ===================== RENDER CHI TIẾT =====================
function renderZoneDetail() {
  const container = document.getElementById("zone-detail");
  const zone = selectedZone;
  if (!zone) {
    container.innerHTML = `<div class="empty-detail">🗂️ Chọn một khu vực để xem chi tiết</div>`;
    return;
  }

  let html = `
        <div class="detail-header">
            <div class="detail-icon">${zoneIcon(zone.type)}</div>
            <div class="detail-title">
                <div>${escapeHtml(zone.name)}</div>
                <div class="detail-type">${zoneTypeName(zone.type)}</div>
            </div>
            <div class="detail-actions">
                <button class="btn-icon edit-zone" data-key="${zone._key}" title="Sửa">✏️</button>
                <button class="btn-icon delete-zone" data-key="${zone._key}" title="Xóa">🗑️</button>
            </div>
        </div>
    `;

  if (zone.type === "zone") {
    const currentRecipe = recipesCache.find((r) => String(r.id) === String(zone.recipe_id));
    const cycle = getZoneCycle(zone);
    html += `
            <div class="grid grid-2 zone-metrics">
                <div class="metric-card temp">🌡️ Nhiệt độ: <strong>${zone.temperature ?? "--"}°C</strong></div>
                <div class="metric-card hum">💧 Độ ẩm: <strong>${zone.humidity ?? "--"}%</strong></div>
            </div>
            <div style="margin-bottom:12px;">
                <div><strong>Công thức áp dụng:</strong> ${currentRecipe ? currentRecipe.name : "Chưa có"}</div>
                <div><strong>Ngày bắt đầu:</strong> ${zone.start_date || "Chưa có"}</div>
            </div>
        `;
    if (cycle) {
      const timeline = cycle.stages
        .map((stage) => {
          const stageState =
            cycle.currentDay > stage.end_day
              ? "stage-completed"
              : cycle.currentStage?.id === stage.id
                ? "stage-current"
                : "stage-pending";
          const marker =
            stageState === "stage-completed" ? "✓" : stageState === "stage-current" ? "●" : "○";
          return `<div class="${stageState} stage-card" style="margin-bottom:8px">
            <strong>${marker} ${escapeHtml(stage.name)}</strong>
            <div class="form-helper">Ngày ${stage.start_day} - ${stage.end_day}</div>
          </div>`;
        })
        .join("");
      html += `
        <div class="card" style="margin:16px 0;padding:16px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px">
            <div>
              <div class="subtitle" style="margin:0">Tiến độ chu kỳ</div>
              <div class="form-helper">
                ${cycle.currentStage ? `Giai đoạn: ${escapeHtml(cycle.currentStage.name)}` : cycle.currentDay > cycle.totalDays ? "Đã hoàn thành chu kỳ" : "Chưa tới giai đoạn cấu hình"}
              </div>
            </div>
            <button class="btn btn-outline btn-sm adjust-zone-cycle" data-key="${zone._key}">Điều chỉnh chu kỳ</button>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:6px">
            <span>Ngày ${Math.min(cycle.currentDay, cycle.totalDays)} / ${cycle.totalDays}</span>
            <strong>${cycle.progress}%</strong>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${cycle.progress}%"></div></div>
          <div class="form-helper" style="margin-top:8px">
            Dự kiến hoàn thành: ${cycle.expectedEndDate.toLocaleDateString("vi-VN")}
            · Điều chỉnh: +${cycle.adjustmentDays} ngày
            ${zone.adjustment_reason ? `· Lý do: ${escapeHtml(zone.adjustment_reason)}` : ""}
          </div>
        </div>
        <div class="grid grid-2" style="align-items:start">
          <div><div class="subtitle">Timeline giai đoạn</div>${timeline}</div>
          <div><div class="subtitle">Ngưỡng giai đoạn hiện tại</div>${renderCurrentThresholds(zone, cycle.currentStage)}</div>
        </div>
      `;
    } else if (currentRecipe) {
      html +=
        '<div class="card" style="margin-top:16px">Hãy nhập ngày bắt đầu để theo dõi tiến độ.</div>';
    }
  }

  if (zone.children?.length) {
    const childTitle = zone.type === "zone" ? "Giàn trồng" : "Khu vực con";
    html += `<div class="subtitle">${childTitle}</div><div class="grid grid-2 zone-children">`;
    zone.children.forEach((child) => {
      html += `
                <div class="card child-card">
                     <div><span class="child-icon">${zoneIcon(child.type)}</span> ${escapeHtml(child.name)}</div>
                    ${child.devices ? `<div class="child-devices">📟 ${child.devices} thiết bị</div>` : ""}
                    <div class="child-actions">
                        <button class="btn-icon edit-child" data-key="${child._key}" title="Sửa">✏️</button>
                        <button class="btn-icon delete-child" data-key="${child._key}" title="Xóa">🗑️</button>
                    </div>
                </div>
            `;
    });
    html += `</div>`;
  }
  if (zone.type === "rack" && zone.devices) {
    html += `<div class="rack-info">📟 Số lượng thiết bị: ${zone.devices}</div>`;
  }
  container.innerHTML = html;
  attachDetailEvents();
}

function attachDetailEvents() {
  document.querySelectorAll(".edit-zone, .edit-child").forEach((btn) => {
    btn.removeEventListener("click", handleEditClick);
    btn.addEventListener("click", handleEditClick);
  });
  document.querySelectorAll(".delete-zone, .delete-child").forEach((btn) => {
    btn.removeEventListener("click", handleDeleteClick);
    btn.addEventListener("click", handleDeleteClick);
  });
  document.querySelectorAll(".adjust-zone-cycle").forEach((btn) => {
    btn.addEventListener("click", () => openZoneCycleModal(btn.dataset.key));
  });
}

function openZoneCycleModal(key) {
  const zone = findNodeById(zones, key);
  if (!zone || zone.type !== "zone") return;
  const modalHtml = `
    <div class="modal-overlay" id="zone-cycle-modal">
      <div class="modal" style="width:480px;max-width:95vw">
        <div class="modal-title">Điều chỉnh chu kỳ - ${escapeHtml(zone.name)}</div>
        <div class="form-group">
          <label class="form-label">Tổng số ngày kéo dài</label>
          <input class="form-input" id="zone-adjustment-days" type="number" min="0" max="365"
            value="${Number(zone.cycle_adjustment_days) || 0}">
          <div class="form-helper">Nhập 0 để xóa điều chỉnh và trở về lịch gốc.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Lý do điều chỉnh</label>
          <textarea class="form-input" id="zone-adjustment-reason" rows="3">${escapeHtml(zone.adjustment_reason || "")}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="cancel-zone-cycle">Hủy</button>
          <button class="btn btn-primary" id="save-zone-cycle">Lưu điều chỉnh</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = document.getElementById("zone-cycle-modal");
  openModal("zone-cycle-modal");
  document.getElementById("cancel-zone-cycle").addEventListener("click", () => {
    closeModal("zone-cycle-modal");
    modal.remove();
  });
  document.getElementById("save-zone-cycle").addEventListener("click", async () => {
    const days = Number(document.getElementById("zone-adjustment-days").value);
    const reason = document.getElementById("zone-adjustment-reason").value.trim();
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      showToast("Số ngày điều chỉnh phải từ 0 đến 365", "warning");
      return;
    }
    if (days > 0 && !reason) {
      showToast("Vui lòng nhập lý do điều chỉnh", "warning");
      return;
    }
    try {
      await updateZoneCycle(zone.id, days, reason);
      await loadZones();
      selectedZone = findNodeById(zones, key);
      renderZones();
      closeModal("zone-cycle-modal");
      modal.remove();
      showToast("Đã cập nhật chu kỳ của Zone");
    } catch (err) {
      showToast("Lỗi điều chỉnh chu kỳ: " + err.message, "error");
    }
  });
}

function handleEditClick(e) {
  openZoneModal(e.currentTarget.getAttribute("data-key"));
}

function handleDeleteClick(e) {
  const key = e.currentTarget.getAttribute("data-key");
  if (confirm("Xóa vùng này sẽ xóa tất cả vùng con và thiết bị bên trong. Bạn có chắc?")) {
    deleteZoneById(key);
  }
}

// ===================== LOAD DỮ LIỆU =====================
async function loadZones() {
  try {
    const flatZones = await getZones();
    zones = buildZoneTree(flatZones);
    return zones;
  } catch (err) {
    showToast("Lỗi tải danh sách vùng: " + err.message, "error");
    throw err;
  }
}

// ===================== RENDER =====================
export async function renderZones() {
  await renderZoneTree();
  await renderZoneDetail();
}

export async function renderZonesPage() {
  const container = document.getElementById("page-zones");
  if (!container) return;

  try {
    await loadZones();
    await getRecipeList(true);
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:#ef4444;">Lỗi tải dữ liệu: ${err.message}</div>`;
    return;
  }

  container.innerHTML = `
        <div class="page-header">
            <div>
                <div class="page-title">Quản lý Vùng trồng</div>
                <div class="page-sub">Phân vùng quản lý và trực quan hóa cấu trúc nhà kính</div>
            </div>
            <button class="btn btn-primary" id="add-zone-btn">➕ Thêm khu vực</button>
        </div>
        <div class="zone-search-bar">
            <input type="text" id="zone-search" class="form-input" placeholder="🔍 Tìm kiếm vùng..." style="width: 100%; margin-bottom: 16px;">
        </div>
        <div class="grid grid-5-7">
            <div class="card">
                <div class="card-title">Cấu trúc phân cấp</div>
                <div id="zone-tree"></div>
            </div>
            <div class="card" id="zone-detail"></div>
        </div>
    `;

  await renderZones();

  // Sự kiện tìm kiếm
  const searchInput = document.getElementById("zone-search");
  searchInput.addEventListener("input", () => renderZoneTree());

  // Thêm vùng
  document.getElementById("add-zone-btn").addEventListener("click", () => openZoneModal());

  // Sự kiện trên cây
  document.getElementById("zone-tree")?.addEventListener("click", (e) => {
    const toggle = e.target.closest(".tree-toggle");
    if (toggle) {
      const key = toggle.getAttribute("data-toggle-key");
      if (key) toggleZoneExpand(key);
      return;
    }
    const nodeDiv = e.target.closest(".zone-tree-node");
    if (nodeDiv) {
      const key = nodeDiv.getAttribute("data-zone-key");
      if (key) selectZone(key);
    }
  });
}

// ===================== EXPAND / SELECT =====================
export function toggleZoneExpand(key) {
  zoneExpanded[key] = !zoneExpanded[key];
  renderZoneTree();
  renderZoneDetail();
}

export function selectZone(key) {
  // Tìm zone trong cây
  function findNode(nodes, targetKey) {
    for (const node of nodes) {
      if (node._key === targetKey) return node;
      if (node.children) {
        const found = findNode(node.children, targetKey);
        if (found) return found;
      }
    }
    return null;
  }
  const zone = findNode(zones, key);
  if (zone) selectedZone = zone;
  renderZoneDetail();
}

// ===================== CRUD =====================
async function deleteZoneById(key) {
  try {
    const target = findNodeById(zones, key);
    if (!target) return;
    await deleteZone(target.id, target.type);
    selectedZone = null;
    delete zoneExpanded[key];
    await loadZones();
    renderZones();
    showToast("Đã xóa vùng", "info");
  } catch (err) {
    showToast("Lỗi xóa vùng: " + err.message, "error");
  }
}

async function saveZone(zoneData) {
  try {
    const { id, name, type, parentId, greenhouse_id, recipe_id, start_date, status } = zoneData;
    let savedId = id;
    if (id) {
      // Sửa
      await updateZone(id, {
        name,
        type,
        parent_id: parentId,
        greenhouse_id,
        recipe_id,
        start_date,
        status
      });
      showToast("Đã cập nhật vùng");
    } else {
      // Thêm mới
      const created = await createZone({
        name,
        type,
        parent_id: parentId,
        greenhouse_id,
        recipe_id,
        start_date,
        status: type === "zone" ? status : undefined
      });
      savedId = created.id;
      showToast("Đã thêm vùng mới");
    }
    await loadZones();
    selectedZone = findNodeById(zones, `${type}:${savedId}`);
    if (selectedZone) zoneExpanded[selectedZone._key] = true;
    await renderZones();
    return true;
  } catch (err) {
    showToast("Lỗi lưu vùng: " + err.message, "error");
    return false;
  }
}

function findNodeById(nodes, key) {
  for (const node of nodes) {
    if (node._key === key) return node;
    if (node.children) {
      const found = findNodeById(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

// ===================== MODAL THÊM/SỬA =====================
function findParentId(nodes, childKey) {
  for (const node of nodes) {
    if (node.children && node.children.some((c) => c._key === childKey)) return node._key;
    if (node.children) {
      const found = findParentId(node.children, childKey);
      if (found) return found;
    }
  }
  return null;
}

async function openZoneModal(editKey = null) {
  const zone = editKey ? findNodeById(zones, editKey) : null;
  const title = zone ? "Sửa vùng" : "Thêm vùng mới";

  // Lấy danh sách recipe
  const recipeOptions = await getRecipeList();

  const nodesByType = { farm: [], greenhouse: [], zone: [] };
  function collectNodes(nodes) {
    for (const node of nodes) {
      if (nodesByType[node.type]) nodesByType[node.type].push(node);
      if (node.children) collectNodes(node.children);
    }
  }
  collectNodes(zones);

  const parentId = zone ? findParentId(zones, zone._key) : null;
  const getParentOptions = (type) => {
    const parentType = type === "greenhouse" ? "farm" : type === "zone" ? "greenhouse" : null;
    return parentType ? nodesByType[parentType] : [];
  };
  const renderParentOptions = (type, selectedKey = null) => {
    const options = getParentOptions(type);
    const emptyLabel = type === "farm" ? "-- Farm là cấp gốc --" : "-- Chọn vùng cha --";
    return [
      `<option value="">${emptyLabel}</option>`,
      ...options.map(
        (parent) =>
          `<option value="${parent._key}" ${parent._key === selectedKey ? "selected" : ""}>${escapeHtml(parent.name)}</option>`
      )
    ].join("");
  };

  const modalHtml = `
        <div class="modal-overlay" id="zone-crud-modal">
            <div class="modal" style="width: 550px; max-width: 95vw;">
                <div class="modal-title">${title}</div>
                <div class="form-group">
                    <label class="form-label">Tên vùng</label>
                    <input class="form-input" id="zone-name" value="${escapeHtml(zone?.name || "")}">
                </div>
                <div class="form-group">
                    <label class="form-label">Loại vùng</label>
                    <select class="form-select" id="zone-type" ${zone ? "disabled" : ""}>
                        <option value="farm" ${zone?.type === "farm" ? "selected" : ""}>Khu trại</option>
                        <option value="greenhouse" ${zone?.type === "greenhouse" ? "selected" : ""}>Nhà kính</option>
                        <option value="zone" ${zone?.type === "zone" ? "selected" : ""}>Khu vực</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Vùng cha</label>
                    <select class="form-select" id="zone-parent" ${zone?.type === "farm" ? "disabled" : ""}>
                        ${renderParentOptions(zone?.type || "farm", parentId)}
                    </select>
                </div>
                <div id="zone-extra-fields" style="display: ${zone?.type === "zone" ? "block" : "none"}">
                    <div class="form-group">
                        <label class="form-label">Công thức áp dụng</label>
                        <select class="form-select" id="zone-recipe">
                            <option value="">-- Không --</option>
                            ${recipeOptions.map((r) => `<option value="${r.id}" ${String(zone?.recipe_id) === String(r.id) ? "selected" : ""}>${escapeHtml(r.name)}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ngày bắt đầu</label>
                        <input class="form-input" type="date" id="zone-start-date" value="${zone?.start_date || ""}">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" id="cancel-crud">Hủy</button>
                    <button class="btn btn-primary" id="save-crud">Lưu</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = document.getElementById("zone-crud-modal");
  openModal("zone-crud-modal");

  const typeSelect = document.getElementById("zone-type");
  const parentSelect = document.getElementById("zone-parent");
  const extraDiv = document.getElementById("zone-extra-fields");
  typeSelect.addEventListener("change", () => {
    extraDiv.style.display = typeSelect.value === "zone" ? "block" : "none";
    parentSelect.disabled = typeSelect.value === "farm";
    parentSelect.innerHTML = renderParentOptions(typeSelect.value);
  });

  const saveBtn = document.getElementById("save-crud");
  const cancelBtn = document.getElementById("cancel-crud");
  const saveHandler = async () => {
    const name = document.getElementById("zone-name").value.trim();
    const type = typeSelect.value;
    const parentKey = document.getElementById("zone-parent").value || null;
    const parentNode = parentKey ? findNodeById(zones, parentKey) : null;
    const parentId = parentNode?.id || null;
    if (!name) {
      showToast("Vui lòng nhập tên vùng", "warning");
      return;
    }
    if (type !== "farm" && !parentNode) {
      showToast(`Vui lòng chọn ${type === "greenhouse" ? "Farm" : "Greenhouse"} cha`, "warning");
      return;
    }
    const expectedParentType =
      type === "greenhouse" ? "farm" : type === "zone" ? "greenhouse" : null;
    if (expectedParentType && parentNode.type !== expectedParentType) {
      showToast("Loại vùng cha không hợp lệ", "warning");
      return;
    }
    const zoneData = {
      id: zone?.id || null,
      name,
      type,
      parentId
    };
    if (type === "zone") {
      zoneData.greenhouse_id = parentNode.id;
      zoneData.recipe_id = document.getElementById("zone-recipe").value || null;
      zoneData.start_date = document.getElementById("zone-start-date").value || null;
      zoneData.status = zone?.status || "normal";
    }
    const saved = await saveZone(zoneData);
    if (saved) {
      closeModal("zone-crud-modal");
      modal.remove();
    }
  };
  saveBtn.addEventListener("click", saveHandler);
  cancelBtn.addEventListener("click", () => {
    closeModal("zone-crud-modal");
    modal.remove();
  });
}

// ===================== EXPOSE GLOBAL =====================
window.toggleZoneExpand = toggleZoneExpand;
window.selectZone = selectZone;
