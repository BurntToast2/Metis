import { useState, FormEvent } from 'react';
import type { ManualSearchResult } from '../../../shared/types/search';
import './SearchPage.css';

interface SearchPageProps {
  onOpenResult: (cmmId: number, title: string, page: number) => void;
}

export function SearchPage({ onOpenResult }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManualSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await window.api.searchManuals(trimmed);
      setResults(res);
      setHasSearched(true);
    } catch (err) {
      console.error('searchManuals failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="search-page">
      <h2 className="search-page__title">Search Manuals</h2>

      <form className="search-page__form" onSubmit={runSearch}>
        <input
          type="text"
          placeholder="Search by part number, word, or phrase..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-page__input"
        />
        <button type="submit" className="search-page__submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="search-page__error">{error}</p>}

      {hasSearched && !isSearching && results.length === 0 && !error && (
        <p className="search-page__empty">No matches found for "{query}".</p>
      )}

      <div className="search-page__results">
        {results.map((result) => (
          <div key={result.cmmId} className="search-page__result-group">
            <div className="search-page__result-header">
              <h3>{result.title}</h3>
              {result.cmmNumber && (
                <span className="search-page__result-cmm-number">{result.cmmNumber}</span>
              )}
            </div>
            <ul className="search-page__matches">
              {result.matches.map((m) => (
                <li key={m.page}>
                  <button
                    className="search-page__match"
                    onClick={() => onOpenResult(result.cmmId, result.title, m.page)}
                  >
                    <span className="search-page__match-page">p. {m.page}</span>
                    <span className="search-page__match-snippet">{m.snippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}