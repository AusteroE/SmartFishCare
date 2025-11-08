'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { getProfileImageUrl } from '@/lib/upload';

interface User {
    id: number;
    username: string;
    email: string;
    profile_image: string;
    role: string;
}

interface SidebarProps {
    user: User;
    onSettingsClick: () => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

// Export nav items for use in bottom navigation
export function getNavItems(isAdmin: boolean, isAdminRoute: boolean) {
    return isAdminRoute
        ? [
            { href: '/admin/dashboard', icon: 'fa-home', label: 'Dashboard' },
        ]
        : isAdmin
            ? [
                { href: '/dashboard', icon: 'fa-home', label: 'Dashboard' },
                { href: '/dashboard/records', icon: 'fa-table', label: 'Records' },
                { href: '/dashboard/alerts', icon: 'fa-bell', label: 'Alerts' },
            ]
            : [
                { href: '/dashboard', icon: 'fa-home', label: 'Dashboard' },
                { href: '/dashboard/records', icon: 'fa-table', label: 'Records' },
                { href: '/dashboard/alerts', icon: 'fa-bell', label: 'Alerts' },
            ];
}

export default function Sidebar({ user, onSettingsClick, isMobileOpen = false, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoutLoading, setLogoutLoading] = useState(false);

    const isAdmin = user.role === 'admin';
    const isAdminRoute = pathname?.startsWith('/admin') || false;

    // Simplified navigation for admin dashboard
    const navItems = getNavItems(isAdmin, isAdminRoute);

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            setLogoutLoading(true);
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                });
                router.push('/');
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                setLogoutLoading(false);
            }
        }
    };

    const getProfileImageSrc = () => {
        return getProfileImageUrl(user.profile_image);
    };


    return (
        <>
            {/* Sidebar - Hidden on mobile, shown on desktop */}
            <aside className={`
                hidden md:block
                fixed top-0 left-0 h-screen w-[280px] bg-linear-to-b from-[#121830] to-[#0d1220] border-r border-white/8 overflow-y-auto overflow-x-hidden z-[1000] px-5 py-6 md:py-8
                shadow-[4px_0_20px_rgba(0,0,0,0.3)]
            `}>

                {/* Sidebar Header */}
                <div className="mb-8 md:mb-10 mt-0 md:mt-0">
                    <div className="flex justify-center mb-4 md:mb-5">
                        <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden border-[3px] border-white/10 shrink-0">
                            <Image
                                src={getProfileImageSrc()}
                                alt="Profile Picture"
                                width={100}
                                height={100}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = '/frontend/img/default profile.png';
                                }}
                            />
                        </div>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-center text-[#e6e9ef] px-2 mb-2">
                        Welcome,
                    </h2>
                    <p className="text-sm md:text-base font-semibold text-center text-[#7c5cff] px-2 mb-2 wrap-break-word">
                        {user.username}
                    </p>
                    <p className="text-xs text-center text-[#a2a8b6] mt-1 px-2 break-all leading-relaxed">
                        {user.email}
                    </p>
                </div>

                {/* Navigation */}
                <nav className="mt-2">
                    <ul className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => {
                                            if (onMobileClose) {
                                                onMobileClose();
                                            }
                                        }}
                                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm whitespace-nowrap ${isActive
                                            ? 'bg-[#7c5cff]/30 border border-[#7c5cff]/50 text-white shadow-[0_2px_8px_rgba(124,92,255,0.3)]'
                                            : 'text-[#e6e9ef] hover:bg-[#7c5cff]/20 hover:border hover:border-[#7c5cff]/35'
                                            }`}
                                    >
                                        <i className={`fas ${item.icon} mr-3 w-4 text-base shrink-0`}></i>
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                        <li className="pt-2 mt-2 border-t border-white/8">
                            <Link
                                href={isAdminRoute ? '/admin/settings' : '/dashboard/settings'}
                                onClick={() => {
                                    if (onMobileClose) {
                                        onMobileClose();
                                    }
                                }}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm whitespace-nowrap ${(isAdminRoute ? pathname === '/admin/settings' : pathname === '/dashboard/settings')
                                    ? 'bg-[#7c5cff]/30 border border-[#7c5cff]/50 text-white shadow-[0_2px_8px_rgba(124,92,255,0.3)]'
                                    : 'text-[#e6e9ef] hover:bg-[#7c5cff]/20 hover:border hover:border-[#7c5cff]/35'
                                    }`}
                            >
                                <i className="fas fa-cog mr-3 w-4 text-base shrink-0"></i>
                                <span className="truncate">Settings</span>
                            </Link>
                        </li>
                        <li>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleLogout();
                                }}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm text-red-400 hover:bg-red-500/20 hover:border hover:border-red-500/35 whitespace-nowrap ${logoutLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <i className={`fas ${logoutLoading ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'} mr-3 w-4 text-base shrink-0`}></i>
                                <span className="truncate">{logoutLoading ? 'Logging out...' : 'Logout'}</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>
        </>
    );
}

