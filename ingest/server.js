const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { connection } = require('./db');
const { parseFirewallLog, parseNetworkLog } = require('./parsers');

const app = express();
app.use(bodyParser.json());

// Function to convert severity to number (only if provided)
// function getSeverityAsNumber(severity) {
//   // If already a number, return it
//   if (typeof severity === 'number') {
//     return severity;
//   }

//   // Return null if no valid severity provided
//   return null;
// }

// Function to get or create tenant ID
// async function getTenantId(tenantName) {
//   try {
//     // Check if tenant exists
//     const [results] = await connection.execute(`
//       SELECT id FROM tenants WHERE name = ?
//     `, [tenantName]);
    
//     if (results.length > 0) {
//       return results[0].id;
//     }
    
//     // Create new tenant if doesn't exist
//     const [insertResult] = await connection.execute(`
//       INSERT INTO tenants (name, description) VALUES (?, ?)
//     `, [tenantName, `Auto-created tenant: ${tenantName}`]);

//     return insertResult.insertId;
    
//   } catch (error) {
//     console.error(`Error getting/creating tenant ${tenantName}:`, error);
//     throw error;
//   }
// }

// Function to get or create source ID
// async function getSourceId(sourceName) {
//   try {
//     // Check if source exists
//     const [results] = await connection.execute(`
//       SELECT id FROM sources WHERE name = ?
//     `, [sourceName]);
    
//     if (results.length > 0) {
//       return results[0].id;
//     }
    
//     const [insertResult] = await connection.execute(`
//       INSERT INTO sources (name, description) VALUES (?, ?)
//     `, [sourceName, `Auto-created source: ${sourceName}`]);
//     return insertResult.insertId;
    
//   } catch (error) {
//     console.error(`Error getting/creating source ${sourceName}:`, error);
//     throw error;
//   }
// }

// --- Route ingest (Simplified)
app.post('/ingest', async (req, res) => {
  let data = req.body;
  if (Array.isArray(data)) data = data[0];

  const logType = data.log_type || data.log_tag || 'tenant';
  const sourceName = data.source || 'unknown';
  const rawLog = data.raw || data.log || JSON.stringify(data);

  console.log('Received log data:', Object.keys(data));
  // console.log(`Processing log_type: ${logType}, source: ${sourceName}`);

  // try {
  //   // Parse network/firewall logs with specific parsers
  //   if (logType === 'firewall') {
  //     const parsed = parseFirewallLog(rawLog);
  //     data = { ...data, ...parsed };

  //   } else if (logType === 'network') {
  //     const parsed = parseNetworkLog(rawLog);
  //     data = { ...data, ...parsed };

  //   }

  //   // Get source ID (auto-create if needed)
  //   const sourceId = await getSourceId(sourceName);
    
  //   let tenantId = null;
    
  //   // Get tenant ID for tenant logs
  //   if (logType === 'tenant' && data.tenant) {
  //     tenantId = await getTenantId(data.tenant);
  //   }

  //   // Single insert into logs table
  //   const logData = {
  //     timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
  //     tenant_id: tenantId,
  //     source_id: sourceId,
  //     log_type: logType,
  //     event_type: data.event_type || data.event || data.action || null,
  //     severity: getSeverityAsNumber(data.severity),
  //     message: data.message || data.log || JSON.stringify(data),
  //     src_ip: data.src || data.src_ip || data.ip || null,
  //     dst_ip: data.dst || data.dst_ip || null,
  //     user: data.user || null,
  //     host: data.hostname || data.host || null,
  //     action: data.action || null,
  //     src_port: data.spt || data.src_port || null,
  //     dst_port: data.dpt || data.dst_port || null,
  //     protocol: data.proto || data.protocol || null,
  //     rule_name: data.rule_name || null,
  //     rule_id: data.rule_id || null,
  //     interface: data.interface || null,
  //     mac: data.mac || null,
  //     raw_data: rawLog,
  //     tags: data._tags || data.tags ? JSON.stringify(data._tags || data.tags) : null
  //   };

  //   await connection.execute(`
  //     INSERT INTO logs (
  //       timestamp, tenant_id, source_id, log_type, event_type, severity, message,
  //       src_ip, dst_ip, user, host, action, src_port, dst_port, protocol,
  //       rule_name, rule_id, interface, mac, raw_data, tags, created_at
  //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //   `, [
  //     logData.timestamp, logData.tenant_id, logData.source_id, logData.log_type,
  //     logData.event_type, logData.severity, logData.message, logData.src_ip,
  //     logData.dst_ip, logData.user, logData.host, logData.action, logData.src_port,
  //     logData.dst_port, logData.protocol, logData.rule_name, logData.rule_id,
  //     logData.interface, logData.mac, logData.raw_data, logData.tags, new Date()
  //   ]);

  //   console.log(`✅ Inserted ${logType} log: tenant_id=${tenantId}, source_id=${sourceId}`);
  //   res.json({ status: 'ok', data: logData });

  // } catch (err) {
  //   console.error('❌ Error inserting log:', err);
  //   res.status(500).json({ status: 'error', message: err.message });
  // }
});

