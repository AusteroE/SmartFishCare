'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CreateUserPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [skipEmailVerification, setSkipEmailVerification] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

            if (!allowedTypes.includes(file.type)) {
                setError('Only JPG, PNG, and GIF images are allowed.');
                return;
            }

            if (file.size > maxSize) {
                setError('Image size should be less than or equal to 10MB.');
                return;
            }

            setProfileFile(file);
            setError('');
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', role);
            formData.append('skipEmailVerification', skipEmailVerification.toString());
            if (profileFile) {
                formData.append('profile', profileFile);
            }

            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Reset form
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setRole('user');
                setSkipEmailVerification(false);
                setProfileImage(null);
                setProfileFile(null);

                // Redirect to admin dashboard after 2 seconds
                setTimeout(() => {
                    router.push('/admin/dashboard');
                }, 2000);
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen max-w-lg mx-auto py-4 sm:py-8 px-4 sm:px-6">
            {/* Header */}
            <header className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-[#e6e9ef] mb-1">Create User Account</h1>
                <p className="text-sm text-[#a2a8b6]">Create a new user or admin account</p>
            </header>

            {/* Form Card */}
            <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-xl p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                {success && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-300">
                        <i className="fas fa-check-circle mr-2"></i>
                        User account created successfully! Redirecting...
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300">
                        <i className="fas fa-exclamation-circle mr-2"></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Profile Image */}
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <Image
                                src={profileImage || '/frontend/img/default profile.png'}
                                alt="Profile Picture"
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-2 border-white/10"
                            />
                            <label
                                htmlFor="profileInput"
                                className="absolute bottom-0 right-0 bg-[#7c5cff] w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 border-[#0b1020] hover:bg-[#6b4ce6] transition-colors"
                            >
                                <i className="fas fa-camera text-white text-xs"></i>
                            </label>
                            <input
                                type="file"
                                id="profileInput"
                                accept="image/*"
                                onChange={handleProfileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div className="mb-4">
                        <label className="block text-sm text-[#a2a8b6] mb-1.5 font-medium">
                            <i className="fas fa-user mr-1.5 text-xs"></i>Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white/4 border border-white/12 rounded-lg text-[#e6e9ef] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]/20"
                            placeholder="Enter username"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                        <label className="block text-sm text-[#a2a8b6] mb-1.5 font-medium">
                            <i className="fas fa-envelope mr-1.5 text-xs"></i>Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white/4 border border-white/12 rounded-lg text-[#e6e9ef] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]/20"
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                        <label className="block text-sm text-[#a2a8b6] mb-1.5 font-medium">
                            <i className="fas fa-lock mr-1.5 text-xs"></i>Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-10 text-sm bg-white/4 border border-white/12 rounded-lg text-[#e6e9ef] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]/20"
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#a2a8b6] hover:text-[#e6e9ef] text-sm"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-4">
                        <label className="block text-sm text-[#a2a8b6] mb-1.5 font-medium">
                            <i className="fas fa-lock mr-1.5 text-xs"></i>Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-10 text-sm bg-white/4 border border-white/12 rounded-lg text-[#e6e9ef] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]/20"
                                placeholder="Confirm password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#a2a8b6] hover:text-[#e6e9ef] text-sm"
                            >
                                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-4">
                        <label className="block text-sm text-[#a2a8b6] mb-1.5 font-medium">
                            <i className="fas fa-user-tag mr-1.5 text-xs"></i>Account Role
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="role"
                                    value="user"
                                    checked={role === 'user'}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                                    className="mr-2 w-4 h-4"
                                />
                                <span className="text-sm text-[#e6e9ef]">Regular User</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={role === 'admin'}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                                    className="mr-2 w-4 h-4"
                                />
                                <span className="text-sm text-[#e6e9ef]">Admin</span>
                            </label>
                        </div>
                    </div>

                    {/* Skip Email Verification */}
                    <div className="mb-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={skipEmailVerification}
                                onChange={(e) => setSkipEmailVerification(e.target.checked)}
                                className="mr-2 w-4 h-4"
                            />
                            <span className="text-sm text-[#a2a8b6]">
                                Skip email verification
                            </span>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] text-white rounded-lg text-sm font-semibold hover:from-[#6b4ce6] hover:to-[#3db8d9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-user-plus text-xs"></i>
                                    Create Account
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/dashboard')}
                            className="px-4 py-2.5 bg-white/4 border border-white/12 text-[#e6e9ef] rounded-lg text-sm font-semibold hover:bg-white/6 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

