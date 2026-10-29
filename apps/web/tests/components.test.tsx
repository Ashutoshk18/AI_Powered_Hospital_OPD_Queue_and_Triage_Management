/**
 * Frontend Component Tests — apps/web/tests/components.test.tsx
 *
 * Tests TriageBadge, StatusBadge, and LoginPage form behavior.
 * Uses Vitest + React Testing Library with jsdom.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/api/client', () => ({
  api: {
    login: vi.fn(),
    getMe: vi.fn(),
    getDepartments: vi.fn(),
    getAppointments: vi.fn(),
    getMyTokenStatus: vi.fn(),
  },
  apiRequest: vi.fn(),
  getAuthHeaders: vi.fn(() => ({})),
}));

// ─── TriageBadge Tests ─────────────────────────────────────────────────────────
// TriageBadge renders "Tier N" by default (showDetails=false).

import { TriageBadge } from '../src/components/TriageBadge';

describe('TriageBadge', () => {
  it.each([1, 2, 3, 4, 5])('renders "Tier %i" token text', (tier) => {
    render(<TriageBadge tier={tier} />);
    expect(screen.getByText(`Tier ${tier}`)).toBeInTheDocument();
  });

  it('applies red background for Tier 1', () => {
    const { container } = render(<TriageBadge tier={1} />);
    expect(container.firstChild).toHaveClass('bg-red-600');
  });

  it('applies orange background for Tier 2', () => {
    const { container } = render(<TriageBadge tier={2} />);
    expect(container.firstChild).toHaveClass('bg-orange-500');
  });

  it('applies amber background for Tier 3', () => {
    const { container } = render(<TriageBadge tier={3} />);
    expect(container.firstChild).toHaveClass('bg-amber-400');
  });

  it('applies blue background for Tier 4', () => {
    const { container } = render(<TriageBadge tier={4} />);
    expect(container.firstChild).toHaveClass('bg-blue-100');
  });

  it('applies slate background for Tier 5', () => {
    const { container } = render(<TriageBadge tier={5} />);
    expect(container.firstChild).toHaveClass('bg-slate-100');
  });

  it('shows detailed label for Tier 1 when showDetails=true', () => {
    render(<TriageBadge tier={1} showDetails />);
    expect(screen.getByText('Tier 1 - Resuscitation')).toBeInTheDocument();
  });

  it('shows detailed label for Tier 2 when showDetails=true', () => {
    render(<TriageBadge tier={2} showDetails />);
    expect(screen.getByText('Tier 2 - Emergent')).toBeInTheDocument();
  });

  it('falls back to Tier 4 style for unknown tier value', () => {
    const { container } = render(<TriageBadge tier={99} />);
    // Falls back to configs[4]
    expect(container.firstChild).toHaveClass('bg-blue-100');
  });
});

// ─── StatusBadge Tests ─────────────────────────────────────────────────────────
// StatusBadge renders status.replace('_', ' ')

import { StatusBadge } from '../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders WAITING with amber class', () => {
    const { container } = render(<StatusBadge status="WAITING" />);
    expect(screen.getByText('WAITING')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-amber-100');
  });

  it('renders IN_CONSULTATION with underscores replaced by spaces', () => {
    render(<StatusBadge status="IN_CONSULTATION" />);
    expect(screen.getByText('IN CONSULTATION')).toBeInTheDocument();
  });

  it('renders COMPLETED with slate class', () => {
    const { container } = render(<StatusBadge status="COMPLETED" />);
    expect(container.firstChild).toHaveClass('bg-slate-100');
  });

  it('renders SCHEDULED with blue class', () => {
    const { container } = render(<StatusBadge status="SCHEDULED" />);
    expect(container.firstChild).toHaveClass('bg-blue-100');
  });

  it('renders CANCELLED with rose class', () => {
    const { container } = render(<StatusBadge status="CANCELLED" />);
    expect(container.firstChild).toHaveClass('bg-rose-100');
  });

  it('renders CALLED with purple class and animate-pulse', () => {
    const { container } = render(<StatusBadge status="CALLED" />);
    expect(container.firstChild).toHaveClass('bg-purple-100');
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders unknown status without crashing and uses gray fallback', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN STATUS')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-gray-100');
  });
});

// ─── LoginPage Tests ───────────────────────────────────────────────────────────
// LoginPage uses named export and pre-fills email/password; labels identify fields.

import { LoginPage } from '../src/features/auth/LoginPage';
import { AuthProvider } from '../src/context/AuthContext';
import { api } from '../src/api/client';

const renderWithAuth = (ui: React.ReactElement) =>
  render(<AuthProvider>{ui}</AuthProvider>);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getMe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No session'));
  });

  it('renders an email input field', () => {
    renderWithAuth(<LoginPage />);
    // The input is of type email
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the Sign In submit button', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders demo account quick-fill buttons', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /receptionist/i })).toBeInTheDocument();
  });

  it('shows error message when login fails', async () => {
    (api.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid email or password')
    );

    renderWithAuth(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('calls api.login when form is submitted', async () => {
    (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'test-token',
      user: { id: '1', fullName: 'Test Admin', email: 'admin@opd.org', role: 'ADMIN' },
    });

    renderWithAuth(<LoginPage />);
    // Default email is admin@opd.org; just click Sign In
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalled();
    });
  });

  it('disables Sign In button while request is in-flight', async () => {
    (api.login as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderWithAuth(<LoginPage />);
    const btn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });
});
