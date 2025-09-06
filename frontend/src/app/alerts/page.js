'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../../components/Aside';

export default function AlertsPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        if (!res.ok || !data.success) {
          localStorage.removeItem('token');
          router.replace('/auth/login');
          return;
        }

        setUsername(data.tokenPayload.username);

        // โหลด alerts
        await loadAlerts(token);
        setLoading(false);

      } catch (err) {
        console.error('Error during auth check:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadAlerts = async (token) => {
    try {
      const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/alerts`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const alertData = await alertsRes.json();
      if (alertsRes.ok && alertData.success) {
        setAlerts(alertData.data || []);
      }
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  if (loading) {
    return (
      <div className='flex h-screen bg-gray-50 items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

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
            {/* Header */}
            <div className='mb-6'>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>ระบบแจ้งเตือน</h1>
            </div>


            {/* Alerts List */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
              <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
                <h3 className='font-semibold text-gray-800'>แจ้งเตือนล่าสุด</h3>
              </div>
              
              {alerts.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='min-w-full'>
                    <thead className='bg-gray-100'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          ประเภท
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          ข้อความ
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          IP Address
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          เวลา
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {alerts.map((alert, idx) => (
                        <tr key={alert.id || idx} className='hover:bg-gray-50'>
                          <td className='px-4 py-4 whitespace-nowrap'>
                            <span className='text-sm font-medium text-gray-900'>
                              {alert.alert_type || 'ไม่ระบุ'}
                            </span>
                          </td>
                          <td className='px-4 py-4'>
                            <div className='text-sm text-gray-900'>
                              {alert.message}
                            </div>
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {alert.ip_address || '-'}
                          </td>
                          <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {alert.created_at ? new Date(alert.created_at).toLocaleString('th-TH') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <p className='text-lg font-medium text-gray-700'>ไม่มี Alert ในขณะนี้</p>
                  <p className='text-sm text-gray-500 mt-2'>ระบบกำลังตรวจสอบความปลอดภัยอย่างต่อเนื่อง</p>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className='mt-6 flex justify-end'>
              <button 
                onClick={() => window.location.reload()}
                className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                รีเฟรช
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
