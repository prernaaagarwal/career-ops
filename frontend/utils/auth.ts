// Auth utilities for token and session management

export interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  full_name: string | null;
}

// Get auth state from localStorage
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      token: null,
      userId: null,
      email: null,
      full_name: null,
    };
  }

  return {
    token: localStorage.getItem('token'),
    userId: localStorage.getItem('userId'),
    email: localStorage.getItem('email'),
    full_name: localStorage.getItem('full_name'),
  };
}

// Save auth state to localStorage
export function saveAuthState(data: {
  token: string;
  userId: string;
  email: string;
  full_name?: string;
}): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', data.userId);
  localStorage.setItem('email', data.email);
  if (data.full_name) {
    localStorage.setItem('full_name', data.full_name);
  }
}

// Clear auth state
export function clearAuthState(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  localStorage.removeItem('full_name');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const authState = getAuthState();
  return !!(authState.token && authState.userId);
}

// Get auth header for API requests
export function getAuthHeader(): Record<string, string> {
  const authState = getAuthState();
  if (!authState.token) {
    return {};
  }
  return {
    Authorization: `Bearer ${authState.token}`,
  };
}
