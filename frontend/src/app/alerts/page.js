'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Aside from '../../components/Aside';

export default function AlertsPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Apply search filter to alerts
  const filteredAlerts = alerts.filter(alert => 
    !searchTerm || 
    Object.values(alert).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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

  // Custom column renderers
  const alertTypeBodyTemplate = (rowData) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        rowData.alert_type === 'failed_login_attempts' ? 'bg-red-100 text-red-800' :
        rowData.alert_type === 'malware_detected' ? 'bg-orange-100 text-orange-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {rowData.alert_type || 'ไม่ระบุ'}
      </span>
    );
  };

  const messageBodyTemplate = (rowData) => {
    return (
      <div className='break-words' style={{maxWidth: '400px'}}>
        {rowData.message || '-'}
      </div>
    );
  };

  const ipAddressBodyTemplate = (rowData) => {
    return (
      <span className='font-mono'>
        {rowData.ip_address || '-'}
      </span>
    );
  };

  const createdAtBodyTemplate = (rowData) => {
    return rowData.created_at ? new Date(rowData.created_at).toLocaleString('th-TH') : '-';
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
        <div className='p-2 flex justify-between items-center'>
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

        {/* Search Controls */}
        <div className='px-2'>
          <div className='p-4 bg-white border rounded border-gray-200 flex justify-between items-center'>
            <div className='flex items-center space-x-4'>
              <input
                type="text"
                placeholder="ค้นหา alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className='text-sm text-gray-600'>
              รวม {filteredAlerts.length} รายการ
            </div>
          </div>

        </div>

        {/* DataTable Container */}

          <div className='flex-1 overflow-auto bg-white mt-4 mx-2 rounded-lg shadow-sm border border-gray-200'>
            {filteredAlerts.length > 0 ? (
              <div className='p-4'>
                <DataTable 
                  value={filteredAlerts} 
                  paginator 
                  rows={10} 
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  tableStyle={{ minWidth: '50rem' }}
                                  className="p-datatable-sm"
                  sortMode="multiple"
                  removableSort
                  paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                  currentPageReportTemplate="แสดง {first} ถึง {last} จาก {totalRecords} รายการ"
                >
                  <Column 
                    field="alert_type" 
                    header="ประเภท" 
                    sortable 
                    body={alertTypeBodyTemplate}
                    style={{ width: '150px', minWidth: '150px' }}
                  />
                  <Column 
                    field="message" 
                    header="ข้อความ" 
                    sortable 
                    body={messageBodyTemplate}
                    style={{ width: '400px', minWidth: '300px' }}
                  />
                  <Column 
                    field="ip_address" 
                    header="IP Address" 
                    sortable 
                    body={ipAddressBodyTemplate}
                    style={{ width: '150px', minWidth: '150px' }}
                  />
                  <Column 
                    field="created_at" 
                    header="เวลา" 
                    sortable 
                    body={createdAtBodyTemplate}
                    style={{ width: '180px', minWidth: '180px' }}
                  />
                </DataTable>
              </div>
            ) : (
              <div className='p-8 text-center text-gray-500'>
                {alerts.length > 0 ? 'ไม่พบ alerts ที่ตรงกับเงื่อนไขการค้นหา' : 'ไม่มี alerts ในระบบ'}
              </div>
            )}
          </div>


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
