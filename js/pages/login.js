/**
 * login.js
 * Render biểu mẫu đăng nhập và chuyển hướng sau khi xác thực thành công.
 */

import { login } from "../auth.js";
import { showToast } from "../app.js";

export function renderLoginPage() {
  const container = document.getElementById("page-login");
  container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; min-height:80vh;">
            <div class="card" style="width:400px;">
                <div class="card-title" style="text-align:center">🔐 Đăng nhập</div>
                <div class="form-group">
                    <label class="form-label" for="login-username">Tên đăng nhập / Email</label>
                    <input class="form-input" id="login-username" type="text" placeholder="Nhập tài khoản hoặc email">
                </div>
                <div class="form-group">
                    <label class="form-label" for="login-password">Mật khẩu</label>
                    <input class="form-input" id="login-password" type="password" placeholder="Nhập mật khẩu">
                </div>
                <div class="modal-actions" style="justify-content:space-between">
                    <button class="btn btn-outline" id="goto-register">Đăng ký</button>
                    <button class="btn btn-primary" id="login-btn">Đăng nhập</button>
                </div>
            </div>
        </div>
    `;
  document.getElementById("login-btn").onclick = async () => {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    if (!username || !password) return showToast("Nhập đầy đủ", "warning");
    try {
      await login(username, password);
      showToast("Đăng nhập thành công", "success");
      window.location.hash = "dashboard";
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      showToast(err.message, "error");
    }
  };
  document.getElementById("goto-register").onclick = () => {
    window.location.hash = "register";
    window.dispatchEvent(new Event("auth-changed"));
  };
}
