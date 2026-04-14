'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { followUpsAPI, applicationsAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';

interface FollowUp {
  id: number;
  application_id: number;
  date: string;
  channel: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  company?: string;
  role?: string;
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [newFollowUp, setNewFollowUp] = useState({
    application_id: '',
    date: '',
    channel: 'email',
    contact_name: '',
    contact_email: '',
    notes: '',
  });

  useEffect(() => {
    fetchFollowUps();
    applicationsAPI.getAll(0, 100).then((res) => setApplications(res.data.data || [])).catch(() => {});
  }, [overdueOnly]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await followUpsAPI.getAll({
        overdue_only: overdueOnly,
      });
      setFollowUps(res.data.data || []);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFollowUp = async () => {
    setError('');

    if (!newFollowUp.application_id || !newFollowUp.date) {
      setError('Please select an application and date');
      return;
    }

    try {
      await followUpsAPI.create({
        application_id: parseInt(newFollowUp.application_id),
        date: newFollowUp.date,
        channel: newFollowUp.channel,
        contact_name: newFollowUp.contact_name,
        contact_email: newFollowUp.contact_email,
        notes: newFollowUp.notes,
      });

      setNewFollowUp({
        application_id: '',
        date: '',
        channel: 'email',
        contact_name: '',
        contact_email: '',
        notes: '',
      });
      setShowForm(false);
      await fetchFollowUps();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save follow-up');
    }
  };

  const handleDeleteFollowUp = async (id: number) => {
    if (!confirm('Delete this follow-up?')) return;

    try {
      await followUpsAPI.delete(id);
      await fetchFollowUps();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const overdue = followUps.filter((f) => new Date(f.date) < new Date());
  const upcoming = followUps.filter((f) => new Date(f.date) >= new Date());

  return (
    <div>
      <h1>Follow-ups</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Follow-up'}
        </Button>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          <span style={{ color: '#666' }}>Show overdue only</span>
        </label>
      </div>

      {showForm && (
        <Card title="Add Follow-up" className="mb-4">
          <div className="grid grid-3 gap-2">
            <div className="form-group">
              <label className="form-label">Application *</label>
              <select
                className="form-select"
                value={newFollowUp.application_id}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, application_id: e.target.value })}
              >
                <option value="">Select application...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    #{app.num} — {app.company} ({app.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Follow-up Date *</label>
              <input
                type="date"
                className="form-input"
                value={newFollowUp.date}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <select
                className="form-select"
                value={newFollowUp.channel}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="linkedin">LinkedIn</option>
                <option value="phone">Phone</option>
                <option value="portal">Portal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., John Smith"
                value={newFollowUp.contact_name}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, contact_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                value={newFollowUp.contact_email}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, contact_email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Mentioned in first interview"
                value={newFollowUp.notes}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
              />
            </div>
          </div>

          <Button variant="primary" onClick={handleSaveFollowUp} style={{ marginTop: '1rem' }}>
            Save Follow-up
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-center" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <Card title={`Overdue (${overdue.length})`} className="mb-4">
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                ⚠️ These follow-ups are overdue. Reach out soon!
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Company/Role</th>
                    <th>Channel</th>
                    <th>Contact</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((fu) => (
                    <tr key={fu.id}>
                      <td style={{ color: '#d32f2f' }}>
                        <strong>{formatDate(fu.date)}</strong>
                      </td>
                      <td>
                        {fu.company} — {fu.role}
                      </td>
                      <td>{fu.channel}</td>
                      <td>
                        {fu.contact_name && <div>{fu.contact_name}</div>}
                        {fu.contact_email && <div style={{ fontSize: '0.85rem', color: '#666' }}>{fu.contact_email}</div>}
                      </td>
                      <td>{fu.notes}</td>
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteFollowUp(fu.id)}
                        >
                          Done
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card title={`Upcoming (${upcoming.length})`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Company/Role</th>
                    <th>Channel</th>
                    <th>Contact</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((fu) => (
                    <tr key={fu.id}>
                      <td>
                        <strong>{formatDate(fu.date)}</strong>
                      </td>
                      <td>
                        {fu.company} — {fu.role}
                      </td>
                      <td>{fu.channel}</td>
                      <td>
                        {fu.contact_name && <div>{fu.contact_name}</div>}
                        {fu.contact_email && <div style={{ fontSize: '0.85rem', color: '#666' }}>{fu.contact_email}</div>}
                      </td>
                      <td>{fu.notes}</td>
                      <td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteFollowUp(fu.id)}
                        >
                          Done
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {followUps.length === 0 && (
            <Card>
              <p style={{ textAlign: 'center', color: '#666' }}>No follow-ups scheduled. Add one to stay on top of your pipeline!</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
