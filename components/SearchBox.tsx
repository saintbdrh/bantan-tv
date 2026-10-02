'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <form onSubmit={onSubmit} className="auth-field" style={{ maxWidth: 480 }}>
      <label htmlFor="search-q">Гарчиг эсвэл төрөл</label>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          id="search-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Жишээ: Midnight, драма..."
          style={{ flex: 1 }}
        />
        <button type="submit" className="live-button">
          ХАЙХ
        </button>
      </div>
    </form>
  );
}
