'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show prompt after 3 seconds
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't show again for this session
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    // Don't show if already installed or dismissed this session
    if (isInstalled || !showPrompt || !deferredPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
        return null;
    }

    return (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 max-w-sm z-[1001] bg-gradient-to-b from-white/8 to-white/4 border border-white/12 rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-[#7c5cff]/20 rounded-full flex items-center justify-center">
                    <i className="fas fa-mobile-alt text-[#7c5cff] text-xl"></i>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-[#e6e9ef] mb-1">Install Smart Fish Care</h3>
                    <p className="text-xs text-[#a2a8b6] mb-3">Install our app for a better experience. Quick access, offline support, and more!</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="flex-1 px-4 py-2 bg-[#7c5cff] text-white rounded-lg text-xs font-semibold hover:bg-[#6b4ce6] transition-colors"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2 bg-white/10 text-[#a2a8b6] rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors"
                        >
                            Later
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-[#a2a8b6] hover:text-white transition-colors"
                >
                    <i className="fas fa-times text-sm"></i>
                </button>
            </div>
        </div>
    );
}

