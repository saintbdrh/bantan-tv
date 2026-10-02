export default function MovieLoading() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Ачаалж байна">
      <div className="container" style={{ paddingTop: 100 }}>
        <div className="detail-hero skeleton-pulse" style={{ minHeight: 360 }} />
        <div className="skeleton-pulse" style={{ height: 24, width: '60%', borderRadius: 6, marginTop: 24 }} />
        <div className="skeleton-pulse" style={{ height: 16, width: '90%', borderRadius: 4, marginTop: 12 }} />
      </div>
    </div>
  );
}
