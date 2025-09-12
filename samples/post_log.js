require('dotenv').config();
const fs = require('fs');
const url = `${process.env.INGEST_URL}/ingest`;

// อ่านไฟล์ JSON
const events = JSON.parse(fs.readFileSync('tenants.json', 'utf-8'));

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function sendEvent(eventTemplate) {
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

async function sendAllEvents() {
  for (const e of events) {
    await sendEvent(e);
  }
}

sendAllEvents();
