// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// next/link needs an app-router context we don't have in a unit test; render it
// as a plain anchor so we can assert on EmptyState's own behaviour.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import EmptyState from '@/components/EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No searches yet" description="Run one first." />);
    expect(screen.getByText('No searches yet')).toBeTruthy();
    expect(screen.getByText('Run one first.')).toBeTruthy();
  });

  it('renders a CTA link when both label and href are provided', () => {
    render(
      <EmptyState title="Empty" ctaLabel="Start searching" ctaHref="/" />
    );
    const link = screen.getByText('Start searching').closest('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/');
  });

  it('does not render a CTA when href is missing', () => {
    const { container } = render(
      <EmptyState title="Empty" ctaLabel="Start searching" />
    );
    expect(container.querySelector('a')).toBeNull();
  });

  it('omits the description paragraph when none is given', () => {
    render(<EmptyState title="Just a title" />);
    expect(screen.getByText('Just a title')).toBeTruthy();
    expect(screen.queryByText('Run one first.')).toBeNull();
  });
});
