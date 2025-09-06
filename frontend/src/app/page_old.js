'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../components/Aside';
import StatsCard from '../components/Dashboard/StatsCard';
import FilterPanel from '../components/Dashboard/FilterPanel';
import { TimelineChart, TopItemsChart } from '../components/Dashboard/Charts';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [allLogs, setAllLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalLogs: 0,
    totalTenants: 0,
    totalSources: 0,
    topIPs: { labels: [], values: [] },
    topUsers: { labels: [], values: [] },
    topEventTypes: { labels: [], values: [] },
    timeline: { labels: [], values: [] },
    tenantDistribution: {},
    severityDistribution: { labels: [], values: [] }
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
        if (!res.ok || !data.success) return;

        setUsername(data.tokenPayload.username);
        setUserRole(data.tokenPayload.role);

        const logsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/all-logs?limit=1000`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        const logData = await logsRes.json();
        console.log('Fetched logs:', logData);
        if (!logsRes.ok || !logData.success) return;

        const logs = logData.logs || [];
        setAllLogs(logs);
        setRecentLogs(logs.slice(0, 10)); // 10 logs ล่าสุด

        // สร้างข้อมูลสำหรับ dashboard
        buildDashboardData(logs);

      } catch (err) {
        console.error('Error during auth check:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchAllLogsAndBuildDashboard = async (token) => {
    try {
      const logsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/all-logs?limit=1000`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const logData = await logsRes.json();
      if (!logsRes.ok || !logData.success) return;

      const logs = logData.logs || [];
      setAllLogs(logs);
      setRecentLogs(logs.slice(0, 10)); // 10 logs ล่าสุด

      // สร้างข้อมูลสำหรับ dashboard
      buildDashboardData(logs);

    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const buildDashboardData = (logs) => {
    if (!logs || logs.length === 0) {
      setDashboardData({
        totalLogs: 0,
        totalTenants: 0,
        totalSources: 0,
        topIPs: { labels: [], values: [] },
        topUsers: { labels: [], values: [] },
        topEventTypes: { labels: [], values: [] },
        timeline: { labels: [], values: [] },
        tenantDistribution: {},
        severityDistribution: { labels: [], values: [] }
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
    
    // นับ tenants ที่ไม่ซ้ำ
    const uniqueTenants = new Set(logs.map(log => log.tenant).filter(Boolean));
    const totalTenants = uniqueTenants.size;
    
    // นับ sources ที่ไม่ซ้ำ
    const uniqueSources = new Set(logs.map(log => log.source).filter(Boolean));
    const totalSources = uniqueSources.size;

    // สร้างข้อมูลสำหรับ charts
    const topIPs = getTopItems(logs, ['src_ip', 'dst_ip'], 10);
    const topUsers = getTopItems(logs, ['user'], 10);
    const topEventTypes = getTopItems(logs, ['event_type'], 10);
    const severityDistribution = getTopItems(logs, ['severity'], 10);
    
    // Timeline จาก timestamp จริง
    const timeline = generateTimelineFromTimestamp(logs);

    // Tenant distribution
    const tenantDistribution = {};
    logs.forEach(log => {
      const tenant = log.tenant || 'unknown';
      tenantDistribution[tenant] = (tenantDistribution[tenant] || 0) + 1;
    });

    return {
      totalLogs,
      totalTenants,
      totalSources,
      topIPs,
      topUsers,
      topEventTypes,
      timeline,
      tenantDistribution,
      severityDistribution
    };
  };

  const getTopItems = (logs, fields, limit = 10) => {
    const counts = {};
    
    logs.forEach(log => {
      fields.forEach(field => {
        if (log[field] && log[field] !== null) {
          const value = String(log[field]);
          counts[value] = (counts[value] || 0) + 1;
        }
      });
    });

    const sorted = Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);

    return {
      labels: sorted.map(([key]) => key),
      values: sorted.map(([,value]) => value)
    };
  };

  const generateTimelineFromTimestamp = (logs) => {
    // จัดกลุ่มตาม hour
    const hourCounts = {};
    
    logs.forEach(log => {
      if (log.timestamp) {
        const date = new Date(log.timestamp);
        const hour = date.getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;
        hourCounts[key] = (hourCounts[key] || 0) + 1;
      }
    });

    // สร้าง 24 ชั่วโมง
    const hours = [];
    const counts = [];
    
    for (let i = 0; i < 24; i++) {
      const key = `${i.toString().padStart(2, '0')}:00`;
      hours.push(key);
      counts.push(hourCounts[key] || 0);
    }

    return {
      labels: hours,
      values: counts
    };
  };

  const handleFilterChange = (filters) => {
    console.log('Filters applied:', filters);
    // TODO: ใช้ filters ในการกรองข้อมูลและอัปเดต dashboard
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('th-TH');
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
            <h1 className='text-3xl font-bold mb-6 text-gray-800'>📊 แดชบอร์ด</h1>
            
            {username && (
              <div className='mb-6 p-3 bg-green-50 border-l-4 border-green-400'>
                <div className='font-medium text-green-800'>
                  ยินดีต้อนรับ {username} ({userRole})
                </div>
              </div>
            )}

            {/* Filter Panel */}
            <FilterPanel onFilterChange={handleFilterChange} userRole={userRole} />

            {/* Stats Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
              <StatsCard
                title="Total Logs"
                value={dashboardData.totalLogs.toLocaleString()}
                icon="📝"
                color="blue"
              />
              <StatsCard
                title="Tenants"
                value={dashboardData.totalTenants}
                icon="🏢"
                color="green"
              />
              <StatsCard
                title="Sources"
                value={dashboardData.totalSources}
                icon="🔗"
                color="purple"
              />
              <StatsCard
                title="Recent Activity"
                value={recentLogs.length > 0 ? "Active" : "No Data"}
                icon="🟢"
                color="yellow"
              />
            </div>

            {/* Charts Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
              {/* Timeline Chart */}
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <TimelineChart 
                  data={dashboardData.timeline} 
                  title="Log Activity by Hour" 
                />
              </div>

              {/* Top Event Types Chart */}
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <TopItemsChart 
                  data={dashboardData.topEventTypes} 
                  title="Top Event Types" 
                  type="bar"
                />
              </div>

              {/* Top IPs Chart */}
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <TopItemsChart 
                  data={dashboardData.topIPs} 
                  title="Top IP Addresses" 
                  type="doughnut"
                />
              </div>

              {/* Severity Distribution Chart */}
              <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                <TopItemsChart 
                  data={dashboardData.severityDistribution} 
                  title="Severity Distribution" 
                  type="bar"
                />
              </div>
            </div>

            {/* Recent Logs */}
            <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8'>
              <h3 className='font-semibold text-gray-800 mb-4'>� Logs ล่าสุด (10 รายการ)</h3>
              
              {recentLogs.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='min-w-full text-sm'>
                    <thead>
                      <tr className='bg-gray-50'>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Timestamp</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Tenant</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Source</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Event Type</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Severity</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Host</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>User</th>
                        <th className='px-3 py-2 text-left font-medium text-gray-700'>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log, idx) => (
                        <tr key={log.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className='px-3 py-2 text-gray-800'>
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className='px-3 py-2'>
                            <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs'>
                              {log.tenant || '-'}
                            </span>
                          </td>
                          <td className='px-3 py-2'>
                            <span className='px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs'>
                              {log.source || '-'}
                            </span>
                          </td>
                          <td className='px-3 py-2 text-gray-800'>
                            {log.event_type || '-'}
                          </td>
                          <td className='px-3 py-2'>
                            <span className={getSeverityColor(log.severity)}>
                              {log.severity || '-'}
                            </span>
                          </td>
                          <td className='px-3 py-2 text-gray-800'>
                            {log.host || '-'}
                          </td>
                          <td className='px-3 py-2 text-gray-800'>
                            {log.user || '-'}
                          </td>
                          <td className='px-3 py-2'>
                            {log.action && (
                              <span className='px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs'>
                                {log.action}
                              </span>
                            )}
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

            {/* Tenant Summary */}
            <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
              <h3 className='font-semibold text-gray-800 mb-4'>📈 สรุปข้อมูลตาม Tenant</h3>
              
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {Object.entries(dashboardData.tenantDistribution).map(([tenant, count]) => (
                  <div key={tenant} className='p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg'>
                    <h4 className='font-medium text-blue-800 mb-2'>{tenant}</h4>
                    <p className='text-2xl font-bold text-blue-700'>{count}</p>
                    <p className='text-sm text-blue-600'>total logs</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className='mt-6 flex flex-wrap gap-3'>
              <button 
                onClick={() => router.push('/data')}
                className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                📊 ดูข้อมูลทั้งหมด
              </button>
              <button 
                onClick={() => window.location.reload()}
                className='px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
              >
                🔄 รีเฟรช
              </button>
              <button 
                onClick={() => fetchAllLogsAndBuildDashboard(JSON.parse(localStorage.getItem('token')).value)}
                className='px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
              >
                📡 อัปเดตข้อมูล
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