// Process log data (extracted from POST /ingest)
// async function processLogData(data) {
//   const logType = data.log_type || data.log_tag || 'tenant';
//   const sourceName = data.source || 'unknown';
//   const rawLog = data.raw || data.log || JSON.stringify(data);

//   try {
//     // Parse network/firewall logs with specific parsers
//     if (logType === 'firewall') {
//       const parsed = parseFirewallLog(rawLog);
//       data = { ...data, ...parsed };
//       console.log('Parsed firewall data:', Object.keys(parsed));
//     } else if (logType === 'network') {
//       const parsed = parseNetworkLog(rawLog);
//       data = { ...data, ...parsed };
//       console.log('Parsed network data:', Object.keys(parsed));
//     }

//     // Get source ID (auto-create if needed)
//     const sourceId = await getSourceId(sourceName);
    
//     let tenantId = null;
    
//     // Get tenant ID for tenant logs
//     if (logType === 'tenant' && data.tenant) {
//       tenantId = await getTenantId(data.tenant);
//     }

//     // Single insert into logs table
//     const logData = {
//       timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
//       tenant_id: tenantId,
//       source_id: sourceId,
//       log_type: logType,
//       event_type: data.event_type || data.event || data.action || null,
//       severity: getSeverityAsNumber(data.severity),
//       message: JSON.stringify(data),
//       src_ip: data.src || data.src_ip || data.ip || null,
//       dst_ip: data.dst || data.dst_ip || null,
//       user: data.user || null,
//       host: data.hostname || data.host || null,
//       action: data.action || null,
//       src_port: data.spt || data.src_port || null,
//       dst_port: data.dpt || data.dst_port || null,
//       protocol: data.proto || data.protocol || null,
//       rule_name: data.rule_name || null,
//       rule_id: data.rule_id || null,
//       interface: data.interface || null,
//       mac: data.mac || null,
//       raw_data: rawLog,
//       tags: data._tags || data.tags ? JSON.stringify(data._tags || data.tags) : null
//     };

//     await connection.execute(`
//       INSERT INTO logs (
//         timestamp, tenant_id, source_id, log_type, event_type, severity, message,
//         src_ip, dst_ip, user, host, action, src_port, dst_port, protocol,
//         rule_name, rule_id, interface, mac, raw_data, tags, created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `, [
//       logData.timestamp, logData.tenant_id, logData.source_id, logData.log_type,
//       logData.event_type, logData.severity, logData.message, logData.src_ip,
//       logData.dst_ip, logData.user, logData.host, logData.action, logData.src_port,
//       logData.dst_port, logData.protocol, logData.rule_name, logData.rule_id,
//       logData.interface, logData.mac, logData.raw_data, logData.tags, new Date()
//     ]);

//     console.log(`✅ Inserted ${logType} log: tenant_id=${tenantId}, source_id=${sourceId}`);

//   } catch (err) {
//     console.error('❌ Error processing log:', err);
//   }
// }

// เริ่มต้น server

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('🔍 File watchers initialized for network and firewall logs');
});

