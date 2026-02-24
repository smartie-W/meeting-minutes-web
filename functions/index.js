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

function buildMail(record) {
  const customer = listToText(record.customerNames);
  const ar = asText(record.salesName);
  const mode = asText(record.meetingMode);
  const time = asText(record.meetingTime);
  const location = asText(record.meetingLocation);
  const topic = asText(record.meetingTopic);
  const industry = `${asText(record.industryLevel1)}/${asText(record.industryLevel2)}`;
  const modules = listToText(record.focusModules);
  const content = asText(record.meetingContent);
  const nextActions = asText(record.nextActions);
  const customerParticipants = participantsToText(record.customerParticipants);
  const ourParticipants = participantsToText(record.ourParticipants);
  const createdAt = asText(record.updatedAt || new Date().toISOString());

  const subject = `[销售会议纪要] ${customer} | AR:${ar} | ${topic}`;
  const html = `
    <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.6;color:#1f2937;">
      <h2 style="margin:0 0 12px;">新会议纪要已提交</h2>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
        <tr><td><b>客户名称</b></td><td>${escapeHtml(customer)}</td></tr>
        <tr><td><b>AR</b></td><td>${escapeHtml(ar)}</td></tr>
        <tr><td><b>会议方式</b></td><td>${escapeHtml(mode)}</td></tr>
        <tr><td><b>会议时间</b></td><td>${escapeHtml(time)}</td></tr>
        <tr><td><b>会议地点</b></td><td>${escapeHtml(location)}</td></tr>
        <tr><td><b>行业</b></td><td>${escapeHtml(industry)}</td></tr>
        <tr><td><b>会议议题</b></td><td>${escapeHtml(topic)}</td></tr>
        <tr><td><b>关注模块</b></td><td>${escapeHtml(modules)}</td></tr>
        <tr><td><b>客户参会</b></td><td>${escapeHtml(customerParticipants)}</td></tr>
        <tr><td><b>我方参会</b></td><td>${escapeHtml(ourParticipants)}</td></tr>
        <tr><td><b>提交时间</b></td><td>${escapeHtml(createdAt)}</td></tr>
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;" />
      <div><b>会议纪要内容</b></div>
      <div style="white-space:pre-wrap;">${escapeHtml(content)}</div>
      <div style="margin-top:12px;"><b>后续行动</b></div>
      <div style="white-space:pre-wrap;">${escapeHtml(nextActions)}</div>
    </div>
  `;

  const text = [
    "新会议纪要已提交",
    `客户名称: ${customer}`,
    `AR: ${ar}`,
    `会议方式: ${mode}`,
    `会议时间: ${time}`,
    `会议地点: ${location}`,
    `行业: ${industry}`,
    `会议议题: ${topic}`,
    `关注模块: ${modules}`,
    `客户参会: ${customerParticipants}`,
    `我方参会: ${ourParticipants}`,
    `提交时间: ${createdAt}`,
    "",
    "会议纪要内容:",
    content,
    "",
    "后续行动:",
    nextActions,
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
      const mail = buildMail(record);
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
