import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'events' | 'debts'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = `${login}@app.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка входа: проверьте логин или пароль');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center text-indigo-400">Вход в Планировщик</h1>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Логин</label>
            <input 
              type="text" 
              value={login} 
              onChange={e => setLogin(e.target.value)}
              className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
              placeholder="egorruf" 
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Пароль</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2 rounded transition">
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Шапка */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="font-bold text-indigo-400 text-lg">Друзья & Встречи</span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700">
            Выйти
          </button>
        </div>
      </header>

      {/* Навигация */}
      <nav className="max-w-4xl mx-auto flex gap-2 p-4">
        {[
          { id: 'calendar', name: '🗓 Сводный календарь' },
          { id: 'events', name: '🎉 Ивенты & Траты' },
          { id: 'debts', name: '💰 Баланс и Долги' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </nav>

      {/* Контент */}
      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'calendar' && <CalendarView userId={session.user.id} />}
        {activeTab === 'events' && <EventsView userId={session.user.id} />}
        {activeTab === 'debts' && <DebtsView userId={session.user.id} />}
      </main>
    </div>
  );
}

// Заглушки для модулей интерфейса
function CalendarView() {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Свободные слоты компании</h2>
      <p className="text-slate-400 text-sm mb-4">По умолчанию все участники считаются занятыми. Выделите удобные слоты (Утро / День / Вечер / Ночь), чтобы отметить себя свободным.</p>
      {/* Календарная сетка рендерится здесь */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-400">
        <div className="bg-slate-800 p-2 rounded">Утро (08:00 - 12:00)</div>
        <div className="bg-slate-800 p-2 rounded">День (12:00 - 17:00)</div>
        <div className="bg-slate-800 p-2 rounded">Вечер (17:00 - 23:00)</div>
        <div className="bg-slate-800 p-2 rounded">До утра (23:00+)</div>
      </div>
    </div>
  );
}

function EventsView() {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Список встреч</h2>
      <button className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded mb-4">
        + Создать ивент
      </button>
    </div>
  );
}

function DebtsView() {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Матрица долгов и погашения</h2>
      <p className="text-slate-400 text-sm mb-4">Любой участник может зафиксировать факт передачи денег за себя или за другого друга.</p>
    </div>
  );
}