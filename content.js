// content.js

// === CONFIG ===
const BOT_TOKEN = "9230093129:AAGcJsMhfcTQDev9B4AYTRAsQDDz5kpOcBU";
const CHAT_ID   = "-1004430882241";

// টেবিলের রো selector
const tableSelector = "table tbody tr";

// কলাম index: Live SMS | SID | Paid | Limit | Message content
const COL_LIVE    = 0;  // Country + Number
const COL_SERVICE = 1;  // SID / Service (Telegram)
const COL_MSG     = 4;  // Message content (0 থেকে গুনে ৪ নম্বর কলাম)

// =========================
// Helper: HTML escape
// =========================
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

(function () {
  if (window._ivas_started) return;
  window._ivas_started = true;

  window._ivas_seen = window._ivas_seen || new Set();

  function extractNumber(liveText) {
    const normalized = liveText.replace(/\s+/g, " ");
    const matches = normalized.match(/(\d{6,})/g);
    if (!matches || !matches.length) return "";
    return matches[matches.length - 1]; // শেষ digit block কে নম্বর ধরি
  }

  function extractCountry(liveText) {
    const firstLine = liveText.split(/\n/)[0] || "";
    return firstLine.replace(/\d+/g, "").trim(); // ডিজিট বাদ দিয়ে country
  }

  function maskNumber(number) {
    const n = (number || "").replace(/\D/g, "");
    if (n.length >= 10) {
      return n.slice(0, 6) + "*" + n.slice(-4); // 797855*8944
    }
    if (n.length > 4) {
      return n.slice(0, n.length - 2) + "*" + n.slice(-2);
    }
    return n;
  }

  function extractOtp(message) {
    // "206-702" / "206702" / "206 702" এর মত থেকে code কেটে নেয়
    const m = message.match(/\d[\d\-\s]{2,8}\d/g);
    if (!m || !m.length) return "";
    return m[0].replace(/\D/g, "");
  }

  // =========================
  // Build HTML message
  // =========================
  function buildHtml({ country, service, number, otp, message }) {
    const masked = maskNumber(number);
    const escCountry = escapeHtml(country);
    const escService = escapeHtml(service);
    const escMasked  = escapeHtml(masked);
    const escOtp     = escapeHtml(otp);
    const escMsg     = escapeHtml(message);

    // উপরের title bold
    const title = `<b>🔥 ${escCountry || "IVASMS"} OTP ✨</b>`;

    let lines = [];
    lines.push(title);
    lines.push("");

    // Time / Country / Service / Number / OTP – label bold
    lines.push(`<b>Time:</b> ${new Date().toLocaleTimeString("en-GB")}`);
    if (escCountry) lines.push(`<b>Country:</b> ${escCountry}`);
    if (escService) lines.push(`<b>Service:</b> ${escService}`);
    if (escMasked)  lines.push(`<b>Number:</b> ${escMasked}`);
    if (escOtp)     lines.push(`<b>OTP:</b> ${escOtp}`);
    lines.push("");

    lines.push(`<b>Message:</b>`);
    lines.push(escMsg);
    lines.push("");
    // নিচের লাইন bold, আর KAFI তে তোমার লিংক
    lines.push(
      `<b>Powered by Team of <a href="https://t.me/Himel8200">Himel</a></b>`
    );

    return lines.join("\n");
  }

  function sendToTelegram(data) {
    const html = buildHtml(data);

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body:
        `chat_id=${encodeURIComponent(CHAT_ID)}` +
        `&text=${encodeURIComponent(html)}` +
        `&parse_mode=HTML`
    })
      .then((r) => {
        if (!r.ok) {
          r.text().then((t) =>
            console.error("[IVASMS Ext] TG error:", r.status, t)
          );
        } else {
          console.log("[IVASMS Ext] Telegram sent:", data.number);
        }
      })
      .catch((e) => console.error("[IVASMS Ext] Telegram fetch error:", e));
  }

  function scan() {
    const rows = document.querySelectorAll(tableSelector);
    if (!rows.length) return;

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 5) return;

      const liveText = tds[COL_LIVE].innerText.trim();
      const service  = tds[COL_SERVICE].innerText.trim();
      const msgText  = tds[COL_MSG].innerText.trim();

      if (!msgText) return;

      const country = extractCountry(liveText);
      const number  = extractNumber(liveText);
      const otp     = extractOtp(msgText);

      const key = `${number}|${msgText}`;
      if (!key.trim()) return;

      if (!window._ivas_seen.has(key)) {
        window._ivas_seen.add(key);
        console.log("[IVASMS Ext] New row:", {
          country,
          service,
          number,
          otp,
          msg: msgText.slice(0, 50)
        });
        sendToTelegram({ country, service, number, otp, message: msgText });
      }
    });
  }

  setInterval(scan, 2000);
  console.log("[IVASMS Ext] HTML bold formatter started.");
})();
