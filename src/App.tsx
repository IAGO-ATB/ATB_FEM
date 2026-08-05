import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Calendar, BarChart2, MessageSquare, Bell, Settings, LogOut, ChevronRight, Edit2, Shield, Plus, X, Layers, ClipboardList, Loader2, Dumbbell } from 'lucide-react';
import { cn } from './lib/utils';
import TeamsView from './components/TeamsView';
import TeamRoster from './components/TeamRoster';
import PlayerProfile from './components/PlayerProfile';
import LineOfSuccessionView from './components/LineOfSuccessionView';
import SessionsView from './components/SessionsView';
import GymView from './components/GymView';
import CalendarView from './components/CalendarView';
import ForumView from './components/ForumView';
import StatsView from './components/StatsView';
import { supabase } from './lib/supabase';
import { AuthView } from './components/AuthView';
import { db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Team, Player } from './types';
import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';

const REAL_FEMENINO_A_STAFF = {
  headCoach: { name: 'Miky Mayans' },
  secondCoach: { name: 'Juanmi Lladó' },
  physicalTrainer: { name: 'Iago Alvarez' },
  goalkeeperCoach: { name: 'Pablo Roca' },
  analyst: { name: 'Nica Ortiz' },
  delegate: { name: 'Marta Chavero' },
  physio: { name: 'Alberto Marín' }
};

const INITIAL_TEAMS: Team[] = [];

