# 会议纪要 API（国内云可部署）

## 作用
- 提供稳定共享数据接口（新增/查询/删除）
- 前端改为优先走此 API，减少 Firebase 网络波动影响
- 内置每日自动备份 SQLite 数据库

## 启动

```bash
cd server
npm install
PORT=8091 DB_PATH=./meeting_minutes.db API_KEY=your_token ALLOWED_ORIGINS=https://smartie-w.github.io,https://hyjy.online,https://www.hyjy.online BACKUP_DIR=./backups BACKUP_RETENTION_DAYS=30 BACKUP_DAILY_HOUR=3 BACKUP_DAILY_MINUTE=15 BACKUP_ON_START=true INDUSTRY_REFRESH_DAILY_HOUR=4 INDUSTRY_REFRESH_DAILY_MINUTE=10 INDUSTRY_REFRESH_ON_START=true npm start
```

## 健康检查

```bash
curl -s http://127.0.0.1:8091/api/health
```

## 接口
- `GET /api/records`（可带 Bearer）
- `POST /api/records` body: `{ "record": {...} }`
- `DELETE /api/records/:id`
- `POST /api/admin/backup`（手动触发备份）
- `POST /api/admin/industry-refresh`（手动触发未知行业复查）
- `POST /api/notify`（发送会议纪要邮件通知）
- `GET /api/build-info`（前端 build 版本后备校验）

## 自动备份
- 默认每天 `03:15` 执行一次备份
- 备份目录：`BACKUP_DIR`
- 保留天数：`BACKUP_RETENTION_DAYS`，超过自动清理
- 可通过 `BACKUP_ON_START=true` 在服务启动时立即备份一次

手动备份示例：

```bash
curl -s -X POST "http://127.0.0.1:8091/api/admin/backup" -H "Authorization: Bearer your_token"
```

手动行业复查示例：

```bash
curl -s -X POST "http://127.0.0.1:8091/api/admin/industry-refresh" -H "Authorization: Bearer your_token"
```

邮件通知示例：

```bash
curl -s -X POST "http://127.0.0.1:8091/api/notify" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"recordId":"abc123","ar":"周思","customerName":"上海某客户","meetingTime":"2026-02-26T14:30","detailUrl":"https://hyjy.online/?view=history&recordId=abc123"}'
```

邮件相关环境变量（Resend）：

- `MAIL_NOTIFY_ENABLED=true`
- `MAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `MAIL_FROM=notify@你的已验证域名`
- `NOTIFY_TO_EMAIL=wangqiming@ones.cn`

Build 版本后备校验环境变量（可选）：

- `APP_BUILD_COMMIT=...`（服务端部署 commit，不填则尝试读取本地 git HEAD）
- `BUILD_REPO=smartie-W/meeting-minutes-web`
- `BUILD_BRANCH=main`
- `BUILD_INFO_CACHE_MS=300000`
- `GITHUB_TOKEN=...`（可选，降低 GitHub API 频控影响）

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

前端邮件配置已支持自动回退到 `${MEETING_API_CONFIG.baseUrl}/api/notify`，可保持：

```html
<script>
  window.MAIL_NOTIFY_CONFIG = {
    enabled: true,
    endpoint: "",
    timeoutMs: 5000,
    bearerToken: ""
  };
</script>
```

> 建议把 API 部署在国内云主机并配 HTTPS 证书（Nginx 反代），可显著提升稳定性。
