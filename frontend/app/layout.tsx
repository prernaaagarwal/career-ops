import type { Metadata } from 'next';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import '@/styles/globals.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/responsive.css';

export const metadata: Metadata = {
  title: 'Career-Ops | AI Job Search',
  description: 'AI-powered job search pipeline and offer evaluation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <div className="layout-with-sidebar">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
