export default function CategoryLoading() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Ачаалж байна">
      <div className="container" style={{ paddingTop: 100 }}>
        <div className="page-hero">
          <div className="skeleton-pulse" style={{ height: 40, width: 180, borderRadius: 6 }} />
        </div>
        <div className="movie-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="movie-card">
              <article>
                <div className="movie-card-media skeleton-pulse" />
              </article>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
