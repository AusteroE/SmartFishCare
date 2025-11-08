'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Sidebar, { getNavItems } from './Sidebar';
import PWAInstallPrompt from './PWAInstallPrompt';

interface User {
    id: number;
    username: string;
    email: string;
    profile_image: string;
    role: string;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        // Determine which API endpoint to use based on the current route
        const isAdminRoute = pathname?.startsWith('/admin') || false;
        const apiEndpoint = isAdminRoute ? '/api/admin/user/me' : '/api/user/me';

        fetch(apiEndpoint, {
            credentials: 'include',
        })
            .then((res) => {
                // If unauthorized on admin route, don't redirect (AdminLayout handles it)
                if (res.status === 401 || res.status === 403) {
                    if (isAdminRoute) {
                        // AdminLayout will handle the redirect
                        setLoading(false);
                        return null;
                    }
                    // For non-admin routes, redirect to home
                    router.push('/');
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return; // Already handled

                if (data.success) {
                    setUser(data.user);
                    // If user is admin but on regular dashboard, or vice versa, handle appropriately
                    if (isAdminRoute && data.user.role !== 'admin') {
                        router.push('/dashboard');
                    } else if (!isAdminRoute && data.user.role === 'admin' && pathname === '/dashboard') {
                        // Allow admins to access regular dashboard too
                        // Just don't redirect
                    }
                } else {
                    if (!isAdminRoute) {
                        router.push('/');
                    }
                }
            })
            .catch(() => {
                if (!pathname?.startsWith('/admin')) {
                    router.push('/');
                }
            })
            .finally(() => setLoading(false));

        // Send keep-alive ping every 2 minutes to update lastSeen
        const keepAliveInterval = setInterval(() => {
            fetch('/api/user/keep-alive', {
                method: 'POST',
                credentials: 'include',
            }).catch(() => {
                // Silently fail if user is not authenticated
            });
        }, 120000); // 2 minutes

        return () => clearInterval(keepAliveInterval);
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-[#e6e9ef]">Loading...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-linear-to-br from-[#0b1020] via-[#0b1020] to-[#0b1020] overflow-x-hidden">

            {/* Fixed Sidebar - Desktop only */}
            <Sidebar
                user={user}
                onSettingsClick={() => router.push(pathname?.startsWith('/admin') ? '/admin/settings' : '/dashboard/settings')}
                isMobileOpen={sidebarOpen}
                onMobileClose={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <main className={`flex-1 md:ml-[280px] bg-transparent min-h-screen pb-32 md:pb-10 ${pathname?.startsWith('/admin') ? 'pt-4 sm:pt-6 md:pt-8 lg:pt-10 pr-4 sm:pr-6 md:pr-8 lg:pr-10 pb-4 sm:pb-6 md:pb-8 lg:pb-10' : 'p-4 sm:p-6 md:p-8 lg:p-10'}`}>
                <div className={`${pathname?.startsWith('/admin') ? 'w-full pl-4 sm:pl-6 md:pl-8 lg:pl-10' : 'max-w-7xl mx-auto'}`}>
                    {children}
                </div>
            </main>

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />

            {/* Mobile Bottom Navigation */}
            {user && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-linear-to-t from-[#121830]/95 to-[#0d1220]/95 backdrop-blur-[20px] shadow-[0_-8px_32px_rgba(0,0,0,0.4)] border-t border-white/8 flex justify-around items-center px-2 pt-3 safe-area-inset-bottom z-1000">
                    {getNavItems(user.role === 'admin', pathname?.startsWith('/admin') || false).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[60px] min-h-[60px] transition-all duration-300 ${isActive ? 'text-[#7c5cff] bg-[#7c5cff]/20' : 'text-white/50 hover:text-white/70'}`}
                            >
                                <i className={`fas ${item.icon} text-xl mb-1`}></i>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <Link
                        href={pathname?.startsWith('/admin') ? '/admin/settings' : '/dashboard/settings'}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[60px] min-h-[60px] transition-all duration-300 ${(pathname?.startsWith('/admin') ? pathname === '/admin/settings' : pathname === '/dashboard/settings') ? 'text-[#7c5cff] bg-[#7c5cff]/20' : 'text-white/50 hover:text-white/70'}`}
                    >
                        <i className="fas fa-cog text-xl mb-1"></i>
                        <span className="text-[10px] font-medium">Settings</span>
                    </Link>
                </nav>
            )}

        </div>
    );
}

