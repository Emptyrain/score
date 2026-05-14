# 口琴曲谱管理

一个简单的管理口琴曲谱的项目,可以纯前端使用.

## 功能

- **曲谱管理** — 添加、编辑、删除、搜索曲谱
- **两种类型** — 图片谱（支持缩放/全屏查看）和数字谱（纯文本）
- **分类浏览** — 按作者或作品来源分组展示，分组可折叠
- **多端同步** — 手动推送/拉取，last-write-wins 冲突策略

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Element Plus + Vite + Vue Router |
| 本地存储 | IndexedDB（Dexie.js） |
| 同步服务 | Python Flask + SQLite |

## 项目结构

```
backend/
  sync_server.py       # Flask 同步 API
  requirements.txt     # Python 依赖
frontend/
  src/
    config.js          # 同步服务器配置
    db/index.js        # Dexie 数据库初始化
    api/score.js       # 本地 CRUD
    api/sync.js        # push / pull 同步逻辑
    router/index.js    # Vue Router 路由
    views/
      ScoreList.vue    # 列表页（搜索、分类分组、同步）
      ScoreDetail.vue  # 明细页（基本/分类信息卡片、内容查看）
      ScoreEdit.vue    # 新建/编辑页
  index.html
  package.json
  vite.config.js
```

## 快速开始

### 纯本地使用（无需服务器）

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:5173` 即可使用，数据存储在浏览器 IndexedDB 中。

### 同步服务器（多端数据同步时选配）

```bash
# 设置环境变量
# Windows: set SYNC_TOKEN=your-token
# macOS/Linux: export SYNC_TOKEN=your-token

python sync_server.py
```

在前端 `src/config.js` 中配置服务器地址和 Token，之后在页面上点击"推送数据"/"拉取数据"即可同步。

## 同步 API

所有接口需要 `Authorization: Bearer <token>` 请求头。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/sync/push` | 推送本地变更记录 |
| POST | `/api/sync/push/delete` | 推送本地删除记录 |
| GET | `/api/sync/pull` | 拉取服务端全部记录 |

## 数据字段

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 曲名 |
| aliases | string[] | 别名 |
| author | string | 作者 |
| source | string | 作品来源 |
| type | `image` \| `number` | 类型 |
| content | Blob \| string | 图片或文本内容 |
| synced | boolean | 是否已同步 |
| updated_at | ISO string | 最后更新时间 |
