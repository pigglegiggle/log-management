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
            <div className="flex justify-center">
                <div className="shadow-md p-8 w-96 mt-20">
                    {error && <div className="bg-red-100 text-red-700 p-2 mb-4 text-center">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-2 mb-4 text-center">{success}</div>}
                    <h1 className="text-2xl font-bold mb-4 text-center">สมัครสมาชิก</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2">ชื่อผู้ใช้</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="border p-2 w-full" 
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border p-2 w-full" 
                        />
                    </div>
                    <div>
                        <button 
                            type="submit" 
                            className="bg-blue-500 text-white p-2 w-full"
                            disabled={loading}
                        >
                            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
}

export default Page;
