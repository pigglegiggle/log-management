const fs = require('fs');
const path = require('path');

const url = 'http://localhost:3000/ingest';
const eventsFile = path.join(__dirname, 'tenants.json');

// โหลด events จากไฟล์
function loadEvents() {
  try {
    const data = fs.readFileSync(eventsFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Error reading events file:', err);
    return [];
  }
}

// ส่ง event เดียว
async function sendOne(event) {
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
    console.log('✅ Sent successfully:', event.source);

  } catch (err) {
    console.error('❌ Error sending:', event.source, err.message);
  }
}

// ส่งทีละอันแบบรอให้เสร็จก่อนส่งตัวต่อไป
async function sendAll(events) {
  for (const ev of events) {
    await sendOne(ev);
  }
  console.log('🚀 All events sent!');
}

// เริ่มส่ง
(async () => {
  const events = loadEvents();
  await sendAll(events);
})();
