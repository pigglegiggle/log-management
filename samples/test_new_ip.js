const url = 'http://localhost:3000/ingest';

// event template สำหรับ IP ใหม่
const eventTemplate = {
  "tenant": "demoA",
  "source": "api",
  "event_type": "app_login_failed",
  "user": "hacker",
  "ip": "192.168.1.999",  // IP ใหม่
  "reason": "brute_force"
};

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function sendEvent() {
  const event = {
    ...eventTemplate,
    "@timestamp": getCurrentTimestamp()
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log('Sent successfully:', event.ip, text.slice(0, 100) + '...');

  } catch (err) {
    console.error('Error sending:', err.message);
  }
}

async function sendLoop(times) {
  console.log(`🚀 Testing new IP: ${eventTemplate.ip} with ${times} failed attempts`);
  for (let i = 0; i < times; i++) {
    await sendEvent();
    await new Promise(resolve => setTimeout(resolve, 100)); // รอ 100ms
  }
  console.log('✅ Finished sending failed login attempts');
}

// ยิง 4 ครั้งเพื่อทดสอบ (เกิน threshold 3)
sendLoop(4);
