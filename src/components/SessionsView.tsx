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
  ChevronUp,
  Folder,
  FolderOpen,
  Plus,
  Users,
  LayoutList,
  ImagePlus,
  ImageIcon,
  Crop,
  BarChart3,
  Download,
  Video,
  ExternalLink
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
import { Team, TrainingSession, ExerciseTask, Player, SessionStaffTask, VideoNote } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import ImageEditorModal from './ImageEditorModal';
import OfficialSessionSheetModal from './OfficialSessionSheetModal';
import TipologiaModal from './TipologiaModal';

export interface DetailedSquadPlayer {
  id: string;
  name: string;
  number?: number;
  positionCategory: 'PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS';
  image?: string;
}

const normalizeCategory = (pos?: string): 'PORTERAS' | 'DEFENSORAS' | 'CENTROCAMPISTAS' | 'DELANTERAS' | 'OTRAS' => {
  if (!pos) return 'OTRAS';
  const p = pos.toLowerCase();
  if (p.includes('port') || p.includes('gk')) return 'PORTERAS';
  if (p.includes('def') || p.includes('df') || p.includes('lat') || p.includes('central')) return 'DEFENSORAS';
  if (p.includes('med') || p.includes('centr') || p.includes('mc') || p.includes('pivote')) return 'CENTROCAMPISTAS';
  if (p.includes('del') || p.includes('atac') || p.includes('ext') || p.includes('dc')) return 'DELANTERAS';
  return 'OTRAS';
};

