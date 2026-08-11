import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Trophy, 
  Eye, 
  Trash2, 
  CalendarDays, 
  ListFilter,
  X,
  ShieldAlert,
  Pencil
} from 'lucide-react';
import { Team } from '../types';
import { supabase } from '../lib/supabase';

interface CalendarViewProps {
  season: string;
  selectedTeam: Team | null;
  teams: Team[];
}

export interface MatchEvent {
  id: string;
  dateIso: string; // YYYY-MM-DD
  time: string;
  homeTeam: string; // Equipo Local
  awayTeam: string; // Equipo Visitante
  location: string;
  type: string; // Competición / Tipo
  team: string; // Categoría / Plantilla asignada
  status: 'upcoming' | 'finished';
  homeScore: number | null;
  awayScore: number | null;
  notes?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export default function CalendarView({ season, selectedTeam, teams }: CalendarViewProps) {
  // View mode: 'monthly' (Calendario Mensual) vs 'list' (Lista)
  const [viewMode, setViewMode] = useState<'monthly' | 'list'>('monthly');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateIso: string; events: MatchEvent[] } | null>(null);

  // Current calendar month/year state (Default August 2026)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026

  const initialMatches: MatchEvent[] = [
    {
      id: '1',
      dateIso: '2026-08-04',
      time: '18:00',
      homeTeam: 'ATB FEMENINO A',
      awayTeam: 'Real Madrid Fem B',
      location: 'Campo Son Malferit',
      type: 'Liga 2ª RFEF',
      team: 'ATB FEMENINO A',
      status: 'upcoming',
      homeScore: null,
      awayScore: null
    },
    {
      id: '2',
      dateIso: '2026-08-11',
      time: '11:30',
      homeTeam: 'FC Barcelona C',
      awayTeam: 'ATB FEMENINO A',
      location: 'Ciudad Deportiva Joan Gamper',
      type: 'Liga 2ª RFEF',
      team: 'ATB FEMENINO A',
      status: 'upcoming',
      homeScore: null,
      awayScore: null
    },
    {
      id: '3',
      dateIso: '2026-08-18',
      time: '17:00',
      homeTeam: 'ATB FEMENINO B',
      awayTeam: 'RCD Espanyol B',
      location: 'Campo Son Malferit',
      type: 'Liga 2ª RFEF',
      team: 'ATB FEMENINO B',
      status: 'upcoming',
      homeScore: null,
      awayScore: null
    },
    {
      id: '4',
      dateIso: '2026-07-28',
      time: '19:00',
      homeTeam: 'ATB FEMENINO A',
      awayTeam: 'Levante Las Planas B',
      location: 'Campo Son Malferit',
      type: 'Amistoso Pretemporada',
      team: 'ATB FEMENINO A',
      status: 'finished',
      homeScore: 3,
      awayScore: 1
    },
    {
      id: '5',
      dateIso: '2026-07-20',
      time: '18:30',
      homeTeam: 'UD Collerense',
      awayTeam: 'ATB FEMENINO B',
      location: 'Coll d’en Rebassa',
      type: 'Copa Mallorca',
      team: 'ATB FEMENINO B',
      status: 'finished',
      homeScore: 0,
      awayScore: 2
    },
    {
      id: '6',
      dateIso: '2026-08-25',
      time: '12:00',
      homeTeam: 'Valencia CF B',
      awayTeam: 'ATB FEMENINO A',
      location: 'Ciudad Deportiva Valencia',
      type: 'Liga 2ª RFEF',
      team: 'ATB FEMENINO A',
      status: 'upcoming',
      homeScore: null,
      awayScore: null
    }
  ];

