# 会议纪要 API（国内云可部署）

## 作用
- 提供稳定共享数据接口（新增/查询/删除）
- 前端改为优先走此 API，减少 Firebase 网络波动影响

## 启动

```bash
cd server
npm install
PORT=8091 DB_PATH=./meeting_minutes.db API_KEY=your_token ALLOWED_ORIGINS=https://smartie-w.github.io npm start
```

## 健康检查

```bash
curl -s http://127.0.0.1:8091/api/health
```

## 接口
- `GET /api/records`（可带 Bearer）
- `POST /api/records` body: `{ "record": {...} }`
- `DELETE /api/records/:id`

## 前端接入
在 `index.html` 的 `window.MEETING_API_CONFIG` 里填写：

```html
<script>
  window.MEETING_API_CONFIG = {
    enabled: true,
    baseUrl: "https://你的域名",
    apiKey: "your_token",
    pollIntervalMs: 4000,
    requestTimeoutMs: 8000
  };
</script>
```

> 建议把 API 部署在国内云主机并配 HTTPS 证书（Nginx 反代），可显著提升稳定性。
