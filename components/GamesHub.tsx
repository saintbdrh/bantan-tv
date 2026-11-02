'use client';

import { FormEvent, useEffect, useState } from 'react';

type ChoiceGameId = 'quiz' | 'emoji' | 'truefalse';
type GameId = ChoiceGameId | 'memory' | 'scramble';
type Question = {
  question: string;
  answers: string[];
  correct: number;
  clue?: string;
};
type MemoryCard = {
  id: number;
  pair: number;
  symbol: string;
};

const quizQuestions: Question[] = [
  {
    question: 'Киноны үйл явдал өрнөж буй газар, цаг үеийг юу гэж нэрлэдэг вэ?',
    answers: ['Орчин', 'Дүр', 'Кадр', 'Эвлүүлэг'],
    correct: 0
  },
  {
    question: 'Киноны хэсгүүдийг дараалуулан нэгтгэдэг ажлыг юу гэдэг вэ?',
    answers: ['Зураг авалт', 'Эвлүүлэг', 'Дуу оруулалт', 'Гэрэлтүүлэг'],
    correct: 1
  },
  {
    question: 'Киноны гол дүрийг бүтээж буй хүнийг юу гэдэг вэ?',
    answers: ['Зураглаач', 'Найруулагч', 'Жүжигчин', 'Зохиолч'],
    correct: 2
  },
  {
    question: 'Киноны яриа болон хөгжмөөс тусад нь бичсэн орчны дууг юу гэдэг вэ?',
    answers: ['Эффект дуу', 'Субтитр', 'Постер', 'Трейлер'],
    correct: 0
  },
  {
    question: 'Киноны товч танилцуулга, үзүүлбэрийг юу гэж нэрлэдэг вэ?',
    answers: ['Кредит', 'Трейлер', 'Сценари', 'Премьера'],
    correct: 1
  },
  {
    question: 'Киноны зургийг авч, кадрын зохиомжийг хариуцдаг мэргэжилтэн хэн бэ?',
    answers: ['Зураглаач', 'Продюсер', 'Эвлүүлэгч', 'Хөгжмийн зохиолч'],
    correct: 0
  },
  {
    question: 'Кино эхлэхийн өмнө гардаг нэр, уран бүтээлчдийн жагсаалтыг юу гэдэг вэ?',
    answers: ['Трейлер', 'Эхлэл кредит', 'Субтитр', 'Синопсис'],
    correct: 1
  },
  {
    question: 'Киноны үйл явдлыг бичгээр дүрсэлсэн эхийг юу гэдэг вэ?',
    answers: ['Постер', 'Сценари', 'Кадр', 'Трейлер'],
    correct: 1
  },
  {
    question: 'Киноны дууг бичиж, цэвэр сонсогдохыг хариуцдаг багийн үүрэг аль вэ?',
    answers: ['Дууны баг', 'Хувцасны баг', 'Зураглаачийн баг', 'Нүүр хувиргалтын баг'],
    correct: 0
  },
  {
    question: 'Киноны камерын нэг ширхэг хөдөлгөөнгүй зургийг юу гэдэг вэ?',
    answers: ['Кадр', 'Жанр', 'Кредит', 'Постер'],
    correct: 0
  },
  {
    question: 'Киноны дүр, үйл явдлыг хөгжим болон дуугаар баяжуулахыг юу гэдэг вэ?',
    answers: ['Дууны найруулга', 'Өнгө засалт', 'Зохиол', 'Кастинг'],
    correct: 0
  },
  {
    question: 'Киноны дүрд тохирох жүжигчнийг сонгон шалгаруулахыг юу гэдэг вэ?',
    answers: ['Кастинг', 'Эвлүүлэг', 'Дубляж', 'Нээлт'],
    correct: 0
  }
];

const emojiQuestions: Question[] = [
  { question: 'Эможи тааврыг тайлаарай', clue: '🎬 + 📖', answers: ['Кино зохиол', 'Кино постер', 'Кино театр', 'Трейлер'], correct: 0 },
  { question: 'Эможи тааврыг тайлаарай', clue: '✂️ + 🎞️', answers: ['Эвлүүлэг', 'Зураг авалт', 'Кастинг', 'Дуу оруулалт'], correct: 0 },
  { question: 'Эможи тааврыг тайлаарай', clue: '🎥 + 💡', answers: ['Гэрэлтүүлэг', 'Субтитр', 'Продюсер', 'Кредит'], correct: 0 },
  { question: 'Эможи тааврыг тайлаарай', clue: '🎼 + 🎬', answers: ['Киноны хөгжим', 'Кино зураг', 'Жүжиглэлт', 'Постер'], correct: 0 },
  { question: 'Эможи тааврыг тайлаарай', clue: '🎭 + 🌟', answers: ['Гол дүр', 'Найруулагч', 'Зураглаач', 'Кино театр'], correct: 0 }
];

