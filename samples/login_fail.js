const url = 'http://localhost:3000/ingest';

// event template
const eventTemplate = {
  "tenant": "demoB",
  "source": "api",
  "event_type": "app_login_failed",
  "user": "alice",
  "ip": "200.0.113.7",
  "reason": "wrong_password"
};

function getCurrentTimestamp() {
  return new Date().toISOString(); // จะได้แบบ 2025-09-07T04:51:48.123Z
}

async function sendEvent() {
  // copy object + ใส่ timestamp ใหม่
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
    console.log('Sent successfully:', event, text);

  } catch (err) {
    console.error('Error sending:', err.message);
  }
}

async function sendLoop(times) {
  for (let i = 0; i < times; i++) {
    await sendEvent();
  }
}

// ยิง 5 ครั้ง
sendLoop(5);
