const sql = require('mssql');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug: in ra để kiểm tra
console.log('📌 DB_HOST:', process.env.DB_HOST);
console.log('📌 DB_DATABASE:', process.env.DB_DATABASE);
console.log('📌 __dirname:', __dirname);

const config = {
    server: process.env.DB_HOST || 'localhost', 
    database: process.env.DB_DATABASE || 'SmartFarmDB',
    user: process.env.DB_USER || 'sa',          // Bổ sung tài khoản
    password: process.env.DB_PASSWORD || '123456', // Bổ sung mật khẩu
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false, // Tắt encrypt khi chạy local để tránh lỗi chứng chỉ
        trustServerCertificate: true,
        enableArithAbort: true
    }
    // XÓA BỎ DÒNG integratedSecurity: true
};

let pool = null;

async function getConnection() {
    if (pool) return pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Kết nối SQL Server thành công!');
        return pool;
    } catch (err) {
        console.error('❌ Lỗi kết nối database:', err.message);
        throw err;
    }
}

module.exports = { getConnection, sql };