const trueFalseQuestions: Question[] = [
  { question: 'Найруулагч киноны уран бүтээлийн ерөнхий чиглэлийг удирддаг.', answers: ['Үнэн', 'Худал'], correct: 0 },
  { question: 'Трейлерт киноны бүх үйл явдлыг эхнээс нь дуустал харуулдаг.', answers: ['Үнэн', 'Худал'], correct: 1 },
  { question: 'Эвлүүлэгч зураг авсан хэсгүүдийг дараалалд оруулж кино бүтээдэг.', answers: ['Үнэн', 'Худал'], correct: 0 },
  { question: 'Субтитр нь киноны яриаг бичгээр харуулж болно.', answers: ['Үнэн', 'Худал'], correct: 0 },
  { question: 'Киноны постер нь дууны бичлэгийн төхөөрөмж юм.', answers: ['Үнэн', 'Худал'], correct: 1 }
];

const choiceQuestions: Record<ChoiceGameId, Question[]> = {
  quiz: quizQuestions,
  emoji: emojiQuestions,
  truefalse: trueFalseQuestions
};

const memorySymbols = ['🎬', '🍿', '🎭', '⭐', '🎥', '🎞️'];
const scrambleWords = [
  { word: 'кино', hint: 'Том дэлгэцээр үздэг түүх' },
  { word: 'дүр', hint: 'Түүхэн доторх хүн' },
  { word: 'кадр', hint: 'Киноны нэг зураглал' },
  { word: 'найруулагч', hint: 'Уран бүтээлийн багийг удирдана' },
  { word: 'трейлер', hint: 'Киноны богино танилцуулга' }
];

const gameLibrary: {
  id: Exclude<GameId, 'quiz'>;
  icon: string;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    id: 'memory',
    icon: '🧠',
    title: 'Киноны санамж',
    description: 'Ижил тэмдгүүдийг олж, бүх хосыг тааруул.',
    detail: '12 карт · 6 хос'
  },
  {
    id: 'emoji',
    icon: '💡',
    title: 'Эможи таавар',
    description: 'Эможигоор нуугдсан киноны үгийг таагаарай.',
    detail: '5 таавар'
  },
  {
    id: 'truefalse',
    icon: '⚡',
    title: 'Үнэн эсвэл худал',
    description: 'Киноны тухай хурдан асуултуудад шийдвэрээ гарга.',
    detail: '5 асуулт'
  },
  {
    id: 'scramble',
    icon: '🔤',
    title: 'Үг эвлүүлэг',
    description: 'Үсгүүдийг зөв дараалалд оруулж киноны үгийг ол.',
    detail: '5 үг'
  }
];

function isChoiceGame(game: GameId): game is ChoiceGameId {
  return game === 'quiz' || game === 'emoji' || game === 'truefalse';
}

function createMemoryCards(): MemoryCard[] {
  const cards = memorySymbols.flatMap((symbol, pair) => [
    { id: pair * 2, pair, symbol },
    { id: pair * 2 + 1, pair, symbol }
  ]);

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
}

function shuffleQuestions(questions: Question[]): Question[] {
  return questions.map((question) => {
    const answers = question.answers.map((answer, index) => ({ answer, index }));
    for (let index = answers.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [answers[index], answers[swapIndex]] = [answers[swapIndex], answers[index]];
    }

    return {
      ...question,
      answers: answers.map(({ answer }) => answer),
      correct: answers.findIndex(({ index }) => index === question.correct)
    };
  });
}

function scrambleWord(word: string): string {
  const letters = Array.from(word);
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
  }
  const shuffled = letters.join('');
  return shuffled === word && letters.length > 1
    ? `${shuffled.slice(1)}${shuffled[0]}`
    : shuffled;
}

const gameTitles: Record<GameId, string> = {
  quiz: 'Киноны том сорил',
  memory: 'Киноны санамж',
  emoji: 'Эможи таавар',
  truefalse: 'Үнэн эсвэл худал',
  scramble: 'Үг эвлүүлэг'
};

