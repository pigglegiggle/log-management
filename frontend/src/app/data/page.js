'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../../components/Aside';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [logsByTenant, setLogsByTenant] = useState({});
  const [firewallLogs, setFirewallLogs] = useState([]);
  const [networkLogs, setNetworkLogs] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      const item = localStorage.getItem('token');
      if (!item) {
        router.replace('/auth/login');
        return;
      }

      try {
        const parsed = JSON.parse(item);
        const token = parsed.value;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) return;

        setUsername(data.tokenPayload.username);
        setUserRole(data.tokenPayload.role);

        const logsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/logs`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        const logData = await logsRes.json();
        console.log('Fetched logs:', logData);
        if (!logsRes.ok || !logData.success) return;

        // ตั้งค่าข้อมูลตาม response ใหม่
        setLogsByTenant(logData.logsByTenant || {});
        setFirewallLogs(logData.firewallLogs || []);
        setNetworkLogs(logData.networkLogs || []);

      } catch (err) {
        console.error('Error during auth check:', err);
      }
    };

    checkAuth();
  }, [router]);

  // ฟังก์ชันสำหรับ render table แต่ละ source
  const renderTable = (logs, source, title) => {
    if (!logs || logs.length === 0) return null;

    // หา columns ที่มีข้อมูลจริง
    const columns = Array.from(
      new Set(logs.flatMap(log => 
        Object.entries(log)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k]) => k)
      ))
    );

    return (
      <div key={source} className='mb-8 bg-white rounded-lg shadow-sm border border-gray-200'>
        <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
          <h3 className='font-semibold text-gray-800'>{title || `Source: ${source}`}</h3>
        </div>
        
        {/* แสดง region และ service สำหรับ cloud */}
        {source === 'cloud' && logs.length > 0 && (
          <div className='px-4 py-3 bg-blue-50 border-b border-blue-200'>
            {logs.map((log, idx) => (
              <div key={idx} className='text-sm text-blue-800 font-medium'>
                <span className='inline-block mr-4'>
                  <strong>Region:</strong> {log.region || 'N/A'}
                </span>
                <span className='inline-block'>
                  <strong>Service:</strong> {log.service || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className='overflow-x-auto'>
          <table className='min-w-full border-collapse text-xs'>
            <thead>
              <tr className='bg-gray-100'>
                {columns.map(col => (
                  <th key={col} className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap'>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  {columns.map(col => (
                    <td key={col} className='border-b border-gray-200 px-3 py-2 text-gray-800 whitespace-nowrap' title={typeof log[col] === 'object' && log[col] !== null ? Object.entries(log[col]).map(([key, value]) => `${key}: ${value}`).join(', ') : log[col]}>
                      {(() => {
                        if (log[col] === null || log[col] === undefined) return '-';
                        if (typeof log[col] === 'object') {
                          // แปลง object เป็นข้อความธรรมดา
                          return Object.entries(log[col])
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ');
                        }
                        return log[col];
                      })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Aside Navigation - Fixed */}
      <div className='flex-shrink-0'>
        <Aside username={username} />
      </div>
      
      {/* Main Content - Scrollable */}
      <div className='flex-1 overflow-y-auto'>
        <div className='p-6'>
          <div className='max-w-full'>

            {/* แสดง Tenant Logs */}
            {Object.entries(logsByTenant).map(([tenant, sources]) => (
              <div key={tenant} className='mt-8'>
                <h2 className='text-xl font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2'>
                  Tenant: {tenant}
                </h2>

                {Object.entries(sources).map(([source, logs]) => 
                  renderTable(logs, source)
                )}
              </div>
            ))}

            {/* แสดง Firewall Logs (เฉพาะ Admin) */}
            {userRole === 'admin' && firewallLogs.length > 0 && (
              <div className='mt-8'>
                <h2 className='text-xl font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2'>
                  Firewall Logs
                </h2>
                {renderTable(firewallLogs, 'firewall', 'Firewall Logs')}
              </div>
            )}

            {/* แสดง Network Logs (เฉพาะ Admin) */}
            {userRole === 'admin' && networkLogs.length > 0 && (
              <div className='mt-8'>
                <h2 className='text-xl font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2'>
                  Network Logs
                </h2>
                {renderTable(networkLogs, 'network', 'Network Logs')}
              </div>
            )}

            {/* แสดงข้อความเมื่อไม่มีข้อมูล */}
            {Object.keys(logsByTenant).length === 0 && 
             firewallLogs.length === 0 && 
             networkLogs.length === 0 && 
             username && (
              <div className='mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center'>
                <p className='text-yellow-800 font-medium'>ไม่มีข้อมูล logs ในระบบ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}