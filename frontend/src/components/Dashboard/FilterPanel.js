'use client';
import { useState } from 'react';

export default function FilterPanel({ onFilterChange, logTypes = [], sources = [] }) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    tenant: '',
    source: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const emptyFilters = {
      startDate: '',
      endDate: '',
      tenant: '',
      source: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">ตัวกรองข้อมูล</h3>
        <button
          onClick={resetFilters}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          รีเซ็ต
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มต้น
          </label>
          <input
            type="datetime-local"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่สิ้นสุด
          </label>
          <input
            type="datetime-local"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tenant
          </label>
          <select
            value={filters.tenant}
            onChange={(e) => handleFilterChange('tenant', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            <option value="demoA">demoA</option>
            <option value="demoB">demoB</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            <option value="api">api</option>
            <option value="crowdstrike">crowdstrike</option>
            <option value="aws">aws</option>
            <option value="m365">m365</option>
            <option value="ad">ad</option>
            <option value="network">network</option>
            <option value="firewall">firewall</option>
          </select>
        </div>
      </div>
    </div>
  );
}
