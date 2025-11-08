'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SignInModal from '@/components/SignInModal';
import SignUpModal from '@/components/SignUpModal';
import TermsModal from '@/components/TermsModal';

export default function Home() {
  const router = useRouter();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force dark background for landing page
    document.documentElement.style.backgroundColor = '#0b1020';
    document.body.style.backgroundColor = '#0b1020';
    document.body.style.color = '#e6e9ef';

    // Check for verification message in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setMessage({ type: 'success', text: 'Email verified successfully! You can now log in.' });
    } else if (params.get('reset') === 'success') {
      setMessage({ type: 'success', text: 'Password reset successfully! You can now sign in with your new password.' });
    } else if (params.get('error')) {
      const error = params.get('error');
      const errorMessages: Record<string, string> = {
        invalid_token: 'Invalid verification token',
        token_not_found: 'Verification token not found',
        already_verified: 'Email is already verified',
        token_expired: 'Verification token has expired',
        verification_failed: 'Email verification failed. Please try again.',
      };
      setMessage({ type: 'error', text: errorMessages[error || ''] || 'An error occurred' });
    }

    // Auto-open sign-in modal if redirected from admin route
    if (params.get('signin') === 'true') {
      setSignInOpen(true);
      // Keep redirect parameter in URL for sign-in modal to use
      // Don't remove it yet - the sign-in modal needs it
    }

    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(124,92,255,0.18),transparent),radial-gradient(900px_500px_at_100%_10%,rgba(76,201,240,0.15),transparent),#0b1020] p-4 sm:p-5 text-[#e6e9ef] relative overflow-hidden">
        {/* Animated Fish Background - Client-side only to avoid hydration mismatch */}
        {mounted && (
          <div className="fish-container">
            <div className="fish fish-1">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#7c5cff', stopOpacity: 0.8 }} />
                    <stop offset="50%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#7c5cff', stopOpacity: 0.8 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient1)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient1)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient1)" />
                <circle cx="45" cy="28" r="3" fill="#4cc9f0" opacity="0.9" />
              </svg>
            </div>
            <div className="fish fish-2">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.7 }} />
                    <stop offset="50%" style={{ stopColor: '#7c5cff', stopOpacity: 0.5 }} />
                    <stop offset="100%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.7 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient2)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient2)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient2)" />
                <circle cx="45" cy="28" r="3" fill="#7c5cff" opacity="0.9" />
              </svg>
            </div>
            <div className="fish fish-3">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#7c5cff', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient3)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient3)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient3)" />
                <circle cx="45" cy="28" r="2.5" fill="#4cc9f0" opacity="0.8" />
              </svg>
            </div>
            <div className="fish fish-4">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#7c5cff', stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient4)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient4)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient4)" />
                <circle cx="45" cy="28" r="3" fill="#7c5cff" opacity="0.8" />
              </svg>
            </div>
            <div className="fish fish-5">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient5" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#7c5cff', stopOpacity: 0.5 }} />
                    <stop offset="100%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.5 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient5)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient5)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient5)" />
                <circle cx="45" cy="28" r="2.5" fill="#4cc9f0" opacity="0.7" />
              </svg>
            </div>
            <div className="fish fish-6">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient6" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.5 }} />
                    <stop offset="100%" style={{ stopColor: '#7c5cff', stopOpacity: 0.5 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient6)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient6)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient6)" />
                <circle cx="45" cy="28" r="3" fill="#7c5cff" opacity="0.7" />
              </svg>
            </div>
            <div className="fish fish-7">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient7" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#7c5cff', stopOpacity: 0.4 }} />
                    <stop offset="100%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.4 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient7)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient7)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient7)" />
                <circle cx="45" cy="28" r="2" fill="#4cc9f0" opacity="0.6" />
              </svg>
            </div>
            <div className="fish fish-8">
              <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fishGradient8" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#4cc9f0', stopOpacity: 0.5 }} />
                    <stop offset="100%" style={{ stopColor: '#7c5cff', stopOpacity: 0.5 }} />
                  </linearGradient>
                </defs>
                <path d="M20 30 Q10 20, 10 30 Q10 40, 20 30" fill="url(#fishGradient8)" />
                <ellipse cx="35" cy="30" rx="25" ry="15" fill="url(#fishGradient8)" />
                <path d="M60 30 L75 25 L75 30 L75 35 Z" fill="url(#fishGradient8)" />
                <circle cx="45" cy="28" r="3" fill="#7c5cff" opacity="0.7" />
              </svg>
            </div>
          </div>
        )}
        {message && (
          <div
            className={`fixed top-5 right-5 z-10000 rounded-lg border px-5 py-4 ${message.type === 'success'
              ? 'border-[#c3e6cb] bg-[#d4edda] text-[#155724]'
              : 'border-[#f5c6cb] bg-[#f8d7da] text-[#721c24]'
              }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-2.5 cursor-pointer border-none bg-transparent"
            >
              ×
            </button>
          </div>
        )}

        <div className="w-full max-w-[800px] text-center relative z-10">
          <div className="mb-6 sm:mb-10 flex justify-center">
            <Image
              src="/smartfishcarelogo.png"
              alt="Smart Fish Care Logo"
              className="h-auto w-auto max-w-[120px] sm:max-w-[150px]"
              width={100}
              height={100}
              priority
            />
          </div>

          <h1 className="mb-4 sm:mb-5 text-3xl sm:text-4xl md:text-[3.5rem] font-bold leading-tight px-4">
            Get Smart Care <br />
            <span className="bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] bg-clip-text text-transparent">
              For Fish
            </span>
          </h1>
          <p className="px-4">
            <span className="inline-block text-base sm:text-lg md:text-xl leading-relaxed text-[#a2a8b6]">
              Your ultimate companion for thriving happy fish. Stay on top of water quality, feeding
              schedules, and more because your fish deserve the absolute best care.
            </span>
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-5 px-4">
            <button
              id="signInBtn"
              onClick={() => setSignInOpen(true)}
              className="group relative overflow-hidden rounded-[50px] border-none bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-semibold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] w-full sm:w-auto"
            >
              <div className="absolute left-0 top-0 h-full w-1/2 -translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0"></div>
              <span className="relative z-10">Sign In</span>
              <div className="absolute right-0 top-0 h-full w-1/2 translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0"></div>
            </button>

            <button
              id="signUpBtn"
              onClick={() => setSignUpOpen(true)}
              className="group relative overflow-hidden rounded-[50px] border-none bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-semibold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] w-full sm:w-auto"
            >
              <div className="absolute left-0 top-0 h-full w-1/2 -translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0"></div>
              <span className="relative z-10">Sign Up</span>
              <div className="absolute right-0 top-0 h-full w-1/2 translate-x-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0"></div>
            </button>
          </div>
        </div>

        <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} router={router} />
        <SignUpModal
          isOpen={signUpOpen}
          onClose={() => setSignUpOpen(false)}
          onShowTerms={() => setTermsOpen(true)}
          router={router}
        />
        <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
      </div>
    </>
  );
}
