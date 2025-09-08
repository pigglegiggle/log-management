const fs = require('fs');
const path = require('path');

// ข้อความ log
const networkLog = '<190>Aug 20 13:01:02 r1 if=ge-0/0/1 event=link-down mac=aa:bb:cc:dd:ee:ff reason=carrier-loss\n';
const firewallLog = '<134>Aug 20 12:44:56 fw01 vendor=demo product=ngfw action=deny src=10.0.1.10 dst=8.8.8.8 spt=5353 dpt=53 proto=udp msg=DNS blocked policy=Block-DNS\n';

// logs folder อยู่ข้างนอก samples
const logsDir = path.join(__dirname, '..', 'logs');

// สร้าง logs folder ถ้ายังไม่มี
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const networkLogPath = path.join(logsDir, 'network.log');
const firewallLogPath = path.join(logsDir, 'firewall.log');

// ฟังก์ชัน append log
async function writeLog(filePath, message) {
  try {
    await fs.promises.appendFile(filePath, message, 'utf8');
    console.log(`Log saved to ${filePath}`);
  } catch (err) {
    console.error('Error writing log:', err);
  }
}

// สร้าง logs
async function main() {
  await writeLog(networkLogPath, networkLog);
  await writeLog(firewallLogPath, firewallLog);
}

// เริ่มเขียน log
main();