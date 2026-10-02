import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { EpgSection } from '@/components/EpgSection';
import { TrailerCarousel } from '@/components/TrailerCarousel';
import { getMovies, moviesWithTrailers, withPosters } from '@/lib/movies';

export default async function LivePage() {
  const movies = withPosters(await getMovies());
  const trailers = moviesWithTrailers(movies).slice(0, 12);

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">ШУУД</p>
          <h1 className="page-title">Шууд үзэх</h1>
          <p className="page-lead">Одоо гарч буй хөтөлбөр.</p>
        </div>
      </div>

      {trailers.length > 0 && <TrailerCarousel movies={trailers} />}

      <div className="container" style={{ marginTop: 24 }}>
        <div className="section-header">
          <h2 className="section-title">Хөтөлбөр</h2>
        </div>
        <EpgSection />
      </div>
    </SiteShell>
  );
}
