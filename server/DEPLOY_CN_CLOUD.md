# 国内云部署（推荐）

## 1) 在云主机启动 API

```bash
cd /opt/meeting-minutes-web/server
npm install --omit=dev
PORT=8091 DB_PATH=/opt/meeting-minutes-web/data/meeting_minutes.db API_KEY=replace_me ALLOWED_ORIGINS=https://smartie-w.github.io npm start
```

建议用 `pm2` 或 `systemd` 保活。

## 2) Nginx 反向代理（HTTPS 域名）

```nginx
server {
  listen 443 ssl;
  server_name mm-api.your-domain.com;

  location /api/ {
    proxy_pass http://127.0.0.1:8091/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 3) 前端接入

在 `index.html` 中设置：

```html
<script>
  window.MEETING_API_CONFIG = {
    enabled: true,
    baseUrl: "https://mm-api.your-domain.com",
    apiKey: "replace_me",
    pollIntervalMs: 4000,
    requestTimeoutMs: 8000
  };
</script>
```

## 4) 验证

- 打开页面，状态应变为 `云同步：已连接`
- 新增纪要后，另一台机器 4 秒内可见
- `GET https://mm-api.your-domain.com/api/health` 返回 `ok:true`
