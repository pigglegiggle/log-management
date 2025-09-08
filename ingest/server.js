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
  const rawLog = data.raw || data.log || JSON.stringify(data);

  try {
    let logData;

    switch (logType) {
      case 'network': {
        const parsed = parseNetworkLog(rawLog);
        data = { ...data, ...parsed };

        const sourceId = await getSourceId(data.log_type);
        data = { ...data, source_id: sourceId };

        logData = {
          timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
          source_id: data.source_id,
          host: data.hostname,
          interface: data.interface,
          event_type: data['link-down'],
          event_subtype: data.reason,
          mac: data.mac,
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
          host: data.hostname,
          action: data.action,
          src_ip: data.src,
          dst_ip: data.dst,
          src_port: data.spt,
          dst_port: data.dpt,
          protocol: data.proto,
          event_type: data.msg,
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

        logData = {
          timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
          tenant_id: data.tenant_id,
          source_id: data.source_id,
          event_type: data.event_type,
          severity: data.severity,
          src_ip: data.ip,
          user: data.user,
          host: data.host,
          action: data.action,
          cloud: data.cloud ? JSON.stringify(data.cloud) : null,
          log_type: 'tenant',
          raw_data: rawLog,
        };

        await connection.execute(`
          INSERT INTO logs (
            timestamp, tenant_id, source_id, event_type, severity, src_ip,
            user, host, action, cloud, log_type, raw_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          logData.raw_data
        ]);

        break;
      }
    }

    res.json({ status: 'ok', data: logData });
  } catch (err) {
    console.error('Error inserting log:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});



app.listen(3000, () => {
  console.log('Server running on port 3000');
});

