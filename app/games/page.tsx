import { SiteShell } from '@/components/SiteShell';
import { GamesHub } from '@/components/GamesHub';
import { TrailerCarousel } from '@/components/TrailerCarousel';
import { getMovies, moviesWithTrailers, withPosters } from '@/lib/movies';

export const metadata = {
  title: 'Тоглоом | Bantan TV',
  description: 'Киноны асуулт, санамж тоглоом болон бусад богино тоглоомуудыг шууд тоглоорой.'
};

export default async function GamesPage() {
  const movies = withPosters(await getMovies());
  const trailers = moviesWithTrailers(movies).slice(0, 8);

  return (
    <SiteShell>
      <div className="container games-page">
        <GamesHub />
      </div>
      {trailers.length > 0 && <TrailerCarousel movies={trailers} />}
    </SiteShell>
  );
}
