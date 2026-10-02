import { Movie } from '@/types';
import { MovieCard } from './MovieCard';

export function MovieRow({ movies }: { movies: Movie[] }) {
  return (
    <div className="movie-row">
      {movies.map((movie) => (
        <div key={movie.id} className="movie-row-item">
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
}
