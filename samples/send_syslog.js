const dgram = require("dgram");

// Logs
const networkLog = '<190>Aug 20 13:01:02 r1 if=ge-0/0/1 event=link-down mac=aa:bb:cc:dd:ee:ff reason=carrier-loss\n';
const firewallLog = '<134>Aug 20 12:44:56 fw01 vendor=demo product=ngfw action=deny src=10.0.1.10 dst=8.8.8.8 spt=5353 dpt=53 proto=udp msg=DNS blocked policy=Block-DNS\n';

// Host ของ Fluent Bit
const HOST = "127.0.0.1";

// Ports ตาม Fluent Bit config
const FIREWALL_UDP_PORT = 514;
const NETWORK_UDP_PORT = 515;

// ฟังก์ชันส่ง UDP พร้อมเลือก port
function sendUDP(message, port) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    client.send(Buffer.from(message), port, HOST, (err) => {
      client.close();
      if (err) return reject(err);
      console.log(`Sent via UDP port ${port}:`, message.trim());
      resolve();
    });
  });
}

// Main
async function main() {
  try {
    console.log("=== Sending UDP logs ===");

    // ส่ง network log ไป port 515
    await sendUDP(networkLog, NETWORK_UDP_PORT);

    // ส่ง firewall log ไป port 514
    await sendUDP(firewallLog, FIREWALL_UDP_PORT);

    console.log("All UDP logs sent");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
