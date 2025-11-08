'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CreateAdminPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
            setError('Password must be at least 6 characters longs');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', 'admin'); // Always set to admin
            formData.append('skipEmailVerification', 'true'); // Skip verification for admin creation
            if (profileFile) {
                formData.append('profile', profileFile);
            }

            const response = await fetch('/api/auth/create-admin', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setError('');
                // Reset form
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setProfileImage(null);
                setProfileFile(null);

                // Redirect to sign-in page after 2 seconds
                setTimeout(() => {
                    router.push('/?message=Admin account created successfully. Please sign in.');
                }, 2000);
            } else {
                setError(data.error || 'Failed to create admin account');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen max-w-2xl mx-auto p-6">
            {/* Header */}
            <header className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-user-shield text-3xl text-purple-400"></i>
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold text-[#e6e9ef] mb-2">Create Admin Account</h1>
                <p className="text-[#a2a8b6]">Create a new administrator account for the system</p>
            </header>

            {/* Success Message */}
            {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400">
                    <i className="fas fa-check-circle mr-2"></i>
                    Admin account created successfully! Redirecting to sign-in...
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8">
                <form onSubmit={handleSubmit}>
                    {/* Profile Image */}
                    <div className="mb-6 flex flex-col items-center">
                        <div className="relative mb-4">
                            <Image
                                src={profileImage || '/default profile.png'}
                                alt="Profile Picture"
                                width={120}
                                height={120}
                                className="w-[120px] h-[120px] rounded-full object-cover border-4 border-white/20"
                            />
                            <label
                                htmlFor="profileInput"
                                className="absolute bottom-0 right-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer border-2 border-[#0b1020] hover:bg-purple-600 transition-colors"
                            >
                                <i className="fas fa-camera text-white text-sm"></i>
                            </label>
                            <input
                                type="file"
                                id="profileInput"
                                accept="image/*"
                                onChange={handleProfileChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-sm text-[#a2a8b6]">Click camera icon to upload profile picture</p>
                    </div>

                    {/* Username */}
                    <div className="mb-5">
                        <label className="block mb-2 text-[#e6e9ef] font-semibold">
                            <i className="fas fa-user mr-2"></i>Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/4 border border-white/12 text-[#e6e9ef] placeholder-[#a2a8b6] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                            placeholder="Enter username"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="mb-5">
                        <label className="block mb-2 text-[#e6e9ef] font-semibold">
                            <i className="fas fa-envelope mr-2"></i>Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/4 border border-white/12 text-[#e6e9ef] placeholder-[#a2a8b6] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-5">
                        <label className="block mb-2 text-[#e6e9ef] font-semibold">
                            <i className="fas fa-lock mr-2"></i>Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-lg bg-white/4 border border-white/12 text-[#e6e9ef] placeholder-[#a2a8b6] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                placeholder="Enter password (min. 6 characters)"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a2a8b6] hover:text-[#e6e9ef]"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-6">
                        <label className="block mb-2 text-[#e6e9ef] font-semibold">
                            <i className="fas fa-lock mr-2"></i>Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-lg bg-white/4 border border-white/12 text-[#e6e9ef] placeholder-[#a2a8b6] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                placeholder="Confirm your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a2a8b6] hover:text-[#e6e9ef]"
                            >
                                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-linear-to-r from-purple-600 to-purple-500 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span>
                                    <i className="fas fa-spinner fa-spin mr-2"></i>Creating...
                                </span>
                            ) : (
                                <span>
                                    <i className="fas fa-user-shield mr-2"></i>Create Admin Account
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-white/4 border border-white/12 text-[#e6e9ef] rounded-lg font-semibold hover:bg-white/6 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

