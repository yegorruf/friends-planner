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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Ошибка входа: проверьте логин или пароль');
    } else {
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
              placeholder="login" 
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

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'calendar' && <CalendarView userId={session.user.id} />}
        {activeTab === 'events' && <EventsView />}
        {activeTab === 'debts' && <DebtsView />}
      </main>
    </div>
  );
}

function CalendarView({ userId }) {
  // Текущий месяц для отображения сетки календаря
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  // Выбранная дата для просмотра/редактирования слотов (формат YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  
  const [mySlots, setMySlots] = React.useState([]);
  const [friendsAvail, setFriendsAvail] = React.useState({ morning: [], afternoon: [], evening: [], night: [] });
  const [isLoading, setIsLoading] = React.useState(false);

  // Загрузка данных при клике на день
  React.useEffect(() => {
    async function fetchData() {
      // 1. Загружаем МОИ слоты
      const { data: myData } = await supabase
        .from('availability')
        .select('slot')
        .eq('user_id', userId)
        .eq('date', selectedDate);
        
      if (myData) setMySlots(myData.map(d => d.slot));

      // 2. Загружаем слоты ВСЕЙ компании (чтобы показать "график свободных")
      const { data: friendsData } = await supabase
        .from('availability')
        .select('slot, user_id, profiles(display_name)')
        .eq('date', selectedDate);

      if (friendsData) {
        const grouped = { morning: [], afternoon: [], evening: [], night: [] };
        friendsData.forEach(item => {
          // Исключаем самого себя из списка "друзей" для наглядности (опционально, но лучше показать всех)
          if (item.profiles && item.profiles.display_name) {
            grouped[item.slot].push(item.profiles.display_name);
          }
        });
        // Убираем дубликаты имен в слотах
        Object.keys(grouped).forEach(k => {
          grouped[k] = [...new Set(grouped[k])];
        });
        setFriendsAvail(grouped);
      }
    }
    fetchData();
  }, [selectedDate, userId]);

  const toggleSlot = async (slotId) => {
    setIsLoading(true);
    if (mySlots.includes(slotId)) {
      await supabase.from('availability').delete().match({ user_id: userId, date: selectedDate, slot: slotId });
      setMySlots(mySlots.filter(s => s !== slotId));
    } else {
      await supabase.from('availability').insert({ user_id: userId, date: selectedDate, slot: slotId });
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

  // Генерация сетки календаря
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Делаем понедельник первым днем
  
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const formatDayString = (d) => {
    const m = String(month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ВИЗУАЛЬНЫЙ КАЛЕНДАРЬ */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-indigo-300">Выберите дату</h2>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded">&larr;</button>
            <span className="font-semibold text-slate-200">{monthNames[month]} {year}</span>
            <button onClick={nextMonth} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded">&rarr;</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="text-xs font-semibold text-slate-500 py-1">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dateStr = formatDayString(day);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`p-2 rounded-lg text-sm font-medium transition ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : isToday 
                      ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30' 
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. МОЯ ДОСТУПНОСТЬ НА ВЫБРАННЫЙ ДЕНЬ */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-bold mb-2 text-indigo-200">Моя доступность</h3>
        <p className="text-slate-400 text-sm mb-4">Отметьте слоты, в которые вы свободны {selectedDate}:</p>
        
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

      {/* 3. СВОДКА (ГРАФИК): КТО СВОБОДЕН */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-bold mb-4 text-emerald-400">Кто свободен в этот день</h3>
        <div className="space-y-3">
          {slotsConfig.map(slot => {
            const people = friendsAvail[slot.id];
            return (
              <div key={slot.id} className="bg-slate-800/50 p-3 rounded flex flex-col sm:flex-row sm:items-center justify-between border border-slate-800">
                <span className="text-slate-300 font-medium text-sm mb-2 sm:mb-0">{slot.label}</span>
                <div className="flex flex-wrap gap-1">
                  {people.length > 0 ? (
                    people.map((name, i) => (
                      <span key={i} className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-xs px-2 py-1 rounded">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs italic">Никто не свободен</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function EventsView() {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Список встреч</h2>
      <p className="text-slate-400 text-sm mb-4">В разработке...</p>
    </div>
  );
}

function DebtsView() {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-300">Матрица долгов и погашения</h2>
      <p className="text-slate-400 text-sm mb-4">В разработке...</p>
    </div>
  );
}
