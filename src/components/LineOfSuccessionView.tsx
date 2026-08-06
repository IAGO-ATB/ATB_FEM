import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Search, 
  Filter, 
  Layers, 
  ChevronRight, 
  Info, 
  Sparkles, 
  Award, 
  Eye, 
  X,
  UserCheck,
  Zap,
  Star
} from 'lucide-react';
import { Team, Player } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface LineOfSuccessionViewProps {
  season: string;
  teams: Team[];
  selectedTeam?: Team | null;
  onSelectPlayer?: (player: Player) => void;
}

// Team priority and badge styling
const TEAM_CONFIG: Record<string, { code: string; label: string; badgeBg: string; textCol: string; borderCol: string; priority: number }> = {
  'FEMENINO_A': { code: 'A', label: 'ATB FEMENINO A', badgeBg: 'bg-sky-500', textCol: 'text-sky-500', borderCol: 'border-sky-500', priority: 1 },
  'FEMENINO_B': { code: 'B', label: 'ATB FEMENINO B', badgeBg: 'bg-emerald-500', textCol: 'text-emerald-500', borderCol: 'border-emerald-500', priority: 2 },
  'FEMENINO_C': { code: 'C', label: 'ATB FEMENINO C', badgeBg: 'bg-amber-500', textCol: 'text-amber-500', borderCol: 'border-amber-500', priority: 3 },
  'FEMENINO_D': { code: 'D', label: 'ATB FEMENINO D', badgeBg: 'bg-purple-500', textCol: 'text-purple-500', borderCol: 'border-purple-500', priority: 4 },
  'FEMENINO_E': { code: 'E', label: 'ATB FEMENINO E', badgeBg: 'bg-rose-500', textCol: 'text-rose-500', borderCol: 'border-rose-500', priority: 5 },
};

// 1-4-2-3-1 Tactical Spot Definitions
interface TacticalSpot {
  id: string;
  code: string;
  label: string;
  posKey: string; // Key to match position_especifica or general position
  top: string;
  left: string;
  description: string;
}

const TACTICAL_SPOTS: TacticalSpot[] = [
  { id: 'POR', code: 'POR', label: 'Portera', posKey: 'Portera', top: '88%', left: '50%', description: 'Guardameta principal y suplentes por jerarquía de equipo' },
  
  { id: 'LI', code: 'LI', label: 'Lateral Izquierdo', posKey: 'Lateral Izquierdo', top: '68%', left: '15%', description: 'Carrilera / Lateral Banda Izquierda' },
  { id: 'DFC_IZQ', code: 'DFC-I', label: 'Central Izquierdo', posKey: 'Central', top: '74%', left: '38%', description: 'Defensa Central perfil Izquierdo' },
  { id: 'DFC_DER', code: 'DFC-D', label: 'Central Derecho', posKey: 'Central', top: '74%', left: '62%', description: 'Defensa Central perfil Derecho' },
  { id: 'LD', code: 'LD', label: 'Lateral Derecho', posKey: 'Lateral Derecho', top: '68%', left: '85%', description: 'Carrilera / Lateral Banda Derecha' },
  
  { id: 'MC_IZQ', code: 'Pivote I', label: 'Pivote / MC Izq.', posKey: 'Mediocentro', top: '50%', left: '36%', description: 'Mediocentro de contención y distribución' },
  { id: 'MC_DER', code: 'Pivote D', label: 'Pivote / MC Der.', posKey: 'Mediocentro', top: '50%', left: '64%', description: 'Mediocentro organizador / interior' },
  
  { id: 'EI', code: 'EI', label: 'Extremo Izquierda', posKey: 'Extremo Izquierda', top: '26%', left: '16%', description: 'Extremo / Atacante de Banda Izquierda' },
  { id: 'MPO', code: 'MPO', label: 'Mediapunta', posKey: 'Mediapunta', top: '28%', left: '50%', description: 'Mediapunta / Enganche ofensivo' },
  { id: 'ED', code: 'ED', label: 'Extremo Derecha', posKey: 'Extremo Derecha', top: '26%', left: '84%', description: 'Extremo / Atacante de Banda Derecha' },
  
  { id: 'DC', code: 'DC', label: 'Delantera Centro', posKey: 'Delantera', top: '10%', left: '50%', description: 'Ariete / Referente de ataque' },
];

