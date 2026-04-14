'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { onboardingAPI } from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<any>(null);

  // Step 1: CV
  const [cvText, setCvText] = useState('');

  // Step 2: Profile
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    timezone: '',
    target_roles: '',
    compensation_target: '',
    headline: '',
  });

  // Step 3: Article digest
  const [articleDigest, setArticleDigest] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
      return;
    }

    fetchStatus();
  }, [router]);

  const fetchStatus = async () => {
    try {
      const res = await onboardingAPI.getStatus();
      setStatus(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching onboarding status:', err);
      setLoading(false);
    }
  };

  const handleSaveCV = async () => {
    setError('');
    if (!cvText.trim()) {
      setError('Please paste your CV');
      return;
    }

    try {
      await onboardingAPI.saveCv(cvText);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save CV');
    }
  };

  const handleSaveProfile = async () => {
    setError('');
    if (!profile.full_name || !profile.email) {
      setError('Name and email are required');
      return;
    }

    try {
      await onboardingAPI.saveProfile(profile);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    }
  };

  const handleSaveDigest = async () => {
    setError('');
    try {
      await onboardingAPI.saveArticleDigest(articleDigest);
      await onboardingAPI.complete();
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (status?.all_done) {
    return (
      <div>
        <h1>Onboarding Complete</h1>
        <Card>
          <p style={{ marginBottom: '1rem' }}>You've already completed onboarding!</p>
          <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1>Get Started with Career-Ops</h1>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: s <= step ? '#0066cc' : '#e0e0e0',
              color: s <= step ? 'white' : '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {step === 1 && (
        <Card title="Step 1: Upload Your CV" className="mt-4">
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Paste your CV or describe your experience. We'll use this to match you with roles.
          </p>
          <div className="form-group">
            <label className="form-label">Your CV (Markdown or Plain Text)</label>
            <textarea
              className="form-input"
              rows={12}
              placeholder="## Experience

**Software Engineer** at Company X (2020-2023)
- Built backend services in Go
- Managed team of 3 engineers

## Education
Bachelor's in Computer Science"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="primary" onClick={handleSaveCV}>
              Next Step →
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 2: Complete Your Profile" className="mt-4">
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Tell us about yourself and what roles you're targeting.
          </p>

          <div className="grid grid-3 gap-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
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
                placeholder="e.g., San Francisco, CA"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., America/Los_Angeles"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Salary</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., 150K-200K USD"
                value={profile.compensation_target}
                onChange={(e) => setProfile({ ...profile, compensation_target: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Target Roles (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Senior Backend Engineer, Staff Engineer"
              value={profile.target_roles}
              onChange={(e) => setProfile({ ...profile, target_roles: e.target.value })}
            />
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Professional Headline</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., AI Engineer | ML Systems | Python & Go"
              value={profile.headline}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button variant="primary" onClick={handleSaveProfile}>
              Next Step →
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 3: Proof Points (Optional)" className="mt-4">
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Add any proof points or articles you want to highlight (optional). You can skip this.
          </p>

          <div className="form-group">
            <label className="form-label">Proof Points / Article Digest</label>
            <textarea
              className="form-input"
              rows={8}
              placeholder="## Published Articles
- Article title (link)

## Open Source Projects
- Project name (link)

## Speaking
- Conference talk (link)"
              value={articleDigest}
              onChange={(e) => setArticleDigest(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button variant="primary" onClick={handleSaveDigest}>
              Complete Setup →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
