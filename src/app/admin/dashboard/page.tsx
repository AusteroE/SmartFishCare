'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchUsers(true);
        // Refresh users every 30 seconds to update online status
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

    // Calculate pagination
    const totalPages = Math.ceil(users.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Reset to page 1 when users change
    useEffect(() => {
        if (users.length > 0 && currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [users.length, currentPage, totalPages]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    return (
        <DashboardLayout>
            <div className="w-full flex flex-col gap-2 overflow-hidden flex-1 min-h-0">
                {/* Header */}
                <header className="shrink-0">
                    <h1 className="text-xl md:text-2xl font-extrabold text-[#e6e9ef]">
                        Admin Dashboard
                    </h1>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg p-3 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[10px] text-[#a2a8b6] mb-0.5">Total Users</h3>
                                <p className="text-xl font-bold text-[#e6e9ef]">{stats.total}</p>
                            </div>
                            <div className="w-8 h-8 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-users text-lg text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg p-3 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[10px] text-[#a2a8b6] mb-0.5">Admins</h3>
                                <p className="text-xl font-bold text-[#e6e9ef]">{stats.admins}</p>
                            </div>
                            <div className="w-8 h-8 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-user-shield text-lg text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg p-3 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[10px] text-[#a2a8b6] mb-0.5">Regular Users</h3>
                                <p className="text-xl font-bold text-[#e6e9ef]">{stats.users}</p>
                            </div>
                            <div className="w-8 h-8 bg-[#7c5cff]/20 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-user text-lg text-[#7c5cff]"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table Section */}
                <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg p-3 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex flex-col  min-h-0 overflow-hidden">
                    <div className="shrink-0 mb-2">
                        <h2 className="text-base md:text-lg font-bold text-[#e6e9ef]">User List</h2>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        {loading ? (
                            <div className="text-center py-8 flex items-center justify-center h-full">
                                <div>
                                    <i className="fas fa-spinner fa-spin text-xl text-[#7c5cff] mb-2"></i>
                                    <p className="text-sm text-[#a2a8b6]">Loading users...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 flex items-center justify-center h-full">
                                <div>
                                    <i className="fas fa-exclamation-circle text-xl text-red-500 mb-2"></i>
                                    <p className="text-sm text-red-400 mb-3">{error}</p>
                                    <button
                                        onClick={() => fetchUsers(true)}
                                        className="px-3 py-1.5 bg-[#7c5cff] text-white rounded-lg hover:bg-[#6b4ce6] transition-colors text-xs"
                                    >
                                        <i className="fas fa-redo mr-1.5"></i>Retry
                                    </button>
                                </div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 flex items-center justify-center h-full">
                                <div>
                                    <i className="fas fa-users text-2xl text-[#a2a8b6] mb-2"></i>
                                    <p className="text-sm text-[#a2a8b6]">No users found</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 min-h-0 overflow-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-[#0b1020]/95 backdrop-blur-sm z-10">
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Profile
                                                </th>
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Username
                                                </th>
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Email
                                                </th>
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Role
                                                </th>
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Status
                                                </th>
                                                <th className="text-left py-2 px-2 text-[10px] text-[#a2a8b6] font-semibold">
                                                    Joined
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="py-2 px-2">
                                                        <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
                                                            <Image
                                                                src={getProfileImageUrl(user.profile_image)}
                                                                alt={user.username}
                                                                width={28}
                                                                height={28}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = '/frontend/img/default profile.png';
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="text-[11px] text-[#e6e9ef] font-medium min-w-0">
                                                            {user.username}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="text-[11px] text-[#a2a8b6] min-w-0 truncate" title={user.email}>
                                                            {user.email}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span
                                                            className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${user.role === 'admin'
                                                                ? 'bg-purple-500/20 text-purple-300'
                                                                : 'bg-blue-500/20 text-blue-300'
                                                                }`}
                                                        >
                                                            {user.role === 'admin' ? 'Admin' : 'User'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <span
                                                            className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${user.is_online
                                                                ? 'bg-green-500/20 text-green-300'
                                                                : 'bg-gray-500/20 text-gray-300'
                                                                }`}
                                                        >
                                                            {user.is_online ? 'ONLINE' : 'OFFLINE'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2 text-[11px] text-[#a2a8b6] whitespace-nowrap">
                                                        {formatDate(user.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {users.length > itemsPerPage && (
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 shrink-0">
                                        <div className="text-[11px] text-[#a2a8b6]">
                                            Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handlePreviousPage}
                                                disabled={currentPage === 1}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${currentPage === 1
                                                    ? 'bg-white/5 text-[#a2a8b6] cursor-not-allowed opacity-50'
                                                    : 'bg-[#7c5cff]/20 text-[#7c5cff] hover:bg-[#7c5cff]/30'
                                                    }`}
                                            >
                                                <i className="fas fa-chevron-left mr-1"></i>
                                                Previous
                                            </button>
                                            <span className="text-[11px] text-[#e6e9ef] font-medium px-2">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={handleNextPage}
                                                disabled={currentPage === totalPages}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${currentPage === totalPages
                                                    ? 'bg-white/5 text-[#a2a8b6] cursor-not-allowed opacity-50'
                                                    : 'bg-[#7c5cff]/20 text-[#7c5cff] hover:bg-[#7c5cff]/30'
                                                    }`}
                                            >
                                                Next
                                                <i className="fas fa-chevron-right ml-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

