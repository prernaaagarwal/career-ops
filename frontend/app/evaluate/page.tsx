'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreBadge from '@/components/ScoreBadge';
import { evaluationsAPI, applicationsAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';

export default function EvaluatePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);
  const [evaluationId, setEvaluationId] = useState('');

  const handleEvaluate = async () => {
    setError('');
    setReport(null);

    if (!url.trim() && !jdText.trim()) {
      setError('Please paste a job URL or job description');
      return;
    }

    setLoading(true);

    try {
      const response = await evaluationsAPI.evaluate({
        url: url.trim() || undefined,
        jd_text: jdText.trim() || undefined,
      });

      setEvaluationId(response.data.id);
      setReport(response.data.report);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to evaluate');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTracker = async () => {
    if (!report) return;

    try {
      await applicationsAPI.create({
        company: report.company,
        role: report.role,
        score: report.score,
        url: url || report.url,
        status: 'Evaluated',
        notes: `Score: ${report.score}/5 (${report.archetype})`,
      });

      setUrl('');
      setJdText('');
      setReport(null);
      setEvaluationId('');
      alert('Added to tracker!');
      router.push('/tracker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add to tracker');
    }
  };

  return (
    <div>
      <h1>Evaluate Job Offer</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {!report && (
        <Card title="Paste Job Details" className="mt-4">
          <div className="form-group">
            <label className="form-label">Job URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">OR paste job description</label>
            <textarea
              className="form-input"
              rows={10}
              placeholder="Paste the full job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            variant="primary"
            onClick={handleEvaluate}
            disabled={loading}
            style={{ minWidth: '200px' }}
          >
            {loading ? 'Evaluating...' : 'Evaluate Offer'}
          </Button>
        </Card>
      )}

      {loading && (
        <Card className="mt-4">
          <div className="flex flex-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '1rem' }}>
            <div className="spinner"></div>
            <p>Analyzing job description...</p>
          </div>
        </Card>
      )}

      {report && !loading && (
        <div>
          <Card title="Evaluation Report" className="mt-4">
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0' }}>{report.role}</h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '1.1rem' }}>
                    <strong>{report.company}</strong>
                  </p>
                </div>
                <ScoreBadge score={report.score} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Archetype</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{report.archetype || 'N/A'}</p>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Legitimacy</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{report.legitimacy || 'High Confidence'}</p>
                </div>

                {report.comp_range && (
                  <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Comp Range</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{report.comp_range}</p>
                  </div>
                )}
              </div>
            </div>

            {report.markdown_content && (
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
                <h3>Full Report</h3>
                <div
                  style={{
                    backgroundColor: '#f9f9f9',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '400px',
                    fontSize: '0.95rem',
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

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" onClick={() => router.push('/tracker')}>
                View in Tracker
              </Button>
              <Button variant="secondary" onClick={() => { setReport(null); setUrl(''); setJdText(''); }}>
                Evaluate Another
              </Button>
              {report.score !== null && report.score < 4 && (
                <p style={{ color: '#d32f2f', margin: 0, fontSize: '0.9rem' }}>
                  ⚠️ Score below 4.0 — only apply if you have specific reasons
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
