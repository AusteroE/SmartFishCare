'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/?verified=true');
      } else {
        setError(data.error || 'Invalid or expired OTP code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(124,92,255,0.18),transparent),radial-gradient(900px_500px_at_100%_10%,rgba(76,201,240,0.15),transparent),#0b1020] p-5 font-['Inter',system-ui,-apple-system,sans-serif] text-[#e6e9ef]">
      <div className="w-[90%] max-w-[500px] rounded-2xl border border-white/12 bg-gradient-to-b from-white/5 to-white/2 p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="mb-5 text-[64px] drop-shadow-[0_0_10px_rgba(124,92,255,0.3)]">🔐</div>
        <h2 className="mb-2.5 font-bold text-[#e6e9ef]">OTP Verification</h2>
        <p className="mb-8 text-[#a2a8b6]">Please enter the 6-digit code sent to your email address.</p>

        {error && (
          <div className="my-5 rounded-xl border border-red-300/30 bg-linear-to-r from-red-500/10 to-red-500/5 px-5 py-4 font-medium text-red-500 shadow-[0_4px_15px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="email" value={email} />
          <input
            type="text"
            name="otp"
            className="mb-5 w-full rounded-[15px] border border-white/12 bg-white/4 px-5 py-5 text-center text-2xl font-semibold tracking-[8px] text-[#e6e9ef] outline-none transition-all focus:border-[#7c5cff] focus:bg-white/6 focus:shadow-[0_0_0_3px_rgba(124,92,255,0.45)]"
            placeholder="000000"
            maxLength={6}
            pattern="[0-9]{6}"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
            }}
            required
            autoFocus
          />
          <br />
          <button
            type="submit"
            className="inline-block rounded-[15px] border-none bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] px-9 py-4 text-base font-semibold text-white shadow-[0_4px_15px_rgba(124,92,255,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <p className="mt-8 text-gray-600">
          <small>Didn&apos;t receive the code? Check your spam folder</small>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(124,92,255,0.18),transparent),radial-gradient(900px_500px_at_100%_10%,rgba(76,201,240,0.15),transparent),#0b1020] p-5 font-['Inter',system-ui,-apple-system,sans-serif] text-[#e6e9ef]">
        <div className="w-[90%] max-w-[500px] rounded-2xl border border-white/12 bg-gradient-to-b from-white/5 to-white/2 p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="mb-5 text-[64px] drop-shadow-[0_0_10px_rgba(124,92,255,0.3)]">🔐</div>
          <h2 className="mb-2.5 font-bold text-[#e6e9ef]">Loading...</h2>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
