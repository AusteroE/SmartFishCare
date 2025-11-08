'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RecordsPage() {
  const router = useRouter();

  const downloadPDF = () => {
    // Open PDF export in new window (will auto-print)
    window.open('/api/records/export-pdf', '_blank');
  };

  return (
    <>
      <header className="text-center mb-4 sm:mb-6 md:mb-10 px-2 sm:px-4">
        <Image
          src="/smartfishcarelogo.png"
          alt="Smart Fish Care Logo"
          width={120}
          height={120}
          priority
          className="mx-auto mb-2 w-16 h-16 sm:w-20 sm:h-20 md:w-[120px] md:h-[120px]"
        />
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#7c5cff] mb-3 sm:mb-4 px-2 leading-tight"> Stocking, Harvest & Feeding</h2>
        <div className="mt-3 sm:mt-4 md:mt-5">
          <button
            onClick={downloadPDF}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-linear-to-r from-[#667eea] to-[#764ba2] border-none rounded-xl text-white text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] w-full max-w-xs sm:w-auto"
          >
            <i className="fas fa-file-pdf text-sm sm:text-base"></i>
            <span>Download PDF Report</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 pt-2 sm:pt-4 md:pt-8 pb-20 sm:pb-24">
        {/* Navigation Cards */}
        <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-shadow duration-300">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#7c5cff] mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-fish text-sm sm:text-base"></i>
            <span>Stocking Management</span>
          </h3>
          <p className="my-3 sm:my-4 text-xs sm:text-sm md:text-base text-white/70 leading-relaxed">Manage fish stocking records, track aquarium populations, and monitor fish additions to your system.</p>
          <button
            onClick={() => router.push('/dashboard/stocking')}
            className="flex items-center justify-center gap-2 sm:gap-2.5 mx-auto mt-4 sm:mt-5 px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-linear-to-r from-[#667eea] to-[#764ba2] text-white border-none rounded-xl text-xs sm:text-sm md:text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] w-full sm:w-auto"
          >
            <i className="fa-solid fa-fish text-base sm:text-lg"></i>
            <span>Go to Stocking</span>
          </button>
        </div>

        <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-shadow duration-300">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#7c5cff] mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-seedling text-sm sm:text-base"></i>
            <span>Harvest Management</span>
          </h3>
          <p className="my-3 sm:my-4 text-xs sm:text-sm md:text-base text-white/70 leading-relaxed">Record fish harvests, track yields, and manage harvest data with size and weight information.</p>
          <button
            onClick={() => router.push('/dashboard/harvest')}
            className="flex items-center justify-center gap-2 sm:gap-2.5 mx-auto mt-4 sm:mt-5 px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-linear-to-r from-[#667eea] to-[#764ba2] text-white border-none rounded-xl text-xs sm:text-sm md:text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] w-full sm:w-auto"
          >
            <i className="fa-solid fa-seedling text-base sm:text-lg"></i>
            <span>Go to Harvest</span>
          </button>
        </div>

        <div className="bg-linear-to-b from-white/6 to-white/2 border border-white/8 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.45)] transition-shadow duration-300">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#7c5cff] mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-bone text-sm sm:text-base"></i>
            <span>Feeding Schedule Management</span>
          </h3>
          <p className="my-3 sm:my-4 text-xs sm:text-sm md:text-base text-white/70 leading-relaxed">Facilitate feeding schedules, manage food types, and track feeding times for different fish sizes.</p>
          <button
            onClick={() => router.push('/dashboard/feeding')}
            className="flex items-center justify-center gap-2 sm:gap-2.5 mx-auto mt-4 sm:mt-5 px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-linear-to-r from-[#667eea] to-[#764ba2] text-white border-none rounded-xl text-xs sm:text-sm md:text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] w-full sm:w-auto"
          >
            <i className="fa-solid fa-bone text-base sm:text-lg"></i>
            <span>Go to Feeding Schedule</span>
          </button>
        </div>
      </div>
    </>
  );
}
