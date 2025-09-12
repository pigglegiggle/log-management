'use client'
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function page() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const now = new Date();
                const expiry = now.getTime() + 3 * 24 * 60 * 60 * 1000;
                localStorage.setItem('token', JSON.stringify({ value: data.token, expiry }));
                router.replace('/');
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
            setUsername('');
            setPassword('');
        }
    };
    return (
        <>
            <Head>
                <title>Login - Log Management System</title>
                <meta name="description" content="Log in to access the log management system" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-8 w-full max-w-md border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">เข้าสู่ระบบ</h1>
                        <p className="text-gray-600">Log Management System</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ชื่อผู้ใช้
                            </label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                                placeholder="กรอกชื่อผู้ใช้"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                                placeholder="กรอกรหัสผ่าน"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </div>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>

                    {/* Demo Accounts */}
                    <div className="mt-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-inner">
                        <div className="flex items-center justify-center mb-4">
                            <h4 className="font-bold text-slate-700">บัญชีสำหรับการทดสอบ</h4>
                        </div>
                        
                        <div className="space-y-3">

                            <div className="group bg-white hover:bg-purple-50 rounded-lg border border-purple-200 hover:border-purple-300 p-3 transition-all duration-200 cursor-pointer"
                                 onClick={() => {setUsername('admin'); setPassword('admin');}}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">A</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-purple-700">Administrator</p>
                                            <p className="text-xs text-purple-500">ผู้ดูแลระบบ</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-purple-600">admin</p>
                                        <p className="text-xs text-purple-400 group-hover:text-purple-600">คลิกเพื่อเลือก</p>
                                    </div>
                                </div>
                            </div>


                            <div className="group bg-white hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 p-3 transition-all duration-200 cursor-pointer"
                                 onClick={() => {setUsername('demoA'); setPassword('demoA');}}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">A</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Demo Tenant A</p>
                                            <p className="text-xs text-slate-500">ผู้ใช้ทั่วไป</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-slate-600">demoA</p>
                                        <p className="text-xs text-slate-400 group-hover:text-blue-600">คลิกเพื่อเลือก</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group bg-white hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 p-3 transition-all duration-200 cursor-pointer"
                                 onClick={() => {setUsername('demoB'); setPassword('demoB');}}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">B</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Demo Tenant B</p>
                                            <p className="text-xs text-slate-500">ผู้ใช้ทั่วไป</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-slate-600">demoB</p>
                                        <p className="text-xs text-slate-400 group-hover:text-blue-600">คลิกเพื่อเลือก</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                            <p className="text-xs text-slate-500">💡 คลิกที่บัญชีเพื่อเติมข้อมูลอัตโนมัติ</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}export default page