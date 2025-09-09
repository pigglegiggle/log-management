'use client';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../../components/Aside';
import FilterPanel from '../../components/Dashboard/FilterPanel';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [allLogs, setAllLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  // Apply search filter to filtered logs
  const searchFilteredLogs = filteredLogs.filter(log => 
    !searchTerm || 
    Object.values(log).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(searchFilteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentLogs = searchFilteredLogs.slice(startIndex, endIndex);

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
        if (!res.ok || !data.success) return;

        setUsername(data.tokenPayload.username);
        setUserRole(data.tokenPayload.role);

        const logsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logs`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        const logData = await logsRes.json();
        console.log('Fetched logs:', logData);
        if (!logsRes.ok || !logData.success) return;

        // Simple - just set logs array
        const logs = logData.logs || [];
        setAllLogs(logs);
        setFilteredLogs(logs);

      } catch (err) {
        console.error('Error during auth check:', err);
      }
    };

    checkAuth();
  }, [router]);

  const handleFilterChange = (filters) => {
    console.log('Filters applied:', filters);
    
    let filtered = [...allLogs];

    // กรองตามวันที่
    if (filters.startDate) {
      let startDate = new Date(filters.startDate);
      if (startDate.getFullYear() > 2500) {
        startDate.setFullYear(startDate.getFullYear() - 543);
      }
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate;
      });
    }
    
    if (filters.endDate) {
      let endDate = new Date(filters.endDate);
      if (endDate.getFullYear() > 2500) {
        endDate.setFullYear(endDate.getFullYear() - 543);
      }
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate <= endDate;
      });
    }

    // กรองตาม tenant
    if (filters.tenant) {
      filtered = filtered.filter(log => log.tenant_name === filters.tenant);
    }

    // กรองตาม source (รวม log_type สำหรับ network/firewall)
    if (filters.source) {
      filtered = filtered.filter(log => 
        log.source_name === filters.source || log.log_type === filters.source
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page
    setSearchTerm(''); // Reset search when filter changes
  };

  return (
    <>
      <Head>
        <title>Logs Data - Log Management System</title>
        <meta name="description" content="View and search log data with advanced filtering" />
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
              Logs ({searchFilteredLogs.length} รายการ)
            </h1>
          </div>

          {/* Filter Panel */}
          <div className='p-4 bg-gray-50 border-b border-gray-200'>
            <FilterPanel 
              onFilterChange={handleFilterChange} 
            />
          </div>

          {/* Search and Controls */}
          <div className='p-4 bg-white border-b border-gray-200 flex justify-between items-center'>
            <div className='flex items-center space-x-4'>
              <input
                type="text"
                placeholder="ค้นหาข้อมูล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <option value={10}>10 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
              </select>
            </div>
            <div className='text-sm text-gray-600'>
              แสดง {startIndex + 1}-{Math.min(endIndex, searchFilteredLogs.length)} จาก {searchFilteredLogs.length} รายการ
            </div>
          </div>

          {/* Table Container */}
          <div className='flex-1 overflow-auto bg-white m-4 rounded-lg shadow-sm border border-gray-200'>
            {currentLogs.length > 0 ? (
              <div className='p-4'>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm border-collapse'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Time</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Tenant</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Source</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Event Type</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Severity</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Source IP</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>User</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Host</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Cloud Info</th>
                        <th className='px-4 py-3 text-left font-medium text-gray-700 border-b'>Raw</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map((log, idx) => {
                        return (
                          <tr key={log.id || idx} className='hover:bg-gray-50'>
                            <td className='px-4 py-3 text-gray-800 whitespace-nowrap border-b border-gray-100'>
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap border-b border-gray-100'>
                              {log.tenant_name ? (
                                <span className='px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
                                  {log.tenant_name}
                                </span>
                              ) : '-'}
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap border-b border-gray-100'>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                log.log_type === 'firewall' ? 'bg-red-100 text-red-800' :
                                log.log_type === 'network' ? 'bg-blue-100 text-blue-800' :
                                log.source_name === 'aws' ? 'bg-orange-100 text-orange-800' :
                                log.source_name === 'crowdstrike' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {log.source_name || log.log_type || 'unknown'}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-gray-800 border-b border-gray-100'>{log.event_type || '-'}</td>
                            <td className='px-4 py-3 whitespace-nowrap border-b border-gray-100'>
                              {log.severity ? (
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  parseInt(log.severity) >= 8 ? 'bg-red-500 text-white' :
                                  parseInt(log.severity) >= 6 ? 'bg-orange-500 text-white' :
                                  parseInt(log.severity) >= 4 ? 'bg-yellow-500 text-white' :
                                  'bg-gray-400 text-white'
                                }`}>
                                  {log.severity}
                                </span>
                              ) : '-'}
                            </td>
                            <td className='px-4 py-3 text-gray-800 font-mono border-b border-gray-100'>{log.src_ip || '-'}</td>
                            <td className='px-4 py-3 text-gray-800 border-b border-gray-100'>{log.user || '-'}</td>
                            <td className='px-4 py-3 text-gray-800 border-b border-gray-100'>{log.host || '-'}</td>
                            <td className='px-4 py-3 border-b border-gray-100'>
                              {log.cloud ? (
                                <div className='text-xs bg-blue-50 p-2 rounded'>
                                  <div><strong>Service:</strong> {log.cloud.service}</div>
                                  <div><strong>Account:</strong> {log.cloud.account_id}</div>
                                  <div><strong>Region:</strong> {log.cloud.region}</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className='px-4 py-3 border-b border-gray-100' style={{maxWidth: '400px'}}>
                              <div className='text-sm text-gray-700 break-words'>
                                {log.raw_data ? (
                                  <div className='font-mono text-xs bg-gray-50 p-2 rounded max-h-20 overflow-y-auto'>
                                    {typeof log.raw_data === 'string' ? log.raw_data : JSON.stringify(log.raw_data, null, 2)}
                                  </div>
                                ) : log.message ? (
                                  <div className='break-words'>
                                    {typeof log.message === 'string' ? log.message : JSON.stringify(log.message, null, 2)}
                                  </div>
                                ) : '-'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className='p-8 text-center text-gray-500'>
                {allLogs.length > 0 ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการกรอง' : 'ไม่มีข้อมูล logs ในระบบ'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {searchFilteredLogs.length > 0 && (
            <div className='p-4 bg-white border-t border-gray-200 flex justify-between items-center'>
              <div className='text-sm text-gray-600'>
                หน้า {currentPage} จาก {totalPages} (รวม {searchFilteredLogs.length} รายการ)
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
        </div>
      </div>
    </>
  );
}
