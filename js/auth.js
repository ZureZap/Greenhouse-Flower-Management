import { state } from './state.js';
import { showToast } from './app.js';

// Đăng nhập
export function login(username, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = state.users.find(u => (u.username === username || u.email === username) && u.password === password);
            if (!user) {
                reject(new Error('Sai tên đăng nhập hoặc mật khẩu'));
                return;
            }
            if (user.status !== 'ACTIVE') {
                reject(new Error('Tài khoản chưa được phê duyệt. Vui lòng liên hệ chủ trang trại.'));
                return;
            }
            const sessionUser = { ...user, token: 'fake-token-' + Date.now() };
            state.currentUser = sessionUser;
            localStorage.setItem('token', sessionUser.token);
            localStorage.setItem('user', JSON.stringify(sessionUser));
            resolve(sessionUser);
        }, 300);
    });
}

// Đăng ký
export function register(userData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const exists = state.users.some(u => u.username === userData.username || u.email === userData.email);
            if (exists) {
                reject(new Error('Tên đăng nhập hoặc email đã tồn tại'));
                return;
            }
            const newUser = {
                id: 'u' + (state.users.length + 1),
                username: userData.username,
                password: userData.password,
                email: userData.email,
                phone: userData.phone,
                role: userData.role || 'OPERATOR',
                status: 'PENDING'
            };
            state.users.push(newUser);
            resolve(newUser);
        }, 300);
    });
}

// Đăng xuất
export function logout() {
    state.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Kiểm tra đã đăng nhập chưa
export function isLoggedIn() {
    if (state.currentUser) return true;
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        try {
            state.currentUser = JSON.parse(userStr);
            return true;
        } catch(e) { return false; }
    }
    return false;
}

// Lấy user hiện tại
export function getCurrentUser() {
    return state.currentUser;
}

// Phê duyệt user (chỉ OWNER)
export function approveUser(userId) {
    const user = state.users.find(u => u.id === userId);
    if (user && user.status === 'PENDING') {
        user.status = 'ACTIVE';
        return true;
    }
    return false;
}

// Từ chối user (xóa)
export function rejectUser(userId) {
    const index = state.users.findIndex(u => u.id === userId);
    if (index !== -1 && state.users[index].status === 'PENDING') {
        state.users.splice(index, 1);
        return true;
    }
    return false;
}