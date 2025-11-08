'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { getProfileImageUrl } from '@/lib/upload';

interface User {
    id: number;
    username: string;
    email: string;
    profile_image: string;
    role: string;
    email_verified: boolean;
    status: string;
    is_online?: boolean;
    created_at: string;
}

interface UserStats {
    total: number;
    admins: number;
    users: number;
}

export default function AdminDashboardPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats>({ total: 0, admins: 0, users: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers(true);
        const interval = setInterval(() => {
            fetchUsers(false);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchUsers = async (showLoading = false) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            const response = await fetch('/api/admin/users', {
                credentials: 'include',
            });
            const data = await response.json();

            if (data.success) {
                setUsers(data.users);
                setStats(data.stats);
                setError(null);
            } else {
                setError(data.error || 'Failed to fetch users');
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <DashboardLayout>
            <div className="w-full space-y-6 md:space-y-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#e6e9ef] mb-2">
                        Admin Dashboard
                    </h1>

                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm text-[#a2a8b6] mb-2">Total Users</h3>
                                <p className="text-3xl font-bold text-[#e6e9ef]">{stats.total}</p>
                            </div>
                            <div className="w-14 h-14 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-users text-2xl text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm text-[#a2a8b6] mb-2">Admins</h3>
                                <p className="text-3xl font-bold text-[#e6e9ef]">{stats.admins}</p>
                            </div>
                            <div className="w-14 h-14 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-user-shield text-2xl text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm text-[#a2a8b6] mb-2">Regular Users</h3>
                                <p className="text-3xl font-bold text-[#e6e9ef]">{stats.users}</p>
                            </div>
                            <div className="w-14 h-14 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-user text-2xl text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table Section */}
                <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <h2 className="text-xl md:text-2xl font-bold text-[#e6e9ef]">User List</h2>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Link
                                href="/admin/admins/create"
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-linear-to-r from-purple-600 to-purple-500 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-600 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <i className="fas fa-user-shield text-xs"></i>
                                <span>Create Admin</span>
                            </Link>
                            <Link
                                href="/admin/users/create"
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] text-white rounded-lg text-sm font-semibold hover:from-[#6b4ce6] hover:to-[#3db8d9] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <i className="fas fa-user-plus text-xs"></i>
                                <span>Create User</span>
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">
                            <i className="fas fa-spinner fa-spin text-2xl text-[#7c5cff] mb-3"></i>
                            <p className="text-[#a2a8b6]">Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10">
                            <i className="fas fa-exclamation-circle text-2xl text-red-500 mb-3"></i>
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={() => fetchUsers(true)}
                                className="px-4 py-2 bg-[#7c5cff] text-white rounded-lg hover:bg-[#6b4ce6] transition-colors text-sm"
                            >
                                <i className="fas fa-redo mr-2"></i>Retry
                            </button>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-10">
                            <i className="fas fa-users text-3xl text-[#a2a8b6] mb-3"></i>
                            <p className="text-[#a2a8b6]">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[10%]">
                                            Profile
                                        </th>
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[18%]">
                                            Username
                                        </th>
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[30%]">
                                            Email
                                        </th>
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[12%]">
                                            Role
                                        </th>
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[12%]">
                                            Status
                                        </th>
                                        <th className="text-left py-4 px-4 text-xs md:text-sm text-[#a2a8b6] font-semibold w-[18%]">
                                            Joined
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
                                                    <Image
                                                        src={getProfileImageUrl(user.profile_image)}
                                                        alt={user.username}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/frontend/img/default profile.png';
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="text-sm text-[#e6e9ef] font-medium min-w-0">
                                                    {user.username}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="text-sm text-[#a2a8b6] min-w-0 truncate" title={user.email}>
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${user.role === 'admin'
                                                        ? 'bg-purple-500/20 text-purple-300'
                                                        : 'bg-blue-500/20 text-blue-300'
                                                        }`}
                                                >
                                                    {user.role === 'admin' ? 'Admin' : 'User'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${user.is_online
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : 'bg-gray-500/20 text-gray-300'
                                                        }`}
                                                >
                                                    {user.is_online ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-[#a2a8b6] whitespace-nowrap">
                                                {formatDate(user.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