const DEFAULT_SQUAD_MAP: Record<string, DetailedSquadPlayer[]> = {
  FEMENINO_A: [
    { id: 'pa_1', name: 'Laura Martínez', number: 1, positionCategory: 'PORTERAS' },
    { id: 'pa_13', name: 'Blanca Moreno', number: 13, positionCategory: 'PORTERAS' },
    { id: 'pa_2', name: 'Lucía Fernández', number: 2, positionCategory: 'DEFENSORAS' },
    { id: 'pa_3', name: 'Marta Pastor', number: 3, positionCategory: 'DEFENSORAS' },
    { id: 'pa_4', name: 'Carla Rodríguez', number: 4, positionCategory: 'DEFENSORAS' },
    { id: 'pa_5', name: 'Andrea Alcaide', number: 5, positionCategory: 'DEFENSORAS' },
    { id: 'pa_12', name: 'Sonia Ramírez', number: 12, positionCategory: 'DEFENSORAS' },
    { id: 'pa_15', name: 'Nuria Pomer', number: 15, positionCategory: 'DEFENSORAS' },
    { id: 'pa_6', name: 'Ruth Álvarez', number: 6, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pa_8', name: 'Aina Torres', number: 8, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pa_10', name: 'Elena Gómez', number: 10, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pa_14', name: 'Marina Bestard', number: 14, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pa_16', name: 'Paula Vitoria', number: 16, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pa_7', name: 'Paula Serra', number: 7, positionCategory: 'DELANTERAS' },
    { id: 'pa_9', name: 'Sofía Ruiz', number: 9, positionCategory: 'DELANTERAS' },
    { id: 'pa_11', name: 'Alba Coll', number: 11, positionCategory: 'DELANTERAS' },
    { id: 'pa_17', name: 'Maria Heras', number: 17, positionCategory: 'DELANTERAS' },
    { id: 'pa_19', name: 'Joana Roig', number: 19, positionCategory: 'DELANTERAS' }
  ],
  FEMENINO_B: [
    { id: 'pb_1', name: 'Catalina Fullana', number: 1, positionCategory: 'PORTERAS' },
    { id: 'pb_13', name: 'Nerea López', number: 13, positionCategory: 'PORTERAS' },
    { id: 'pb_2', name: 'Ainhoa García', number: 2, positionCategory: 'DEFENSORAS' },
    { id: 'pb_3', name: 'Maria Bauzà', number: 3, positionCategory: 'DEFENSORAS' },
    { id: 'pb_4', name: 'Paula Vich', number: 4, positionCategory: 'DEFENSORAS' },
    { id: 'pb_5', name: 'Emma Riera', number: 5, positionCategory: 'DEFENSORAS' },
    { id: 'pb_12', name: 'Mar Mairata', number: 12, positionCategory: 'DEFENSORAS' },
    { id: 'pb_6', name: 'Mireia Rotger', number: 6, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pb_8', name: 'Julia Bestard', number: 8, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pb_10', name: 'Neus Pujol', number: 10, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pb_14', name: 'Marta Pons', number: 14, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pb_7', name: 'Laura Bennasar', number: 7, positionCategory: 'DELANTERAS' },
    { id: 'pb_9', name: 'Carla Juan', number: 9, positionCategory: 'DELANTERAS' },
    { id: 'pb_11', name: 'Cristina Coll', number: 11, positionCategory: 'DELANTERAS' },
    { id: 'pb_17', name: 'Aina Font', number: 17, positionCategory: 'DELANTERAS' }
  ],
  FEMENINO_C: [
    { id: 'pc_1', name: 'Paula Salom', number: 1, positionCategory: 'PORTERAS' },
    { id: 'pc_2', name: 'Clara Oliver', number: 2, positionCategory: 'DEFENSORAS' },
    { id: 'pc_3', name: 'Nuria Servera', number: 3, positionCategory: 'DEFENSORAS' },
    { id: 'pc_4', name: 'Isabel Vidal', number: 4, positionCategory: 'DEFENSORAS' },
    { id: 'pc_5', name: 'Sara Munar', number: 5, positionCategory: 'DEFENSORAS' },
    { id: 'pc_6', name: 'Laura Rosselló', number: 6, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pc_8', name: 'Aina Lladó', number: 8, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pc_10', name: 'Marta Company', number: 10, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pc_7', name: 'Maria Capó', number: 7, positionCategory: 'DELANTERAS' },
    { id: 'pc_9', name: 'Carmen Palmer', number: 9, positionCategory: 'DELANTERAS' },
    { id: 'pc_11', name: 'Lucia Barceló', number: 11, positionCategory: 'DELANTERAS' }
  ],
  FEMENINO_D: [
    { id: 'pd_1', name: 'Neus Bennasar', number: 1, positionCategory: 'PORTERAS' },
    { id: 'pd_2', name: 'Alba Riera', number: 2, positionCategory: 'DEFENSORAS' },
    { id: 'pd_3', name: 'Maria Oliver', number: 3, positionCategory: 'DEFENSORAS' },
    { id: 'pd_4', name: 'Carla Bauzà', number: 4, positionCategory: 'DEFENSORAS' },
    { id: 'pd_5', name: 'Laura Font', number: 5, positionCategory: 'DEFENSORAS' },
    { id: 'pd_6', name: 'Sofia Rotger', number: 6, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pd_8', name: 'Marta Lladó', number: 8, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pd_10', name: 'Paula Bestard', number: 10, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pd_7', name: 'Aina Vich', number: 7, positionCategory: 'DELANTERAS' },
    { id: 'pd_9', name: 'Julia Coll', number: 9, positionCategory: 'DELANTERAS' },
    { id: 'pd_11', name: 'Clara Fullana', number: 11, positionCategory: 'DELANTERAS' }
  ],
  FEMENINO_E: [
    { id: 'pe_1', name: 'Marina Salom', number: 1, positionCategory: 'PORTERAS' },
    { id: 'pe_2', name: 'Ainhoa Vidal', number: 2, positionCategory: 'DEFENSORAS' },
    { id: 'pe_3', name: 'Laura Servera', number: 3, positionCategory: 'DEFENSORAS' },
    { id: 'pe_4', name: 'Sara Oliver', number: 4, positionCategory: 'DEFENSORAS' },
    { id: 'pe_6', name: 'Paula Rosselló', number: 6, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pe_8', name: 'Maria Lladó', number: 8, positionCategory: 'CENTROCAMPISTAS' },
    { id: 'pe_7', name: 'Carla Palmer', number: 7, positionCategory: 'DELANTERAS' },
    { id: 'pe_9', name: 'Neus Barceló', number: 9, positionCategory: 'DELANTERAS' }
  ]
};

const getDetailedSquadPlayersForTeam = (
  teamId?: string, 
  seasonStr?: string, 
  dbPlayersMap?: Record<string, DetailedSquadPlayer[]>,
  teamsList?: Team[]
): DetailedSquadPlayer[] => {
  if (!teamId) return DEFAULT_SQUAD_MAP['FEMENINO_A'] || [];

  if (dbPlayersMap && Object.keys(dbPlayersMap).length > 0) {
    // 1. Direct match
    if (dbPlayersMap[teamId] && dbPlayersMap[teamId].length > 0) {
      return dbPlayersMap[teamId];
    }

    // 2. Case-insensitive key match
    const upperId = teamId.toUpperCase();
    const caseMatchKey = Object.keys(dbPlayersMap).find(k => k.toUpperCase() === upperId);
    if (caseMatchKey && dbPlayersMap[caseMatchKey].length > 0) {
      return dbPlayersMap[caseMatchKey];
    }

    // 3. Match via teamsList
    if (teamsList && teamsList.length > 0) {
      const teamObj = teamsList.find(t => 
        t.id === teamId || 
        t.id.toUpperCase() === upperId ||
        t.name.toUpperCase().includes(upperId) ||
        upperId.includes(t.id.toUpperCase())
      );
      if (teamObj) {
        const teamObjKeys = [teamObj.id, teamObj.name, teamObj.category].filter(Boolean);
        for (const tok of teamObjKeys) {
          const matchedK = Object.keys(dbPlayersMap).find(k => 
            k.toUpperCase() === tok!.toUpperCase() || 
            tok!.toUpperCase().includes(k.toUpperCase()) || 
            k.toUpperCase().includes(tok!.toUpperCase())
          );
          if (matchedK && dbPlayersMap[matchedK].length > 0) {
            return dbPlayersMap[matchedK];
          }
        }
      }
    }

    // 4. Substring / code matching (e.g. key ends with '_B' or contains 'FEMENINO_B' or 'FEMENINO B')
    const codeMatchKey = Object.keys(dbPlayersMap).find(k => {
      const kU = k.toUpperCase();
      if (upperId.includes('FEMENINO_B') || upperId.includes('FEMENINO B') || upperId.endsWith('_B') || upperId === 'B') {
        return kU.includes('FEMENINO_B') || kU.includes('FEMENINO B') || kU.endsWith('_B') || kU.endsWith(' B');
      }
      if (upperId.includes('FEMENINO_A') || upperId.includes('FEMENINO A') || upperId.endsWith('_A') || upperId === 'A') {
        return kU.includes('FEMENINO_A') || kU.includes('FEMENINO A') || kU.endsWith('_A') || kU.endsWith(' A');
      }
      if (upperId.includes('FEMENINO_C') || upperId.includes('FEMENINO C') || upperId.endsWith('_C') || upperId === 'C') {
        return kU.includes('FEMENINO_C') || kU.includes('FEMENINO C') || kU.endsWith('_C') || kU.endsWith(' C');
      }
      if (upperId.includes('FEMENINO_D') || upperId.includes('FEMENINO D') || upperId.endsWith('_D') || upperId === 'D') {
        return kU.includes('FEMENINO_D') || kU.includes('FEMENINO D') || kU.endsWith('_D') || kU.endsWith(' D');
      }
      if (upperId.includes('FEMENINO_E') || upperId.includes('FEMENINO E') || upperId.endsWith('_E') || upperId === 'E') {
        return kU.includes('FEMENINO_E') || kU.includes('FEMENINO E') || kU.endsWith('_E') || kU.endsWith(' E');
      }
      return false;
    });
    if (codeMatchKey && dbPlayersMap[codeMatchKey].length > 0) {
      return dbPlayersMap[codeMatchKey];
    }
  }

  // 5. Fallback to DEFAULT_SQUAD_MAP
  if (DEFAULT_SQUAD_MAP[teamId]) {
    return DEFAULT_SQUAD_MAP[teamId];
  }
  const upperId = teamId.toUpperCase();
  const matchedDefaultKey = Object.keys(DEFAULT_SQUAD_MAP).find(k => 
    k.toUpperCase() === upperId || 
    k.toUpperCase().includes(upperId) || 
    upperId.includes(k.toUpperCase())
  );
  if (matchedDefaultKey) {
    return DEFAULT_SQUAD_MAP[matchedDefaultKey];
  }

  return DEFAULT_SQUAD_MAP['FEMENINO_A'] || [];
};

const getSquadPlayersForTeam = (
  teamId?: string, 
  seasonStr?: string, 
  dbPlayersMap?: Record<string, DetailedSquadPlayer[]>,
  teamsList?: Team[]
): string[] => {
  const detailed = getDetailedSquadPlayersForTeam(teamId, seasonStr, dbPlayersMap, teamsList);
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

const FASE_OPTIONS = ['ATACAR', 'DEFENDER', 'TRANSICIÓN DEFENSA-ATAQUE', 'TRANSICIÓN ATAQUE-DEFENSA', '-'];
const CONTEXTO_OPTIONS = [
  'INICIO-REINICIO', 
  'GESTIÓN DE BALÓN + PROGRESIÓN', 
  'GESTIÓN DE LA RECUPERCIÓN', 
  'ATAQUE DEL ÁREA (CORRIENDO/ESTÁTICA)', 
  'PRESS ANTE INICIOS Y REINICIOS', 
  'DEFENSA DE LA PROGRESIÓN (BLOQUE)', 
  'GESTIÓN DE LA PERDIDA', 
  'DEFENSA DE ÁREA (CORRIENDO/ESTÁTICA)'
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
  const [showFilialSelector, setShowFilialSelector] = useState<boolean>(false);

  // Reset filial search when team changes to ensure valid selection of created teams (excluding main team)
  useEffect(() => {
    if (!selectedTeam) return;
    const avail = (teams && teams.length > 0)
      ? teams
      : [
          { id: 'FEMENINO_B', name: 'FEMENINO B' },
          { id: 'FEMENINO_C', name: 'FEMENINO C' },
          { id: 'FEMENINO_D', name: 'FEMENINO D' },
          { id: 'FEMENINO_E', name: 'FEMENINO E' },
        ];
    const otherTeam = avail.find(t => t.id !== selectedTeam.id && t.name?.toUpperCase() !== selectedTeam.name?.toUpperCase());
    if (otherTeam) {
      setFilialTeamSearch(otherTeam.id);
    }
  }, [selectedTeam?.id, selectedTeam?.name, teams]);
  const [filialPlayerSearchQuery, setFilialPlayerSearchQuery] = useState('');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedSessionModal, setSelectedSessionModal] = useState<TrainingSession | null>(null);
  const [selectedOfficialSheetSession, setSelectedOfficialSheetSession] = useState<TrainingSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<TrainingSession | null>(null);
  const [isTipologiaModalOpen, setIsTipologiaModalOpen] = useState(false);
  const [openMicrocycles, setOpenMicrocycles] = useState<Record<number, boolean>>({});

  const isSessionInMicrocycle = (session: TrainingSession, mcNum: number): boolean => {
    if (!session.microcycle) {
      return mcNum === 1;
    }
    const raw = session.microcycle.toUpperCase().trim();
    if (
      raw === `MICROCICLO ${mcNum}` ||
      raw === `MICROCICLO${mcNum}` ||
      raw === `SEMANA ${mcNum}` ||
      raw === `SEMANA${mcNum}` ||
      raw === `MC ${mcNum}` ||
      raw === `MC${mcNum}` ||
      raw === `${mcNum}`
    ) {
      return true;
    }
    const match = raw.match(/\d+/);
    if (match && parseInt(match[0], 10) === mcNum) {
      return true;
    }
    return false;
  };

  const toggleMicrocycle = (mcNum: number, defaultOpen: boolean) => {
    setOpenMicrocycles(prev => {
      const currentState = prev[mcNum] !== undefined ? prev[mcNum] : defaultOpen;
      return {
        ...prev,
        [mcNum]: !currentState
      };
    });
  };

  const isMicrocycleOpen = (mcNum: number, hasSessions: boolean) => {
    if (openMicrocycles[mcNum] !== undefined) {
      return openMicrocycles[mcNum];
    }
    return hasSessions || mcNum === 1;
  };
  const ensureProtocol = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.length === 11 && !trimmed.includes('.') && !trimmed.includes('/')) {
      return `https://www.youtube.com/watch?v=${trimmed}`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

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
    videoUrl: string;
    videoNotes: VideoNote[];
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
    videoUrl: '',
    videoNotes: [],
    playerStatuses: {},
    objectivesTactical: '',
    objectivesPhysical: '',
    objectivesTechnical: '',
    selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
    notes: '',
    tasks: [
      { id: 't1', title: '', phase: 'Calentamiento', durationMin: 15, description: '', coach: '', foco: 'MIXTO', tipologia: 'LÚDICO', fases: [], contextos: [] },
      { id: 't2', title: '', phase: 'Tarea 1', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'RONDOS', fases: [], contextos: [] },
      { id: 't3', title: '', phase: 'Tarea 2', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'JUEGO DE POSICIÓN', fases: [], contextos: [] },
      { id: 't4', title: '', phase: 'Tarea 3', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'PARTIDO CONDICIONADO', fases: [], contextos: [] }
    ],
    filialPlayers: [],
    sessionStaffTasks: []
  });

  // State to store database players grouped by team_id
  const [dbPlayersByTeam, setDbPlayersByTeam] = useState<Record<string, DetailedSquadPlayer[]>>({});

  // Fetch players from Supabase for all teams
  useEffect(() => {
    async function fetchPlayersFromDb() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('number', { ascending: true });

        if (!error && data && data.length > 0) {
          const grouped: Record<string, DetailedSquadPlayer[]> = {};
          data.forEach((p: any) => {
            const tId = p.team_id || p.teamid || 'FEMENINO_A';
            if (!grouped[tId]) grouped[tId] = [];

            const rawName = p.name || `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugadora';
            const num = (p.number !== undefined && p.number !== null) ? p.number : p.dorsal;
            const pos = p.position || p.demarcacion || p.positionCategory;
            const cat = normalizeCategory(pos);

            grouped[tId].push({
              id: String(p.id),
              name: rawName,
              number: num,
              positionCategory: cat,
              image: p.image
            });
          });

          setDbPlayersByTeam(grouped);
        }
      } catch (err) {
        console.error('Error fetching players from Supabase in SessionsView:', err);
      }
    }

    fetchPlayersFromDb();
  }, []);

  // Current Squad Players for selected team (Detailed)
  const squadPlayers = React.useMemo(() => {
    return getDetailedSquadPlayersForTeam(selectedTeam?.id, season, dbPlayersByTeam);
  }, [selectedTeam?.id, season, dbPlayersByTeam]);

  // Default all players in squadPlayers to 'disponible' when team or squadPlayers change
  useEffect(() => {
    if (squadPlayers.length > 0) {
      setFormData(prev => {
        const defaultStatuses: Record<string, 'disponible' | 'comodin' | 'no_disponible'> = {};
        squadPlayers.forEach(p => {
          defaultStatuses[p.id] = 'disponible';
        });

        // Merge with existing if any, but ensure all current squad players have at least 'disponible'
        const existing = prev.playerStatuses || {};
        const merged: Record<string, 'disponible' | 'comodin' | 'no_disponible'> = {};
        
        squadPlayers.forEach(p => {
          merged[p.id] = existing[p.id] || 'disponible';
        });

        // Retain statuses of filial players
        prev.filialPlayers.forEach(fId => {
          if (existing[fId]) {
            merged[fId] = existing[fId];
          }
        });

        return {
          ...prev,
          playerStatuses: merged
        };
      });
    }
  }, [selectedTeam?.id, squadPlayers]);

  // Default filial team search depending on selected main team
  useEffect(() => {
    const tId = selectedTeam?.id || '';
    if (tId === 'FEMENINO_A') setFilialTeamSearch('FEMENINO_B');
    else if (tId === 'FEMENINO_B') setFilialTeamSearch('FEMENINO_C');
    else if (tId === 'FEMENINO_C') setFilialTeamSearch('FEMENINO_D');
    else if (tId === 'FEMENINO_D') setFilialTeamSearch('FEMENINO_E');
  }, [selectedTeam?.id]);

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

  // Load sessions from Supabase & Firestore for selectedTeam + season
  useEffect(() => {
    async function fetchSessions() {
      if (!selectedTeam) return;
      setIsLoading(true);
      try {
        const seasonStr = season || '2026/2027';
        let combinedMap = new Map<string, TrainingSession>();

        // 1. Fetch from Supabase
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('sessions')
              .select('*')
              .eq('team_id', selectedTeam.id)
              .eq('season', seasonStr)
              .order('date', { ascending: false })
              .limit(100);

            if (error) {
              console.warn('Supabase fetch notice:', error.message);
            } else if (data) {
              data.forEach((d: any) => {
                let vNotes = d.video_notes || d.videoNotes || [];
                if ((!vNotes || vNotes.length === 0) && typeof d.notes === 'string' && d.notes.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(d.notes);
                    if (parsed && Array.isArray(parsed.videoNotes)) {
                      vNotes = parsed.videoNotes;
                    }
                  } catch (e) {}
                }

                const sObj: TrainingSession = {
                  ...d,
                  id: String(d.id),
                  teamId: d.team_id || d.teamId,
                  sessionNumber: d.session_number || d.sessionNumber,
                  durationTotalMin: d.duration_min !== undefined ? d.duration_min : d.durationTotalMin,
                  videoUrl: d.video_url || d.videoUrl,
                  videoNotes: vNotes,
                  numPlayers: d.num_players || d.numPlayers,
                  playerStatuses: d.player_statuses || d.playerStatuses,
                  objectivesTactical: d.obj_tactical || d.objectivesTactical,
                  objectivesPhysical: d.obj_physical || d.objectivesPhysical,
                  objectivesTechnical: d.obj_technical || d.objectivesTechnical,
                  sessionStaffTasks: d.staff_tasks || d.sessionStaffTasks
                };
                combinedMap.set(String(sObj.id), sObj);
              });
            }
          } catch (sbErr) {
            console.warn('Supabase fetch exception:', sbErr);
          }
        }

        // 2. Fetch from Firestore for universal cross-user cloud sync
        try {
          const snap = await getDocs(collection(db, 'sessions'));
          snap.forEach(docSnap => {
            const d = docSnap.data() as any;
            if (d && (d.teamId === selectedTeam.id || d.team_id === selectedTeam.id) && (!d.season || d.season === seasonStr)) {
              const sId = String(d.id || docSnap.id);
              const existing = combinedMap.get(sId);
              const merged: TrainingSession = {
                ...(existing || {}),
                ...d,
                id: sId,
                teamId: d.teamId || d.team_id,
                videoNotes: d.videoNotes || d.video_notes || existing?.videoNotes || []
              };
              combinedMap.set(sId, merged);
            }
          });
        } catch (fsErr) {
          console.warn('Firestore fetch notice:', fsErr);
        }

        const sortedSessions = Array.from(combinedMap.values()).sort((a, b) => {
          return new Date(b.date || '').getTime() - new Date(a.date || '').getTime();
        });

        setSessions(sortedSessions);
      } catch (e) {
        console.error('Error exception fetching sessions:', e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessions();
  }, [selectedTeam?.id, season, supabase]);

  // Save Session Helper with resilient multi-layer persistence (Firestore + Supabase + Cache)
  const syncSessionToSupabase = async (updatedList: TrainingSession[], lastSession?: TrainingSession) => {
    if (!selectedTeam) return;
    
    // Deduplicate and update local state for immediate feedback
    const uniqueList = Array.from(new Map(updatedList.map(s => [String(s.id), s])).values());
    setSessions(uniqueList);

    if (lastSession) {
      const sessionIdStr = String(lastSession.id);

      // 1. Primary Cloud Storage: Firestore (Full object persistence with no schema lock)
      try {
        await setDoc(doc(db, 'sessions', sessionIdStr), {
          ...lastSession,
          id: sessionIdStr,
          teamId: lastSession.teamId,
          season: lastSession.season,
          videoNotes: lastSession.videoNotes || [],
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Session synced to Firestore:', sessionIdStr);
      } catch (fsErr) {
        console.warn('Firestore sync warning:', fsErr);
      }

      // 2. Local cache backup
      try {
        localStorage.setItem(`session_${sessionIdStr}`, JSON.stringify(lastSession));
      } catch (e) {}

      // 3. Supabase Relational Sync with adaptive column fallback
      if (supabase) {
        try {
          console.log('🚀 Supabase Sync Start:', sessionIdStr);
          
          const sessionToSave: any = {
            id: sessionIdStr,
            team_id: lastSession.teamId,
            season: lastSession.season,
            title: lastSession.title,
            session_number: lastSession.sessionNumber,
            date: lastSession.date,
            duration_min: lastSession.durationTotalMin,
            microcycle: lastSession.microcycle,
            day_type: lastSession.dayType,
            intensity: lastSession.intensity,
            video_url: lastSession.videoUrl,
            video_notes: lastSession.videoNotes || [],
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
            // Adaptive retry: If video_notes or another column is missing in Supabase schema cache (PGRST204)
            if (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column')) {
              console.warn('⚠️ Supabase column missing in schema cache, retrying with safe payload...', error.message);
              
              const safeSessionToSave = { ...sessionToSave };
              delete safeSessionToSave.video_notes;

              // Check if error explicitly mentions a specific column
              const match = error.message.match(/Could not find the '([^']+)' column/);
              if (match && match[1]) {
                delete safeSessionToSave[match[1]];
              }

              const retryRes = await supabase
                .from('sessions')
                .upsert([safeSessionToSave], { onConflict: 'id' })
                .select();

              if (retryRes.error) {
                console.warn('Supabase retry notice:', retryRes.error.message);
              } else {
                console.log('✅ Supabase Sync Success (adapted schema), ID:', retryRes.data?.[0]?.id || sessionIdStr);
                setDbError(null);
                return;
              }
            } else {
              console.warn('Supabase Save Notice:', error.message);
            }
          } else if (data && data[0]) {
            console.log('✅ Supabase Sync Success, ID:', data[0].id);
          }
          
          setDbError(null);
        } catch (e: any) {
          console.warn('Supabase sync exception (safely handled by Firestore layer):', e);
        }
      }
    }
  };

  // Handle Create / Update Form Submit
  const handleSubmitSession = (e?: React.FormEvent, closeAfterSave = false) => {
    if (e) e.preventDefault();
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

    // Calculate goalkeeper IDs
    const potentialFilialTeams = Array.from(new Set([
      ...(teams || []).map(t => t.id),
      'FEMENINO_A', 'FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'
    ]));
    const allGKIds = new Set<string>();
    squadPlayers.filter(p => p.positionCategory === 'PORTERAS').forEach(p => allGKIds.add(p.id));
    const allFilialDetailed: DetailedSquadPlayer[] = [];
    potentialFilialTeams.forEach(tId => {
      allFilialDetailed.push(...getDetailedSquadPlayersForTeam(tId, season, dbPlayersByTeam, teams));
    });
    allFilialDetailed.filter(p => p.positionCategory === 'PORTERAS').forEach(p => allGKIds.add(p.id));

    const fieldPlayerIds = allRelevantPlayerIds.filter(id => !allGKIds.has(id));
    const gkPlayerIds = allRelevantPlayerIds.filter(id => allGKIds.has(id));

    const availField = fieldPlayerIds.filter(id => (statuses[id] || 'disponible') === 'disponible').length;
    const availGK = gkPlayerIds.filter(id => (statuses[id] || 'disponible') === 'disponible').length;
    const wildField = fieldPlayerIds.filter(id => statuses[id] === 'comodin').length;
    const wildGK = gkPlayerIds.filter(id => statuses[id] === 'comodin').length;

    const cWildcard = wildField + wildGK;
    const totalGKCount = availGK + wildGK;

    let numPlayers = `${availField}`;
    if (cWildcard > 0) {
      numPlayers = totalGKCount > 0 
        ? `${availField} + ${cWildcard}C + ${totalGKCount}`
        : `${availField} + ${cWildcard}C`;
    } else {
      numPlayers = totalGKCount > 0 
        ? `${availField} + ${totalGKCount}`
        : `${availField}`;
    }

    const sessionTargetId = editingSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newSession: TrainingSession = {
      id: sessionTargetId,
      teamId: selectedTeam.id,
      season: seasonStr,
      title: `SESIÓN Nº${formData.sessionNumber}`,
      sessionNumber: Number(formData.sessionNumber),
      date: formData.date,
      durationTotalMin: Number(formData.durationTotalMin) || 90,
      microcycle: formData.microcycle,
      dayType: formData.dayType,
      intensity: formData.intensity,
      videoUrl: formData.videoUrl,
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
    const exists = sessions.some(s => s.id === sessionTargetId);
    if (exists) {
      updatedList = sessions.map(s => s.id === sessionTargetId ? newSession : s);
      setSuccessMessage('¡Cambios aplicados con éxito!');
    } else {
      updatedList = [newSession, ...sessions];
      setSuccessMessage('¡Sesión guardada! Puedes seguir completándola.');
    }

    setSessions(updatedList);
    syncSessionToSupabase(updatedList, newSession);

    if (closeAfterSave) {
      setEditingSessionId(null);
      resetForm();
      setActiveTab('view');
    } else {
      setEditingSessionId(sessionTargetId);
    }

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

    // 1. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'sessions', String(sessionId)));
      console.log('✅ Session deleted from Firestore');
    } catch (fsErr) {
      console.warn('Firestore delete notice:', fsErr);
    }

    // 2. Remove from local cache
    try {
      localStorage.removeItem(`session_${sessionId}`);
    } catch (e) {}

    // 3. Delete from Supabase
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
      videoUrl: '',
      videoNotes: [],
      playerStatuses: defaultStatuses,
      objectivesTactical: '',
      objectivesPhysical: '',
      objectivesTechnical: '',
      selectedMaterials: ['Conos', 'Petos (2 colores)', 'Balones Oficiales'],
      notes: '',
      tasks: [
        { id: 't1', title: '', phase: 'Calentamiento', durationMin: 15, description: '', coach: '', foco: 'MIXTO', tipologia: 'LÚDICO', fases: [], contextos: [] },
        { id: 't2', title: '', phase: 'Tarea 1', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'RONDOS', fases: [], contextos: [] },
        { id: 't3', title: '', phase: 'Tarea 2', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'JUEGO DE POSICIÓN', fases: [], contextos: [] },
        { id: 't4', title: '', phase: 'Tarea 3', durationMin: 20, description: '', coach: '', foco: 'MIXTO', tipologia: 'PARTIDO CONDICIONADO', fases: [], contextos: [] }
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
      videoUrl: session.videoUrl || '',
      videoNotes: session.videoNotes || [],
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

          {/* Sub-Navigation Tabs: Crear Sesión vs Ver Sesiones vs Tipología */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
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

              <button
                type="button"
                onClick={() => setIsTipologiaModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 shadow-md hover:shadow-lg"
              >
                <BarChart3 className="w-4 h-4 text-sky-400" />
                Tipología
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
                <div className="space-y-3">
                  {/* ARCHIVADOR DE MICROCICLOS (MICROCICLO 1 AL MICROCICLO 40) */}
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((mcNum) => {
                    const mcSessions = sessions.filter(session => isSessionInMicrocycle(session, mcNum));
                    const isOpen = isMicrocycleOpen(mcNum, mcSessions.length > 0);

                    return (
                      <div
                        key={mcNum}
                        className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white shadow-xs"
                      >
                        {/* CABECERA DEL MICROCICLO */}
                        <button
                          type="button"
                          onClick={() => toggleMicrocycle(mcNum, mcSessions.length > 0)}
                          className={`w-full p-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isOpen
                              ? 'bg-sky-50/80 border-b border-sky-100'
                              : 'bg-slate-50/80 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`p-2.5 rounded-xl transition-colors ${
                                isOpen
                                  ? 'bg-sky-500 text-white shadow-sm'
                                  : mcSessions.length > 0
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isOpen ? (
                                <FolderOpen className="w-5 h-5" />
                              ) : (
                                <Folder className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 tracking-wide block uppercase">
                                MICROCICLO {mcNum}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {mcSessions.length} {mcSessions.length === 1 ? 'sesión adjunta' : 'sesiones adjuntas'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {mcSessions.length > 0 && (
                              <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[10px] font-black rounded-lg border border-sky-200 uppercase tracking-wide">
                                {mcSessions.length} {mcSessions.length === 1 ? 'Sesión' : 'Sesiones'}
                              </span>
                            )}
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* CONTENIDO DEL MICROCICLO */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-slate-50/50 space-y-3 border-t border-slate-100">
                                {mcSessions.length === 0 ? (
                                  <div className="text-center py-5 bg-white/80 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                                    <p className="text-xs italic font-medium">No hay sesiones asociadas a este microciclo.</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        resetForm();
                                        setFormData(p => ({ ...p, microcycle: `MICROCICLO ${mcNum}` }));
                                        setActiveTab('create');
                                      }}
                                      className="inline-flex items-center gap-1.5 text-[11px] font-black text-sky-600 hover:text-sky-700 pt-1 cursor-pointer"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      Añadir Sesión al Microciclo {mcNum}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mcSessions.map((session) => (
                                      <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3 group"
                                      >
                                        {/* Número de la Sesión */}
                                        <div className="flex items-center justify-between">
                                          <span className="px-3.5 py-1.5 bg-slate-900 text-white font-black text-xs sm:text-sm rounded-xl uppercase tracking-wider shadow-xs">
                                            SESIÓN Nº {session.sessionNumber || '#'}
                                          </span>
                                        </div>

                                        {/* Botones de Acción */}
                                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                              onClick={() => setSelectedOfficialSheetSession(session)}
                                              className="flex items-center gap-1.5 text-[11px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                                              title="Ver / Imprimir Ficha Oficial ATB"
                                            >
                                              <Printer className="w-3.5 h-3.5 text-sky-400" />
                                              Ficha Oficial
                                            </button>

                                            <button
                                              onClick={() => setSelectedSessionModal(session)}
                                              className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-sky-100"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                              Detalles
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleEditSession(session)}
                                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                              title="Editar Sesión"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            {session.videoUrl && (
                                              <a
                                                href={ensureProtocol(session.videoUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                title="Ver Video en YouTube"
                                              >
                                                <Video className="w-4 h-4" />
                                              </a>
                                            )}
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
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
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
                                    <div className="flex items-center gap-1">
                                      {session.videoUrl && <Video className="w-2.5 h-2.5 text-red-400" />}
                                      <span className="bg-sky-500 text-white px-1 rounded text-[8px]">{session.sessionNumber || '#'}</span>
                                    </div>
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
            <form onSubmit={(e) => handleSubmitSession(e, false)} className="space-y-6">
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
                    <select
                      value={formData.microcycle}
                      onChange={e => setFormData(p => ({ ...p, microcycle: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
                    >
                      {Array.from({ length: 40 }, (_, i) => `MICROCICLO ${i + 1}`).map((mc) => (
                        <option key={mc} value={mc}>{mc}</option>
                      ))}
                    </select>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Video (Link YouTube)</label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={e => setFormData(p => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="https://youtube.com/..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Disponibilidad de Jugadoras de la Plantilla */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b pb-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-500" />
                    2. Disponibilidad de Jugadoras de la Plantilla
                  </h3>
                </div>

                {/* Counters Bar */}
                {(() => {
                  const currentStatuses = formData.playerStatuses || {};
                  
                  // Collect IDs of players who are goalkeepers
                  const potentialFilialTeams = Array.from(new Set([
                    ...(teams || []).map(t => t.id),
                    'FEMENINO_A', 'FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'
                  ]));
                  const allGKIds = new Set<string>();
                  
                  // Goalkeepers from main team
                  squadPlayers.filter(p => p.positionCategory === 'PORTERAS').forEach(p => allGKIds.add(p.id));
                  
                  // We also need the IDs of filial players who are goalkeepers
                  const allFilialDetailed: DetailedSquadPlayer[] = [];
                  potentialFilialTeams.forEach(tId => {
                    allFilialDetailed.push(...getDetailedSquadPlayersForTeam(tId, season, dbPlayersByTeam, teams));
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

                  // Format total string: e.g. "17 + 2C + 2" or "17 + 2"
                  const totalGKCount = availGK + wildGK;

                  let totalStr = `${availField}`;
                  if (cWildcard > 0) {
                    totalStr = totalGKCount > 0 
                      ? `${availField} + ${cWildcard}C + ${totalGKCount}`
                      : `${availField} + ${cWildcard}C`;
                  } else {
                    totalStr = totalGKCount > 0 
                      ? `${availField} + ${totalGKCount}`
                      : `${availField}`;
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
                  const potentialFilialTeams = Array.from(new Set([
                    ...(teams || []).map(t => t.id),
                    'FEMENINO_A', 'FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'
                  ]));
                  const allPossiblePlayers: DetailedSquadPlayer[] = [];
                  potentialFilialTeams.forEach(tId => {
                    allPossiblePlayers.push(...getDetailedSquadPlayersForTeam(tId, season, dbPlayersByTeam, teams));
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
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setShowFilialSelector(prev => !prev)}
                      className="text-[11px] font-black uppercase text-sky-600 hover:text-sky-700 tracking-[0.2em] flex items-center gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="p-1 rounded-lg bg-sky-50 group-hover:bg-sky-100 text-sky-600 transition-colors border border-sky-200 flex items-center justify-center">
                        {showFilialSelector ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                      <span>Añadir Jugadoras de Filial</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-sky-500", showFilialSelector && "rotate-180")} />
                    </button>
                  </div>

                  {/* Collapsible Filial Dropdown Selector */}
                  {showFilialSelector && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Seleccionar plantilla filial:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <select 
                            value={filialTeamSearch}
                            onChange={(e) => setFilialTeamSearch(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                          >
                            {(() => {
                              const currentTeamId = selectedTeam?.id;
                              const currentTeamName = selectedTeam?.name?.toUpperCase();

                              const allTeams = (teams && teams.length > 0)
                                ? teams
                                : [
                                    { id: 'FEMENINO_B', name: 'FEMENINO B' },
                                    { id: 'FEMENINO_C', name: 'FEMENINO C' },
                                    { id: 'FEMENINO_D', name: 'FEMENINO D' },
                                    { id: 'FEMENINO_E', name: 'FEMENINO E' },
                                    { id: 'FEMENINO_A', name: 'FEMENINO A' },
                                  ];

                              const filteredTeams = allTeams.filter(t => {
                                if (currentTeamId && t.id === currentTeamId) return false;
                                if (currentTeamName && t.name?.toUpperCase() === currentTeamName) return false;
                                return true;
                              });

                              return filteredTeams.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
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
                              className="pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-sky-500 w-48 shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Filial Players Selector Grid */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Jugadoras disponibles (Haz clic para añadir):
                        </span>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {(() => {
                            const otherPlayers = getDetailedSquadPlayersForTeam(filialTeamSearch, season, dbPlayersByTeam, teams);
                            const filtered = otherPlayers.filter(p => 
                              p.name.toUpperCase().includes(filialPlayerSearchQuery.toUpperCase()) &&
                              !formData.filialPlayers.includes(p.id)
                            );
                            
                            if (filtered.length === 0) {
                              return (
                                <p className="col-span-full text-center py-4 text-[10px] font-bold text-slate-400 uppercase">
                                  {filialPlayerSearchQuery ? 'No se encontraron jugadoras' : 'Todas las jugadoras de esta plantilla han sido añadidas'}
                                </p>
                              );
                            }
                            
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
                                }}
                                className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-sky-50 hover:border-sky-300 transition-all text-left group cursor-pointer shadow-xs hover:shadow-sm"
                              >
                                <div className="w-6 h-6 bg-sky-100 group-hover:bg-sky-500 group-hover:text-white rounded-full flex items-center justify-center text-[8px] font-black text-sky-700 transition-colors">
                                  {p.number || p.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black text-slate-700 group-hover:text-sky-900 uppercase truncate">{p.name}</span>
                                <PlusCircle className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 ml-auto shrink-0" />
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Filial Players */}
                  {formData.filialPlayers.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-5 gap-x-3 items-start justify-items-center pt-2">
                      {formData.filialPlayers.map((playerId, idx) => {
                        const status = (formData.playerStatuses || {})[playerId] || 'disponible';
                        
                        // Find the player object to get the name
                        const potentialFilialTeams = Array.from(new Set([
                          ...(teams || []).map(t => t.id),
                          'FEMENINO_A', 'FEMENINO_B', 'FEMENINO_C', 'FEMENINO_D', 'FEMENINO_E'
                        ]));
                        let playerObj = null;
                        for (const tId of potentialFilialTeams) {
                          const list = getDetailedSquadPlayersForTeam(tId, season, dbPlayersByTeam, teams);
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
                          <option value="-">(-)</option>
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
                          <option value="CONDICIONAL">CONDICIONAL</option>
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

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-tight">Fase (Selección Múltiple)</label>
                        <div className="flex flex-wrap gap-2">
                          {FASE_OPTIONS.map(opt => {
                            const currentFases = formData.tasks[activeTaskTab]?.fases || [];
                            const isSelected = currentFases.includes(opt);
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => {
                                  const newTasks = [...formData.tasks];
                                  const task = { ...newTasks[activeTaskTab] };
                                  const updatedFases = isSelected
                                    ? currentFases.filter(f => f !== opt)
                                    : [...currentFases, opt];
                                  task.fases = updatedFases;
                                  newTasks[activeTaskTab] = task;
                                  setFormData(p => ({ ...p, tasks: newTasks }));
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                  isSelected
                                    ? "bg-sky-500 text-white border-sky-600 shadow-sm"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-tight">Contexto (Selección Múltiple)</label>
                        <div className="flex flex-wrap gap-2">
                          {CONTEXTO_OPTIONS.map(opt => {
                            const currentContextos = formData.tasks[activeTaskTab]?.contextos || [];
                            const isSelected = currentContextos.includes(opt);
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => {
                                  const newTasks = [...formData.tasks];
                                  const task = { ...newTasks[activeTaskTab] };
                                  const updatedContextos = isSelected
                                    ? currentContextos.filter(c => c !== opt)
                                    : [...currentContextos, opt];
                                  task.contextos = updatedContextos;
                                  newTasks[activeTaskTab] = task;
                                  setFormData(p => ({ ...p, tasks: newTasks }));
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border text-left",
                                  isSelected
                                    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
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
                        <div className="relative w-full h-full min-h-[280px] bg-slate-900/5 rounded-2xl overflow-hidden border border-slate-200 group shadow-md transition-shadow hover:shadow-lg flex items-center justify-center p-2">
                          <img 
                            src={formData.tasks[activeTaskTab]?.image} 
                            alt="Preview" 
                            className="max-w-full max-h-[320px] w-auto h-auto object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 p-1.5 rounded-xl backdrop-blur-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setImageToEdit(formData.tasks[activeTaskTab].image || null);
                                setIsEditorOpen(true);
                              }}
                              title="Ajustar / Recortar"
                              className="p-2 bg-white text-slate-700 hover:text-sky-600 rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              <Crop className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newTasks = [...formData.tasks];
                                newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], image: undefined };
                                setFormData(p => ({ ...p, tasks: newTasks }));
                              }}
                              title="Eliminar imagen"
                              className="p-2 bg-rose-500 text-white hover:bg-rose-600 rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-full min-h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-sky-300 transition-all cursor-pointer group">
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
                                  const newTasks = [...formData.tasks];
                                  newTasks[activeTaskTab] = { ...newTasks[activeTaskTab], image: result };
                                  setFormData(p => ({ ...p, tasks: newTasks }));
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
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
                  {editingSessionId ? 'Aplicar Cambios' : 'Guardar y Seguir Editando'}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmitSession(e, true)}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Guardar y Salir
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
                  {selectedSessionModal.videoUrl && (
                    <a 
                      href={ensureProtocol(selectedSessionModal.videoUrl)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-full text-[10px] font-black text-red-100 transition-all ml-2 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      VER VIDEO
                    </a>
                  )}
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
                        videoUrl: selectedSessionModal.videoUrl || '',
                        videoNotes: selectedSessionModal.videoNotes || [],
                        playerStatuses: selectedSessionModal.playerStatuses || {},
                        objectivesTactical: selectedSessionModal.objectivesTactical || '',
                        objectivesPhysical: selectedSessionModal.objectivesPhysical || '',
                        objectivesTechnical: selectedSessionModal.objectivesTechnical || '',
                        selectedMaterials: selectedSessionModal.materials || [],
                        notes: selectedSessionModal.notes || '',
                        tasks: selectedSessionModal.tasks || [],
                        filialPlayers: selectedSessionModal.filialPlayerNames || [],
                        sessionStaffTasks: selectedSessionModal.sessionStaffTasks || []
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
                              <div className="relative aspect-video w-full bg-slate-900/5 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center p-2">
                                <img 
                                  src={t.image} 
                                  alt={t.title} 
                                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                                  referrerPolicy="no-referrer"
                                />
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
                    onClick={() => {
                      const sess = selectedSessionModal;
                      setSelectedSessionModal(null);
                      setSelectedOfficialSheetSession(sess);
                    }}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    PDF Ficha Técnica
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

      {/* MODAL ANALÍTICO DE TIPOLOGÍA Y FOCO */}
      <TipologiaModal
        isOpen={isTipologiaModalOpen}
        onClose={() => setIsTipologiaModalOpen(false)}
        sessions={sessions}
        teamName={selectedTeam?.name || 'Plantilla'}
      />
    </div>
  );
}
