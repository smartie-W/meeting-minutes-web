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
- `GET /api/records/search`（按企业名/时间范围/AR/SR/关键词查询，支持简称模糊匹配）
- `POST /api/records/search`（与 GET 同语义，参数放 JSON body）
- `GET /api/open/records`（第三方系统：企业简称/全称 + 时间范围抽取纪要）
- `POST /api/open/summary`（第三方系统：企业简称/全称 + 时间范围 AI 汇总）
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

会议纪要检索示例（企业全称/简称 + 时间范围）：

```bash
curl -s "https://mm-api.hyjy.online/api/records/search?company=徐工&start=2026-02-01&end=2026-03-01&page=1&pageSize=20" \
  -H "Authorization: Bearer your_token"
```

或 POST（推荐给系统对接）：

```bash
curl -s -X POST "https://mm-api.hyjy.online/api/records/search" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "徐工集团工程机械股份有限公司",
    "startTime": "2026-02-01T00:00:00+08:00",
    "endTime": "2026-03-01T23:59:59+08:00",
    "page": 1,
    "pageSize": 50,
    "includeContent": true
  }'
```

返回结构：
- `items[].meetingContent`：会议纪要正文（`includeContent=true` 时返回）
- `items[].meetingTopic`、`items[].nextActions`、`items[].salesName`、`items[].ourParticipants` 等基础信息同步返回

第三方开放接口示例（建议给外部系统使用）：

```bash
curl -s "https://mm-api.hyjy.online/api/open/records?q=徐工&from=2026-02-01&to=2026-03-01&page=1&pageSize=20" \
  -H "X-API-Key: your_open_api_key"
```

```bash
curl -s -X POST "https://mm-api.hyjy.online/api/open/summary" \
  -H "X-API-Key: your_open_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "徐工集团工程机械股份有限公司",
    "from": "2026-02-01T00:00:00+08:00",
    "to": "2026-03-01T23:59:59+08:00"
  }'
```

`/api/open/summary` 返回重点：
- `summary.toolMentions.jira/cf/confluence`：提及次数与客户列表
- `summary.noFollowUp3Weeks`：首次出现后三周无后续会议的客户
- `summary.frequentRecentMeetings`：近三周频繁开会客户
- `summary.topKeywords`：高频关键词

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

第三方开放接口环境变量：

- `OPEN_API_KEY=...`（建议与 `API_KEY` 分离）
- `OPEN_API_RATE_LIMIT_PER_MIN=120`
- `OPEN_API_DEFAULT_PAGE_SIZE=50`
- `OPEN_API_MAX_PAGE_SIZE=200`

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
