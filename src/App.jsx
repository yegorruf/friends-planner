import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Утилита для получения локальной даты в формате YYYY-MM-DD
const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Утилита для красивого отображения даты ("24 июля 2026")
const formatReadableDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

// Палитра Google Material Design
const AVATAR_COLORS = [
  { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', ring: 'ring-blue-500' },
  { id: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', ring: 'ring-red-500' },
  { id: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', ring: 'ring-green-500' },
  { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', ring: 'ring-purple-500' },
  { id: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', ring: 'ring-amber-500' },
  { id: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', ring: 'ring-teal-500' },
  { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', ring: 'ring-pink-500' },
  { id: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', ring: 'ring-indigo-500' },
];

const EMOJI_LIST = ['😎', '🍕', '🎮', '🚀', '🐱', '🥑', '⚡️', '🎉', '⚽️', '☕️', '🎧', '🔥'];

// Утилита получения стилей профиля (с кастомизацией и fallback)
const getProfileStyle = (profileObj) => {
  if (typeof profileObj === 'string') {
    let hash = 0;
    for (let i = 0; i < profileObj.length; i++) hash = profileObj.charCodeAt(i) + ((hash << 5) - hash);
    const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    return { ...color, emoji: null, name: profileObj };
  }

  if (!profileObj) return { ...AVATAR_COLORS[0], emoji: null, name: 'Гость' };

  let color = AVATAR_COLORS.find(c => c.id === profileObj.avatar_color);
  if (!color) {
    let hash = 0;
    const name = profileObj.display_name || '';
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  return {
    ...color,
    emoji: profileObj.avatar_emoji || null,
    name: profileObj.display_name || 'Пользователь'
  };
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [fullProfiles, setFullProfiles] = useState([]); // Полные объекты профилей
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [activeTab, setActiveTab] = useState('calendar');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const loadProfiles = async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      setFullProfiles(data);
      const profMap = {};
      let adminStatus = false;
      data.forEach(p => {
        profMap[p.id] = p.display_name;
        if (p.id === session.user.id && p.is_admin === true) {
          adminStatus = true;
        }
      });
      setProfiles(profMap);
      setIsAdmin(adminStatus);
    }
  };

  useEffect(() => { loadProfiles(); }, [session]);

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

  const currentProfileObj = fullProfiles.find(p => p.id === session?.user?.id);
  const currentStyle = getProfileStyle(currentProfileObj);

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
            Friend Planner {isAdmin && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded ml-1">ADMIN</span>}
          </span>
          <div className="flex items-center gap-3">
            {/* Кликабельная карточка профиля */}
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors bg-white shadow-sm"
              title="Настройки профиля"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStyle.bg} ${currentStyle.text}`}>
                {currentStyle.emoji || currentStyle.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[100px] sm:max-w-[150px] truncate">
                {currentStyle.name}
              </span>
              <span className="text-gray-400 text-xs">⚙️</span>
            </button>

            <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-md font-medium transition-colors border border-gray-200">
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
        {activeTab === 'calendar' && <CalendarView userId={session.user.id} fullProfiles={fullProfiles} inputClass={inputBaseClass} />}
        {activeTab === 'events' && <EventsView userId={session.user.id} fullProfiles={fullProfiles} inputClass={inputBaseClass} />}
        {activeTab === 'debts' && <DebtsView userId={session.user.id} fullProfiles={fullProfiles} allProfilesMap={profiles} inputClass={inputBaseClass} />}
        {activeTab === 'admin' && isAdmin && <AdminView currentUserId={session.user.id} fullProfiles={fullProfiles} allProfilesMap={profiles} onRefresh={loadProfiles} />}
      </main>

      {/* МОДАЛКА НАСТРОЕК ПРОФИЛЯ */}
      {isProfileModalOpen && (
        <ProfileModal 
          user={session.user} 
          currentProfile={currentProfileObj} 
          onClose={() => setIsProfileModalOpen(false)} 
          onSave={() => { loadProfiles(); setIsProfileModalOpen(false); }}
          inputClass={inputBaseClass}
        />
      )}
    </div>
  );
}

// ================= МОДАЛКА КАСТОМИЗАЦИИ ПРОФИЛЯ =================
function ProfileModal({ user, currentProfile, onClose, onSave, inputClass }) {
  const [name, setName] = useState(currentProfile?.display_name || '');
  const [selectedColor, setSelectedColor] = useState(currentProfile?.avatar_color || 'blue');
  const [selectedEmoji, setSelectedEmoji] = useState(currentProfile?.avatar_emoji || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const updates = {
      display_name: name.trim(),
      avatar_color: selectedColor,
      avatar_emoji: selectedEmoji || null
    };

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    setIsSaving(false);

    if (error) {
      alert('Ошибка при сохранении: ' + error.message);
    } else {
      onSave();
    }
  };

  const previewStyle = getProfileStyle({ display_name: name || 'Имя', avatar_color: selectedColor, avatar_emoji: selectedEmoji });

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Настройки профиля</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Предпросмотр аватарки */}
          <div className="flex flex-col items-center justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-sm transition-all border-2 ${previewStyle.bg} ${previewStyle.text} ${previewStyle.border}`}>
              {previewStyle.emoji || previewStyle.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs text-gray-400 mt-2">Предпросмотр иконки</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ваше имя</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
          </div>

          {/* Выбор цвета */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Цвет профиля</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  className={`h-10 rounded-lg flex items-center justify-center border transition-all ${color.bg} ${color.border} ${selectedColor === color.id ? `ring-2 ${color.ring} ring-offset-2` : ''}`}
                >
                  <span className={`w-3 h-3 rounded-full ${color.bg.replace('-100', '-500')}`}></span>
                </button>
              ))}
            </div>
          </div>

          {/* Выбор эмодзи */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Эмодзи (опционально)</label>
            <div className="flex flex-wrap gap-1.5 justify-between bg-gray-50 p-2 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedEmoji('')}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${!selectedEmoji ? 'bg-white shadow border border-gray-300' : 'text-gray-400'}`}
              >
                Буква
              </button>
              {EMOJI_LIST.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${selectedEmoji === e ? 'bg-white shadow border border-gray-300 scale-110' : 'hover:bg-gray-200'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ================= КАЛЕНДАРЬ =================
function CalendarView({ userId, fullProfiles }) {
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

      const { data: friendsData } = await supabase.from('availability').select('slot, user_id').eq('date', selectedDate);
      if (friendsData) {
        const grouped = { morning: [], afternoon: [], evening: [], night: [] };
        friendsData.forEach(item => {
          const prof = fullProfiles.find(p => p.id === item.user_id);
          if (prof) grouped[item.slot].push(prof);
        });
        Object.keys(grouped).forEach(k => {
          const unique = [];
          const map = new Map();
          for (const item of grouped[k]) {
            if(!map.has(item.id)){
              map.set(item.id, true);
              unique.push(item);
            }
          }
          grouped[k] = unique;
        });
        setFriendsAvail(grouped);
      }

      const { data: evsData, error: evsError } = await supabase
        .from('events')
        .select(`
          id, title, owner_id,
          event_participants(user_id),
          expenses(id, amount, description, payer_id)
        `)
        .eq('event_date', selectedDate);
        
      if (evsError) console.error('Ошибка в календаре:', evsError);
      if (evsData) setDayEvents(evsData);
    }
    fetchDayData();
  }, [selectedDate, userId, isModalOpen, fullProfiles]);

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
                    const peopleList = friendsAvail[slot.id] || [];
                    return (
                      <div key={slot.id} className="bg-gray-50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 gap-2">
                        <span className="text-gray-600 font-medium text-sm">{slot.label.split(' ')[0]}</span>
                        <div className="flex flex-wrap gap-1.5 sm:justify-end">
                          {peopleList.length > 0
                            ? peopleList.map((prof) => {
                                const style = getProfileStyle(prof);
                                return (
                                  <span key={prof.id} className={`font-medium text-xs px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                    {style.emoji ? `${style.emoji} ` : ''}{style.name}
                                  </span>
                                );
                              })
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
                      const ownerProf = fullProfiles.find(p => p.id === ev.owner_id);
                      const ownerStyle = getProfileStyle(ownerProf);

                      return (
                        <div key={ev.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-semibold text-gray-900 text-lg">{ev.title}</h5>
                              <p className="text-xs text-gray-500 mt-1">Организатор: <span className={`font-medium ${ownerStyle.text}`}>{ownerStyle.name}</span></p>
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
                                {expenses.map(exp => {
                                  const payerProf = fullProfiles.find(p => p.id === exp.payer_id);
                                  const payerStyle = getProfileStyle(payerProf);
                                  return (
                                    <div key={exp.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-md">
                                      <span className="text-gray-600 truncate max-w-[60%]">
                                        {exp.description} <span className={`font-medium ${payerStyle.text}`}>({payerStyle.name})</span>
                                      </span>
                                      <span className="text-gray-900 font-medium">{exp.amount} BYN</span>
                                    </div>
                                  );
                                })}
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
function EventsView({ userId, fullProfiles, inputClass }) {
  const [events, setEvents] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(getLocalToday());

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`id, title, event_date, owner_id, event_participants(user_id)`)
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
            const ownerProf = fullProfiles.find(p => p.id === ev.owner_id);
            const ownerStyle = getProfileStyle(ownerProf);

            return (
              <div key={ev.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white hover:border-gray-200">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                    <span className="bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded text-xs">{formatReadableDate(ev.event_date)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Орг: <span className={`font-medium ${ownerStyle.text}`}>{ownerStyle.name}</span> 
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
function DebtsView({ userId, fullProfiles, allProfilesMap, inputClass }) {
  const [events, setEvents] = React.useState([]);
  const [eventId, setEventId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [splitUsers, setSplitUsers] = React.useState([]); 

  const loadData = async () => {
    const { data: evs } = await supabase.from('events').select('id, title').order('event_date', { ascending: false });
    if (evs) setEvents(evs);
  };

  React.useEffect(() => { loadData(); }, [allProfilesMap]);

  const handleEventChange = async (e) => {
    const eid = e.target.value;
    setEventId(eid);
    if (!eid) return setSplitUsers([]);

    const { data } = await supabase.from('event_participants').select('user_id').eq('event_id', eid);
    if (data && data.length > 0) {
      setSplitUsers(data.map(d => d.user_id));
    } else {
      setSplitUsers(Object.keys(allProfilesMap));
    }
  };

  const toggleSplitUser = (uid) => {
    if (splitUsers.includes(uid)) setSplitUsers(splitUsers.filter(id => id !== uid));
    else setSplitUsers([...splitUsers, uid]);
  };

  const toggleAllUsers = () => {
    const allIds = Object.keys(allProfilesMap);
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
    alert('Трата успешно записана!');
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
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Сумма (BYN)</label>
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
                <h4 className="text-sm font-medium text-gray-700">На кого делим чек? <span className="text-gray-500 font-normal">(по {splitPreview} BYN)</span></h4>
                <button type="button" onClick={toggleAllUsers} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  {splitUsers.length === Object.keys(allProfilesMap).length ? 'Снять выделение' : 'Выбрать всех'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(allProfilesMap).map(([uid, name]) => {
                  const isChecked = splitUsers.includes(uid);
                  const prof = fullProfiles.find(p => p.id === uid);
                  const style = getProfileStyle(prof || name);
                  return (
                    <button 
                      type="button" key={uid} onClick={() => toggleSplitUser(uid)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isChecked 
                          ? `${style.bg} ${style.border} ${style.text}` 
                          : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-100'
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
function AdminView({ currentUserId, fullProfiles, allProfilesMap, onRefresh }) {
  const [adminSubTab, setAdminSubTab] = React.useState('events');
  const [eventsList, setEventsList] = React.useState([]);
  const [expensesList, setExpensesList] = React.useState([]);

  const loadAdminData = async () => {
    const { data: evs } = await supabase
      .from('events')
      .select(`id, title, event_date, owner_id`)
      .order('event_date', { ascending: false });
    if (evs) setEventsList(evs);

    const { data: exps } = await supabase
      .from('expenses')
      .select(`id, amount, description, payer_id, events(title)`)
      .order('id', { ascending: false });
    if (exps) setExpensesList(exps);
  };

  React.useEffect(() => { loadAdminData(); }, []);

  const handleDeleteEvent = async (id, title) => {
    if (!confirm(`Удалить событие "${title}" и все связанные с ним записи?`)) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) alert('Ошибка удаления: ' + error.message);
    else loadAdminData();
  };

  const handleDeleteExpense = async (id, desc) => {
    if (!confirm(`Удалить трату "${desc}"?`)) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) alert('Ошибка удаления: ' + error.message);
    else loadAdminData();
  };

  const handleToggleAdmin = async (id, currentStatus, name) => {
    if (id === currentUserId) return alert('Вы не можете лишить админки самого себя!');
    const newStatus = !currentStatus;
    if (!confirm(`${newStatus ? 'Назначить' : 'Снять'} права админа для "${name}"?`)) return;

    const { error } = await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', id);
    if (error) alert('Ошибка обновления прав: ' + error.message);
    else {
      onRefresh();
      loadAdminData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">👑 Панель управления</h2>
            <p className="text-xs text-gray-500 mt-0.5">Раздел только для администраторов</p>
          </div>

          <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
            {[
              { id: 'events', label: 'События' },
              { id: 'expenses', label: 'Траты' },
              { id: 'users', label: 'Юзеры' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  adminSubTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {adminSubTab === 'events' && (
          <div className="space-y-3">
            {eventsList.length === 0 && <p className="text-gray-500 text-sm italic">Событий пока нет.</p>}
            {eventsList.map(ev => {
              const ownerProf = fullProfiles.find(p => p.id === ev.owner_id);
              const ownerStyle = getProfileStyle(ownerProf);
              return (
                <div key={ev.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{ev.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Дата: {formatReadableDate(ev.event_date)} • Орг: <span className={ownerStyle.text}>{ownerStyle.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.title)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-red-200"
                  >
                    Удалить
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {adminSubTab === 'expenses' && (
          <div className="space-y-3">
            {expensesList.length === 0 && <p className="text-gray-500 text-sm italic">Трат пока нет.</p>}
            {expensesList.map(exp => {
              const payerProf = fullProfiles.find(p => p.id === exp.payer_id);
              const payerStyle = getProfileStyle(payerProf);
              return (
                <div key={exp.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{exp.description} — <span className="text-blue-600">{exp.amount} BYN</span></h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ивент: <span className="font-medium text-gray-700">{exp.events?.title || 'Без названия'}</span> • Платил: <span className={payerStyle.text}>{payerStyle.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(exp.id, exp.description)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-red-200"
                  >
                    Удалить
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {adminSubTab === 'users' && (
          <div className="space-y-3">
            {fullProfiles.map(p => {
              const style = getProfileStyle(p);
              return (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${style.bg} ${style.text} ${style.border}`}>
                      {style.emoji || style.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                        {p.display_name} 
                        {p.is_admin && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">ADMIN</span>}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">@{p.login}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAdmin(p.id, p.is_admin, p.display_name)}
                    disabled={p.id === currentUserId}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      p.is_admin 
                        ? 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300 disabled:opacity-50' 
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {p.is_admin ? 'Снять админа' : 'Дать админа'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
