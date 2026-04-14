'use client';

import { getScoreColor, getScoreLabel } from '@/utils/helpers';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (!score) {
    return <span className="badge badge-secondary">No score</span>;
  }

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className={`score-badge ${color}`} title={label}>
      {score.toFixed(1)}
    </div>
  );
}
