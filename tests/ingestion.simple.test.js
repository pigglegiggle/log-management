const fetch = require('node-fetch');

const INGEST_URL = 'http://localhost:3000';

describe('Log Ingestion API', () => {

  test('ทดสอบเบสิค Log', async () => {
    const testLog = {
        tenant: "demoA",
        source: "crowdstrike",
        event_type: "malware_detected",
        host: "WIN10-01",
        process: "powershell.exe",
        severity: 8,
        sha256: "abc...",
        action: "quarantine",
        '@timestamp': "2025-08-23T08:00:00Z"
    };
    
    const response = await fetch(`${INGEST_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testLog)
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  test('ทดสอบ firewall log', async () => {
    const firewallLog = {
      log_type: 'firewall',
      log: '<134>Aug 20 12:44:56 fw01 vendor=demo product=ngfw action=deny src=10.0.1.10 dst=8.8.8.8 spt=5353 dpt=53 proto=udp msg=DNS blocked policy=Block-DNS'
    };
    
    const response = await fetch(`${INGEST_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firewallLog)
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});
