'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthState, clearAuthState } from '@/utils/auth';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const authState = getAuthState();
    setUser({
      email: authState.email,
      full_name: authState.full_name,
    });
  }, []);

  const handleLogout = () => {
    clearAuthState();
    router.push('/auth/login');
  };

  if (!user?.email) {
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <div>
          <Link href="/" className="logo">
            Career-Ops
          </Link>
        </div>
        <nav className="header-nav">
          <Link href="/">Home</Link>
          <Link href="/evaluate">Evaluate</Link>
          <Link href="/scanner">Scanner</Link>
          <Link href="/tracker">Tracker</Link>
          <Link href="/interview-prep">Interview Prep</Link>
        </nav>
        <div className="user-menu">
          <span>{user.full_name || user.email}</span>
          <Link href="/profile">Settings</Link>
          <button
            onClick={handleLogout}
            className="button button-secondary button-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
