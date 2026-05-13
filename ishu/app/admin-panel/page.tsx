'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${localStorage.getItem('token')}`,
  };
}

type AdminUser = {
  id: number; username: string; email: string; name: string;
  handle: string; avatar: string; is_active: boolean; is_staff: boolean; date_joined: string;
};

type AdminPost = {
  id: number; text: string; handle: string; author_id: number;
  created_at: string; likes: number; comments: number;
};

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [u, p] = await Promise.all([
      fetch(`${API}/api/admin-api/users/`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/api/admin-api/posts/`, { headers: headers() }).then(r => r.json()),
    ]);
    if (u.error === 'forbidden') { router.push('/feed'); return; }
    setUsers(u);
    setPosts(p);
    setLoading(false);
  }

  async function banUser(id: number) {
    const res = await fetch(`${API}/api/admin-api/users/${id}/ban/`, { method: 'POST', headers: headers() });
    const data = await res.json();
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: data.is_active } : u));
  }

  async function deleteUser(id: number) {
    if (!confirm('Удалить пользователя и все его данные?')) return;
    await fetch(`${API}/api/admin-api/users/${id}/delete/`, { method: 'DELETE', headers: headers() });
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  async function deletePost(id: number) {
    if (!confirm('Удалить пост?')) return;
    await fetch(`${API}/api/admin-api/posts/${id}/delete/`, { method: 'DELETE', headers: headers() });
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.handle.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPosts = posts.filter(p =>
    p.text.toLowerCase().includes(search.toLowerCase()) ||
    p.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Модерация</h1>
          <button onClick={() => router.push('/feed')} className="text-sm text-gray-400 hover:text-white">← Назад</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#161B22] rounded-xl p-4">
            <div className="text-3xl font-bold">{users.length}</div>
            <div className="text-gray-400 text-sm">Пользователей</div>
          </div>
          <div className="bg-[#161B22] rounded-xl p-4">
            <div className="text-3xl font-bold">{posts.length}</div>
            <div className="text-gray-400 text-sm">Постов</div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#161B22] border border-[#30363D] rounded-xl px-4 py-2.5 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#58A6FF]"
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['users', 'posts'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t ? 'bg-[#58A6FF] text-white' : 'bg-[#161B22] text-gray-400 hover:text-white'
              }`}
            >
              {t === 'users' ? `Пользователи (${users.length})` : `Посты (${posts.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : tab === 'users' ? (
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <div key={u.id} className={`bg-[#161B22] rounded-xl p-4 flex items-center gap-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                {u.avatar ? (
                  <img src={u.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#21262D] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(u.name || u.username)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.name || u.username}</div>
                  <div className="text-gray-400 text-xs truncate">{u.handle} · {u.email}</div>
                  <div className="text-gray-500 text-xs">{new Date(u.date_joined).toLocaleDateString('ru')}</div>
                </div>
                {u.is_staff && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">admin</span>}
                {!u.is_staff && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => banUser(u.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        u.is_active ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {u.is_active ? 'Бан' : 'Разбан'}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPosts.map(p => (
              <div key={p.id} className="bg-[#161B22] rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-400 text-xs mb-1">{p.handle} · {new Date(p.created_at).toLocaleDateString('ru')}</div>
                  <div className="text-sm leading-relaxed">{p.text || <span className="text-gray-500 italic">без текста</span>}</div>
                  <div className="text-gray-500 text-xs mt-1">❤️ {p.likes} · 💬 {p.comments}</div>
                </div>
                <button
                  onClick={() => deletePost(p.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
