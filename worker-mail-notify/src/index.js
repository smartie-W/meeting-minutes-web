function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function text(value) {
  return String(value || '').trim();
}

function allowOrigin(reqOrigin, env) {
  const allow = text(env.ALLOWED_ORIGINS);
  if (!allow) return '*';
  if (!reqOrigin) return allow.split(',')[0]?.trim() || '*';
  const set = new Set(allow.split(',').map((x) => x.trim()).filter(Boolean));
  return set.has(reqOrigin) ? reqOrigin : 'null';
}

function corsHeaders(reqOrigin, env) {
  return {
    'Access-Control-Allow-Origin': allowOrigin(reqOrigin, env),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function buildSubject(payload) {
  const ar = text(payload.ar) || '-';
  const customerName = text(payload.customerName) || '-';
  const meetingTime = text(payload.meetingTime) || '-';
  return `[销售会议纪要] AR:${ar} | 客户:${customerName} | 会议时间:${meetingTime}`;
}

function buildHtml(payload, link) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Noto Sans SC',sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;">新的会议纪要已保存</h2>
      <p style="margin:6px 0;"><strong>AR：</strong>${escapeHtml(text(payload.ar) || '-')}</p>
      <p style="margin:6px 0;"><strong>客户：</strong>${escapeHtml(text(payload.customerName) || '-')}</p>
      <p style="margin:6px 0;"><strong>会议时间：</strong>${escapeHtml(text(payload.meetingTime) || '-')}</p>
      <p style="margin:14px 0 8px;">纪要详情链接：</p>
      <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:9px 14px;background:#0b6a88;color:#fff;text-decoration:none;border-radius:8px;">打开纪要详情</a>
      <div style="margin-top:10px;color:#4b5563;word-break:break-all;">${escapeHtml(link)}</div>
    </div>
  `;
}

function buildText(payload, link) {
  return [
    '新的会议纪要已保存',
    `AR: ${text(payload.ar) || '-'}`,
    `客户: ${text(payload.customerName) || '-'}`,
    `会议时间: ${text(payload.meetingTime) || '-'}`,
    `纪要详情链接: ${link}`,
  ].join('\n');
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendByResend(env, payload, link) {
  const apiKey = text(env.RESEND_API_KEY);
  const from = text(env.MAIL_FROM);
  const to = text(env.NOTIFY_TO_EMAIL) || 'wangqiming@ones.cn';

  if (!apiKey) throw new Error('missing RESEND_API_KEY');
  if (!from) throw new Error('missing MAIL_FROM');

  const body = {
    from,
    to: [to],
    subject: buildSubject(payload),
    html: buildHtml(payload, link),
    text: buildText(payload, link),
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.message || result?.error || `resend http ${response.status}`;
    throw new Error(message);
  }

  return { id: result?.id || '' };
}

function verifyBearerToken(request, env) {
  const required = text(env.BEARER_TOKEN);
  if (!required) return true;
  const auth = text(request.headers.get('authorization'));
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  return token === required;
}

function normalizeDetailUrl(payload, env) {
  const urlFromPayload = text(payload.detailUrl);
  if (urlFromPayload) return urlFromPayload;

  const base = text(env.WEB_BASE_URL) || 'https://smartie-w.github.io/meeting-minutes-web/';
  const id = text(payload.recordId);
  if (!id) return base;
  const u = new URL(base);
  u.searchParams.set('view', 'history');
  u.searchParams.set('recordId', id);
  return u.toString();
}

export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get('origin');
    const cors = corsHeaders(reqOrigin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: cors });
    }

    if (!verifyBearerToken(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, { status: 401, headers: cors });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400, headers: cors });
    }

    const detailUrl = normalizeDetailUrl(payload, env);

    try {
      const sent = await sendByResend(env, payload, detailUrl);
      return json({ ok: true, messageId: sent.id }, { status: 200, headers: cors });
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, { status: 500, headers: cors });
    }
  },
};
