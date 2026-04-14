// Format number as currency
export function formatCurrency(value: number | string, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  });
  return formatter.format(num);
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date for input field
export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Get score color
export function getScoreColor(score: number | null): string {
  if (!score) return 'secondary';
  if (score >= 4.0) return 'excellent';
  if (score >= 3.0) return 'good';
  if (score >= 2.0) return 'fair';
  return 'poor';
}

// Get score label
export function getScoreLabel(score: number | null): string {
  if (!score) return 'No score';
  if (score >= 4.0) return 'Excellent';
  if (score >= 3.0) return 'Good';
  if (score >= 2.0) return 'Fair';
  return 'Poor';
}

// Get status color
export function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    'Evaluated': 'secondary',
    'Applied': 'primary',
    'Responded': 'info',
    'Interview': 'primary',
    'Offer': 'success',
    'Rejected': 'danger',
    'Discarded': 'secondary',
    'SKIP': 'warning',
  };
  return statusMap[status] || 'secondary';
}

// Normalize company name
export function normalizeCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parse JSON safely
export function parseJSON<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Pluralize
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || singular + 's';
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Check if all required fields are filled
export function isProfileComplete(candidate: any): boolean {
  return !!(
    candidate?.full_name &&
    candidate?.email &&
    candidate?.location &&
    candidate?.target_roles &&
    candidate?.compensation_target
  );
}
