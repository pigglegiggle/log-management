const url = 'http://localhost:3000/ingest';

// JSON events ทั้งหมด
const events = [
  {
    "tenant": "demoA",
    "source": "api",
    "event_type": "app_login_failed",
    "user": "alice",
    "ip": "203.0.113.7",
    "reason": "wrong_password",
    "@timestamp": "2025-08-23T07:20:00Z"
  },
  {
    "tenant": "demoA",
    "source": "crowdstrike",
    "event_type": "malware_detected",
    "host": "WIN10-01",
    "process": "powershell.exe",
    "severity": 8,
    "sha256": "abc...",
    "action": "quarantine",
    "@timestamp": "2025-08-23T08:00:00Z"
  },
  {
    "tenant": "demoB",
    "source": "aws",
    "cloud": {
      "service": "iam",
      "account_id": "123456789012",
      "region": "ap-southeast-1"
    },
    "event_type": "CreateUser",
    "user": "admin",
    "@timestamp": "2025-08-23T09:10:00Z",
    "raw": {
      "eventName": "CreateUser",
      "requestParameters": { "userName": "temp-user" }
    }
  },
  {
    "tenant": "demoB",
    "source": "m365",
    "event_type": "UserLoggedIn",
    "user": "bob@demo.local",
    "ip": "198.51.100.23",
    "status": "Success",
    "workload": "Exchange",
    "@timestamp": "2025-08-23T10:05:00Z"
  },
  {
    "tenant": "demoA",
    "source": "ad",
    "event_id": 4625,
    "event_type": "LogonFailed",
    "user": "demo\\eve",
    "host": "DC01",
    "ip": "203.0.113.77",
    "logon_type": 3,
    "@timestamp": "2025-08-23T11:11:11Z"
  }
];

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
    console.log('Sent successfully:', event.source, text);

  } catch (err) {
    console.error('Error sending:', event.source, err.message);
  }
}

async function sendAll(events) {
  // ส่งเรียงลำดับ
  for (const ev of events) {
    await sendOne(ev);
  }

  // ถ้าอยากยิงพร้อมกัน ใช้ Promise.all
  // await Promise.all(events.map(ev => sendOne(ev)));
}

// เริ่มส่งทั้งหมด
sendAll(events);
