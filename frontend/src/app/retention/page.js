'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aside from '../../components/Aside';

export default function RetentionPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [retentionPolicy, setRetentionPolicy] = useState(null);

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

        // เฉพาะ admin เท่านั้น
        if (data.tokenPayload.role !== 'admin') {
          router.replace('/');
          return;
        }

        // โหลดข้อมูล retention stats
        await loadRetentionStats(token);
        setLoading(false);

      } catch (err) {
        console.error('Error during auth check:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadRetentionStats = async (token) => {
    try {
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/retention/stats`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.success) {
        setStats(statsData.stats);
        setRetentionPolicy(statsData.retentionPolicy);
      }
    } catch (err) {
      console.error('Error loading retention stats:', err);
    }
  };

  const handleManualCleanup = async () => {
    try {
      setCleanupLoading(true);
      const token = JSON.parse(localStorage.getItem('token')).value;
      
      const cleanupRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/retention/cleanup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const cleanupData = await cleanupRes.json();
      if (cleanupRes.ok && cleanupData.success) {
        alert('Manual cleanup completed successfully!');
        // Reload stats
        await loadRetentionStats(token);
      } else {
        alert('Cleanup failed: ' + cleanupData.message);
      }
    } catch (err) {
      console.error('Error during manual cleanup:', err);
      alert('Error during cleanup');
    } finally {
      setCleanupLoading(false);
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
        <title>Data Retention - Log Management System</title>
        <meta name="description" content="Data retention policies and storage management" />
      </Head>
      <div className='flex h-screen bg-gray-50'>
        {/* Aside Navigation - Hidden on mobile, shows as drawer */}
        <div className='hidden lg:flex lg:flex-shrink-0'>
          <Aside username={username} />
        </div>
        
        {/* Mobile Aside - Always rendered for drawer functionality */}
        <div className='lg:hidden'>
          <Aside username={username} />
        </div>
        
        {/* Main Content */}
        <div className='flex-1 overflow-y-auto'>
          <div className='p-6 lg:p-6 pt-20 lg:pt-6'>
          <div>
            {/* Header */}
            <div className='mb-6'>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>
                จัดการ Data Retention
              </h1>
            </div>

            {/* Retention Policy Card */}
            {retentionPolicy && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
                <h3 className='font-semibold text-blue-900 mb-2'>นโยบายการเก็บข้อมูล</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='font-medium text-blue-800'>Logs Retention:</span>
                    <span className='ml-2 text-blue-700'>{retentionPolicy.logRetentionDays} วัน</span>
                  </div>
                  <div>
                    <span className='font-medium text-blue-800'>Alerts Retention:</span>
                    <span className='ml-2 text-blue-700'>{retentionPolicy.alertRetentionDays} วัน</span>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-500'>Total Logs</h3>
                  <p className='text-2xl font-bold text-gray-900'>{stats.totalLogs.toLocaleString()}</p>
                </div>
                <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-500'>Recent Logs</h3>
                  <p className='text-2xl font-bold text-green-600'>{stats.recentLogs.toLocaleString()}</p>
                  <p className='text-xs text-gray-500'>({stats.retentionDays} วันล่าสุด)</p>
                </div>
                <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-500'>Old Logs</h3>
                  <p className='text-2xl font-bold text-red-600'>{stats.oldLogs.toLocaleString()}</p>
                  <p className='text-xs text-gray-500'>พร้อมลบ</p>
                </div>
                <div className='bg-white p-4 rounded-lg shadow-sm border border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-500'>Total Alerts</h3>
                  <p className='text-2xl font-bold text-gray-900'>{stats.totalAlerts.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Database Size Table */}
            {stats && stats.tablesSizeMB && (
              <div className='bg-white rounded-lg shadow-sm border border-gray-200 mb-6'>
                <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
                  <h3 className='font-semibold text-gray-800'>ขนาดฐานข้อมูล</h3>
                </div>
                <div className='p-4'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr className='border-b'>
                          <th className='text-left py-2 font-medium text-gray-700'>Table</th>
                          <th className='text-right py-2 font-medium text-gray-700'>Size (MB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.tablesSizeMB.map((table, idx) => (
                          <tr key={idx} className='border-b border-gray-100'>
                            <td className='py-2 text-gray-800'>{table.tableName}</td>
                            <td className='py-2 text-right font-mono text-gray-800'>{table.sizeMB}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Cleanup Section */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
              <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg'>
                <h3 className='font-semibold text-gray-800'>Manual Cleanup</h3>
              </div>
              <div className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-gray-800 font-medium'>ทำความสะอาดข้อมูลเก่าทันที</p>
                    <p className='text-sm text-gray-600 mt-1'>
                      ลบ logs ที่เก่ากว่า {retentionPolicy?.logRetentionDays} วัน และ alerts ที่เก่ากว่า {retentionPolicy?.alertRetentionDays} วัน
                    </p>
                  </div>
                  <button
                    onClick={handleManualCleanup}
                    disabled={cleanupLoading}
                    className='px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
                  >
                    {cleanupLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        กำลังทำความสะอาด...
                      </>
                    ) : (
                      <>
                        เรียกใช้การล้างข้อมูลตอนนี้
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className='mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
              <h4 className='font-medium text-yellow-800 mb-2'>ℹ️ ข้อมูลเพิ่มเติม</h4>
              <ul className='text-sm text-yellow-700 space-y-1'>
                <li>• ระบบจะทำความสะอาดอัตโนมัติทุก 30 นาที</li>
                <li>• Logs เก่ากว่า {retentionPolicy?.logRetentionDays} วันจะถูกลบทิ้ง</li>
                <li>• Alerts เก่ากว่า {retentionPolicy?.alertRetentionDays} วันจะถูกลบทิ้ง</li>
                <li>• Manual cleanup สามารถรันได้ทุกเมื่อสำหรับ Admin</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
