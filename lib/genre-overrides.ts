// Set a movie's genres here when the Google Sheet has no (or the wrong) genre.
// Key   = movie id: the last part of its /movie/<id> address (lowercase title with dashes).
// Value = genre slugs from lib/genres.ts (action, adventure, comedy, drama, romance, horror,
//         thriller, mystery, crime, sci-fi, fantasy, animation, family, documentary, history,
//         war, biography, musical). The first one is the main genre.
export const GENRE_OVERRIDES: Record<string, string[]> = {
  // 'midnight-run': ['action', 'comedy'],
  // 'late-night-with-the-devil': ['horror', 'thriller'],
};
