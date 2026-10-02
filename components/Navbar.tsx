'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Нүүр', href: '/' },
  { label: 'Кино сан', href: '/movies' },
  { label: 'Хөтөлбөр', href: '/schedule' },
  { label: 'Санал', href: '/sanal' },
  { label: 'Бидний тухай', href: '/about' }
];

export function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const headerRef = useRef<HTMLElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setMobileOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <header
      ref={headerRef}
      className="nav-shell"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 180ms ease',
        background: scrolled || searchOpen ? 'rgba(9,9,9,0.92)' : 'rgba(9,9,9,0.2)',
        backdropFilter: scrolled || searchOpen ? 'blur(14px)' : 'none',
        borderBottom:
          scrolled || searchOpen ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent'
      }}
    >
      <div className="container nav-inner">
        <Link href="/" className="brand-logo" aria-label="Bantan TV">
          <img src="/logo.svg" alt="bantan tv" className="logo-img" />
        </Link>

        <nav className="nav-links hidden-mobile" aria-label="Үндсэн цэс">
          <ul>
            {navItems.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Хайх"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            ⌕
          </button>
          <Link href="/login" className="ghost-button hidden-mobile">
            НЭВТРЭХ
          </Link>
          <Link href="/live" className="live-button hidden-mobile">
            <span className="live-dot-red" aria-hidden="true" />
            ШУУД
          </Link>
          {/* Mobile: primary live always visible */}
          <Link href="/live" className="live-button mobile-only" aria-label="Шууд үзэх">
            <span className="live-dot-red" aria-hidden="true" />
            ШУУД
          </Link>
          <button
            ref={menuBtnRef}
            type="button"
            aria-label={mobileOpen ? 'Цэс хаах' : 'Цэс'}
            aria-expanded={mobileOpen}
            className="icon-button mobile-only"
            onClick={() => setMobileOpen((p) => !p)}
          >
            {mobileOpen ? '×' : '☰'}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="nav-search-bar">
          <div className="container">
            <form onSubmit={submitSearch} className="nav-search-form" role="search">
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Кино, цуврал, нэвтрүүлэг хайх..."
                aria-label="Хайлт"
              />
              <button type="submit" className="live-button">
                ХАЙХ
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setSearchOpen(false)}
                aria-label="Хайх хаах"
              >
                ХААХ
              </button>
            </form>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Цэс">
          <div className="container">
            <ul>
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/search" onClick={() => setMobileOpen(false)}>
                  Хайх
                </Link>
              </li>
              <li>
                <Link
                  href="/live"
                  className="live-button"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="live-dot-red" aria-hidden="true" />
                  ШУУД ҮЗЭХ
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
