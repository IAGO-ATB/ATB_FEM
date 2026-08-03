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
  Shield, 
  Target, 
  Dumbbell, 
  Sparkles, 
  FileText, 
  AlertCircle,
  Award,
  ChevronDown,
  Plus,
  Users
} from 'lucide-react';
import { Team, TrainingSession, ExerciseTask, Player } from '../types';
import { cn } from '../lib/utils';
import OfficialSessionSheetModal from './OfficialSessionSheetModal';

const DEFAULT_SQUAD_NAMES = [
  'SANDRA', 'ANDRE', 'FATI', 'JOANA', 'HELENA', 'MARTA', 'ANTONELLA', 'GABI', 'NEUS', 
  'IXI', 'NADIA', 'CHLOE', 'MARINA', 'CORA', 'BLANCA', 'VÉLEZ', 'ADA', 'ROXANNE', 
  'ORFILA', 'JULIETA', 'ABI', 'LÓPEZ', 'CARMEN', 'PAULA'
];

export interface DetailedSquadPlayer {
  id: string;
  name: string;
  number?: number;
  positionCategory: 'PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS';
  image?: string;
}

const DEFAULT_SQUAD_DETAILED: DetailedSquadPlayer[] = [
  // PORTERAS
  { id: '1', name: 'SANDRA TORRES', number: 1, positionCategory: 'PORTERAS' },
  { id: '13', name: 'BLANCA NOGUERA', number: 13, positionCategory: 'PORTERAS' },

  // DEFENSORAS
  { id: '2', name: 'ANDREA ALCAIDE', number: 2, positionCategory: 'DEFENSORAS' },
  { id: '3', name: 'HELENA VIVES', number: 3, positionCategory: 'DEFENSORAS' },
  { id: '4', name: 'PAULA ROJAS', number: 4, positionCategory: 'DEFENSORAS' },
  { id: '5', name: 'ROXANNE BOLDUC', number: 5, positionCategory: 'DEFENSORAS' },
  { id: '12', name: 'MARINA CRESPO', number: 12, positionCategory: 'DEFENSORAS' },
  { id: '15', name: 'FÁTIMA TRAVERSARO', number: 15, positionCategory: 'DEFENSORAS' },
  { id: '17', name: 'MARTA VÉLEZ', number: 17, positionCategory: 'DEFENSORAS' },
  { id: '21', name: 'NEREA ORFILA', number: 21, positionCategory: 'DEFENSORAS' },
  { id: '24', name: 'JOANA VALCANERAS', number: 24, positionCategory: 'DEFENSORAS' },

  // CENTROCAMPISTAS
  { id: '6', name: 'IXI', number: 6, positionCategory: 'CENTROCAMPISTAS' },
  { id: '8', name: 'GABI', number: 8, positionCategory: 'CENTROCAMPISTAS' },
  { id: '10', name: 'NEUS', number: 10, positionCategory: 'CENTROCAMPISTAS' },
  { id: '14', name: 'CORA', number: 14, positionCategory: 'CENTROCAMPISTAS' },
  { id: '16', name: 'ANTONELLA', number: 16, positionCategory: 'CENTROCAMPISTAS' },
  { id: '20', name: 'JULIETA', number: 20, positionCategory: 'CENTROCAMPISTAS' },

  // DELANTERAS
  { id: '7', name: 'NADIA', number: 7, positionCategory: 'DELANTERAS' },
  { id: '9', name: 'CHLOE', number: 9, positionCategory: 'DELANTERAS' },
  { id: '11', name: 'ADA', number: 11, positionCategory: 'DELANTERAS' },
  { id: '18', name: 'ABI', number: 18, positionCategory: 'DELANTERAS' },
  { id: '19', name: 'LÓPEZ', number: 19, positionCategory: 'DELANTERAS' },
  { id: '22', name: 'CARMEN', number: 22, positionCategory: 'DELANTERAS' },
  { id: '23', name: 'PAULA', number: 23, positionCategory: 'DELANTERAS' },
];

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
  if (!teamId) return DEFAULT_SQUAD_DETAILED;
  const key = `app_players_${seasonStr || '2026/2027'}_${teamId}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed: Player[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, i) => {
          const rawName = p.nombre || p.name || `Jugadora ${p.number || i + 1}`;
          const num = (p.dorsal !== undefined && p.dorsal !== null) ? p.dorsal : p.number;
          const cat = normalizeCategory(p.demarcacion || p.position);
          return {
            id: p.id || `p_${i}`,
            name: rawName,
            number: num,
            positionCategory: cat,
            image: p.image
          };
        });
      }
    } catch (e) {}
  }
  return DEFAULT_SQUAD_DETAILED;
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
  'Vallas bajas', 'Muñecos barrera', 'Chinos / Setas', 'Cronómetro'
];

const PHASE_OPTIONS: ExerciseTask['phase'][] = [
  'Calentamiento',
  'Parte Principal',
  'Tarea Analítica',
  'Juego de Posición',
  'Partido / Global',
  'Vuelta a la Calma'
];

export default function SessionsView({ season, selectedTeam, teams, onSelectTeam }: SessionsViewProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('view');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedSessionModal, setSelectedSessionModal] = useState<TrainingSession | null>(null);
  const [selectedOfficialSheetSession, setSelectedOfficialSheetSession] = useState<TrainingSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for "Crear / Editar Sesión"
  const [formData, setFormData] = useState<{
    title: string;
    sessionNumber: number | string;
    date: string;
    durationTotalMin: number;
    microcycle: string;
    dayType: string;
    intensity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
    rpe: number;
    playerStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'>;
    objectivesTactical: string;
    objectivesPhysical: string;
    objectivesTechnical: string;
    selectedMaterials: string[];
    notes: string;
    tasks: ExerciseTask[];
  }>({
    title: '',
    sessionNumber: '',
    date: new Date().toISOString().split('T')[0],
    durationTotalMin: 90,
    microcycle: 'Microciclo 1',
    dayType: 'MD-3',
    intensity: 'Alta',
    rpe: 7,
    playerStatuses: {},
    objectivesTactical: '',
    objectivesPhysical: '',
    objectivesTechnical: '',
    selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
    notes: '',
    tasks: [
      {
        id: '1',
        title: 'Calentamiento Dinámico y Rondo 4v1',
        phase: 'Calentamiento',
        durationMin: 15,
        spaceSize: '15x15m',
        seriesReps: '3 series x 4 min',
        description: 'Movilidad articular activa seguido de rondo 4v1 a 1-2 toques. Cambio de defensor al perder balón.',
        coachingPoints: 'Orientación corporal, tensión en el pase, activación comunicativa.',
        materials: 'Petos, Conos, Balones'
      },
      {
        id: '2',
        title: 'Juego de Posición 6v6 + 3 Comodines',
        phase: 'Juego de Posición',
        durationMin: 25,
        spaceSize: '35x25m',
        seriesReps: '4 series x 5 min',
        description: 'Conservación de balón buscando tercer hombre para progresar a zona de finalización.',
        coachingPoints: 'Perfiles de recepción, amplitud y profundidad, ritmo de circulación.',
        materials: 'Petos 3 colores, Balones, Chinos'
      }
    ]
  });

  // Current Squad Players for selected team
  const squadPlayerNames = React.useMemo(() => {
    return getSquadPlayersForTeam(selectedTeam?.id, season);
  }, [selectedTeam?.id, season]);

  // Handle Player Availability Click Cycle (1 click = disponible, 2 clicks = comodin, 3 clicks = no_disponible)
  const handleTogglePlayerStatus = (pName: string) => {
    setFormData(prev => {
      const statuses = prev.playerStatuses || {};
      const current = statuses[pName] || 'disponible';
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
          [pName]: next
        }
      };
    });
  };

  // Load sessions from localStorage for selectedTeam + season
  useEffect(() => {
    if (!selectedTeam) return;
    const seasonStr = season || '2026/2027';
    const storageKey = `app_sessions_${seasonStr}_${selectedTeam.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed: TrainingSession[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
          return;
        }
      } catch (e) {
        console.error('Error al cargar sesiones:', e);
      }
    }

    // Default mock session if none exists yet for selected team
    const defaultMock: TrainingSession[] = [
      {
        id: 'mock-1',
        teamId: selectedTeam.id,
        season: seasonStr,
        title: `Sesión #1 - Salida de Balón y Presión Tras Pérdida`,
        sessionNumber: 1,
        date: new Date().toISOString().split('T')[0],
        durationTotalMin: 90,
        microcycle: 'Microciclo 12',
        dayType: 'MD-4',
        intensity: 'Alta',
        rpe: 8,
        objectivesTactical: 'Salida limpia desde iniciación y basculación defensiva tras pérdida.',
        objectivesPhysical: 'Resistencia a la alta intensidad (RSA) y aceleraciones cortas.',
        objectivesTechnical: 'Pasetenso de primera intención, controles orientados.',
        materials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales', 'Picas'],
        notes: 'Enfocar en la velocidad de reacción en los primeros 3 segundos tras perder la posesión.',
        created_at: new Date().toISOString(),
        tasks: [
          {
            id: 't1',
            title: 'Activación con Balón y Prevención',
            phase: 'Calentamiento',
            durationMin: 15,
            seriesReps: '1 serie',
            spaceSize: '20x20m',
            description: 'Circuitos de movilidad articular, estiramientos dinámicos y pases por parejas a diferentes distancias.',
            coachingPoints: 'Buena técnica de golpeo con ambas piernas.'
          },
          {
            id: 't2',
            title: 'Rondo de Transición 5v2 con Presión Inmediata',
            phase: 'Parte Principal',
            durationMin: 25,
            seriesReps: '4 series x 5 min',
            spaceSize: '18x18m',
            description: 'Al perder el balón los 5 atacantes deben apretar al instante antes de que los recuperadores conecten con la zona exterior.',
            coachingPoints: 'Cierre de líneas de pase centrales, intensidad de acoso.'
          },
          {
            id: 't3',
            title: 'Partido Aplicado 11v11 Condicionado',
            phase: 'Partido / Global',
            durationMin: 35,
            seriesReps: '2 partes x 15 min',
            spaceSize: 'Campo Completo',
            description: 'Salida de inicio obligatoria con portera. Gol tras recuperación en campo rival vale doble.',
            coachingPoints: 'Mantenimiento del bloque compacto.'
          },
          {
            id: 't4',
            title: 'Vuelta a la Calma y Regenerativo',
            phase: 'Vuelta a la Calma',
            durationMin: 15,
            seriesReps: '1 serie',
            spaceSize: 'Medio Campo',
            description: 'Trote suave regenerativo, estiramientos estáticos asistidos y rehidratación.',
            coachingPoints: 'Normalización cardíaca.'
          }
        ]
      }
    ];

    setSessions(defaultMock);
    localStorage.setItem(storageKey, JSON.stringify(defaultMock));
  }, [selectedTeam, season]);

  // Save Sessions Helper
  const saveSessionsToStorage = (updatedList: TrainingSession[]) => {
    if (!selectedTeam) return;
    const seasonStr = season || '2026/2027';
    const storageKey = `app_sessions_${seasonStr}_${selectedTeam.id}`;
    setSessions([...updatedList]);
    localStorage.setItem(storageKey, JSON.stringify(updatedList));
  };

  // Handle Create / Update Form Submit
  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    if (!formData.title.trim()) {
      alert('Por favor, introduce un título para la sesión.');
      return;
    }

    const seasonStr = season || '2026/2027';

    // Calculate player availability breakdowns
    const statuses = formData.playerStatuses || {};
    const availablePlayerNames = squadPlayerNames.filter(
      name => (statuses[name] || 'disponible') === 'disponible'
    );
    const wildcardPlayerNames = squadPlayerNames.filter(
      name => statuses[name] === 'comodin'
    );
    const unavailablePlayerNames = squadPlayerNames.filter(
      name => statuses[name] === 'no_disponible'
    );

    const numPlayers = wildcardPlayerNames.length > 0
      ? `${availablePlayerNames.length}+${wildcardPlayerNames.length}`
      : `${availablePlayerNames.length}`;

    const newSession: TrainingSession = {
      id: editingSessionId || `session_${Date.now()}`,
      teamId: selectedTeam.id,
      season: seasonStr,
      title: formData.title.trim(),
      sessionNumber: Number(formData.sessionNumber) || undefined,
      date: formData.date,
      durationTotalMin: Number(formData.durationTotalMin) || 90,
      microcycle: formData.microcycle,
      dayType: formData.dayType,
      intensity: formData.intensity,
      rpe: Number(formData.rpe),
      numPlayers,
      availablePlayerNames,
      wildcardPlayerNames,
      unavailablePlayerNames,
      playerStatuses: formData.playerStatuses,
      objectivesTactical: formData.objectivesTactical,
      objectivesPhysical: formData.objectivesPhysical,
      objectivesTechnical: formData.objectivesTechnical,
      materials: formData.selectedMaterials,
      tasks: formData.tasks,
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

    saveSessionsToStorage(updatedList);
    setEditingSessionId(null);
    resetForm();
    setActiveTab('view');

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resetForm = () => {
    const defaultStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'> = {};
    squadPlayerNames.forEach(name => {
      defaultStatuses[name] = 'disponible';
    });

    setFormData({
      title: '',
      sessionNumber: '',
      date: new Date().toISOString().split('T')[0],
      durationTotalMin: 90,
      microcycle: 'Microciclo 1',
      dayType: 'MD-3',
      intensity: 'Alta',
      rpe: 7,
      playerStatuses: defaultStatuses,
      objectivesTactical: '',
      objectivesPhysical: '',
      objectivesTechnical: '',
      selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
      notes: '',
      tasks: [
        {
          id: Date.now().toString(),
          title: 'Calentamiento Adaptado',
          phase: 'Calentamiento',
          durationMin: 15,
          seriesReps: '1 serie',
          spaceSize: '20x20m',
          description: 'Activación con balón y rueda de pases.',
          coachingPoints: 'Calidad de pase.'
        }
      ]
    });
  };

  // Add Exercise Task to Form
  const handleAddTask = () => {
    const newTask: ExerciseTask = {
      id: Date.now().toString(),
      title: `Ejercicio #${formData.tasks.length + 1}`,
      phase: 'Parte Principal',
      durationMin: 20,
      seriesReps: '3 series x 6 min',
      spaceSize: 'Medio Campo',
      description: '',
      coachingPoints: ''
    };
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  // Remove Task
  const handleRemoveTask = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }));
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
      squadPlayerNames.forEach(name => {
        if (unav.some(u => u.toUpperCase() === name.toUpperCase())) {
          resolvedStatuses[name] = 'no_disponible';
        } else if (wild.some(w => w.toUpperCase() === name.toUpperCase())) {
          resolvedStatuses[name] = 'comodin';
        } else {
          resolvedStatuses[name] = 'disponible';
        }
      });
    }

    setFormData({
      title: session.title,
      sessionNumber: session.sessionNumber || '',
      date: session.date,
      durationTotalMin: session.durationTotalMin,
      microcycle: session.microcycle || 'Microciclo 1',
      dayType: session.dayType || 'MD-3',
      intensity: session.intensity || 'Alta',
      rpe: session.rpe || 7,
      playerStatuses: resolvedStatuses,
      objectivesTactical: session.objectivesTactical || '',
      objectivesPhysical: session.objectivesPhysical || '',
      objectivesTechnical: session.objectivesTechnical || '',
      selectedMaterials: session.materials || [],
      notes: session.notes || '',
      tasks: session.tasks || []
    });
    setActiveTab('create');
  };

  // Delete Session
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    saveSessionsToStorage(updated);
    if (selectedSessionModal?.id === id) setSelectedSessionModal(null);
    setSuccessMessage('Sesión eliminada correctamente');
    setTimeout(() => setSuccessMessage(null), 3000);
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
      <div className="bg-[#0f172a] rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow/gradient */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-sky-500/10 to-transparent opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-4 py-1 bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-black rounded-full uppercase tracking-[0.1em] shadow-sm">
                PLANIFICACIÓN METODOLÓGICA
              </span>
              <span className="text-[12px] font-bold text-slate-400 tracking-tight">| Temporada {season || '2026/2027'}</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-4">
                <div className="p-2 bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20">
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>
                SESIONES DE ENTRENAMIENTO
              </h1>
              <p className="text-slate-400 text-base font-medium leading-relaxed max-w-2xl">
                Diseño de tareas, control de carga RPE, objetivos táctico-físicos y archivo histórico de sesiones. 
                El registro es completamente independiente para cada plantilla.
              </p>
            </div>
          </div>

          {selectedTeam && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl flex items-center gap-5 min-w-[300px] border-l-4 border-l-sky-500 transition-all hover:bg-slate-900/80">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white font-black shadow-2xl",
                TEAM_CONFIG[selectedTeam.id]?.badgeBg || 'bg-slate-500'
              )}>
                {TEAM_CONFIG[selectedTeam.id]?.code || selectedTeam.name.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Plantilla Seleccionada</p>
                <p className="text-xl font-black text-white tracking-tight uppercase">{selectedTeam.name}</p>
                <p className="text-[12px] font-black text-sky-400 uppercase tracking-tighter flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                  {sessions.length} Sesiones Registradas
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Team Selector Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Shield className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                1. Selecciona la Plantilla (Equipo)
              </label>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Gestiona la planificación específica de cada grupo</p>
            </div>
          </div>
          
          <div className="relative min-w-[280px]">
            <select
              value={selectedTeam?.id || ''}
              onChange={(e) => {
                const team = teams.find(t => t.id === e.target.value);
                if (team) onSelectTeam(team);
              }}
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none appearance-none cursor-pointer shadow-sm hover:border-slate-300 transition-all"
            >
              <option value="" disabled>— Seleccionar Plantilla —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                          {session.rpe && (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black text-[10px]">
                              RPE {session.rpe}/10
                            </span>
                          )}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
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
                    {editingSessionId ? 'Editar Sesión de Entrenamiento' : `Nueva Sesión - ${selectedTeam.name}`}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Template loader helper
                      setFormData({
                        title: 'Sesión #15 - Estructurada MD-3 (Fuerza / Espacios Reducidos)',
                        sessionNumber: 15,
                        date: new Date().toISOString().split('T')[0],
                        durationTotalMin: 90,
                        microcycle: 'Microciclo 15',
                        dayType: 'MD-3',
                        intensity: 'Alta',
                        rpe: 8,
                        objectivesTactical: '',
                        objectivesPhysical: '',
                        objectivesTechnical: '',
                        selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales', 'Mini-porterías'],
                        notes: '',
                        tasks: []
                      });
                    }}
                    className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cargar Plantilla Tipo MD-3
                  </button>
                </div>
              </div>

              {/* Section 1: Datos Generales */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  1. Datos Generales de la Sesión
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Sesión *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Sesión (Opcional)</label>
                    <input
                      type="number"
                      value={formData.sessionNumber}
                      onChange={e => setFormData(p => ({ ...p, sessionNumber: e.target.value }))}
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duración Total (minutos)</label>
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Carga RPE Objetivo (1 a 10): <span className="text-sky-600 font-extrabold">{formData.rpe}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.rpe}
                      onChange={e => setFormData(p => ({ ...p, rpe: Number(e.target.value) }))}
                      className="w-full accent-sky-500 cursor-pointer mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Disponibilidad de Jugadoras de la Plantilla */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-500" />
                      2. Disponibilidad de Jugadoras de la Plantilla ({selectedTeam?.name})
                    </h3>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const allDisp: Record<string, 'disponible'> = {};
                        squadPlayerNames.forEach(n => { allDisp[n] = 'disponible'; });
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
                        squadPlayerNames.forEach(n => { allCom[n] = 'comodin'; });
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
                        squadPlayerNames.forEach(n => { allNo[n] = 'no_disponible'; });
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
                  const cAvailable = squadPlayerNames.filter(n => (currentStatuses[n] || 'disponible') === 'disponible').length;
                  const cWildcard = squadPlayerNames.filter(n => currentStatuses[n] === 'comodin').length;
                  const cUnavailable = squadPlayerNames.filter(n => currentStatuses[n] === 'no_disponible').length;
                  const totalStr = cWildcard > 0 ? `${cAvailable}+${cWildcard}` : `${cAvailable}`;

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

                      <div className="ml-auto text-slate-500 text-[11px] font-bold">
                        Ficha Técnica Nº Jugadoras: <strong className="text-slate-900 text-xs font-black">{totalStr}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Player Grid Grouped by Position Categories */}
                {(() => {
                  const detailedPlayers = getDetailedSquadPlayersForTeam(selectedTeam?.id, season);
                  const CATEGORIES: ('PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS')[] = [
                    'PORTERAS', 'DEFENSORAS', 'CENTROCAMPISTAS', 'DELANTERAS', 'OTRAS'
                  ];

                  return (
                    <div className="space-y-6 pt-2">
                      {CATEGORIES.map(cat => {
                        const catPlayers = detailedPlayers.filter(p => p.positionCategory === cat);
                        if (catPlayers.length === 0) return null;

                        return (
                          <div key={cat} className="space-y-3">
                            {/* Position Category Divider */}
                            <div className="relative flex py-1 items-center">
                              <div className="flex-grow border-t border-slate-200"></div>
                              <span className="shrink-0 mx-4 text-[11px] font-black uppercase text-slate-400 tracking-[0.25em]">
                                {cat}
                              </span>
                              <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            {/* Player circular avatars grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-5 gap-x-3 items-start justify-items-center">
                              {catPlayers.map((player, idx) => {
                                const currentStatuses = formData.playerStatuses || {};
                                const status = currentStatuses[player.name] || 'disponible';

                                return (
                                  <button
                                    key={`${player.name}_${idx}`}
                                    type="button"
                                    onClick={() => handleTogglePlayerStatus(player.name)}
                                    className="group flex flex-col items-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
                                  >
                                    <div className="relative">
                                      {/* Top-left dorsal badge */}
                                      {player.number !== undefined && (
                                        <div className="absolute -top-1 -left-1 z-20 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-xs">
                                          {player.number}
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
                                        status === 'disponible' && "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20",
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
                                            status === 'no_disponible' ? "text-red-300" : "text-slate-300"
                                          )} />
                                        )}
                                      </div>
                                    </div>

                                    {/* Player Name */}
                                    <span className={cn(
                                      "mt-1.5 text-[10px] font-black uppercase text-center tracking-tight leading-tight max-w-[85px] truncate",
                                      status === 'disponible' && "text-slate-800",
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
              </div>

              {/* Section 3: Material e Infraestructura Necesaria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-sky-500" />
                  3. Material e Infraestructura Necesaria
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
                    Intensidad: {selectedSessionModal.intensity} (RPE {selectedSessionModal.rpe}/10)
                  </span>
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

                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded uppercase">
                              {t.phase}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                              {t.durationMin} min
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 font-medium pt-1">
                          {t.spaceSize && (
                            <p><strong className="text-slate-800">Espacio:</strong> {t.spaceSize}</p>
                          )}
                          {t.seriesReps && (
                            <p><strong className="text-slate-800">Series:</strong> {t.seriesReps}</p>
                          )}
                        </div>

                        {t.description && (
                          <div className="text-slate-700 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                            <strong className="text-slate-900 block text-[10px] uppercase font-bold mb-0.5">Descripción & Reglas:</strong>
                            {t.description}
                          </div>
                        )}

                        {t.coachingPoints && (
                          <div className="text-sky-900 font-medium leading-relaxed bg-sky-50/70 p-2.5 rounded-lg border border-sky-100">
                            <strong className="text-sky-950 block text-[10px] uppercase font-bold mb-0.5">Coaching Points:</strong>
                            {t.coachingPoints}
                          </div>
                        )}
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
    </div>
  );
}
