import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatReadableDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

const getUserBadgeClass = (name) => {
  if (!name) return 'bg-gray-100 border-gray-200 text-gray-500';
  const palettes = [
    'bg-red-50 border-red-200 text-red-700',
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-green-50 border-green-200 text-green-700',
    'bg-purple-50 border-purple-200 text-purple-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
};

const getUserTextClass = (name) => {
  if (!name) return 'text-gray-500';
  const colors = ['text-red-600', 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-amber-600', 'text-cyan-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [isAdmin, setIsAdmin] = useState(false); // Добавили состояние админа
  
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

  useEffect(() => {
    if (session) {
      supabase.from('profiles').select('*').then(({ data }) => {
        if (data) {
          const profMap = {};
          let adminStatus = false;
          data.forEach(p => {
            profMap[p.id] = p.display_name;
            // Проверяем, является ли текущий пользователь админом
            if (p.id === session.user.id && p.is_admin === true) {
              adminStatus = true;
            }
          });
          setProfiles(profMap);
          setIsAdmin(adminStatus);
        }
      });
    }
  }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const cleanLogin = login.trim().toLowerCase();
    const email = `${cleanLogin}@friendplanner.com`;

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(`Ошибка входа: ${error.message === 'Invalid login credentials' ? 'Неверный логин или пароль' : error.message}`);
    } else {
      if (inviteCode !== '7777') return alert('Неверный инвайт-код!');
      
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        if (error.message.includes('already registered')) return alert('Этот логин уже занят!');
        return alert(`Ошибка регистрации: ${error.message}`);
      }

      if (data.user) {
        // По умолчанию is_admin не передаем (он станет false в БД)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, login: cleanLogin, display_name: displayName.trim() }]);
          
        if (profileError) {
          alert(`Ошибка создания профиля: ${profileError.message}`);
        } else {
          alert('Успешно! Теперь вы можете войти.');
          setIsLoginMode(true);
          setPassword('');
        }
      }
    }
  };

  const inputBaseClass = "w-full bg-white rounded-md p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-800 placeholder-gray-400 shadow-sm";

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
        <form onSubmit={handleAuth} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-sm space-y-5">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              {isLoginMode ? 'Вход' : 'Регистрация'}
            </h1>
            <p className="text-sm text-gray-500 mt-2">Добро пожаловать в Friend Planner</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин (на англ.)</label>
            <input type="text" value={login} onChange={e => setLogin(e.target.value.toLowerCase())} className={inputBaseClass} placeholder="Логин" required />
          </div>
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя (отображаемое)</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputBaseClass} placeholder="Егор" required={!isLoginMode} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль (мин. 6 символов)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputBaseClass} required minLength={6} />
          </div>
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Инвайт-код</label>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className={inputBaseClass} placeholder="Код приглашения" required={!isLoginMode} />
            </div>
          )}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors shadow-sm">
            {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
          </button>
          <div className="text-center pt-2">
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
              {isLoginMode ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Формируем вкладки динамически, чтобы добавить админку только избранным
  const navTabs = [
    { id: 'calendar', name: 'Календарь' },
    { id: 'events', name: 'События' },
    { id: 'debts', name: 'Долги' }
  ];
  if (isAdmin) {
    navTabs.push({ id: 'admin', name: '👑 Админка' });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <span className="font-bold text-blue-600 text-xl tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
            Friend Planner {isAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded ml-2">ADMIN</span>}
          </span>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-blue-100 text-blue-700`}>
                {profiles[session.user.id]?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {profiles[session.user.id]}
              </span>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors border border-gray-200">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-4xl mx-auto flex p-4 justify-center sm:justify-start overflow-x-auto">
        <div className="bg-white border border-gray-200 rounded-full p-1 flex shadow-sm min-w-max">
          {navTabs.map(tab => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'calendar' && <CalendarView userId={session.user.id} allProfiles={profiles} inputClass={inputBaseClass} />}
        {activeTab === 'events' && <EventsView userId={session.user.id} inputClass={inputBaseClass} />}
        {activeTab === 'debts' && <DebtsView userId={session.user.id} allProfiles={profiles} inputClass={inputBaseClass} />}
        {activeTab === 'admin' && isAdmin && <AdminView allProfiles={profiles} />}
      </main>
    </div>
  );
}

// ================= КАЛЕНДАРЬ + МОДАЛКА =================
function CalendarView({ userId, allProfiles }) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(getLocalToday());
  const [mySlots, setMySlots] = React.useState([]);
  const [friendsAvail, setFriendsAvail] = React.useState({ morning: [], afternoon: [], evening: [], night: [] });
  const [dayEvents, setDayEvents] = React.useState([]);
  const [monthStats, setMonthStats] = React.useState({});
  const [monthEvents, setMonthEvents] = React.useState({}); 
  const [isLoading, setIsLoading] = React.useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  React.useEffect(() => {
    async function fetchMonthData() {
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

      const { data: eventsData } = await supabase.from('events').select('id, event_date').gte('event_date', startDate).lte('event_date', endDate);
      if (eventsData) {
        const evs = {};
        eventsData.forEach(ev => {
          if (!evs[ev.event_date]) evs[ev.event_date] = [];
          evs[ev.event_date].push(ev);
        });
        setMonthEvents(evs);
      }
    }
    fetchMonthData();
  }, [year, month, daysInMonth]);

  React.useEffect(() => {
    if (!isModalOpen) return;

    async function fetchDayData() {
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

      const { data: evsData, error: evsError } = await supabase
        .from('events')
        .select(`
          id, title, owner_id,
          profiles!events_owner_id_fkey(display_name),
          event_participants(user_id),
          expenses(id, amount, description, payer_id)
        `)
        .eq('event_date', selectedDate);
        
      if (evsError) console.error('Ошибка в календаре:', evsError);
      if (evsData) setDayEvents(evsData);
    }
    fetchDayData();
  }, [selectedDate, userId, isModalOpen]);

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
    setIsLoading(false);
  };

  const toggleEventSubscribe = async (eventId, isSubscribed) => {
    if (isSubscribed) {
      await supabase.from('event_participants').delete().match({ event_id: eventId, user_id: userId });
    } else {
      await supabase.from('event_participants').insert({ event_id: eventId, user_id: userId });
    }
    setDayEvents(dayEvents.map(ev => {
      if (ev.id === eventId) {
        const newParticipants = isSubscribed 
          ? ev.event_participants.filter(p => p.user_id !== userId)
          : [...ev.event_participants, { user_id: userId }];
        return { ...ev, event_participants: newParticipants };
      }
      return ev;
    }));
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
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
  const todayStr = getLocalToday();

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-gray-800 hidden sm:block">Общий календарь</h2>
          <div className="flex items-center justify-between w-full sm:w-auto bg-gray-50 p-1 rounded-md border border-gray-200">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-600 hover:bg-gray-200 hover:text-gray-900 px-3 py-1.5 rounded transition-colors">&larr;</button>
            <span className="font-medium text-gray-800 min-w-[120px] text-center capitalize">{monthNames[month]} {year}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-600 hover:bg-gray-200 hover:text-gray-900 px-3 py-1.5 rounded transition-colors">&rarr;</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="text-xs font-medium text-gray-500 py-1 uppercase">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const freeCount = monthStats[dateStr] || 0;
            const isCrowded = freeCount >= 3; 
            const hasEvents = monthEvents[dateStr] && monthEvents[dateStr].length > 0;

            let btnClass = 'bg-transparent text-gray-700 hover:bg-gray-100 rounded-full h-10 w-10 sm:h-12 sm:w-12 mx-auto';
            if (isCrowded) btnClass = 'bg-blue-50 text-blue-800 font-medium hover:bg-blue-100 rounded-full h-10 w-10 sm:h-12 sm:w-12 mx-auto';
            if (isToday) btnClass = 'bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md rounded-full h-10 w-10 sm:h-12 sm:w-12 mx-auto';

            return (
              <button key={day} onClick={() => handleDayClick(dateStr)} className={`relative flex flex-col items-center justify-center text-sm transition-all cursor-pointer ${btnClass}`}>
                <span>{day}</span>
                {hasEvents && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative animate-fade-in border border-gray-100">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md p-5 border-b border-gray-100 flex justify-between items-center z-10 rounded-t-2xl">
              <h3 className="text-xl font-medium text-gray-900">{formatReadableDate(selectedDate)}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-5 space-y-8">
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Моя доступность</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {slotsConfig.map(slot => {
                    const isActive = mySlots.includes(slot.id);
                    return (
                      <button key={slot.id} onClick={() => toggleSlot(slot.id)} disabled={isLoading}
                        className={`p-3 rounded-xl font-medium transition-all text-sm border ${
                          isActive 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Кто из друзей свободен</h4>
                <div className="space-y-2">
                  {slotsConfig.map(slot => {
                    const people = friendsAvail[slot.id] || [];
                    return (
                      <div key={slot.id} className="bg-gray-50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 gap-2">
                        <span className="text-gray-600 font-medium text-sm">{slot.label.split(' ')[0]}</span>
                        <div className="flex flex-wrap gap-1.5 sm:justify-end">
                          {people.length > 0
                            ? people.map((name, i) => (
                                <span key={i} className={`font-medium text-xs px-2.5 py-1 rounded-full border ${getUserBadgeClass(name)}`}>
                                  {name}
                                </span>
                              ))
                            : <span className="text-gray-400 text-xs italic">Пока никого</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Планы на этот день</h4>
                {dayEvents.length === 0 ? (
                  <p className="text-gray-500 text-sm italic bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">Запланированных встреч нет.</p>
                ) : (
                  <div className="space-y-4">
                    {dayEvents.map(ev => {
                      const isSubscribed = ev.event_participants?.some(p => p.user_id === userId);
                      const participantsCount = ev.event_participants?.length || 0;
                      const expenses = ev.expenses || [];

                      return (
                        <div key={ev.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-semibold text-gray-900 text-lg">{ev.title}</h5>
                              <p className="text-xs text-gray-500 mt-1">Организатор: <span className={getUserTextClass(ev.profiles?.display_name)}>{ev.profiles?.display_name}</span></p>
                              <p className="text-xs text-gray-500 mt-0.5">Участников: <span className="text-gray-700 font-medium">{participantsCount}</span></p>
                            </div>
                            <button
                              onClick={() => toggleEventSubscribe(ev.id, isSubscribed)}
                              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                isSubscribed 
                                  ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50' 
                                  : 'bg-blue-600 border-transparent text-white hover:bg-blue-700'
                              }`}
                            >
                              {isSubscribed ? 'Слиться' : 'Я иду!'}
                            </button>
                          </div>
                          {expenses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Связанные траты:</span>
                              <div className="mt-2 space-y-2">
                                {expenses.map(exp => (
                                  <div key={exp.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-md">
                                    <span className="text-gray-600 truncate max-w-[60%]">
                                      {exp.description} <span className={`font-medium ${getUserTextClass(allProfiles[exp.payer_id])}`}>({allProfiles[exp.payer_id]})</span>
                                    </span>
                                    <span className="text-gray-900 font-medium">{exp.amount} ₽</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= ИВЕНТЫ =================
function EventsView({ userId, inputClass }) {
  const [events, setEvents] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(getLocalToday());

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`id, title, event_date, owner_id, profiles!events_owner_id_fkey(display_name), event_participants(user_id)`)
      .order('event_date', { ascending: true })
      .gte('event_date', getLocalToday()); 
      
    if (error) console.error('Ошибка загрузки ивентов:', error);
    if (data) setEvents(data);
  };

  React.useEffect(() => { fetchEvents(); }, []);

  const createEvent = async (e) => {
    e.preventDefault();
    const { data: newEvent } = await supabase.from('events').insert([{ title, event_date: date, owner_id: userId }]).select().single();
    if (newEvent) {
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
    
    setEvents(events.map(ev => {
      if (ev.id === eventId) {
        const newParticipants = isSubscribed 
          ? ev.event_participants.filter(p => p.user_id !== userId)
          : [...ev.event_participants, { user_id: userId }];
        return { ...ev, event_participants: newParticipants };
      }
      return ev;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-5">Запланировать встречу</h2>
        <form onSubmit={createEvent} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Название</label>
            <input type="text" placeholder="Напр. Шашлыки" value={title} onChange={e => setTitle(e.target.value)} required className={inputClass} />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} />
          </div>
          <div className="w-full sm:w-auto sm:pt-5">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium shadow-sm transition-colors">
              Добавить
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-5">Ближайшие события</h2>
        <div className="space-y-3">
          {events.length === 0 && <p className="text-gray-500 text-sm">Нет запланированных событий.</p>}
          {events.map(ev => {
            const participantsCount = ev.event_participants?.length || 0;
            const isSubscribed = ev.event_participants?.some(p => p.user_id === userId);

            return (
              <div key={ev.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white hover:border-gray-200">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                    <span className="bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded text-xs">{formatReadableDate(ev.event_date)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Орг: <span className={`font-medium ${getUserTextClass(ev.profiles?.display_name)}`}>{ev.profiles?.display_name}</span> 
                    <span className="mx-2">•</span> 
                    Участников: <span className="text-gray-700 font-medium">{participantsCount}</span>
                  </p>
                </div>
                
                <button 
                  onClick={() => toggleSubscribe(ev.id, isSubscribed)}
                  className={`px-5 py-2 rounded-full font-medium text-sm transition-colors border w-full sm:w-auto ${
                    isSubscribed 
                      ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50' 
                      : 'bg-blue-600 border-transparent text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {isSubscribed ? 'Слиться' : 'Я иду!'}
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
function DebtsView({ userId, allProfiles, inputClass }) {
  const [events, setEvents] = React.useState([]);
  const [eventId, setEventId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [splitUsers, setSplitUsers] = React.useState([]); 

  const loadData = async () => {
    const { data: evs } = await supabase.from('events').select('id, title').order('event_date', { ascending: false });
    if (evs) setEvents(evs);
  };

  React.useEffect(() => { loadData(); }, [allProfiles]);

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

  const toggleAllUsers = () => {
    const allIds = Object.keys(allProfiles);
    if (splitUsers.length === allIds.length) setSplitUsers([]);
    else setSplitUsers(allIds);
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (splitUsers.length === 0) return alert('Выберите хотя бы одного человека для разделения траты!');
    
    const cost = parseFloat(amount);
    
    const { data: newExp, error } = await supabase.from('expenses').insert([{
      event_id: eventId, payer_id: userId, amount: cost, description: desc, split_type: 'custom'
    }]).select().single();
    
    if (error) return alert('Ошибка сохранения траты');

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
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-5">Добавить трату</h2>
        <form onSubmit={addExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">К какому событию привязать?</label>
            <select value={eventId} onChange={handleEventChange} required className={inputClass}>
              <option value="">Выберите событие...</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Сумма (₽)</label>
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required disabled={!eventId} className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`} />
            </div>
            <div className="w-full sm:w-2/3">
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Описание</label>
              <input type="text" placeholder="Напр. Пицца и напитки" value={desc} onChange={e => setDesc(e.target.value)} required disabled={!eventId} className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`} />
            </div>
          </div>

          {eventId && (
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mt-4 animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <h4 className="text-sm font-medium text-gray-700">На кого делим чек? <span className="text-gray-500 font-normal">(по {splitPreview} ₽)</span></h4>
                <button type="button" onClick={toggleAllUsers} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  {splitUsers.length === Object.keys(allProfiles).length ? 'Снять выделение' : 'Выбрать всех'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(allProfiles).map(([uid, name]) => {
                  const isChecked = splitUsers.includes(uid);
                  return (
                    <button 
                      type="button" key={uid} onClick={() => toggleSplitUser(uid)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isChecked 
                          ? 'bg-blue-100 border-blue-200 text-blue-800' 
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}{name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={!eventId} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium shadow-sm transition-colors disabled:opacity-50 disabled:hover:bg-blue-600">
              Сохранить долг
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= АДМИН ПАНЕЛЬ =================
function AdminView({ allProfiles }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-2">👑 Панель администратора</h2>
        <p className="text-sm text-gray-500 mb-6">Список всех зарегистрированных пользователей.</p>
        
        <div className="space-y-3">
          {Object.entries(allProfiles).map(([id, name]) => (
            <div key={id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getUserBadgeClass(name)}`}>
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium text-gray-800">{name}</span>
              </div>
              <span className="text-xs text-gray-400 font-mono hidden sm:block">{id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
