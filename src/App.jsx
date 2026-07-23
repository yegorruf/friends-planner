import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  
  // Состояния для формы авторизации/регистрации
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = `${login}@app.local`;

    if (isLoginMode) {
      // Логика ВХОДА
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Ошибка входа: проверьте логин или пароль');
    } else {
      // Логика РЕГИСТРАЦИИ
      if (inviteCode !== '7777') {
        alert('Неверный инвайт-код!');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        alert('Ошибка регистрации. Возможно, такой логин уже занят.');
        return;
      }

      if (data.user) {
        // Создаем профиль пользователя в нашей таблице profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, login: login, display_name: displayName }]);
          
        if (profileError) {
          alert('Ошибка создания профиля: ' + profileError.message);
        } else {
          alert('Успешно! Теперь вы можете войти.');
          setIsLoginMode(true);
        }
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-slate-800 p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center text-indigo-400">
            {isLoginMode ? 'Вход в Планировщик' : 'Регистрация'}
          </h1>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Логин (на англ.)</label>
            <input 
              type="text" 
              value={login} 
              onChange={e => setLogin(e.target.value.toLowerCase())}
              className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
              placeholder="egorruf" 
              required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Как вас зовут (Имя)</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
                placeholder="Егор" 
                required={!isLoginMode}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Пароль</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
              required
              minLength={6}
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Инвайт-код</label>
              <input 
                type="text" 
                value={inviteCode} 
                onChange={e => setInviteCode(e.target.value)}
                className="w-full bg-slate-700 rounded p-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
                placeholder="Спросите у создателя" 
                required={!isLoginMode}
              />
            </div>
          )}

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2 rounded transition">
            {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
          </button>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-sm text-slate-400 hover:text-white transition underline"
            >
              {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
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

function CalendarView({ userId }) {
  // Состояния для хранения выбранной даты и активных слотов
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [mySlots, setMySlots] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Загрузка слотов из Supabase при смене даты
  React.useEffect(() => {
    async function fetchSlots() {
      const { data, error } = await supabase
        .from('availability')
        .select('slot')
        .eq('user_id', userId)
        .eq('date', selectedDate);
        
      if (data) {
        setMySlots(data.map(d => d.slot));
      }
    }
    fetchSlots();
  }, [selectedDate, userId]);

  // Функция переключения статуса слота (свободен/занят)
  const toggleSlot = async (slotId) => {
    setIsLoading(true);
    
    if (mySlots.includes(slotId)) {
      // Если слот уже был выбран — удаляем запись (пользователь стал "занят")
      await supabase
        .from('availability')
        .delete()
        .match({ user_id: userId, date: selectedDate, slot: slotId });
        
      setMySlots(mySlots.filter(s => s !== slotId));
    } else {
      // Если слот не выбран — добавляем запись (пользователь стал "свободен")
      await supabase
        .from('availability')
        .insert({ user_id: userId, date: selectedDate, slot: slotId });
        
      setMySlots([...mySlots, slotId]);
    }
    
    setIsLoading(false);
  };

  const slotsConfig = [
    { id: 'morning', label: 'Утро (08:00 - 12:00)' },
    { id: 'afternoon', label: 'День (12:00 - 17:00)' },
    { id: 'evening', label: 'Вечер (17:00 - 23:00)' },
    { id: 'night', label: 'До утра (23:00+)' }
  ];

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Мой календарь доступности</h2>
      <p className="text-slate-400 text-sm mb-6">
        По умолчанию ты занят. Выбери дату и нажми на удобные слоты, чтобы отметить себя свободным. Данные сохраняются автоматически.
      </p>
      
      {/* Выбор даты */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Выберите день:</label>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded p-2 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Кнопки слотов */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {slotsConfig.map(slot => {
          const isActive = mySlots.includes(slot.id);
          return (
            <button
              key={slot.id}
              onClick={() => toggleSlot(slot.id)}
              disabled={isLoading}
              className={`p-3 rounded-lg transition border ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {slot.label}
            </button>
          );
        })}
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
