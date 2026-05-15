// 拷贝此文件为 config.js 并修改实际值
// Copy this file to config.js and fill in real values

// 同步服务器地址
// 本地开发: http://localhost:5000
// 云服务器同域部署 (nginx 反代): '/score' (不带末尾斜杠)
// 云服务器独立部署: https://your-api-domain.com
export const SYNC_SERVER_URL = 'http://ip/score'

// 与后端 .env 中 SYNC_TOKEN 一致
// Keep in sync with SYNC_TOKEN in backend .env
export const SYNC_TOKEN = 'your-token'
