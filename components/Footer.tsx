import Link from 'next/link';

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M14 8.2h2.2V5H14c-2.1 0-3.6 1.4-3.6 3.7V11H8.2v3.2h2.2V21h3.3v-6.8h2.4l.6-3.2h-3V9.1c0-.6.3-.9.9-.9z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 4.5h3l1.5 4-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.7 2 2 0 0 1 6.5 4.5z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

const SOCIAL = [
  { label: 'Facebook', href: 'https://www.facebook.com/bantantv.mn', Icon: IconFacebook },
  { label: 'Instagram', href: 'https://www.instagram.com/bantantv.mn/', Icon: IconInstagram },
  { label: 'Утас 7704-6868', href: 'tel:+97677046868', Icon: IconPhone },
  { label: 'Имэйл binge@bantan.tv', href: 'mailto:binge@bantan.tv', Icon: IconMail },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Link href="/" aria-label="Bantan TV">
          <img src="/logo.svg" alt="bantan tv" className="logo-img logo-img-sm" />
        </Link>
        <nav aria-label="Хөлийн цэс" className="footer-nav">
          <Link href="/">Нүүр</Link>
          <Link href="/movies">Кино сан</Link>
          <Link href="/schedule">Хөтөлбөр</Link>
          <Link href="/sanal">Санал</Link>
          <Link href="/about">Бидний тухай</Link>
          <Link href="/advertise">Сурталчилгаа</Link>
        </nav>
        <div className="footer-social" aria-label="Холбоо барих">
          {SOCIAL.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noreferrer' : undefined}
              className="social-icon"
              aria-label={label}
              title={label}
            >
              <Icon />
            </a>
          ))}
        </div>
        <div className="footer-contact">
          <a href="tel:+97677046868" className="footer-phone">7704-6868</a>
          <span className="footer-contact-sep" aria-hidden="true">·</span>
          <a href="mailto:binge@bantan.tv" className="footer-phone">binge@bantan.tv</a>
        </div>
        <div className="footer-copy">© 2026 Bantan TV</div>
      </div>
    </footer>
  );
}
