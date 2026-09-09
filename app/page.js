'use client';

import dynamic from 'next/dynamic';
import GradeSelector from '@/components/GradeSelector';

// Disable SSR for CalendarBoard to prevent react-big-calendar window/DOM hydration mismatch
const CalendarBoard = dynamic(() => import('@/components/CalendarBoard'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-700">Loading Academic Calendar...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="min-h-screen py-4">
      {/* Top Grade Filter Bar */}
      <GradeSelector />
      {/* Main Calendar Board with client-only dynamic loading */}
      <CalendarBoard />
    </main>
  );
}
