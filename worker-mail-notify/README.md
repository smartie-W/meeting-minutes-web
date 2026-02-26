# Cloudflare Worker 邮件通知（Resend）

## 1. 准备

- Cloudflare 账号
- Resend 账号（已验证发件域名）

## 2. 设置 Worker 环境变量

在 `worker-mail-notify` 目录执行：

```bash
npm install
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put NOTIFY_TO_EMAIL
npx wrangler secret put BEARER_TOKEN
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler secret put WEB_BASE_URL
```

说明：
- `MAIL_FROM` 示例：`notify@xxx.com`（必须是 Resend 已验证域名）
- `NOTIFY_TO_EMAIL` 建议填：`wangqiming@ones.cn`
- `BEARER_TOKEN` 可选，但建议设置
- `ALLOWED_ORIGINS` 可填：`https://smartie-w.github.io`
- `WEB_BASE_URL` 填：`https://smartie-w.github.io/meeting-minutes-web/`

## 3. 部署

```bash
npx wrangler deploy
```

部署后会得到一个 URL，例如：

`https://meeting-minutes-mail-notify.<subdomain>.workers.dev`

## 4. 前端接入

在 `index.html` 里把 `window.MAIL_NOTIFY_CONFIG` 改成：

```html
<script>
  window.MAIL_NOTIFY_CONFIG = {
    enabled: true,
    endpoint: "https://meeting-minutes-mail-notify.<subdomain>.workers.dev",
    timeoutMs: 5000,
    bearerToken: "你设置的BEARER_TOKEN"
  };
</script>
```

## 5. 验证

在网页新增一条会议纪要并点击“保存纪要”，应收到邮件：

- 标题包含：AR、客户名称、会议时间
- 邮件正文包含：该条纪要详情链接（可点击打开）
