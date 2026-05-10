'use client';

import Link from 'next/link';

export default function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^@\w+$/.test(part) ? (
          <Link
            key={i}
            href={`/profile/h/${part.slice(1)}`}
            className="text-[#6B7FA8] font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          part
        )
      )}
    </span>
  );
}
