import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import EmergencyBanner from '@/components/EmergencyBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'QueueCare AI — Intelligent Hospital Queue Management System',
  description: 'AI-assisted real-time queue tracking, transparent waiting-time estimates, and clinical scheduling for outpatient healthcare in Kerala.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-x-hidden" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans overflow-x-hidden w-full max-w-full">
        <AuthProvider>
          <EmergencyBanner />
          <Navbar />
          <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
