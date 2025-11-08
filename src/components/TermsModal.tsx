'use client';

import { useState, useRef, useEffect } from 'react';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (contentRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
                if (scrollTop + clientHeight >= scrollHeight - 10) {
                    setScrolledToEnd(true);
                }
            }
        };

        if (contentRef.current) {
            contentRef.current.addEventListener('scroll', handleScroll);
            return () => {
                contentRef.current?.removeEventListener('scroll', handleScroll);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-5"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[90vh] w-[90%] max-w-[700px] flex-col rounded-2xl border border-white/12 bg-gradient-to-b from-white/5 to-white/2 p-8 text-[#e6e9ef] backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-5 text-center text-[#e6e9ef]">Terms and Conditions</h2>

                <div
                    className="mb-5 flex-1 overflow-y-auto pr-2.5"
                    ref={contentRef}
                >
                    <p>
                        Welcome to <strong>Smart Fish Care</strong>! By using this application, you agree to
                        the following terms and conditions:
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">1. Acceptance of Terms</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Your access to and use of the app is
                        conditioned upon your acceptance of and compliance with these Terms. These Terms apply
                        to all visitors, users, and others who access or use the app.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">2. User Responsibilities</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;You agree not to misuse the app or help
                        anyone else to do so. This includes not interfering with the app&apos;s operations,
                        accessing data you are not authorised to, or attempting to disrupt the app&apos;s
                        services.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">3. Privacy Policy</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;By using this app, you also agree to the
                        terms outlined in our Privacy Policy regarding how your data is collected, processed,
                        and stored.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">4. Modifications to Terms</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;We reserve the right to modify these Terms
                        at any time. Your continued use of the app following any changes indicates your
                        acceptance of the updated Terms.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">5. Limitation of Liability</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;We are not liable for any damages or losses
                        resulting from your use of the app. The app is provided on an &apos;as-is&apos; and
                        &apos;as-available&apos; basis.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">6. Governing Law</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;These Terms shall be governed and construed
                        in accordance with the laws of the Philippines, without regard to its conflict of law
                        provisions.
                    </p>
                    <br />
                    <br />
                    <br />

                    <p>
                        <h2>Privacy Policy</h2>
                    </p>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        The Data Privacy Act of 2012 in the Philippines regulates how personal data is
                        collected, processed, and stored.
                    </p>
                    <br />
                    <br />
                    <span className="text-[#a2a8b6] leading-relaxed">
                        This law ensures that individuals have control over their personal information and
                        provides them with specific rights to safeguard their privacy. These rights include:
                    </span>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">1. The Right to Be Informed</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Data subjects should be informed that their
                        personal data will be collected, processed, and stored. This includes information about
                        the purpose of data collection, the categories of personal data being collected, the
                        recipients or categories of recipients who may have access to the data, and the period
                        for which the data will be stored. Consent should be obtained when necessary.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">2. The Right to Access</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Data subjects have the right to obtain a
                        copy of the personal information that an organisation may possess about them. They can
                        request organisations to do this, as well as additional details about how the data is
                        being used or processed. Organisations must respond to these requests within a
                        reasonable timeframe, usually within 30 days, and ensure that the information is
                        provided in a clear and understandable format.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">3. The Right to Object</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Data subjects can object to processing if it
                        is based on consent or legitimate business interest.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">4. The Right to Erasure or Blocking</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Data subjects have the right to withdraw or
                        order the removal of their personal data when their rights are violated.
                    </p>
                    <br />

                    <h3 className="mt-5 text-[#7c5cff]">5. The Right to Damages</h3>
                    <p className="text-[#a2a8b6] leading-relaxed">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;Data subjects can claim compensation for
                        damages due to unlawfully obtained or unauthorised use of personal data.
                    </p>
                    <br />

                    <p className="text-[#a2a8b6] leading-relaxed">
                        The <strong>Data Privacy Act</strong> also ensures that the Philippines complies with
                        international data protection standards.
                    </p>
                    <br />
                </div>

                <button
                    id="acceptTermsBtn"
                    disabled={!scrolledToEnd}
                    onClick={onClose}
                    className="w-full rounded-[10px] border-none bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] px-4 py-4 text-base font-semibold text-white transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(124,92,255,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    I Agree
                </button>
            </div>
        </div>
    );
}
