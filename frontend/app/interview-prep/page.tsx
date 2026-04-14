'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { storyBankAPI, interviewPrepAPI } from '@/utils/api';

interface Story {
  id: number;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
}

interface CompanyPrep {
  company_name: string;
  company_slug: string;
  company_research: string;
  recommended_stories: number[];
  red_flags: string;
}

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<'stories' | 'company'>('stories');
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Story form
  const [showNewStory, setShowNewStory] = useState(false);
  const [newStory, setNewStory] = useState({
    title: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    tags: '',
  });

  // Company prep
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companySlugInput, setCompanySlugInput] = useState('');
  const [companyPrep, setCompanyPrep] = useState<CompanyPrep | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await storyBankAPI.getAll();
      setStories(res.data.stories || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStory = async () => {
    setError('');
    if (!newStory.title || !newStory.situation || !newStory.action || !newStory.result) {
      setError('Please fill in title, situation, action, and result');
      return;
    }

    try {
      await storyBankAPI.create({
        title: newStory.title,
        situation: newStory.situation,
        task: newStory.task,
        action: newStory.action,
        result: newStory.result,
        tags: newStory.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      setNewStory({
        title: '',
        situation: '',
        task: '',
        action: '',
        result: '',
        tags: '',
      });
      setShowNewStory(false);
      await fetchStories();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save story');
    }
  };

  const handleLoadCompanyPrep = async () => {
    const slug = companySlugInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) return;
    setCompanyLoading(true);
    try {
      const res = await interviewPrepAPI.getPrep(slug);
      setCompanyPrep(res.data);   // null means no prep saved yet — backend returns null not 404
      setSelectedCompany(slug);
    } catch (err) {
      setCompanyPrep(null);
      setSelectedCompany(slug);
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div>
      <h1>Interview Prep</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setTab('stories')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'stories' ? '3px solid #0066cc' : 'none',
            color: tab === 'stories' ? '#0066cc' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Story Bank
        </button>
        <button
          onClick={() => setTab('company')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'company' ? '3px solid #0066cc' : 'none',
            color: tab === 'company' ? '#0066cc' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Company Prep
        </button>
      </div>

      {tab === 'stories' && (
        <div>
          <Button variant="primary" onClick={() => setShowNewStory(!showNewStory)} style={{ marginBottom: '1.5rem' }}>
            {showNewStory ? 'Cancel' : '+ Add STAR Story'}
          </Button>

          {showNewStory && (
            <Card title="Add New Story" className="mb-4">
              <div className="form-group">
                <label className="form-label">Story Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Led migration to microservices"
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Situation *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="What was the context?"
                  value={newStory.situation}
                  onChange={(e) => setNewStory({ ...newStory, situation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Task</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="What were you responsible for?"
                  value={newStory.task}
                  onChange={(e) => setNewStory({ ...newStory, task: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Action *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="What did you do?"
                  value={newStory.action}
                  onChange={(e) => setNewStory({ ...newStory, action: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Result *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="What was the impact? (with metrics)"
                  value={newStory.result}
                  onChange={(e) => setNewStory({ ...newStory, result: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., leadership, technical, impact"
                  value={newStory.tags}
                  onChange={(e) => setNewStory({ ...newStory, tags: e.target.value })}
                />
              </div>

              <Button variant="primary" onClick={handleSaveStory}>
                Save Story
              </Button>
            </Card>
          )}

          {loading ? (
            <div className="flex flex-center" style={{ minHeight: '300px' }}>
              <div className="spinner"></div>
            </div>
          ) : stories.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: '#666' }}>No stories yet. Add your first STAR story!</p>
            </Card>
          ) : (
            <div>
              {stories.map((story) => (
                <Card key={story.id} className="mb-3">
                  <h3 style={{ margin: '0 0 1rem 0' }}>{story.title}</h3>

                  {story.tags.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {story.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {story.situation && (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Situation</p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{story.situation}</p>
                      </div>
                    )}

                    {story.action && (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Action</p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{story.action}</p>
                      </div>
                    )}

                    {story.result && (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Result</p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{story.result}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'company' && (
        <div>
          <Card className="mb-4">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Google, Meta, OpenAI..."
                  value={companySlugInput}
                  onChange={(e) => setCompanySlugInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadCompanyPrep()}
                />
                <Button variant="primary" onClick={handleLoadCompanyPrep} disabled={companyLoading}>
                  {companyLoading ? 'Loading...' : 'Load'}
                </Button>
              </div>
            </div>
          </Card>

          {companyPrep && (
            <div>
              <Card title={`Interview Prep: ${companyPrep.company_name}`} className="mb-4">
                {companyPrep.company_research && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3>Company Research</h3>
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: '1rem',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {companyPrep.company_research}
                    </div>
                  </div>
                )}

                {companyPrep.recommended_stories && companyPrep.recommended_stories.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3>Recommended Stories</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {stories
                        .filter((s) => companyPrep.recommended_stories.includes(s.id))
                        .map((story) => (
                          <div key={story.id} style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{story.title}</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>{story.result}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {companyPrep.red_flags && (
                  <div>
                    <h3>Red Flags & Questions</h3>
                    <div
                      style={{
                        backgroundColor: '#fff3cd',
                        padding: '1rem',
                        borderRadius: '4px',
                        borderLeft: '4px solid #ffc107',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {companyPrep.red_flags}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {!companyPrep && selectedCompany && (
            <Card>
              <p style={{ textAlign: 'center', color: '#666' }}>No prep data for this company yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
