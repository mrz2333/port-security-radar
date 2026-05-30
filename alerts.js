const https = require('node:https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegramMessage(text) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      resolve({ ok: false, error: 'Telegram not configured' });
      return;
    }

    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function formatAlert(changes) {
  if (changes.length === 0) return null;

  const lines = ['🚨 <b>端口安全告警</b>', ''];
  
  const added = changes.filter(c => c.changeType === 'added');
  const removed = changes.filter(c => c.changeType === 'removed');
  const severityChanged = changes.filter(c => c.changeType === 'severity_changed');

  if (added.length > 0) {
    lines.push('📌 <b>新增端口：</b>');
    added.forEach(c => {
      const emoji = c.severity === 'critical' ? '🔴' : c.severity === 'high' ? '🟠' : '🟡';
      lines.push(`  ${emoji} :${c.port} (${c.address}) - ${c.process || 'unknown'}`);
    });
    lines.push('');
  }

  if (removed.length > 0) {
    lines.push('✅ <b>关闭端口：</b>');
    removed.forEach(c => {
      lines.push(`  ⚪ :${c.port} (${c.address})`);
    });
    lines.push('');
  }

  if (severityChanged.length > 0) {
    lines.push('⚠️ <b>风险等级变化：</b>');
    severityChanged.forEach(c => {
      lines.push(`  :${c.port} ${c.previousSeverity} → ${c.severity}`);
    });
    lines.push('');
  }

  lines.push(`🕐 检测时间: ${new Date().toLocaleString('zh-CN')}`);

  return lines.join('\n');
}

async function alertIfNeeded(changes) {
  const message = formatAlert(changes);
  if (message) {
    return await sendTelegramMessage(message);
  }
  return { ok: true, skipped: true };
}

module.exports = {
  sendTelegramMessage,
  formatAlert,
  alertIfNeeded
};
