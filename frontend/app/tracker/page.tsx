'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreBadge from '@/components/ScoreBadge';
import { applicationsAPI } from '@/utils/api';
import { formatDate, getStatusBadgeClass } from '@/utils/helpers';
import { isAuthenticated } from '@/utils/auth';
import { useRouter } from 'next/navigation';

interface Application {
  id: number;
  num: number;
  date: string;
  company: string;
  role: string;
  score: number;
  status: string;
  notes: string;
  url: string;
}

export default function TrackerPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    score_min: '',
    score_max: '',
    company: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    fetchData();
  }, [router, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsRes, statsRes] = await Promise.all([
        applicationsAPI.getAll(0, 100, filters),
        applicationsAPI.getStats(),
      ]);

      setApps(appsRes.data.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appId: number, newStatus: string) => {
    try {
      await applicationsAPI.update(appId, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div>
      <h1>Applications Tracker</h1>

      {stats && (
        <div className="grid grid-3 mt-3">
          <Card title="Total">
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total || 0}</div>
          </Card>
          <Card title="Applied">
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32' }}>{stats.applied || 0}</div>
          </Card>
          <Card title="Interviews">
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>{stats.interview || 0}</div>
          </Card>
        </div>
      )}

      <Card title="Filters" className="mt-4">
        <div className="grid grid-3 gap-2">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Company</label>
            <input
              type="text"
              className="form-input"
              placeholder="Filter by company..."
              value={filters.company}
              onChange={(e) => handleFilterChange('company', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Min Score</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="5"
              step="0.1"
              placeholder="1.0"
              value={filters.score_min}
              onChange={(e) => handleFilterChange('score_min', e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card title={`Applications (${apps.length})`} className="mt-4">
        {loading ? (
          <div className="flex flex-center" style={{ minHeight: '300px' }}>
            <div className="spinner"></div>
          </div>
        ) : apps.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No applications yet. <Link href="/evaluate">Evaluate a job →</Link></p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Company</th>
                <th>Role</th>
                <th>Score</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td>#{app.num}</td>
                  <td>{formatDate(app.date)}</td>
                  <td><strong>{app.company}</strong></td>
                  <td>{app.role}</td>
                  <td style={{ textAlign: 'center' }}>
                    <ScoreBadge score={app.score} />
                  </td>
                  <td>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                      style={{ padding: '0.25rem', fontSize: '0.9rem' }}
                    >
                      <option value="Evaluated">Evaluated</option>
                      <option value="Applied">Applied</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Discarded">Discarded</option>
                    </select>
                  </td>
                  <td style={{ fontSize: '0.9rem', maxWidth: '150px' }}>{app.notes || '—'}</td>
                  <td>
                    <Link href={`/tracker/${app.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
