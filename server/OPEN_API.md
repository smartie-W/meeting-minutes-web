# 会议纪要开放 API（第三方对接）

最后更新：2026-03-04  
维护方式：此文档跟随 `main` 分支持续更新。

OpenAPI（Swagger）机器可读描述（持续更新）：
- `server/openapi.json`

## 1. 基础信息

- Base URL: `https://mm-api.hyjy.online`
- 鉴权：Header 二选一  
  - `X-API-Key: <OPEN_API_KEY>`
  - `Authorization: Bearer <OPEN_API_KEY>`
- 响应版本：`schemaVersion: "open-api-v1"`

## 2. 通用参数

- `q`: 企业简称或全称（建议必填）
- `from` / `to`: 时间范围（支持 `YYYY-MM-DD` 或 ISO 时间）
- `page`: 页码，从 1 开始
- `pageSize`: 每页条数（默认 50）

### 工具强过滤参数

- `focus`: 逗号分隔，支持 `jira`、`cf`、`confluence`
- `focusMode`:
  - `any`：命中任一工具即可
  - `all`：必须同时命中全部工具

---

## 3. 接口清单

## 3.1 企业列表（标准名/别名）

- `GET /api/open/companies`

用途：第三方先搜索企业并拿到标准名，再用标准名拉取纪要/摘要。

示例：

```bash
curl -s --get "https://mm-api.hyjy.online/api/open/companies" \
  --data-urlencode "q=徐工" \
  --data-urlencode "from=2026-02-01" \
  --data-urlencode "to=2026-03-31" \
  --data-urlencode "page=1" \
  --data-urlencode "pageSize=20" \
  -H "X-API-Key: <OPEN_API_KEY>"
```

返回重点字段：

- `items[].standardName`: 标准企业名
- `items[].aliases`: 全称/别名集合
- `items[].shortAliases`: 简称候选
- `items[].meetingCount`: 范围内纪要数
- `items[].ars` / `items[].srs`: 涉及 AR / SR 名单
- `items[].firstMeetingTime` / `items[].lastMeetingTime`

## 3.2 纪要明细查询

- `GET /api/open/records`

示例（强过滤：必须同时提到 jira 和 cf）：

```bash
curl -s --get "https://mm-api.hyjy.online/api/open/records" \
  --data-urlencode "q=徐工" \
  --data-urlencode "from=2026-02-01" \
  --data-urlencode "to=2026-03-31" \
  --data-urlencode "focus=jira,cf" \
  --data-urlencode "focusMode=all" \
  -H "X-API-Key: <OPEN_API_KEY>"
```

返回重点字段：

- `items[].meetingContent`: 会议纪要正文
- `items[].meetingTopic` / `items[].nextActions`
- `items[].salesName` / `items[].ourParticipants` / `items[].customerParticipants`
- `items[].industryLevel1` / `items[].industryLevel2`
- `items[].attachments[]`: 附件元信息（不含文件内容）

## 3.3 AI 汇总

- `POST /api/open/summary`

示例：

```bash
curl -s -X POST "https://mm-api.hyjy.online/api/open/summary" \
  -H "X-API-Key: <OPEN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "q":"徐工",
    "from":"2026-02-01",
    "to":"2026-03-31",
    "focus":"jira,confluence",
    "focusMode":"any"
  }'
```

返回重点字段：

- `summary.toolMentions.jira/cf/confluence`: 工具提及统计 + 客户列表
- `summary.noFollowUp3Weeks`: 首次出现后 3 周无后续纪要客户
- `summary.frequentRecentMeetings`: 近 3 周频繁开会客户
- `summary.topKeywords`: 高频关键词
- `summary.arRanking`: AR 覆盖排序

## 3.4 调用审计导出（管理端）

- `GET /api/admin/open-audit/export`
- 鉴权：`Authorization: Bearer <API_KEY>`（管理 key，不是 OPEN_API_KEY）

示例（CSV）：

```bash
curl -L --get "https://mm-api.hyjy.online/api/admin/open-audit/export" \
  --data-urlencode "format=csv" \
  --data-urlencode "from=2026-03-01T00:00:00.000Z" \
  --data-urlencode "to=2026-03-31T23:59:59.999Z" \
  -H "Authorization: Bearer <API_KEY>" \
  -o open_api_audit.csv
```

---

## 4. 错误码

- `unauthorized`: 鉴权失败
- `q_required`: 缺少企业查询参数
- `rate_limited`: 超过限流（默认每 key+IP 每分钟 120 次）
- `open_api_not_configured`: 服务端未配置开放接口 key
- `server_error`: 服务端异常

## 5. 对接建议

- 固定按 `schemaVersion` 做响应兼容判断
- `q` 建议先走 `/api/open/companies`，再用 `standardName` 查询
- 对 `429 rate_limited` 按 `Retry-After` 重试
- 不在前端暴露 `OPEN_API_KEY`，仅在第三方后端保存
