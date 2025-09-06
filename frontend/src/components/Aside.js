'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Aside({ username }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  return (
    <aside className='w-64 h-screen bg-gray-800 text-white flex flex-col'>
      {/* Header */}
      <div className='p-4 border-b border-gray-700'>
        <h2 className='text-lg font-semibold'>สวัสดี, {username || 'User'}</h2>
      </div>

      {/* Navigation Links */}
      <nav className='flex-1 p-4'>
        <ul className='space-y-2'>
          <li>
            <Link 
              href='/'
              className='block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors'
            >
              แดชบอร์ด
            </Link>
          </li>
          <li>
            <Link 
              href='/data'
              className='block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors'
            >
              ข้อมูล
            </Link>
          </li>
          <li>
            <Link 
              href='/alerts'
              className='block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors'
            >
              แจ้งเตือน
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout Button */}
      <div className='p-4 border-t border-gray-700'>
        <button
          onClick={handleLogout}
          className='w-full px-4 py-2 border text-white border-red-600 hover:bg-red-700 hover:cursor-pointer rounded-md transition-colors text-center '
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}