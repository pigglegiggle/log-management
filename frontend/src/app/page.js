'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../components/Aside';
import FilterPanel from '../components/Dashboard/FilterPanel';
import { TopIPChart, TopUserChart, TopEventTypeChart, TimelineChart } from '../components/Dashboard/Charts';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [allLogs, setAllLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalLogs: 0,
    totalTenants: 0,
    totalSources: 0,
    tenantDistribution: {},
    sourceDistribution: {}
  });
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
        if (!logsRes.ok || !logData.success) {
          setLoading(false);
          return;
        }

        // แปลงข้อมูลให้เป็น array เดียว
        let combinedLogs = [];
        
        // รวม tenant logs
        if (logData.logsByTenant) {
          Object.values(logData.logsByTenant).forEach(tenantSources => {
            Object.values(tenantSources).forEach(sourceLogs => {
              combinedLogs = combinedLogs.concat(sourceLogs);
            });
          });
        }
        
        // รวม firewall logs
        if (logData.firewallLogs) {
          combinedLogs = combinedLogs.concat(logData.firewallLogs);
        }
        
        // รวม network logs
        if (logData.networkLogs) {
          combinedLogs = combinedLogs.concat(logData.networkLogs);
        }

        setAllLogs(combinedLogs);
        setFilteredLogs(combinedLogs);
        setRecentLogs(combinedLogs.slice(0, 10));
        buildDashboardData(combinedLogs);
        setLoading(false);

      } catch (err) {
        console.error('Error during auth check:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const buildDashboardData = (logs) => {
    if (!logs || logs.length === 0) {
      setDashboardData({
        totalLogs: 0,
        totalTenants: 0,
        totalSources: 0,
        tenantDistribution: {},
        sourceDistribution: {}
      });
      return;
    }

    // คำนวณสถิติ
    const stats = calculateStats(logs);
    setDashboardData(stats);
  };

  const calculateStats = (logs) => {
    // สถิติพื้นฐาน
    const totalLogs = logs.length;
    
    // นับ tenants ที่ไม่ซ้ำ (ไม่นับ null สำหรับ network/firewall)
    const uniqueTenants = new Set(logs.map(log => log.tenant).filter(Boolean));
    const totalTenants = uniqueTenants.size;
    
    // นับ sources ที่ไม่ซ้ำ
    const uniqueSources = new Set(logs.map(log => log.source).filter(Boolean));
    const totalSources = uniqueSources.size;

    // Tenant distribution (รวม network/firewall เป็น source distribution)
    const tenantDistribution = {};
    const sourceDistribution = {};
    
    logs.forEach(log => {
      if (log.tenant) {
        // มี tenant
        tenantDistribution[log.tenant] = (tenantDistribution[log.tenant] || 0) + 1;
      } else if (log.source === 'network' || log.source === 'firewall') {
        // network/firewall logs (ไม่มี tenant)
        sourceDistribution[log.source] = (sourceDistribution[log.source] || 0) + 1;
      }
    });

    return {
      totalLogs,
      totalTenants,
      totalSources,
      tenantDistribution,
      sourceDistribution
    };
  };

  const handleFilterChange = (filters) => {
    console.log('Filters applied:', filters);
    
    let filtered = [...allLogs];

    // กรองตามวันที่
    if (filters.startDate) {
      let startDate = new Date(filters.startDate);
      // ถ้าปีเป็น พ.ศ. (> 2500) ให้แปลงเป็น ค.ศ.
      if (startDate.getFullYear() > 2500) {
        startDate.setFullYear(startDate.getFullYear() - 543);
      }
      console.log('Start Date:', startDate, 'Original:', filters.startDate);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        console.log('Comparing:', logDate, '>=', startDate, '=', logDate >= startDate);
        return logDate >= startDate;
      });
    }
    
    if (filters.endDate) {
      let endDate = new Date(filters.endDate);
      // ถ้าปีเป็น พ.ศ. (> 2500) ให้แปลงเป็น ค.ศ.
      if (endDate.getFullYear() > 2500) {
        endDate.setFullYear(endDate.getFullYear() - 543);
      }
      endDate.setHours(23, 59, 59, 999); // สิ้นสุดวัน
      console.log('End Date:', endDate, 'Original:', filters.endDate);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate <= endDate;
      });
    }

    // กรองตาม tenant
    if (filters.tenant) {
      filtered = filtered.filter(log => log.tenant === filters.tenant);
    }

    // กรองตาม source
    if (filters.source) {
      filtered = filtered.filter(log => log.source === filters.source);
    }

    // กรองตาม event type
    if (filters.eventType) {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }

    setFilteredLogs(filtered);
    setRecentLogs(filtered.slice(0, 10));
    buildDashboardData(filtered);
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
            {/* Filter Panel */}
            <FilterPanel 
              onFilterChange={handleFilterChange} 
              tenants={Object.keys(dashboardData.tenantDistribution)}
            />

            {/* Stats Cards */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <h3 className='text-sm font-medium text-gray-500'>จำนวน Logs</h3>
                <p className='text-2xl font-bold text-gray-900'>{dashboardData.totalLogs.toLocaleString()}</p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <h3 className='text-sm font-medium text-gray-500'>Tenants</h3>
                <p className='text-2xl font-bold text-gray-900'>{dashboardData.totalTenants}</p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <h3 className='text-sm font-medium text-gray-500'>Sources</h3>
                <p className='text-2xl font-bold text-gray-900'>{dashboardData.totalSources}</p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <h3 className='text-sm font-medium text-gray-500'>Filtered Logs</h3>
                <p className='text-2xl font-bold text-gray-900'>{filteredLogs.length}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">📊 Top IP Addresses</h3>
                <TopIPChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">👤 Top Users</h3>
                <TopUserChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">🎯 Event Types</h3>
                <TopEventTypeChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">⏰ Timeline (24 Hours)</h3>
                <TimelineChart logs={filteredLogs} />
              </div>
            </div>

            {/* Recent Logs */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 mb-8'>
              <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
                <h3 className='font-semibold text-gray-800'>📝 Logs ล่าสุด (10 รายการ)</h3>
              </div>
              
              {recentLogs.length > 0 ? (
                <div className='overflow-x-auto overflow-y-auto'>
                  <table className='min-w-full border-collapse text-xs' style={{minWidth: '2600px'}}>
                    <thead>
                      <tr className='bg-gray-100'>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '40px'}}>id</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '160px'}}>timestamp</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>tenant</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>source</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>vendor</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>product</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '140px'}}>event_type</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>event_subtype</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '80px'}}>severity</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>action</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>src_ip</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '80px'}}>src_port</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>dst_ip</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '80px'}}>dst_port</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '80px'}}>protocol</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>user</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>host</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>process</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '150px'}}>url</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>http_method</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>status_code</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '120px'}}>rule_name</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '80px'}}>rule_id</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>cloud</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '100px'}}>_tags</th>
                        <th className='border-b border-gray-300 px-3 py-2 text-left font-semibold text-gray-700' style={{minWidth: '400px'}}>raw</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log, idx) => (
                        <tr key={log.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '40px'}}>
                            {log.id || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '160px'}}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.tenant || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.source || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.vendor || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.product || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '140px'}}>
                            {log.event_type || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.event_subtype || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '80px'}}>
                            {log.severity || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.action || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.src_ip || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '80px'}}>
                            {log.src_port || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.dst_ip || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '80px'}}>
                            {log.dst_port || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '80px'}}>
                            {log.protocol || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.user || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.host || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.process || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '150px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={log.url}>
                            {log.url || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.http_method || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {log.status_code || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '120px'}}>
                            {log.rule_name || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '80px'}}>
                            {log.rule_id || '-'}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {typeof log.cloud === 'object' && log.cloud ? JSON.stringify(log.cloud) : (log.cloud || '-')}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '100px'}}>
                            {Array.isArray(log._tags) ? log._tags.join(', ') : (typeof log._tags === 'object' && log._tags ? JSON.stringify(log._tags) : (log._tags || '-'))}
                          </td>
                          <td className='border-b border-gray-200 px-3 py-2 text-gray-800' style={{minWidth: '400px', wordWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '10px'}} title={typeof log.raw === 'object' ? JSON.stringify(log.raw, null, 2) : log.raw}>
                            {typeof log.raw === 'string' ? log.raw : (typeof log.raw === 'object' ? JSON.stringify(log.raw, null, 2) : log.raw || '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  ไม่มีข้อมูล logs
                </div>
              )}
            </div>

            {/* Tenant & Source Summary */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
              <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
                <h3 className='font-semibold text-gray-800'>📈 สรุปข้อมูลตาม Tenant และ Source</h3>
              </div>
              
              <div className='p-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Tenant Distribution */}
                  <div>
                    <h4 className='font-medium text-gray-800 mb-3'>Tenant Logs</h4>
                    <div className='grid grid-cols-1 gap-3'>
                      {Object.entries(dashboardData.tenantDistribution).map(([tenant, count]) => (
                        <div key={tenant} className='p-3 bg-gray-50 rounded-lg'>
                          <h5 className='font-medium text-gray-800 mb-1'>{tenant}</h5>
                          <p className='text-xl font-bold text-gray-700'>{count}</p>
                          <p className='text-sm text-gray-600'>logs</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Source Distribution */}
                  <div>
                    <h4 className='font-medium text-gray-800 mb-3'>Network/Firewall Logs</h4>
                    <div className='grid grid-cols-1 gap-3'>
                      {Object.entries(dashboardData.sourceDistribution).map(([source, count]) => (
                        <div key={source} className='p-3 bg-gray-50 rounded-lg'>
                          <h5 className='font-medium text-gray-800 mb-1'>{source}</h5>
                          <p className='text-xl font-bold text-gray-700'>{count}</p>
                          <p className='text-sm text-gray-600'>logs</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* แสดงข้อความเมื่อไม่มีข้อมูล */}
            {allLogs.length === 0 && username && (
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
