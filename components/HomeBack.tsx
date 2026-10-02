import Link from 'next/link';

export function HomeBack({ label = 'Нүүр' }: { label?: string }) {
  return (
    <Link href="/" className="home-back" aria-label="Нүүр рүү буцах">
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
