const OPTIONS = [
  'Телевизийн сурталчилгаа',
  'Хөтөлбөрийн ивээн тэтгэлт',
  'Киноны сурталчилгаа',
  'Дижитал контент',
];

export function PartnerBanner() {
  return (
    <div className="partner-banner">
      <div className="partner-copy">
        <h2 className="partner-title">Хамтран ажиллах</h2>
        <p className="partner-lead">
          Хамтран ажиллах хүсэлтэй бол доорх хаягаар холбогдоорой.
        </p>
        <div className="partner-contacts">
          <a href="mailto:binge@bantan.tv" className="partner-contact-btn" aria-label="Имэйл">
            <span className="partner-contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </span>
            binge@bantan.tv
          </a>
          <a href="tel:+97677046868" className="partner-contact-btn partner-contact-btn-outline" aria-label="Утас">
            <span className="partner-contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6.5 4.5h3l1.5 4-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.7 2 2 0 0 1 6.5 4.5z" />
              </svg>
            </span>
            7704-6868
          </a>
        </div>
      </div>
      <div className="partner-grid">
        {OPTIONS.map((item) => (
          <div key={item} className="partner-chip">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
