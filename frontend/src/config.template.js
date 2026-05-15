// 拷贝此文件为 config.js 并修改实际值
// Copy this file to config.js and fill in real values

// 同步服务器地址，格式: <协议>://<IP或域名>/score/
// 本地开发: http://localhost:5000
// 服务器 HTTP:  http://<your-ip>/score/
// 服务器 HTTPS (需 nginx 已配置 SSL): https://<your-ip>/score/
export const SYNC_SERVER_URL = 'http://ip/score'

// 与后端 .env 中 SYNC_TOKEN 一致
// Keep in sync with SYNC_TOKEN in backend .env
export const SYNC_TOKEN = 'your-token'
