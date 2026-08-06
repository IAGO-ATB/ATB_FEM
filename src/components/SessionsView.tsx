import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  ClipboardCheck,
  PlusCircle, 
  Eye, 
  Calendar, 
  Clock, 
  Flame, 
  Layers, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Printer, 
  ChevronRight, 
  ChevronLeft,
  Shield, 
  Target, 
  Dumbbell, 
  Sparkles, 
  FileText, 
  AlertCircle,
  Award,
  ChevronDown,
  Plus,
  Users,
  LayoutList,
  ImagePlus,
  ImageIcon
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Team, TrainingSession, ExerciseTask, Player, SessionStaffTask } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import ImageEditorModal from './ImageEditorModal';
import OfficialSessionSheetModal from './OfficialSessionSheetModal';

const DEFAULT_SQUAD_NAMES: string[] = [];

export interface DetailedSquadPlayer {
  id: string;
  name: string;
  number?: number;
  positionCategory: 'PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS';
  image?: string;
}

const DEFAULT_SQUAD_DETAILED: DetailedSquadPlayer[] = [];

const normalizeCategory = (pos?: string): 'PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS' => {
  if (!pos) return 'OTRAS';
  const p = pos.toLowerCase();
  if (p.includes('port') || p.includes('gk')) return 'PORTERAS';
  if (p.includes('def') || p.includes('df') || p.includes('lat') || p.includes('central')) return 'DEFENSORAS';
  if (p.includes('med') || p.includes('centr') || p.includes('mc') || p.includes('pivote')) return 'CENTROCAMPISTAS';
  if (p.includes('del') || p.includes('atac') || p.includes('ext') || p.includes('dc')) return 'DELANTERAS';
  return 'OTRAS';
};

const getDetailedSquadPlayersForTeam = (teamId?: string, seasonStr?: string): DetailedSquadPlayer[] => {
  let players: any[] = [];
  
  // If it's FEMENINO_A, use defaults
  if (teamId === 'FEMENINO_A') {
    players = DEFAULT_SQUAD_DETAILED.map(p => ({
      id: p.id,
      nombre: p.name.split(' ')[0],
      apellidos: p.name.split(' ').slice(1).join(' '),
      dorsal: p.number,
      demarcacion: p.positionCategory,
      image: p.image
    }));
  }

  return players.map((p, i) => {
    const rawName = p.nombre || p.name || `Jugadora ${i + 1}`;
    const num = (p.dorsal !== undefined && p.dorsal !== null) ? p.dorsal : p.number;
    
    const cat = p.positionCategory || normalizeCategory(p.demarcacion || p.position);
    return {
      id: p.id || `p_${teamId || 'unknown'}_${i}`,
      name: rawName,
      number: num,
      positionCategory: cat as any,
      image: p.image
    };
  });
};

const getSquadPlayersForTeam = (teamId?: string, seasonStr?: string): string[] => {
  const detailed = getDetailedSquadPlayersForTeam(teamId, seasonStr);
  return detailed.map(p => p.name);
};

interface SessionsViewProps {
  season: string;
  selectedTeam: Team | null;
  teams: Team[];
  onSelectTeam: (team: Team) => void;
}

const TEAM_CONFIG: Record<string, { code: string; label: string; badgeBg: string; borderCol: string }> = {
  'FEMENINO_A': { code: 'A', label: 'ATB FEMENINO A', badgeBg: 'bg-sky-500', borderCol: 'border-sky-500' },
  'FEMENINO_B': { code: 'B', label: 'ATB FEMENINO B', badgeBg: 'bg-emerald-500', borderCol: 'border-emerald-500' },
  'FEMENINO_C': { code: 'C', label: 'ATB FEMENINO C', badgeBg: 'bg-amber-500', borderCol: 'border-amber-500' },
  'FEMENINO_D': { code: 'D', label: 'ATB FEMENINO D', badgeBg: 'bg-purple-500', borderCol: 'border-purple-500' },
  'FEMENINO_E': { code: 'E', label: 'ATB FEMENINO E', badgeBg: 'bg-rose-500', borderCol: 'border-rose-500' },
};

const COMMON_MATERIALS = [
  'Conos', 'Petos (2 colores)', 'Petos (3 colores)', 'Balones Oficiales', 
  'Picas', 'Mini-porterías', 'Escalera de agilidad', 'Cintas elásticas', 
  'Vallas bajas', 'Vallas altas', 'Muñecos barrera', 'Chinos / Setas'
];

const PHASE_OPTIONS: ExerciseTask['phase'][] = [
  'Calentamiento',
  'Tarea 1',
  'Tarea 2',
  'Tarea 3',
  'Parte Principal',
  'Tarea Analítica',
  'Juego de Posición',
  'Partido / Global',
  'Vuelta a la Calma'
];

