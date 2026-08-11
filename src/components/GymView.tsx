import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  User,
  ChevronRight, 
  Activity, 
  Sparkles, 
  Trash2, 
  Edit3,
  X, 
  BarChart,
  Zap,
  Shield,
  Layers,
  Filter,
  Info,
  Video,
  Film,
  Upload,
  ExternalLink,
  Play,
  Check,
  CheckSquare,
  Square,
  Save,
  Bookmark,
  ChevronUp,
  ChevronDown,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Tag,
  Database,
  Copy,
  Code,
  Eye,
  Paperclip
} from 'lucide-react';
import { Team, Player } from '../types';
import { supabase } from '../lib/supabase';
import { PdfViewer } from './PdfViewer';

const FEMENINO_A_SQL_SCRIPT = `-- TABLA DE SESIONES GRUPALES DE GIMNASIO PARA ATB FEMENINO A
CREATE TABLE IF NOT EXISTS gym_group_sessions_femenino_a (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id TEXT DEFAULT 'FEMENINO_A',
  team_name TEXT DEFAULT 'ATB FEMENINO A',
  routine TEXT,
  routine_title TEXT,
  session_date DATE DEFAULT CURRENT_DATE,
  date TEXT,
  type TEXT DEFAULT 'ST1',
  session_type_category TEXT DEFAULT 'ST1',
  tipo TEXT DEFAULT 'ST1',
  microcycle TEXT DEFAULT 'MICROCICLO 1',
  weight TEXT,
  rpe NUMERIC DEFAULT 8,
  notes JSONB,
  details JSONB
);

ALTER TABLE gym_group_sessions_femenino_a ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica gym_group_sessions_femenino_a"
  ON gym_group_sessions_femenino_a FOR SELECT USING (true);

CREATE POLICY "Insercion publica gym_group_sessions_femenino_a"
  ON gym_group_sessions_femenino_a FOR INSERT WITH CHECK (true);

CREATE POLICY "Actualizacion publica gym_group_sessions_femenino_a"
  ON gym_group_sessions_femenino_a FOR UPDATE USING (true);

CREATE POLICY "Eliminacion publica gym_group_sessions_femenino_a"
  ON gym_group_sessions_femenino_a FOR DELETE USING (true);
`;

const INDIVIDUAL_REPORTS_SQL_SCRIPT = `-- TABLA DE INFORMES INDIVIDUALES DE GIMNASIO (HISTORIAL)
CREATE TABLE IF NOT EXISTS gym_individual_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  player_id TEXT,
  player_name TEXT,
  title TEXT,
  date DATE DEFAULT CURRENT_DATE,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT DEFAULT 'pdf',
  category TEXT DEFAULT 'Valoración Física',
  notes TEXT
);

ALTER TABLE gym_individual_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica gym_individual_reports" ON gym_individual_reports FOR SELECT USING (true);
CREATE POLICY "Insercion publica gym_individual_reports" ON gym_individual_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizacion publica gym_individual_reports" ON gym_individual_reports FOR UPDATE USING (true);
CREATE POLICY "Eliminacion publica gym_individual_reports" ON gym_individual_reports FOR DELETE USING (true);
`;

export interface ExerciseItem {
  id: string;
  name: string;
  stimulus: 'Fuerza' | 'Pliometría';
  muscleChain: 'Cadena Anterior' | 'Cadena Posterior' | 'Cadena Interna' | 'Cadena Externa' | 'CORE' | 'Tren Superior' | 'Mix';
  description?: string;
  videoType?: 'youtube' | 'file';
  videoUrl?: string;
  videoFileName?: string;
  // Legacy fields for backward compatibility with routines
  category?: string;
  muscleGroup?: string;
  defaultSets?: number;
  defaultReps?: string;
  defaultLoad?: string;
  equipment?: string;
  notes?: string;
}

export interface SessionExerciseItem {
  id: string;
  exercise: ExerciseItem;
  sets: string;
  reps: string;
  load: string;
  rest: string;
  videoUrl?: string;
}

export interface Routine {
  id: string;
  title: string;
  category: 'Fuerza' | 'Potencia' | 'Prevención' | 'Recuperación' | 'Core & Estabilidad';
  targetGroup: string;
  durationMinutes: number;
  description: string;
  exercises: {
    id: string;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: string;
    load?: string;
    notes?: string;
  }[];
}

export interface GymSession {
  id: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  dateStr?: string;
  time: string;
  routineTitle: string;
  teamName: string;
  completedPlayers: number;
  totalPlayers: number;
  avgRPE: number;
}

export interface GymSessionLog {
  id?: string;
  playerId?: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  routine: string;
  rpe: number;
  weight: string;
  date: string;
  mesocycle?: string;
  microcycle?: string;
  sessionTypeCategory?: string;
  activationExercises?: SessionExerciseItem[];
  mainBlockExercises?: SessionExerciseItem[];
  participatingPlayers?: string[];
  details?: string;
  sessionType?: 'group' | 'individual';
}

interface GymViewProps {
  season?: string;
  selectedTeam?: Team | null;
  teams?: Team[];
}

export interface IndividualReport {
  id: string;
  playerId: string;
  playerName?: string;
  title: string;
  date: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'image' | 'other';
  category?: string;
  notes?: string;
  created_at?: string;
}

function getYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

const INITIAL_EXERCISES: ExerciseItem[] = [];

const INITIAL_ROUTINES: Routine[] = [];

const INITIAL_SESSIONS: GymSession[] = [];

