const fetch = require('node-fetch');

const API_URL = 'http://localhost:3002';

describe('Authentication API', () => {
  
  test('เข้าสู่ระบบ', async () => {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
  });

  test('เข้าหน้า protected page แบบไม่มี token', async () => {
    const response = await fetch(`${API_URL}/api/logs`);
    
    expect([401, 403]).toContain(response.status);
  });

});
