'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreBadge from '@/components/ScoreBadge';
import { applicationsAPI, reportsAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';

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
  report_id: number;
}

interface Report {
  id: number;
  company: string;
  role: string;
  archetype: string;
  score: number;
  legitimacy: string;
  markdown_content: string;
  comp_range: string;
  pdf_path: string;
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [app, setApp] = useState<Application | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const appRes = await applicationsAPI.getOne(parseInt(id));
      setApp(appRes.data);
      setNotes(appRes.data.notes || '');

      if (appRes.data.report_id) {
        const reportRes = await reportsAPI.getOne(appRes.data.report_id);
        setReport(reportRes.data);
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await applicationsAPI.update(parseInt(id), { status: newStatus });
      setApp((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await applicationsAPI.update(parseInt(id), { notes });
      setEditingNotes(false);
      if (app) {
        setApp({ ...app, notes });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save notes');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div>
        <h1>Application Not Found</h1>
        <Card>
          <Link href="/tracker">← Back to Tracker</Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/tracker">← Back to Tracker</Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <Card title={`${app.role} — ${app.company}`} className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#666' }}>
              #{app.num} • {app.status} • {formatDate(app.date)}
            </p>
          </div>
          {app.score && <ScoreBadge score={app.score} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
              Status
            </label>
            <select
              className="form-select"
              value={app.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="Evaluated">Evaluated</option>
              <option value="Applied">Applied</option>
              <option value="Responded">Responded</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Discarded">Discarded</option>
            </select>
          </div>

          {app.url && (
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                Job URL
              </label>
              <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', wordBreak: 'break-all' }}>
                View Job
              </a>
            </div>
          )}

          {report?.comp_range && (
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                Comp Range
              </label>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{report.comp_range}</p>
            </div>
          )}

          {report?.archetype && (
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                Archetype
              </label>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{report.archetype}</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Notes</label>
              {!editingNotes && (
                <Button variant="secondary" size="sm" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              )}
            </div>

            {editingNotes ? (
              <div>
                <textarea
                  className="form-input"
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="primary" size="sm" onClick={handleSaveNotes}>
                    Save
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                    setEditingNotes(false);
                    setNotes(app.notes || '');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '1rem',
                  borderRadius: '4px',
                  minHeight: '100px',
                  color: notes ? '#333' : '#999',
                }}
              >
                {notes || 'No notes yet.'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {report && (
        <Card title="Evaluation Report" className="mb-4">
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666' }}>Score</p>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{report.score != null ? `${report.score}/5.0` : '—'}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666' }}>Legitimacy</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{report.legitimacy}</p>
              </div>
            </div>
          </div>

          {report.markdown_content && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3>Full Report</h3>
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '500px',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              >
                {report.markdown_content}
              </div>
            </div>
          )}

          {report.pdf_path && (
            <div style={{ marginTop: '1.5rem' }}>
              <Button
                variant="secondary"
                onClick={() => window.open(report.pdf_path, '_blank')}
              >
                Download PDF
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