  const mapMatchFromDB = (m: any): MatchEvent => ({
    id: String(m.id),
    dateIso: m.date_iso || m.dateIso || m.date || '',
    time: m.time || '18:00',
    homeTeam: m.home_team || m.homeTeam || m.hometeam || '',
    awayTeam: m.away_team || m.awayTeam || m.awayteam || '',
    location: m.location || 'Campo Son Malferit',
    type: m.type || 'Liga 2ª RFEF',
    team: m.team || 'ATB FEMENINO A',
    status: m.status === 'finished' ? 'finished' : 'upcoming',
    homeScore: m.home_score !== undefined && m.home_score !== null ? m.home_score : (m.homeScore !== undefined ? m.homeScore : null),
    awayScore: m.away_score !== undefined && m.away_score !== null ? m.away_score : (m.awayScore !== undefined ? m.awayScore : null),
    notes: m.notes || ''
  });

  const [matchesList, setMatchesList] = useState<MatchEvent[]>(initialMatches);
  const [loading, setLoading] = useState(false);

  // Clear any existing localStorage data and load directly from Supabase
  useEffect(() => {
    try {
      localStorage.removeItem('calendar_matches_v1');
    } catch (e) {
      // Ignore storage errors
    }

    async function fetchMatches() {
      if (!supabase) return;
      setLoading(true);
      try {
        let response = await supabase
          .from('matches')
          .select('*')
          .order('date_iso', { ascending: true });

        if (response.error && (response.error.code === '42P01' || response.error.message?.includes('does not exist'))) {
          response = await supabase
            .from('calendar_matches')
            .select('*')
            .order('date_iso', { ascending: true });
        }

        if (response.data && response.data.length > 0) {
          const mapped = response.data.map(mapMatchFromDB);
          setMatchesList(mapped);
        }
      } catch (err) {
        console.error('Error loading matches from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [season]);

  // Edit Match State & Form State
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [newMatch, setNewMatch] = useState({
    homeTeam: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A',
    awayTeam: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: 'Campo Son Malferit',
    type: 'Liga 2ª RFEF',
    team: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A',
    status: 'upcoming' as 'upcoming' | 'finished',
    homeScore: '' as string | number,
    awayScore: '' as string | number
  });

  const handleOpenAddModal = (presetDateIso?: string) => {
    setEditingMatchId(null);
    setNewMatch({
      homeTeam: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A',
      awayTeam: '',
      date: presetDateIso || new Date().toISOString().split('T')[0],
      time: '18:00',
      location: 'Campo Son Malferit',
      type: 'Liga 2ª RFEF',
      team: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A',
      status: 'upcoming',
      homeScore: '',
      awayScore: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (match: MatchEvent) => {
    setEditingMatchId(match.id);
    setNewMatch({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: match.dateIso,
      time: match.time,
      location: match.location,
      type: match.type,
      team: match.team,
      status: match.status,
      homeScore: match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : '',
      awayScore: match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : ''
    });
    setShowAddModal(true);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.homeTeam.trim() || !newMatch.awayTeam.trim() || !newMatch.date || !newMatch.time) {
      return;
    }

    const parseScore = (val: string | number) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const homeScoreVal = newMatch.status === 'finished' ? parseScore(newMatch.homeScore) : null;
    const awayScoreVal = newMatch.status === 'finished' ? parseScore(newMatch.awayScore) : null;

    if (editingMatchId) {
      // Update existing match
      const updatedMatch: MatchEvent = {
        id: editingMatchId,
        dateIso: newMatch.date,
        time: newMatch.time,
        homeTeam: newMatch.homeTeam.trim(),
        awayTeam: newMatch.awayTeam.trim(),
        location: newMatch.location || 'Campo Son Malferit',
        type: newMatch.type || 'Liga 2ª RFEF',
        team: newMatch.team || (selectedTeam ? selectedTeam.name : 'ATB FEMENINO A'),
        status: newMatch.status,
        homeScore: homeScoreVal,
        awayScore: awayScoreVal
      };

      setMatchesList(prev => prev.map(m => m.id === editingMatchId ? updatedMatch : m));

      if (supabase) {
        const dbPayload = {
          home_team: updatedMatch.homeTeam,
          away_team: updatedMatch.awayTeam,
          date_iso: updatedMatch.dateIso,
          time: updatedMatch.time,
          location: updatedMatch.location,
          type: updatedMatch.type,
          team: updatedMatch.team,
          status: updatedMatch.status,
          home_score: updatedMatch.homeScore,
          away_score: updatedMatch.awayScore,
          season: season
        };

        try {
          let { error } = await supabase.from('matches').update(dbPayload).eq('id', editingMatchId);
          if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            await supabase.from('calendar_matches').update(dbPayload).eq('id', editingMatchId);
          }
        } catch (err) {
          console.error('Error updating match in Supabase:', err);
        }
      }

      if (selectedDayEvents) {
        setSelectedDayEvents(prev => prev ? {
          ...prev,
          events: prev.events.map(ev => ev.id === editingMatchId ? updatedMatch : ev)
        } : null);
      }
    } else {
      // Create new match
      const created: MatchEvent = {
        id: String(Date.now()),
        dateIso: newMatch.date,
        time: newMatch.time,
        homeTeam: newMatch.homeTeam.trim(),
        awayTeam: newMatch.awayTeam.trim(),
        location: newMatch.location || 'Campo Son Malferit',
        type: newMatch.type || 'Liga 2ª RFEF',
        team: selectedTeam ? selectedTeam.name : (newMatch.homeTeam.includes('ATB') ? newMatch.homeTeam : 'ATB FEMENINO A'),
        status: newMatch.status,
        homeScore: homeScoreVal,
        awayScore: awayScoreVal
      };

      setMatchesList(prev => [created, ...prev]);

      if (supabase) {
        const dbPayload = {
          id: created.id,
          home_team: created.homeTeam,
          away_team: created.awayTeam,
          date_iso: created.dateIso,
          time: created.time,
          location: created.location,
          type: created.type,
          team: created.team,
          status: created.status,
          home_score: created.homeScore,
          away_score: created.awayScore,
          season: season
        };

        try {
          let { error } = await supabase.from('matches').insert([dbPayload]);
          if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            await supabase.from('calendar_matches').insert([dbPayload]);
          }
        } catch (err) {
          console.error('Error saving match to Supabase:', err);
        }
      }

      if (newMatch.date) {
        const parts = newMatch.date.split('-');
        if (parts.length === 3) {
          const matchYear = parseInt(parts[0]);
          const matchMonth = parseInt(parts[1]) - 1;
          if (!isNaN(matchYear) && !isNaN(matchMonth)) {
            setCurrentDate(new Date(matchYear, matchMonth, 1));
          }
        }
      }

      if (selectedDayEvents && selectedDayEvents.dateIso === newMatch.date) {
        setSelectedDayEvents(prev => prev ? {
          ...prev,
          events: [...prev.events, created]
        } : null);
      }
    }

    setShowAddModal(false);
    setEditingMatchId(null);
  };

  const handleDeleteMatch = async (id: string) => {
    setMatchesList(prev => prev.filter(m => m.id !== id));
    if (selectedDayEvents) {
      setSelectedDayEvents({
        ...selectedDayEvents,
        events: selectedDayEvents.events.filter(e => e.id !== id)
      });
    }

    if (supabase) {
      try {
        let { error } = await supabase.from('matches').delete().eq('id', id);
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          await supabase.from('calendar_matches').delete().eq('id', id);
        }
      } catch (err) {
        console.error('Error deleting match from Supabase:', err);
      }
    }
  };

  // Filter matches based on selected team & status filter
  const filteredMatches = matchesList.filter(m => {
    const matchesTeam = !selectedTeam || m.team === selectedTeam.name || m.homeTeam === selectedTeam.name || m.awayTeam === selectedTeam.name;
    const matchesFilter = filter === 'all' || m.status === filter;
    return matchesTeam && matchesFilter;
  });

  // Navigation for Monthly Calendar
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 7, 1)); // Set to August 2026 for active season context or current date
  };

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to format ISO date to clean string e.g. "04 AGO 2026"
  const formatDisplayDate = (isoString: string) => {
    if (!isoString) return '';
    const parts = isoString.split('-');
    if (parts.length !== 3) return isoString;
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Temporada {season}
            </span>
            <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              {selectedTeam ? selectedTeam.name : 'Todas las Plantillas'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Calendario de Partidos y Eventos
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle (Mensual / Lista) */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'monthly' ? 'bg-white text-sky-600 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-sky-600 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Vista Lista
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'upcoming' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              Próximos
            </button>
            <button
              onClick={() => setFilter('finished')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'finished' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              Finalizados
            </button>
          </div>

          {/* Button Add Match */}
          <button
            onClick={() => handleOpenAddModal()}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-colors shadow-sm shadow-sky-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Añadir Partido
          </button>
        </div>
      </div>

      {/* MONTHLY CALENDAR GRID VIEW */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Calendar Month Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white">
                  {MONTH_NAMES[month]} <span className="text-sky-400 font-extrabold">{year}</span>
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {filteredMatches.filter(m => m.dateIso.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} eventos / partidos este mes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="hidden sm:inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                Mes Actual
              </button>
              <button
                onClick={prevMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-700"
                title="Mes Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-700"
                title="Mes Siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday Names Bar */}
          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center py-2.5">
            {WEEKDAYS.map((dayName, idx) => (
              <div key={dayName} className={`text-[11px] font-black tracking-wider uppercase ${idx >= 5 ? 'text-sky-600' : 'text-slate-600'}`}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
            {/* Previous Month Padding Days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} className="bg-slate-50/70 p-2 min-h-[90px] sm:min-h-[110px] text-slate-300 opacity-60">
                  <span className="text-xs font-bold">{dayNum}</span>
                </div>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayMatches = filteredMatches.filter(m => m.dateIso === dateIso);
              
              // Check if today
              const today = new Date();
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    if (dayMatches.length > 0) {
                      setSelectedDayEvents({ dateIso, events: dayMatches });
                    } else {
                      handleOpenAddModal(dateIso);
                    }
                  }}
                  className={`bg-white p-1.5 sm:p-2 min-h-[95px] sm:min-h-[120px] transition-all hover:bg-sky-50/40 cursor-pointer flex flex-col justify-between group ${
                    isToday ? 'ring-2 ring-sky-500 ring-inset bg-sky-50/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-slate-700 group-hover:text-sky-600'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Quick Add icon on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddModal(dateIso);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-100 rounded-md transition-all"
                      title="Añadir partido en este día"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Events Badges */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[70px] sm:max-h-[85px] pr-0.5">
                    {dayMatches.map((m) => (
                      <div
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayEvents({ dateIso, events: dayMatches });
                        }}
                        className={`p-1.5 rounded-lg text-[10px] leading-tight font-extrabold border transition-all shadow-2xs hover:scale-[1.02] ${
                          m.status === 'finished'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-sky-50 border-sky-200 text-sky-950 hover:bg-sky-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {m.time}
                          </span>
                          {m.status === 'finished' && m.homeScore !== null && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 rounded">
                              {m.homeScore}-{m.awayScore}
                            </span>
                          )}
                        </div>
                        <div className="truncate font-black">
                          {m.homeTeam} vs {m.awayTeam}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Next Month Padding Days */}
            {Array.from({ length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7 }).map((_, idx) => (
              <div key={`next-${idx}`} className="bg-slate-50/70 p-2 min-h-[90px] sm:min-h-[110px] text-slate-300 opacity-60">
                <span className="text-xs font-bold">{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-md border border-slate-800">
                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">
                      {formatDisplayDate(m.dateIso).split(' ')[1] || 'MES'}
                    </span>
                    <span className="text-xl font-black">
                      {formatDisplayDate(m.dateIso).split(' ')[0] || m.dateIso}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {m.team}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase">
                        {m.type}
                      </span>
                    </div>

                    <h4 className="text-lg sm:text-xl font-black text-slate-900">
                      {m.homeTeam} <span className="text-sky-600 font-bold text-base px-1">VS</span> {m.awayTeam}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-sky-600" /> {m.time} hs
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> {m.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 justify-between md:justify-end">
                  {m.status === 'finished' ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Resultado Final</p>
                        <p className="text-base font-black text-emerald-950">{m.homeScore} - {m.awayScore}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-4 py-2.5 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="text-xs font-black text-sky-800">Programado</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                      title="Editar partido"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMatch(m.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar partido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 mb-1">No hay partidos registrados</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No se han encontrado eventos para el filtro seleccionado en la Temporada {season}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DAY DETAILS POPUP MODAL */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-black text-slate-900">
                  Eventos del {formatDisplayDate(selectedDayEvents.dateIso)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedDayEvents.events.map((e) => (
                <div key={e.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">
                      {e.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(e)}
                        className="text-slate-400 hover:text-sky-600 p-1 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Editar partido"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(e.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-black text-slate-900">
                    {e.homeTeam} <span className="text-sky-600 font-extrabold text-sm">VS</span> {e.awayTeam}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-sky-600" /> {e.time} hs
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {e.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const dateIso = selectedDayEvents.dateIso;
                  setSelectedDayEvents(null);
                  handleOpenAddModal(dateIso);
                }}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Añadir Otro Partido en esta Fecha
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD / EDIT MATCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingMatchId ? 'Editar Partido' : 'Añadir Nuevo Partido'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editingMatchId ? 'Modifica los datos del encuentro' : 'Completa los datos del encuentro'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4">
              {/* Equipo Local */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                  Equipo Local <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: ATB FEMENINO A"
                  value={newMatch.homeTeam}
                  onChange={(e) => setNewMatch({ ...newMatch, homeTeam: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                />
              </div>

              {/* Equipo Visitante */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                  Equipo Visitante <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: FC Barcelona B"
                  value={newMatch.awayTeam}
                  onChange={(e) => setNewMatch({ ...newMatch, awayTeam: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                />
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                    Fecha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={newMatch.date}
                    onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                    Hora <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="time"
                    value={newMatch.time}
                    onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                  Ubicación / Estadio
                </label>
                <input
                  type="text"
                  placeholder="Ej: Campo Son Malferit"
                  value={newMatch.location}
                  onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                />
              </div>

              {/* Competición / Tipo */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                  Competición / Tipo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Liga 2ª RFEF, Amistoso..."
                  value={newMatch.type}
                  onChange={(e) => setNewMatch({ ...newMatch, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all bg-slate-50/50"
                />
              </div>

              {/* Estado del Partido y Resultado */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
                  Estado del Partido
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewMatch({ ...newMatch, status: 'upcoming' })}
                    className={`py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all ${
                      newMatch.status === 'upcoming'
                        ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Programado
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMatch({ ...newMatch, status: 'finished' })}
                    className={`py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all ${
                      newMatch.status === 'finished'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Finalizado
                  </button>
                </div>

                {newMatch.status === 'finished' && (
                  <div className="grid grid-cols-2 gap-3 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 mt-2">
                    <div>
                      <label className="block text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide mb-1">
                        Goles Local
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newMatch.homeScore}
                        onChange={(e) => setNewMatch({ ...newMatch, homeScore: e.target.value })}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-black text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide mb-1">
                        Goles Visitante
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newMatch.awayScore}
                        onChange={(e) => setNewMatch({ ...newMatch, awayScore: e.target.value })}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-black text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 py-3 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl text-xs font-black transition-colors shadow-sm shadow-sky-200 cursor-pointer"
                >
                  {editingMatchId ? 'Guardar Cambios' : 'Guardar Partido'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
