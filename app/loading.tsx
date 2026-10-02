export default function HomeLoading() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Ачаалж байна">
      <div className="hero-section skeleton-pulse" style={{ minHeight: 420 }} />
      <div className="container section">
        <div className="now-playing-panel skeleton-pulse" style={{ minHeight: 120 }} />
      </div>
      <div className="container section">
        <div className="movie-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="movie-row-item">
              <div className="movie-card">
                <article>
                  <div className="movie-card-media skeleton-pulse" />
                </article>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
