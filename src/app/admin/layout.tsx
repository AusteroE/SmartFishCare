'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface User {
    id: number;
    username: string;
    email: string;
    profile_image: string;
    role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Prevent redirect loops - check if we're already on home page
        if (window.location.pathname === '/') {
            setLoading(false);
            return;
        }

        // Allow access to admin creation pages without authentication (for initial setup)
        // This allows creating the first admin account
        const isCreatePage = window.location.pathname === '/admin/admins/create' ||
            window.location.pathname === '/admin/users/create';

        if (isCreatePage) {
            // Check if any admin exists
            fetch('/api/admin/check-admin-exists')
                .then(res => res.json())
                .then(data => {
                    // If admin exists, require authentication
                    if (data.hasAdmin) {
                        // Proceed with normal auth check
                        checkAdminAuth();
                    } else {
                        // No admin exists, allow access without auth
                        setLoading(false);
                        setIsAuthorized(true);
                    }
                })
                .catch(() => {
                    // On error, allow access (for initial setup)
                    setLoading(false);
                    setIsAuthorized(true);
                });
            return;
        }

        // For other admin routes, require authentication
        checkAdminAuth();

        function checkAdminAuth() {
            // Check for redirect parameter in URL - if we just came from sign-in, wait a bit for cookie
            const params = new URLSearchParams(window.location.search);
            const isRedirectedFromSignIn = params.has('signedIn') || params.has('redirect') || window.location.search.includes('signin');

            const checkAuth = async () => {
                try {
                    // If redirected from sign-in, wait a bit longer for cookie to be set
                    if (isRedirectedFromSignIn) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    const res = await fetch('/api/admin/user/me', {
                        credentials: 'include',
                    });

                    if (res.status === 401 || res.status === 403) {
                        // Not authenticated or not admin - redirect to home with sign-in query
                        const currentPath = window.location.pathname;
                        // Only redirect if not already on home page and not already redirecting
                        if (currentPath !== '/' && !isRedirectedFromSignIn) {
                            router.push(`/?signin=true&redirect=${encodeURIComponent(currentPath)}`);
                        }
                        return;
                    }

                    const data = await res.json();

                    if (data.success) {
                        if (data.user.role !== 'admin') {
                            // Non-admin users should not access admin routes
                            router.push('/dashboard');
                            return;
                        }
                        setUser(data.user);
                        setIsAuthorized(true);

                        // Clean up redirect parameters from URL if present
                        if (isRedirectedFromSignIn) {
                            window.history.replaceState({}, '', window.location.pathname);
                        }
                    } else {
                        // Authentication failed - redirect to home with sign-in query
                        const currentPath = window.location.pathname;
                        if (currentPath !== '/' && !isRedirectedFromSignIn) {
                            router.push(`/?signin=true&redirect=${encodeURIComponent(currentPath)}`);
                        }
                    }
                } catch (error) {
                    console.error('Admin layout auth error:', error);
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/' && !isRedirectedFromSignIn) {
                        router.push(`/?signin=true&redirect=${encodeURIComponent(currentPath)}`);
                    }
                } finally {
                    setLoading(false);
                }
            };

            checkAuth();
        }
    }, [router]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#0b1020] via-[#0b1020] to-[#0b1020]">
                <div className="text-center">
                    <div className="mb-4">
                        <i className="fas fa-spinner fa-spin text-4xl text-[#7c5cff]"></i>
                    </div>
                    <p className="text-[#e6e9ef] text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // For admin creation pages, allow access without authentication if no admin exists
    const isCreatePage = typeof window !== 'undefined' &&
        (window.location.pathname === '/admin/admins/create' ||
            window.location.pathname === '/admin/users/create');

    if (isCreatePage && isAuthorized && !user) {
        // Allow access to creation pages without DashboardLayout when no admin exists
        return <>{children}</>;
    }

    // For other routes, require authentication and admin role
    if (!isAuthorized || !user || user.role !== 'admin') {
        return null;
    }

    return <DashboardLayout>{children}</DashboardLayout>;
}

