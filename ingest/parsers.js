const FIREWALL_REGEX = /^<\d+>(?<time>\w+\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(?<hostname>\S+)\s+vendor=(?<vendor>\S+)\s+product=(?<product>\S+)\s+action=(?<action>\S+)\s+src=(?<src>\S+)\s+dst=(?<dst>\S+)\s+spt=(?<spt>\d+)\s+dpt=(?<dpt>\d+)\s+proto=(?<proto>\S+)\s+msg=(?<msg>.*?)\s+policy=(?<policy>\S+)$/;

const NETWORK_REGEX = /^<\d+>(?<time>\w+\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(?<hostname>\S+)\s+if=(?<interface>\S+)\s+event=(?<event>\S+)\s+mac=(?<mac>\S+)\s+reason=(?<reason>.+)$/;

// ฟังก์ชันแปลงเวลาแบบ Python version
function parseTimeToISO(timeStr) {
    try {
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const dt = new Date(Date.parse(`${timeStr} ${currentYear} UTC`));
        if (isNaN(dt.getTime())) return null;
        return dt.toISOString();
    } catch (e) {
        return null;
    }
}

// -------------------------
// Firewall log parser
function parseFirewallLog(rawLog) {
    const match = FIREWALL_REGEX.exec(rawLog);
    if (!match) return { raw_log: rawLog };

    const data = { ...match.groups };
    data["@timestamp"] = parseTimeToISO(data.time);
    data.raw_log = rawLog;
    if (data.spt) data.spt = parseInt(data.spt);
    if (data.dpt) data.dpt = parseInt(data.dpt);
    return data;
}

// -------------------------
// Network log parser
function parseNetworkLog(rawLog) {
    const match = NETWORK_REGEX.exec(rawLog);
    if (!match) return { raw_log: rawLog };

    const data = { ...match.groups };
    data["@timestamp"] = parseTimeToISO(data.time);
    data.raw_log = rawLog;
    return data;
}

module.exports = { parseFirewallLog, parseNetworkLog };
