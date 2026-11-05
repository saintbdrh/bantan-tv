import { SiteShell } from '@/components/SiteShell';
import { GamesHub } from '@/components/GamesHub';
import { TrailerCarousel } from '@/components/TrailerCarousel';
import { getMovies, moviesWithTrailers, withPosters } from '@/lib/movies';

export const metadata = {
  title: 'Тоглоом | Bantan TV',
  description: 'Өдрийн кино сорил, постер таавар, жанр, гарсан он болон санамж тоглоомуудаа тоглоорой.'
};

export default async function GamesPage() {
  const allMovies = await getMovies();
  const moviesWithPoster = withPosters(allMovies);
  const trailers = moviesWithTrailers(moviesWithPoster).slice(0, 8);
  const quizMovies = allMovies.map(({ title, description, genres, poster, year }) => ({
    title,
    description,
    genres,
    poster,
    year
  }));

  return (
    <SiteShell>
      <div className="container games-page">
        <GamesHub movies={quizMovies} />
      </div>
      {trailers.length > 0 && <TrailerCarousel movies={trailers} />}
    </SiteShell>
  );
}
