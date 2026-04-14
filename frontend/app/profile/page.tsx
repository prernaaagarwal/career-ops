'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { candidatesAPI } from '@/utils/api';
import { clearAuthState, getAuthState } from '@/utils/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    timezone: '',
    linkedin_url: '',
    portfolio_url: '',
    github_url: '',
    twitter_url: '',
    headline: '',
    exit_story: '',
    superpowers: '',
    target_roles: '',
    compensation_target: '',
    compensation_currency: 'USD',
  });

  const [cv, setCv] = useState('');
  const [showCvEditor, setShowCvEditor] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, cvRes] = await Promise.all([
        candidatesAPI.getProfile(),
        candidatesAPI.getCv(),
      ]);

      setProfile(profileRes.data);
      setCv(cvRes.data.cv_markdown || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');

    try {
      await candidatesAPI.updateProfile(profile);
      setSuccess('Profile saved!');
      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    }
  };

  const handleSaveCV = async () => {
    setError('');
    setSuccess('');

    if (!cv.trim()) {
      setError('CV cannot be empty');
      return;
    }

    try {
      await candidatesAPI.updateCv(cv);
      setSuccess('CV saved!');
      setShowCvEditor(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save CV');
    }
  };

  const handleLogout = () => {
    clearAuthState();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <h1>Settings</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <Card title="Your Profile" className="mt-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Contact Information</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {editMode ? (
          <div>
            <div className="grid grid-3 gap-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Timezone</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LinkedIn</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://linkedin.com/in/..."
                  value={profile.linkedin_url}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Portfolio</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={profile.portfolio_url}
                  onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={profile.github_url}
                  onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Twitter</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://twitter.com/..."
                  value={profile.twitter_url}
                  onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-3 gap-2 mt-3">
              <div className="form-group">
                <label className="form-label">Target Salary</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="150K-200K"
                  value={profile.compensation_target}
                  onChange={(e) => setProfile({ ...profile, compensation_target: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={profile.compensation_currency}
                  onChange={(e) => setProfile({ ...profile, compensation_currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Roles</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Backend Engineer, Staff Engineer"
                  value={profile.target_roles}
                  onChange={(e) => setProfile({ ...profile, target_roles: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group mt-3">
              <label className="form-label">Professional Headline</label>
              <input
                type="text"
                className="form-input"
                placeholder="AI Engineer | ML Systems | Python & Go"
                value={profile.headline}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Superpowers (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="ML deployment, team building, system design"
                value={profile.superpowers}
                onChange={(e) => setProfile({ ...profile, superpowers: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Career Narrative</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Tell your career story..."
                value={profile.exit_story}
                onChange={(e) => setProfile({ ...profile, exit_story: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button variant="primary" onClick={handleSaveProfile}>
                Save Changes
              </Button>
              <Button variant="secondary" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>Name</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{profile.full_name}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>Email</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{profile.email}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>Location</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{profile.location || '—'}</p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>Salary Target</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {profile.compensation_target} {profile.compensation_currency}
                </p>
              </div>
            </div>

            {profile.headline && (
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>Headline</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{profile.headline}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="CV" className="mt-4">
        <div style={{ marginBottom: '1rem' }}>
          <Button variant="secondary" onClick={() => setShowCvEditor(!showCvEditor)}>
            {showCvEditor ? 'Cancel' : 'Edit CV'}
          </Button>
        </div>

        {showCvEditor ? (
          <div>
            <textarea
              className="form-input"
              rows={15}
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="primary" onClick={handleSaveCV}>
                Save CV
              </Button>
              <Button variant="secondary" onClick={() => setShowCvEditor(false)}>
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
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {cv || 'No CV uploaded yet.'}
          </div>
        )}
      </Card>

      <Card title="Account" className="mt-4">
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Logged in as <strong>{profile.email}</strong>
          </p>

          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}
