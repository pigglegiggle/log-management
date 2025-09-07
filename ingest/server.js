const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { pool, waitForDatabase } = require('./db');
const { parseFirewallLog, parseNetworkLog } = require('./parsers');

const app = express();
app.use(bodyParser.json());

// Function to convert severity to number (only if provided)
function getSeverityAsNumber(severity) {
  // If already a number, return it
  if (typeof severity === 'number') {
    return severity;
  }
  
  // If string, convert to number
  if (typeof severity === 'string' && severity.trim() !== '') {
    const severityMap = {
      'low': 2,
      'info': 4,
      'medium': 6,
      'warning': 6,
      'high': 8,
      'critical': 10
    };
    
    const mapped = severityMap[severity.toLowerCase()];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  
  // Return null if no valid severity provided
  return null;
}

// Function to get or create tenant ID
async function getTenantId(tenantName) {
  try {
    // Check if tenant exists
    const [results] = await pool.execute(`
      SELECT id FROM tenants WHERE name = ?
    `, [tenantName]);
    
    if (results.length > 0) {
      return results[0].id;
    }
    
    // Create new tenant if doesn't exist
    const [insertResult] = await pool.execute(`
      INSERT INTO tenants (name, description) VALUES (?, ?)
    `, [tenantName, `Auto-created tenant: ${tenantName}`]);
    
    console.log(`Created new tenant: ${tenantName} with ID: ${insertResult.insertId}`);
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
    const [results] = await pool.execute(`
      SELECT id FROM sources WHERE name = ?
    `, [sourceName]);
    
    if (results.length > 0) {
      return results[0].id;
    }
    
    // Create new source if doesn't exist
    const [insertResult] = await pool.execute(`
      INSERT INTO sources (name, description) VALUES (?, ?)
    `, [sourceName, `Auto-created source: ${sourceName}`]);
    
    console.log(`Created new source: ${sourceName} with ID: ${insertResult.insertId}`);
    return insertResult.insertId;
    
  } catch (error) {
    console.error(`Error getting/creating source ${sourceName}:`, error);
    throw error;
  }
}

// --- Route ingest (Simplified)
app.post('/ingest', async (req, res) => {
  let data = req.body;
  if (Array.isArray(data)) data = data[0];
  console.log('Received data:', data);
  
  const logType = data.log_type || data.log_tag || 'tenant';
  const sourceName = data.source || 'unknown';
  const rawLog = data.raw || data.log || JSON.stringify(data);

  console.log(`Processing log_type: ${logType}, source: ${sourceName}`);

  try {
    // Parse network/firewall logs with specific parsers
    if (logType === 'firewall') {
      const parsed = parseFirewallLog(rawLog);
      data = { ...data, ...parsed };
      console.log('Parsed firewall data:', parsed);
    } else if (logType === 'network') {
      const parsed = parseNetworkLog(rawLog);
      data = { ...data, ...parsed };
      console.log('Parsed network data:', parsed);
    }

    // Get source ID (auto-create if needed)
    const sourceId = await getSourceId(sourceName);
    
    let tenantId = null;
    
    // Get tenant ID for tenant logs
    if (logType === 'tenant' && data.tenant) {
      tenantId = await getTenantId(data.tenant);
    }

    // Single insert into logs table
    const logData = {
      timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
      tenant_id: tenantId,
      source_id: sourceId,
      log_type: logType,
      event_type: data.event_type || data.event || data.action || null,
      severity: getSeverityAsNumber(data.severity),
      message: data.message || data.log || JSON.stringify(data),
      src_ip: data.src || data.src_ip || data.ip || null,
      dst_ip: data.dst || data.dst_ip || null,
      user: data.user || null,
      host: data.hostname || data.host || null,
      action: data.action || null,
      src_port: data.spt || data.src_port || null,
      dst_port: data.dpt || data.dst_port || null,
      protocol: data.proto || data.protocol || null,
      rule_name: data.rule_name || null,
      rule_id: data.rule_id || null,
      interface: data.interface || null,
      mac: data.mac || null,
      raw_data: rawLog,
      tags: data._tags || data.tags ? JSON.stringify(data._tags || data.tags) : null
    };

    await pool.execute(`
      INSERT INTO logs (
        timestamp, tenant_id, source_id, log_type, event_type, severity, message,
        src_ip, dst_ip, user, host, action, src_port, dst_port, protocol,
        rule_name, rule_id, interface, mac, raw_data, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logData.timestamp, logData.tenant_id, logData.source_id, logData.log_type,
      logData.event_type, logData.severity, logData.message, logData.src_ip,
      logData.dst_ip, logData.user, logData.host, logData.action, logData.src_port,
      logData.dst_port, logData.protocol, logData.rule_name, logData.rule_id,
      logData.interface, logData.mac, logData.raw_data, logData.tags, new Date()
    ]);

    console.log(`✅ Inserted ${logType} log: tenant_id=${tenantId}, source_id=${sourceId}`);
    res.json({ status: 'ok', data: logData });

  } catch (err) {
    console.error('❌ Error inserting log:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// File watcher function
function watchLogFile(filePath, sourceName, logType) {
  if (!fs.existsSync(filePath)) {
    console.log(`Log file ${filePath} does not exist, skipping watcher`);
    return;
  }

  let lastSize = fs.statSync(filePath).size;
  
  fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
    if (curr.size > lastSize) {
      const stream = fs.createReadStream(filePath, {
        start: lastSize,
        end: curr.size
      });
      
      let buffer = '';
      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line
        
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`Processing ${logType} log from ${sourceName}: ${line.substring(0, 100)}...`);
            
            // Create synthetic log data
            const logData = {
              source: sourceName,
              log_type: logType,
              raw: line.trim(),
              '@timestamp': new Date().toISOString()
            };
            
            // Process the log (simulate POST to /ingest)
            processLogData(logData);
          }
        });
      });
      
      lastSize = curr.size;
    }
  });
  
  console.log(`📁 Watching ${filePath} for ${sourceName} (${logType}) logs`);
}

// Process log data (extracted from POST /ingest)
async function processLogData(data) {
  const logType = data.log_type || data.log_tag || 'tenant';
  const sourceName = data.source || 'unknown';
  const rawLog = data.raw || data.log || JSON.stringify(data);

  try {
    // Parse network/firewall logs with specific parsers
    if (logType === 'firewall') {
      const parsed = parseFirewallLog(rawLog);
      data = { ...data, ...parsed };
      console.log('Parsed firewall data:', Object.keys(parsed));
    } else if (logType === 'network') {
      const parsed = parseNetworkLog(rawLog);
      data = { ...data, ...parsed };
      console.log('Parsed network data:', Object.keys(parsed));
    }

    // Get source ID (auto-create if needed)
    const sourceId = await getSourceId(sourceName);
    
    let tenantId = null;
    
    // Get tenant ID for tenant logs
    if (logType === 'tenant' && data.tenant) {
      tenantId = await getTenantId(data.tenant);
    }

    // Single insert into logs table
    const logData = {
      timestamp: data['@timestamp'] ? new Date(data['@timestamp']) : new Date(),
      tenant_id: tenantId,
      source_id: sourceId,
      log_type: logType,
      event_type: data.event_type || data.event || data.action || null,
      severity: getSeverityAsNumber(data.severity),
      message: JSON.stringify(data),
      src_ip: data.src || data.src_ip || data.ip || null,
      dst_ip: data.dst || data.dst_ip || null,
      user: data.user || null,
      host: data.hostname || data.host || null,
      action: data.action || null,
      src_port: data.spt || data.src_port || null,
      dst_port: data.dpt || data.dst_port || null,
      protocol: data.proto || data.protocol || null,
      rule_name: data.rule_name || null,
      rule_id: data.rule_id || null,
      interface: data.interface || null,
      mac: data.mac || null,
      raw_data: rawLog,
      tags: data._tags || data.tags ? JSON.stringify(data._tags || data.tags) : null
    };

    await pool.execute(`
      INSERT INTO logs (
        timestamp, tenant_id, source_id, log_type, event_type, severity, message,
        src_ip, dst_ip, user, host, action, src_port, dst_port, protocol,
        rule_name, rule_id, interface, mac, raw_data, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logData.timestamp, logData.tenant_id, logData.source_id, logData.log_type,
      logData.event_type, logData.severity, logData.message, logData.src_ip,
      logData.dst_ip, logData.user, logData.host, logData.action, logData.src_port,
      logData.dst_port, logData.protocol, logData.rule_name, logData.rule_id,
      logData.interface, logData.mac, logData.raw_data, logData.tags, new Date()
    ]);

    console.log(`✅ Inserted ${logType} log: tenant_id=${tenantId}, source_id=${sourceId}`);

  } catch (err) {
    console.error('❌ Error processing log:', err);
  }
}

// เริ่มต้น server
async function startServer() {
  await waitForDatabase();
  
  // Setup file watchers
  const logsDir = path.join(__dirname, '..', 'logs');
  watchLogFile(path.join(logsDir, 'network.log'), 'network', 'network');
  watchLogFile(path.join(logsDir, 'firewall.log'), 'firewall', 'firewall');
  
  app.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log('🔍 File watchers initialized for network and firewall logs');
  });
}

startServer();
