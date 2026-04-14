'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { applicationsAPI, onboardingAPI } from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';

interface Stats {
  total: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  evaluated: number;
  avg_score: number;
}

interface OnboardingStatus {
  cv_done: boolean;
  profile_done: boolean;
  all_done: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, onboardingRes] = await Promise.all([
          applicationsAPI.getStats(),
          onboardingAPI.getStatus(),
        ]);

        setStats(statsRes.data);
        setOnboarding(onboardingRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>

      {!onboarding?.all_done && (
        <div className="alert alert-info">
          <strong>Getting started:</strong> Complete your profile and CV to get the most out of Career-Ops.{' '}
          <Link href="/onboarding">Start onboarding →</Link>
        </div>
      )}

      <div className="grid grid-3 mt-4">
        <Card title="Total Applications">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc' }}>
            {stats?.total || 0}
          </div>
        </Card>

        <Card title="Applied">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
            {stats?.applied || 0}
          </div>
        </Card>

        <Card title="Interviews">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1976d2' }}>
            {stats?.interview || 0}
          </div>
        </Card>

        <Card title="Offers">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#388e3c' }}>
            {stats?.offer || 0}
          </div>
        </Card>

        <Card title="Rejected">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#dc3545' }}>
            {stats?.rejected || 0}
          </div>
        </Card>

        <Card title="Avg Score">
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f57c00' }}>
            {stats?.avg_score ? stats.avg_score.toFixed(1) : 'N/A'}
          </div>
        </Card>
      </div>

      <Card title="Quick Actions" className="mt-4">
        <div className="grid grid-3 gap-2">
          <Button variant="primary" onClick={() => router.push('/evaluate')}>
            ✍️ Evaluate Job
          </Button>
          <Button variant="primary" onClick={() => router.push('/scanner')}>
            🔍 Scan Portals
          </Button>
          <Button variant="primary" onClick={() => router.push('/tracker')}>
            📋 View Tracker
          </Button>
          <Button variant="secondary" onClick={() => router.push('/interview-prep')}>
            🎤 Interview Prep
          </Button>
          <Button variant="secondary" onClick={() => router.push('/follow-ups')}>
            📞 Follow-ups
          </Button>
          <Button variant="secondary" onClick={() => router.push('/profile')}>
            ⚙️ Settings
          </Button>
        </div>
      </Card>

      <Card title="Getting Started" className="mt-4">
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Set up your profile</strong> — Upload your CV and career goals
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Scan for jobs</strong> — Use the Scanner to find roles from your target companies
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Evaluate offers</strong> — Paste job URLs to get A-F scores and personalized feedback
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Track applications</strong> — Keep your Tracker updated as you progress
          </li>
          <li>
            <strong>Interview prep</strong> — Build your story bank and company-specific prep
          </li>
        </ol>
      </Card>
    </div>
  );
}
