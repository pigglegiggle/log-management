'use client';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Aside from '../../components/Aside';
import FilterPanel from '../../components/Dashboard/FilterPanel';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [allLogs, setAllLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Apply search filter to filtered logs
  const searchFilteredLogs = filteredLogs.filter(log => 
    !searchTerm || 
    Object.values(log).some(value => 
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
        if (!logsRes.ok || !logData.success) return;

        // Simple - just set logs array
        const logs = logData.logs || [];
        setAllLogs(logs);
        setFilteredLogs(logs);

      } catch (err) {
        // console.error('Error during auth check:', err);
      }
    };

    checkAuth();
  }, [router]);

  const handleFilterChange = (filters) => {
    // console.log('Filters applied:', filters);
    
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
    setSearchTerm(''); // Reset search when filter changes
  };

  // Custom column renderers
  const timestampBodyTemplate = (rowData) => {
    return rowData.timestamp ? new Date(rowData.timestamp).toLocaleString() : '-';
  };

  const tenantBodyTemplate = (rowData) => {
    return rowData.tenant_name ? (
      <span className='px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
        {rowData.tenant_name}
      </span>
    ) : '-';
  };

  const sourceBodyTemplate = (rowData) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        rowData.log_type === 'firewall' ? 'bg-red-100 text-red-800' :
        rowData.log_type === 'network' ? 'bg-blue-100 text-blue-800' :
        rowData.source_name === 'aws' ? 'bg-orange-100 text-orange-800' :
        rowData.source_name === 'crowdstrike' ? 'bg-yellow-100 text-yellow-800' :
        'bg-green-100 text-green-800'
      }`}>
        {rowData.source_name || rowData.log_type || 'unknown'}
      </span>
    );
  };

  const severityBodyTemplate = (rowData) => {
    return rowData.severity ? (
      <span className={`px-2 py-1 rounded text-xs font-bold ${
        parseInt(rowData.severity) >= 8 ? 'bg-red-500 text-white' :
        parseInt(rowData.severity) >= 6 ? 'bg-orange-500 text-white' :
        parseInt(rowData.severity) >= 4 ? 'bg-yellow-500 text-white' :
        'bg-gray-400 text-white'
      }`}>
        {rowData.severity}
      </span>
    ) : '-';
  };

  const cloudBodyTemplate = (rowData) => {
    return rowData.cloud ? (
      <div className='text-xs bg-blue-50 p-2 rounded'>
        <div><strong>Service:</strong> {rowData.cloud.service}</div>
        <div><strong>Account:</strong> {rowData.cloud.account_id}</div>
        <div><strong>Region:</strong> {rowData.cloud.region}</div>
      </div>
    ) : '-';
  };

  const rawDataBodyTemplate = (rowData) => {
    return (
      <div className='text-sm text-gray-700 break-words' style={{maxWidth: '400px'}}>
        {rowData.raw_data ? (
          <div className='font-mono text-xs bg-gray-50 p-2 rounded max-h-20 overflow-y-auto'>
            {typeof rowData.raw_data === 'string' ? rowData.raw_data : JSON.stringify(rowData.raw_data, null, 2)}
          </div>
        ) : rowData.message ? (
          <div className='break-words'>
            {typeof rowData.message === 'string' ? rowData.message : JSON.stringify(rowData.message, null, 2)}
          </div>
        ) : '-'}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Logs Data - Log Management System</title>
        <meta name="description" content="View and search log data with advanced filtering" />
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
        <div className='flex-1 flex flex-col overflow-hidden'>
          <div className='p-4 bg-white border-b border-gray-200 mt-16 lg:mt-0'>
            <h1 className='text-2xl font-bold text-gray-800'>
              Logs ({searchFilteredLogs.length} รายการ)
            </h1>
          </div>

          {/* Filter Panel */}
          <div className='p-2 bg-gray-50'>
            <FilterPanel 
              onFilterChange={handleFilterChange} 
            />
          </div>

          {/* Search Controls */}
          <div className='px-2'>
            <div className='p-4 rounded shadow bg-white border rounded border-gray-200 flex justify-between items-center'>
              <div className='flex items-center space-x-4'>
                <input
                  type="text"
                  placeholder="ค้นหาข้อมูล..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className='text-sm text-gray-600'>
                รวม {searchFilteredLogs.length} รายการ
              </div>
            </div>
          </div>


          {/* DataTable Container */}

          <div className='flex-1 overflow-auto bg-white mt-3 mx-2 rounded-lg shadow-sm border border-gray-200'>
            {searchFilteredLogs.length > 0 ? (
              <div className='p-4'>
                <DataTable 
                  value={searchFilteredLogs} 
                  paginator 
                  rows={15} 
                  rowsPerPageOptions={[10, 15, 25, 50]}
                  tableStyle={{ minWidth: '50rem' }}
                  className="p-datatable-sm"
                  sortMode="multiple"
                  removableSort
                  stripedRows
                  paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                  currentPageReportTemplate="แสดง {first} ถึง {last} จาก {totalRecords} รายการ"
                >
                  <Column 
                    field="timestamp" 
                    header="Time" 
                    sortable 
                    body={timestampBodyTemplate}
                    style={{ width: '150px', minWidth: '150px' }}
                  />
                  <Column 
                    field="tenant_name" 
                    header="Tenant" 
                    sortable 
                    body={tenantBodyTemplate}
                    style={{ width: '120px', minWidth: '120px' }}
                  />
                  <Column 
                    field="source_name" 
                    header="Source" 
                    sortable 
                    body={sourceBodyTemplate}
                    style={{ width: '120px', minWidth: '120px' }}
                  />
                  <Column 
                    field="event_type" 
                    header="Event Type" 
                    sortable 
                    style={{ width: '150px', minWidth: '150px' }}
                  />
                  <Column 
                    field="severity" 
                    header="Severity" 
                    sortable 
                    body={severityBodyTemplate}
                    style={{ width: '100px', minWidth: '100px' }}
                  />
                  <Column 
                    field="src_ip" 
                    header="Source IP" 
                    sortable 
                    style={{ width: '140px', minWidth: '140px', fontFamily: 'monospace' }}
                  />
                  <Column 
                    field="user" 
                    header="User" 
                    sortable 
                    style={{ width: '120px', minWidth: '120px' }}
                  />
                  <Column 
                    field="host" 
                    header="Host" 
                    sortable 
                    style={{ width: '150px', minWidth: '150px' }}
                  />
                  <Column 
                    field="cloud" 
                    header="Cloud Info" 
                    body={cloudBodyTemplate}
                    style={{ width: '200px', minWidth: '200px' }}
                  />
                  <Column 
                    field="raw_data" 
                    header="Raw" 
                    body={rawDataBodyTemplate}
                    style={{ width: '400px', minWidth: '300px' }}
                  />
                </DataTable>
              </div>
            ) : (
              <div className='p-8 text-center text-gray-500'>
                {allLogs.length > 0 ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการกรอง' : 'ไม่มีข้อมูล logs ในระบบ'}
              </div>
            )}
          </div>


        </div>
      </div>
    </>
  );
}