export function GamesHub() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState('');
  const [scrambleAnswer, setScrambleAnswer] = useState('');
  const [scrambleChecked, setScrambleChecked] = useState(false);
  const [scrambleScore, setScrambleScore] = useState(0);

  useEffect(() => {
    if (selectedCards.length !== 2) return;

    const [first, second] = selectedCards;
    if (memoryCards[first].pair === memoryCards[second].pair) {
      setMatchedPairs((pairs) => [...pairs, memoryCards[first].pair]);
      setSelectedCards([]);
      setMemoryLocked(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setSelectedCards([]);
      setMemoryLocked(false);
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [memoryCards, selectedCards]);

  const startChoiceGame = (game: ChoiceGameId) => {
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setQuestions(shuffleQuestions(choiceQuestions[game]));
    setActiveGame(game);
  };

  const startMemory = () => {
    setMemoryCards(createMemoryCards());
    setSelectedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setMemoryLocked(false);
    setActiveGame('memory');
  };

  const startScramble = () => {
    setScrambleIndex(0);
    setScrambledLetters(scrambleWord(scrambleWords[0].word));
    setScrambleAnswer('');
    setScrambleChecked(false);
    setScrambleScore(0);
    setActiveGame('scramble');
  };

  const startGame = (game: GameId) => {
    if (game === 'memory') startMemory();
    else if (game === 'scramble') startScramble();
    else startChoiceGame(game);
  };

  const chooseAnswer = (answerIndex: number) => {
    if (!activeGame || !isChoiceGame(activeGame) || selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (answerIndex === questions[questionIndex].correct) {
      setScore((currentScore) => currentScore + 1);
    }
  };

  const showNextQuestion = () => {
    setQuestionIndex((index) => index + 1);
    setSelectedAnswer(null);
  };

  const chooseMemoryCard = (cardIndex: number) => {
    if (
      memoryLocked ||
      selectedCards.length >= 2 ||
      selectedCards.includes(cardIndex) ||
      matchedPairs.includes(memoryCards[cardIndex].pair)
    ) {
      return;
    }

    const nextSelectedCards = [...selectedCards, cardIndex];
    setSelectedCards(nextSelectedCards);
    if (nextSelectedCards.length === 2) {
      setMoves((count) => count + 1);
      setMemoryLocked(true);
    }
  };

  const submitScramble = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scrambleChecked || !scrambleAnswer.trim()) return;

    const isCorrect =
      scrambleAnswer.trim().toLocaleLowerCase() === scrambleWords[scrambleIndex].word;
    setScrambleChecked(true);
    if (isCorrect) setScrambleScore((currentScore) => currentScore + 1);
  };

  const nextScrambleWord = () => {
    const nextIndex = scrambleIndex + 1;
    setScrambleIndex(nextIndex);
    setScrambledLetters(scrambleWord(scrambleWords[nextIndex].word));
    setScrambleAnswer('');
    setScrambleChecked(false);
  };

  const currentQuestion = questions[questionIndex] ?? null;
  const activeChoiceGame =
    activeGame && isChoiceGame(activeGame) ? activeGame : null;

  return (
    <>
      <header className="games-hero">
        <p className="eyebrow">BANTAN TV · ТОГЛООМ</p>
        <h1 className="page-title">Тоглоомын булан</h1>
        <p className="page-lead">
          Киноны завсарлагаа бүрийг хөгжилтэй болго. Тоглоомоо сонгоод шууд эхлүүлээрэй.
        </p>
        <div className="games-no-login">
          <span aria-hidden="true">●</span>
          Нэвтрэх, бүртгүүлэх шаардлагагүй
        </div>
      </header>

      {activeGame === null ? (
        <>
          <section className="games-featured" aria-labelledby="featured-game-title">
            <div className="games-featured-copy">
              <p className="games-kicker">ОНЦЛОХ ТОГЛООМ · 12 АСУУЛТ</p>
              <h2 id="featured-game-title">Киноны том сорил</h2>
              <p>
                Кино бүтээх урлаг, дэлгэцийн арын ажил болон киноны нэр томьёоны
                тухай 12 асуултаар мэдлэгээ сорь.
              </p>
              <button
                type="button"
                className="live-button games-featured-button"
                onClick={() => startChoiceGame('quiz')}
              >
                СОРИЛ ЭХЛҮҮЛЭХ <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="games-featured-art" aria-hidden="true">
              <span className="games-featured-orbit">BANTAN</span>
              <span className="games-featured-clapper">🎬</span>
              <span className="games-featured-spark games-featured-spark-one">✦</span>
              <span className="games-featured-spark games-featured-spark-two">✦</span>
            </div>
          </section>

          <section className="games-library" aria-labelledby="games-library-title">
            <div className="games-library-heading">
              <div>
                <p className="eyebrow">ТОГЛООМЫН САН</p>
                <h2 id="games-library-title">Өөр тоглоом туршаарай</h2>
              </div>
              <span>{gameLibrary.length} тоглоом</span>
            </div>
            <div className="games-library-grid">
              {gameLibrary.map((game) => (
                <article className="game-library-card" key={game.id}>
                  <div className="game-library-card-top">
                    <span className="game-library-icon" aria-hidden="true">{game.icon}</span>
                    <span className="game-library-detail">{game.detail}</span>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <button
                    type="button"
                    className="game-library-button"
                    onClick={() => startGame(game.id)}
                  >
                    ТОГЛОХ <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section
          className={`game-play${activeGame === 'quiz' ? ' game-play--featured' : ''}`}
          aria-label="Тоглоом"
        >
          <div className="game-play-header">
            <div>
              <p className="eyebrow">BANTAN TV · ТОГЛООМ</p>
              <h2>{gameTitles[activeGame]}</h2>
            </div>
            <button
              type="button"
              className="game-back-button"
              onClick={() => setActiveGame(null)}
            >
              ← ТОГЛООМ СОНГОХ
            </button>
          </div>

          {activeChoiceGame && currentQuestion && (
            <>
              <div className="game-progress-row">
                <p className="game-progress">
                  Асуулт {questionIndex + 1} / {questions.length}
                </p>
                <p className="game-progress">Оноо {score}</p>
              </div>
              <div
                className="game-progress-track"
                role="progressbar"
                aria-label="Асуултын явц"
                aria-valuenow={questionIndex + 1}
                aria-valuemin={0}
                aria-valuemax={questions.length}
              >
                <span
                  style={{
                    width: `${((questionIndex + 1) / questions.length) * 100}%`
                  }}
                />
              </div>
              {currentQuestion.clue && (
                <div className="emoji-clue" aria-label={`Эможи: ${currentQuestion.clue}`}>
                  {currentQuestion.clue}
                </div>
              )}
              <h3 className="game-question">{currentQuestion.question}</h3>
              <div
                className={`game-answer-list${currentQuestion.answers.length === 2 ? ' game-answer-list--two' : ''}`}
              >
                {currentQuestion.answers.map((answer, index) => {
                  const isCorrect = index === currentQuestion.correct;
                  const isSelected = index === selectedAnswer;
                  const answerClass = [
                    'game-answer',
                    selectedAnswer !== null && isCorrect ? 'is-correct' : '',
                    isSelected && !isCorrect ? 'is-incorrect' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <button
                      key={answer}
                      type="button"
                      className={answerClass}
                      disabled={selectedAnswer !== null}
                      onClick={() => chooseAnswer(index)}
                    >
                      <span className="game-answer-letter">{String.fromCharCode(65 + index)}</span>
                      {answer}
                    </button>
                  );
                })}
              </div>
              <p
                className={`game-feedback ${
                  selectedAnswer === null
                    ? ''
                    : selectedAnswer === currentQuestion.correct
                      ? 'is-correct'
                      : 'is-incorrect'
                }`}
                aria-live="polite"
              >
                {selectedAnswer === null
                  ? 'Хариултаа сонгоорой'
                  : selectedAnswer === currentQuestion.correct
                    ? 'Зөв хариуллаа!'
                    : `Зөв хариулт: ${currentQuestion.answers[currentQuestion.correct]}`}
              </p>
              {selectedAnswer !== null && (
                <button type="button" className="live-button game-next-button" onClick={showNextQuestion}>
                  {questionIndex === questions.length - 1
                    ? 'ҮР ДҮН ХАРАХ'
                    : 'ДАРААГИЙН АСУУЛТ'}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </>
          )}

          {activeChoiceGame && !currentQuestion && (
              <div className="game-result">
                <span className="game-result-icon" aria-hidden="true">🏆</span>
                <strong>{score} / {questions.length}</strong>
                <p>Тоглоом дууслаа. Дахин тоглож оноогоо ахиулаарай.</p>
                <button
                  type="button"
                  className="live-button"
                  onClick={() => startChoiceGame(activeChoiceGame)}
                >
                  ДАХИН ТОГЛОХ
                </button>
              </div>
          )}

          {activeGame === 'memory' && (
            <>
              <p className="memory-status">
                Нүүдэл: {moves} · Олсон хос: {matchedPairs.length} / {memorySymbols.length}
              </p>
              {matchedPairs.length === memorySymbols.length ? (
                <div className="game-result">
                  <span className="game-result-icon" aria-hidden="true">🏆</span>
                  <strong>Бүгдийг оллоо!</strong>
                  <p>{moves} нүүдлээр бүх хосыг оллоо.</p>
                  <button type="button" className="live-button" onClick={startMemory}>
                    ДАХИН ТОГЛОХ
                  </button>
                </div>
              ) : (
                <>
                  <div className="memory-grid">
                    {memoryCards.map((card, index) => {
                      const isVisible =
                        selectedCards.includes(index) || matchedPairs.includes(card.pair);

                      return (
                        <button
                          key={card.id}
                          type="button"
                          className={`memory-card ${matchedPairs.includes(card.pair) ? 'is-matched' : ''}`}
                          aria-label={isVisible ? card.symbol : `Нууц карт ${index + 1}`}
                          aria-pressed={isVisible}
                          disabled={isVisible || memoryLocked}
                          onClick={() => chooseMemoryCard(index)}
                        >
                          {isVisible ? card.symbol : '?'}
                        </button>
                      );
                    })}
                  </div>
                  <div className="memory-actions">
                    <button type="button" className="game-restart-button" onClick={startMemory}>
                      ДАХИН ЭХЛҮҮЛЭХ
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {activeGame === 'scramble' && (
            scrambleIndex < scrambleWords.length ? (
              <>
                <div className="game-progress-row">
                  <p className="game-progress">Үг {scrambleIndex + 1} / {scrambleWords.length}</p>
                  <p className="game-progress">Оноо {scrambleScore}</p>
                </div>
                <div className="game-progress-track">
                  <span style={{ width: `${((scrambleIndex + 1) / scrambleWords.length) * 100}%` }} />
                </div>
                <div className="scramble-word" aria-label="Холилдсон үсэг">
                  {Array.from(scrambledLetters).join(' ')}
                </div>
                <p className="scramble-hint">Сэжүүр: {scrambleWords[scrambleIndex].hint}</p>
                <form className="scramble-form" onSubmit={submitScramble}>
                  <label htmlFor="scramble-answer">Зөв үгийг бичээрэй</label>
                  <input
                    id="scramble-answer"
                    value={scrambleAnswer}
                    onChange={(event) => setScrambleAnswer(event.target.value)}
                    autoComplete="off"
                    disabled={scrambleChecked}
                  />
                  {!scrambleChecked ? (
                    <button type="submit" className="live-button" disabled={!scrambleAnswer.trim()}>
                      ШАЛГАХ
                    </button>
                  ) : (
                    <>
                      <p className={`game-feedback ${scrambleAnswer.trim().toLocaleLowerCase() === scrambleWords[scrambleIndex].word ? 'is-correct' : 'is-incorrect'}`}>
                        {scrambleAnswer.trim().toLocaleLowerCase() === scrambleWords[scrambleIndex].word
                          ? 'Зөв хариуллаа!'
                          : `Зөв хариулт: ${scrambleWords[scrambleIndex].word}`}
                      </p>
                      <button
                        type="button"
                        className="live-button"
                        onClick={
                          scrambleIndex === scrambleWords.length - 1
                            ? () => setScrambleIndex(scrambleWords.length)
                            : nextScrambleWord
                        }
                      >
                        {scrambleIndex === scrambleWords.length - 1 ? 'ҮР ДҮН ХАРАХ' : 'ДАРААГИЙН ҮГ'}
                      </button>
                    </>
                  )}
                </form>
              </>
            ) : (
              <div className="game-result">
                <span className="game-result-icon" aria-hidden="true">🏆</span>
                <strong>{scrambleScore} / {scrambleWords.length}</strong>
                <p>Үг эвлүүлж дууслаа. Дахин тоглож үзээрэй.</p>
                <button type="button" className="live-button" onClick={startScramble}>
                  ДАХИН ТОГЛОХ
                </button>
              </div>
            )
          )}
        </section>
      )}
    </>
  );
}
