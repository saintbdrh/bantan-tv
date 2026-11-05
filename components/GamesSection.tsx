'use client';

import Image from 'next/image';
import { useState } from 'react';
import { genreLabel } from '@/lib/genres';
import { canOptimize } from '@/lib/images';
import { Movie } from '@/types';

type GameMovie = Pick<Movie, 'id' | 'title' | 'localTitle' | 'description' | 'year' | 'genres' | 'poster' | 'backdrop'>;

type QuizQuestion = {
  prompt: string;
  answer: string;
  choices: string[];
  clue?: string;
};

function shuffle<T>(items: T[]): T[] {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makeChoices(values: string[], answer: string): string[] {
  const alternatives = Array.from(new Set(values.filter((value) => value !== answer)));
  return shuffle([answer, ...shuffle(alternatives).slice(0, 3)]);
}

function createQuestion(movies: GameMovie[]): QuizQuestion | null {
  const questions: QuizQuestion[] = [];

  const withYears = movies.filter((movie) => movie.year);
  withYears.forEach((movie) => {
    const years = Array.from(new Set(withYears.map((item) => item.year).filter((year): year is number => !!year)));
    if (years.length > 1) {
      questions.push({
        prompt: `${movie.title} кино хэдэн онд гарсан бэ?`,
        answer: String(movie.year),
        choices: makeChoices(years.map(String), String(movie.year)),
      });
    }
  });

  const withGenres = movies.filter((movie) => movie.genres.length > 0);
  const genres = Array.from(new Set(withGenres.flatMap((movie) => movie.genres.map(genreLabel))));
  if (genres.length > 1) {
    withGenres.forEach((movie) => {
      const answer = genreLabel(movie.genres[0]);
      questions.push({
        prompt: `${movie.title} киноны үндсэн төрөл аль вэ?`,
        answer,
        choices: makeChoices(genres, answer),
      });
    });
  }

  const withLocalTitles = movies.filter((movie) => movie.localTitle);
  const localTitles = Array.from(new Set(withLocalTitles.map((movie) => movie.localTitle).filter((title): title is string => !!title)));
  if (localTitles.length > 1) {
    withLocalTitles.forEach((movie) => {
      const answer = movie.localTitle;
      if (!answer) return;
      questions.push({
        prompt: `"${movie.title}" киноны монгол нэр аль вэ?`,
        answer,
        choices: makeChoices(localTitles, answer),
      });
    });
  }

  const withDescriptions = movies.filter((movie) => movie.description.length > 30);
  if (withDescriptions.length > 1) {
    withDescriptions.forEach((movie) => {
      questions.push({
        prompt: 'Энэ үйл явдал аль кинонд гардаг вэ?',
        answer: movie.title,
        choices: makeChoices(movies.map((item) => item.title), movie.title),
        clue: movie.description,
      });
    });
  }

  const validQuestions = questions.filter(
    (question) => question.choices.length > 1 && question.choices.includes(question.answer)
  );
  return validQuestions.length ? validQuestions[Math.floor(Math.random() * validQuestions.length)] : null;
}

function pickMovie(movies: GameMovie[]): GameMovie | null {
  return movies.length ? movies[Math.floor(Math.random() * movies.length)] : null;
}

function pickChoices(movies: GameMovie[], answer: GameMovie): GameMovie[] {
  return shuffle([
    answer,
    ...shuffle(movies.filter((movie) => movie.id !== answer.id)).slice(0, 3),
  ]);
}

function QuizGame({ movies }: { movies: GameMovie[] }) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    setQuestion(createQuestion(movies));
    setSelected(null);
  };

  const answer = (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);
    setAnswered((count) => count + 1);
    if (choice === question?.answer) setScore((count) => count + 1);
  };

  return (
    <article className="game-card">
      <div className="game-card-top">
        <span className="game-icon" aria-hidden="true">?</span>
        <span className="game-count">КИНО QUIZ</span>
      </div>
      <h3 className="game-card-title">Кино мэдлэгээ сорь</h3>
      <p className="game-card-copy">Киноны он, төрөл, монгол нэр, үйл явдлыг таагаарай.</p>
      <p className="game-score" aria-live="polite">Оноо: {score} / {answered}</p>

      {question ? (
        <div className="game-question">
          <p className="game-prompt">{question.prompt}</p>
          {question.clue && <p className="game-clue">{question.clue}</p>}
          <div className="game-choices">
            {question.choices.map((choice) => {
              const isCorrect = selected !== null && choice === question.answer;
              const isWrong = selected === choice && choice !== question.answer;
              return (
                <button
                  type="button"
                  className={`game-choice${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}`}
                  key={choice}
                  onClick={() => answer(choice)}
                  disabled={selected !== null}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="game-result" role="status">
              {selected === question.answer ? 'Зөв хариуллаа!' : `Зөв хариулт: ${question.answer}`}
            </div>
          )}
          {selected !== null && (
            <button type="button" className="game-action" onClick={start}>Дараагийн асуулт</button>
          )}
        </div>
      ) : started ? (
        <p className="game-result" role="status">Асуулт үүсгэхэд киноны мэдээлэл дутуу байна.</p>
      ) : (
        <button type="button" className="game-action" onClick={start}>Тоглож эхлэх</button>
      )}
    </article>
  );
}

function PosterGame({ movies }: { movies: GameMovie[] }) {
  const posterMovies = movies.filter((movie) => movie.poster || movie.backdrop);
  const [target, setTarget] = useState<GameMovie | null>(null);
  const [choices, setChoices] = useState<GameMovie[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const image = target?.poster || target?.backdrop || '';

  const start = () => {
    const next = pickMovie(posterMovies);
    setTarget(next);
    setChoices(next ? pickChoices(posterMovies, next) : []);
    setSelected(null);
  };

  const answer = (movieId: string) => {
    if (!target || selected !== null) return;
    setSelected(movieId);
    setAnswered((count) => count + 1);
    if (movieId === target.id) setScore((count) => count + 1);
  };

  return (
    <article className="game-card">
      <div className="game-card-top">
        <span className="game-icon" aria-hidden="true">🎬</span>
        <span className="game-count">ПОСТЕРООС ТАА</span>
      </div>
      <h3 className="game-card-title">Ямар кино вэ?</h3>
      <p className="game-card-copy">Постерыг хараад зөв киног сонгоорой.</p>
      <p className="game-score" aria-live="polite">Оноо: {score} / {answered}</p>

      {target ? (
        <div className="game-question">
          <div className={`game-poster${selected !== null ? ' is-revealed' : ''}`}>
            {image ? (
              <Image
                src={image}
                alt="Ямар кино болохыг таагаарай"
                fill
                sizes="(max-width: 700px) 80vw, 360px"
                unoptimized={!canOptimize(image)}
              />
            ) : <span>Постер олдсонгүй</span>}
          </div>
          <div className="game-choices">
            {choices.map((movie) => (
              <button
                type="button"
                className={`game-choice${selected !== null && movie.id === target.id ? ' is-correct' : ''}${selected === movie.id && movie.id !== target.id ? ' is-wrong' : ''}`}
                key={movie.id}
                onClick={() => answer(movie.id)}
                disabled={selected !== null}
              >
                {movie.title}
              </button>
            ))}
          </div>
          {selected !== null && (
            <div className="game-result" role="status">
              {selected === target.id ? 'Зөв таалаа!' : `Зөв хариулт: ${target.title}`}
            </div>
          )}
          {selected !== null && (
            <button type="button" className="game-action" onClick={start}>Дахин тоглох</button>
          )}
        </div>
      ) : (
        <button type="button" className="game-action" onClick={start} disabled={!posterMovies.length}>
          {posterMovies.length ? 'Тоглож эхлэх' : 'Постер алга байна'}
        </button>
      )}
    </article>
  );
}

export function GamesSection({ movies }: { movies: GameMovie[] }) {
  return (
    <section className="section" id="games">
      <div className="container">
        <div className="section-header">
          <div>
            <p className="eyebrow">BANTAN TV GAMES</p>
            <h2 className="section-title">Кинотой тоглоё</h2>
          </div>
        </div>
        <div className="games-grid">
          <QuizGame movies={movies} />
          <PosterGame movies={movies} />
        </div>
      </div>
    </section>
  );
}
