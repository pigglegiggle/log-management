'use client'
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/login`, {
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
        <div className="flex justify-center">
            <div className="shadow-md p-8 w-96 mt-20">
                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 text-center">{error}</div>}
                <h1 className="text-2xl font-bold mb-4 text-center">เข้าสู่ระบบ</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2">ชื่อผู้ใช้</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        className="border p-2 w-full" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2">รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        className="border p-2 w-full" />
                    </div>
                    <div className="bg-gray-100 p-4 mb-4 text-sm">
                        <h4 className="font-bold mb-4 text-center">บัญชีสำหรับการทดสอบ</h4>
                        <div className="ms-12">
                            <p><strong>ชื่อผู้ใช้: </strong>demoA <strong>รหัสผ่าน: </strong>demoA</p>
                            <p><strong>ชื่อผู้ใช้: </strong>demoB <strong>รหัสผ่าน: </strong>demoB</p>
                            <p><strong>ชื่อผู้ใช้: </strong>admin <strong>รหัสผ่าน: </strong>admin</p>
                        </div>

                    </div>
                    <div>
                        <button type="submit" className="bg-blue-500 text-white p-2 w-full">{loading ? 'กำลังเข้าสู่ระบบ': 'เข้าสู่ระบบ'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
    }

export default page