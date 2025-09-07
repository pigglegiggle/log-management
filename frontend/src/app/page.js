'use client';

import Head from 'next/head';
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
        if (!logsRes.ok || !logData.success) {
          setLoading(false);
          return;
        }

        // Simple - ใช้ logs array ตรงๆ
        const logs = logData.logs || [];
        setAllLogs(logs);
        setFilteredLogs(logs);
        setRecentLogs(logs.slice(0, 10));
        buildDashboardData(logs);
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
    
    // นับ tenants ที่ไม่ซ้ำ (จาก tenant_id)
    const uniqueTenants = new Set(logs.map(log => log.tenant_id).filter(Boolean));
    const totalTenants = uniqueTenants.size;
    
    // นับ sources ที่ไม่ซ้ำ (จาก source_id)
    const uniqueSources = new Set(logs.map(log => log.source_id).filter(Boolean));
    const totalSources = uniqueSources.size;

    // Tenant Distribution - จัดกลุ่มตาม tenant names จริงๆ
    const tenantDistribution = {};
    // Source Distribution - เฉพาะ network/firewall logs
    const sourceDistribution = {};
    
    logs.forEach(log => {
      // สำหรับ tenant distribution - ใช้ tenant names จริง
      if (log.log_type === 'tenant' && log.tenant_name) {
        tenantDistribution[log.tenant_name] = (tenantDistribution[log.tenant_name] || 0) + 1;
      }
      
      // สำหรับ source distribution - เฉพาะ network/firewall
      if (log.log_type === 'network' || log.log_type === 'firewall') {
        const sourceKey = log.log_type;
        sourceDistribution[sourceKey] = (sourceDistribution[sourceKey] || 0) + 1;
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

    // กรองตาม log_type
    if (filters.log_type) {
      filtered = filtered.filter(log => log.log_type === filters.log_type);
    }

    // กรองตาม event_type
    if (filters.event_type) {
      filtered = filtered.filter(log => log.event_type === filters.event_type);
    }

    // กรองตาม IP
    if (filters.ip_address) {
      filtered = filtered.filter(log => 
        log.src_ip?.includes(filters.ip_address) || 
        log.dst_ip?.includes(filters.ip_address) ||
        log.ip_address?.includes(filters.ip_address)
      );
    }

    // กรองตาม User
    if (filters.user) {
      filtered = filtered.filter(log => 
        log.user?.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    // กรองตาม Severity
    if (filters.severity) {
      filtered = filtered.filter(log => log.severity == filters.severity);
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
    <>
      <Head>
        <title>Dashboard - Log Management System</title>
        <meta name="description" content="Log management dashboard with analytics and monitoring" />
      </Head>
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
                <h3 className="font-semibold text-gray-800 mb-4">Top IP Addresses</h3>
                <TopIPChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Top Users</h3>
                <TopUserChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Event Types</h3>
                <TopEventTypeChart logs={filteredLogs} />
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Timeline (24 Hours)</h3>
                <TimelineChart logs={filteredLogs} />
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
    </>
  );
}