'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface StockingRecord {
  id: number;
  fish_type: string;
  stock_date: string;
  aquarium_number: string;
  quantity: number | null;
  notes: string | null;
}

export default function StockingPage() {
  const router = useRouter();
  const [records, setRecords] = useState<StockingRecord[]>([]);

  useEffect(() => {
    loadStockingRecords();
  }, []);

  const loadStockingRecords = async () => {
    try {
      const response = await fetch('/api/stocking-backend?action=get_stocking');
      const result = await response.json();
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error('Error loading stocking records:', error);
    }
  };

  const addStocking = async () => {
    const form = document.getElementById('stockingForm') as HTMLFormElement;
    const formData = new FormData(form);
    formData.append('action', 'add_stocking');

    try {
      const response = await fetch('/api/stocking-backend', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        form.reset();
        loadStockingRecords();
        alert('Stocking record added successfully!');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error adding stocking record:', error);
      alert('Error adding stocking record');
    }
  };

  const deleteRecord = async (recordId: number) => {
    if (confirm('Are you sure you want to delete this record?')) {
      const formData = new FormData();
      formData.append('action', 'delete_stocking');
      formData.append('record_id', recordId.toString());

      try {
        const response = await fetch('/api/stocking-backend', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          loadStockingRecords();
          alert('Record deleted successfully!');
        } else {
          alert('Error: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record');
      }
    }
  };

  return (
    <>
      <header className="text-center mb-4 sm:mb-6 md:mb-10 px-2 sm:px-4">
        <Image
          src="/smartfishcarelogo.png"
          alt="Smart Fish Care Logo"
          width={150}
          height={150}
          className="mx-auto mb-2 w-16 h-16 sm:w-20 sm:h-20 md:w-[120px] md:h-[120px]"
          priority
        />
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#7c5cff] flex items-center justify-center gap-2 sm:gap-4">
          <i className="fas fa-arrow-left cursor-pointer p-1.5 sm:p-2 rounded-full transition-all hover:bg-white/10 hover:scale-110 text-base sm:text-lg md:text-xl" onClick={() => router.push('/dashboard/records')} title="Back to Records"></i>
          <span className="leading-tight">Stocking Management</span>
        </h2>
      </header>

      <div className="bg-gradient-to-b from-white/6 to-white/2 border border-white/8 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-8 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.35)] mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#7c5cff] mb-3 sm:mb-4">Stocking</h3>
        <form id="stockingForm" className="flex items-center justify-center gap-2 sm:gap-3 my-3 sm:my-4 p-2 sm:p-3 border border-white/12 rounded-lg flex-wrap">
          <div className="relative flex items-center bg-white/4 border border-white/12 rounded-xl p-2.5 sm:p-3 w-full">
            <i className="fa-solid fa-fish absolute left-2.5 sm:left-3 text-[#a2a8b6] text-sm sm:text-base"></i>
            <input type="text" name="fish_type" id="fish_type" placeholder="Fish Type" required className="w-full bg-transparent border-none text-[#e6e9ef] text-sm sm:text-base outline-none pl-8 sm:pl-10 pr-2 sm:pr-3" />
          </div>
          <div className="relative flex items-center bg-white/4 border border-white/12 rounded-xl p-2.5 sm:p-3 w-full">
            <i className="fa-solid fa-calendar absolute left-2.5 sm:left-3 text-[#a2a8b6] text-sm sm:text-base"></i>
            <input type="date" name="stock_date" id="stock_date" required className="w-full bg-transparent border-none text-[#e6e9ef] text-sm sm:text-base outline-none pl-8 sm:pl-10 pr-2 sm:pr-3" />
          </div>
          <div className="relative flex items-center bg-white/4 border border-white/12 rounded-xl p-2.5 sm:p-3 w-full">
            <i className="fa-solid fa-hashtag absolute left-2.5 sm:left-3 text-[#a2a8b6] text-sm sm:text-base"></i>
            <input type="text" name="aquarium_number" id="aquarium" placeholder="Aquarium #" required className="w-full bg-transparent border-none text-[#e6e9ef] text-sm sm:text-base outline-none pl-8 sm:pl-10 pr-2 sm:pr-3" />
          </div>
          <div className="relative flex items-center bg-white/4 border border-white/12 rounded-xl p-2.5 sm:p-3 w-full">
            <i className="fa-solid fa-sort-numeric-up absolute left-2.5 sm:left-3 text-[#a2a8b6] text-sm sm:text-base"></i>
            <input type="number" name="quantity" id="quantity" placeholder="Quantity" min={1} className="w-full bg-transparent border-none text-[#e6e9ef] text-sm sm:text-base outline-none pl-8 sm:pl-10 pr-2 sm:pr-3" />
          </div>
          <div className="relative flex items-center bg-white/4 border border-white/12 rounded-xl p-2.5 sm:p-3 w-full">
            <i className="fa-solid fa-comment absolute left-2.5 sm:left-3 text-[#a2a8b6] text-sm sm:text-base"></i>
            <input type="text" name="notes" id="notes" placeholder="Notes" className="w-full bg-transparent border-none text-[#e6e9ef] text-sm sm:text-base outline-none pl-8 sm:pl-10 pr-2 sm:pr-3" />
          </div>
          <button type="button" onClick={addStocking} className="bg-linear-to-r from-[#7c5cff] to-[#4cc9f0] text-white border-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-[0_4px_15px_rgba(124,92,255,0.4)] w-full sm:w-auto">Add</button>
        </form>
        <div className="overflow-x-auto mt-3 sm:mt-4 -mx-3 px-3 sm:mx-0 sm:px-0 overscroll-x-contain">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px] md:min-w-full table-fixed">
              <thead>
                <tr>
                  <th className="text-center p-2 sm:p-3 bg-white/5 font-semibold text-white/90 w-[22%]">Fish Type</th>
                  <th className="text-center p-2 sm:p-3 bg-white/5 font-semibold text-white/90 w-[18%]">Stock Date</th>
                  <th className="text-center p-2 sm:p-3 bg-white/5 font-semibold text-white/90 w-[18%]">Aquarium #</th>
                  <th className="text-center p-2 sm:p-3 bg-white/5 font-semibold text-white/90 w-[12%]">Quantity</th>
                  <th className="text-center p-2 sm:p-3 bg-white/5 font-semibold text-white/90 w-[30%]">Action</th>
                </tr>
              </thead>
              <tbody className="border-t border-white/12">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 sm:p-6 text-center text-white/50 text-sm sm:text-base">
                      <i className="fas fa-info-circle mr-2"></i>
                      No stocking records available
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-white/3 transition-colors border-b border-white/5">
                      <td className="p-1.5 sm:p-2.5 text-center text-white/90 text-[10px] sm:text-xs md:text-sm truncate" title={r.fish_type}>{r.fish_type}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-white/90 text-[10px] sm:text-xs md:text-sm">{new Date(r.stock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-white/90 text-[10px] sm:text-xs md:text-sm truncate" title={r.aquarium_number}>{r.aquarium_number}</td>
                      <td className="p-1.5 sm:p-2.5 text-center text-white/90 text-[10px] sm:text-xs md:text-sm">{r.quantity || 'N/A'}</td>
                      <td className="p-1.5 sm:p-2.5 text-center">
                        <button onClick={() => deleteRecord(r.id)} className="bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded text-[9px] sm:text-xs md:text-sm transition-all hover:bg-red-500/30 hover:-translate-y-px whitespace-nowrap">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
