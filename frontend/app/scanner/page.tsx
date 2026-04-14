'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { scannerAPI, applicationsAPI } from '@/utils/api';

interface Job {
  id: number;
  url: string;
  company: string;
  title: string;
  api_source: string;
  scan_date: string;
  status: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    company: '',
    source: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await scannerAPI.getJobs({
        company: filters.company,
        source: filters.source,
      });
      setJobs(res.data.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setError('');
    setScanning(true);

    try {
      await scannerAPI.scan();
      // Refetch jobs after scan completes
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleAddToPipeline = async (jobId: number, job: Job) => {
    try {
      await scannerAPI.addToPipeline(jobId);
      // Create application entry
      await applicationsAPI.create({
        company: job.company,
        role: job.title,
        url: job.url,
        status: 'Evaluated',
      });
      // Remove from list
      setJobs(jobs.filter((j) => j.id !== jobId));
      alert('Added to pipeline!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add to pipeline');
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      (!filters.company || job.company.toLowerCase().includes(filters.company.toLowerCase())) &&
      (!filters.source || job.api_source === filters.source)
  );

  return (
    <div>
      <h1>Scanner</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Scan Job Portals" className="mt-4">
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>
          Scan pre-configured job portals for new openings matching your target roles.
        </p>

        <Button
          variant="primary"
          onClick={handleScan}
          disabled={scanning}
          style={{ minWidth: '200px' }}
        >
          {scanning ? 'Scanning...' : '🔍 Scan Portals'}
        </Button>

        {scanning && (
          <div style={{ marginTop: '1rem' }}>
            <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              Searching Greenhouse, Ashby, Lever APIs...
            </p>
          </div>
        )}
      </Card>

      {!scanning && filteredJobs.length > 0 && (
        <Card title={`Jobs Found (${filteredJobs.length})`} className="mt-4">
          <div className="grid grid-3 gap-2 mb-3">
            <div className="form-group">
              <label className="form-label">Filter by Company</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Google..."
                value={filters.company}
                onChange={(e) => {
                  setFilters({ ...filters, company: e.target.value });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Filter by Source</label>
              <select
                className="form-select"
                value={filters.source}
                onChange={(e) => {
                  setFilters({ ...filters, source: e.target.value });
                }}
              >
                <option value="">All Sources</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="ashby">Ashby</option>
                <option value="lever">Lever</option>
                <option value="websearch">Web Search</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '1rem',
                  backgroundColor: '#fafafa',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{job.title}</h4>
                <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                  <strong>{job.company}</strong>
                </p>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#999' }}>
                  {job.api_source} • {job.scan_date}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddToPipeline(job.id, job)}
                  >
                    Add to Pipeline
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(job.url, '_blank')}
                  >
                    View JD
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!scanning && filteredJobs.length === 0 && jobs.length > 0 && (
        <Card className="mt-4">
          <p style={{ color: '#666', textAlign: 'center' }}>No jobs match your filters.</p>
        </Card>
      )}

      {!scanning && jobs.length === 0 && (
        <Card className="mt-4">
          <p style={{ color: '#666', textAlign: 'center' }}>
            No jobs found. Click "Scan Portals" to search for new openings.
          </p>
        </Card>
      )}
    </div>
  );
}