const INITIAL_SEASONS = ['2026/2027'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState('equipos');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teamLogo, setTeamLogo] = useState<string>('');
  const [logoScale, setLogoScale] = useState<number>(1);

  // Season and Teams Context
  const [seasons, setSeasons] = useState<string[]>(INITIAL_SEASONS);
  const [selectedSeason, setSelectedSeason] = useState<string>('2026/2027');

  const [teamsBySeason, setTeamsBySeason] = useState<Record<string, Team[]>>({});

  useEffect(() => {
    async function fetchAllTeams() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('name', { ascending: true });
        
        if (!error && data) {
          const mappedTeams = data.map((t: any) => ({
            ...t,
            technicalStaff: t.technical_staff || t.technicalstaff || t.technicalStaff
          }));
          
          // For now, we assume these teams belong to the selected season 
          // or we can just categorize them if we had a season column in teams table.
          // Since there's no season column in teams yet, we'll assign them to the selected season.
          setTeamsBySeason(prev => ({
            ...prev,
            [selectedSeason]: mappedTeams
          }));
        }
      } catch (err) {
        console.error('Error fetching teams for App selector:', err);
      }
    }
    fetchAllTeams();
  }, [supabase, selectedSeason]);

  const currentTeams = teamsBySeason[selectedSeason] ?? (selectedSeason === '2026/2027' ? INITIAL_TEAMS : []);

  const handleTeamsChangeForSeason = (newTeams: Team[]) => {
    setTeamsBySeason(prev => {
      const updated = { ...prev, [selectedSeason]: newTeams };
      return updated;
    });
  };

  const [showAddSeasonModal, setShowAddSeasonModal] = useState(false);
  const [newSeasonInput, setNewSeasonInput] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setTeamLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ADD_NEW_SEASON') {
      setShowAddSeasonModal(true);
    } else {
      setSelectedSeason(val);
      setSelectedTeam(null);
      setSelectedPlayer(null);
    }
  };

  const handleAddSeasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonInput.trim()) return;
    const formatted = newSeasonInput.trim();
    if (!seasons.includes(formatted)) {
      const updated = [formatted, ...seasons];
      setSeasons(updated);
      setSelectedSeason(formatted);
      setSelectedTeam(null);
      setSelectedPlayer(null);
    } else {
      setSelectedSeason(formatted);
      setSelectedTeam(null);
      setSelectedPlayer(null);
    }
    setNewSeasonInput('');
    setShowAddSeasonModal(false);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navigation = [
    { id: 'linea-sucesion', name: 'Línea de Sucesión', icon: Layers },
    { id: 'equipos', name: 'Plantillas', icon: Users, active: true },
    { id: 'sesiones', name: 'Sesiones', icon: ClipboardList },
    { id: 'gimnasio', name: 'Gimnasio', icon: Dumbbell },
    { id: 'calendario', name: 'Calendario', icon: Calendar },
    { id: 'foro', name: 'Foro Mentoría', icon: MessageSquare },
    { id: 'estadisticas', name: 'Estadísticas', icon: BarChart2 },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-52 bg-[#0f172a] text-white flex flex-col shrink-0 transition-all border-r border-slate-800">
        <div className="p-3.5">
          <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-3">
            <label className="relative group cursor-pointer shrink-0">
              <div className="w-8 h-8 bg-[#0f172a] rounded-lg flex items-center justify-center font-bold text-base italic overflow-hidden transition-all border border-slate-700">
                {teamLogo ? (
                  <img 
                    src={teamLogo} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                    style={{ transform: `scale(${logoScale})` }}
                  />
                ) : (
                  <span className="text-sky-500 font-black">B</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Edit2 className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
            </label>
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-100 truncate">Atlético Baleares</h1>
          </div>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs font-bold text-left",
                    activeTab === item.id
                      ? "bg-sky-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-sky-400/60 text-xs font-black text-sky-400 shrink-0">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-xs text-left truncate">
              <p className="font-bold text-white text-[11px] truncate">{user.user_metadata?.full_name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {navigation.find(n => n.id === activeTab)?.name || 'Plantillas'}
            </h2>

            {/* Season Selector Dropdown */}
            <div className="relative flex items-center bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600 mr-1.5 shrink-0" />
              <select
                value={selectedSeason}
                onChange={handleSeasonChange}
                className="bg-transparent text-sky-700 text-xs font-bold uppercase tracking-wide outline-none cursor-pointer pr-1"
              >
                {seasons.map((s) => (
                  <option key={s} value={s} className="text-slate-900 bg-white font-semibold">
                    Temporada {s}
                  </option>
                ))}
                <option value="ADD_NEW_SEASON" className="text-sky-600 bg-white font-bold">
                  + Añadir Temporada...
                </option>
              </select>
            </div>

            {/* Plantilla / Equipo Selector Dropdown */}
            <div className="relative flex items-center bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
              <Shield className="w-3.5 h-3.5 text-slate-600 mr-1.5 shrink-0" />
              <select
                value={selectedTeam?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || val === 'ALL') {
                    setSelectedTeam(null);
                  } else {
                    const team = currentTeams.find(t => String(t.id) === String(val));
                    setSelectedTeam(team || null);
                  }
                  setSelectedPlayer(null);
                }}
                className="bg-transparent text-slate-800 text-xs font-bold tracking-wide outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="text-slate-900 bg-white font-semibold">
                  Todas las Plantillas {currentTeams.length > 0 ? `(${currentTeams.length})` : ''}
                </option>
                {currentTeams.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-900 bg-white font-semibold">
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
              {selectedTeam && (
                <button 
                  onClick={() => { setSelectedTeam(null); setSelectedPlayer(null); }}
                  className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                  title="Quitar filtro de plantilla"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-8 flex gap-6 flex-1 overflow-auto">
          {/* Main Content Section */}
          <motion.div
            key={activeTab + selectedSeason + (selectedTeam?.id || '') + (selectedPlayer?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {activeTab === 'linea-sucesion' && (
              <LineOfSuccessionView 
                season={selectedSeason} 
                selectedTeam={selectedTeam}
                teams={currentTeams}
                onSelectPlayer={(player) => setSelectedPlayer(player)}
              />
            )}

            {activeTab === 'equipos' && !selectedTeam && (
              <TeamsView 
                season={selectedSeason}
                teams={currentTeams}
                onSelectTeam={(team) => setSelectedTeam(team)} 
                onTeamsChange={handleTeamsChangeForSeason}
              />
            )}
            {activeTab === 'equipos' && selectedTeam && !selectedPlayer && (
              <TeamRoster 
                team={selectedTeam} 
                season={selectedSeason}
                onBack={() => setSelectedTeam(null)} 
                onSelectPlayer={(player) => setSelectedPlayer(player)}
              />
            )}
            {activeTab === 'equipos' && selectedPlayer && (
              <PlayerProfile 
                player={selectedPlayer} 
                onBack={() => setSelectedPlayer(null)} 
              />
            )}

            {activeTab === 'sesiones' && (
              <SessionsView 
                season={selectedSeason}
                selectedTeam={selectedTeam}
                teams={currentTeams}
                onSelectTeam={(team) => setSelectedTeam(team)}
              />
            )}

            {activeTab === 'gimnasio' && (
              <GymView 
                season={selectedSeason}
                selectedTeam={selectedTeam}
                teams={currentTeams}
              />
            )}

            {activeTab === 'calendario' && (
              <CalendarView 
                season={selectedSeason} 
                selectedTeam={selectedTeam} 
                teams={currentTeams} 
              />
            )}

            {activeTab === 'foro' && (
              <ForumView 
                season={selectedSeason} 
                selectedTeam={selectedTeam} 
              />
            )}

            {activeTab === 'estadisticas' && (
              <StatsView 
                season={selectedSeason} 
                selectedTeam={selectedTeam} 
              />
            )}
          </motion.div>
        </div>
      </main>

      {/* Add Season Modal */}
      {showAddSeasonModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Añadir Nueva Temporada</h3>
              <button onClick={() => setShowAddSeasonModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSeasonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formato (Ej: 2027/2028)</label>
                <input
                  required
                  type="text"
                  placeholder="2027/2028"
                  value={newSeasonInput}
                  onChange={(e) => setNewSeasonInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSeasonModal(false)}
                  className="flex-1 border border-slate-200 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-sky-600"
                >
                  Añadir
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

