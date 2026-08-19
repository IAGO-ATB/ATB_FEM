import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, UserPlus, Search, Filter, Mail, Phone, MoreHorizontal, X, Trash2, Upload, Users, User, Plus, BarChart2, Dumbbell, ClipboardList, FileText, Clock, ClipboardCheck, Sparkles, Activity, Layers, Target, TrendingUp, Zap, Trophy } from 'lucide-react';
import { Team, Player } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ImageCropper } from './ImageCropper';
import { uploadImage } from '../lib/upload';

interface TeamRosterProps {
  team: Team;
  season?: string;
  onBack: () => void;
  onSelectPlayer: (player: Player) => void;
}

const MOCK_PLAYERS: Player[] = [];

import TacticalField from './TacticalField';

export default function TeamRoster({ team, season = '2026/2027', onBack, onSelectPlayer }: TeamRosterProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    setPlayers([]);
  }, [season, team.id]);

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [cropperData, setCropperData] = useState<{ image: string } | null>(null);
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<Player | null>(null);
  const [activeProfileView, setActiveProfileView] = useState<'info' | 'training' | 'stats' | 'gym' | 'reports'>('info');
  const [trainingStats, setTrainingStats] = useState<{
    disponible: number;
    comodin: number;
    noDisponible: number;
    totalMinutes: number;
    loading: boolean;
  }>({ disponible: 0, comodin: 0, noDisponible: 0, totalMinutes: 0, loading: false });

  const fetchPlayerTrainingStats = async (playerId: string, teamId: string) => {
    setTrainingStats(prev => ({ ...prev, loading: true }));
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('sessions')
        .select('player_statuses, duration_min')
        .eq('team_id', teamId);

      if (error) throw error;

      let disponible = 0;
      let comodin = 0;
      let noDisponible = 0;
      let totalMinutes = 0;

      data?.forEach(session => {
        const statuses = session.player_statuses || {};
        const status = statuses[playerId];
        const minutes = Number(session.duration_min) || 0;

        if (status === 'disponible') {
          disponible++;
          totalMinutes += minutes;
        } else if (status === 'comodin') {
          comodin++;
          totalMinutes += minutes;
        } else if (status === 'no_disponible') {
          noDisponible++;
        }
      });

      setTrainingStats({ disponible, comodin, noDisponible, totalMinutes, loading: false });
    } catch (err) {
      console.error('Error fetching training stats:', err);
      setTrainingStats(prev => ({ ...prev, loading: false }));
    }
  };

  interface GymCategoryStats {
    totalSessions: number;
    sessionsByType: Record<string, number>;
    exercisesByMuscleGroup: Record<string, number>;
    totalExercises: number;
  }

  const [matchStats, setMatchStats] = useState<{
    loading: boolean;
    matchesPlayed: number;
    starts: number;
    subEntries: number;
    minutes: number;
    startsMinutes: number;
    subMinutes: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    shots: number;
    shotsOnTarget: number;
    minutesByPosition: Record<string, number>;
    availableCompetitions: string[];
  }>({
    loading: false,
    matchesPlayed: 0,
    starts: 0,
    subEntries: 0,
    minutes: 0,
    startsMinutes: 0,
    subMinutes: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    shots: 0,
    shotsOnTarget: 0,
    minutesByPosition: {},
    availableCompetitions: []
  });

  const [matchCompetitionFilter, setMatchCompetitionFilter] = useState<string>('all');
  const [rawMatchesData, setRawMatchesData] = useState<any[]>([]);

  // Effect to re-process stats when filter changes or data is loaded
  useEffect(() => {
    if (selectedPlayerDetail && rawMatchesData.length > 0) {
      processMatchData(rawMatchesData, selectedPlayerDetail.id, matchCompetitionFilter);
    }
  }, [matchCompetitionFilter, selectedPlayerDetail?.id, rawMatchesData]);

  // Reset filter when changing player
  useEffect(() => {
    setMatchCompetitionFilter('all');
  }, [selectedPlayerDetail?.id]);

  const fetchPlayerMatchStats = async (playerId: string) => {
    setMatchStats(prev => ({ ...prev, loading: true }));
    try {
      // 1. Fetch matches from Supabase
      let finalData: any[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('status', 'finished');

          if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
            const { data: calData } = await supabase
              .from('calendar_matches')
              .select('*')
              .eq('status', 'finished');
            finalData = calData || [];
          } else {
            finalData = data || [];
          }
        } catch (e) {}
      }

      // 2. Fetch all match stats from Firestore for cross-user synchronization
      const firestoreStatsByMatch: Record<string, any[]> = {};
      try {
        const snap = await getDocs(collection(db, 'match_stats'));
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (d && d.playerStats && Array.isArray(d.playerStats)) {
            firestoreStatsByMatch[docSnap.id] = d.playerStats;
            if (d.matchId) firestoreStatsByMatch[String(d.matchId)] = d.playerStats;
          }
        });
      } catch (e) {}

      // 3. Attach hydrated stats to matches
      finalData = finalData.map(m => {
        const mId = String(m.id);
        if (firestoreStatsByMatch[mId]) {
          return { ...m, playerStats: firestoreStatsByMatch[mId] };
        }
        return m;
      });

      setRawMatchesData(finalData);
      processMatchData(finalData, playerId, matchCompetitionFilter);
    } catch (err) {
      console.error('Error fetching match stats:', err);
      setMatchStats(prev => ({ ...prev, loading: false }));
    }
  };

  const processMatchData = (matchesData: any[], playerId: string, compFilter: string) => {
    let matchesPlayed = 0;
    let starts = 0;
    let subEntries = 0;
    let minutes = 0;
    let startsMinutes = 0;
    let subMinutes = 0;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let shots = 0;
    let shotsOnTarget = 0;
    const minutesByPosition: Record<string, number> = {};
    const compsSet = new Set<string>();

    matchesData.forEach(m => {
      let pStats: any[] = [];
      
      // Collect available competitions (case-sensitive as saved, but trimmed)
      const comp = (m.type || m.competition || '').trim();
      if (comp) compsSet.add(comp);

      // Filter by competition if not 'all'
      if (compFilter !== 'all' && comp.toLowerCase() !== compFilter.toLowerCase()) return;

      // Try notes (JSON)
      if (m.notes) {
        try {
          const parsed = typeof m.notes === 'string' ? JSON.parse(m.notes) : m.notes;
          const foundStats = parsed?.playerStats || parsed?.player_stats;
          if (foundStats && Array.isArray(foundStats)) {
            pStats = foundStats;
          }
        } catch (e) {}
      }
      
      // Try details (JSON) if notes failed
      if (pStats.length === 0 && m.details) {
        try {
          const parsed = typeof m.details === 'string' ? JSON.parse(m.details) : m.details;
          const foundStats = parsed?.playerStats || parsed?.player_stats;
          if (foundStats && Array.isArray(foundStats)) {
            pStats = foundStats;
          }
        } catch (e) {}
      }

      // Try localStorage cache as well (Sync with StatsView.tsx)
      if (pStats.length === 0) {
        try {
          const localCache = localStorage.getItem(`match_player_stats_${m.id}`);
          if (localCache) {
            const parsed = JSON.parse(localCache);
            if (Array.isArray(parsed)) {
              pStats = parsed;
            } else if (parsed?.playerStats && Array.isArray(parsed.playerStats)) {
              pStats = parsed.playerStats;
            }
          }
        } catch (e) {}
      }

      // Try direct column if still empty
      if (pStats.length === 0) {
        pStats = m.player_stats || m.playerStats || [];
      }

      if (!pStats || !Array.isArray(pStats)) return;

      // Extremely robust matching: check ID, Number/Dorsal, and Name fallbacks
      const stat = pStats.find((s: any) => {
        // 1. Try ID matching (most reliable)
        const sId = String(s.playerId || s.id || s.player_id || '').trim();
        const targetId = String(playerId).trim();
        if (sId !== '' && targetId !== '' && sId === targetId) return true;
        
        // 2. Try Number/Dorsal matching (fallback)
        const sNum = s.playerNumber !== undefined ? s.playerNumber : s.number;
        const targetNum = selectedPlayerDetail?.number !== undefined ? selectedPlayerDetail.number : selectedPlayerDetail?.dorsal;
        if (sNum !== undefined && targetNum !== undefined && Number(sNum) === Number(targetNum)) return true;

        // 3. Try Name matching (last resort)
        const sName = (s.playerName || s.name || '').toLowerCase().trim();
        const targetName = (selectedPlayerDetail?.name || '').toLowerCase().trim();
        if (sName !== '' && targetName !== '' && (sName.includes(targetName) || targetName.includes(sName))) return true;

        return false;
      });

      if (!stat) return;

      const min = Number(stat.minutes || 0);
      const status = String(stat.status || '').toLowerCase().trim();

      if (status === 'titular') {
        matchesPlayed++;
        starts++;
        startsMinutes += min;
      } else if (status === 'suplente' && min > 0) {
        matchesPlayed++;
        subEntries++;
        subMinutes += min;
      }

      minutes += min;
      goals += Number(stat.goals || 0);
      assists += Number(stat.assists || 0);
      yellowCards += Number(stat.yellowCards || 0);
      redCards += Number(stat.redCards || 0);
      shots += Number(stat.shots || 0);
      shotsOnTarget += Number(stat.shotsOnTarget || 0);

      // Track minutes by position
      const pos = (stat.position || stat.posicion_especifica || 'Sin Posición').trim();
      if (min > 0) {
        minutesByPosition[pos] = (minutesByPosition[pos] || 0) + min;
      }
    });

    setMatchStats({
      loading: false,
      matchesPlayed,
      starts,
      subEntries,
      minutes,
      startsMinutes,
      subMinutes,
      goals,
      assists,
      yellowCards,
      redCards,
      shots,
      shotsOnTarget,
      minutesByPosition,
      availableCompetitions: Array.from(compsSet).sort()
    });
  };

  const [gymSubView, setGymSubView] = useState<'grupal' | 'individual' | 'total'>('grupal');

  const [gymStats, setGymStats] = useState<{
    loading: boolean;
    group: GymCategoryStats;
    individual: GymCategoryStats;
    total: GymCategoryStats;
  }>({
    loading: false,
    group: { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 },
    individual: { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 },
    total: { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 }
  });

  const fetchPlayerGymStats = async (player: Player) => {
    setGymStats(prev => ({ ...prev, loading: true }));
    try {
      if (!supabase) {
        setGymStats(prev => ({ ...prev, loading: false }));
        return;
      }

      const pFullName = (player.nombre ? `${player.nombre} ${player.apellidos || ''}` : player.name).trim().toLowerCase();
      const pFirstName = (player.nombre || player.name.split(' ')[0] || '').trim().toLowerCase();
      const playerId = String(player.id);

      // 1. Fetch gym exercise library for muscle group mapping lookup
      const exerciseLibMap: Record<string, string> = {};
      try {
        const { data: exData } = await supabase.from('gym_exercises').select('*');
        if (exData) {
          exData.forEach((ex: any) => {
            const group = ex.muscle_chain || ex.muscle_group || ex.category || ex.muscleGroup;
            if (group) {
              if (ex.id) exerciseLibMap[String(ex.id)] = group;
              if (ex.name) exerciseLibMap[ex.name.trim().toLowerCase()] = group;
            }
          });
        }
      } catch (e) {}

      // 2. Query session tables from Supabase
      const allLogs: any[] = [];
      const seenIds = new Set<string>();

      const fetchTableLogs = async (tableName: string) => {
        try {
          const { data } = await supabase.from(tableName).select('*').order('created_at', { ascending: false }).limit(200);
          if (data) {
            data.forEach(item => {
              const key = `${tableName}-${item.id}`;
              if (!seenIds.has(key)) {
                seenIds.add(key);
                allLogs.push({ ...item, _sourceTable: tableName });
              }
            });
          }
        } catch (e) {}
      };

      await Promise.all([
        fetchTableLogs('gym_group_sessions_femenino_a'),
        fetchTableLogs('gym_group_sessions'),
        fetchTableLogs('gym_sessions'),
        fetchTableLogs('gym_individual_sessions')
      ]);

      const groupAcc: GymCategoryStats = { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 };
      const indAcc: GymCategoryStats = { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 };
      const totalAcc: GymCategoryStats = { totalSessions: 0, sessionsByType: {}, exercisesByMuscleGroup: {}, totalExercises: 0 };

      allLogs.forEach(row => {
        let parsed: any = null;
        const rawData = row.notes || row.details;
        if (rawData) {
          try {
            parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          } catch (e) {}
        }

        const targetPlayerIds: string[] = (parsed?.targetPlayerIds || []).map((id: any) => String(id));
        const participatingPlayers: string[] = (parsed?.participatingPlayers || row.participating_players || []).map((p: any) => String(p));
        const isIndividualTable = (row._sourceTable || '').includes('individual');
        const isGroupTable = (row._sourceTable || '').includes('group');

        let isIndividual = false;
        if (isIndividualTable || row.session_type === 'individual' || row.sessionType === 'individual') {
          isIndividual = true;
        } else if (isGroupTable || row.session_type === 'group' || row.sessionType === 'group') {
          isIndividual = false;
        } else if (row.player_id && !participatingPlayers.length && !targetPlayerIds.length) {
          isIndividual = true;
        } else if (participatingPlayers.length > 1 || targetPlayerIds.length > 1) {
          isIndividual = false;
        } else if ((row.player_name || '').toLowerCase().includes('plantilla') || (row.player_name || '').toLowerCase().includes('grupo') || (row.player_name || '').toLowerCase().includes('equipo')) {
          isIndividual = false;
        } else {
          isIndividual = Boolean(row.player_id);
        }
        const isGroup = !isIndividual;

        // Participation check
        let isParticipant = false;

        if (isIndividual) {
          if (row.player_id && String(row.player_id).trim() === playerId) {
            isParticipant = true;
          } else if (targetPlayerIds.length > 0 && targetPlayerIds.includes(playerId)) {
            isParticipant = true;
          } else if (participatingPlayers.length > 0) {
            isParticipant = participatingPlayers.some(pName => {
              const cleanPName = String(pName).trim().toLowerCase();
              return cleanPName === pFullName || cleanPName === pFirstName || cleanPName.includes(pFirstName) || pFullName.includes(cleanPName);
            });
          } else if (row.player_name) {
            const cleanName = String(row.player_name).trim().toLowerCase();
            isParticipant = cleanName === pFullName || cleanName === pFirstName || cleanName.includes(pFirstName);
          }
        } else {
          if (targetPlayerIds.length > 0) {
            isParticipant = targetPlayerIds.includes(playerId);
          } else if (participatingPlayers.length > 0) {
            isParticipant = participatingPlayers.some(pName => {
              const cleanPName = String(pName).trim().toLowerCase();
              return cleanPName === pFullName || cleanPName === pFirstName || cleanPName.includes(pFirstName) || cleanPName.includes('plantilla') || cleanPName.includes('equipo') || cleanPName.includes('grupo');
            });
          } else if (row.player_id) {
            isParticipant = String(row.player_id).trim() === playerId;
          } else if (row.player_name) {
            const cleanName = String(row.player_name).trim().toLowerCase();
            isParticipant = cleanName === pFullName || cleanName === pFirstName || cleanName.includes(pFirstName) || cleanName.includes('plantilla') || cleanName.includes('equipo') || cleanName.includes('grupo');
          } else if (row.team_id || row.team) {
            if (player.teamId && (String(row.team_id) === String(player.teamId) || String(row.team) === String(player.teamId))) {
              isParticipant = true;
            } else if (team.name && row.team === team.name) {
              isParticipant = true;
            } else {
              isParticipant = true;
            }
          } else {
            isParticipant = true;
          }
        }

        if (isParticipant) {
          const targetCat = isGroup ? groupAcc : indAcc;

          targetCat.totalSessions++;
          totalAcc.totalSessions++;

          // Session type category (Only for group sessions)
          if (isGroup) {
            let rawType = row.session_type_category || row.tipo || row.type || parsed?.sessionTypeCategory || parsed?.tipo || parsed?.type;
            if (!rawType || rawType === 'group' || rawType === 'individual') {
              rawType = row.routine_title || row.routine || row.routine_name || 'General Grupal';
            }

            let typeCategory = String(rawType).trim();
            const upperType = typeCategory.toUpperCase();
            if (upperType === 'S1' || upperType === 'SESION 1' || upperType === 'SESIÓN 1') {
              typeCategory = 'ST1';
            } else if (upperType === 'S2' || upperType === 'SESION 2' || upperType === 'SESIÓN 2') {
              typeCategory = 'ST2-I';
            } else if (upperType === 'S3' || upperType === 'SESION 3' || upperType === 'SESIÓN 3') {
              typeCategory = 'ST3';
            }

            const formattedType = typeCategory.toUpperCase().startsWith('ST') || typeCategory === 'CORE' || typeCategory === 'TREN SUPERIOR'
              ? typeCategory.toUpperCase()
              : typeCategory.charAt(0).toUpperCase() + typeCategory.slice(1);

            groupAcc.sessionsByType[formattedType] = (groupAcc.sessionsByType[formattedType] || 0) + 1;
            totalAcc.sessionsByType[formattedType] = (totalAcc.sessionsByType[formattedType] || 0) + 1;
          }

          // Exercises breakdown (summed for BOTH group and individual)
          const activationExercises: any[] = parsed?.activationExercises || row.activation_exercises || [];
          const mainBlockExercises: any[] = parsed?.mainBlockExercises || row.main_block_exercises || [];
          const allExercises = [...activationExercises, ...mainBlockExercises];

          allExercises.forEach(ex => {
            targetCat.totalExercises++;
            totalAcc.totalExercises++;

            const inner = ex.exercise || ex;
            const exName = (inner.name || inner.exerciseName || ex.name || ex.exerciseName || '').trim();
            const exId = String(inner.id || ex.id || '');

            let rawMuscle = inner.muscleChain || inner.muscleGroup || inner.category || 
                            ex.muscleChain || ex.muscleGroup || ex.category || 
                            ex.muscle_chain || ex.muscle_group;

            if (!rawMuscle || rawMuscle === 'Mix' || rawMuscle === 'General') {
              if (exId && exerciseLibMap[exId]) {
                rawMuscle = exerciseLibMap[exId];
              } else if (exName && exerciseLibMap[exName.toLowerCase()]) {
                rawMuscle = exerciseLibMap[exName.toLowerCase()];
              }
            }

            // Infer muscle chain / group from exercise name keywords if rawMuscle is still generic or missing
            if (!rawMuscle || rawMuscle === 'Mix' || rawMuscle === 'General' || rawMuscle === 'General / Mix') {
              const nameLower = exName.toLowerCase();
              if (nameLower.includes('sentadilla') || nameLower.includes('squat') || nameLower.includes('zancada') || nameLower.includes('prensa') || nameLower.includes('cuadriceps') || nameLower.includes('extensión') || nameLower.includes('zancadas')) {
                rawMuscle = 'Cadena Anterior';
              } else if (nameLower.includes('peso muerto') || nameLower.includes('deadlift') || nameLower.includes('hip thrust') || nameLower.includes('isquio') || nameLower.includes('femoral') || nameLower.includes('gluteo') || nameLower.includes('glúteo') || nameLower.includes('nordico') || nameLower.includes('buenos dias')) {
                rawMuscle = 'Cadena Posterior';
              } else if (nameLower.includes('adduct') || nameLower.includes('aductor') || nameLower.includes('abduct') || nameLower.includes('abductor')) {
                rawMuscle = 'Cadena Interna / Externa';
              } else if (nameLower.includes('plancha') || nameLower.includes('core') || nameLower.includes('rollout') || nameLower.includes('pallof') || nameLower.includes('abs') || nameLower.includes('abdomen') || nameLower.includes('rueda') || nameLower.includes('crunch') || nameLower.includes('deadbug') || nameLower.includes('bird dog')) {
                rawMuscle = 'CORE / Abdomen';
              } else if (nameLower.includes('press') || nameLower.includes('militar') || nameLower.includes('remo') || nameLower.includes('dominada') || nameLower.includes('pull down') || nameLower.includes('jalon') || nameLower.includes('jalón') || nameLower.includes('biceps') || nameLower.includes('triceps') || nameLower.includes('flexion') || nameLower.includes('push up') || nameLower.includes('hombro')) {
                rawMuscle = 'Tren Superior';
              } else if (nameLower.includes('salto') || nameLower.includes('plio') || nameLower.includes('cmj') || nameLower.includes('sj') || nameLower.includes('drop jump') || nameLower.includes('multisaltos')) {
                rawMuscle = 'Pliometría / Salto';
              }
            }

            let cleanMuscle = rawMuscle ? String(rawMuscle).trim() : 'General / Trabajo Integrado';
            if (cleanMuscle.toLowerCase().includes('anterior')) cleanMuscle = 'Cadena Anterior';
            else if (cleanMuscle.toLowerCase().includes('posterior')) cleanMuscle = 'Cadena Posterior';
            else if (cleanMuscle.toLowerCase().includes('interna')) cleanMuscle = 'Cadena Interna';
            else if (cleanMuscle.toLowerCase().includes('externa')) cleanMuscle = 'Cadena Externa';
            else if (cleanMuscle.toLowerCase().includes('core')) cleanMuscle = 'CORE / Abdomen';
            else if (cleanMuscle.toLowerCase().includes('superior')) cleanMuscle = 'Tren Superior';

            targetCat.exercisesByMuscleGroup[cleanMuscle] = (targetCat.exercisesByMuscleGroup[cleanMuscle] || 0) + 1;
            totalAcc.exercisesByMuscleGroup[cleanMuscle] = (totalAcc.exercisesByMuscleGroup[cleanMuscle] || 0) + 1;
          });
        }
      });

      setGymStats({
        loading: false,
        group: groupAcc,
        individual: indAcc,
        total: totalAcc
      });
    } catch (err) {
      console.error('Error fetching gym stats for player:', err);
      setGymStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (selectedPlayerDetail && activeProfileView === 'gym') {
      fetchPlayerGymStats(selectedPlayerDetail);
    }
  }, [selectedPlayerDetail?.id, activeProfileView]);
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editingPlayerData, setEditingPlayerData] = useState<any>(null);
  const [editCropperData, setEditCropperData] = useState<{ image: string } | null>(null);
  const [newPlayer, setNewPlayer] = useState({ 
    name: '', 
    nombre: '',
    apellidos: '',
    number: '', 
    dorsal: '',
    position: '', 
    secondPosition: '',
    height: '',
    demarcacion: '',
    posicion_especifica: '',
    fecha_nacimiento: '',
    lateralidad: '',
    observaciones: '',
    image: '' 
  });

  useEffect(() => {
    async function fetchPlayers() {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', team.id)
          .order('number', { ascending: true });

        if (error) {
          if (error.code === '42P01' || error.message?.includes('fetch')) {
            console.log('Supabase: La tabla "players" no existe o la conexión no está lista. Usando datos de ejemplo.');
          } else {
            throw error;
          }
          return;
        }

        if (data && data.length > 0) {
          const mappedPlayers = data.map((p: any) => {
            const secondPos = p.secondPosition || p.second_position || p.segunda_posicion || p.segunda_posicion_especifica || p.secondposition || '';
            return {
              ...p,
              secondPosition: secondPos,
              second_position: secondPos,
              teamId: p.team_id || p.teamid || p.teamId
            };
          });
          setPlayers(mappedPlayers);
        }
      } catch (err: any) {
        if (!err.message?.includes('fetch') && !err.message?.includes('URL')) {
          console.error('Error cargando jugadoras:', err.message || err);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, [team.id]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerName = newPlayer.name || `${newPlayer.nombre || ''} ${newPlayer.apellidos || ''}`.trim();
    const playerPos = newPlayer.position || newPlayer.demarcacion;
    if (!playerName || !playerPos) return;

    let imageUrl = newPlayer.image;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const uploadedUrl = await uploadImage(imageUrl, 'FOTOS JUGADORAS', 'perfil');
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const rawNum = newPlayer.number || newPlayer.dorsal;
    const parsedNum = (rawNum !== undefined && rawNum !== '' && !isNaN(parseInt(rawNum))) ? parseInt(rawNum) : 0;

    const playerToAdd: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName,
      number: parsedNum,
      position: playerPos,
      secondPosition: newPlayer.secondPosition,
      height: newPlayer.height,
      teamId: team.id,
      image: imageUrl,
      stats: { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
      nombre: newPlayer.nombre || playerName.split(' ')[0],
      apellidos: newPlayer.apellidos || playerName.split(' ').slice(1).join(' '),
      dorsal: parsedNum || undefined,
      fecha_nacimiento: newPlayer.fecha_nacimiento,
      demarcacion: playerPos,
      posicion_especifica: newPlayer.posicion_especifica,
      lateralidad: newPlayer.lateralidad,
      observaciones: newPlayer.observaciones
    };

    setPlayers(prev => [...prev, playerToAdd]);
    
    if (supabase) {
      try {
        const { error } = await supabase.from('players').insert([{
          id: playerToAdd.id,
          name: playerToAdd.name,
          number: playerToAdd.number,
          position: playerToAdd.position,
          second_position: playerToAdd.secondPosition,
          height: playerToAdd.height,
          team_id: playerToAdd.teamId,
          image: playerToAdd.image,
          stats: playerToAdd.stats,
          nombre: playerToAdd.nombre,
          apellidos: playerToAdd.apellidos,
          dorsal: playerToAdd.dorsal,
          fecha_nacimiento: playerToAdd.fecha_nacimiento,
          demarcacion: playerToAdd.demarcacion,
          posicion_especifica: playerToAdd.posicion_especifica,
          lateralidad: playerToAdd.lateralidad,
          observaciones: playerToAdd.observaciones
        }]);
        if (error) {
          console.error('Supabase Error:', error.message, error.details);
        }
      } catch (err) {
        console.error('Error de red/conexión con Supabase:', err);
      }
    }

    setNewPlayer({ 
      name: '', 
      nombre: '',
      apellidos: '',
      number: '', 
      dorsal: '',
      position: '', 
      secondPosition: '',
      height: '',
      demarcacion: '',
      posicion_especifica: '',
      fecha_nacimiento: '',
      lateralidad: 'Diestra',
      observaciones: '',
      image: '' 
    });
    setShowAddModal(false);
  };

  const handleDeletePlayer = async (playerId: string) => {
    // Optimistic update
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    if (selectedPlayerDetail?.id === playerId) setSelectedPlayerDetail(null);
    setPlayerToDelete(null);

    if (supabase) {
      try {
        const { error } = await supabase.from('players').delete().eq('id', playerId);
        if (error) {
          console.error('Error eliminando de Supabase:', error.message);
        }
      } catch (err) {
        console.error('Error de red al eliminar:', err);
      }
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayerData || !selectedPlayerDetail) return;

    let imageUrl = editingPlayerData.image;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const uploadedUrl = await uploadImage(imageUrl, 'FOTOS JUGADORAS', 'perfil');
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const rawNum = editingPlayerData.number || editingPlayerData.dorsal;
    const parsedNum = (rawNum !== undefined && rawNum !== '' && !isNaN(parseInt(rawNum))) ? parseInt(rawNum) : 0;

    const updatedPlayer: Player = {
      ...selectedPlayerDetail,
      name: editingPlayerData.name || `${editingPlayerData.nombre || ''} ${editingPlayerData.apellidos || ''}`.trim(),
      number: parsedNum,
      position: editingPlayerData.position || editingPlayerData.demarcacion,
      secondPosition: editingPlayerData.secondPosition,
      height: editingPlayerData.height,
      image: imageUrl,
      nombre: editingPlayerData.nombre,
      apellidos: editingPlayerData.apellidos,
      dorsal: parsedNum || undefined,
      fecha_nacimiento: editingPlayerData.fecha_nacimiento,
      demarcacion: editingPlayerData.position || editingPlayerData.demarcacion,
      posicion_especifica: editingPlayerData.posicion_especifica,
      lateralidad: editingPlayerData.lateralidad,
      observaciones: editingPlayerData.observaciones
    };

    // Update local state
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setSelectedPlayerDetail(updatedPlayer);
    setIsEditingPlayer(false);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('players')
          .update({
            name: updatedPlayer.name,
            number: updatedPlayer.number,
            position: updatedPlayer.position,
            second_position: updatedPlayer.secondPosition,
            height: updatedPlayer.height,
            image: updatedPlayer.image,
            nombre: updatedPlayer.nombre,
            apellidos: updatedPlayer.apellidos,
            dorsal: updatedPlayer.dorsal,
            fecha_nacimiento: updatedPlayer.fecha_nacimiento,
            demarcacion: updatedPlayer.demarcacion,
            posicion_especifica: updatedPlayer.posicion_especifica,
            lateralidad: updatedPlayer.lateralidad,
            observaciones: updatedPlayer.observaciones
          })
          .eq('id', updatedPlayer.id);

        if (error) console.error('Error actualizando en Supabase:', error.message);
      } catch (err) {
        console.error('Error de conexión al actualizar:', err);
      }
    }
  };

  const groupedPlayers = {
    'Porteras': players.filter(p => ['Porteras', 'Portera'].includes(p.position)),
    'Defensoras': players.filter(p => ['Defensoras', 'Defensa'].includes(p.position)),
    'Mediocentros': players.filter(p => ['Mediocentros', 'Centrocampista'].includes(p.position)),
    'Atacantes': players.filter(p => ['Atacantes', 'Delantera'].includes(p.position)),
    'Sin Categorizar': players.filter(p => !['Porteras', 'Portera', 'Defensoras', 'Defensa', 'Mediocentros', 'Centrocampista', 'Atacantes', 'Delantera'].includes(p.position))
  };

  const positionOrder: (keyof typeof groupedPlayers)[] = ['Porteras', 'Defensoras', 'Mediocentros', 'Atacantes', 'Sin Categorizar'];
  
  const calculateAge = (birthday: string) => {
    if (!birthday) return 0;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const STAFF_ROLES = [
    { key: 'headCoach', label: '1er Entrenador/a' },
    { key: 'secondCoach', label: '2º Entrenador/a' },
    { key: 'physicalTrainer', label: 'Prep. Físico' },
    { key: 'goalkeeperCoach', label: 'Entr. Porteras' },
    { key: 'analyst', label: 'Analista' },
    { key: 'delegate', label: 'Delegada/o' },
    { key: 'physio', label: 'Fisio' }
  ];

  const DEFAULT_STAFF_MAP: Record<string, any> = {
    FEMENINO_A: {
      headCoach: { name: 'Miky Mayans' },
      secondCoach: { name: 'Juanmi Lladó' },
      physicalTrainer: { name: 'Iago Alvarez' },
      goalkeeperCoach: { name: 'Pablo Roca' },
      analyst: { name: 'Nica Ortiz' },
      delegate: { name: 'Marta Chavero' },
      physio: { name: 'Alberto Marín' }
    },
    FEMENINO_B: {
      headCoach: { name: 'Javier Ramos' },
      secondCoach: { name: 'Paula Vich' },
      physicalTrainer: { name: 'Joan Torres' },
      goalkeeperCoach: { name: 'Marc Sans' },
      delegate: { name: 'Antonia Coll' },
      physio: { name: 'David Serra' }
    },
    FEMENINO_C: {
      headCoach: { name: 'Marina Bestard' },
      secondCoach: { name: 'Lucas Ferrer' },
      physicalTrainer: { name: 'Joan Torres' },
      delegate: { name: 'Carmen Rotger' }
    },
    FEMENINO_D: {
      headCoach: { name: 'David Vidal' },
      secondCoach: { name: 'Aina Riera' },
      delegate: { name: 'Jaume Mayol' }
    },
    FEMENINO_E: {
      headCoach: { name: 'Sonia Oliver' },
      secondCoach: { name: 'Mateu Bennasar' },
      delegate: { name: 'Francisca Bauzà' }
    }
  };

  const rawStaff = (team.staff && Object.values(team.staff).some((s: any) => s?.name))
    ? team.staff
    : DEFAULT_STAFF_MAP[team.id] || team.staff;

  const activeStaff = (team.id === 'FEMENINO_A' && rawStaff?.headCoach?.name === 'Txema Expósito')
    ? DEFAULT_STAFF_MAP.FEMENINO_A
    : rawStaff;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{team.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {team.category}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200"
          >
            <UserPlus className="w-4 h-4" />
            Añadir Jugadora
          </button>
        </div>
      </div>

      {/* Cuerpo Técnico */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4" />
          Cuerpo Técnico
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {STAFF_ROLES.map((role) => {
            const member = (activeStaff as any)?.[role.key];
            if (!member || !member.name) return null;
            return (
              <div key={role.key} className="flex flex-col items-center text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">{member.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-900 line-clamp-1">{member.name}</p>
                  <p className="text-[8px] font-bold text-sky-500 uppercase tracking-tighter">{role.label}</p>
                </div>
              </div>
            );
          })}
          {(!activeStaff || !Object.values(activeStaff).some((s: any) => s?.name)) && (
            <div className="col-span-full py-4 text-center text-slate-400 text-xs italic">
              Sin información del cuerpo técnico asignada.
            </div>
          )}
        </div>
      </div>

      {/* Players Grid Grouped by Position */}
      <div className="space-y-8">
        {positionOrder.map(pos => {
          const posPlayers = groupedPlayers[pos];
          if (posPlayers.length === 0) return null;

          return (
            <div key={pos} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100"></div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{pos}</h4>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {posPlayers.map(player => (
                  <motion.div
                    key={player.id}
                    layoutId={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative"
                  >
                    <div 
                      onClick={() => setSelectedPlayerDetail(player)}
                      className="cursor-pointer space-y-2 text-center"
                    >
                      <div className="relative transition-all duration-300 group-hover:-translate-y-1">
                        <div className="aspect-square rounded-full overflow-hidden bg-white border border-slate-100 shadow-sm transition-all duration-300 group-hover:shadow-md">
                          {player.image ? (
                            <img 
                              src={player.image} 
                              alt={player.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-200">
                              <Users className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-sky-600/0 group-hover:bg-sky-600/5 transition-colors duration-300" />
                        </div>
                        
                        {/* Number Badge - Top Left and Protruding */}
                        {Boolean(player.number || player.dorsal) && (
                          <div className="absolute -top-1 -left-1 w-6 h-6 bg-white rounded-full border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-900 shadow-md z-10">
                            {player.number || player.dorsal}
                          </div>
                        )}
                      </div>
                      
                      <div className="px-1">
                        <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-sky-600 transition-colors truncate">
                          {player.name}
                        </h5>
                      </div>
                    </div>

                    {/* Quick Actions (only visible on hover/absolute) */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerToDelete(player.id);
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-white text-rose-500 rounded-full border border-slate-100 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 z-20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tactical Visualization */}
      <TacticalField players={players} />

      {/* Empty State */}
      {players.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay jugadoras</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Añade jugadoras a este equipo para empezar a gestionar la plantilla.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-6 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Añadir Jugadora
          </button>
        </div>
      )}

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayerDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayerDetail(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100"
            >
              <button 
                onClick={() => {
                  setSelectedPlayerDetail(null);
                  setActiveProfileView('info');
                }}
                className="absolute top-4 right-4 z-20 p-2 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col md:flex-row max-h-[80vh] overflow-hidden">
                {/* Image Section */}
                <div className="md:w-4/12 bg-slate-50 relative aspect-video md:aspect-auto shrink-0 border-b md:border-b-0 md:border-r border-slate-100 min-h-[160px] md:min-h-0">
                  {selectedPlayerDetail.image ? (
                    <img 
                      src={selectedPlayerDetail.image} 
                      alt={selectedPlayerDetail.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <Users className="w-20 h-20" />
                    </div>
                  )}
                  {Boolean(selectedPlayerDetail.number || selectedPlayerDetail.dorsal) && (
                    <div className="absolute top-4 left-4 w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md">
                      {selectedPlayerDetail.number || selectedPlayerDetail.dorsal}
                    </div>
                  )}
                  
                  {isEditingPlayer && (
                    <label className="absolute bottom-4 right-4 p-2.5 bg-white text-sky-600 rounded-full shadow-lg border border-slate-100 cursor-pointer hover:bg-sky-50 transition-colors">
                      <Upload className="w-4 h-4" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditCropperData({ image: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Info Section */}
                <div className="md:w-8/12 p-6 overflow-y-auto max-h-[80vh] flex-1">
                  {isEditingPlayer ? (
                    <form onSubmit={handleUpdatePlayer} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Editar Jugadora</h4>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsEditingPlayer(false)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            CANCELAR
                          </button>
                          <button 
                            type="submit"
                            className="px-4 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-sky-700 transition-colors"
                          >
                            GUARDAR
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre</label>
                          <input 
                            required
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.nombre ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, nombre: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Apellidos</label>
                          <input 
                            required
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.apellidos ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, apellidos: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dorsal (Opcional)</label>
                          <input 
                            type="number"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            placeholder="Sin dorsal"
                            value={editingPlayerData.dorsal ?? editingPlayerData.number ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, dorsal: e.target.value, number: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Posición</label>
                          <select 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.position ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, position: e.target.value, demarcacion: e.target.value }))}
                          >
                            <option value="Porteras">Porteras</option>
                            <option value="Defensoras">Defensoras</option>
                            <option value="Mediocentros">Mediocentros</option>
                            <option value="Atacantes">Atacantes</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">P. Específica</label>
                          <select 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.posicion_especifica ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, posicion_especifica: e.target.value }))}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Portera">Portera</option>
                            <option value="Lateral Derecho">Lateral Derecho</option>
                            <option value="Central Derecho">Central Derecho</option>
                            <option value="Central Izquierdo">Central Izquierdo</option>
                            <option value="Carril Derecho">Carril Derecho</option>
                            <option value="Carril Izquierdo">Carril Izquierdo</option>
                            <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                            <option value="Mediocentro">Mediocentro</option>
                            <option value="Mediapunta">Mediapunta</option>
                            <option value="Extremo Derecha">Extremo Derecha</option>
                            <option value="Extremo Izquierda">Extremo Izquierda</option>
                            <option value="Delantera">Delantera</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Segunda Posición</label>
                          <select 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.secondPosition ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, secondPosition: e.target.value }))}
                          >
                            <option value="">Ninguna</option>
                            <option value="Portera">Portera</option>
                            <option value="Lateral Derecho">Lateral Derecho</option>
                            <option value="Central Derecho">Central Derecho</option>
                            <option value="Central Izquierdo">Central Izquierdo</option>
                            <option value="Carril Derecho">Carril Derecho</option>
                            <option value="Carril Izquierdo">Carril Izquierdo</option>
                            <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                            <option value="Mediocentro">Mediocentro</option>
                            <option value="Mediapunta">Mediapunta</option>
                            <option value="Extremo Derecha">Extremo Derecha</option>
                            <option value="Extremo Izquierda">Extremo Izquierda</option>
                            <option value="Delantera">Delantera</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">F. Nacimiento</label>
                          <input 
                            type="date"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.fecha_nacimiento ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, fecha_nacimiento: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Altura</label>
                          <input 
                            type="text"
                            placeholder="Ej. 1.70 m"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.height ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, height: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lateralidad (Opcional)</label>
                          <select 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            value={editingPlayerData.lateralidad ?? ''}
                            onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, lateralidad: e.target.value }))}
                          >
                            <option value="">Sin lateralidad (Opcional)</option>
                            <option value="Diestra">Diestra</option>
                            <option value="Zurda">Zurda</option>
                            <option value="Ambidiestra">Ambidiestra</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observaciones</label>
                        <textarea 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none h-20 resize-none"
                          value={editingPlayerData.observaciones ?? ''}
                          onChange={e => setEditingPlayerData((prev: any) => ({ ...prev, observaciones: e.target.value }))}
                        />
                      </div>
                    </form>
                  ) : activeProfileView === 'info' ? (
                    <div className="space-y-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                            {selectedPlayerDetail.name}
                          </h4>
                          <span className="inline-block mt-2 px-3 py-1 bg-sky-50 text-sky-600 text-[10px] font-bold rounded-lg uppercase tracking-widest border border-sky-100">
                            {selectedPlayerDetail.position} {selectedPlayerDetail.posicion_especifica ? `— ${selectedPlayerDetail.posicion_especifica}` : ''}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingPlayerData({ ...selectedPlayerDetail });
                            setIsEditingPlayer(true);
                          }}
                          className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 uppercase tracking-widest"
                        >
                          Editar Ficha
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">F. Nacimiento</p>
                          <p className="text-sm font-bold text-slate-700">
                            {selectedPlayerDetail.fecha_nacimiento ? (
                              <>
                                {new Date(selectedPlayerDetail.fecha_nacimiento).toLocaleDateString('es-ES')}
                                <span className="ml-2 text-sky-600">
                                  ({calculateAge(selectedPlayerDetail.fecha_nacimiento)} años)
                                </span>
                              </>
                            ) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lateralidad</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPlayerDetail.lateralidad || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">2ª Posición</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPlayerDetail.secondPosition || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Altura</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPlayerDetail.height || '—'}</p>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ficha Técnica</p>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                          {selectedPlayerDetail.observaciones ? (
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              "{selectedPlayerDetail.observaciones}"
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Sin observaciones técnicas registradas.</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => {
                              setActiveProfileView('stats');
                              if (selectedPlayerDetail) fetchPlayerMatchStats(selectedPlayerDetail.id);
                            }}
                            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all group cursor-pointer shadow-sm active:scale-95"
                          >
                            <BarChart2 className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Estadísticas</span>
                          </button>
                          <button 
                            onClick={() => {
                              setActiveProfileView('training');
                              fetchPlayerTrainingStats(selectedPlayerDetail.id, selectedPlayerDetail.teamId);
                            }}
                            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all group cursor-pointer shadow-sm active:scale-95"
                          >
                            <ClipboardList className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Entrenamientos</span>
                          </button>
                          <button 
                            onClick={() => setActiveProfileView('gym')}
                            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all group cursor-pointer shadow-sm active:scale-95"
                          >
                            <Dumbbell className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Gimnasio</span>
                          </button>
                          <button 
                            onClick={() => setActiveProfileView('reports')}
                            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all group cursor-pointer shadow-sm active:scale-95"
                          >
                            <FileText className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Informes</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : activeProfileView === 'training' ? (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => setActiveProfileView('info')}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Volver al Perfil</span>
                        </button>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Entrenamientos</h4>
                      </div>

                      {trainingStats.loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando historial...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-sky-500 p-6 rounded-[2rem] text-white shadow-xl shadow-sky-200">
                              <div className="flex items-center justify-between mb-2">
                                <Clock className="w-5 h-5 opacity-40" />
                                <span className="text-[10px] font-black tracking-widest opacity-60">TOTAL MIN.</span>
                              </div>
                              <p className="text-4xl font-black">{trainingStats.totalMinutes}</p>
                              <p className="text-[10px] font-bold mt-1 opacity-80">Minutos acumulados</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                              <div className="flex items-center justify-between mb-2">
                                <ClipboardCheck className="w-5 h-5 text-sky-400 opacity-60" />
                                <span className="text-[10px] font-black tracking-widest opacity-40">SESIONES</span>
                              </div>
                              <p className="text-4xl font-black">{trainingStats.disponible + trainingStats.comodin + trainingStats.noDisponible}</p>
                              <p className="text-[10px] font-bold mt-1 opacity-60">Participaciones totales</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl group transition-all hover:bg-emerald-100/50">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Disponible</span>
                              </div>
                              <span className="text-lg font-black text-emerald-600">{trainingStats.disponible}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl group transition-all hover:bg-amber-100/50">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Comodín</span>
                              </div>
                              <span className="text-lg font-black text-amber-600">{trainingStats.comodin}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl group transition-all hover:bg-rose-100/50">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-rose-500 rounded-full" />
                                <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">No Disponible</span>
                              </div>
                              <span className="text-lg font-black text-rose-600">{trainingStats.noDisponible}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeProfileView === 'gym' ? (
                    <div className="space-y-6">
                      {/* Header & Back Button */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <button 
                          onClick={() => setActiveProfileView('info')}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Volver al Perfil</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-5 h-5 text-sky-500" />
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Análisis de Gimnasio</h4>
                        </div>
                      </div>

                      {/* 3 Botones Pequeños Superiores: GRUPAL / INDIVIDUAL / TOTAL */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 gap-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setGymSubView('grupal')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gymSubView === 'grupal'
                              ? 'bg-white text-sky-600 shadow-xs border border-slate-200/80'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Grupal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGymSubView('individual')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gymSubView === 'individual'
                              ? 'bg-white text-sky-600 shadow-xs border border-slate-200/80'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Individual</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGymSubView('total')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gymSubView === 'total'
                              ? 'bg-white text-sky-600 shadow-xs border border-slate-200/80'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Total</span>
                        </button>
                      </div>

                      {gymStats.loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando analítica de gimnasio...</p>
                        </div>
                      ) : (() => {
                        const currentStats = gymSubView === 'grupal' 
                          ? gymStats.group 
                          : gymSubView === 'individual' 
                            ? gymStats.individual 
                            : gymStats.total;

                        const subViewLabel = gymSubView === 'grupal' 
                          ? 'Grupales' 
                          : gymSubView === 'individual' 
                            ? 'Individuales' 
                            : 'Totales';

                        const subViewTitle = gymSubView === 'grupal' 
                          ? 'Sesiones Grupales Realizadas' 
                          : gymSubView === 'individual' 
                            ? 'Sesiones Individuales Realizadas' 
                            : 'Sesiones Totales Realizadas';

                        return (
                          <div className="space-y-6">
                            {/* 1. KPI HIGHLIGHT CARD: SESIONES REALIZADAS */}
                            <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden border border-slate-800">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {gymSubView === 'grupal' && <Users className="w-5 h-5 text-sky-400" />}
                                  {gymSubView === 'individual' && <User className="w-5 h-5 text-sky-400" />}
                                  {gymSubView === 'total' && <Layers className="w-5 h-5 text-sky-400" />}
                                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    {subViewLabel}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black text-sky-300 bg-sky-950/80 border border-sky-800/60 px-2.5 py-0.5 rounded-full">
                                  {currentStats.totalSessions === 1 ? '1 Sesión' : `${currentStats.totalSessions} Sesiones`}
                                </span>
                              </div>
                              <p className="text-4xl font-black text-sky-400">{currentStats.totalSessions}</p>
                              <p className="text-[11px] font-bold mt-1 text-slate-300">
                                {subViewTitle}
                              </p>
                            </div>

                            {/* 2. BREAKDOWN: SESIONES POR TIPO (Solo para Grupal y Total) */}
                            {gymSubView !== 'individual' && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-sky-500" />
                                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Sesiones por Tipo</h5>
                                  </div>
                                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {Object.keys(currentStats.sessionsByType).length} Tipos
                                  </span>
                                </div>

                                {Object.keys(currentStats.sessionsByType).length === 0 ? (
                                  <div className="py-6 text-center space-y-1">
                                    <p className="text-xs font-bold text-slate-500">Sin registros por tipo de sesión ({subViewLabel.toLowerCase()})</p>
                                    <p className="text-[10px] text-slate-400">No hay sesiones de gimnasio registradas en esta categoría todavía.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {Object.entries(currentStats.sessionsByType)
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([type, count]) => {
                                        const total = (gymSubView === 'total' ? gymStats.group.totalSessions : currentStats.totalSessions) || 1;
                                        const percentage = Math.round((count / total) * 100);
                                        return (
                                          <div key={type} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                              <span className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-2xs"></span>
                                                {type}
                                              </span>
                                              <span className="text-slate-900 font-black">
                                                {count} {count === 1 ? 'sesión' : 'sesiones'} <span className="text-[10px] text-slate-400 font-normal">({percentage}%)</span>
                                              </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
                                              <div 
                                                className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(6, percentage))}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3. BREAKDOWN: EJERCICIOS POR GRUPO MUSCULAR */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-emerald-500" />
                                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Ejercicios por Grupo Muscular</h5>
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {currentStats.totalExercises} Ejercicios Totales
                                </span>
                              </div>

                              {Object.keys(currentStats.exercisesByMuscleGroup).length === 0 ? (
                                <div className="py-6 text-center space-y-1">
                                  <p className="text-xs font-bold text-slate-500">Sin ejercicios clasificados ({subViewLabel.toLowerCase()})</p>
                                  <p className="text-[10px] text-slate-400">Los ejercicios de las sesiones registradas no especifican grupo muscular.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {Object.entries(currentStats.exercisesByMuscleGroup)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([group, count]) => {
                                      const totalEx = currentStats.totalExercises || 1;
                                      const percentage = Math.round((count / totalEx) * 100);
                                      return (
                                        <div key={group} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl space-y-2 transition-colors">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                              {group}
                                            </span>
                                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70 shadow-2xs whitespace-nowrap">
                                              {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-slate-200/70 rounded-full h-2 overflow-hidden">
                                              <div 
                                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                                              ></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">{percentage}% del total</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : activeProfileView === 'stats' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <button 
                          onClick={() => setActiveProfileView('info')}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Volver al Perfil</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-5 h-5 text-sky-500" />
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Estadísticas de Competición</h4>
                        </div>
                      </div>

                      {/* Competition Filter */}
                      {matchStats.availableCompetitions.length > 0 && (
                        <div className="flex items-center justify-between gap-4 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar por:</span>
                          </div>
                          <select 
                            value={matchCompetitionFilter}
                            onChange={(e) => setMatchCompetitionFilter(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer text-center uppercase tracking-tight"
                          >
                            <option value="all">Todas las Competiciones</option>
                            {matchStats.availableCompetitions.map(comp => (
                              <option key={comp} value={comp}>{comp}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {matchStats.loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando estadísticas...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Main Stats Cards */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden border border-slate-800">
                              <div className="flex items-center justify-between mb-2">
                                <Trophy className="w-5 h-5 text-sky-400 opacity-60" />
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Partidos</span>
                              </div>
                              <p className="text-4xl font-black text-white">{matchStats.matchesPlayed}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{matchStats.starts} Tit.</span>
                                <span className="text-[10px] font-bold text-slate-500">•</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{matchStats.subEntries} Sup.</span>
                              </div>
                            </div>

                            <div className="bg-sky-500 p-5 rounded-3xl text-white shadow-xl shadow-sky-100 relative overflow-hidden border border-sky-400">
                              <div className="flex items-center justify-between mb-2">
                                <Clock className="w-5 h-5 opacity-60" />
                                <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">Minutos</span>
                              </div>
                              <p className="text-4xl font-black">{matchStats.minutes}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold opacity-80 uppercase">{matchStats.startsMinutes} Tit.</span>
                                <span className="text-[10px] font-bold opacity-50">•</span>
                                <span className="text-[10px] font-bold opacity-80 uppercase">{matchStats.subMinutes} Sup.</span>
                              </div>
                            </div>
                          </div>

                          {/* Minutes by Position Section */}
                          {Object.keys(matchStats.minutesByPosition).length > 0 && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-sky-500" />
                                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Minutos por Posición</h5>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                                  {Object.keys(matchStats.minutesByPosition).length} Pos.
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-2.5">
                                {Object.entries(matchStats.minutesByPosition)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([pos, min]) => {
                                    const percentage = Math.round((min / matchStats.minutes) * 100);
                                    return (
                                      <div key={pos} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                                          <span className="text-slate-600 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                            {pos}
                                          </span>
                                          <span className="text-slate-900">
                                            {min} <span className="text-[9px] text-slate-400 font-bold ml-0.5">MIN.</span>
                                          </span>
                                        </div>
                                        <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-slate-100">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            className="bg-sky-500 h-full rounded-full"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Secondary Stats Breakdown */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Rendimiento en Campo</h5>
                            
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Target className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Goles</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{matchStats.goals}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Zap className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Asistencias</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">{matchStats.assists}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Activity className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Remates (Puerta)</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {matchStats.shots} <span className="text-slate-400 text-sm">({matchStats.shotsOnTarget})</span>
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Precisión</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {matchStats.shots > 0 ? Math.round((matchStats.shotsOnTarget / matchStats.shots) * 100) : 0}%
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">Tarjetas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-4 bg-amber-400 rounded-xs shadow-2xs border border-amber-500/30" />
                                    <span className="text-lg font-black text-slate-900">{matchStats.yellowCards}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-4 bg-rose-500 rounded-xs shadow-2xs border border-rose-600/30" />
                                    <span className="text-lg font-black text-slate-900">{matchStats.redCards}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                                 <TrendingUp className="w-4 h-4 text-sky-600" />
                               </div>
                               <div>
                                 <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Rendimiento Promedio</p>
                                 <p className="text-[10px] font-bold text-slate-500">
                                   {matchStats.matchesPlayed > 0 
                                     ? `${(matchStats.minutes / matchStats.matchesPlayed).toFixed(1)} min / ${(matchStats.goals / matchStats.matchesPlayed).toFixed(2)} goles por partido`
                                     : 'Sin datos de partidos finalizados registrados.'}
                                 </p>
                               </div>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                      <button 
                        onClick={() => setActiveProfileView('info')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Volver</span>
                      </button>
                      <div className="p-4 bg-slate-50 rounded-full">
                        <Sparkles className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Sección en Desarrollo</p>
                        <p className="text-[10px] text-slate-400 font-bold max-w-[200px]">Próximamente disponible con toda la analítica detallada.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editCropperData && (
          <ImageCropper 
            image={editCropperData.image}
            onCancel={() => setEditCropperData(null)}
            onCropComplete={(croppedImage) => {
              setEditingPlayerData((prev: any) => ({ ...prev, image: croppedImage }));
              setEditCropperData(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal Añadir Jugadora */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Añadir Nueva Jugadora</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddPlayer} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      value={newPlayer.nombre}
                      onChange={e => setNewPlayer(prev => ({ ...prev, nombre: e.target.value, name: `${e.target.value} ${prev.apellidos}` }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="Ej. María"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Apellidos</label>
                    <input 
                      required
                      type="text" 
                      value={newPlayer.apellidos}
                      onChange={e => setNewPlayer(prev => ({ ...prev, apellidos: e.target.value, name: `${prev.nombre} ${e.target.value}` }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="Ej. García López"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Dorsal (Opcional)</label>
                    <input 
                      type="number" 
                      value={newPlayer.dorsal ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, dorsal: e.target.value, number: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="Sin dorsal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Posición</label>
                    <select 
                      required
                      value={newPlayer.position ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, position: e.target.value, demarcacion: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Porteras">Porteras</option>
                      <option value="Defensoras">Defensoras</option>
                      <option value="Mediocentros">Mediocentros</option>
                      <option value="Atacantes">Atacantes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">P. Específica</label>
                    <select 
                      value={newPlayer.posicion_especifica ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, posicion_especifica: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Portera">Portera</option>
                      <option value="Lateral Derecho">Lateral Derecho</option>
                      <option value="Central Derecho">Central Derecho</option>
                      <option value="Central Izquierdo">Central Izquierdo</option>
                      <option value="Carril Derecho">Carril Derecho</option>
                      <option value="Carril Izquierdo">Carril Izquierdo</option>
                      <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                      <option value="Mediocentro">Mediocentro</option>
                      <option value="Mediapunta">Mediapunta</option>
                      <option value="Extremo Derecha">Extremo Derecha</option>
                      <option value="Extremo Izquierda">Extremo Izquierda</option>
                      <option value="Delantera">Delantera</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Lateralidad (Opcional)</label>
                    <select 
                      value={newPlayer.lateralidad ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, lateralidad: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="">Sin lateralidad (Opcional)</option>
                      <option value="Diestra">Diestra</option>
                      <option value="Zurda">Zurda</option>
                      <option value="Ambidiestra">Ambidiestra</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">F. Nacimiento</label>
                    <input 
                      type="date" 
                      value={newPlayer.fecha_nacimiento ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Segunda Posición</label>
                    <select 
                      value={newPlayer.secondPosition ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, secondPosition: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="">Ninguna</option>
                      <option value="Portera">Portera</option>
                      <option value="Lateral Derecho">Lateral Derecho</option>
                      <option value="Central Derecho">Central Derecho</option>
                      <option value="Central Izquierdo">Central Izquierdo</option>
                      <option value="Carril Derecho">Carril Derecho</option>
                      <option value="Carril Izquierdo">Carril Izquierdo</option>
                      <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                      <option value="Mediocentro">Mediocentro</option>
                      <option value="Mediapunta">Mediapunta</option>
                      <option value="Extremo Derecha">Extremo Derecha</option>
                      <option value="Extremo Izquierda">Extremo Izquierda</option>
                      <option value="Delantera">Delantera</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Altura</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 1.70 m"
                      value={newPlayer.height ?? ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, height: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Observaciones</label>
                  <textarea 
                    value={newPlayer.observaciones ?? ''}
                    onChange={e => setNewPlayer(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none h-20 resize-none"
                    placeholder="Notas adicionales..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Imagen de la Jugadora</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newPlayer.image}
                      onChange={e => setNewPlayer(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="URL o Base64..."
                    />
                    <label className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-colors">
                      <Upload className="w-4 h-4" />
                      SUBIR
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCropperData({ image: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-100 mt-4"
                >
                  REGISTRAR JUGADORA
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Confirmar Eliminación */}
      <AnimatePresence>
        {playerToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPlayerToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar jugadora?</h3>
              <p className="text-sm text-slate-500 mb-6">Esta acción no se puede deshacer. Se borrarán todos los datos de la jugadora.</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPlayerToDelete(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => handleDeletePlayer(playerToDelete)}
                  className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
                >
                  SÍ, ELIMINAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropperData && (
          <ImageCropper 
            image={cropperData.image}
            onCancel={() => setCropperData(null)}
            onCropComplete={(croppedImage) => {
              setNewPlayer(prev => ({ ...prev, image: croppedImage }));
              setCropperData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

