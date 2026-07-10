// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import NewsCard from '@/components/NewsCard';
import type { NewsArticle } from '@/lib/supabase';

afterEach(cleanup);

const baseArticle: NewsArticle = {
  title: 'Breaking: Something Happened',
  url: 'https://news.example.com/story/123',
  source: 'news.example.com',
  date: '2025-06-01T12:00:00.000Z',
  description: 'A short description.',
  ai_summary: 'An AI-written two sentence summary of the article.',
};

describe('NewsCard', () => {
  it('renders the title, summary, and source', () => {
    render(<NewsCard article={baseArticle} />);
    expect(screen.getByText('Breaking: Something Happened')).toBeTruthy();
    expect(
      screen.getByText('An AI-written two sentence summary of the article.')
    ).toBeTruthy();
    expect(screen.getByText('news.example.com')).toBeTruthy();
  });

  it('links to the article and opens it safely in a new tab', () => {
    const { container } = render(<NewsCard article={baseArticle} />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
    // Every external link must be rel="noopener noreferrer" + target=_blank
    // to prevent reverse-tabnabbing — a real security property.
    links.forEach((a) => {
      expect(a.getAttribute('href')).toBe(baseArticle.url);
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it('exposes an accessible "open in new tab" control', () => {
    render(<NewsCard article={baseArticle} />);
    expect(
      screen.getByLabelText('Open article in new tab')
    ).toBeTruthy();
  });

  it('omits the date element when no date is present', () => {
    const { container } = render(
      <NewsCard article={{ ...baseArticle, date: null }} />
    );
    expect(container.querySelector('time')).toBeNull();
  });

  it('renders a <time> with a dateTime attribute when a date is present', () => {
    const { container } = render(<NewsCard article={baseArticle} />);
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('dateTime')).toBe(baseArticle.date);
  });
});
