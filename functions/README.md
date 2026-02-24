# Firebase 邮件通知部署说明

## 功能
- 监听集合：`meeting_minutes_records`
- 触发条件：新增会议纪要（create）
- 通知邮箱：默认 `wangqiming@ones.cn`

## 1) 安装依赖
```bash
cd /Users/wang/Documents/codex/meeting-minutes-web/functions
npm install
```

## 2) 配置 SMTP
```bash
cp .env.example .env
```

编辑 `/Users/wang/Documents/codex/meeting-minutes-web/functions/.env`，填写真实 SMTP：
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

可选：
- `NOTIFY_TO_EMAIL`（默认已是 `wangqiming@ones.cn`）

## 3) 部署函数
```bash
cd /Users/wang/Documents/codex/meeting-minutes-web
firebase deploy --only functions --project xiaoshouyejifenxi
```

## 4) 验证
在网页保存一条新的会议纪要（新增记录，不是编辑旧记录），应收到邮件通知。

