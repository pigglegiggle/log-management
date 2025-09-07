'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Aside from '../../../components/Aside';

// Dynamic import DataTable to avoid SSR issues
const DataTable = dynamic(() => import('datatables.net-react'), { ssr: false });

export default function TenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id;
  
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [tenant, setTenant] = useState(null);
  const [logsBySource, setLogsBySource] = useState({});
  const [dtLoaded, setDtLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load DataTables library
  useEffect(() => {
    const loadDataTables = async () => {
      if (typeof window !== 'undefined') {
        try {
          const dt = await import('datatables.net-dt');
          const DataTablesLib = (await import('datatables.net-react')).default;
          DataTablesLib.use(dt.default);
          setDtLoaded(true);
        } catch (error) {
          console.error('Failed to load DataTables:', error);
        }
      }
    };
    loadDataTables();
  }, []);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
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
        if (!res.ok || !data.success) return;

        setUsername(data.tokenPayload.username);
        setUserRole(data.tokenPayload.role);

        // ดึงข้อมูล tenant และ logs
        const tenantRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/${tenantId}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        const tenantData = await tenantRes.json();
        console.log('Fetched tenant data:', tenantData);
        
        if (tenantRes.ok && tenantData.success) {
          setTenant(tenantData.tenant);
          setLogsBySource(tenantData.logsBySource || {});
        }

      } catch (err) {
        console.error('Error during auth check:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      checkAuthAndFetchData();
    }
  }, [router, tenantId]);

  // ฟังก์ชันสำหรับสร้าง columns จากข้อมูล
  const createColumns = (logs) => {
    if (!logs || logs.length === 0) return [];
    
    const allKeys = Array.from(
      new Set(logs.flatMap(log => 
        Object.entries(log)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k]) => k)
      ))
    );

    return allKeys.map(key => ({
      title: key,
      data: key,
      render: function(data, type, row) {
        if (data === null || data === undefined) return '-';
        if (typeof data === 'object') {
          return Object.entries(data)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
        return data;
      }
    }));
  };

  // ฟังก์ชันสำหรับ render DataTable แต่ละ source
  const renderDataTable = (logs, source) => {
    if (!logs || logs.length === 0) return null;

    const columns = createColumns(logs);

    return (
      <div key={source} className='mb-8 bg-white rounded-lg shadow-sm border border-gray-200'>
        <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
          <h3 className='font-semibold text-gray-800'>Source: {source}</h3>
          <p className='text-sm text-gray-600 mt-1'>{logs.length} logs</p>
        </div>
        
        <div className='p-4'>
          {!dtLoaded ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">กำลังโหลด DataTable...</p>
            </div>
          ) : (
            <DataTable 
              data={logs}
              columns={columns}
              options={{
                responsive: true,
                pageLength: 10,
                lengthMenu: [5, 10, 15, 20],
                scrollX: true,
                language: {
                  search: "ค้นหา:",
                  lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
                  info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
                  infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
                  infoFiltered: "(กรองจากทั้งหมด _MAX_ รายการ)",
                  paginate: {
                    first: "หน้าแรก",
                    last: "หน้าสุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                  },
                  emptyTable: "ไม่มีข้อมูล"
                }
              }}
              className="display responsive nowrap"
            />
          )}
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH');
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

  if (!tenant) {
    return (
      <div className='flex h-screen bg-gray-50 items-center justify-center'>
        <div className='text-center'>
          <div className='text-red-400 text-6xl mb-4'>❌</div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>ไม่พบ Tenant</h3>
          <p className='text-gray-500 mb-4'>Tenant ID: {tenantId} ไม่มีในระบบ</p>
          <button 
            onClick={() => router.push('/data')}
            className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700'
          >
            กลับไปหน้า Tenants
          </button>
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
            {/* Breadcrumb */}
            <div className='flex items-center text-sm text-gray-500 mb-6'>
              <button 
                onClick={() => router.push('/data')}
                className='hover:text-blue-600 transition-colors'
              >
                📊 Tenants
              </button>
              <span className='mx-2'>›</span>
              <span className='text-gray-800 font-medium'>{tenant.name}</span>
            </div>

            {/* Tenant Info */}
            <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6'>
              <div className='flex items-start justify-between'>
                <div>
                  <h1 className='text-3xl font-bold text-gray-800 mb-2'>🏢 {tenant.name}</h1>
                  {tenant.description && (
                    <p className='text-gray-600 mb-4'>{tenant.description}</p>
                  )}
                  <div className='flex items-center space-x-6 text-sm text-gray-500'>
                    <span><strong>Tenant ID:</strong> {tenant.id}</span>
                    <span><strong>สร้างเมื่อ:</strong> {formatDate(tenant.created_at)}</span>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                    ✅ Active
                  </div>
                </div>
              </div>
            </div>

            {/* Sources Summary */}
            <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6'>
              <h3 className='text-lg font-semibold text-gray-800 mb-4'>📈 สรุป Sources</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                <div className='text-center p-4 bg-blue-50 rounded-lg'>
                  <div className='text-2xl font-bold text-blue-700'>{Object.keys(logsBySource).length}</div>
                  <div className='text-sm text-blue-600'>Total Sources</div>
                </div>
                <div className='text-center p-4 bg-green-50 rounded-lg'>
                  <div className='text-2xl font-bold text-green-700'>
                    {Object.values(logsBySource).reduce((sum, logs) => sum + logs.length, 0)}
                  </div>
                  <div className='text-sm text-green-600'>Total Logs</div>
                </div>
                <div className='text-center p-4 bg-purple-50 rounded-lg'>
                  <div className='text-2xl font-bold text-purple-700'>
                    {Math.max(...Object.values(logsBySource).map(logs => logs.length), 0)}
                  </div>
                  <div className='text-sm text-purple-600'>Max per Source</div>
                </div>
                <div className='text-center p-4 bg-yellow-50 rounded-lg'>
                  <div className='text-2xl font-bold text-yellow-700'>
                    {Object.values(logsBySource).length > 0 ? 
                      Math.round(Object.values(logsBySource).reduce((sum, logs) => sum + logs.length, 0) / Object.keys(logsBySource).length) 
                      : 0}
                  </div>
                  <div className='text-sm text-yellow-600'>Avg per Source</div>
                </div>
              </div>
            </div>

            {/* Sources และ Logs */}
            {Object.keys(logsBySource).length > 0 ? (
              <div>
                <h2 className='text-2xl font-bold mb-6 text-gray-800'>📁 Logs by Source</h2>
                {Object.entries(logsBySource).map(([source, logs]) => 
                  renderDataTable(logs, source)
                )}
              </div>
            ) : (
              <div className='text-center py-12'>
                <div className='text-gray-400 text-6xl mb-4'>📂</div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>ไม่มี Logs</h3>
                <p className='text-gray-500'>Tenant นี้ยังไม่มีข้อมูล logs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
