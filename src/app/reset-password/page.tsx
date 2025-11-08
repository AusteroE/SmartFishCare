'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please check your email and try again.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!token) {
            setError('Invalid reset link. Please check your email and try again.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Redirect to sign in after 3 seconds
                setTimeout(() => {
                    router.push('/?reset=success');
                }, 3000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-[#0b1020] via-[#0b1020] to-[#0b1020] flex items-center justify-center p-4">
            <div className="w-full max-w-[400px] rounded-2xl border border-white/12 bg-linear-to-b from-white/5 to-white/2 p-5 sm:p-8 text-[#e6e9ef] backdrop-blur-md">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[#e6e9ef]">Reset Password</h1>
                    <p className="text-sm text-[#a2a8b6]">Enter your new password below</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-[10px] bg-red-500/20 border border-red-500/50 text-red-300">
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 rounded-[10px] bg-green-500/20 border border-green-500/50 text-green-300">
                        <p className="mb-2"><i className="fas fa-check-circle mr-2"></i>Password reset successfully!</p>
                        <p className="text-sm">Redirecting to sign in page...</p>
                    </div>
                )}

                {!success && token && (
                    <form onSubmit={handleSubmit}>
                        <div className="relative mb-5">
                            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#a2a8b6]"></i>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-[10px] border border-white/12 bg-white/4 px-4 py-3 pl-[45px] pr-[45px] text-base text-[#e6e9ef] outline-none transition-all focus:border-[#7c5cff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.2)]"
                                required
                                minLength={6}
                            />
                            <i
                                className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#a2a8b6]`}
                                onClick={() => setShowPassword(!showPassword)}
                            ></i>
                        </div>

                        <div className="relative mb-5">
                            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#a2a8b6]"></i>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-[10px] border border-white/12 bg-white/4 px-4 py-3 pl-[45px] pr-[45px] text-base text-[#e6e9ef] outline-none transition-all focus:border-[#7c5cff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.2)]"
                                required
                                minLength={6}
                            />
                            <i
                                className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#a2a8b6]`}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            ></i>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-[10px] border-none bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] px-3 py-3 text-base font-semibold text-white transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {!token && (
                    <div className="text-center">
                        <p className="text-[#a2a8b6] mb-4">Invalid or missing reset token.</p>
                        <Link
                            href="/"
                            className="text-[#7c5cff] hover:text-[#4cc9f0] transition-colors underline"
                        >
                            Return to Home
                        </Link>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-[#a2a8b6] hover:text-[#e6e9ef] transition-colors"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-linear-to-br from-[#0b1020] via-[#0b1020] to-[#0b1020] flex items-center justify-center p-4">
                <div className="w-full max-w-[400px] rounded-2xl border border-white/12 bg-linear-to-b from-white/5 to-white/2 p-5 sm:p-8 text-[#e6e9ef] backdrop-blur-md">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7c5cff] mx-auto mb-4"></div>
                        <p className="text-[#a2a8b6]">Loading...</p>
                    </div>
                </div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}

