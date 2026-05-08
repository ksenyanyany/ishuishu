'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import PostCard, { Post } from '@/components/PostCard';
import CommentCard, { Comment } from '@/components/CommentCard';
import CommentInput from '@/components/CommentInput';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

function mapPost(raw: any): Post {
  const name: string = raw.author.name || '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return {
    id: String(raw.id),
    authorId: String(raw.author.id),
    author: { id: String(raw.author.id), name, initials, avatarUrl: raw.author.avatar || undefined },
    createdAt: new Date(raw.created_at),
    image: raw.image || undefined,
    moods: raw.moods,
    text: raw.text,
    likesCount: raw.likes_count,
    commentsCount: raw.comments_count,
    isLiked: raw.is_liked,
  };
}

function mapComment(raw: any): Comment {
  const name: string = raw.author.name || '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return {
    id: String(raw.id),
    authorId: String(raw.author.id),
    author: { name, initials, avatarUrl: raw.author.avatar || undefined },
    createdAt: new Date(raw.created_at),
    text: raw.text,
    images: raw.image ? [raw.image] : undefined,
    likesCount: raw.likes_count,
    isLiked: raw.is_liked,
  };
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`${API}/api/posts/${id}/`, { headers: authHeaders() }),
        fetch(`${API}/api/posts/${id}/comments/`, { headers: authHeaders() }),
      ]);
      if (postRes.ok) setPost(mapPost(await postRes.json()));
      if (commentsRes.ok) setComments((await commentsRes.json()).map(mapComment));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleNewComment(text: string, images: string[]) {
    const res = await fetch(`${API}/api/posts/${id}/comments/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, image: images[0] ?? '' }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, mapComment(data)]);
      setPost((p) => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center py-32 text-sm text-[#9AA3B8]">Загрузка...</div>;
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <span className="text-3xl">·  ·  ·</span>
        <span className="text-sm text-[#9AA3B8]">Пост не найден</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-4">

        {/* Топбар */}
        <div className="flex items-center gap-3 pt-8 pb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#EDEFF3] flex items-center justify-center shrink-0"
          >
            <Image src="/icons/back.svg" alt="назад" width={16} height={16} style={{ width: 'auto' }} />
          </button>
          <span className="text-base font-bold text-[#1F2A44]">Пост</span>
        </div>

        <PostCard post={post} />

        <div className="mt-4 mb-2">
          <span className="text-xs font-bold text-[#9AA3B8] uppercase tracking-wide">
            Комментарии · {comments.length}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[#DDE3EC]">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
          {comments.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2">
              <span className="text-sm text-[#9AA3B8]">Комментариев пока нет</span>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0">
        <CommentInput onSubmit={handleNewComment} />
      </div>
    </div>
  );
}
