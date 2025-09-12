'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

function Page() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
                setUsername('');
                setPassword('');
                // redirect ไป login page หลัง 1-2 วินาที
                setTimeout(() => router.push('/auth/login'), 1500);
            } else {
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Sign Up - Log Management System</title>
                <meta name="description" content="Create a new account for the log management system" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-8 w-full max-w-md border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-2xl text-white">👤</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">สมัครสมาชิก</h1>
                        <p className="text-gray-600">สร้างบัญชีใหม่</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
                            {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-center">
                            {success}
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
                                placeholder="กรอกรหัสผ่าน"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>กำลังสมัครสมาชิก...</span>
                                </div>
                            ) : (
                                'สมัครสมาชิก'
                            )}
                        </button>
                    </form>

                    {/* Link to Login */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            มีบัญชีอยู่แล้ว? 
                            <button 
                                onClick={() => router.push('/auth/login')}
                                className="text-purple-600 hover:text-purple-700 font-medium ml-1 underline"
                            >
                                เข้าสู่ระบบ
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Page;
