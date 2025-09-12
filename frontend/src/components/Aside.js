'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MdDashboard, MdStorage, MdNotifications, MdSettings, MdLogout } from 'react-icons/md';

export default function Aside({ username }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  return (
    <aside className='w-64 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl'>
      {/* Header */}
      <div className='p-6 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm'>
        <div>
          <h2 className='text-lg font-semibold text-slate-100'>สวัสดี <span className='font-medium text-slate-300'>{username || 'User'}</span></h2>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className='flex-1 p-4'>
        <ul className='space-y-3'>
          <li>
            <Link 
              href='/'
              className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
            >
              <MdDashboard className='text-xl' />
              <span className='font-medium group-hover:text-blue-300'>แดชบอร์ด</span>
            </Link>
          </li>
          <li>
            <Link 
              href='/data'
              className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
            >
              <MdStorage className='text-xl' />
              <span className='font-medium group-hover:text-green-300'>ข้อมูล</span>
            </Link>
          </li>
          <li>
            <Link 
              href='/alerts'
              className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
            >
              <MdNotifications className='text-xl' />
              <span className='font-medium group-hover:text-red-300'>แจ้งเตือน</span>
            </Link>
          </li>
          {username === 'admin' && (
            <li>
              <Link 
                href='/retention'
                className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
              >
                <MdSettings className='text-xl' />
                <span className='font-medium group-hover:text-purple-300'>Data Retention</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className='p-4 border-t border-slate-700/50'>
        <button
          onClick={handleLogout}
          className='group w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl transition-all duration-200 text-center font-medium shadow-lg hover:shadow-red-500/25 hover:scale-105'
        >
          <div className='flex items-center justify-center space-x-2'>
            <MdLogout className='text-lg group-hover:rotate-12 transition-transform duration-200' />
            <span>ออกจากระบบ</span>
          </div>
        </button>
      </div>
    </aside>
  );
}