import './globals.css';
import { GradeProvider } from '@/context/GradeContext';

export const metadata = {
  title: 'Academic Workload Dashboard',
  description: 'Academic workload calendar and coordination dashboard for teachers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 min-h-screen antialiased">
        <GradeProvider>
          {children}
        </GradeProvider>
      </body>
    </html>
  );
}
