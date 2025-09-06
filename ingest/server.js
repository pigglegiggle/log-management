const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, connectDB } = require('./models');
const { parseFirewallLog, parseNetworkLog } = require('./parsers');

const app = express();
app.use(bodyParser.json());

const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// --- Route ingest
app.post('/ingest', async (req, res) => {
  let data = req.body;
  if (Array.isArray(data)) data = data[0];
  console.log('Received data:', data);
  
  const logType = data.log_type || data.log_tag; // Support both log_type and log_tag
  const rawLog = data.raw || data.log || '';

  console.log(`Received log_type: ${logType}`);

  let parsed;
  try {
    switch (logType) {
      case 'firewall':
        // Insert เข้า logs_firewall และ logs
        parsed = data;
        // เก็บแค่ค่าของ log แทน object ทั้งหมด
        const firewallRaw = data.log || JSON.stringify(data);
        
        // Insert into logs_firewall
        await sequelize.query(`
          INSERT INTO logs_firewall (timestamp, source, vendor, product, action, src_ip, src_port, dst_ip, dst_port, protocol, host, rule_name, rule_id, raw, _tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'firewall',
            parsed.vendor || null,
            parsed.product || null,
            parsed.action || null,
            parsed.src || parsed.src_ip || null,
            parsed.spt || parsed.src_port || null,
            parsed.dst || parsed.dst_ip || null,
            parsed.dpt || parsed.dst_port || null,
            parsed.proto || parsed.protocol || null,
            parsed.hostname || parsed.host || null,
            parsed.rule_name || null,
            parsed.rule_id || null,
            firewallRaw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        // Insert into main logs table
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, vendor, product, action, src_ip, src_port, dst_ip, dst_port, protocol, host, rule_name, rule_id, raw, _tags)
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'firewall',
            parsed.vendor || null,
            parsed.product || null,
            parsed.action || null,
            parsed.src || parsed.src_ip || null,
            parsed.spt || parsed.src_port || null,
            parsed.dst || parsed.dst_ip || null,
            parsed.dpt || parsed.dst_port || null,
            parsed.proto || parsed.protocol || null,
            parsed.hostname || parsed.host || null,
            parsed.rule_name || null,
            parsed.rule_id || null,
            firewallRaw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        console.log(`Inserted firewall log with source: ${data.source}`);
        break;

      case 'network':
        // Insert เข้า logs_network และ logs
        parsed = data;
        // เก็บแค่ค่าของ log แทน object ทั้งหมด
        const networkRaw = data.log || JSON.stringify(data);
        
        // Insert into logs_network
        await sequelize.query(`
          INSERT INTO logs_network (timestamp, source, interface, event, mac, reason, host, raw, _tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'network',
            parsed.interface || null,
            parsed.event || parsed.event_type || null,
            parsed.mac || null,
            parsed.reason || null,
            parsed.hostname || parsed.host || null,
            networkRaw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        // Insert into main logs table
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, event_type, host, raw, _tags)
          VALUES (?, NULL, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'network',
            parsed.event || parsed.event_type || null,
            parsed.hostname || parsed.host || null,
            networkRaw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        console.log(`Inserted network log with source: ${data.source}`);
        break;

      default:
        // Multi-tenant log - insert เข้า logs_{tenant} และ logs
        const tenant = data.tenant || 'default';
        parsed = { ...data, raw: JSON.stringify(data) };
        
        // Insert into tenant-specific table
        const tenantTable = `logs_${tenant}`;
        await sequelize.query(`
          INSERT INTO ${tenantTable} (timestamp, source, vendor, product, event_type, event_subtype, severity, action, src_ip, src_port, dst_ip, dst_port, protocol, user, host, process, url, http_method, status_code, rule_name, rule_id, cloud, raw, _tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : null,
            data.source || null,
            parsed.vendor || null,
            parsed.product || null,
            parsed.event_type || null,
            parsed.event_subtype || null,
            parsed.severity || null,
            parsed.action || null,
            parsed.src || parsed.src_ip || parsed.ip || null,
            parsed.spt || parsed.src_port || null,
            parsed.dst || parsed.dst_ip || null,
            parsed.dpt || parsed.dst_port || null,
            parsed.proto || parsed.protocol || null,
            parsed.user || null,
            parsed.hostname || parsed.host || null,
            parsed.process || null,
            parsed.url || null,
            parsed.http_method || null,
            parsed.status_code || parsed.status || null,
            parsed.rule_name || null,
            parsed.rule_id || null,
            parsed.cloud ? JSON.stringify(parsed.cloud) : null,
            JSON.stringify(parsed.raw),
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        // Insert into main logs table
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, vendor, product, event_type, event_subtype, severity, action, src_ip, src_port, dst_ip, dst_port, protocol, user, host, process, url, http_method, status_code, rule_name, rule_id, cloud, raw, _tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : null,
            tenant,
            data.source || null,
            parsed.vendor || null,
            parsed.product || null,
            parsed.event_type || null,
            parsed.event_subtype || null,
            parsed.severity || null,
            parsed.action || null,
            parsed.src || parsed.src_ip || parsed.ip || null,
            parsed.spt || parsed.src_port || null,
            parsed.dst || parsed.dst_ip || null,
            parsed.dpt || parsed.dst_port || null,
            parsed.proto || parsed.protocol || null,
            parsed.user || null,
            parsed.hostname || parsed.host || null,
            parsed.process || null,
            parsed.url || null,
            parsed.http_method || null,
            parsed.status_code || parsed.status || null,
            parsed.rule_name || null,
            parsed.rule_id || null,
            parsed.cloud ? JSON.stringify(parsed.cloud) : null,
            JSON.stringify(parsed.raw),
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        console.log(`Inserted log for tenant: ${tenant}, source: ${data.source}, type: ${logType}`);
    }

    res.json({ status: 'ok', data: parsed });
  } catch (err) {
    console.error('Error inserting log:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ฟังก์ชัน wait for database
async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('Database is ready');
      break;
    } catch (error) {
      console.log(`Waiting for database... (${retries + 1}/${maxRetries})`);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (retries === maxRetries) {
    console.error('Could not connect to database after maximum retries');
    process.exit(1);
  }
}

// เริ่มต้น server
async function startServer() {
  await waitForDatabase();
  await connectDB();
  
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

startServer();
