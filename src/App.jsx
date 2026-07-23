import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Вспомогательная функция для правильной локальной даты
const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [session, setSession] = useState(null);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = `${login}@app.local`;

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Ошибка входа: проверьте логин или пароль');
    } else {
      if (inviteCode !== '7777') return alert('Неверный инвайт-код!');
      
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return alert('Ошибка регистрации. Возможно, такой логин уже занят.');

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, login: login, display_name: displayName }]);
          
        if (profileError) alert('Ошибка создания профиля: ' + profileError.message);
        else {
          alert('Успешно! Теперь вы можете войти.');
          setIsLoginMode(true);
        }
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-sm space-y-5">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400 text-center mb-6">
            {isLoginMode ? 'Вход' : 'Регистрация'}
          </h1>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Логин (на англ.)</label>
            <input 
              type="text" value={login} onChange={e => setLogin(e.target.value.toLowerCase())}
              className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="login" required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Как вас зовут (Имя)</label>
              <input 
                type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Егор" required={!isLoginMode}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Пароль</label>
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
              required minLength={6}
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Инвайт-код</label>
              <input 
                type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Спросите у создателя" required={!isLoginMode}
              />
            </div>
          )}

          <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-red-900/20">
            {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
          </button>
          
          <div className="text-center pt-2">
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-zinc-500 hover:text-amber-400 transition-colors">
              {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400 text-xl tracking-tight">
            FRIEND PLANNER
          </span>
          <button onClick={() => supabase.auth.signOut()} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg font-medium transition-colors">
            Выйти
          </button>
        </div>
      </header>

      <nav className="max-w-4xl mx-auto flex gap-2 p-4">
        {[
          { id: 'calendar', name: '🗓 Календарь' },
          { id: 'events', name: '🎉 Ивенты' },
          { id: 'debts', name: '💰 Долги' },
        ].map(tab => (
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg shadow-red-900/20' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'calendar' && <CalendarView userId={session.user.id} />}
        {activeTab === 'events' && <EventsView userId={session.user.id} />}
        {activeTab === 'debts' && <DebtsView userId={session.user.id} />}
      </main>
    </div>
  );
}

// ================= КАЛЕНДАРЬ =================
function CalendarView({ userId }) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(getLocalToday());
  
  const [mySlots, setMySlots] = React.useState([]);
  const [friendsAvail, setFriendsAvail] = React.useState({ morning: [], afternoon: [], evening: [], night: [] });
  const [monthStats, setMonthStats] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  React.useEffect(() => {
    async function fetchData() {
      const { data: myData } = await supabase.from('availability').select('slot').eq('user_id', userId).eq('date', selectedDate);
      if (myData) setMySlots(myData.map(d => d.slot));

      const { data: friendsData } = await supabase.from('availability').select('slot, profiles(display_name)').eq('date', selectedDate);
      if (friendsData) {
        const grouped = { morning: [], afternoon: [], evening: [], night: [] };
        friendsData.forEach(item => {
          if (item.profiles?.display_name) grouped[item.slot].push(item.profiles.display_name);
        });
        Object.keys(grouped).forEach(k => grouped[k] = [...new Set(grouped[k])]);
        setFriendsAvail(grouped);
      }

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
      
      const { data: monthData } = await supabase.from('availability').select('date, user_id').gte('date', startDate).lte('date', endDate);
      if (monthData) {
        const stats = {};
        monthData.forEach(row => {
          if (!stats[row.date]) stats[row.date] = new Set();
          stats[row.date].add(row.user_id);
        });
        
        const counts = {};
        for (const [d, setObj] of Object.entries(stats)) counts[d] = setObj.size;
        setMonthStats(counts);
      }
    }
    fetchData();
  }, [selectedDate, userId, year, month, daysInMonth]);

  const toggleSlot = async (slotId) => {
    if (isLoading) return;
    setIsLoading(true);

    if (mySlots.includes(slotId)) {
      await supabase.from('availability').delete().match({ user_id: userId, date: selectedDate, slot: slotId });
      setMySlots(mySlots.filter(s => s !== slotId));
    } else {
      await supabase.from('availability').insert({ user_id: userId, date: selectedDate, slot: slotId });
      setMySlots([...mySlots, slotId]);
    }
    
    setMonthStats(prev => {
      const currentCount = prev[selectedDate] || 0;
      return { ...prev, [selectedDate]: mySlots.includes(slotId) ? Math.max(0, currentCount - 1) : currentCount + 1 };
    });
    
    setIsLoading(false);
  };

  const slotsConfig = [
    { id: 'morning', label: 'Утро (08-12)' }, { id: 'afternoon', label: 'День (12-17)' },
    { id: 'evening', label: 'Вечер (17-23)' }, { id: 'night', label: 'Ночь (23+)' }
  ];

  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
  
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const formatDayString = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-500">Выбор даты</h2>
          <div className="flex items-center gap-4 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-zinc-400 hover:text-amber-400 px-3 py-1 rounded transition-colors">&larr;</button>
            <span className="font-bold text-zinc-200 min-w-[100px] text-center">{monthNames[month]} {year}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-zinc-400 hover:text-amber-400 px-3 py-1 rounded transition-colors">&rarr;</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="text-xs font-bold text-zinc-500 py-1">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dateStr = formatDayString(day);
            const isSelected = selectedDate === dateStr;
            const freeCount = monthStats[dateStr] || 0;
            const isCrowded = freeCount >= 3; 

            let btnClass = 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/50';
            if (isSelected) btnClass = 'bg-gradient-to-br from-red-500 to-amber-500 text-white font-bold shadow-md border-transparent transform scale-105';
            else if (isCrowded) btnClass = 'bg-amber-950/30 text-amber-400 border border-amber-500/50 font-bold hover:bg-amber-900/40';

            return (
              <button key={day} onClick={() => setSelectedDate(dateStr)} className={`p-2 rounded-xl text-sm transition-all duration-200 ${btnClass}`}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h3 className="text-lg font-bold mb-2 text-zinc-200">Моя доступность</h3>
        <p className="text-sm text-zinc-500">Отметьте слоты, в которые вы свободны:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
          {slotsConfig.map(slot => {
            const isActive = mySlots.includes(slot.id);
            return (
              <button
                key={slot.id} onClick={() => toggleSlot(slot.id)} disabled={isLoading}
                className={`p-4 rounded-xl font-bold transition-all duration-200 border ${
                  isActive 
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 border-transparent text-white shadow-lg shadow-red-900/20' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400'
                } ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-amber-500">Кто свободен: <span className="text-zinc-300">{selectedDate}</span></h3>
        <div className="space-y-3">
          {slotsConfig.map(slot => {
            const people = friendsAvail[slot.id];
            return (
              <div key={slot.id} className="bg-zinc-950 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800/50">
                <span className="text-zinc-400 font-bold text-sm mb-3 sm:mb-0">{slot.label}</span>
                <div className="flex flex-wrap gap-2">
                  {people.length > 0 
                    ? people.map((name, i) => <span key={i} className="bg-gradient-to-r from-red-900/40 to-amber-900/40 text-amber-400 border border-amber-700/50 font-medium text-xs px-3 py-1.5 rounded-lg">{name}</span>) 
                    : <span className="text-zinc-600 text-xs italic font-medium">Пока никто</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ================= ИВЕНТЫ =================
function EventsView({ userId }) {
  const [events, setEvents] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(getLocalToday());

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*, profiles(display_name)').order('event_date', { ascending: true });
    if (data) setEvents(data);
  };

  React.useEffect(() => { fetchEvents(); }, []);

  const createEvent = async (e) => {
    e.preventDefault();
    await supabase.from('events').insert([{ title, event_date: date, owner_id: userId }]);
    setTitle(''); setDate(getLocalToday());
    fetchEvents();
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Запланировать встречу</h2>
        <form onSubmit={createEvent} className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Название (напр. Шашлыки)" value={title} onChange={e => setTitle(e.target.value)} required className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors text-white" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors text-white" />
          <button type="submit" className="bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20">Добавить</button>
        </form>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-zinc-200">Ближайшие ивенты</h2>
        <div className="space-y-3">
          {events.length === 0 && <p className="text-zinc-500 text-sm italic">Ивентов пока нет.</p>}
          {events.map(ev => (
            <div key={ev.id} className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-amber-900/50 transition-colors">
              <div>
                <h3 className="font-extrabold text-zinc-100 text-lg">{ev.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">Организатор: <span className="text-amber-500/80">{ev.profiles?.display_name}</span></p>
              </div>
              <div className="text-amber-400 font-bold bg-amber-950/30 px-4 py-2 rounded-lg border border-amber-900/30">
                {ev.event_date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= ДОЛГИ И ТРАТЫ =================
function DebtsView({ userId }) {
  const [events, setEvents] = React.useState([]);
  const [profiles, setProfiles] = React.useState([]);
  
  const [eventId, setEventId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  
  const [balances, setBalances] = React.useState([]);

  const loadData = async () => {
    const [{ data: evs }, { data: profs }, { data: exp }] = await Promise.all([
      supabase.from('events').select('id, title'),
      supabase.from('profiles').select('id, display_name'),
      supabase.from('expenses').select('*')
    ]);
    
    if (evs) setEvents(evs);
    if (profs) setProfiles(profs);

    if (profs && exp) {
      const calc = {};
      profs.forEach(p => calc[p.id] = { name: p.display_name, total: 0 });
      
      exp.forEach(x => {
        const cost = parseFloat(x.amount);
        const split = cost / profs.length;
        
        profs.forEach(p => {
          if (p.id === x.payer_id) calc[p.id].total += (cost - split); 
          else calc[p.id].total -= split; 
        });
      });

      const result = Object.values(calc).sort((a,b) => b.total - a.total);
      setBalances(result);
    }
  };

  React.useEffect(() => { loadData(); }, []);

  const addExpense = async (e) => {
    e.preventDefault();
    await supabase.from('expenses').insert([{
      event_id: eventId, payer_id: userId, amount: parseFloat(amount), description: desc, split_type: 'equal'
    }]);
    setAmount(''); setDesc(''); setEventId('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Добавить трату</h2>
        <form onSubmit={addExpense} className="space-y-4">
          <select value={eventId} onChange={e => setEventId(e.target.value)} required className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors text-white">
            <option value="">Выберите ивент...</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          <div className="flex gap-3">
            <input type="number" step="0.01" placeholder="Сумма" value={amount} onChange={e => setAmount(e.target.value)} required className="w-1/3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors text-white" />
            <input type="text" placeholder="За что? (напр. Мясо)" value={desc} onChange={e => setDesc(e.target.value)} required className="w-2/3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors text-white" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20">
            Сохранить (поделить поровну)
          </button>
        </form>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-zinc-200">Общий баланс компании</h2>
        <p className="text-zinc-500 text-sm mb-6">Зеленый — человеку должны скинуться. Красный — человек должен скинуть в общий котел.</p>
        
        <div className="space-y-3">
          {balances.map((b, i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
              <span className="text-zinc-300 font-bold">{b.name}</span>
              <span className={`font-extrabold px-3 py-1 rounded-lg ${b.total >= 0 ? 'text-emerald-400 bg-emerald-950/30' : 'text-rose-400 bg-rose-950/30'}`}>
                {b.total > 0 ? '+' : ''}{b.total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
