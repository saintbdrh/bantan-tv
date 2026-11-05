import type { Movie } from '@/types';

/** Age rating, IMDb score and year, e.g. [+12] ★ 7.4 IMDb · 2023 */
export function MovieMeta({
  movie,
  extra = [],
  className = '',
}: {
  movie: Pick<Movie, 'ageRating' | 'imdb' | 'year'>;
  /** More items after the year, e.g. genre names */
  extra?: string[];
  className?: string;
}) {
  const hasAny = movie.ageRating || movie.imdb || movie.year || extra.length;
  if (!hasAny) return null;
  return (
    <div className={`movie-meta ${className}`.trim()}>
      {movie.ageRating && (
        <span className="age-badge" title="Насны ангилал">
          {movie.ageRating}
        </span>
      )}
      {movie.imdb ? (
        <span className="imdb-score" title="IMDb үнэлгээ">
          <span aria-hidden="true">★</span> {movie.imdb.toFixed(1)} <span className="imdb-label">IMDb</span>
        </span>
      ) : null}
      {movie.year ? <span>{movie.year}</span> : null}
      {extra.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
