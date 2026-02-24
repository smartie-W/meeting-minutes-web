const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");

admin.initializeApp();

const FIREBASE_COLLECTION = process.env.FIREBASE_COLLECTION || "meeting_minutes_records";
const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL || "wangqiming@ones.cn";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@example.com";
const WEB_BASE_URL = process.env.WEB_BASE_URL || "https://smartie-w.github.io/meeting-minutes-web/";

let mailer = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function asText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function listToText(list) {
  if (!Array.isArray(list) || !list.length) return "-";
  return list.map((x) => String(x || "").trim()).filter(Boolean).join("、") || "-";
}

function participantsToText(list) {
  if (!Array.isArray(list) || !list.length) return "-";
  const rows = list
    .map((item) => {
      const role = String(item?.role || "").trim();
      const name = String(item?.name || "").trim();
      if (!role && !name) return "";
      return `${role || "-"}:${name || "-"}`;
    })
    .filter(Boolean);
  return rows.length ? rows.join("；") : "-";
}

function getMailer() {
  if (mailer) return mailer;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP env not configured");
  }
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return mailer;
}

function buildRecordUrl(recordId) {
  const base = WEB_BASE_URL.endsWith("/") ? WEB_BASE_URL : `${WEB_BASE_URL}/`;
  return `${base}?view=history&recordId=${encodeURIComponent(recordId)}`;
}

function buildMail(record, recordId) {
  const customer = listToText(record.customerNames);
  const ar = asText(record.salesName);
  const time = asText(record.meetingTime);
  const recordUrl = buildRecordUrl(recordId);
  const subject = `[销售会议纪要] AR:${ar} | 客户:${customer} | 会议时间:${time}`;
  const html = `
    <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.6;color:#1f2937;">
      <h2 style="margin:0 0 12px;">新会议纪要已提交</h2>
      <div style="margin:8px 0 12px;">AR: ${escapeHtml(ar)} | 客户: ${escapeHtml(customer)} | 会议时间: ${escapeHtml(time)}</div>
      <a href="${escapeHtml(recordUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 12px;background:#0b6a88;color:#fff;text-decoration:none;border-radius:8px;">打开纪要详情</a>
      <div style="margin-top:10px;color:#4b5563;font-size:13px;word-break:break-all;">${escapeHtml(recordUrl)}</div>
    </div>
  `;

  const text = [
    "新会议纪要已提交",
    `客户名称: ${customer}`,
    `AR: ${ar}`,
    `会议时间: ${time}`,
    "",
    `纪要详情链接: ${recordUrl}`,
  ].join("\n");

  return { subject, html, text };
}

exports.notifyMeetingMinutesCreated = onDocumentCreated(
  {
    document: `${FIREBASE_COLLECTION}/{recordId}`,
    region: "asia-east2",
    retry: false,
  },
  async (event) => {
    const record = event.data?.data();
    if (!record) {
      logger.warn("skip: empty record snapshot");
      return;
    }

    try {
      const transport = getMailer();
      const recordId = event.params?.recordId || record.id || "";
      const mail = buildMail(record, recordId);
      await transport.sendMail({
        from: SMTP_FROM,
        to: NOTIFY_TO_EMAIL,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      logger.info("meeting minutes email sent", {
        to: NOTIFY_TO_EMAIL,
        recordId: event.params?.recordId || "",
      });
    } catch (error) {
      logger.error("meeting minutes email send failed", {
        message: error?.message || String(error),
        recordId: event.params?.recordId || "",
      });
      throw error;
    }
  },
);
