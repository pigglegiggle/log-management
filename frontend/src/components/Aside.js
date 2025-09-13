'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MdDashboard, MdStorage, MdNotifications, MdSettings, MdLogout, MdMenu, MdClose } from 'react-icons/md';

export default function Aside({ username }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isOpen && !event.target.closest('.mobile-menu') && !event.target.closest('.menu-button')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth/login');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="menu-button fixed top-6 left-4 z-50 lg:hidden bg-slate-800 text-white p-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors duration-200"
        >
          {isOpen ? <MdClose className="text-lg" /> : <MdMenu className="text-lg" />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
      )}

      {/* Aside Navigation */}
      <aside className={`
        mobile-menu
        ${isMobile 
          ? `fixed top-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'relative'
        }
        w-64 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl
      `}>
        {/* Header */}
        <div className={`p-6 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm ${isMobile ? 'pt-22' : ''}`}>
          <div>
            <h2 className='text-lg font-semibold text-slate-100'>
              สวัสดี <span className='font-medium text-slate-300'>{username || 'User'}</span>
            </h2>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className='flex-1 p-4'>
          <ul className='space-y-3'>
            <li>
              <Link 
                href='/'
                onClick={handleLinkClick}
                className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
              >
                <MdDashboard className='text-xl' />
                <span className='font-medium group-hover:text-blue-300'>แดชบอร์ด</span>
              </Link>
            </li>
            <li>
              <Link 
                href='/data'
                onClick={handleLinkClick}
                className='group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200 hover:translate-x-1'
              >
                <MdStorage className='text-xl' />
                <span className='font-medium group-hover:text-green-300'>ข้อมูล</span>
              </Link>
            </li>
            <li>
              <Link 
                href='/alerts'
                onClick={handleLinkClick}
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
                  onClick={handleLinkClick}
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
    </>
  );
}