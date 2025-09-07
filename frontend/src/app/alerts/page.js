'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../../components/Aside';

export default function AlertsPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination logic
  const filteredAlerts = alerts.filter(alert => 
    !searchTerm || 
    Object.values(alert).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const totalPages = Math.ceil(filteredAlerts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentAlerts = filteredAlerts.slice(startIndex, endIndex);

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

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/`, {
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

        // ตั้ง auto-refresh ทุก 10 วินาที
        const refreshInterval = setInterval(() => {
          loadAlerts(token, true); // isRefresh = true
        }, 10000);

        // Cleanup interval เมื่อ component unmount
        return () => clearInterval(refreshInterval);

      } catch (err) {
        console.error('Error during auth check:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadAlerts = async (token, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts`, {
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
    } finally {
      if (isRefresh) setRefreshing(false);
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
    <>
      <Head>
        <title>Security Alerts - Log Management System</title>
        <meta name="description" content="Security alerts and monitoring notifications" />
      </Head>
      <div className='flex h-screen bg-gray-50'>
        {/* Aside Navigation */}
        <div className='flex-shrink-0'>
          <Aside username={username} />
        </div>
      
      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <div className='p-4 bg-white border-b border-gray-200'>
          <h1 className='text-2xl font-bold text-gray-800'>
            ระบบแจ้งเตือน ({filteredAlerts.length} รายการ)
          </h1>
        </div>

        {/* Header with Auto-refresh Status */}
        <div className='p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center'>
          <div>
            {refreshing && (
              <div className="flex items-center text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                กำลังอัปเดตข้อมูล...
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            อัปเดตอัตโนมัติทุก 10 วินาที
          </div>
        </div>

        {/* Search and Controls */}
        <div className='p-4 bg-white border-b border-gray-200 flex justify-between items-center'>
          <div className='flex items-center space-x-4'>
            <input
              type="text"
              placeholder="ค้นหา alerts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 รายการ</option>
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
            </select>
          </div>
          <div className='text-sm text-gray-600'>
            แสดง {startIndex + 1}-{Math.min(endIndex, filteredAlerts.length)} จาก {filteredAlerts.length} รายการ
          </div>
        </div>

        {/* Table Container */}
        <div className='flex-1 overflow-auto bg-white m-4 rounded-lg shadow-sm border border-gray-200'>
          {currentAlerts.length > 0 ? (
            <div className='p-4'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm border-collapse'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>ประเภท</th>
                      <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>ข้อความ</th>
                      <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>IP Address</th>
                      <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAlerts.map((alert, idx) => (
                      <tr key={alert.id || idx} className='hover:bg-gray-50'>
                        <td className='px-4 py-3 whitespace-nowrap border-b border-gray-100'>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            alert.alert_type === 'failed_login_attempts' ? 'bg-red-100 text-red-800' :
                            alert.alert_type === 'malware_detected' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alert.alert_type || 'ไม่ระบุ'}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-gray-800 border-b border-gray-100' style={{maxWidth: '400px'}}>
                          <div className='break-words'>
                            {alert.message || '-'}
                          </div>
                        </td>
                        <td className='px-4 py-3 text-gray-800 font-mono border-b border-gray-100 whitespace-nowrap'>
                          {alert.ip_address || '-'}
                        </td>
                        <td className='px-4 py-3 text-gray-800 whitespace-nowrap border-b border-gray-100'>
                          {alert.created_at ? new Date(alert.created_at).toLocaleString('th-TH') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='p-8 text-center text-gray-500'>
              {alerts.length > 0 ? 'ไม่พบ alerts ที่ตรงกับเงื่อนไขการค้นหา' : 'ไม่มี alerts ในระบบ'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredAlerts.length > 0 && (
          <div className='p-4 bg-white border-t border-gray-200 flex justify-between items-center'>
            <div className='text-sm text-gray-600'>
              หน้า {currentPage} จาก {totalPages} (รวม {filteredAlerts.length} รายการ)
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className='px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50'
              >
                แรก
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className='px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50'
              >
                ก่อนหน้า
              </button>
              <span className='px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded'>
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className='px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50'
              >
                ถัดไป
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className='px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50'
              >
                สุดท้าย
              </button>
            </div>
          </div>
        )}

        {/* Manual Refresh Button */}
        <div className='p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center'>
          <div className="text-sm text-gray-500">
            รายการล่าสุด: {alerts.length} รายการ
          </div>
          <button 
            onClick={async () => {
              const token = JSON.parse(localStorage.getItem('token')).value;
              await loadAlerts(token, true);
            }}
            disabled={refreshing}
            className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังอัปเดต...
              </>
            ) : (
              'รีเฟรชตอนนี้'
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
