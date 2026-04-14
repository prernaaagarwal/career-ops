'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  label: string;
  href: string;
  icon?: string;
}

const items: SidebarItem[] = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Onboarding', href: '/onboarding', icon: '🚀' },
  { label: 'Evaluate Job', href: '/evaluate', icon: '✍️' },
  { label: 'Scanner', href: '/scanner', icon: '🔍' },
  { label: 'Tracker', href: '/tracker', icon: '📋' },
  { label: 'Interview Prep', href: '/interview-prep', icon: '🎤' },
  { label: 'Follow-ups', href: '/follow-ups', icon: '📞' },
  { label: 'Profile', href: '/profile', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.icon} {item.label}
            </Link>
          </li>
        ))}
      </nav>
    </aside>
  );
}
