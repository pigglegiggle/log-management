const express = require('express');
const bodyParser = require('body-parser');
const { connection } = require('./db');
const { parseFirewallLog, parseNetworkLog } = require('./parsers');

const app = express();
app.use(bodyParser.json());

async function getTenantId(tenantName) {
  try {
    const [results] = await connection.execute(`
      SELECT id FROM tenants WHERE name = ?
    `, [tenantName]);
    
    if (results.length > 0) {
      return results[0].id;
    }

    const [insertResult] = await connection.execute(`
      INSERT INTO tenants (name) VALUES (?)
    `, [tenantName]);

    return insertResult.insertId;
    
  } catch (error) {
    console.error(`Error getting/creating tenant ${tenantName}:`, error);
    throw error;
  }
}

// Function to get or create source ID
async function getSourceId(sourceName) {
  try {
    // Check if source exists
    const [results] = await connection.execute(`
      SELECT id FROM sources WHERE name = ?
    `, [sourceName]);
    
    if (results.length > 0) {
      return results[0].id;
    }

    const [insertResult] = await connection.execute(`
      INSERT INTO sources (name) VALUES (?)
    `, [sourceName]);
    return insertResult.insertId;
    
  } catch (error) {
    console.error(`Error getting/creating source ${sourceName}:`, error);
    throw error;
  }
}

app.post('/ingest', async (req, res) => {
  let data = req.body;
  if (Array.isArray(data)) data = data[0];
  const logType = data.log_type || 'tenant';
  const rawLog = data.log || JSON.stringify(data);
  let logData = {};

  try {
    switch (logType) {
      case 'network': {
        const parsed = parseNetworkLog(rawLog);
        data = { ...data, ...parsed };
        const sourceId = await getSourceId(data.log_type);
        data = { ...data, source_id: sourceId };

        logData = {
          timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
          source_id: data.source_id,
          host: data.hostname || null,
          interface: data.interface || null,
          event_type: data.event || null,
          event_subtype: data.reason || null,
          mac: data.mac || null,
          log_type: logType,
          raw_data: rawLog,
        };

        await connection.execute(`
          INSERT INTO logs (
            timestamp, source_id, host, interface, event_type, event_subtype, mac,
            log_type, raw_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logData.timestamp,
          logData.source_id,
          logData.host,
          logData.interface,
          logData.event_type,
          logData.event_subtype,
          logData.mac,
          logData.log_type,
          logData.raw_data
        ]);

        break;
      }

      case 'firewall': {
        const parsed = parseFirewallLog(rawLog);
        data = { ...data, ...parsed };

        const sourceId = await getSourceId(data.log_type);
        data = { ...data, source_id: sourceId };

        logData = {
          timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
          source_id: data.source_id,
          host: data.hostname || null,
          action: data.action || null,
          src_ip: data.src || null,
          dst_ip: data.dst || null,
          src_port: data.spt || null,
          dst_port: data.dpt || null,
          protocol: data.proto || null,
          event_type: data.msg || null,
          log_type: logType,
          raw_data: rawLog,
        };

        await connection.execute(`
          INSERT INTO logs (
            timestamp, source_id, host, action, src_ip, dst_ip, src_port, dst_port, protocol,
            event_type, log_type, raw_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logData.timestamp,
          logData.source_id,
          logData.host,
          logData.action,
          logData.src_ip,
          logData.dst_ip,
          logData.src_port,
          logData.dst_port,
          logData.protocol,
          logData.event_type,
          logData.log_type,
          logData.raw_data
        ]);

        break;
      }

      default: {
        const tenantId = await getTenantId(data.tenant);
        const sourceId = await getSourceId(data.source);
        data = { ...data, tenant_id: tenantId, source_id: sourceId };

        // สร้าง timestamp เก่า >30 วัน
        const oldCreatedAt = new Date();
        oldCreatedAt.setDate(oldCreatedAt.getDate() - 31); // 31 วันย้อนหลัง

        logData = {
          timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
          tenant_id: data.tenant_id,
          source_id: data.source_id,
          event_type: data.event_type || null,
          severity: data.severity || null,
          src_ip: data.ip || null,
          user: data.user || null,
          host: data.host || null,
          action: data.action || null,
          cloud: data.cloud ? JSON.stringify(data.cloud) : null,
          log_type: 'tenant',
          raw_data: rawLog,
          created_at: oldCreatedAt, // <-- เพิ่มตรงนี้
        };

        await connection.execute(`
          INSERT INTO logs (
            timestamp, tenant_id, source_id, event_type, severity, src_ip,
            user, host, action, cloud, log_type, raw_data, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logData.timestamp,
          logData.tenant_id,
          logData.source_id,
          logData.event_type,
          logData.severity,
          logData.src_ip,
          logData.user,
          logData.host,
          logData.action,
          logData.cloud,
          logData.log_type,
          logData.raw_data,
          logData.created_at, // <-- เพิ่มตรงนี้
        ]);

        break;
      }
        
      // default: {
      //   const tenantId = await getTenantId(data.tenant);
      //   const sourceId = await getSourceId(data.source);
      //   data = { ...data, tenant_id: tenantId, source_id: sourceId };

      //   logData = {
      //     timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
      //     tenant_id: data.tenant_id,
      //     source_id: data.source_id,
      //     event_type: data.event_type || null,
      //     severity: data.severity || null,
      //     src_ip: data.ip || null,
      //     user: data.user || null,
      //     host: data.host || null,
      //     action: data.action || null,
      //     cloud: data.cloud ? JSON.stringify(data.cloud) : null,
      //     log_type: 'tenant',
      //     raw_data: rawLog,
      //   };

      //   await connection.execute(`
      //     INSERT INTO logs (
      //       timestamp, tenant_id, source_id, event_type, severity, src_ip,
      //       user, host, action, cloud, log_type, raw_data
      //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      //   `, [
      //     logData.timestamp,
      //     logData.tenant_id,
      //     logData.source_id,
      //     logData.event_type,
      //     logData.severity,
      //     logData.src_ip,
      //     logData.user,
      //     logData.host,
      //     logData.action,
      //     logData.cloud,
      //     logData.log_type,
      //     logData.raw_data
      //   ]);

      //   break;
      // }
    }

    res.json({ status: 'ok', data: logData });
    
  } catch (err) {
    console.error('Error inserting log:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});



const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