export default function SessionsView({ season, selectedTeam, teams, onSelectTeam }: SessionsViewProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('view');
  const [displayMode, setDisplayMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filialTeamSearch, setFilialTeamSearch] = useState<string>('FEMENINO_B');

  // Reset filial search when team changes to ensure valid selection
  useEffect(() => {
    if (!selectedTeam) return;
    if (selectedTeam.id === 'FEMENINO_A') setFilialTeamSearch('FEMENINO_B');
    else if (selectedTeam.id === 'FEMENINO_B') setFilialTeamSearch('FEMENINO_C');
    else if (selectedTeam.id === 'FEMENINO_C') setFilialTeamSearch('FEMENINO_D');
    else if (selectedTeam.id === 'FEMENINO_D') setFilialTeamSearch('FEMENINO_E');
  }, [selectedTeam?.id]);
  const [filialPlayerSearchQuery, setFilialPlayerSearchQuery] = useState('');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedSessionModal, setSelectedSessionModal] = useState<TrainingSession | null>(null);
  const [selectedOfficialSheetSession, setSelectedOfficialSheetSession] = useState<TrainingSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<TrainingSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTaskTab, setActiveTaskTab] = useState<number>(0);

  // Image Editor State
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Form State for "Crear / Editar Sesión"
  const [formData, setFormData] = useState<{
    sessionNumber: number | string;
    date: string;
    durationTotalMin: number;
    microcycle: string;
    dayType: string;
    intensity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
    playerStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'>;
    objectivesTactical: string;
    objectivesPhysical: string;
    objectivesTechnical: string;
    selectedMaterials: string[];
    notes: string;
    tasks: ExerciseTask[];
    filialPlayers: string[];
    sessionStaffTasks: SessionStaffTask[];
  }>({
    sessionNumber: '',
    date: new Date().toISOString().split('T')[0],
    durationTotalMin: 90,
    microcycle: 'Microciclo 1',
    dayType: 'MD-3',
    intensity: 'Alta',
    playerStatuses: {},
    objectivesTactical: '',
    objectivesPhysical: '',
    objectivesTechnical: '',
    selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
    notes: '',
    tasks: [
      { id: 't1', title: '', phase: 'Calentamiento', durationMin: 15, description: '', coach: '', foco: 'MIXTO', tipologia: 'LÚDICO' },
      { id: 't2', title: '', phase: 'Tarea 1', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'RONDOS' },
      { id: 't3', title: '', phase: 'Tarea 2', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'JUEGO DE POSICIÓN' },
      { id: 't4', title: '', phase: 'Tarea 3', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'PARTIDO CONDICIONADO' }
    ],
    filialPlayers: [],
    sessionStaffTasks: []
  });

  // Current Squad Players for selected team (Detailed)
  const squadPlayers = React.useMemo(() => {
    return getDetailedSquadPlayersForTeam(selectedTeam?.id, season);
  }, [selectedTeam?.id, season]);

  // Current Staff Members for selected team
  const staffMembers = React.useMemo(() => {
    if (!selectedTeam?.staff) return [];
    const staff = selectedTeam.staff;
    const members: { name: string; role: string; image?: string }[] = [];
    if (staff.headCoach) members.push({ ...staff.headCoach, role: '1º Entrenador' });
    if (staff.secondCoach) members.push({ ...staff.secondCoach, role: '2º Entrenador' });
    if (staff.physicalTrainer) members.push({ ...staff.physicalTrainer, role: 'Prep. Físico' });
    if (staff.goalkeeperCoach) members.push({ ...staff.goalkeeperCoach, role: 'Entr. Porteras' });
    if (staff.analyst) members.push({ ...staff.analyst, role: 'Analista' });
    if (staff.delegate) members.push({ ...staff.delegate, role: 'Delegado' });
    if (staff.physio) members.push({ ...staff.physio, role: 'Fisioterapeuta' });
    return members;
  }, [selectedTeam?.staff]);

  // Handle Player Availability Click Cycle (1 click = disponible, 2 clicks = comodin, 3 clicks = no_disponible)
  const handleTogglePlayerStatus = (pId: string) => {
    setFormData(prev => {
      const statuses = prev.playerStatuses || {};
      const current = statuses[pId] || 'disponible';
      let next: 'disponible' | 'comodin' | 'no_disponible' = 'disponible';
      if (current === 'disponible') {
        next = 'comodin'; // 2 clicks (yellow)
      } else if (current === 'comodin') {
        next = 'no_disponible'; // 3 clicks (red)
      } else {
        next = 'disponible'; // 1 click (green)
      }

      return {
        ...prev,
        playerStatuses: {
          ...statuses,
          [pId]: next
        }
      };
    });
  };

  // Load sessions from Supabase for selectedTeam + season
  useEffect(() => {
    async function fetchSessions() {
      if (!selectedTeam) return;
      setIsLoading(true);
      try {
        const seasonStr = season || '2026/2027';
        
        if (supabase) {
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('team_id', selectedTeam.id)
            .eq('season', seasonStr)
            .order('date', { ascending: false });

          if (error) {
            console.error('Supabase fetch error:', error.message);
            setSessions([]);
          } else if (data) {
            // Map back to TrainingSession type and deduplicate by ID
            const mappedSessions = data.map((d: any) => ({
              ...d,
              teamId: d.team_id,
              sessionNumber: d.session_number,
              durationTotalMin: d.duration_min,
              numPlayers: d.num_players,
              playerStatuses: d.player_statuses,
              objectivesTactical: d.obj_tactical,
              objectivesPhysical: d.obj_physical,
              objectivesTechnical: d.obj_technical,
              sessionStaffTasks: d.staff_tasks
            }));
            
            const uniqueSessions = Array.from(new Map(mappedSessions.map((s: any) => [String(s.id), s])).values()) as TrainingSession[];
            setSessions(uniqueSessions);
          }
        }
      } catch (e) {
        console.error('Error exception fetching sessions:', e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessions();
  }, [selectedTeam?.id, season, supabase]);

  // Save Session Helper
  const syncSessionToSupabase = async (updatedList: TrainingSession[], lastSession?: TrainingSession) => {
    if (!selectedTeam) return;
    
    // Deduplicate and update local state for immediate feedback
    const uniqueList = Array.from(new Map(updatedList.map(s => [String(s.id), s])).values());
    setSessions(uniqueList);

    if (supabase && lastSession) {
      try {
        console.log('🚀 Supabase Sync Start:', lastSession.id);
        
        // Comprehensive mapping to match the recommended SQL schema
        const sessionToSave = {
          id: String(lastSession.id),
          team_id: lastSession.teamId,
          season: lastSession.season,
          title: lastSession.title,
          session_number: lastSession.sessionNumber,
          date: lastSession.date,
          duration_min: lastSession.durationTotalMin,
          microcycle: lastSession.microcycle,
          day_type: lastSession.dayType,
          intensity: lastSession.intensity,
          num_players: lastSession.numPlayers,
          player_statuses: lastSession.playerStatuses,
          obj_tactical: lastSession.objectivesTactical,
          obj_physical: lastSession.objectivesPhysical,
          obj_technical: lastSession.objectivesTechnical,
          materials: lastSession.materials,
          tasks: lastSession.tasks,
          staff_tasks: lastSession.sessionStaffTasks,
          notes: lastSession.notes,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('sessions')
          .upsert([sessionToSave], { onConflict: 'id' })
          .select();
        
        if (error) {
          console.error('❌ Supabase Save Error:', error.message, error.details);
          setDbError(`Error al guardar: ${error.message}`);
          throw error;
        }

        if (data && data[0]) {
          // If it was a new session (temp ID), update it with the DB ID (which is the same string in this schema, but good practice)
          console.log('✅ Supabase Sync Success, ID:', data[0].id);
        }
        
        setDbError(null);
      } catch (e: any) {
        console.error('💥 Sync Exception:', e);
      }
    }
  };

  // Handle Create / Update Form Submit
  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    if (!formData.sessionNumber) {
      alert('Por favor, introduce el Nº de Sesión.');
      return;
    }

    const seasonStr = season || '2026/2027';

    // Calculate player availability breakdowns (Squad + Filial) using IDs
    const statuses = formData.playerStatuses || {};
    const allRelevantPlayerIds = [...squadPlayers.map(p => p.id), ...formData.filialPlayers];

    const availablePlayerIds = allRelevantPlayerIds.filter(
      id => (statuses[id] || 'disponible') === 'disponible'
    );
    const wildcardPlayerIds = allRelevantPlayerIds.filter(
      id => statuses[id] === 'comodin'
    );
    const unavailablePlayerIds = allRelevantPlayerIds.filter(
      id => statuses[id] === 'no_disponible'
    );

    const numPlayers = wildcardPlayerIds.length > 0
      ? `${availablePlayerIds.length}+${wildcardPlayerIds.length}`
      : `${availablePlayerIds.length}`;

    const newSession: TrainingSession = {
      id: editingSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamId: selectedTeam.id,
      season: seasonStr,
      title: `SESIÓN Nº${formData.sessionNumber}`,
      sessionNumber: Number(formData.sessionNumber),
      date: formData.date,
      durationTotalMin: Number(formData.durationTotalMin) || 90,
      microcycle: formData.microcycle,
      dayType: formData.dayType,
      intensity: formData.intensity,
      numPlayers,
      availablePlayerNames: availablePlayerIds, // Note: We store IDs here for robustness
      wildcardPlayerNames: wildcardPlayerIds,
      unavailablePlayerNames: unavailablePlayerIds,
      filialPlayerNames: formData.filialPlayers,
      playerStatuses: formData.playerStatuses,
      objectivesTactical: formData.objectivesTactical,
      objectivesPhysical: formData.objectivesPhysical,
      objectivesTechnical: formData.objectivesTechnical,
      materials: formData.selectedMaterials,
      tasks: formData.tasks,
      sessionStaffTasks: formData.sessionStaffTasks,
      notes: formData.notes,
      created_at: new Date().toISOString()
    };

    let updatedList: TrainingSession[] = [];
    if (editingSessionId) {
      updatedList = sessions.map(s => s.id === editingSessionId ? newSession : s);
      setSuccessMessage('¡Sesión actualizada con éxito!');
    } else {
      updatedList = [newSession, ...sessions];
      setSuccessMessage('¡Sesión registrada correctamente para este equipo!');
    }

    syncSessionToSupabase(updatedList, newSession);
    setEditingSessionId(null);
    resetForm();
    setActiveTab('view');

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId) {
      console.warn('❌ Cannot delete: missing sessionId');
      return;
    }

    console.log('🗑️ Attempting to delete session:', sessionId);

    // Close modals
    setSessionToDelete(null);
    if (selectedSessionModal && String(selectedSessionModal.id) === String(sessionId)) {
      setSelectedSessionModal(null);
    }

    // Optimistic UI update
    setSessions(prev => prev.filter(s => String(s.id) !== String(sessionId)));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', String(sessionId));
        
        if (error) {
          console.warn('⚠️ Supabase delete warning, trying numeric match:', error.message);
          const numId = Number(sessionId);
          if (!isNaN(numId)) {
            await supabase.from('sessions').delete().eq('id', numId);
          }
        } else {
          console.log('✅ Session deleted successfully from Supabase');
        }
      } catch (e: any) {
        console.error('💥 Delete Exception:', e);
      }
    }

    setSuccessMessage('Sesión eliminada correctamente');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const resetForm = () => {
    const defaultStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'> = {};
    squadPlayers.forEach(p => {
      defaultStatuses[p.id] = 'disponible';
    });

    setFormData({
      sessionNumber: '',
      date: new Date().toISOString().split('T')[0],
      durationTotalMin: 90,
      microcycle: 'Microciclo 1',
      dayType: 'MD-3',
      intensity: 'Alta',
      playerStatuses: defaultStatuses,
      objectivesTactical: '',
      objectivesPhysical: '',
      objectivesTechnical: '',
      selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
      notes: '',
      tasks: [
        { id: 't1', title: '', phase: 'Calentamiento', durationMin: 15, description: '', coach: '', foco: 'MIXTO', tipologia: 'LÚDICO' },
        { id: 't2', title: '', phase: 'Tarea 1', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'RONDOS' },
        { id: 't3', title: '', phase: 'Tarea 2', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'JUEGO DE POSICIÓN' },
        { id: 't4', title: '', phase: 'Tarea 3', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'PARTIDO CONDICIONADO' }
      ],
      filialPlayers: [],
      sessionStaffTasks: []
    });
  };

  // Edit Existing Session
  const handleEditSession = (session: TrainingSession) => {
    setEditingSessionId(session.id);
    
    // Resolve initial player statuses from session
    const resolvedStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'> = {};
    
    if (session.playerStatuses && Object.keys(session.playerStatuses).length > 0) {
      Object.assign(resolvedStatuses, session.playerStatuses);
    } else {
      const unav = session.unavailablePlayerNames || [];
      const wild = session.wildcardPlayerNames || [];
      squadPlayers.forEach(p => {
        // Fallback for older sessions that might have used names
        if (unav.some(u => u.toUpperCase() === p.id.toUpperCase() || u.toUpperCase() === p.name.toUpperCase())) {
          resolvedStatuses[p.id] = 'no_disponible';
        } else if (wild.some(w => w.toUpperCase() === p.id.toUpperCase() || w.toUpperCase() === p.name.toUpperCase())) {
          resolvedStatuses[p.id] = 'comodin';
        } else {
          resolvedStatuses[p.id] = 'disponible';
        }
      });
    }

    // Ensure exactly 4 tasks exist in the form (Calentamiento + 3 Tasks)
    const existingTasks = session.tasks || [];
    const normalizedTasks: ExerciseTask[] = [
      existingTasks.find(t => t.phase === 'Calentamiento') || { id: 't1', title: '', phase: 'Calentamiento', durationMin: 15, description: '', coach: '', foco: 'MIXTO', tipologia: 'LÚDICO' },
      existingTasks.find(t => t.phase === 'Tarea 1') || { id: 't2', title: '', phase: 'Tarea 1', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'RONDOS' },
      existingTasks.find(t => t.phase === 'Tarea 2') || { id: 't3', title: '', phase: 'Tarea 2', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'JUEGO DE POSICIÓN' },
      existingTasks.find(t => t.phase === 'Tarea 3') || { id: 't4', title: '', phase: 'Tarea 3', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'PARTIDO CONDICIONADO' }
    ];

    setFormData({
      sessionNumber: session.sessionNumber || '',
      date: session.date,
      durationTotalMin: session.durationTotalMin,
      microcycle: session.microcycle || 'Microciclo 1',
      dayType: session.dayType || 'MD-3',
      intensity: session.intensity || 'Alta',
      playerStatuses: resolvedStatuses,
      objectivesTactical: session.objectivesTactical || '',
      objectivesPhysical: session.objectivesPhysical || '',
      objectivesTechnical: session.objectivesTechnical || '',
      selectedMaterials: session.materials || [],
      notes: session.notes || '',
      tasks: normalizedTasks,
      filialPlayers: session.filialPlayerNames || [],
      sessionStaffTasks: session.sessionStaffTasks || []
    });
    setActiveTab('create');
  };

  // Toggle Material Selection
  const toggleMaterial = (mat: string) => {
    setFormData(prev => {
      const exists = prev.selectedMaterials.includes(mat);
      return {
        ...prev,
        selectedMaterials: exists
          ? prev.selectedMaterials.filter(m => m !== mat)
          : [...prev.selectedMaterials, mat]
      };
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Dark Integrated Header Section */}
      <div className="bg-[#0f172a] rounded-3xl py-6 px-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow/gradient */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-sky-500/10 to-transparent opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-4 py-1 bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-black rounded-full uppercase tracking-[0.1em] shadow-sm">
                PLANIFICACIÓN METODOLÓGICA
              </span>
              <span className="text-[12px] font-bold text-slate-400 tracking-tight">| Temporada {season || '2026/2027'}</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-4">
                <div className="p-2 bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20">
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>
                SESIONES DE ENTRENAMIENTO
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Only shown if team selected */}
      {!selectedTeam ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-black text-slate-800">Selecciona una plantilla primero</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Para garantizar la independencia metodológica del club, debes elegir la plantilla (A, B, C, D o E) sobre la cual crearás o visualizarás las sesiones de entrenamiento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notification Toast */}
          <AnimatePresence>
            {dbError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Error de Base de Datos</p>
                  <p>{dbError}</p>
                </div>
              </div>
            )}

        {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between font-bold text-xs"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 bg-white/20 rounded-full p-0.5" />
                  <span>{successMessage}</span>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-white/80 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sub-Navigation Tabs: Crear Sesión vs Ver Sesiones */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('view')}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeTab === 'view'
                    ? "bg-sky-500 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <Eye className="w-4 h-4" />
                Ver Sesiones ({sessions.length})
              </button>

              <button
                onClick={() => {
                  if (activeTab !== 'create') {
                    resetForm();
                    setEditingSessionId(null);
                  }
                  setActiveTab('create');
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activeTab === 'create'
                    ? "bg-sky-500 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <PlusCircle className="w-4 h-4" />
                {editingSessionId ? 'Editando Sesión' : 'Crear Nueva Sesión'}
              </button>
            </div>

            <div className="hidden sm:block text-xs font-bold text-slate-400">
              Plantilla actual: <span className="text-slate-800">{selectedTeam.name}</span>
            </div>
          </div>

          {/* TAB 1: VER SESIONES */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* Display Mode Toggle & Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Sesiones</h3>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                      displayMode === 'list' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setDisplayMode('calendar')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                      displayMode === 'calendar' ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Calendario
                  </button>
                </div>
              </div>

              {displayMode === 'list' ? (
                <>
                  {/* Sessions Grid */}
                  {sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                    >
                      <div className="p-5 space-y-3">
                        {/* Session Top Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-slate-900 text-white font-black text-[10px] rounded-full uppercase">
                              {session.dayType || 'MD-3'}
                            </span>
                            {session.microcycle && (
                              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                                {session.microcycle}
                              </span>
                            )}
                          </div>

                          <span className={cn(
                            "text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1",
                            session.intensity === 'Alta' || session.intensity === 'Muy Alta'
                              ? "bg-rose-100 text-rose-700"
                              : session.intensity === 'Media'
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          )}>
                            <Flame className="w-3 h-3" />
                            {session.intensity}
                          </span>
                        </div>

                        {/* Title & Date */}
                        <div>
                          <h3 className="font-black text-slate-900 text-base group-hover:text-sky-600 transition-colors leading-snug">
                            {session.title}
                          </h3>
                          <div className="flex items-center gap-3 text-slate-400 text-xs mt-1.5 font-semibold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {session.date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {session.durationTotalMin} min
                            </span>
                          </div>
                        </div>

                        {/* Main Tactical Objective preview */}
                        {session.objectivesTactical && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-2">
                            <strong className="text-slate-800">Obj. Táctico:</strong> {session.objectivesTactical}
                          </div>
                        )}

                        {/* Tasks count & RPE */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-sky-500" />
                            {session.tasks ? session.tasks.length : 0} Ejercicios
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOfficialSheetSession(session)}
                            className="flex items-center gap-1.5 text-[11px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                            title="Ver / Imprimir Ficha con plantilla oficial del club"
                          >
                            <Printer className="w-3.5 h-3.5 text-sky-400" />
                            Ficha Oficial ATB
                          </button>

                          <button
                            onClick={() => setSelectedSessionModal(session)}
                            className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detalles
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditSession(session)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                            title="Editar Sesión"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Sesión"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 shadow-xs space-y-3">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-black text-slate-800">No hay sesiones registradas</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Todavía no se ha diseñado ninguna sesión de entrenamiento para la plantilla <strong className="text-slate-900">{selectedTeam.name}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('create');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white font-black text-xs rounded-xl shadow-md hover:bg-sky-600 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Crear Primera Sesión
                  </button>
                </div>
                  )}
                </>
              ) : (
                /* Calendar View */
                <div className="space-y-6">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-sky-500" />
                      {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                      {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day) => (
                        <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 tracking-[0.2em]">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {(() => {
                        const monthStart = startOfMonth(currentMonth);
                        const monthEnd = endOfMonth(monthStart);
                        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                        return calendarDays.map((day, idx) => {
                          const daySessions = sessions.filter(s => {
                            try {
                              return isSameDay(parseISO(s.date), day);
                            } catch (e) {
                              return false;
                            }
                          });
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "min-h-[100px] p-2 border-r border-b border-slate-100 transition-colors relative group",
                                !isCurrentMonth ? 'bg-slate-50/50' : 'bg-white',
                                isToday && 'bg-sky-50/50'
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={cn(
                                  "text-[11px] font-black",
                                  !isCurrentMonth ? 'text-slate-300' : isToday ? 'text-sky-600' : 'text-slate-500'
                                )}>
                                  {format(day, 'd')}
                                </span>
                                {isToday && (
                                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
                                )}
                              </div>
                              <div className="flex flex-col gap-1 w-full">
                                {daySessions.map(session => (
                                  <button
                                    key={session.id}
                                    onClick={() => setSelectedSessionModal(session)}
                                    className="w-full px-2 py-1 bg-slate-900 hover:bg-sky-600 text-white rounded-md flex items-center justify-between text-[9px] font-black shadow-sm transition-all hover:translate-x-0.5 cursor-pointer group/item"
                                    title={session.title}
                                  >
                                    <span className="truncate max-w-[80%] uppercase tracking-tighter">{session.title}</span>
                                    <span className="bg-sky-500 text-white px-1 rounded text-[8px]">{session.sessionNumber || '#'}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREAR / EDITAR SESIÓN */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmitSession} className="space-y-6">
              {/* Form Title Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-sky-500" />
                    {editingSessionId ? 'Editar Sesión de Entrenamiento' : 'Nueva Sesión'}
                  </h2>
                </div>

              </div>

              {/* Section 1: Datos Generales */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  1. Datos Generales de la Sesión
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Sesión *</label>
                    <input
                      type="number"
                      required
                      value={formData.sessionNumber}
                      onChange={e => setFormData(p => ({ ...p, sessionNumber: e.target.value }))}
                      placeholder=""
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duración Total (min)</label>
                    <input
                      type="number"
                      value={formData.durationTotalMin}
                      onChange={e => setFormData(p => ({ ...p, durationTotalMin: Number(e.target.value) }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Microciclo</label>
                    <input
                      type="text"
                      value={formData.microcycle}
                      onChange={e => setFormData(p => ({ ...p, microcycle: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Día del Microciclo</label>
                    <select
                      value={formData.dayType}
                      onChange={e => setFormData(p => ({ ...p, dayType: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="MD+1">MD+1</option>
                      <option value="MD+2">MD+2</option>
                      <option value="MD-4">MD-4</option>
                      <option value="MD-3">MD-3</option>
                      <option value="MD-2">MD-2</option>
                      <option value="MD-1">MD-1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Intensidad Estimada</label>
                    <select
                      value={formData.intensity}
                      onChange={e => setFormData(p => ({ ...p, intensity: e.target.value as any }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Muy Alta">Muy Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Disponibilidad de Jugadoras de la Plantilla */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-500" />
                      2. Disponibilidad de Jugadoras de la Plantilla
                    </h3>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const allDisp: Record<string, 'disponible'> = {};
                        squadPlayers.forEach(p => { allDisp[p.id] = 'disponible'; });
                        setFormData(prev => ({ ...prev, playerStatuses: allDisp }));
                      }}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Todas Disponibles
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const allCom: Record<string, 'comodin'> = {};
                        squadPlayers.forEach(p => { allCom[p.id] = 'comodin'; });
                        setFormData(prev => ({ ...prev, playerStatuses: allCom }));
                      }}
                      className="px-2.5 py-1 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Todas Comodines
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const allNo: Record<string, 'no_disponible'> = {};
                        squadPlayers.forEach(p => { allNo[p.id] = 'no_disponible'; });
                        setFormData(prev => ({ ...prev, playerStatuses: allNo }));
                      }}
                      className="px-2.5 py-1 bg-red-50 text-red-800 hover:bg-red-100 border border-red-300 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Todas No Disponibles
                    </button>
                  </div>
                </div>

                {/* Counters Bar */}
                {(() => {
                  const currentStatuses = formData.playerStatuses || {};
                  
                  // Collect IDs of players who are goalkeepers
                  const potentialFilialTeams = ['FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'];
                  const allGKIds = new Set<string>();
                  
                  // Goalkeepers from main team
                  squadPlayers.filter(p => p.positionCategory === 'PORTERAS').forEach(p => allGKIds.add(p.id));
                  
                  // We also need the IDs of filial players who are goalkeepers
                  const allFilialDetailed: DetailedSquadPlayer[] = [];
                  potentialFilialTeams.forEach(tId => {
                    allFilialDetailed.push(...getDetailedSquadPlayersForTeam(tId, season));
                  });
                  allFilialDetailed.filter(p => p.positionCategory === 'PORTERAS').forEach(p => allGKIds.add(p.id));
                  
                  const allActivePlayerIds = [...squadPlayers.map(p => p.id), ...formData.filialPlayers];
                  
                  const fieldPlayerIds = allActivePlayerIds.filter(id => !allGKIds.has(id));
                  const gkPlayerIds = allActivePlayerIds.filter(id => allGKIds.has(id));

                  const availField = fieldPlayerIds.filter(id => (currentStatuses[id] || 'disponible') === 'disponible').length;
                  const availGK = gkPlayerIds.filter(id => (currentStatuses[id] || 'disponible') === 'disponible').length;
                  
                  const wildField = fieldPlayerIds.filter(id => currentStatuses[id] === 'comodin').length;
                  const wildGK = gkPlayerIds.filter(id => currentStatuses[id] === 'comodin').length;
                  
                  const unavailField = fieldPlayerIds.filter(id => currentStatuses[id] === 'no_disponible').length;
                  const unavailGK = gkPlayerIds.filter(id => currentStatuses[id] === 'no_disponible').length;

                  const cAvailable = availField + availGK;
                  const cWildcard = wildField + wildGK;
                  const cUnavailable = unavailField + unavailGK;

                  // Format total string as "FieldPlayers + Goalkeepers"
                  const totalFieldCount = availField + wildField;
                  const totalGKCount = availGK + wildGK;

                  let totalStr = `${totalFieldCount}`;
                  if (totalGKCount > 0) {
                    totalStr = `${totalFieldCount} + ${totalGKCount}`;
                  }

                  return (
                    <div className="flex flex-wrap items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Disponibles: <strong className="text-emerald-950 font-black">{cAvailable}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 rounded-lg border border-amber-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span>Comodines: <strong className="text-amber-950 font-black">{cWildcard}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-900 rounded-lg border border-red-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <span>No Disponibles: <strong className="text-red-950 font-black">{cUnavailable}</strong></span>
                      </div>

                      <div className="ml-auto text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                        Nº Jugadoras: <strong className="text-slate-900 text-xs font-black ml-1">{totalStr}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Player Grid Grouped by Position Categories */}
                {(() => {
                  const potentialFilialTeams = ['FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'];
                  const allPossiblePlayers: DetailedSquadPlayer[] = [];
                  potentialFilialTeams.forEach(tId => {
                    allPossiblePlayers.push(...getDetailedSquadPlayersForTeam(tId, season));
                  });

                  const filialDetailed = formData.filialPlayers.map(id => {
                    const found = allPossiblePlayers.find(p => p.id === id);
                    return found || {
                      id,
                      name: 'Filial',
                      positionCategory: 'FILIAL' as any,
                      number: undefined,
                      image: undefined
                    };
                  }).map(p => ({ ...p, positionCategory: 'FILIAL' as any }));
                  
                  const allDetailed = [...squadPlayers, ...filialDetailed];
                  const CATEGORIES = ['PORTERAS', 'DEFENSORAS', 'CENTROCAMPISTAS', 'DELANTERAS', 'OTRAS', 'FILIAL'];

                  return (
                    <div className="space-y-6 pt-2">
                      {CATEGORIES.map(cat => {
                        const catPlayers = allDetailed.filter(p => p.positionCategory === cat);
                        if (catPlayers.length === 0) return null;

                        return (
                          <div key={cat} className="space-y-3">
                            {/* Position Category Divider */}
                            <div className="relative flex py-1 items-center">
                              <div className="flex-grow border-t border-slate-200"></div>
                              <span className={cn(
                                "shrink-0 mx-4 text-[11px] font-black uppercase tracking-[0.25em]",
                                cat === 'FILIAL' ? "text-sky-500" : "text-slate-400"
                              )}>
                                {cat}
                              </span>
                              <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            {/* Player circular avatars grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-5 gap-x-3 items-start justify-items-center">
                              {catPlayers.map((player, idx) => {
                                const currentStatuses = formData.playerStatuses || {};
                                const status = currentStatuses[player.id] || 'disponible';
                                const isFilial = cat === 'FILIAL';

                                return (
                                  <button
                                    key={`${player.id}_${idx}`}
                                    type="button"
                                    onClick={() => handleTogglePlayerStatus(player.id)}
                                    className="group flex flex-col items-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
                                  >
                                    <div className="relative">
                                      {/* Top-left dorsal badge */}
                                      {player.number !== undefined && (
                                        <div className="absolute -top-1 -left-1 z-20 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-xs">
                                          {player.number}
                                        </div>
                                      )}

                                      {/* Filial badge */}
                                      {isFilial && (
                                        <div className="absolute -top-1 -left-1 z-20 px-1.5 py-0.5 rounded bg-sky-600 text-white font-black text-[7px] uppercase border border-white shadow-xs">
                                          FILIAL
                                        </div>
                                      )}

                                      {/* Top-right status indicator */}
                                      {status === 'disponible' && (
                                        <div className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shadow-xs" title="Disponible">
                                          ✓
                                        </div>
                                      )}
                                      {status === 'comodin' && (
                                        <div className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black shadow-xs" title="Comodín">
                                          ★
                                        </div>
                                      )}
                                      {status === 'no_disponible' && (
                                        <div className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black shadow-xs" title="No Disponible">
                                          ✕
                                        </div>
                                      )}

                                      {/* Circular photo avatar */}
                                      <div className={cn(
                                        "w-14 h-14 rounded-full border-2 overflow-hidden flex items-center justify-center relative shadow-xs transition-all",
                                        status === 'disponible' && (isFilial ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20" : "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"),
                                        status === 'comodin' && "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/30",
                                        status === 'no_disponible' && "border-red-500 bg-red-50/70 opacity-55 ring-2 ring-red-400/20"
                                      )}>
                                        {player.image ? (
                                          <img
                                            src={player.image}
                                            alt={player.name}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <Users className={cn(
                                            "w-6 h-6",
                                            status === 'no_disponible' ? "text-red-300" : isFilial ? "text-sky-300" : "text-slate-300"
                                          )} />
                                        )}
                                      </div>
                                    </div>

                                    {/* Player Name */}
                                    <span className={cn(
                                      "mt-1.5 text-[10px] font-black uppercase text-center tracking-tight leading-tight max-w-[85px] truncate",
                                      status === 'disponible' && (isFilial ? "text-sky-700" : "text-slate-800"),
                                      status === 'comodin' && "text-amber-900 font-black",
                                      status === 'no_disponible' && "text-red-600 line-through opacity-70"
                                    )}>
                                      {player.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* FILIAL PLAYERS SECTION */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h4 className="text-[11px] font-black uppercase text-sky-600 tracking-[0.2em] flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Añadir Jugadoras de Filial
                    </h4>

                    <div className="flex items-center gap-2">
                      <select 
                        value={filialTeamSearch}
                        onChange={(e) => setFilialTeamSearch(e.target.value)}
                        className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {(() => {
                          const options = [];
                          const teamId = selectedTeam?.id || '';
                          
                          if (teamId === 'FEMENINO_A') {
                            options.push({ id: 'FEMENINO_B', label: 'Plantilla B' });
                            options.push({ id: 'FEMENINO_C', label: 'Plantilla C' });
                            options.push({ id: 'FEMENINO_D', label: 'Plantilla D' });
                            options.push({ id: 'FEMENINO_E', label: 'Plantilla E' });
                          } else if (teamId === 'FEMENINO_B') {
                            options.push({ id: 'FEMENINO_C', label: 'Plantilla C' });
                            options.push({ id: 'FEMENINO_D', label: 'Plantilla D' });
                            options.push({ id: 'FEMENINO_E', label: 'Plantilla E' });
                          } else if (teamId === 'FEMENINO_C') {
                            options.push({ id: 'FEMENINO_D', label: 'Plantilla D' });
                            options.push({ id: 'FEMENINO_E', label: 'Plantilla E' });
                          } else if (teamId === 'FEMENINO_D') {
                            options.push({ id: 'FEMENINO_E', label: 'Plantilla E' });
                          }
                          
                          return options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ));
                        })()}
                      </select>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Buscar jugadora..."
                          value={filialPlayerSearchQuery}
                          onChange={(e) => setFilialPlayerSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-sky-500 w-48"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Search Results */}
                  {filialPlayerSearchQuery.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(() => {
                        const otherPlayers = getDetailedSquadPlayersForTeam(filialTeamSearch, season);
                        const filtered = otherPlayers.filter(p => 
                          p.name.toUpperCase().includes(filialPlayerSearchQuery.toUpperCase()) &&
                          !formData.filialPlayers.includes(p.id)
                        );
                        
                        if (filtered.length === 0) return <p className="col-span-full text-center py-4 text-[10px] font-bold text-slate-400 uppercase">No se encontraron jugadoras</p>;
                        
                        return filtered.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                filialPlayers: [...prev.filialPlayers, p.id],
                                playerStatuses: { ...prev.playerStatuses, [p.id]: 'disponible' }
                              }));
                              setFilialPlayerSearchQuery('');
                            }}
                            className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-sky-50 hover:border-sky-200 transition-all text-left"
                          >
                            <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center text-[8px] font-black text-sky-700">
                              {p.number || p.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-black text-slate-700 uppercase truncate">{p.name}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Selected Filial Players */}
                  {formData.filialPlayers.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-5 gap-x-3 items-start justify-items-center pt-2">
                      {formData.filialPlayers.map((playerId, idx) => {
                        const status = (formData.playerStatuses || {})[playerId] || 'disponible';
                        
                        // Find the player object to get the name
                        const potentialFilialTeams = ['FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'];
                        let playerObj = null;
                        for (const tId of potentialFilialTeams) {
                          const list = getDetailedSquadPlayersForTeam(tId, season);
                          const found = list.find(p => p.id === playerId);
                          if (found) {
                            playerObj = found;
                            break;
                          }
                        }
                        
                        const playerName = playerObj?.name || 'Filial';

                        return (
                          <div key={`${playerId}_${idx}`} className="relative group flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePlayerStatus(playerId)}
                              className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all shadow-sm bg-sky-50 border-sky-500 text-sky-700 shadow-sky-100 hover:scale-105"
                            >
                              <span>{playerName.charAt(0)}</span>
                              <div className={cn(
                                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                status === 'disponible' ? "bg-emerald-500" :
                                status === 'comodin' ? "bg-amber-400" :
                                "bg-red-500"
                              )}>
                                {status === 'disponible' ? <Check className="w-3 h-3 text-white" /> :
                                 status === 'comodin' ? <Sparkles className="w-3 h-3 text-white" /> :
                                 <X className="w-3 h-3 text-white" />}
                              </div>
                              
                              <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase border border-white shadow-sm">
                                FILIAL
                              </div>
                            </button>
                            <span className="mt-2 text-[9px] font-black uppercase tracking-tight text-center max-w-[70px] truncate leading-tight text-sky-700">
                              {playerName}
                            </span>
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                filialPlayers: prev.filialPlayers.filter(id => id !== playerId),
                                playerStatuses: Object.fromEntries(Object.entries(prev.playerStatuses || {}).filter(([k]) => k !== playerId))
                              }))}
                              className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Material e Infraestructura Necesaria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-sky-500" />
                  3. MATERIAL
                </h3>

                <div className="flex flex-wrap gap-2 pt-1">
                  {COMMON_MATERIALS.map(mat => {
                    const isSelected = formData.selectedMaterials.includes(mat);
                    return (
                      <button
                        type="button"
                        key={mat}
                        onClick={() => toggleMaterial(mat)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        {mat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Tareas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-sky-500" />
                  4. TAREAS
                </h3>

                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {['CALENTAMIENTO', 'TAREA 1', 'TAREA 2', 'TAREA 3'].map((tab, idx) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTaskTab(idx)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                        activeTaskTab === idx
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                  {/* Left Side: Text Inputs */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Nombre Tarea</label>
                        <input
                          type="text"
                          value={formData.tasks[activeTaskTab]?.title || ''}
                          onChange={e => {
                            const newTasks = [...formData.tasks];
                            newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], title: e.target.value };
                            setFormData(p => ({ ...p, tasks: newTasks }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Dirige</label>
                        <input
                          type="text"
                          value={formData.tasks[activeTaskTab]?.coach || ''}
                          onChange={e => {
                            const newTasks = [...formData.tasks];
                            newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], coach: e.target.value };
                            setFormData(p => ({ ...p, tasks: newTasks }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Tiempo (min)</label>
                        <input
                          type="number"
                          value={formData.tasks[activeTaskTab]?.durationMin || ''}
                          onChange={e => {
                            const newTasks = [...formData.tasks];
                            newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], durationMin: Number(e.target.value) };
                            setFormData(p => ({ ...p, tasks: newTasks }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Foco</label>
                        <select
                          value={formData.tasks[activeTaskTab]?.foco || 'MIXTO'}
                          onChange={e => {
                            const newTasks = [...formData.tasks];
                            newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], foco: e.target.value as any };
                            setFormData(p => ({ ...p, tasks: newTasks }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        >
                          <option value="MCB">MCB</option>
                          <option value="MSB">MSB</option>
                          <option value="MIXTO">MIXTO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Tipología</label>
                        <select
                          value={formData.tasks[activeTaskTab]?.tipologia || 'LÚDICO'}
                          onChange={e => {
                            const newTasks = [...formData.tasks];
                            newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], tipologia: e.target.value as any };
                            setFormData(p => ({ ...p, tasks: newTasks }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        >
                          <option value="LÚDICO">LÚDICO</option>
                          <option value="RONDOS">RONDOS</option>
                          <option value="EVOLUCIONES">EVOLUCIONES</option>
                          <option value="RUEDAS DE PASE">RUEDAS DE PASE</option>
                          <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                          <option value="JUEGO DE POSICIÓN">JUEGO DE POSICIÓN</option>
                          <option value="JUEGO DE PROGRESIÓN">JUEGO DE PROGRESIÓN</option>
                          <option value="PARTIDO CONDICIONADO">PARTIDO CONDICIONADO</option>
                          <option value="REDUCIDOS">REDUCIDOS</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Explicación de la Tarea</label>
                      <textarea
                        rows={6}
                        value={formData.tasks[activeTaskTab]?.description || ''}
                        onChange={e => {
                          const newTasks = [...formData.tasks];
                          newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], description: e.target.value };
                          setFormData(p => ({ ...p, tasks: newTasks }));
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none resize-none min-h-[160px]"
                      />
                    </div>
                  </div>

                  {/* Right Side: Image Upload/Preview Area */}
                  <div className="md:col-span-5 flex flex-col h-full pt-5">
                    <div className="flex-1 min-h-[300px]">
                      {formData.tasks[activeTaskTab]?.image ? (
                        <div className="relative w-full h-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group shadow-md transition-shadow hover:shadow-lg">
                          <img 
                            src={formData.tasks[activeTaskTab]?.image} 
                            alt="Preview" 
                            className="w-full h-full object-cover cursor-pointer"
                            referrerPolicy="no-referrer"
                            onClick={() => {
                              setImageToEdit(formData.tasks[activeTaskTab].image || null);
                              setIsEditorOpen(true);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTasks = [...formData.tasks];
                              newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], image: undefined };
                              setFormData(p => ({ ...p, tasks: newTasks }));
                            }}
                            className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl hover:bg-rose-600"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-sky-300 transition-all cursor-pointer group">
                          <div className="p-8 rounded-full bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform mb-4">
                            <ImagePlus className="w-16 h-16 text-slate-300 group-hover:text-sky-400 transition-colors" />
                          </div>
                          <span className="text-[14px] font-black text-slate-400 group-hover:text-sky-500 transition-colors uppercase tracking-widest">Añadir Imagen Tarea</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const result = reader.result as string;
                                  setImageToEdit(result);
                                  setIsEditorOpen(true);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Editor Modal Integration */}
              {imageToEdit && (
                <ImageEditorModal
                  image={imageToEdit}
                  isOpen={isEditorOpen}
                  onClose={() => setIsEditorOpen(false)}
                  onSave={(croppedImage) => {
                    const newTasks = [...formData.tasks];
                    newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], image: croppedImage };
                    setFormData(p => ({ ...p, tasks: newTasks }));
                    setIsEditorOpen(false);
                  }}
                />
              )}

              {/* 5. CUERPO TÉCNICO */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">5. Cuerpo Técnico</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tareas y focos específicos del Staff</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {staffMembers.map((member) => {
                    const isSelected = formData.sessionStaffTasks.some(t => t.staffName === member.name);
                    return (
                      <button
                        key={`${member.name}_${member.role}`}
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const exists = prev.sessionStaffTasks.find(t => t.staffName === member.name);
                            if (exists) {
                              return {
                                ...prev,
                                sessionStaffTasks: prev.sessionStaffTasks.filter(t => t.staffName !== member.name)
                              };
                            } else {
                              return {
                                ...prev,
                                sessionStaffTasks: [...prev.sessionStaffTasks, { staffName: member.name, foco1: '', foco2: '' }]
                              };
                            }
                          });
                        }}
                        className={cn(
                          "group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300",
                          isSelected 
                            ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100" 
                            : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="relative w-12 h-12 mb-2">
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                              <Users className="w-6 h-6 text-indigo-400" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-0.5 rounded-full shadow-lg scale-110">
                              <Check className="w-3 h-3 stroke-[4px]" />
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tight text-center leading-none mb-1",
                          isSelected ? "text-indigo-900" : "text-slate-600"
                        )}>
                          {member.name.split(' ')[0]}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</span>
                      </button>
                    );
                  })}
                </div>

                {formData.sessionStaffTasks.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.sessionStaffTasks.map((task, idx) => (
                        <div key={`${task.staffName}_${idx}`} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-[10px]">
                              {idx + 1}
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight">{task.staffName}</h5>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Definición de focos</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Foco 1</label>
                              <input
                                type="text"
                                value={task.foco1}
                                onChange={(e) => {
                                  const newTasks = [...formData.sessionStaffTasks];
                                  newTasks[idx] = { ...newTasks[idx], foco1: e.target.value };
                                  setFormData(p => ({ ...p, sessionStaffTasks: newTasks }));
                                }}
                                placeholder="Indica el primer foco..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Foco 2</label>
                              <input
                                type="text"
                                value={task.foco2}
                                onChange={(e) => {
                                  const newTasks = [...formData.sessionStaffTasks];
                                  newTasks[idx] = { ...newTasks[idx], foco2: e.target.value };
                                  setFormData(p => ({ ...p, sessionStaffTasks: newTasks }));
                                }}
                                placeholder="Indica el segundo foco..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSessionId(null);
                    resetForm();
                    setActiveTab('view');
                  }}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 font-extrabold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-500 text-white font-black text-xs rounded-xl shadow-md hover:bg-sky-600 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingSessionId ? 'Guardar Cambios' : 'Guardar Sesión de Entrenamiento'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* FULL SESSION DETAIL MODAL */}
      <AnimatePresence>
        {selectedSessionModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-6 text-white relative shrink-0">
                <button
                  onClick={() => setSelectedSessionModal(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 p-1.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full text-[10px] font-black uppercase">
                    Ficha de Sesión • {selectedTeam?.name}
                  </span>
                  <span className="text-slate-400 text-xs">|</span>
                  <span className="text-slate-300 text-xs font-bold">{selectedSessionModal.dayType}</span>
                </div>

                <h2 className="text-xl font-black">{selectedSessionModal.title}</h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    {selectedSessionModal.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-sky-400" />
                    {selectedSessionModal.durationTotalMin} minutos
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-rose-400" />
                    Intensidad: {selectedSessionModal.intensity}
                  </span>
                </div>

                <div className="absolute top-4 right-14 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSessionId(selectedSessionModal.id);
                      setFormData({
                        sessionNumber: selectedSessionModal.sessionNumber || '',
                        date: selectedSessionModal.date,
                        durationTotalMin: selectedSessionModal.durationTotalMin,
                        microcycle: selectedSessionModal.microcycle,
                        dayType: selectedSessionModal.dayType,
                        intensity: selectedSessionModal.intensity,
                        playerStatuses: selectedSessionModal.playerStatuses || {},
                        objectivesTactical: selectedSessionModal.objectivesTactical || '',
                        objectivesPhysical: selectedSessionModal.objectivesPhysical || '',
                        objectivesTechnical: selectedSessionModal.objectivesTechnical || '',
                        selectedMaterials: selectedSessionModal.materials || [],
                        notes: selectedSessionModal.notes || '',
                        tasks: selectedSessionModal.tasks || [],
                        filialPlayers: selectedSessionModal.filialPlayerNames || []
                      });
                      setSelectedSessionModal(null);
                      setActiveTab('create');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[10px] font-black uppercase transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(selectedSessionModal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-lg text-[10px] font-black text-rose-300 uppercase transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-xs flex-1">
                {/* Objectives Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedSessionModal.objectivesTactical && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Obj. Táctico</p>
                      <p className="font-bold text-slate-800 leading-relaxed">{selectedSessionModal.objectivesTactical}</p>
                    </div>
                  )}

                  {selectedSessionModal.objectivesPhysical && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Obj. Físico</p>
                      <p className="font-bold text-slate-800 leading-relaxed">{selectedSessionModal.objectivesPhysical}</p>
                    </div>
                  )}

                  {selectedSessionModal.objectivesTechnical && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Obj. Técnico</p>
                      <p className="font-bold text-slate-800 leading-relaxed">{selectedSessionModal.objectivesTechnical}</p>
                    </div>
                  )}
                </div>

                {/* Materials List */}
                {selectedSessionModal.materials && selectedSessionModal.materials.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 text-sky-500" />
                      Material Requerido:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSessionModal.materials.map((m, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exercise Tasks list */}
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-500" />
                    Ejercicios de la Sesión ({selectedSessionModal.tasks?.length || 0})
                  </h4>

                  <div className="space-y-3">
                    {selectedSessionModal.tasks?.map((t, idx) => (
                      <div key={t.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-[10px]">
                              {idx + 1}
                            </span>
                            <h5 className="font-black text-slate-900 text-sm">{t.title}</h5>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                          {/* Left Side: Info & Text */}
                          <div className="md:col-span-7 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded uppercase">
                                {t.phase}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                                {t.durationMin} min
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 font-medium border-y border-slate-100 py-2">
                              {t.coach && (
                                <p><strong className="text-slate-800 uppercase text-[9px]">Dirige:</strong> {t.coach}</p>
                              )}
                              {t.foco && (
                                <p><strong className="text-slate-800 uppercase text-[9px]">Foco:</strong> {t.foco}</p>
                              )}
                              {t.tipologia && (
                                <p><strong className="text-slate-800 uppercase text-[9px]">Tipología:</strong> {t.tipologia}</p>
                              )}
                            </div>

                            {t.description && (
                              <div className="text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <strong className="text-slate-900 block text-[10px] uppercase font-bold mb-1 border-b border-slate-50 pb-1">Descripción & Reglas:</strong>
                                <p className="text-xs whitespace-pre-line">{t.description}</p>
                              </div>
                            )}

                            {t.coachingPoints && (
                              <div className="text-sky-900 font-medium leading-relaxed bg-sky-50/70 p-3 rounded-xl border border-sky-100">
                                <strong className="text-sky-950 block text-[10px] uppercase font-bold mb-1 border-b border-sky-100/50 pb-1">Coaching Points:</strong>
                                <p className="text-xs">{t.coachingPoints}</p>
                              </div>
                            )}
                          </div>

                          {/* Right Side: Large Image Preview */}
                          <div className="md:col-span-5">
                            {t.image ? (
                              <div className="relative aspect-video w-full bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
                                <img 
                                  src={t.image} 
                                  alt={t.title} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                              </div>
                            ) : (
                              <div className="aspect-video w-full bg-slate-100 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Sin Imagen</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedSessionModal.notes && (
                  <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900">
                    <p className="text-[10px] font-black uppercase mb-0.5">Observaciones Adicionales:</p>
                    <p className="font-medium">{selectedSessionModal.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const sess = selectedSessionModal;
                      setSelectedSessionModal(null);
                      setSelectedOfficialSheetSession(sess);
                    }}
                    className="px-4 py-2 bg-slate-900 text-white font-black text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-sky-400" />
                    Abrir Ficha Técnica Oficial ATB
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Vista Simple
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const sess = selectedSessionModal;
                      setSelectedSessionModal(null);
                      handleEditSession(sess);
                    }}
                    className="px-4 py-2 bg-sky-500 text-white font-bold text-xs rounded-xl hover:bg-sky-600 transition-colors cursor-pointer"
                  >
                    Editar Sesión
                  </button>

                  <button
                    onClick={() => setSelectedSessionModal(null)}
                    className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFICIAL ATB TECHNICAL SESSION SHEET MODAL */}
      {selectedOfficialSheetSession && (
        <OfficialSessionSheetModal
          session={selectedOfficialSheetSession}
          team={selectedTeam}
          season={season}
          onClose={() => setSelectedOfficialSheetSession(null)}
        />
      )}

      {/* DELETE SESSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    ¿Eliminar Sesión de Entrenamiento?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar permanentemente la sesión{' '}
                    <strong className="text-slate-900 font-black">"{sessionToDelete.title}"</strong>? Esta acción no se puede deshacer y borrará la sesión de la base de datos.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(sessionToDelete.id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
