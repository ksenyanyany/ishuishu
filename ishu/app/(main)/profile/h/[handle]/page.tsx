'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileByHandlePage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/profile/by-handle/${handle}/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) router.replace(`/profile/${data.id}`);
        else router.replace('/feed');
      })
      .catch(() => router.replace('/feed'));
  }, [handle, router]);

  return (
    <div className="flex justify-center items-center py-32 text-sm text-[#9AA3B8]">
      Загрузка...
    </div>
  );
}
