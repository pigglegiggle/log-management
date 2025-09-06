const express = require('express');
const bodyParser = require('body-parser');
const { 
  sequelize, 
  FirewallLog, 
  NetworkLog, 
  syncGlobalLogs,
  getOrCreateTenant,
  getOrCreateSource
} = require('./models');
const { parseFirewallLog, parseNetworkLog } = require('./parsers');
const mysql = require('mysql2/promise');

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
        // For firewall logs, we don't parse with parseFirewallLog anymore
        // since we're receiving structured JSON data
        parsed = data;
        parsed.raw = JSON.stringify(data);
        
        const firewallSourceId = await getOrCreateSource(data.source || 'firewall');
        
        const firewallReplacements = [
          parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
          data.source || 'firewall', // Use source as string directly, not ID
          parsed.vendor,
          parsed.product,
          parsed.action,
          parsed.src || parsed.src_ip,
          parsed.spt || parsed.src_port,
          parsed.dst || parsed.dst_ip,
          parsed.dpt || parsed.dst_port,
          parsed.proto || parsed.protocol,
          parsed.hostname || parsed.host || null, // Provide null instead of undefined
          parsed.raw,
          parsed._tags ? JSON.stringify(parsed._tags) : null
        ];
        
        console.log('Firewall replacements:', replacements);
        
        // Use the current table structure (tenant/source as VARCHAR instead of foreign keys)
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, vendor, product, action, src_ip, src_port, dst_ip, dst_port, protocol, host, raw, _tags)
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'firewall', // Use source as string directly
            parsed.vendor,
            parsed.product,
            parsed.action,
            parsed.src || parsed.src_ip,
            parsed.spt || parsed.src_port,
            parsed.dst || parsed.dst_ip,
            parsed.dpt || parsed.dst_port,
            parsed.proto || parsed.protocol,
            parsed.hostname || parsed.host || null,
            parsed.raw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        // Keep legacy table for backup
        await FirewallLog.create({
          timestamp: parsed['@timestamp'] ? new Date(parsed['@timestamp']) : null,
          source: data.source || 'firewall',
          vendor: parsed.vendor,
          product: parsed.product,
          action: parsed.action,
          src_ip: parsed.src || parsed.src_ip,
          src_port: parsed.spt || parsed.src_port,
          dst_ip: parsed.dst || parsed.dst_ip,
          dst_port: parsed.dpt || parsed.dst_port,
          protocol: parsed.proto || parsed.protocol,
          host: parsed.hostname || parsed.host,
          raw: parsed.raw,
          _tags: parsed._tags
        });
        break;

      case 'network':
        // For network logs, we don't parse with parseNetworkLog anymore
        // since we're receiving structured JSON data  
        parsed = data;
        parsed.raw = JSON.stringify(data);
        
        // Use the current table structure (tenant/source as VARCHAR)
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, event_type, host, raw, _tags)
          VALUES (?, NULL, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            parsed['@timestamp'] ? new Date(parsed['@timestamp']) : new Date(),
            data.source || 'network', // Use source as string directly
            parsed.event || parsed.event_type,
            parsed.hostname || parsed.host || null,
            parsed.raw,
            parsed._tags ? JSON.stringify(parsed._tags) : null
          ],
          type: sequelize.QueryTypes.INSERT
        });

        // Keep legacy table for backup
        await NetworkLog.create({
          timestamp: parsed['@timestamp'] ? new Date(parsed['@timestamp']) : null,
          source: data.source || 'network',
          interface: parsed.interface,
          event: parsed.event,
          mac: parsed.mac,
          reason: parsed.reason,
          host: parsed.hostname || parsed.host,
          raw: parsed.raw,
          _tags: parsed._tags
        });
        break;

      default:
        // Multi-tenant log
        const tenant = data.tenant || 'default';
        parsed = { ...data, raw: JSON.stringify(data) };
        
        const defaultReplacements = [
          parsed['@timestamp'] ? new Date(parsed['@timestamp']) : null,
          tenant, // Use tenant as string directly
          data.source || null, // Use source as string directly
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
        ];
        
        console.log('Default case replacements:', defaultReplacements);
        
        // Use the current table structure (tenant/source as VARCHAR)
        await sequelize.query(`
          INSERT INTO logs (timestamp, tenant, source, vendor, product, event_type, event_subtype, severity, action, src_ip, src_port, dst_ip, dst_port, protocol, user, host, process, url, http_method, status_code, rule_name, rule_id, cloud, raw, _tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: defaultReplacements,
          type: sequelize.QueryTypes.INSERT
        });

        console.log(`Inserted log for tenant: ${tenant}, source: ${data.source}, type: ${logType}`);
    }

    res.json({ status: 'ok', data: data });
  } catch (err) {
    console.error('Error inserting log:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const MAX_RETRIES = 10;      // จำนวนครั้งสูงสุดที่จะลองเชื่อมต่อ
const RETRY_DELAY = 3000;    // หน่วงเวลา 3 วินาที

async function waitForDatabase() {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await connection.end();
      console.log('Database is ready');
      return;
    } catch (err) {
      attempts++;
      console.log(`Database not ready yet, retrying (${attempts}/${MAX_RETRIES})...`);
      await new Promise(res => setTimeout(res, RETRY_DELAY));
    }
  }
  throw new Error('Unable to connect to database after several attempts');
}

// Startup: รอ DB ก่อน แล้วค่อย authenticate + sync tables
(async () => {
  try {
    await waitForDatabase();
    await sequelize.authenticate();
    await syncGlobalLogs();
    console.log('MySQL connected and global logs synced');

    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  } catch (err) {
    console.error('Unable to start app:', err);
    process.exit(1);
  }
})();
