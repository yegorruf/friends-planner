import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Получаем локальную дату в формате YYYY-MM-DD (чтобы избежать сдвигов по часовым поясам)
const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState({}); // Кеш всех профилей
  
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

  // Глобальная загрузка профилей для отображения имен везде
  useEffect(() => {
    if (session) {
      supabase.from('profiles').select('*').then(({ data }) => {
        if (data) {
          const profMap = {};
          data.forEach(p => profMap[p.id] = p.display_name);
          setProfiles(profMap);
        }
      });
    }
  }, [session]);

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
            <input type="text" value={login} onChange={e => setLogin(e.target.value.toLowerCase())} className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors" placeholder="login" required />
          </div>
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Имя</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors" placeholder="Егор" required={!isLoginMode} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors" required minLength={6} />
          </div>
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Инвайт-код</label>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="w-full bg-zinc-950 rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-amber-500 transition-colors" placeholder="7777" required={!isLoginMode} />
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12 font-sans">
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400 text-xl tracking-tight">
            FRIEND PLANNER
          </span>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm hidden sm:block">{profiles[session.user.id]}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg font-medium transition-colors">
              Выйти
            </button>
          </div>
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
        {activeTab === 'debts' && <DebtsView userId={session.user.id} allProfiles={profiles} />}
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
  const [monthEvents, setMonthEvents] = React.useState({}); // Храним ивенты месяца
  const [isLoading, setIsLoading] = React.useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  React.useEffect(() => {
    async function fetchData() {
      // 1. Мои слоты
      const { data: myData } = await supabase.from('availability').select('slot').eq('user_id', userId).eq('date', selectedDate);
      if (myData) setMySlots(myData.map(d => d.slot));

      // 2. Кто свободен
      const { data: friendsData } = await supabase.from('availability').select('slot, profiles(display_name)').eq('date', selectedDate);
      if (friendsData) {
        const grouped = { morning: [], afternoon: [], evening: [], night: [] };
        friendsData.forEach(item => {
          if (item.profiles?.display_name) grouped[item.slot].push(item.profiles.display_name);
        });
        Object.keys(grouped).forEach(k => grouped[k] = [...new Set(grouped[k])]);
        setFriendsAvail(grouped);
      }

      // 3. Данные за месяц (свободные люди + ИВЕНТЫ)
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

      const { data: eventsData } = await supabase.from('events').select('id, title, event_date, profiles(display_name)').gte('event_date', startDate).lte('event_date', endDate);
      if (eventsData) {
        const evs = {};
        eventsData.forEach(ev => {
          if (!evs[ev.event_date]) evs[ev.event_date] = [];
          evs[ev.event_date].push(ev);
        });
        setMonthEvents(evs);
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

  const todayStr = getLocalToday();
  const selectedDayEvents = monthEvents[selectedDate] || [];

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-500">Календарь</h2>
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
            const isToday = dateStr === todayStr;
            const freeCount = monthStats[dateStr] || 0;
            const isCrowded = freeCount >= 3; 
            const hasEvents = monthEvents[dateStr] && monthEvents[dateStr].length > 0;

            // Логика стилей кнопок
            let btnClass = 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border-2 border-transparent';
            if (isSelected) btnClass = 'bg-gradient-to-br from-red-500 to-amber-500 text-white font-bold shadow-md transform scale-105 border-transparent';
            else if (isCrowded) btnClass = 'bg-amber-950/40 text-amber-400 border-2 border-amber-500/30 font-bold hover:bg-amber-900/50';
            
            if (isToday && !isSelected) {
              btnClass += ' ring-2 ring-amber-500/80 ring-offset-2 ring-offset-zinc-900 text-amber-300';
            }

            return (
              <button key={day} onClick={() => setSelectedDate(dateStr)} className={`relative p-2 h-10 rounded-xl text-sm transition-all duration-200 ${btnClass} flex items-center justify-center`}>
                {day}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <h3 className="text-lg font-bold mb-2 text-zinc-200">Моя доступность</h3>
          <p className="text-sm text-zinc-500">Отметьте, когда вы свободны:</p>
          <div className="grid grid-cols-2 gap-3 text-sm mt-4">
            {slotsConfig.map(slot => {
              const isActive = mySlots.includes(slot.id);
              return (
                <button key={slot.id} onClick={() => toggleSlot(slot.id)} disabled={isLoading}
                  className={`p-3 rounded-xl font-bold transition-all duration-200 border ${
                    isActive ? 'bg-gradient-to-r from-red-600 to-amber-500 border-transparent text-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400'
                  } ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <h3 className="text-lg font-bold mb-4 text-amber-500">Сводка на {selectedDate}</h3>
          
          {selectedDayEvents.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Запланированы встречи:</h4>
              {selectedDayEvents.map(ev => (
                <div key={ev.id} className="bg-gradient-to-r from-red-950/40 to-amber-950/40 border border-amber-900/30 p-2 rounded-lg flex justify-between items-center">
                  <span className="font-bold text-amber-100">{ev.title}</span>
                  <span className="text-xs text-amber-500/70">{ev.profiles?.display_name}</span>
                </div>
              ))}
            </div>
          )}

          <h4 className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-2">Кто свободен:</h4>
          <div className="space-y-2">
            {slotsConfig.map(slot => {
              const people = friendsAvail[slot.id];
              return (
                <div key={slot.id} className="bg-zinc-950 p-3 rounded-xl flex items-center justify-between border border-zinc-800/50">
                  <span className="text-zinc-400 font-bold text-xs">{slot.label.split(' ')[0]}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {people.length > 0 
                      ? people.map((name, i) => <span key={i} className="bg-zinc-800 text-zinc-200 font-medium text-[10px] px-2 py-1 rounded-md">{name}</span>) 
                      : <span className="text-zinc-700 text-[10px] italic font-medium">Никто</span>}
                  </div>
                </div>
              );
            })}
          </div>
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
    // Подтягиваем ивенты и всех их участников (event_participants)
    const { data } = await supabase
      .from('events')
      .select(`id, title, event_date, owner_id, profiles(display_name), event_participants(user_id)`)
      .order('event_date', { ascending: true })
      .gte('event_date', getLocalToday()); // Показываем только будущие и сегодняшние
      
    if (data) setEvents(data);
  };

  React.useEffect(() => { fetchEvents(); }, []);

  const createEvent = async (e) => {
    e.preventDefault();
    // Создаем ивент
    const { data: newEvent } = await supabase.from('events').insert([{ title, event_date: date, owner_id: userId }]).select().single();
    if (newEvent) {
      // Автоматически подписываем создателя
      await supabase.from('event_participants').insert({ event_id: newEvent.id, user_id: userId });
    }
    setTitle(''); setDate(getLocalToday());
    fetchEvents();
  };

  const toggleSubscribe = async (eventId, isSubscribed) => {
    if (isSubscribed) {
      await supabase.from('event_participants').delete().match({ event_id: eventId, user_id: userId });
    } else {
      await supabase.from('event_participants').insert({ event_id: eventId, user_id: userId });
    }
    fetchEvents();
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Запланировать встречу</h2>
        <form onSubmit={createEvent} className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Название (напр. Шашлыки)" value={title} onChange={e => setTitle(e.target.value)} required className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 text-white" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 text-white" />
          <button type="submit" className="bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-900/20">Добавить</button>
        </form>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-zinc-200">Ближайшие ивенты</h2>
        <div className="space-y-4">
          {events.length === 0 && <p className="text-zinc-500 text-sm italic">Ивентов пока нет.</p>}
          {events.map(ev => {
            const participantsCount = ev.event_participants?.length || 0;
            const isSubscribed = ev.event_participants?.some(p => p.user_id === userId);

            return (
              <div key={ev.id} className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-extrabold text-zinc-100 text-lg">{ev.title}</h3>
                    <span className="text-amber-400 font-bold bg-amber-950/30 px-2 py-1 rounded text-xs border border-amber-900/30">{ev.event_date}</span>
                  </div>
                  <p className="text-xs text-zinc-500">Орг: {ev.profiles?.display_name} • Идут: <span className="text-zinc-300 font-bold">{participantsCount} чел.</span></p>
                </div>
                
                <button 
                  onClick={() => toggleSubscribe(ev.id, isSubscribed)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
                    isSubscribed 
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white' 
                      : 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  {isSubscribed ? 'Не иду' : 'Я иду!'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ================= ДОЛГИ И ТРАТЫ =================
function DebtsView({ userId, allProfiles }) {
  const [events, setEvents] = React.useState([]);
  
  // Форма добавления траты
  const [eventId, setEventId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [splitUsers, setSplitUsers] = React.useState([]); // Массив ID юзеров, на кого делим
  
  // Итоговый баланс
  const [balances, setBalances] = React.useState([]);

  const loadData = async () => {
    // 1. Ивенты (для селекта)
    const { data: evs } = await supabase.from('events').select('id, title').order('event_date', { ascending: false });
    if (evs) setEvents(evs);

    // 2. Все траты и их разделения для подсчета баланса
    const { data: expenses } = await supabase.from('expenses').select('payer_id, amount, expense_splits(user_id, amount)');
    
    if (expenses) {
      const calc = {};
      Object.keys(allProfiles).forEach(id => calc[id] = { id, name: allProfiles[id], total: 0 });
      
      expenses.forEach(ex => {
        const cost = parseFloat(ex.amount);
        // Плательщику плюсуем всю сумму (он в плюсе)
        if (calc[ex.payer_id]) calc[ex.payer_id].total += cost;
        
        // Каждому участнику сплита минусуем его долю
        ex.expense_splits.forEach(sp => {
          if (calc[sp.user_id]) calc[sp.user_id].total -= parseFloat(sp.amount);
        });
      });

      const result = Object.values(calc).sort((a,b) => b.total - a.total).filter(u => Math.abs(u.total) > 0.01);
      setBalances(result);
    }
  };

  React.useEffect(() => { loadData(); }, [allProfiles]);

  // Когда выбираем ивент - подтягиваем его участников, чтобы автоматически поставить им галочки
  const handleEventChange = async (e) => {
    const eid = e.target.value;
    setEventId(eid);
    if (!eid) return setSplitUsers([]);

    const { data } = await supabase.from('event_participants').select('user_id').eq('event_id', eid);
    if (data) {
      setSplitUsers(data.map(d => d.user_id));
    }
  };

  const toggleSplitUser = (uid) => {
    if (splitUsers.includes(uid)) setSplitUsers(splitUsers.filter(id => id !== uid));
    else setSplitUsers([...splitUsers, uid]);
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (splitUsers.length === 0) return alert('Выберите хотя бы одного человека для разделения траты!');
    
    const cost = parseFloat(amount);
    
    // 1. Создаем запись о трате
    const { data: newExp, error } = await supabase.from('expenses').insert([{
      event_id: eventId, payer_id: userId, amount: cost, description: desc, split_type: 'custom'
    }]).select().single();
    
    if (error) return alert('Ошибка сохранения траты');

    // 2. Создаем доли (делим поровну на выбранных)
    const splitAmount = cost / splitUsers.length;
    const splitsToInsert = splitUsers.map(uid => ({
      expense_id: newExp.id,
      user_id: uid,
      amount: splitAmount
    }));

    await supabase.from('expense_splits').insert(splitsToInsert);
    
    setAmount(''); setDesc(''); setEventId(''); setSplitUsers([]);
    loadData();
  };

  const splitPreview = amount && splitUsers.length > 0 ? (parseFloat(amount) / splitUsers.length).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-amber-500">Добавить трату</h2>
        <form onSubmit={addExpense} className="space-y-4">
          <select value={eventId} onChange={handleEventChange} required className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 text-white">
            <option value="">Сначала выберите ивент...</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          
          <div className="flex gap-3">
            <input type="number" step="0.01" placeholder="Сумма" value={amount} onChange={e => setAmount(e.target.value)} required disabled={!eventId} className="w-1/3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 text-white disabled:opacity-50" />
            <input type="text" placeholder="За что? (напр. Еда)" value={desc} onChange={e => setDesc(e.target.value)} required disabled={!eventId} className="w-2/3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 text-white disabled:opacity-50" />
          </div>

          {eventId && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50 mt-4">
              <h4 className="text-sm font-bold text-zinc-400 mb-3">На кого делим? (по {splitPreview} на человека)</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(allProfiles).map(([uid, name]) => {
                  const isChecked = splitUsers.includes(uid);
                  return (
                    <button 
                      type="button" key={uid} onClick={() => toggleSplitUser(uid)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        isChecked ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}{name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button type="submit" disabled={!eventId} className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 disabled:opacity-50">
            Сохранить долг
          </button>
        </form>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-zinc-200">Общий баланс компании</h2>
        <p className="text-zinc-500 text-sm mb-6">Зеленый — человеку должны скинуться. Красный — человек в минусе, должен отдать.</p>
        
        <div className="space-y-3">
          {balances.length === 0 && <p className="text-zinc-500 text-sm italic">Все долги закрыты или трат еще не было.</p>}
          {balances.map((b, i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
              <span className="text-zinc-300 font-bold">{b.name}</span>
              <span className={`font-extrabold px-3 py-1 rounded-lg ${b.total > 0 ? 'text-emerald-400 bg-emerald-950/30' : 'text-rose-400 bg-rose-950/30'}`}>
                {b.total > 0 ? '+' : ''}{b.total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