const DEFAULT_STATS = { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };

const MOCK_DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'Laura Martínez', number: 1, position: 'Porteras', posicion_especifica: 'Portera', teamId: 'FEMENINO_A', height: '1.75 m', stats: DEFAULT_STATS },
  { id: '2', name: 'Carla Rodríguez', number: 4, position: 'Defensoras', posicion_especifica: 'Central', teamId: 'FEMENINO_A', height: '1.72 m', stats: DEFAULT_STATS },
  { id: '3', name: 'Elena Gómez', number: 10, position: 'Mediocentros', posicion_especifica: 'Mediocentro', teamId: 'FEMENINO_A', height: '1.68 m', stats: DEFAULT_STATS },
  { id: '4', name: 'Sofía Ruiz', number: 9, position: 'Atacantes', posicion_especifica: 'Delantera', teamId: 'FEMENINO_A', height: '1.70 m', stats: DEFAULT_STATS },
  { id: '5', name: 'Marta Pastor', number: 3, position: 'Defensoras', posicion_especifica: 'Lateral Izquierdo', teamId: 'FEMENINO_A', height: '1.65 m', stats: DEFAULT_STATS },
  { id: '6', name: 'Lucía Fernández', number: 2, position: 'Defensoras', posicion_especifica: 'Lateral Derecho', teamId: 'FEMENINO_A', height: '1.67 m', stats: DEFAULT_STATS },
  { id: '7', name: 'Paula Serra', number: 7, position: 'Atacantes', posicion_especifica: 'Extremo Derecha', teamId: 'FEMENINO_A', height: '1.64 m', stats: DEFAULT_STATS },
  { id: '8', name: 'Alba Coll', number: 11, position: 'Atacantes', posicion_especifica: 'Extremo Izquierda', teamId: 'FEMENINO_A', height: '1.66 m', stats: DEFAULT_STATS },
  { id: '9', name: 'Aina Torres', number: 8, position: 'Mediocentros', posicion_especifica: 'Mediapunta', teamId: 'FEMENINO_A', height: '1.69 m', stats: DEFAULT_STATS },
];