export default function GymView({ season = '2026/2027', selectedTeam, teams = [] }: GymViewProps) {
  const [activeTab, setActiveTab] = useState<'ejercicios' | 'rutinas' | 'planificacion' | 'cargas'>('ejercicios');
  
  // Exercises state
  const [exercises, setExercises] = useState<ExerciseItem[]>(INITIAL_EXERCISES);

  // Routines state
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES);

  // Gym Sessions state
  const [gymSessions, setGymSessions] = useState<GymSession[]>(INITIAL_SESSIONS);

  // Top Mode interface state: 'grupo' | 'individual' | 'biblioteca'
  const [topMode, setTopMode] = useState<'grupo' | 'individual' | 'biblioteca'>('grupo');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerForGym, setSelectedPlayerForGym] = useState<Player | null>(null);
  const [selectedGroupPlayers, setSelectedGroupPlayers] = useState<string[]>([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedStimulusFilter, setSelectedStimulusFilter] = useState<string>('');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('TODOS');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  // Individual Reports State
  const [individualReports, setIndividualReports] = useState<IndividualReport[]>(() => {
    try {
      const saved = localStorage.getItem('gym_individual_reports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [viewingReportModal, setViewingReportModal] = useState<IndividualReport | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (viewingReportModal?.fileUrl) {
      if (viewingReportModal.fileType === 'pdf' || viewingReportModal.fileUrl.startsWith('data:application/pdf')) {
        let createdUrl = viewingReportModal.fileUrl;
        if (viewingReportModal.fileUrl.startsWith('data:')) {
          try {
            const parts = viewingReportModal.fileUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            createdUrl = URL.createObjectURL(blob);
          } catch (e) {
            console.error('Error converting PDF data URL to blob:', e);
          }
        }
        setPdfPreviewUrl(createdUrl);
        return () => {
          if (createdUrl && createdUrl.startsWith('blob:')) {
            URL.revokeObjectURL(createdUrl);
          }
        };
      } else {
        setPdfPreviewUrl(viewingReportModal.fileUrl);
      }
    } else {
      setPdfPreviewUrl(null);
    }
  }, [viewingReportModal]);

  const [newReport, setNewReport] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Valoración Física',
    notes: '',
    fileName: '',
    fileUrl: '',
    fileType: 'pdf' as 'pdf' | 'image' | 'other'
  });

  useEffect(() => {
    if (!supabase) return;
    const fetchReports = async () => {
      try {
        let { data, error } = await supabase
          .from('gym_individual_reports')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: IndividualReport[] = data.map((item: any) => ({
            id: String(item.id),
            playerId: item.player_id || item.playerId,
            playerName: item.player_name || item.playerName,
            title: item.title,
            date: item.date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            fileUrl: item.file_url || item.fileUrl,
            fileName: item.file_name || item.fileName,
            fileType: item.file_type || item.fileType || 'pdf',
            category: item.category || 'Valoración Física',
            notes: item.notes || ''
          }));
          setIndividualReports(mapped);
        }
      } catch (e) {
        console.error('Error fetching gym individual reports:', e);
      }
    };
    fetchReports();
  }, []);

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const fileType: 'pdf' | 'image' | 'other' = isPdf ? 'pdf' : (isImage ? 'image' : 'other');

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setNewReport(prev => ({
          ...prev,
          fileName: file.name,
          fileUrl: String(reader.result),
          fileType
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title.trim() || !selectedPlayerForGym) return;

    const pName = selectedPlayerForGym.nombre 
      ? `${selectedPlayerForGym.nombre} ${selectedPlayerForGym.apellidos || ''}` 
      : selectedPlayerForGym.name;

    const created: IndividualReport = {
      id: String(Date.now()),
      playerId: selectedPlayerForGym.id,
      playerName: pName,
      title: newReport.title.trim(),
      date: newReport.date || new Date().toISOString().split('T')[0],
      fileUrl: newReport.fileUrl,
      fileName: newReport.fileName,
      fileType: newReport.fileType,
      category: newReport.category,
      notes: newReport.notes.trim()
    };

    setIndividualReports(prev => [created, ...prev]);

    if (supabase) {
      try {
        const payload: any = {
          player_id: created.playerId,
          player_name: created.playerName,
          title: created.title,
          date: created.date,
          file_url: created.fileUrl,
          file_name: created.fileName,
          file_type: created.fileType,
          category: created.category,
          notes: created.notes
        };

        let { data, error } = await supabase.from('gym_individual_reports').insert([payload]).select();
        
        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('Tabla gym_individual_reports no existe en Supabase');
          } else {
            console.error('Error insertando informe en Supabase:', error);
          }
        } else if (data && data[0]) {
          // Actualizar el ID local con el ID real de la base de datos (UUID)
          setIndividualReports(prev => prev.map(r => r.id === created.id ? { ...r, id: String(data[0].id) } : r));
        }
      } catch (err) {
        console.error('Error insertando informe en Supabase:', err);
      }
    }

    try {
      const saved = localStorage.getItem('gym_individual_reports_v1');
      const list = saved ? JSON.parse(saved) : [];
      localStorage.setItem('gym_individual_reports_v1', JSON.stringify([created, ...list]));
    } catch (err) {}

    setShowAddReportModal(false);
    setNewReport({
      title: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Valoración Física',
      notes: '',
      fileName: '',
      fileUrl: '',
      fileType: 'pdf'
    });
  };

  const handleDeleteReport = async (id: string) => {
    setIndividualReports(prev => prev.filter(r => r.id !== id));

    if (supabase) {
      try {
        await supabase.from('gym_individual_reports').delete().eq('id', id);
      } catch (err) {}
    }

    try {
      const saved = localStorage.getItem('gym_individual_reports_v1');
      if (saved) {
        const list = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('gym_individual_reports_v1', JSON.stringify(list));
      }
    } catch (err) {}
  };

  // Load team players when selectedTeam or season changes
  useEffect(() => {
    async function loadTeamPlayers() {
      if (!selectedTeam) {
        setPlayers([]);
        return;
      }
      let loaded: Player[] = [];

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('team_id', selectedTeam.id)
            .order('number', { ascending: true });

          if (!error && data && data.length > 0) {
            loaded = data.map((p: any) => ({
              ...p,
              secondPosition: p.secondPosition || p.second_position || p.segunda_posicion || p.segunda_posicion_especifica || p.secondposition || '',
              teamId: p.team_id || p.teamid
            }));
          }
        } catch (e) {}
      }

      setPlayers(loaded);
      if (loaded.length > 0) {
        setSelectedPlayerForGym(prev => prev || loaded[0]);
      }
    }
    loadTeamPlayers();
  }, [selectedTeam, season]);

  // Modals state
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<GymSessionLog | null>(null);

  // Form states for New / Edit Exercise
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exName, setExName] = useState('');
  const [exStimulus, setExStimulus] = useState<'Fuerza' | 'Pliometría'>('Fuerza');
  const [exMuscleChain, setExMuscleChain] = useState<ExerciseItem['muscleChain']>('Cadena Anterior');
  const [exDescription, setExDescription] = useState('');
  const [exVideoType, setExVideoType] = useState<'youtube' | 'file'>('youtube');
  const [exYoutubeUrl, setExYoutubeUrl] = useState('');
  const [exVideoFile, setExVideoFile] = useState<{ url: string; name: string } | null>(null);

  const handleOpenCreateExerciseModal = () => {
    setEditingExerciseId(null);
    setExName('');
    setExStimulus('Fuerza');
    setExMuscleChain('Cadena Anterior');
    setExDescription('');
    setExVideoType('youtube');
    setExYoutubeUrl('');
    setExVideoFile(null);
    setShowCreateExerciseModal(true);
  };

  const handleOpenEditExerciseModal = (ex: ExerciseItem) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name || '');
    setExStimulus((ex.stimulus as 'Fuerza' | 'Pliometría') || 'Fuerza');
    setExMuscleChain((ex.muscleChain || ex.category || 'Cadena Anterior') as any);
    setExDescription(ex.description || ex.notes || '');
    setExVideoType(ex.videoType || 'youtube');
    if (ex.videoType === 'file') {
      setExVideoFile(ex.videoUrl ? { url: ex.videoUrl, name: ex.videoFileName || 'vídeo_adjunto' } : null);
      setExYoutubeUrl('');
    } else {
      setExYoutubeUrl(ex.videoUrl || '');
      setExVideoFile(null);
    }
    setShowCreateExerciseModal(true);
  };

  // Form states for New Routine
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Routine['category']>('Fuerza');
  const [newTarget, setNewTarget] = useState('Toda la Plantilla');
  const [newDuration, setNewDuration] = useState(40);
  const [newDescription, setNewDescription] = useState('');
  const [newRoutineExercises, setNewRoutineExercises] = useState<{ id: string; name: string; muscleGroup: string; sets: number; reps: string; load?: string }[]>([]);

  // Session Creation State & Modal Structure
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('Mi Sesión de Entrenamiento');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSessionPlayers, setSelectedSessionPlayers] = useState<string[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sessionPlayerId, setSessionPlayerId] = useState<string>('');
  const [sessionMesocycle, setSessionMesocycle] = useState('M1');
  const [sessionMicrocycle, setSessionMicrocycle] = useState('MICROCICLO 1');
  const [sessionTypeCategory, setSessionTypeCategory] = useState<string>('ST1');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const isFemeninoA = selectedTeam
    ? (selectedTeam.id === 'FEMENINO_A' || selectedTeam.name?.toUpperCase().includes('FEMENINO A') || selectedTeam.name?.toUpperCase().includes('PLANTILLA A'))
    : true;

  const [openMicrocycles, setOpenMicrocycles] = useState<Record<number, boolean>>({ 1: true });
  const [activationExercises, setActivationExercises] = useState<SessionExerciseItem[]>([]);
  const [mainBlockExercises, setMainBlockExercises] = useState<SessionExerciseItem[]>([]);
  const [showAddPicker, setShowAddPicker] = useState<'activation' | 'main' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerStimulusFilter, setPickerStimulusFilter] = useState<string>('TODOS');
  const [pickerChainFilter, setPickerChainFilter] = useState<string>('TODAS');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const availableStimuli = ['TODOS', 'Fuerza', 'Pliometría'];
  const availableChains = [
    'TODAS',
    'Cadena Anterior',
    'Cadena Posterior',
    'Cadena Interna',
    'Cadena Externa',
    'CORE',
    'Tren Superior',
    'Mix'
  ];

  const filteredPickerExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(pickerSearch.toLowerCase());
    const matchesStimulus = pickerStimulusFilter === 'TODOS' || ex.stimulus === pickerStimulusFilter;
    const matchesChain = pickerChainFilter === 'TODAS' || ex.muscleChain === pickerChainFilter;
    return matchesSearch && matchesStimulus && matchesChain;
  });

  const formatMuscleChainBadge = (chain?: string) => {
    if (!chain) return 'GENERAL';
    if (chain.includes('Anterior')) return 'ANTERIOR';
    if (chain.includes('Posterior')) return 'POSTERIOR';
    if (chain.includes('Interna')) return 'INTERNA';
    if (chain.includes('Externa')) return 'EXTERNA';
    if (chain.includes('Superior')) return 'SUPERIOR';
    if (chain.includes('CORE') || chain.includes('Core')) return 'CORE';
    return chain.toUpperCase();
  };

  const addExerciseToBlock = (blockType: 'activation' | 'main', ex: ExerciseItem) => {
    const newItem: SessionExerciseItem = {
      id: `${ex.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exercise: ex,
      sets: '3',
      reps: '10',
      load: 'RPE 6',
      rest: '90s',
      videoUrl: ex.videoUrl || ''
    };
    if (blockType === 'activation') {
      setActivationExercises(prev => [...prev, newItem]);
    } else {
      setMainBlockExercises(prev => [...prev, newItem]);
    }
  };

  const removeExerciseFromBlock = (blockType: 'activation' | 'main', id: string) => {
    if (blockType === 'activation') {
      setActivationExercises(prev => prev.filter(item => item.id !== id));
    } else {
      setMainBlockExercises(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateExerciseParam = (blockType: 'activation' | 'main', id: string, field: 'sets' | 'reps' | 'load' | 'rest' | 'videoUrl', val: string) => {
    const updateList = (list: SessionExerciseItem[]) =>
      list.map(item => (item.id === id ? { ...item, [field]: val } : item));
    if (blockType === 'activation') {
      setActivationExercises(updateList);
    } else {
      setMainBlockExercises(updateList);
    }
  };

  const moveExerciseInBlock = (blockType: 'activation' | 'main', index: number, direction: 'up' | 'down') => {
    const updateList = (list: SessionExerciseItem[]) => {
      const arr = [...list];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= arr.length) return list;
      const temp = arr[index];
      arr[index] = arr[targetIndex];
      arr[targetIndex] = temp;
      return arr;
    };
    if (blockType === 'activation') {
      setActivationExercises(updateList);
    } else {
      setMainBlockExercises(updateList);
    }
  };

  // RPE logs state from Supabase
  const [rpeLogs, setRpeLogs] = useState<GymSessionLog[]>([]);
  const [viewingSession, setViewingSession] = useState<GymSessionLog | null>(null);

  const handleOpenEditSessionModal = (log: GymSessionLog) => {
    setEditingSessionId(log.id || null);
    setSessionTitle(log.routine || 'Sesión de Entrenamiento');
    setSessionDate(log.date || new Date().toISOString().split('T')[0]);
    if (log.mesocycle) setSessionMesocycle(log.mesocycle);
    if (log.microcycle) setSessionMicrocycle(log.microcycle);
    if (log.sessionTypeCategory) setSessionTypeCategory(log.sessionTypeCategory);

    setActivationExercises(log.activationExercises ? [...log.activationExercises] : []);
    setMainBlockExercises(log.mainBlockExercises ? [...log.mainBlockExercises] : []);

    let parsedDetails: any = null;
    if (log.details) {
      try {
        parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      } catch (e) {}
    }

    if (parsedDetails?.targetPlayerIds && Array.isArray(parsedDetails.targetPlayerIds) && parsedDetails.targetPlayerIds.length > 0) {
      setSelectedSessionPlayers(parsedDetails.targetPlayerIds);
    } else if (log.participatingPlayers && log.participatingPlayers.length > 0) {
      const matchedPlayerIds: string[] = [];
      players.forEach(p => {
        const pName = (p.nombre ? `${p.nombre} ${p.apellidos || ''}` : p.name).toLowerCase().trim();
        const isMatched = log.participatingPlayers?.some(partName => {
          const cleanPartName = partName.toLowerCase().trim();
          return cleanPartName === pName || cleanPartName.includes(pName);
        });
        if (isMatched) {
          matchedPlayerIds.push(p.id);
        }
      });
      setSelectedSessionPlayers(matchedPlayerIds.length > 0 ? matchedPlayerIds : players.map(p => p.id));
    } else {
      setSelectedSessionPlayers(players.map(p => p.id));
    }

    if (log.playerId) {
      setSessionPlayerId(log.playerId);
    } else if (players.length > 0) {
      setSessionPlayerId(players[0].id);
    }

    setViewingSession(null);
    setIsCreatingSession(true);
  };

  const [newLogPlayer, setNewLogPlayer] = useState('');
  const [newLogRoutine, setNewLogRoutine] = useState(routines[0]?.title || '');
  const [newLogRPE, setNewLogRPE] = useState<number>(8);
  const [newLogWeight, setNewLogWeight] = useState('');

  // Supabase Sync on Mount
  useEffect(() => {
    if (supabase) {
      supabase
        .from('gym_exercises')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const loaded: ExerciseItem[] = data.map(item => ({
              id: item.id,
              name: item.name,
              stimulus: item.stimulus,
              muscleChain: item.muscle_chain,
              description: item.description,
              videoType: item.video_type,
              videoUrl: item.video_url,
              videoFileName: item.video_file_name,
              category: item.muscle_chain,
              muscleGroup: item.muscle_chain
            }));
            setExercises(loaded);
          }
        });

      const fetchAllGymLogs = async () => {
        const allLogs: GymSessionLog[] = [];
        const seenIds = new Set<string>();

        const mapItemToLog = (item: any, type: 'group' | 'individual'): GymSessionLog => {
          let parsed: any = null;
          const rawData = item.notes || item.details;
          if (rawData) {
            try {
              parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            } catch (e) {}
          }
          return {
            id: item.id,
            playerId: item.player_id,
            playerName: item.player_name || (type === 'group' ? 'Grupo' : 'Jugadora'),
            teamId: item.team_id || parsed?.teamId,
            teamName: item.team_name || item.team || parsed?.teamName,
            routine: item.routine_title || item.routine || item.routine_name || 'Sesión de Entrenamiento',
            rpe: item.rpe || 8,
            weight: item.weight || '',
            date: item.session_date || item.date || (item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            mesocycle: parsed?.mesocycle,
            microcycle: item.microcycle || parsed?.microcycle,
            sessionTypeCategory: item.session_type_category || item.tipo || item.type || parsed?.sessionTypeCategory || parsed?.tipo || parsed?.type,
            activationExercises: parsed?.activationExercises || [],
            mainBlockExercises: parsed?.mainBlockExercises || [],
            participatingPlayers: parsed?.participatingPlayers || [],
            details: rawData,
            sessionType: type
          };
        };

        // 1. Fetch group sessions for Femenino A
        try {
          const { data: groupFemAData } = await supabase.from('gym_group_sessions_femenino_a').select('*').order('created_at', { ascending: false }).limit(50);
          if (groupFemAData) {
            groupFemAData.forEach(item => {
              if (item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                allLogs.push(mapItemToLog(item, 'group'));
              }
            });
          }
        } catch (e) {}

        // 2. Fetch group sessions
        try {
          const { data: groupData } = await supabase.from('gym_group_sessions').select('*').order('created_at', { ascending: false }).limit(50);
          if (groupData) {
            groupData.forEach(item => {
              if (item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                allLogs.push(mapItemToLog(item, 'group'));
              }
            });
          }
        } catch (e) {}

        // 2. Fetch individual sessions
        try {
          const { data: indData } = await supabase.from('gym_individual_sessions').select('*').order('created_at', { ascending: false }).limit(50);
          if (indData) {
            indData.forEach(item => {
              if (item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                allLogs.push(mapItemToLog(item, 'individual'));
              }
            });
          }
        } catch (e) {}

        // 3. Fallback: fetch legacy gym_sessions table
        try {
          const { data: legacyData } = await supabase.from('gym_sessions').select('*').order('created_at', { ascending: false }).limit(50);
          if (legacyData) {
            legacyData.forEach(item => {
              if (item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                const isGroup = !item.player_id || (item.player_name && (item.player_name.includes('Grupo') || item.player_name.includes('Jugadoras')));
                allLogs.push(mapItemToLog(item, isGroup ? 'group' : 'individual'));
              }
            });
          }
        } catch (e) {}

        if (allLogs.length > 0) {
          setRpeLogs(allLogs);
        }
      };

      fetchAllGymLogs();
    }
  }, []);

  // Filtered Exercises
  const filteredExercises = exercises.filter(ex => {
    const stimulus = ex.stimulus || 'Fuerza';
    const matchesStimulus = !selectedStimulusFilter || selectedStimulusFilter === 'TODOS' || stimulus === selectedStimulusFilter;
    const chain = ex.muscleChain || ex.category || '';
    const matchesChain = !selectedChainFilter || selectedChainFilter === 'TODOS' || chain === selectedChainFilter;
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ex.description && ex.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStimulus && matchesChain && matchesSearch;
  });

  // Filtered Routines
  const filteredRoutines = routines.filter(r => {
    const matchesCategory = selectedChainFilter === 'TODOS' || r.category === selectedChainFilter;
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Create or Edit Exercise Submit
  const handleCreateExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim()) return;

    let videoUrl: string | undefined = undefined;
    if (exVideoType === 'youtube' && exYoutubeUrl.trim()) {
      videoUrl = exYoutubeUrl.trim();
    } else if (exVideoType === 'file' && exVideoFile) {
      videoUrl = exVideoFile.url;
    }

    if (editingExerciseId) {
      // EDITING EXISTING EXERCISE
      const updatedExObj: ExerciseItem = {
        id: editingExerciseId,
        name: exName.trim(),
        stimulus: exStimulus,
        muscleChain: exMuscleChain,
        description: exDescription.trim() || undefined,
        videoType: exVideoType,
        videoUrl: videoUrl,
        videoFileName: exVideoType === 'file' ? exVideoFile?.name : undefined,
        category: exMuscleChain,
        muscleGroup: exMuscleChain
      };

      setExercises(prev => prev.map(ex => ex.id === editingExerciseId ? updatedExObj : ex));
      setSelectedExerciseId(editingExerciseId);
      setShowCreateExerciseModal(false);

      if (supabase) {
        supabase
          .from('gym_exercises')
          .update({
            name: exName.trim(),
            stimulus: exStimulus,
            muscle_chain: exMuscleChain,
            description: exDescription.trim() || null,
            video_type: exVideoType,
            video_url: videoUrl || null,
            video_file_name: exVideoType === 'file' ? exVideoFile?.name : null
          })
          .eq('id', editingExerciseId)
          .then(({ error }) => {
            if (error) {
              console.error('Error actualizando en Supabase gym_exercises:', error);
            }
          });
      }
    } else {
      // CREATING NEW EXERCISE
      const tempId = 'ex-item-' + Date.now();
      const newExObj: ExerciseItem = {
        id: tempId,
        name: exName.trim(),
        stimulus: exStimulus,
        muscleChain: exMuscleChain,
        description: exDescription.trim() || undefined,
        videoType: exVideoType,
        videoUrl: videoUrl,
        videoFileName: exVideoType === 'file' ? exVideoFile?.name : undefined,
        category: exMuscleChain,
        muscleGroup: exMuscleChain
      };

      setExercises(prev => [newExObj, ...prev]);
      setSelectedExerciseId(newExObj.id);
      setShowCreateExerciseModal(false);

      // Sync with Supabase gym_exercises table if available
      if (supabase) {
        supabase
          .from('gym_exercises')
          .insert([{
            name: exName.trim(),
            stimulus: exStimulus,
            muscle_chain: exMuscleChain,
            description: exDescription.trim() || null,
            video_type: exVideoType,
            video_url: videoUrl || null,
            video_file_name: exVideoType === 'file' ? exVideoFile?.name : null
          }])
          .select()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error insertando en Supabase gym_exercises:', error);
            } else if (data && data[0]) {
              const realId = data[0].id;
              setExercises(prev => prev.map(ex => ex.id === tempId ? { ...ex, id: realId } : ex));
              setSelectedExerciseId(realId);
            }
          });
      }
    }

    // Reset Form
    setEditingExerciseId(null);
    setExName('');
    setExStimulus('Fuerza');
    setExMuscleChain('Cadena Anterior');
    setExDescription('');
    setExYoutubeUrl('');
    setExVideoFile(null);
  };

  const handleDeleteExercise = async (id: string) => {
    const targetEx = exercises.find(e => e.id === id);
    if (!targetEx) return;

    // Optimistic update
    setExercises(prev => prev.filter(e => e.id !== id));
    if (selectedExerciseId === id) {
      setSelectedExerciseId(null);
    }

    if (supabase) {
      try {
        console.log('🗑️ Intentando eliminar ejercicio de Supabase:', id, targetEx.name);
        const { error } = await supabase.from('gym_exercises').delete().eq('id', id);
        
        if (error) {
          console.error('❌ Error al eliminar de Supabase gym_exercises (por ID):', error.message);
          // Intento secundario por nombre si el ID falla (a veces útil en migraciones manuales)
          const { error: error2 } = await supabase.from('gym_exercises').delete().eq('name', targetEx.name);
          if (error2) {
            console.error('❌ Error al eliminar de Supabase gym_exercises (por nombre):', error2.message);
          } else {
            console.log('✅ Ejercicio eliminado con éxito (por nombre)');
          }
        } else {
          console.log('✅ Ejercicio eliminado con éxito de Supabase (por ID)');
        }
      } catch (err) {
        console.error('❌ Excepción al intentar eliminar:', err);
      }
    }
  };

  // Create Routine Submit
  const handleCreateRoutineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRoutineObj: Routine = {
      id: 'rot-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      targetGroup: newTarget,
      durationMinutes: newDuration,
      description: newDescription.trim() || 'Rutina personalizada para preparación física.',
      exercises: newRoutineExercises.filter(ex => ex.name.trim() !== '')
    };

    setRoutines(prev => [newRoutineObj, ...prev]);
    setShowCreateRoutineModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewRoutineExercises([]);
  };

  const handleDeleteRoutine = async (id: string) => {
    const targetRot = routines.find(r => r.id === id);
    if (!targetRot) return;

    setRoutines(prev => prev.filter(r => r.id !== id));
    if (expandedRoutineId === id) {
      setExpandedRoutineId(null);
    }

    if (supabase) {
      try {
        console.log('🗑️ Eliminando rutina de Supabase:', id, targetRot.title);
        const { error } = await supabase.from('gym_routines').delete().eq('id', id);
        if (error) {
          console.error('❌ Error al eliminar rutina (por ID):', error.message);
          await supabase.from('gym_routines').delete().eq('title', targetRot.title);
        } else {
          console.log('✅ Rutina eliminada con éxito');
        }
      } catch (err) {
        console.error('❌ Excepción al eliminar rutina:', err);
      }
    }
  };

  const handleRemoveRoutineExercise = (index: number) => {
    setNewRoutineExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteSession = async (log: GymSessionLog) => {
    if (!log) return;

    // 1. Immediate UI removal
    setRpeLogs(prev => prev.filter(item => {
      if (log.id && item.id) return String(item.id) !== String(log.id);
      if (item === log) return false;
      return true;
    }));

    if (viewingSession && (viewingSession.id === log.id || viewingSession === log)) {
      setViewingSession(null);
    }

    // 2. Delete from Supabase
    if (!supabase) return;

    try {
      const targetId = log.id;
      if (targetId && !targetId.startsWith('log-')) {
        await Promise.allSettled([
          supabase.from('gym_group_sessions_femenino_a').delete().eq('id', targetId),
          supabase.from('gym_group_sessions').delete().eq('id', targetId),
          supabase.from('gym_individual_sessions').delete().eq('id', targetId),
          supabase.from('gym_sessions').delete().eq('id', targetId)
        ]);

        if (typeof targetId === 'string' && /^\d+$/.test(targetId)) {
          const numId = parseInt(targetId, 10);
          await Promise.allSettled([
            supabase.from('gym_group_sessions_femenino_a').delete().eq('id', numId),
            supabase.from('gym_group_sessions').delete().eq('id', numId),
            supabase.from('gym_individual_sessions').delete().eq('id', numId),
            supabase.from('gym_sessions').delete().eq('id', numId)
          ]);
        }
      }

      // Also delete by matching routine name and session date
      const matchRoutine = log.routine;
      const matchDate = log.date;
      if (matchRoutine && matchDate) {
        await Promise.allSettled([
          supabase.from('gym_group_sessions').delete().eq('routine', matchRoutine).eq('date', matchDate),
          supabase.from('gym_group_sessions').delete().eq('routine_title', matchRoutine).eq('session_date', matchDate),
          supabase.from('gym_individual_sessions').delete().eq('routine', matchRoutine).eq('date', matchDate),
          supabase.from('gym_individual_sessions').delete().eq('routine_title', matchRoutine).eq('session_date', matchDate),
          supabase.from('gym_sessions').delete().eq('routine', matchRoutine).eq('date', matchDate)
        ]);
      }
    } catch (e) {
      console.error('Error al eliminar sesión de Supabase:', e);
    }
  };

  const exportSessionToPDF = (session: GymSessionLog) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Top header band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 26, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text((session.routine || 'SESIÓN DE ENTRENAMIENTO').toUpperCase(), 14, 14);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const sessionLabel = session.sessionType === 'group' ? 'SESIÓN GRUPAL' : 'SESIÓN INDIVIDUAL';
      const teamLabel = selectedTeam?.name ? ` • ${selectedTeam.name.toUpperCase()}` : '';
      doc.text(`REGISTRO DE GIMNASIO - ${sessionLabel}${teamLabel}`, 14, 21);

      // Metadata card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(14, 32, 182, 22, 3, 3, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      
      const formattedDate = session.date && session.date.includes('-')
        ? session.date.split('-').reverse().join('/')
        : session.date || '-';

      doc.setFont('helvetica', 'bold');
      doc.text('FECHA:', 18, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(formattedDate, 32, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('ASIGNACIÓN:', 70, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(session.playerName || 'Grupo', 95, 40);

      if (session.mesocycle) {
        doc.setFont('helvetica', 'bold');
        doc.text('MESOCICLO:', 140, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(session.mesocycle, 163, 40);
      }

      if (session.microcycle) {
        doc.setFont('helvetica', 'bold');
        doc.text('MICROCICLO:', 18, 48);
        doc.setFont('helvetica', 'normal');
        doc.text(session.microcycle, 40, 48);
      }

      let y = 60;

      // Participating players list
      if (session.participatingPlayers && session.participatingPlayers.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`JUGADORAS PARTICIPANTES (${session.participatingPlayers.length}):`, 14, y);
        y += 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const playersText = session.participatingPlayers.join(', ');
        const splitText = doc.splitTextToSize(playersText, 182);
        doc.text(splitText, 14, y);
        y += (splitText.length * 4) + 6;
      }

      // Block A: Activation
      if (session.activationExercises && session.activationExercises.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text('BLOQUE A: ACTIVACIÓN', 14, y);
        y += 3;

        const activationTableData = session.activationExercises.map((item, idx) => {
          const vUrl = item.videoUrl || item.exercise?.videoUrl || '';
          return [
            `${idx + 1}. ${item.exercise?.name || 'Ejercicio'}`,
            `${item.sets || '-'}`,
            `${item.reps || '-'}`,
            `${item.load || '-'}`,
            `${item.rest || '-'}`,
            vUrl ? '' : '-'
          ];
        });

        autoTable(doc, {
          startY: y,
          head: [['Ejercicio', 'Series', 'Reps', 'Carga', 'Descanso', 'Vídeo']],
          body: activationTableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 22 },
            3: { halign: 'center', cellWidth: 22 },
            4: { halign: 'center', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 25 }
          },
          margin: { left: 14, right: 14 },
          styles: { cellPadding: 2.5 },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const item = session.activationExercises?.[data.row.index];
              const vUrl = item?.videoUrl || item?.exercise?.videoUrl;
              if (vUrl) {
                const cx = data.cell.x + data.cell.width / 2;
                const cy = data.cell.y + data.cell.height / 2;
                
                // YouTube Red Badge
                doc.setFillColor(255, 0, 0);
                doc.roundedRect(cx - 7, cy - 3, 14, 6, 1.5, 1.5, 'F');
                
                // White Play Triangle
                doc.setFillColor(255, 255, 255);
                doc.triangle(
                  cx - 1.5, cy - 1.8,
                  cx + 2.2, cy,
                  cx - 1.5, cy + 1.8,
                  'F'
                );
                
                // Clickable Link
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: vUrl });
              }
            }
          }
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Block B: Main Block
      if (session.mainBlockExercises && session.mainBlockExercises.length > 0) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(3, 105, 161); // sky-700
        doc.text('BLOQUE B: BLOQUE PRINCIPAL', 14, y);
        y += 3;

        const mainTableData = session.mainBlockExercises.map((item, idx) => {
          const vUrl = item.videoUrl || item.exercise?.videoUrl || '';
          return [
            `${idx + 1}. ${item.exercise?.name || 'Ejercicio'}`,
            `${item.sets || '-'}`,
            `${item.reps || '-'}`,
            `${item.load || '-'}`,
            `${item.rest || '-'}`,
            vUrl ? '' : '-'
          ];
        });

        autoTable(doc, {
          startY: y,
          head: [['Ejercicio', 'Series', 'Reps', 'Carga', 'Descanso', 'Vídeo']],
          body: mainTableData,
          theme: 'grid',
          headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 22 },
            3: { halign: 'center', cellWidth: 22 },
            4: { halign: 'center', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 25 }
          },
          margin: { left: 14, right: 14 },
          styles: { cellPadding: 2.5 },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const item = session.mainBlockExercises?.[data.row.index];
              const vUrl = item?.videoUrl || item?.exercise?.videoUrl;
              if (vUrl) {
                const cx = data.cell.x + data.cell.width / 2;
                const cy = data.cell.y + data.cell.height / 2;
                
                // YouTube Red Badge
                doc.setFillColor(255, 0, 0);
                doc.roundedRect(cx - 7, cy - 3, 14, 6, 1.5, 1.5, 'F');
                
                // White Play Triangle
                doc.setFillColor(255, 255, 255);
                doc.triangle(
                  cx - 1.5, cy - 1.8,
                  cx + 2.2, cy,
                  cx - 1.5, cy + 1.8,
                  'F'
                );
                
                // Clickable Link
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: vUrl });
              }
            }
          }
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Footer line
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} - Página ${i} de ${pageCount}`, 14, 287);
      }

      const cleanFileName = (session.routine || 'Sesion_Gimnasio').replace(/[^a-zA-Z0-9_\-]/g, '_');
      doc.save(`${cleanFileName}_${session.date || 'fecha'}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Hubo un problema al generar el archivo PDF.');
    }
  };

  const handleDeleteRpeLog = (index: number) => {
    setRpeLogs(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddRpeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogPlayer.trim()) return;
    setRpeLogs(prev => [
      {
        playerName: newLogPlayer.trim(),
        routine: newLogRoutine,
        rpe: newLogRPE,
        weight: newLogWeight.trim() || 'Estándar',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()
      },
      ...prev
    ]);
    setNewLogPlayer('');
    setNewLogWeight('');
  };

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL DE NAVEGACIÓN (GRUPAL | INDIVIDUAL | BIBLIOTECA) */}
      <div className="bg-slate-900 text-white rounded-2xl p-2 shadow-md border border-slate-800 w-full flex items-center">
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl w-full">
          <button
            type="button"
            onClick={() => setTopMode('grupo')}
            className={`flex-1 px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              topMode === 'grupo'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            GRUPAL
          </button>

          <button
            type="button"
            onClick={() => setTopMode('individual')}
            className={`flex-1 px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              topMode === 'individual'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <User className="w-4 h-4" />
            INDIVIDUAL
          </button>

          <button
            type="button"
            onClick={() => setTopMode('biblioteca')}
            className={`flex-1 px-5 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              topMode === 'biblioteca'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            BIBLIOTECA
          </button>
        </div>
      </div>

      {/* BOTÓN NUEVA SESIÓN (Fuera del banner, situado en la parte inferior a la izquierda) */}
      {topMode === 'grupo' && (
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={() => {
              setEditingSessionId(null);
              const teamName = selectedTeam ? selectedTeam.name : 'Equipo';
              setSessionTitle(`Sesión Gimnasio — ${teamName}`);
              setSessionDate(new Date().toISOString().split('T')[0]);
              setSessionMesocycle('M1');
              setSessionMicrocycle('MICROCICLO 1');
              setSessionTypeCategory('ST1');
              setActivationExercises([]);
              setMainBlockExercises([]);
              setSelectedSessionPlayers(players.map(p => p.id));
              if (players.length > 0) {
                setSessionPlayerId(players[0].id);
              }
              setIsCreatingSession(true);
            }}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Sesión</span>
          </button>
        </div>
      )}

      {/* VISTA 1: GRUPO (PLANTILLA COMPLETA) */}
      {topMode === 'grupo' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Group Session History */}
          {(() => {
            const teamPlayerIds = new Set(players.map(p => p.id));
            const teamPlayerNames = new Set(players.map(p => (p.nombre ? `${p.nombre} ${p.apellidos || ''}` : p.name).toLowerCase().trim()));

            const groupLogs = rpeLogs.filter(log => {
              if (log.sessionType && log.sessionType !== 'group') return false;
              if (!selectedTeam) return true;

              const currentTeamId = selectedTeam.id;
              const currentTeamName = selectedTeam.name.toLowerCase().trim();

              // 1. Direct teamId match
              if (log.teamId && currentTeamId && log.teamId === currentTeamId) {
                return true;
              }

              // 2. Direct teamName match or check if it explicitly matches another team
              if (log.teamName) {
                const logTeamName = log.teamName.toLowerCase().trim();
                if (logTeamName === currentTeamName) return true;
                const isOtherTeam = teams.some(t => t.id !== selectedTeam.id && logTeamName.includes(t.name.toLowerCase().trim()));
                if (isOtherTeam) return false;
              }

              // 3. Match by log.playerName containing selectedTeam.name
              if (log.playerName) {
                const logPlayerNameLower = log.playerName.toLowerCase();
                if (logPlayerNameLower.includes(currentTeamName)) {
                  return true;
                }
                const mentionsOtherTeam = teams.some(t => 
                  t.id !== selectedTeam.id && logPlayerNameLower.includes(t.name.toLowerCase().trim())
                );
                if (mentionsOtherTeam) {
                  return false;
                }
              }

              // 4. Check participating players
              if (log.participatingPlayers && log.participatingPlayers.length > 0) {
                const hasAnyMatchingPlayer = log.participatingPlayers.some(pName => 
                  teamPlayerNames.has(pName.toLowerCase().trim())
                );
                if (hasAnyMatchingPlayer) return true;
                if (players.length > 0) return false;
              }

              // 5. Check if single player belongs to current team
              if (log.playerId) {
                return teamPlayerIds.has(log.playerId);
              }

              return false;
            });

            const isSessionInMicrocycle = (log: GymSessionLog, mcNum: number): boolean => {
              if (!log.microcycle) {
                return mcNum === 1;
              }
              const raw = log.microcycle.toUpperCase().trim();
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

            const toggleMicrocycle = (mcNum: number) => {
              setOpenMicrocycles(prev => ({
                ...prev,
                [mcNum]: !prev[mcNum]
              }));
            };

            return (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      SESIONES {isFemeninoA ? '— ATB FEMENINO A' : ''}
                    </h4>
                  </div>
                </div>

                {/* ARCHIVADOR DE MICROCICLOS (MICROCICLO 1 AL MICROCICLO 40) */}
                <div className="space-y-2 pt-1 max-h-[600px] overflow-y-auto pr-1">
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((mcNum) => {
                    const mcLogs = groupLogs.filter((log) => isSessionInMicrocycle(log, mcNum));
                    const isOpen = !!openMicrocycles[mcNum];

                    return (
                      <div
                        key={mcNum}
                        className="border border-slate-200/90 rounded-2xl overflow-hidden transition-all bg-white shadow-2xs"
                      >
                        {/* CABECERA DEL MICROCICLO */}
                        <button
                          type="button"
                          onClick={() => toggleMicrocycle(mcNum)}
                          className={`w-full p-3.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isOpen
                              ? 'bg-sky-50/70 border-b border-sky-100'
                              : 'bg-slate-50/80 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl transition-colors ${
                                isOpen
                                  ? 'bg-sky-500 text-white'
                                  : mcLogs.length > 0
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-slate-200/80 text-slate-500'
                              }`}
                            >
                              {isOpen ? (
                                <FolderOpen className="w-4 h-4" />
                              ) : (
                                <Folder className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 tracking-wide block uppercase">
                                MICROCICLO {mcNum}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {mcLogs.length} {mcLogs.length === 1 ? 'sesión adjunta' : 'sesiones adjuntas'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {mcLogs.length > 0 && (
                              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-black rounded-lg border border-sky-200">
                                {mcLogs.length} {mcLogs.length === 1 ? 'Sesión' : 'Sesiones'}
                              </span>
                            )}
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* CONTENIDO DEL MICROCICLO (SESIONES ATRIBUIDAS) */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 bg-slate-50/50 space-y-2 border-t border-slate-100">
                                {mcLogs.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-4 text-center bg-white/60 rounded-xl border border-dashed border-slate-200">
                                    No hay sesiones adjuntas a este microciclo.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {mcLogs.map((log, idx) => (
                                      <div
                                        key={log.id || idx}
                                        onClick={() => setViewingSession(log)}
                                        className="p-3.5 bg-white hover:bg-sky-50/60 hover:border-sky-300 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs gap-3 transition-all cursor-pointer group/item shadow-2xs"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-extrabold text-slate-900 text-xs truncate group-hover/item:text-sky-700 transition-colors">
                                              {log.routine}
                                            </span>
                                            <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 font-black rounded-lg text-[10px] uppercase tracking-wide">
                                              {log.playerName || 'Jugadora'}
                                            </span>
                                            {log.sessionTypeCategory && (
                                              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-black rounded-lg text-[10px] uppercase tracking-wide border border-indigo-200">
                                                TIPO: {log.sessionTypeCategory}
                                              </span>
                                            )}
                                            {!log.sessionTypeCategory && log.mesocycle && (
                                              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-black rounded-lg text-[10px] uppercase tracking-wide">
                                                {log.mesocycle}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-500 font-medium block">
                                            Fecha: {log.date && log.date.includes('-') ? log.date.split('-').reverse().join('/') : log.date} • {log.weight || '—'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                          <span className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-black rounded-xl text-xs border border-sky-200/80 flex items-center gap-1.5 transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Ver Detalles
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleOpenEditSessionModal(log);
                                            }}
                                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-xl text-xs border border-amber-200/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                            title="Editar esta sesión"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              setSessionToDelete(log);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                            title="Eliminar registro de sesión"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
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
              </div>
            );
          })()}
        </div>
      )}

      {/* VISTA 2: INDIVIDUAL (JUGADORA SELECCIONADA) */}
      {topMode === 'individual' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-500" />
                Trabajo de Gimnasio Individualizado — Selecciona Jugadora
              </h2>
              <span className="text-xs text-slate-500 font-semibold">{players.length} jugadoras en plantilla</span>
            </div>

            {/* Dropdown Selector of Players */}
            {players.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No hay jugadoras en la plantilla seleccionada.</p>
            ) : (
              <div className="relative max-w-md">
                <select
                  id="gym-player-select"
                  value={selectedPlayerForGym?.id || ''}
                  onChange={(e) => {
                    const found = players.find((p) => p.id === e.target.value);
                    setSelectedPlayerForGym(found || null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 p-3 pr-10 cursor-pointer appearance-none shadow-xs transition-all"
                >
                  <option value="">-- Selecciona una jugadora --</option>
                  {players.map((p) => {
                    const displayName = p.nombre ? `${p.nombre} ${p.apellidos || ''}` : p.name;
                    const dorsal = p.dorsal || p.number ? `#${p.dorsal || p.number}` : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {dorsal ? `${dorsal} - ` : ''}{displayName}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>

          {/* Selected Player Detail Card */}
          {selectedPlayerForGym ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Player Info Summary */}
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="text-center pb-4 border-b border-slate-100">
                  {selectedPlayerForGym.image ? (
                    <img
                      src={selectedPlayerForGym.image}
                      alt={selectedPlayerForGym.name}
                      className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-sky-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-900 text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 border-4 border-slate-100 shadow-sm">
                      #{selectedPlayerForGym.dorsal || selectedPlayerForGym.number || '?'}
                    </div>
                  )}
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedPlayerForGym.nombre ? `${selectedPlayerForGym.nombre} ${selectedPlayerForGym.apellidos || ''}` : selectedPlayerForGym.name}
                  </h3>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 inline-block mt-1">
                    {selectedPlayerForGym.demarcacion || selectedPlayerForGym.position || 'Jugadora'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Equipo:</span>
                    <span className="font-bold text-slate-800">{selectedTeam?.name || 'Real Femenino'}</span>
                  </div>
                  {selectedPlayerForGym.height && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Altura:</span>
                      <span className="font-bold text-slate-800">{selectedPlayerForGym.height}</span>
                    </div>
                  )}
                  {selectedPlayerForGym.fecha_nacimiento && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">F. Nacimiento:</span>
                      <span className="font-bold text-slate-800">{selectedPlayerForGym.fecha_nacimiento}</span>
                    </div>
                  )}
                  {selectedPlayerForGym.observaciones && (
                    <div className="pt-2">
                      <span className="text-slate-500 font-medium block mb-1">Notas físicas:</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl text-slate-600 italic border border-slate-200">
                        {selectedPlayerForGym.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Individual Gym Work & Logs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Crear Sesión Single Button */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Activity className="w-4 h-4 text-sky-500" />
                    <span>Sesión de Gimnasio para {selectedPlayerForGym.nombre || selectedPlayerForGym.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSessionTitle('Mi Sesión de Entrenamiento');
                      setSessionDate(new Date().toISOString().split('T')[0]);
                      setSessionPlayerId(selectedPlayerForGym?.id || (players[0]?.id || ''));
                      setSelectedSessionPlayers(selectedPlayerForGym ? [selectedPlayerForGym.id] : players.map(p => p.id));
                      setSessionMesocycle('M1');
                      setSessionMicrocycle('SEMANA 1');
                      setActivationExercises([]);
                      setMainBlockExercises([]);
                      setIsCreatingSession(true);
                    }}
                    className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear sesión
                  </button>
                </div>

                {/* Logs History for this Player */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-500" />
                    Historial de Sesiones de Gimnasio
                  </h4>

                  {(() => {
                    const pName = selectedPlayerForGym.nombre ? `${selectedPlayerForGym.nombre} ${selectedPlayerForGym.apellidos || ''}` : selectedPlayerForGym.name;
                    const playerLogs = rpeLogs.filter(log => 
                      (log.playerId && log.playerId === selectedPlayerForGym.id) ||
                      (log.playerName && log.playerName.toLowerCase() === pName.toLowerCase())
                    );

                    if (playerLogs.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No hay registros de gimnasio guardados para {pName} todavía.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {playerLogs.map((log, idx) => (
                          <div
                            key={log.id || idx}
                            onClick={() => setViewingSession(log)}
                            className="p-3 bg-slate-50 hover:bg-sky-50/60 hover:border-sky-300 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs gap-3 transition-all cursor-pointer group/item"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block group-hover/item:text-sky-700 transition-colors">
                                {log.routine}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {log.date && log.date.includes('-') ? log.date.split('-').reverse().join('/') : log.date} — {log.weight}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold rounded-lg text-xs border border-sky-200/80 flex items-center gap-1 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleOpenEditSessionModal(log);
                                }}
                                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar sesión"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSessionToDelete(log);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Historial de Informes de la Jugadora */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-500" />
                      Historial de Informes
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setNewReport({
                          title: '',
                          date: new Date().toISOString().split('T')[0],
                          category: 'Valoración Física',
                          notes: '',
                          fileName: '',
                          fileUrl: '',
                          fileType: 'pdf'
                        });
                        setShowAddReportModal(true);
                      }}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Informe
                    </button>
                  </div>

                  {(() => {
                    const pName = selectedPlayerForGym.nombre 
                      ? `${selectedPlayerForGym.nombre} ${selectedPlayerForGym.apellidos || ''}` 
                      : selectedPlayerForGym.name;

                    // Filter by player and sort chronologically by date descending
                    const playerReports = individualReports
                      .filter(r => r.playerId === selectedPlayerForGym.id || (r.playerName && r.playerName.toLowerCase() === pName.toLowerCase()))
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (playerReports.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No hay informes adjuntos para {pName} todavía.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {playerReports.map((report) => (
                          <div
                            key={report.id}
                            className="p-3.5 bg-slate-50 hover:bg-sky-50/50 hover:border-sky-300 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs gap-3 transition-all group/report"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2.5 rounded-xl shrink-0 ${
                                report.fileType === 'pdf' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}>
                                {report.fileType === 'pdf' ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 group-hover/report:text-sky-700 transition-colors truncate">
                                    {report.title}
                                  </span>
                                  {report.category && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 uppercase tracking-wider">
                                      {report.category}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-semibold text-slate-700">
                                    {report.date && report.date.includes('-') ? report.date.split('-').reverse().join('/') : report.date}
                                  </span>
                                  {report.fileName && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[160px] text-slate-400">{report.fileName}</span>
                                    </>
                                  )}
                                </div>
                                {report.notes && (
                                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                                    "{report.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {report.fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewingReportModal(report)}
                                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold rounded-lg text-xs border border-sky-200/80 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar informe"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Selecciona una jugadora en la barra superior para ver su ficha individual.</p>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: BIBLIOTECA DE EJERCICIOS */}
      {topMode === 'biblioteca' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Navigation & Search Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón con Desplegable Integrado para Biblioteca de Ejercicios */}
              <div className="flex items-center gap-2 bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                <Dumbbell className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Biblioteca de Ejercicios ({exercises.length})</span>
                <span className="text-sky-300 font-normal">|</span>
                <select
                  value={selectedStimulusFilter}
                  onChange={(e) => {
                    setSelectedStimulusFilter(e.target.value);
                    if (e.target.value && selectedChainFilter === '') {
                      setSelectedChainFilter('TODOS');
                    }
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white border border-sky-400 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-800 text-white">-- Estímulo --</option>
                  <option value="Fuerza" className="bg-slate-800 text-white">Fuerza</option>
                  <option value="Pliometría" className="bg-slate-800 text-white">Pliometría</option>
                  <option value="TODOS" className="bg-slate-800 text-white">Todos los Estímulos</option>
                </select>
              </div>

              {/* 2º Desplegable: Cadena Muscular (aparece tras seleccionar estímulo) */}
              {selectedStimulusFilter !== '' && (
                <div className="flex items-center gap-2 bg-sky-50 text-sky-900 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs animate-fadeIn">
                  <Layers className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="whitespace-nowrap">Cadena Muscular:</span>
                  <select
                    value={selectedChainFilter}
                    onChange={(e) => setSelectedChainFilter(e.target.value)}
                    className="bg-white border border-sky-300 text-sky-900 text-xs font-bold rounded-lg px-2.5 py-1 outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="TODOS">Todas las Cadenas</option>
                    <option value="Cadena Anterior">Cadena Anterior</option>
                    <option value="Cadena Posterior">Cadena Posterior</option>
                    <option value="Cadena Interna">Cadena Interna</option>
                    <option value="Cadena Externa">Cadena Externa</option>
                    <option value="CORE">CORE</option>
                    <option value="Tren Superior">Tren Superior</option>
                    <option value="Mix">Mix</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ejercicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500 w-52 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenCreateExerciseModal}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                title="Crear un nuevo ejercicio en la biblioteca"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Ejercicio</span>
              </button>
            </div>
          </div>

      {/* TAB 1: BIBLIOTECA DE EJERCICIOS */}
      {activeTab === 'ejercicios' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Exercises */}
            <div className="lg:col-span-1 space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {filteredExercises.map((ex) => {
                const isSelected = selectedExerciseId === ex.id;
                const stimulus = ex.stimulus || 'Fuerza';
                const chain = ex.muscleChain || ex.category || 'Cadena Anterior';

                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExerciseId(ex.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        stimulus === 'Pliometría'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {stimulus}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {chain}
                      </span>
                      {ex.videoUrl && (
                        <span className="ml-auto text-sky-600 flex items-center gap-1 text-[10px] font-bold">
                          <Video className="w-3 h-3" />
                          Vídeo
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 mb-1 truncate">{ex.name}</h3>
                        {(ex.description || ex.notes) && (
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                            {ex.description || ex.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditExerciseModal(ex);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Editar ejercicio de la biblioteca"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExercise(ex.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar ejercicio de la biblioteca"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredExercises.length === 0 && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 space-y-3">
                  <Dumbbell className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs font-semibold">No se encontraron ejercicios en esta categoría.</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateExerciseModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Ejercicio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Exercise Detail View */}
            <div className="lg:col-span-2">
              {selectedExerciseId ? (() => {
                const ex = exercises.find(e => e.id === selectedExerciseId);
                if (!ex) return null;
                const embedUrl = getYouTubeEmbedUrl(ex.videoUrl);
                const stimulus = ex.stimulus || 'Fuerza';
                const chain = ex.muscleChain || ex.category || 'Cadena Anterior';

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs sticky top-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            stimulus === 'Pliometría'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}>
                            Estímulo: {stimulus}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {chain}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{ex.name}</h2>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExerciseModal(ex)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-sky-200/80 cursor-pointer"
                          title="Editar ejercicio de la biblioteca"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                          title="Eliminar ejercicio de la biblioteca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description Section */}
                    {(ex.description || ex.notes) && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-sky-500" />
                          Descripción
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed pl-5">
                          {ex.description || ex.notes}
                        </p>
                      </div>
                    )}

                    {/* Video Player Section */}
                    {ex.videoUrl ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Video className="w-4 h-4 text-sky-500" />
                          Vídeo Demostrativo
                        </h4>
                        {embedUrl ? (
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-black shadow-sm">
                            <iframe
                              src={embedUrl}
                              title={ex.name}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-black shadow-sm">
                            <video
                              src={ex.videoUrl}
                              controls
                              className="w-full max-h-80 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
                        <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Este ejercicio no tiene un vídeo adjunto.</p>
                      </div>
                    )}

                    <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">Disponible en Biblioteca Global</p>
                        <p className="text-[10px] text-slate-400">Ejercicio registrado para la preparación física del equipo.</p>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                  <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold">Selecciona un ejercicio para consultar la ficha técnica.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* CREATE EXERCISE MODAL */}
      <AnimatePresence>
        {showCreateExerciseModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-sky-500" />
                  {editingExerciseId ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio en Biblioteca'}
                </h3>
                <button
                  onClick={() => setShowCreateExerciseModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExerciseSubmit} className="space-y-4">
                {/* Nombre del Ejercicio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Ejercicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sentadilla Goblet, Box Jump, Zancadas..."
                    value={exName}
                    onChange={(e) => setExName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500"
                  />
                </div>

                {/* Apartado de Estímulo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Estímulo *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExStimulus('Fuerza')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        exStimulus === 'Fuerza'
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Fuerza
                    </button>
                    <button
                      type="button"
                      onClick={() => setExStimulus('Pliometría')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        exStimulus === 'Pliometría'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Pliometría
                    </button>
                  </div>
                </div>

                {/* Cadena Muscular */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cadena Muscular *</label>
                  <select
                    value={exMuscleChain}
                    onChange={(e) => setExMuscleChain(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-sky-500"
                  >
                    <option value="Cadena Anterior">Cadena Anterior</option>
                    <option value="Cadena Posterior">Cadena Posterior</option>
                    <option value="Cadena Interna">Cadena Interna</option>
                    <option value="Cadena Externa">Cadena Externa</option>
                    <option value="CORE">CORE</option>
                    <option value="Tren Superior">Tren Superior</option>
                    <option value="Mix">Mix</option>
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    placeholder="Descripción detallada del ejercicio, técnica, pautas de ejecución o notas previas..."
                    value={exDescription}
                    onChange={(e) => setExDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-sky-500"
                  />
                </div>

                {/* Insertar Vídeo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-sky-500" />
                      Insertar Vídeo
                    </label>
                    
                    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setExVideoType('youtube')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                          exVideoType === 'youtube' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        <Play className="w-3 h-3 text-red-500 fill-red-500" />
                        YouTube
                      </button>
                      <button
                        type="button"
                        onClick={() => setExVideoType('file')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                          exVideoType === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        <Upload className="w-3 h-3 text-sky-500" />
                        Subir Archivo
                      </button>
                    </div>
                  </div>

                  {exVideoType === 'youtube' ? (
                    <div>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..., https://youtu.be/... o Shorts"
                        value={exYoutubeUrl}
                        onChange={(e) => setExYoutubeUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-sky-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Soporta vídeos de YouTube y YouTube Shorts.
                      </p>
                      {exYoutubeUrl && getYouTubeEmbedUrl(exYoutubeUrl) && (
                        <div className="mt-2 relative aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-black">
                          <iframe
                            src={getYouTubeEmbedUrl(exYoutubeUrl)!}
                            title="Vista previa YouTube"
                            className="w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setExVideoFile({ url, name: file.name });
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 cursor-pointer"
                      />
                      {exVideoFile && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            ✓ Vídeo cargado: {exVideoFile.name}
                          </p>
                          <video src={exVideoFile.url} controls className="w-full max-h-40 rounded-lg bg-black" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateExerciseModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 text-white font-bold text-xs rounded-xl hover:bg-sky-400 shadow-sm"
                  >
                    {editingExerciseId ? 'Guardar Cambios' : 'Guardar Ejercicio'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE SESSION MODAL FORM */}
      <AnimatePresence>
        {isCreatingSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-slate-100 rounded-3xl p-6 max-w-4xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto space-y-6 border border-slate-200"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsCreatingSession(false)}
                className="absolute top-5 right-5 p-2 bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-colors shadow-xs z-10 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. HEADER CARD (Mi Sesión de Entrenamiento) */}
              <div className="bg-white rounded-3xl p-6 border-l-4 border-l-slate-900 border border-slate-200/80 shadow-xs space-y-4">
                <div className="pr-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                      {editingSessionId ? 'Editar Sesión' : 'Nueva Sesión'}
                    </span>
                  </div>
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                      className="text-2xl font-black text-slate-900 bg-slate-50 border-2 border-sky-500 rounded-xl px-3 py-1 outline-none w-full max-w-md"
                      autoFocus
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingTitle(true)}
                      className="text-2xl font-black text-slate-900 tracking-tight cursor-pointer hover:text-sky-600 transition-colors inline-block"
                      title="Haz clic para renombrar esta sesión"
                    >
                      {sessionTitle}
                    </h2>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Fecha de la Sesión */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="whitespace-nowrap">Fecha:</span>
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-900 font-extrabold px-2.5 py-1 rounded-lg outline-none cursor-pointer text-xs"
                      />
                    </div>

                    {/* Asignar Jugadora Principal (solo en modo individual) - HIDE if we already have it in state from Vista 2 */}
                    {topMode === 'grupo' ? null : null}

                    {/* Para FEMENINO A: TIPO (ST1, ST2-I, ST2-II, ST3, TREN SUPERIOR, CORE, PRIMING, REGENERATIVA, ESTRUCTURAL, COMBINADA). Para otras plantillas: Mesociclo */}
                    {isFemeninoA && topMode === 'grupo' ? (
                      <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-sky-900">
                        <Tag className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="whitespace-nowrap font-black">TIPO:</span>
                        <select
                          value={sessionTypeCategory}
                          onChange={(e) => setSessionTypeCategory(e.target.value)}
                          className="bg-white border border-sky-300 text-sky-950 font-extrabold px-2.5 py-1 rounded-lg outline-none cursor-pointer text-xs uppercase shadow-2xs"
                        >
                          <option value="ST1">ST1</option>
                          <option value="ST2-I">ST2-I</option>
                          <option value="ST2-II">ST2-II</option>
                          <option value="ST3">ST3</option>
                          <option value="TREN SUPERIOR">TREN SUPERIOR</option>
                          <option value="CORE">CORE</option>
                          <option value="PRIMING">PRIMING</option>
                          <option value="REGENERATIVA">REGENERATIVA</option>
                          <option value="ESTRUCTURAL">ESTRUCTURAL</option>
                          <option value="COMBINADA">COMBINADA</option>
                        </select>
                      </div>
                    ) : topMode === 'grupo' ? (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="whitespace-nowrap">Mesociclo:</span>
                        <select
                          value={sessionMesocycle}
                          onChange={(e) => setSessionMesocycle(e.target.value)}
                          className="bg-white border border-slate-200 text-slate-900 font-extrabold px-2.5 py-1 rounded-lg outline-none cursor-pointer text-xs"
                        >
                          <option value="M1">M1</option>
                          <option value="M2">M2</option>
                          <option value="M3">M3</option>
                          <option value="M4">M4</option>
                          <option value="M5">M5</option>
                        </select>
                      </div>
                    ) : null}

                    {/* Microciclo */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
                      <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="whitespace-nowrap">Microciclo:</span>
                      <select
                        value={sessionMicrocycle}
                        onChange={(e) => setSessionMicrocycle(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-900 font-extrabold px-2.5 py-1 rounded-lg outline-none cursor-pointer text-xs uppercase"
                      >
                        {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={`MICROCICLO ${num}`}>
                            MICROCICLO {num}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE DE JUGADORAS PARTICIPANTES DE LA PLANTILLA */}
              {topMode === 'grupo' && (
                <div className="bg-white border-l-4 border-l-sky-500 border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
                  <div className="bg-sky-50/40 p-4 border-b border-sky-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                          Jugadoras Participantes ({selectedSessionPlayers.length} / {players.length})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Marca las jugadoras que realizarán esta sesión de entrenamiento
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSessionPlayers.length === players.length) {
                            setSelectedSessionPlayers([]);
                          } else {
                            setSelectedSessionPlayers(players.map(p => p.id));
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {selectedSessionPlayers.length === players.length ? (
                          <>
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            Desmarcar Todas
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                            Seleccionar Todas ({players.length})
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    {players.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        No hay jugadoras en la plantilla seleccionada.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {players.map((player) => {
                          const isSelected = selectedSessionPlayers.includes(player.id);
                          const displayName = player.nombre ? `${player.nombre} ${player.apellidos || ''}` : player.name;
                          const dorsal = player.dorsal || player.number || '#';

                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => {
                                setSelectedSessionPlayers(prev =>
                                  prev.includes(player.id)
                                    ? prev.filter(id => id !== player.id)
                                    : [...prev, player.id]
                                );
                              }}
                              className={`flex items-center gap-2 p-2 rounded-2xl text-xs font-bold transition-all border text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-2xs ring-1 ring-sky-300'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-400 hover:bg-slate-100 opacity-60'
                              }`}
                            >
                              {player.image ? (
                                <img
                                  src={player.image}
                                  alt={displayName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <div className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  #{dorsal}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold truncate leading-tight">
                                  {displayName}
                                </p>
                                <span className="text-[9px] font-semibold text-slate-400 block truncate">
                                  #{dorsal}
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-sky-500 text-white' : 'border border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. BLOCK A: ACTIVACIÓN */}
              <div className="bg-white border-l-4 border-l-amber-400 border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
                <div className="bg-amber-50/40 p-4 border-b border-amber-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                      A
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-wide">ACTIVACIÓN</h3>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-3.5 py-1 rounded-full border border-amber-200/80 shrink-0">
                    {activationExercises.length} ejercicios
                  </span>
                </div>

                <div className="p-4 sm:p-6 text-center">
                  {activationExercises.length === 0 ? (
                    <div className="space-y-2 py-4">
                      <Sparkles className="w-8 h-8 text-amber-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">Bloque de Activación Vacío</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                        Arrastra ejercicios del catálogo o pulsa el botón "Añadir ejercicios".
                      </p>
                      <button
                        onClick={() => setShowAddPicker(showAddPicker === 'activation' ? null : 'activation')}
                        className="mt-3 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir ejercicios
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 text-left">
                      {activationExercises.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                        >
                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {item.exercise.name}
                            </h4>
                          </div>

                          {/* Inputs & Actions */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                SERIES
                              </span>
                              <input
                                type="text"
                                value={item.sets}
                                onChange={(e) => updateExerciseParam('activation', item.id, 'sets', e.target.value)}
                                className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                REPS/TIEMPO
                              </span>
                              <input
                                type="text"
                                value={item.reps}
                                onChange={(e) => updateExerciseParam('activation', item.id, 'reps', e.target.value)}
                                className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                CARGA/INTENSIDAD
                              </span>
                              <input
                                type="text"
                                value={item.load}
                                onChange={(e) => updateExerciseParam('activation', item.id, 'load', e.target.value)}
                                className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                DESCANSO
                              </span>
                              <input
                                type="text"
                                value={item.rest}
                                onChange={(e) => updateExerciseParam('activation', item.id, 'rest', e.target.value)}
                                className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                VÍDEO
                              </span>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={item.videoUrl || ''}
                                  onChange={(e) => updateExerciseParam('activation', item.id, 'videoUrl', e.target.value)}
                                  className="w-28 pl-2 pr-7 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-sky-500 placeholder:text-slate-300 truncate"
                                />
                                {(item.videoUrl || item.exercise.videoUrl) && (
                                  <a
                                    href={item.videoUrl || item.exercise.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-1.5 p-1 text-sky-600 hover:text-sky-800 transition-colors"
                                    title="Abrir vídeo"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => moveExerciseInBlock('activation', idx, 'up')}
                                  disabled={idx === 0}
                                  className="text-slate-300 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveExerciseInBlock('activation', idx, 'down')}
                                  disabled={idx === activationExercises.length - 1}
                                  className="text-slate-300 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeExerciseFromBlock('activation', item.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => setShowAddPicker(showAddPicker === 'activation' ? null : 'activation')}
                          className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Añadir otro ejercicio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. BLOCK B1: BLOQUE PRINCIPAL */}
              <div className="bg-white border-l-4 border-l-sky-500 border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
                <div className="bg-sky-50/40 p-4 border-b border-sky-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center shrink-0">
                      B1
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-wide">BLOQUE PRINCIPAL</h3>
                    </div>
                  </div>
                  <span className="bg-sky-100 text-sky-900 font-extrabold text-xs px-3.5 py-1 rounded-full border border-sky-200/80 shrink-0">
                    {mainBlockExercises.length} ejercicios
                  </span>
                </div>

                <div className="p-4 sm:p-6 text-center">
                  {mainBlockExercises.length === 0 ? (
                    <div className="space-y-2 py-4">
                      <Dumbbell className="w-8 h-8 text-sky-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">Bloque Principal Vacío</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                        Arrastra ejercicios del catálogo o pulsa el botón "Añadir ejercicios".
                      </p>
                      <button
                        onClick={() => setShowAddPicker(showAddPicker === 'main' ? null : 'main')}
                        className="mt-3 px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir ejercicios
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 text-left">
                      {mainBlockExercises.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                        >
                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {item.exercise.name}
                            </h4>
                          </div>

                          {/* Inputs & Actions */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                SERIES
                              </span>
                              <input
                                type="text"
                                value={item.sets}
                                onChange={(e) => updateExerciseParam('main', item.id, 'sets', e.target.value)}
                                className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                REPS/TIEMPO
                              </span>
                              <input
                                type="text"
                                value={item.reps}
                                onChange={(e) => updateExerciseParam('main', item.id, 'reps', e.target.value)}
                                className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                CARGA/INTENSIDAD
                              </span>
                              <input
                                type="text"
                                value={item.load}
                                onChange={(e) => updateExerciseParam('main', item.id, 'load', e.target.value)}
                                className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                DESCANSO
                              </span>
                              <input
                                type="text"
                                value={item.rest}
                                onChange={(e) => updateExerciseParam('main', item.id, 'rest', e.target.value)}
                                className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-2xl text-center text-xs font-black text-slate-900 shadow-2xs outline-none focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                                VÍDEO
                              </span>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={item.videoUrl || ''}
                                  onChange={(e) => updateExerciseParam('main', item.id, 'videoUrl', e.target.value)}
                                  className="w-28 pl-2 pr-7 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 shadow-2xs outline-none focus:border-sky-500 placeholder:text-slate-300 truncate"
                                />
                                {(item.videoUrl || item.exercise.videoUrl) && (
                                  <a
                                    href={item.videoUrl || item.exercise.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-1.5 p-1 text-sky-600 hover:text-sky-800 transition-colors"
                                    title="Abrir vídeo"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => moveExerciseInBlock('main', idx, 'up')}
                                  disabled={idx === 0}
                                  className="text-slate-300 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveExerciseInBlock('main', idx, 'down')}
                                  disabled={idx === mainBlockExercises.length - 1}
                                  className="text-slate-300 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeExerciseFromBlock('main', item.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => setShowAddPicker(showAddPicker === 'main' ? null : 'main')}
                          className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Añadir otro ejercicio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER ACTION BAR AT THE BOTTOM OF CREATE SESSION MODAL */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4 sticky bottom-0 bg-slate-100/95 backdrop-blur-md p-4 rounded-b-3xl -mx-6 -mb-6 mt-6 shadow-xs z-10">
                <button
                  type="button"
                  onClick={() => setIsCreatingSession(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const dateStr = sessionDate || new Date().toISOString().split('T')[0];

                    // Participating players marked in the squad
                    const participatingPlayers = players.filter(p => selectedSessionPlayers.includes(p.id));
                    const targetPlayers = participatingPlayers.length > 0
                      ? participatingPlayers
                      : (sessionPlayerId ? players.filter(p => p.id === sessionPlayerId) : []);

                    // Determine display player name
                    let groupDisplayName = '';
                    if (topMode === 'individual') {
                      const p = players.find(x => x.id === sessionPlayerId) || targetPlayers[0];
                      groupDisplayName = p ? (p.nombre ? `${p.nombre} ${p.apellidos || ''}` : p.name) : 'Jugadora';
                    } else {
                      const teamName = selectedTeam ? selectedTeam.name : 'Equipo';
                      if (targetPlayers.length === players.length && players.length > 0) {
                        groupDisplayName = `Plantilla Completa ${teamName} (${targetPlayers.length})`;
                      } else if (targetPlayers.length > 0) {
                        groupDisplayName = `${teamName} (${targetPlayers.length} jugadoras)`;
                      } else {
                        groupDisplayName = `Plantilla ${teamName}`;
                      }
                    }

                    const totalExercisesCount = activationExercises.length + mainBlockExercises.length;
                    const weightDisplayStr = `${totalExercisesCount} ejer. • ${targetPlayers.length} particip.`;
                    const playerNamesList = targetPlayers.map(p => p.nombre ? `${p.nombre} ${p.apellidos || ''}` : p.name);

                    const sessionDetails = {
                      mesocycle: isFemeninoA ? undefined : sessionMesocycle,
                      sessionTypeCategory: isFemeninoA ? sessionTypeCategory : undefined,
                      tipo: isFemeninoA ? sessionTypeCategory : undefined,
                      microcycle: sessionMicrocycle,
                      activationExercises,
                      mainBlockExercises,
                      participatingPlayers: playerNamesList,
                      targetPlayerIds: targetPlayers.map(p => p.id),
                      teamId: selectedTeam?.id,
                      teamName: selectedTeam?.name
                    };

                    const detailsJson = JSON.stringify(sessionDetails);
                    const tempId = editingSessionId || ('log-' + Date.now());

                    const newSingleEntry: GymSessionLog = {
                      id: tempId,
                      playerId: topMode === 'individual' ? sessionPlayerId : undefined,
                      playerName: groupDisplayName,
                      teamId: selectedTeam?.id,
                      teamName: selectedTeam?.name,
                      routine: sessionTitle || 'Sesión de Entrenamiento',
                      rpe: 8,
                      weight: weightDisplayStr,
                      date: dateStr,
                      mesocycle: isFemeninoA ? undefined : sessionMesocycle,
                      sessionTypeCategory: isFemeninoA ? sessionTypeCategory : undefined,
                      microcycle: sessionMicrocycle,
                      activationExercises: [...activationExercises],
                      mainBlockExercises: [...mainBlockExercises],
                      participatingPlayers: playerNamesList,
                      details: detailsJson,
                      sessionType: topMode === 'grupo' ? 'group' : 'individual'
                    };

                    if (editingSessionId) {
                      setRpeLogs(prev => prev.map(item => String(item.id) === String(editingSessionId) ? newSingleEntry : item));
                    } else {
                      setRpeLogs(prev => [newSingleEntry, ...prev]);
                    }

                    if (supabase) {
                      try {
                        const routineVal = sessionTitle || 'Sesión de Entrenamiento';
                        const teamVal = selectedTeam?.name || 'Equipo';
                        const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
                        
                        const rawPlayerId = topMode === 'individual' ? (sessionPlayerId || null) : null;
                        const rawTeamId = selectedTeam?.id || null;

                        const currentPayload: Record<string, any> = {
                          player_id: isUuid(rawPlayerId) ? rawPlayerId : null,
                          player_name: groupDisplayName,
                          team_name: teamVal,
                          team_id: isUuid(rawTeamId) ? rawTeamId : null,
                          team: teamVal,
                          routine: routineVal,
                          routine_title: routineVal,
                          routine_name: routineVal,
                          rpe: 8,
                          weight: weightDisplayStr,
                          date: dateStr,
                          session_date: dateStr,
                          microcycle: sessionMicrocycle,
                          type: isFemeninoA ? sessionTypeCategory : undefined,
                          session_type_category: isFemeninoA ? sessionTypeCategory : undefined,
                          tipo: isFemeninoA ? sessionTypeCategory : undefined,
                          notes: detailsJson,
                          details: detailsJson
                        };

                        if (editingSessionId && !editingSessionId.startsWith('log-')) {
                          const targetId = editingSessionId;
                          await Promise.allSettled([
                            supabase.from('gym_group_sessions_femenino_a').update(currentPayload).eq('id', targetId),
                            supabase.from('gym_group_sessions').update(currentPayload).eq('id', targetId),
                            supabase.from('gym_individual_sessions').update(currentPayload).eq('id', targetId),
                            supabase.from('gym_sessions').update(currentPayload).eq('id', targetId)
                          ]);
                          if (typeof targetId === 'string' && /^\d+$/.test(targetId)) {
                            const numId = parseInt(targetId, 10);
                            await Promise.allSettled([
                              supabase.from('gym_group_sessions_femenino_a').update(currentPayload).eq('id', numId),
                              supabase.from('gym_group_sessions').update(currentPayload).eq('id', numId),
                              supabase.from('gym_individual_sessions').update(currentPayload).eq('id', numId),
                              supabase.from('gym_sessions').update(currentPayload).eq('id', numId)
                            ]);
                          }
                        } else {
                          let targetTableName = topMode === 'grupo'
                            ? (isFemeninoA ? 'gym_group_sessions_femenino_a' : 'gym_group_sessions')
                            : 'gym_individual_sessions';
                          let data: any = null;
                          let error: any = null;

                          // Try insertion into target table first, then fallback to gym_sessions if target table missing
                          for (let attempt = 0; attempt < 7; attempt++) {
                            const res = await supabase.from(targetTableName).insert([currentPayload]).select();
                            data = res.data;
                            error = res.error;

                            if (!error) break;

                            // If table does not exist, switch to fallback table
                            if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
                              if (targetTableName === 'gym_group_sessions_femenino_a') {
                                console.warn("Tabla 'gym_group_sessions_femenino_a' no existe. Usando fallback 'gym_group_sessions'...");
                                targetTableName = 'gym_group_sessions';
                                continue;
                              } else if (targetTableName !== 'gym_sessions') {
                                console.warn(`Tabla ${targetTableName} no existe. Usando fallback 'gym_sessions'...`);
                                targetTableName = 'gym_sessions';
                                continue;
                              }
                            }

                            // Handle invalid UUID syntax error
                            if (error.message?.includes('invalid input syntax for type uuid')) {
                              if (currentPayload.team_id) {
                                delete currentPayload.team_id;
                              } else if (currentPayload.player_id) {
                                delete currentPayload.player_id;
                              }
                              continue;
                            }

                            // Check if error is due to an unknown column in the database schema
                            const missingColMatch = error.message?.match(/column "(.*?)" of relation|Could not find the '(.*?)' column/i);
                            if (missingColMatch) {
                              const missingCol = missingColMatch[1] || missingColMatch[2];
                              if (missingCol && missingCol in currentPayload) {
                                delete currentPayload[missingCol];
                                continue;
                              }
                            }

                            // If error is about details or notes not existing
                            if (error.message?.includes('notes') && 'notes' in currentPayload) {
                              delete currentPayload.notes;
                              continue;
                            }
                            if (error.message?.includes('details') && 'details' in currentPayload) {
                              delete currentPayload.details;
                              continue;
                            }

                            break;
                          }

                          if (error) {
                            console.error('❌ Error guardando sesión en Supabase:', error.message);
                          } else if (data && data[0]) {
                            const realId = data[0].id;
                            setRpeLogs(prev => prev.map(item => item.id === tempId ? { ...item, id: realId } : item));
                          }
                        }
                      } catch (err) {
                        console.error('Error saving gym session:', err);
                      }
                    }

                    setEditingSessionId(null);
                    setIsCreatingSession(false);
                  }}
                  className="px-7 py-3 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-white" />
                  {editingSessionId ? 'Guardar Cambios' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR DRAWER FOR ADDING EXERCISES WITH FILTERS */}
      <AnimatePresence>
        {showAddPicker && (
          <div className="fixed inset-0 z-[70] flex pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPicker(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Left Sidebar Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-sky-400 shrink-0" />
                    <h3 className="text-sm font-black tracking-wide text-white uppercase">
                      Añadir Ejercicio
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                    Selecciona ejercicios del catálogo
                  </p>
                </div>
                <button
                  onClick={() => setShowAddPicker(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Cerrar catálogo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Destination Block Tabs */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase shrink-0 pl-1">
                  Añadir a:
                </span>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  <button
                    onClick={() => setShowAddPicker('activation')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      showAddPicker === 'activation'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-700" />
                    Activación
                  </button>
                  <button
                    onClick={() => setShowAddPicker('main')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      showAddPicker === 'main'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-200" />
                    Bloque Principal
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3.5">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar ejercicio..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-2xs"
                  />
                  {pickerSearch && (
                    <button
                      onClick={() => setPickerSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 1. Filtro Estímulo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Estímulo
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availableStimuli.map((st) => (
                      <button
                        key={st}
                        onClick={() => setPickerStimulusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          pickerStimulusFilter === st
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Filtro Cadena Muscular */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-500" />
                    Cadena Muscular
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availableChains.map((chain) => (
                      <button
                        key={chain}
                        onClick={() => setPickerChainFilter(chain)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          pickerChainFilter === chain
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {chain === 'TODAS' ? 'Todas' : chain.replace('Cadena ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filtered Exercise List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold pb-1">
                  <span>Resultados ({filteredPickerExercises.length})</span>
                  {(pickerSearch || pickerStimulusFilter !== 'TODOS' || pickerChainFilter !== 'TODAS') && (
                    <button
                      onClick={() => {
                        setPickerSearch('');
                        setPickerStimulusFilter('TODOS');
                        setPickerChainFilter('TODAS');
                      }}
                      className="text-sky-600 hover:underline text-[11px] cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {filteredPickerExercises.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Dumbbell className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">No se encontraron ejercicios</p>
                    <p className="text-[11px] text-slate-400">Prueba ajustando los filtros</p>
                  </div>
                ) : (
                  filteredPickerExercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                          {ex.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-sky-50 text-sky-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-sky-100">
                            {ex.stimulus || 'FUERZA'}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-slate-200">
                            {formatMuscleChainBadge(ex.muscleChain)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (showAddPicker) {
                            addExerciseToBlock(showAddPicker, ex);
                            setRecentlyAddedId(ex.id);
                            setTimeout(() => setRecentlyAddedId(null), 1200);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                          recentlyAddedId === ex.id
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : showAddPicker === 'activation'
                            ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-2xs'
                            : 'bg-sky-500 hover:bg-sky-400 text-white shadow-2xs'
                        }`}
                      >
                        {recentlyAddedId === ex.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            ¡Añadido!
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Añadir
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                <button
                  onClick={() => setShowAddPicker(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar Catálogo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SESSION DETAILS MODAL */}
      {viewingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6 animate-fadeIn my-auto">
            {/* HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500 text-white rounded-2xl shadow-md">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-sky-600 uppercase">
                    DETALLE DE SESIÓN DE GIMNASIO
                  </span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    {viewingSession.routine}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500 font-bold">
                    <span className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-sky-500" />
                      {viewingSession.date && viewingSession.date.includes('-')
                        ? viewingSession.date.split('-').reverse().join('/')
                        : viewingSession.date}
                    </span>
                    <span className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-rose-500" />
                      {viewingSession.playerName}
                    </span>
                    {viewingSession.microcycle && (
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg font-black text-[11px]">
                        {viewingSession.microcycle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSessionToPDF(viewingSession)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Exportar esta sesión a un archivo PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  onClick={() => setViewingSession(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BLOCK A: ACTIVACIÓN */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Bloque A: Activación ({viewingSession.activationExercises?.length || 0} ejercicios)
              </h4>

              {(!viewingSession.activationExercises || viewingSession.activationExercises.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No se añadieron ejercicios en el bloque de activación.
                </p>
              ) : (
                <div className="space-y-2">
                  {viewingSession.activationExercises.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs">
                          {idx + 1}. {item.exercise?.name || 'Ejercicio'}
                        </h5>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {item.exercise?.stimulus} • {item.exercise?.muscleChain}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-right shrink-0">
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                          Series: <span className="font-black text-slate-900">{item.sets}</span>
                        </div>
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                          Reps: <span className="font-black text-slate-900">{item.reps}</span>
                        </div>
                        {item.load && (
                          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                            Carga: <span className="font-black text-slate-900">{item.load}</span>
                          </div>
                        )}
                        {item.rest && (
                          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                            Descanso: <span className="font-black text-slate-900">{item.rest}</span>
                          </div>
                        )}
                        {(item.videoUrl || item.exercise?.videoUrl) && (
                          <a
                            href={item.videoUrl || item.exercise?.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Vídeo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BLOCK B: BLOQUE PRINCIPAL */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-sky-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Dumbbell className="w-4 h-4 text-sky-600" />
                Bloque B: Bloque Principal ({viewingSession.mainBlockExercises?.length || 0} ejercicios)
              </h4>

              {(!viewingSession.mainBlockExercises || viewingSession.mainBlockExercises.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No se añadieron ejercicios en el bloque principal.
                </p>
              ) : (
                <div className="space-y-2">
                  {viewingSession.mainBlockExercises.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-sky-50/40 rounded-xl border border-sky-200/60 flex items-center justify-between text-xs gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs">
                          {idx + 1}. {item.exercise?.name || 'Ejercicio'}
                        </h5>
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {item.exercise?.stimulus} • {item.exercise?.muscleChain}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-right shrink-0">
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                          Series: <span className="font-black text-slate-900">{item.sets}</span>
                        </div>
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                          Reps: <span className="font-black text-slate-900">{item.reps}</span>
                        </div>
                        {item.load && (
                          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                            Carga: <span className="font-black text-slate-900">{item.load}</span>
                          </div>
                        )}
                        {item.rest && (
                          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                            Descanso: <span className="font-black text-slate-900">{item.rest}</span>
                          </div>
                        )}
                        {(item.videoUrl || item.exercise?.videoUrl) && (
                          <a
                            href={item.videoUrl || item.exercise?.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Vídeo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (viewingSession) {
                      setSessionToDelete(viewingSession);
                    }
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (viewingSession) {
                      handleOpenEditSessionModal(viewingSession);
                    }
                  }}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-amber-200"
                >
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  Editar Sesión
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingSession(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SESSION MODAL */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Eliminar Registro de Sesión</h3>
                  <p className="text-xs text-slate-500 font-medium">Esta acción eliminará el registro permanentemente.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="font-bold text-slate-700">Sesión:</span> {sessionToDelete.routine}</p>
                <p><span className="font-bold text-slate-700">Fecha:</span> {sessionToDelete.date}</p>
                <p><span className="font-bold text-slate-700">Grupo / Jugadora:</span> {sessionToDelete.playerName}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = sessionToDelete;
                    setSessionToDelete(null);
                    if (target) {
                      await handleDeleteSession(target);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Sí, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL AÑADIR INFORME */}
      {showAddReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Añadir Nuevo Informe</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Adjunta un PDF o imagen para {selectedPlayerForGym?.nombre || selectedPlayerForGym?.name || 'la jugadora'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                  Título del Informe *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Valoración Isocinética Trimestral"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newReport.date}
                    onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                    Categoría
                  </label>
                  <select
                    value={newReport.category}
                    onChange={(e) => setNewReport({ ...newReport, category: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="Valoración Física">Valoración Física</option>
                    <option value="Informe Médico">Informe Médico</option>
                    <option value="Control de Lesión">Control de Lesión</option>
                    <option value="Resonancia / Ecografía">Resonancia / Ecografía</option>
                    <option value="Antropometría / Nutrición">Antropometría / Nutrición</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                  Adjuntar Documento (PDF o Imagen)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/40 rounded-2xl p-4 text-center transition-all relative">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleReportFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-sky-500" />
                    {newReport.fileName ? (
                      <div className="text-xs font-bold text-sky-700">
                        Documento seleccionado: <span className="underline">{newReport.fileName}</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-slate-700">Haz clic o arrastra un archivo aquí</span>
                        <span className="text-[10px] text-slate-400">Soporta PDF o Imágenes (PNG, JPG, WEBP)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Comentarios adicionales o conclusiones del informe..."
                  value={newReport.notes}
                  onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReportModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-xl text-xs font-black transition-colors shadow-sm shadow-sky-200 cursor-pointer"
                >
                  Guardar Informe
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL VER INFORME */}
      {viewingReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{viewingReportModal.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {viewingReportModal.playerName} — {viewingReportModal.date} ({viewingReportModal.category})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReportModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingReportModal.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 shrink-0">
                <span className="font-bold block mb-0.5 text-slate-900">Observaciones:</span>
                {viewingReportModal.notes}
              </div>
            )}

            <div className="flex-1 bg-slate-900 rounded-2xl p-2 flex flex-col overflow-hidden min-h-[450px] relative">
              {viewingReportModal.fileUrl ? (
                viewingReportModal.fileType === 'pdf' || viewingReportModal.fileUrl.includes('application/pdf') ? (
                  <PdfViewer
                    url={pdfPreviewUrl || viewingReportModal.fileUrl}
                    title={viewingReportModal.title}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <img
                      src={viewingReportModal.fileUrl}
                      alt={viewingReportModal.title}
                      className="max-h-[60vh] object-contain rounded-xl shadow-md"
                    />
                  </div>
                )
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic py-12">
                  No hay archivo visualizable para este informe.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-3 shrink-0 gap-2 flex-wrap">
              {viewingReportModal.fileUrl && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={pdfPreviewUrl || viewingReportModal.fileUrl}
                    download={viewingReportModal.fileName || 'informe.pdf'}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const url = pdfPreviewUrl || viewingReportModal.fileUrl;
                      if (!url) return;
                      const win = window.open(url, '_blank');
                      if (!win || win.closed || typeof win.closed === 'undefined') {
                        const w = window.open('', '_blank');
                        if (w) {
                          w.document.write(`<html><head><title>${viewingReportModal.title}</title></head><body style="margin:0"><embed width="100%" height="100%" src="${url}" type="application/pdf"></body></html>`);
                        }
                      }
                    }}
                    className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-xs rounded-xl border border-sky-200 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en pestaña nueva
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setViewingReportModal(null)}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer ml-auto"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SQL SCHEMA CODE MODAL FOR FEMENINO A */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 animate-fadeIn my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Código SQL — Tabla FEMENINO A
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Ejecuta este código en el Editor SQL de Supabase para crear la tabla <code className="text-sky-300">gym_group_sessions_femenino_a</code>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto max-h-80">
              <pre className="whitespace-pre-wrap">{FEMENINO_A_SQL_SCRIPT}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <span className="text-[11px] text-slate-400 italic">
                * Si la tabla no está creada en Supabase, la app usará automáticamente las tablas fallback sin dar error.
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(FEMENINO_A_SQL_SCRIPT);
                  setSqlCopied(true);
                  setTimeout(() => setSqlCopied(false), 2000);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {sqlCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {sqlCopied ? '¡Copiado al Portapapeles!' : 'Copiar Código SQL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