export default function LineOfSuccessionView({ season, teams, selectedTeam, onSelectPlayer }: LineOfSuccessionViewProps) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSpot, setSelectedSpot] = useState<TacticalSpot | null>(TACTICAL_SPOTS[0]); // Default POR or first
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [includeSecondary, setIncludeSecondary] = useState<boolean>(false);
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<Player | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Fetch all players across all teams for current season
  useEffect(() => {
    async function loadAllPlayers() {
      setLoading(true);
      const combined: Player[] = [];

      // Try fetching from Supabase if configured
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('players')
            .select('*');

          if (!error && data && data.length > 0) {
            data.forEach((p: any) => {
              const secondPos = p.secondPosition || p.second_position || p.segunda_posicion || p.segunda_posicion_especifica || p.secondposition || '';
              const mapped: Player = {
                ...p,
                secondPosition: secondPos,
                teamId: p.team_id || p.teamid || p.teamId
              };
              combined.push(mapped);
            });
          }
        } catch (e) {
          console.log('Error fetching from Supabase in LineOfSuccessionView');
        }
      }

      setAllPlayers(combined);
      setLoading(false);
    }

    loadAllPlayers();
  }, [season, teams]);

  // Helper function to calculate player age string
  const getPlayerAge = (p: Player): string => {
    if (!p.fecha_nacimiento) return '—';
    const fn = String(p.fecha_nacimiento).trim();
    if (!fn) return '—';
    
    if (/^\d{2}$/.test(fn)) {
      return `${fn} años`;
    }

    let birthDate: Date | null = null;
    if (fn.includes('/')) {
      const parts = fn.split('/');
      if (parts.length === 3) {
        birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    } else if (fn.includes('-')) {
      const parts = fn.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else if (parts[2].length === 4) {
          birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    }
    if (!birthDate || isNaN(birthDate.getTime())) {
      birthDate = new Date(fn);
    }
    if (birthDate && !isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age > 0 && age < 80) {
        return `${age} años`;
      }
    }
    return '—';
  };

  // Helper function to calculate birth timestamp for age sorting
  const getPlayerBirthTimestamp = (p: Player): number => {
    if (p.fecha_nacimiento) {
      const fn = p.fecha_nacimiento.trim();
      if (fn.includes('/')) {
        const parts = fn.split('/');
        if (parts.length === 3) {
          const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          if (!isNaN(d.getTime())) return d.getTime();
        }
      } else if (fn.includes('-')) {
        const parts = fn.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(d.getTime())) return d.getTime();
          } else if (parts[2].length === 4) {
            const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            if (!isNaN(d.getTime())) return d.getTime();
          }
        }
      }
      const d = new Date(fn);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return 9999999999990;
  };

  // Helper function to resolve team config / letter (A, B, C, D, E)
  const getTeamInfo = (teamId?: string) => {
    if (!teamId) {
      return { code: 'A', label: 'ATB FEMENINO A', badgeBg: 'bg-sky-500', textCol: 'text-sky-500', borderCol: 'border-sky-500', priority: 1 };
    }
    if (TEAM_CONFIG[teamId]) {
      return TEAM_CONFIG[teamId];
    }

    const teamObj = teams.find(t => t.id === teamId);
    const nameToSearch = (teamObj?.name || teamObj?.category || teamId).toUpperCase();

    if (nameToSearch.includes(' A') || nameToSearch.endsWith('A') || nameToSearch.includes('FEMENINO_A')) {
      return TEAM_CONFIG['FEMENINO_A'];
    }
    if (nameToSearch.includes(' B') || nameToSearch.endsWith('B') || nameToSearch.includes('FEMENINO_B')) {
      return TEAM_CONFIG['FEMENINO_B'];
    }
    if (nameToSearch.includes(' C') || nameToSearch.endsWith('C') || nameToSearch.includes('FEMENINO_C')) {
      return TEAM_CONFIG['FEMENINO_C'];
    }
    if (nameToSearch.includes(' D') || nameToSearch.endsWith('D') || nameToSearch.includes('FEMENINO_D')) {
      return TEAM_CONFIG['FEMENINO_D'];
    }
    if (nameToSearch.includes(' E') || nameToSearch.endsWith('E') || nameToSearch.includes('FEMENINO_E')) {
      return TEAM_CONFIG['FEMENINO_E'];
    }

    return { code: 'A', label: teamObj?.name || teamId, badgeBg: 'bg-sky-500', textCol: 'text-sky-500', borderCol: 'border-sky-500', priority: 1 };
  };

  // Helper function to get team priority code (A=1, B=2, C=3, D=4, E=5, others=99)
  const getTeamPriority = (teamId?: string): number => {
    return getTeamInfo(teamId).priority;
  };

  const getTeamLetter = (teamId?: string): string => {
    return getTeamInfo(teamId).code;
  };

  // Match player to tactical spot
  const matchesSpot = (player: Player, spot: TacticalSpot): { isMatch: boolean; isSecondary: boolean } => {
    const posEsp = (player.posicion_especifica || '').trim();
    const secPos = (player.secondPosition || '').trim();
    const genPos = (player.position || player.demarcacion || '').trim();

    // Direct match on posicion_especifica
    if (posEsp.toLowerCase() === spot.posKey.toLowerCase()) {
      return { isMatch: true, isSecondary: false };
    }

    // Match on Central / Mediocentro variants
    if (spot.posKey === 'Central' && posEsp.includes('Central')) {
      return { isMatch: true, isSecondary: false };
    }
    if (spot.posKey === 'Mediocentro' && (posEsp.includes('Mediocentro') || posEsp.includes('Pivote'))) {
      return { isMatch: true, isSecondary: false };
    }

    // Secondary position match
    if (includeSecondary && secPos && (
      secPos.toLowerCase() === spot.posKey.toLowerCase() ||
      (spot.posKey === 'Central' && secPos.includes('Central')) ||
      (spot.posKey === 'Mediocentro' && (secPos.includes('Mediocentro') || secPos.includes('Pivote')))
    )) {
      return { isMatch: true, isSecondary: true };
    }

    // Fallback general demarcation if no specific position set
    if (!posEsp) {
      if (spot.posKey === 'Portera' && genPos.includes('Portera')) return { isMatch: true, isSecondary: false };
      if (spot.posKey === 'Central' && genPos.includes('Defensora')) return { isMatch: true, isSecondary: false };
      if (spot.posKey === 'Mediocentro' && genPos.includes('Mediocentro')) return { isMatch: true, isSecondary: false };
      if (spot.posKey === 'Delantera' && genPos.includes('Atacante')) return { isMatch: true, isSecondary: false };
    }

    return { isMatch: false, isSecondary: false };
  };

  // Get players for a spot sorted hierarchically by team (A -> B -> C -> D -> E)
  const getSpotPlayers = (spot: TacticalSpot) => {
    const matchedList: { player: Player; isSecondary: boolean; priority: number }[] = [];

    allPlayers.forEach(p => {
      if (teamFilter !== 'ALL' && p.teamId !== teamFilter) return;
      if (searchTerm.trim() && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      const res = matchesSpot(p, spot);
      if (res.isMatch) {
        matchedList.push({
          player: p,
          isSecondary: res.isSecondary,
          priority: getTeamPriority(p.teamId)
        });
      }
    });

    // Sort by team priority (1=A, 2=B, 3=C, 4=D, 5=E), then primary over secondary, then by age (older first), then dorsal/number
    matchedList.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isSecondary !== b.isSecondary) return a.isSecondary ? 1 : -1;
      const birthA = getPlayerBirthTimestamp(a.player);
      const birthB = getPlayerBirthTimestamp(b.player);
      if (birthA !== birthB) return birthA - birthB;
      const numA = Number(a.player.number || a.player.dorsal || 999);
      const numB = Number(b.player.number || b.player.dorsal || 999);
      return numA - numB;
    });

    // Split shared spots like DFC_IZQ vs DFC_DER or MC_IZQ vs MC_DER if needed
    if (spot.id === 'DFC_IZQ' || spot.id === 'DFC_DER') {
      const isEven = spot.id === 'DFC_IZQ';
      return matchedList.filter((_, idx) => (isEven ? idx % 2 === 0 : idx % 2 === 1));
    }
    if (spot.id === 'MC_IZQ' || spot.id === 'MC_DER') {
      const isEven = spot.id === 'MC_IZQ';
      return matchedList.filter((_, idx) => (isEven ? idx % 2 === 0 : idx % 2 === 1));
    }

    return matchedList;
  };

  // Get full list for selected spot without splitting
  const selectedSpotFullList = useMemo(() => {
    if (!selectedSpot) return [];
    const list: { player: Player; isSecondary: boolean; priority: number }[] = [];

    allPlayers.forEach(p => {
      if (teamFilter !== 'ALL' && p.teamId !== teamFilter) return;
      if (searchTerm.trim() && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      const res = matchesSpot(p, selectedSpot);
      if (res.isMatch) {
        list.push({
          player: p,
          isSecondary: res.isSecondary,
          priority: getTeamPriority(p.teamId)
        });
      }
    });

    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isSecondary !== b.isSecondary) return a.isSecondary ? 1 : -1;
      const birthA = getPlayerBirthTimestamp(a.player);
      const birthB = getPlayerBirthTimestamp(b.player);
      if (birthA !== birthB) return birthA - birthB;
      const numA = Number(a.player.number || a.player.dorsal || 999);
      const numB = Number(b.player.number || b.player.dorsal || 999);
      return numA - numB;
    });

    return list;
  }, [selectedSpot, allPlayers, includeSecondary, teamFilter, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                Estructura del Club
              </span>
              <span className="text-slate-400 text-xs">|</span>
              <span className="text-slate-300 text-xs font-semibold">
                Formación 1-4-2-3-1
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase flex items-center gap-3">
              <Layers className="w-7 h-7 text-sky-400" />
              Línea de Sucesión
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Registradas</p>
              <p className="text-2xl font-black text-sky-400">{allPlayers.length}</p>
            </div>
            <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center border border-sky-500/30">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar jugadora..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Todos los Equipos (A - E)</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>Solo {t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          {/* Include Secondary Position Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition-colors">
            <input 
              type="checkbox"
              checked={includeSecondary}
              onChange={e => setIncludeSecondary(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <span>Incluir 2ª Posición</span>
          </label>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Haz clic en cualquier demarcación del campo para ver su línea jerárquica
        </div>
      </div>

      {/* Main Grid Layout: Tactical Campograma + Succession Hierarchy Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Campograma 1-4-2-3-1 (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-500" />
                Campograma Táctico 1-4-2-3-1
              </h3>
            </div>
          </div>

          {/* Green Pitch Container */}
          <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-800 rounded-2xl overflow-hidden shadow-xl border-4 border-emerald-900/30 p-4">
            {/* Field Turf Grass Lines effect */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,rgba(255,255,255,0.2)_20px,rgba(255,255,255,0.2)_40px)]" />

            {/* Pitch Markings */}
            <div className="absolute inset-3 border-2 border-white/40 rounded-xl pointer-events-none">
              {/* Halfway line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
              
              {/* Penalty Areas */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-t-2 border-x-2 border-white/40" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[8%] border-t-2 border-x-2 border-white/40" />
              
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-b-2 border-x-2 border-white/40" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[8%] border-b-2 border-x-2 border-white/40" />
              
              {/* Penalty Spots */}
              <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
            </div>

            {/* Render 11 Tactical Spots */}
            <div className="absolute inset-0 p-4">
              {TACTICAL_SPOTS.map((spot) => {
                const spotPlayers = getSpotPlayers(spot);
                const isSelected = selectedSpot?.id === spot.id;
                const topPlayer = spotPlayers.length > 0 ? spotPlayers[0].player : null;
                const topTeamLetter = topPlayer ? getTeamLetter(topPlayer.teamId) : '';
                const topTeamCfg = topPlayer && TEAM_CONFIG[topPlayer.teamId || ''] ? TEAM_CONFIG[topPlayer.teamId || ''] : null;

                return (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform focus:outline-none z-10",
                      isSelected ? "scale-110 z-30" : "hover:scale-105"
                    )}
                    style={{ top: spot.top, left: spot.left }}
                  >
                    {/* Badge Node */}
                    <div className="relative">
                      {isSelected && (
                        <div className="absolute -inset-2 bg-sky-400/50 rounded-full animate-ping opacity-75" />
                      )}

                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center shadow-xl transition-all relative overflow-hidden",
                        isSelected 
                          ? "border-sky-400 bg-slate-900 text-white ring-4 ring-sky-400/40" 
                          : spotPlayers.length > 0 
                            ? "border-white bg-slate-900 text-white hover:border-sky-300" 
                            : "border-white/40 bg-slate-900/60 text-white/50 border-dashed"
                      )}>
                        {topPlayer ? (
                          topPlayer.image ? (
                            <img src={topPlayer.image} alt={topPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[11px] font-black leading-none">{topPlayer.number || topPlayer.dorsal || '#'}</span>
                              <span className="text-[8px] font-bold text-sky-400">{topTeamLetter}</span>
                            </div>
                          )
                        ) : (
                          <span className="text-[9px] font-bold uppercase">{spot.code}</span>
                        )}

                        {/* Team letter badge at top right */}
                        {topTeamCfg && (
                          <div className={cn("absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px] font-black text-white shadow-sm", topTeamCfg.badgeBg)}>
                            {topTeamCfg.code}
                          </div>
                        )}
                      </div>

                      {/* Total player count badge at bottom right */}
                      {spotPlayers.length > 0 && (
                        <div className="absolute -bottom-1 -left-1 px-1.5 py-0.2 bg-sky-500 text-white border border-white text-[8px] font-black rounded-full shadow-md">
                          {spotPlayers.length}
                        </div>
                      )}
                    </div>

                    {/* Spot Position Title */}
                    <div className={cn(
                      "mt-1 px-2 py-0.5 rounded text-[9px] md:text-[10px] font-extrabold uppercase tracking-tight shadow-md whitespace-nowrap transition-colors",
                      isSelected 
                        ? "bg-sky-500 text-white" 
                        : "bg-slate-900/90 text-slate-200 border border-slate-700"
                    )}>
                      {spot.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Position Line of Succession List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedSpot ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
              {/* Header for Selected Position */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    {selectedSpot.label}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase">Efectivos</span>
                  <p className="text-xl font-black text-slate-900">{selectedSpotFullList.length}</p>
                </div>
              </div>

              {/* Player Succession List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {selectedSpotFullList.length > 0 ? (
                  selectedSpotFullList.map((item, idx) => {
                    const p = item.player;
                    const teamCfg = getTeamInfo(p.teamId);

                    return (
                      <motion.div
                        key={p.id + idx}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 group hover:shadow-md cursor-pointer"
                        onClick={() => {
                          setSelectedPlayerModal(p);
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Team Badge (A, B, C, D, E) */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow-xs",
                              teamCfg.badgeBg
                            )}>
                              {teamCfg.code}
                            </span>
                          </div>

                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shrink-0 relative">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                {p.number || p.dorsal || '#'}
                              </div>
                            )}
                          </div>

                          {/* Player Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                                {p.name}
                              </h4>
                              {item.isSecondary && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase">
                                  2ª Posición
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
                              Dorsal: <span className="text-slate-800 font-bold">{p.number || p.dorsal || 'Sin dorsal'}</span>
                            </p>

                            {(p.height || p.lateralidad) && (
                              <p className="text-[9px] text-slate-400 font-medium truncate">
                                {[p.height, p.lateralidad].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayerModal(p);
                            }}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-400 hover:text-sky-600 border border-slate-200 transition-colors shadow-2xs"
                            title="Ver ficha ampliada de la jugadora"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No hay jugadoras registradas en esta posición</p>
                    <p className="text-[10px] text-slate-400 mt-1">Añade jugadoras en el apartado de Plantillas con la posición correspondiente.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Selecciona una posición en el campo</p>
              <p className="text-xs text-slate-400 mt-1">Haz clic en cualquier nodo para ver la jerarquía completa A → E</p>
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Club Succession Table Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-500" />
              Tabla General de Sucesión por Demarcación
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Visión global de todas las jugadoras en el club estructuradas de mayor a menor jerarquía (Equipo A a Equipo E)
            </p>
          </div>
        </div>

        {/* Grouped Table by 11 Specific Positions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TACTICAL_SPOTS.map(spot => {
            const list = getSpotPlayers(spot);

            return (
              <div key={spot.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col">
                <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-sky-500 text-white text-[9px] font-black rounded uppercase">
                      {spot.code}
                    </span>
                    <h4 className="text-xs font-bold">{spot.label}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                    {list.length}
                  </span>
                </div>

                <div className="p-2 space-y-1.5 flex-1 max-h-60 overflow-y-auto">
                  {list.length > 0 ? (
                    list.map((item, i) => {
                      const p = item.player;
                      const tCfg = getTeamInfo(p.teamId);

                      return (
                        <div 
                          key={p.id + i}
                          onClick={() => {
                            setSelectedPlayerModal(p);
                          }}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-sky-300 transition-colors cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center shrink-0", tCfg.badgeBg)}>
                              {tCfg.code}
                            </span>
                            <span className="font-extrabold text-slate-800 truncate">{p.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {getPlayerAge(p)}
                            </span>
                            {item.isSecondary && (
                              <span className="text-[8px] font-bold text-slate-400 uppercase">2ª</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-[10px] font-semibold text-slate-400 italic">
                      Sin jugadoras asignadas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Detail Modal - Ficha Ampliada de la Jugadora */}
      <AnimatePresence>
        {selectedPlayerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 my-auto"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-6 text-white">
                <button 
                  onClick={() => setSelectedPlayerModal(null)} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4 pr-8">
                  <div className="w-20 h-20 rounded-2xl border-2 border-white/20 overflow-hidden bg-slate-800 shrink-0 shadow-lg flex items-center justify-center">
                    {selectedPlayerModal.image ? (
                      <img src={selectedPlayerModal.image} alt={selectedPlayerModal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-2xl text-slate-400 bg-slate-800">
                        #{selectedPlayerModal.number || selectedPlayerModal.dorsal || '?'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white inline-block mb-1.5 shadow-2xs",
                      getTeamInfo(selectedPlayerModal.teamId).badgeBg
                    )}>
                      {getTeamInfo(selectedPlayerModal.teamId).label}
                    </span>
                    <h3 className="text-xl font-black leading-tight truncate">
                      {selectedPlayerModal.nombre ? `${selectedPlayerModal.nombre} ${selectedPlayerModal.apellidos || ''}` : selectedPlayerModal.name}
                    </h3>
                    <p className="text-xs text-sky-300 font-bold mt-1 flex items-center gap-2">
                      <span>Dorsal: <strong className="text-white">#{selectedPlayerModal.number || selectedPlayerModal.dorsal || 's/d'}</strong></span>
                      <span>•</span>
                      <span>{selectedPlayerModal.posicion_especifica || selectedPlayerModal.demarcacion || selectedPlayerModal.position || 'Jugadora'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
                {/* Datos Tácticos y Físicos */}
                <div>
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-500" />
                    Información Táctica y Física
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Demarcación Principal</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {selectedPlayerModal.posicion_especifica || selectedPlayerModal.demarcacion || selectedPlayerModal.position || '—'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Segunda Posición</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {selectedPlayerModal.secondPosition || 'Ninguna'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Altura</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {selectedPlayerModal.height || '—'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Lateralidad</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {selectedPlayerModal.lateralidad || 'Sin especificar'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div>
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                    Datos Personales
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha de Nacimiento</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {selectedPlayerModal.fecha_nacimiento || 'No registrada'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Equipo</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {getTeamInfo(selectedPlayerModal.teamId).label}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics if available */}
                {selectedPlayerModal.stats && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-sky-500" />
                      Estadísticas de la Temporada
                    </h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Partidos</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{selectedPlayerModal.stats.matchesPlayed ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Goles</p>
                        <p className="text-sm font-black text-emerald-600 mt-0.5">{selectedPlayerModal.stats.goals ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Asist.</p>
                        <p className="text-sm font-black text-sky-600 mt-0.5">{selectedPlayerModal.stats.assists ?? 0}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Tarjetas</p>
                        <p className="text-sm font-black text-amber-600 mt-0.5">
                          {(selectedPlayerModal.stats.yellowCards ?? 0) + (selectedPlayerModal.stats.redCards ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {selectedPlayerModal.observaciones && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-sky-500" />
                      Observaciones / Notas
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-xs italic">
                      "{selectedPlayerModal.observaciones}"
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    onClick={() => setSelectedPlayerModal(null)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs cursor-pointer"
                  >
                    Cerrar Ficha
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
