import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart2, 
  Award, 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  Target, 
  Trophy, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Save, 
  Plus, 
  Minus, 
  Search, 
  Filter, 
  Flame, 
  ShieldAlert, 
  RotateCcw,
  Sparkles,
  Info,
  UserPlus,
  Trash2,
  ChevronDown,
  Layers,
  Pencil,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Team, Player } from '../types';
import { supabase } from '../lib/supabase';

interface StatsViewProps {
  season: string;
  selectedTeam: Team | null;
  teams?: Team[];
}

export type PlayerMatchStatus = 'titular' | 'suplente' | 'nc' | 'lesionada';

export interface PlayerMatchStat {
  playerId: string;
  playerName: string;
  playerNumber?: number;
  playerPhoto?: string;
  playerCategory?: string;
  playerOriginTeam?: string;
  isExternal?: boolean;
  status: PlayerMatchStatus;
  minutes: number;
  position: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cards: number;
  shots: number;
  shotsOnTarget: number;
}

export interface MatchRecord {
  id: string;
  dateIso: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  location: string;
  type: string;
  team: string;
  status: 'upcoming' | 'finished';
  homeScore: number | null;
  awayScore: number | null;
  notes?: string;
  details?: string;
  playerStats?: PlayerMatchStat[];
}

export const MATCH_POSITIONS = [
  'Portera',
  'Lateral Derecho',
  'Central Derecho',
  'Central Izquierdo',
  'Carril Derecho',
  'Carril Izquierdo',
  'Lateral Izquierdo',
  'Mediocentro',
  'Mediapunta',
  'Extremo Derecha',
  'Extremo Izquierda',
  'Delantera'
] as const;

export function getDefaultPlayerPosition(p: Player | Partial<Player>): string {
  if (p.posicion_especifica) {
    const pe = p.posicion_especifica.trim();
    if (MATCH_POSITIONS.includes(pe as any)) return pe;
    if (pe.toLowerCase().includes('port') || pe.toLowerCase().includes('gk')) return 'Portera';
    if (pe.toLowerCase().includes('lat') && pe.toLowerCase().includes('der')) return 'Lateral Derecho';
    if (pe.toLowerCase().includes('lat') && pe.toLowerCase().includes('izq')) return 'Lateral Izquierdo';
    if (pe.toLowerCase().includes('carril') && pe.toLowerCase().includes('der')) return 'Carril Derecho';
    if (pe.toLowerCase().includes('carril') && pe.toLowerCase().includes('izq')) return 'Carril Izquierdo';
    if (pe.toLowerCase().includes('centr') && pe.toLowerCase().includes('izq')) return 'Central Izquierdo';
    if (pe.toLowerCase().includes('centr') || pe.toLowerCase().includes('cb')) return 'Central Derecho';
    if (pe.toLowerCase().includes('med') || pe.toLowerCase().includes('piv') || pe.toLowerCase().includes('mc')) return 'Mediocentro';
    if (pe.toLowerCase().includes('punta') || pe.toLowerCase().includes('cam')) return 'Mediapunta';
    if (pe.toLowerCase().includes('ext') && pe.toLowerCase().includes('der')) return 'Extremo Derecha';
    if (pe.toLowerCase().includes('ext') && pe.toLowerCase().includes('izq')) return 'Extremo Izquierda';
    if (pe.toLowerCase().includes('del') || pe.toLowerCase().includes('dc') || pe.toLowerCase().includes('st')) return 'Delantera';
  }

  const pos = (p.demarcacion || p.position || '').trim().toLowerCase();
  if (pos.includes('port') || pos.includes('gk')) return 'Portera';
  if (pos.includes('lat') && pos.includes('der')) return 'Lateral Derecho';
  if (pos.includes('lat') && pos.includes('izq')) return 'Lateral Izquierdo';
  if (pos.includes('carril') && pos.includes('der')) return 'Carril Derecho';
  if (pos.includes('carril') && pos.includes('izq')) return 'Carril Izquierdo';
  if (pos.includes('centr') && pos.includes('izq')) return 'Central Izquierdo';
  if (pos.includes('centr') || pos.includes('cb')) return 'Central Derecho';
  if (pos.includes('med') || pos.includes('piv') || pos.includes('mc')) return 'Mediocentro';
  if (pos.includes('punta') || pos.includes('cam')) return 'Mediapunta';
  if (pos.includes('ext') && pos.includes('der')) return 'Extremo Derecha';
  if (pos.includes('ext') && pos.includes('izq')) return 'Extremo Izquierda';
  if (pos.includes('del') || pos.includes('dc') || pos.includes('st') || pos.includes('atacante')) return 'Delantera';
  if (pos.includes('defensora')) return 'Central Derecho';
  if (pos.includes('centrocampista')) return 'Mediocentro';

  return 'Mediocentro';
}

const INITIAL_FINISHED_MATCHES: MatchRecord[] = [
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
  }
];

export default function StatsView({ season, selectedTeam, teams = [] }: StatsViewProps) {
  const currentTeamName = selectedTeam ? selectedTeam.name : 'Todas las Plantillas';

  const [matches, setMatches] = useState<MatchRecord[]>(INITIAL_FINISHED_MATCHES);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Selected match for detail view
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [isEditingMatch, setIsEditingMatch] = useState<boolean>(false);
  const [matchPlayerStats, setMatchPlayerStats] = useState<Record<string, PlayerMatchStat>>({});
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filters inside match roster
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'titular' | 'suplente' | 'nc' | 'lesionada'>('all');

  // "Añadir jugadora de otra plantilla" state
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [externalTeamFilter, setExternalTeamFilter] = useState<string>('all');
  const [externalSearchQuery, setExternalSearchQuery] = useState<string>('');

  // Active top sub-view: 'matches' (Partidos Finalizados) or 'rankings' (Resumen Global)
  const [activeMainTab, setActiveMainTab] = useState<'matches' | 'rankings'>('matches');

  // Selected Competition Filter ('all' = todas las competiciones)
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');

  // Available unique competitions (Extracted from matches data)
  const availableCompetitions = useMemo(() => {
    const list: string[] = [];
    matches.forEach(m => {
      const comp = (m.type || '').trim();
      if (comp && !list.includes(comp)) {
        list.push(comp);
      }
    });
    // Sort alphabetically
    return list.sort((a, b) => a.localeCompare(b));
  }, [matches]);

  // Sorting state for the individual ranking table (Default: dorsal/number ascending)
  const [rankingSortField, setRankingSortField] = useState<'number' | 'minutes' | 'goals' | 'assists' | 'shots' | 'shotsOnTarget' | 'cards'>('number');
  const [rankingSortDirection, setRankingSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load all players strictly from Supabase database
  useEffect(() => {
    async function loadPlayers() {
      if (!supabase) {
        setAllPlayers([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('number', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: Player[] = data.map((p: any) => ({
            ...p,
            id: String(p.id),
            name: p.name || `${p.nombre || ''} ${p.apellidos || ''}`.trim(),
            number: p.number !== undefined && p.number !== null ? Number(p.number) : (p.dorsal !== undefined ? Number(p.dorsal) : undefined),
            position: p.posicion_especifica || p.demarcacion || p.position || '',
            secondPosition: p.secondPosition || p.second_position || p.segunda_posicion || p.segunda_posicion_especifica || '',
            teamId: p.team_id || p.teamid || p.teamId || p.team_name || p.team || ''
          }));
          setAllPlayers(mapped);
        } else {
          setAllPlayers([]);
        }
      } catch (err) {
        console.error('Error fetching players in StatsView:', err);
        setAllPlayers([]);
      }
    }
    loadPlayers();
  }, [selectedTeam, season]);

  // Load matches from Supabase
  useEffect(() => {
    async function fetchFinishedMatches() {
      setLoadingMatches(true);
      if (!supabase) {
        setLoadingMatches(false);
        return;
      }
      try {
        let response = await supabase
          .from('matches')
          .select('*')
          .order('date_iso', { ascending: false });

        if (response.error && (response.error.code === '42P01' || response.error.message?.includes('does not exist'))) {
          response = await supabase
            .from('calendar_matches')
            .select('*')
            .order('date_iso', { ascending: false });
        }

        if (response.data && response.data.length > 0) {
          const mapped: MatchRecord[] = response.data.map((m: any) => {
            let statsFromDB: PlayerMatchStat[] | undefined = undefined;
            if (m.notes) {
              try {
                const parsed = JSON.parse(m.notes);
                if (parsed?.playerStats && Array.isArray(parsed.playerStats)) {
                  statsFromDB = parsed.playerStats;
                }
              } catch (e) {
                // not json
              }
            }
            if (!statsFromDB && m.details) {
              try {
                const parsed = JSON.parse(m.details);
                if (parsed?.playerStats && Array.isArray(parsed.playerStats)) {
                  statsFromDB = parsed.playerStats;
                }
              } catch (e) {
                // not json
              }
            }

            // Check localStorage cache as well
            if (!statsFromDB) {
              try {
                const localCache = localStorage.getItem(`match_player_stats_${m.id}`);
                if (localCache) {
                  statsFromDB = JSON.parse(localCache);
                }
              } catch (e) {
                // ignore
              }
            }

            return {
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
              notes: m.notes || '',
              details: m.details || '',
              playerStats: statsFromDB
            };
          });

          setMatches(mapped);
        }
      } catch (err) {
        console.error('Error fetching finished matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    }
    fetchFinishedMatches();
  }, [season]);

  // Filter finished matches by selected team and selected competition
  const finishedMatches = useMemo(() => {
    return matches.filter(m => {
      const isFinished = m.status === 'finished';
      if (!isFinished) return false;

      // Filter by competition
      if (selectedCompetition !== 'all') {
        const matchComp = (m.type || '').trim().toLowerCase();
        const selectedComp = selectedCompetition.trim().toLowerCase();
        if (matchComp !== selectedComp) return false;
      }

      if (!selectedTeam) return true;
      const teamMatch = m.team === selectedTeam.name || 
                        m.homeTeam.toUpperCase().includes(selectedTeam.name.toUpperCase()) || 
                        m.awayTeam.toUpperCase().includes(selectedTeam.name.toUpperCase());
      return teamMatch;
    });
  }, [matches, selectedTeam, selectedCompetition]);

  // Helper to find player object across all known players
  const findPlayerInfo = (playerId: string): Player | undefined => {
    return allPlayers.find(pl => String(pl.id) === playerId);
  };

  // Helper to determine if a player belongs to the match's primary team
  const isPlayerInMainMatchTeam = (p: Player | Partial<Player>): boolean => {
    if (!selectedMatch) return false;
    let targetTeamName = selectedMatch.team || (selectedTeam ? selectedTeam.name : '');
    let targetTeamId = selectedTeam?.id || '';

    if (teams && teams.length > 0) {
      const foundT = teams.find(t => 
        t.name.toLowerCase() === targetTeamName.toLowerCase() || 
        t.id === targetTeamName ||
        targetTeamName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (foundT) targetTeamId = foundT.id;
    }

    const pTeamId = String(p.teamId || (p as any).team_id || (p as any).teamid || '');
    if (targetTeamId && (pTeamId === targetTeamId || pTeamId.toLowerCase() === targetTeamId.toLowerCase())) return true;
    const pTeam = String((p as any).team_name || (p as any).team || p.teamId || '').toUpperCase();
    if (targetTeamName && pTeam && (pTeam.includes(targetTeamName.toUpperCase()) || targetTeamName.toUpperCase().includes(pTeam))) return true;
    return false;
  };

  // Get active roster for the selected match:
  // Main squad players first, filial/external players at the bottom
  const matchSquadPlayers = useMemo(() => {
    if (!selectedMatch) return [];

    let mainSquad = allPlayers.filter(p => isPlayerInMainMatchTeam(p));
    mainSquad.sort((a, b) => (Number(a.number !== undefined && a.number !== null ? a.number : 99) - Number(b.number !== undefined && b.number !== null ? b.number : 99)));

    // Collect any external / filial players added in matchPlayerStats
    const externalPlayersList: Player[] = [];
    Object.keys(matchPlayerStats).forEach(pId => {
      const isAlreadyInMain = mainSquad.some(p => String(p.id) === pId);
      if (!isAlreadyInMain) {
        const found = findPlayerInfo(pId);
        if (found) {
          externalPlayersList.push(found);
        } else {
          const stat = matchPlayerStats[pId];
          if (stat) {
            externalPlayersList.push({
              id: pId,
              name: stat.playerName,
              number: stat.playerNumber,
              posicion_especifica: stat.position,
              position: stat.playerCategory || 'Delanteras',
              teamId: stat.playerOriginTeam || ''
            } as Player);
          }
        }
      }
    });

    externalPlayersList.sort((a, b) => (Number(a.number !== undefined && a.number !== null ? a.number : 99) - Number(b.number !== undefined && b.number !== null ? b.number : 99)));

    // Return main squad first, and all filial/external players at the bottom
    return [...mainSquad, ...externalPlayersList];
  }, [selectedMatch, allPlayers, selectedTeam, teams, matchPlayerStats]);

  // Open match player stats sheet
  const handleOpenMatchSheet = async (match: MatchRecord) => {
    setSelectedMatch(match);
    setIsEditingMatch(false);
    setSaveSuccessMsg(null);
    setPlayerSearchQuery('');
    setStatusFilter('all');
    setIsAddExternalOpen(false);
    setExternalSearchQuery('');
    setExternalTeamFilter('all');

    // Retrieve existing stats if any
    let existingStats: PlayerMatchStat[] = match.playerStats || [];
    
    // Check Supabase match_player_stats table directly
    if (supabase) {
      try {
        const { data: dbRows, error: dbErr } = await supabase
          .from('match_player_stats')
          .select('*')
          .eq('match_id', String(match.id));

        if (!dbErr && dbRows && dbRows.length > 0) {
          existingStats = dbRows.map((r: any) => ({
            playerId: String(r.player_id),
            playerName: r.player_name || 'Jugadora',
            playerNumber: r.player_number !== null && r.player_number !== undefined ? Number(r.player_number) : undefined,
            playerPhoto: r.player_photo || '',
            playerCategory: r.player_category || '',
            playerOriginTeam: r.player_origin_team || '',
            isExternal: Boolean(r.is_external),
            status: r.status || 'suplente',
            minutes: Number(r.minutes) || 0,
            position: r.position || 'Mediocentro',
            goals: Number(r.goals) || 0,
            assists: Number(r.assists) || 0,
            yellowCards: Number(r.yellow_cards) || 0,
            redCards: Number(r.red_cards) || 0,
            cards: Number(r.cards) || ((Number(r.yellow_cards) || 0) + (Number(r.red_cards) || 0)),
            shots: Number(r.shots) || 0,
            shotsOnTarget: Number(r.shots_on_target) || 0
          }));
        }
      } catch (e) {
        // match_player_stats table might not exist yet
      }
    }

    if (!existingStats || existingStats.length === 0) {
      try {
        const local = localStorage.getItem(`match_player_stats_${match.id}`);
        if (local) existingStats = JSON.parse(local);
      } catch (e) {
        // ignore
      }
    }

    const statsMap: Record<string, PlayerMatchStat> = {};

    // Initialize existing stats
    if (existingStats && existingStats.length > 0) {
      existingStats.forEach(stat => {
        statsMap[stat.playerId] = {
          ...stat,
          cards: (stat.yellowCards || 0) + (stat.redCards || 0)
        };
      });
    }

    // Populate remaining squad players with default values
    let targetTeamName = match.team || (selectedTeam ? selectedTeam.name : '');
    let targetTeamId = selectedTeam?.id || '';

    if (teams && teams.length > 0) {
      const foundT = teams.find(t => 
        t.name.toLowerCase() === targetTeamName.toLowerCase() || 
        t.id === targetTeamName ||
        targetTeamName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (foundT) targetTeamId = foundT.id;
    }

    let squad = allPlayers.filter(p => {
      const pTeamId = String(p.teamId || (p as any).team_id || (p as any).teamid || '');
      if (targetTeamId && (pTeamId === targetTeamId || pTeamId.toLowerCase() === targetTeamId.toLowerCase())) return true;
      const pTeam = String((p as any).team_name || (p as any).team || p.teamId || '').toUpperCase();
      if (targetTeamName && pTeam && (pTeam.includes(targetTeamName.toUpperCase()) || targetTeamName.toUpperCase().includes(pTeam))) return true;
      return false;
    });

    squad.forEach((player, index) => {
      const pId = String(player.id || `p_${index}`);
      if (!statsMap[pId]) {
        const isDefaultStarter = index < 11;
        const defaultPos = getDefaultPlayerPosition(player);
        statsMap[pId] = {
          playerId: pId,
          playerName: player.name || (player as any).nombre ? `${(player as any).nombre} ${(player as any).apellidos || ''}`.trim() : `Jugadora #${player.number || index + 1}`,
          playerNumber: player.number !== undefined ? Number(player.number) : undefined,
          playerPhoto: (player as any).image || (player as any).foto || (player as any).avatar || '',
          playerCategory: (player as any).demarcacion || player.position || '',
          playerOriginTeam: player.teamId || targetTeamName,
          isExternal: false,
          status: isDefaultStarter ? 'titular' : 'suplente',
          minutes: isDefaultStarter ? 90 : 0,
          position: defaultPos,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          cards: 0,
          shots: 0,
          shotsOnTarget: 0
        };
      }
    });

    setMatchPlayerStats(statsMap);
  };

  // Update a field in the player match stats
  const handleUpdatePlayerField = (playerId: string, field: keyof PlayerMatchStat, value: any) => {
    setMatchPlayerStats(prev => {
      const origPlayer = findPlayerInfo(playerId);
      const defaultPos = origPlayer ? getDefaultPlayerPosition(origPlayer) : 'Mediocentro';

      const current = prev[playerId] || {
        playerId,
        playerName: origPlayer?.name || 'Jugadora',
        playerNumber: origPlayer?.number,
        status: 'titular',
        minutes: 90,
        position: defaultPos,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        cards: 0,
        shots: 0,
        shotsOnTarget: 0
      };

      const updated = { ...current, [field]: value };

      // Automations based on status change
      if (field === 'status') {
        const newStatus = value as PlayerMatchStatus;
        // User requested: "Al seleccionar titular o suplente, quiero que la posición sea la misma predeterminada."
        if (origPlayer) {
          updated.position = getDefaultPlayerPosition(origPlayer);
        }

        if (newStatus === 'titular') {
          if (updated.minutes === 0) updated.minutes = 90;
        } else if (newStatus === 'nc' || newStatus === 'lesionada') {
          updated.minutes = 0;
          updated.goals = 0;
          updated.assists = 0;
          updated.shots = 0;
          updated.shotsOnTarget = 0;
          updated.yellowCards = 0;
          updated.redCards = 0;
          updated.cards = 0;
        }
      }

      // Keep cards sum in sync
      if (field === 'yellowCards' || field === 'redCards') {
        updated.cards = (updated.yellowCards || 0) + (updated.redCards || 0);
      }

      // Remates a puerta cannot exceed total remates
      if (field === 'shotsOnTarget' && Number(value) > Number(updated.shots)) {
        updated.shots = Number(value);
      }
      if (field === 'shots' && Number(value) < Number(updated.shotsOnTarget)) {
        updated.shotsOnTarget = Number(value);
      }

      return {
        ...prev,
        [playerId]: updated
      };
    });
  };

  // Add external player from another squad
  const handleAddExternalPlayer = (player: Player) => {
    const pId = String(player.id);
    const defaultPos = getDefaultPlayerPosition(player);
    const originTeam = player.teamId || (player as any).team_name || (player as any).team || 'Otra Plantilla';

    setMatchPlayerStats(prev => ({
      ...prev,
      [pId]: {
        playerId: pId,
        playerName: player.name || (player as any).nombre ? `${(player as any).nombre} ${(player as any).apellidos || ''}`.trim() : `Jugadora #${player.number || ''}`,
        playerNumber: player.number !== undefined ? Number(player.number) : undefined,
        playerPhoto: (player as any).image || (player as any).foto || (player as any).avatar || '',
        playerCategory: (player as any).demarcacion || player.position || '',
        playerOriginTeam: originTeam,
        isExternal: true,
        status: 'suplente',
        minutes: 0,
        position: defaultPos,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        cards: 0,
        shots: 0,
        shotsOnTarget: 0
      }
    }));

    setSaveSuccessMsg(`¡${player.name} (${originTeam}) añadida a la convocatoria!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Remove player from the match roster
  const handleRemovePlayerFromMatch = (playerId: string) => {
    setMatchPlayerStats(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  // Save stats to Supabase and localStorage
  const handleSaveStats = async () => {
    if (!selectedMatch) return;
    setIsSavingStats(true);
    setSaveSuccessMsg(null);

    const statsArray = Object.values(matchPlayerStats);

    // Save to localStorage immediately
    try {
      localStorage.setItem(`match_player_stats_${selectedMatch.id}`, JSON.stringify(statsArray));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // Save to Supabase
    if (supabase) {
      try {
        const payloadJson = JSON.stringify({
          playerStats: statsArray,
          lastUpdated: new Date().toISOString(),
          totalGoals: statsArray.reduce((sum, p) => sum + (p.goals || 0), 0),
          totalAssists: statsArray.reduce((sum, p) => sum + (p.assists || 0), 0),
          totalShots: statsArray.reduce((sum, p) => sum + (p.shots || 0), 0),
          totalShotsOnTarget: statsArray.reduce((sum, p) => sum + (p.shotsOnTarget || 0), 0),
          totalCards: statsArray.reduce((sum, p) => sum + (p.cards || 0), 0)
        });

        // 1. Try updating matches table
        let { error } = await supabase
          .from('matches')
          .update({
            type: selectedMatch.type,
            notes: payloadJson,
            details: payloadJson
          })
          .eq('id', selectedMatch.id);

        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          await supabase
            .from('calendar_matches')
            .update({
              type: selectedMatch.type,
              notes: payloadJson,
              details: payloadJson
            })
            .eq('id', selectedMatch.id);
        }

        // 2. Try inserting/updating match_player_stats table if it exists
        try {
          const rowsToInsert = statsArray.map(stat => ({
            match_id: String(selectedMatch.id),
            player_id: String(stat.playerId),
            player_name: stat.playerName,
            player_number: stat.playerNumber !== undefined && stat.playerNumber !== null ? Number(stat.playerNumber) : null,
            player_photo: stat.playerPhoto || null,
            player_category: stat.playerCategory || null,
            player_origin_team: stat.playerOriginTeam || null,
            is_external: Boolean(stat.isExternal),
            status: stat.status,
            minutes: Number(stat.minutes) || 0,
            position: stat.position || 'Mediocentro',
            goals: Number(stat.goals) || 0,
            assists: Number(stat.assists) || 0,
            yellow_cards: Number(stat.yellowCards) || 0,
            red_cards: Number(stat.redCards) || 0,
            cards: (Number(stat.yellowCards) || 0) + (Number(stat.redCards) || 0),
            shots: Number(stat.shots) || 0,
            shots_on_target: Number(stat.shotsOnTarget) || 0,
            updated_at: new Date().toISOString()
          }));

          await supabase
            .from('match_player_stats')
            .upsert(rowsToInsert, { onConflict: 'match_id,player_id' });
        } catch (e) {
          // table may not exist yet, notes payload handles it safely
        }
      } catch (err) {
        console.error('Error saving match stats to Supabase:', err);
      }
    }

    // Update state
    setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, playerStats: statsArray } : m));
    setSelectedMatch(prev => prev ? { ...prev, playerStats: statsArray } : null);

    setIsSavingStats(false);
    setSaveSuccessMsg('¡Estadísticas del partido guardadas con éxito!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Calculate live match KPI totals from matchPlayerStats
  const matchTotals = useMemo(() => {
    const list = Object.values(matchPlayerStats);
    const startersCount = list.filter(p => p.status === 'titular').length;
    const subsCount = list.filter(p => p.status === 'suplente').length;
    const ncCount = list.filter(p => p.status === 'nc').length;
    const injuredCount = list.filter(p => p.status === 'lesionada').length;
    const totalGoals = list.reduce((acc, p) => acc + (p.goals || 0), 0);
    const totalAssists = list.reduce((acc, p) => acc + (p.assists || 0), 0);
    const totalShots = list.reduce((acc, p) => acc + (p.shots || 0), 0);
    const totalShotsOnTarget = list.reduce((acc, p) => acc + (p.shotsOnTarget || 0), 0);
    const totalYellowCards = list.reduce((acc, p) => acc + (p.yellowCards || 0), 0);
    const totalRedCards = list.reduce((acc, p) => acc + (p.redCards || 0), 0);
    const totalMinutes = list.reduce((acc, p) => acc + (p.minutes || 0), 0);

    return {
      startersCount,
      subsCount,
      ncCount,
      injuredCount,
      totalGoals,
      totalAssists,
      totalShots,
      totalShotsOnTarget,
      totalYellowCards,
      totalRedCards,
      totalMinutes,
      shotAccuracy: totalShots > 0 ? Math.round((totalShotsOnTarget / totalShots) * 100) : 0
    };
  }, [matchPlayerStats]);

  // Aggregate stats across all finished matches for Rankings view
  const aggregatedRankings = useMemo(() => {
    const playerAgg: Record<string, {
      id: string;
      name: string;
      number?: number;
      position: string;
      matchesPlayed: number;
      starts: number;
      subEntries: number;
      minutes: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      cards: number;
      shots: number;
      shotsOnTarget: number;
    }> = {};

    matches.forEach(m => {
      if (m.status === 'finished' && m.playerStats) {
        // Filter by competition
        if (selectedCompetition !== 'all') {
          const matchComp = (m.type || '').trim().toLowerCase();
          const targetComp = selectedCompetition.trim().toLowerCase();
          if (matchComp !== targetComp) return;
        }

        // Filter by team
        if (selectedTeam) {
          const teamMatch = m.team === selectedTeam.name || 
                            m.homeTeam.toUpperCase().includes(selectedTeam.name.toUpperCase()) || 
                            m.awayTeam.toUpperCase().includes(selectedTeam.name.toUpperCase());
          if (!teamMatch) return;
        }

        m.playerStats.forEach(stat => {
          if (!playerAgg[stat.playerId]) {
            playerAgg[stat.playerId] = {
              id: stat.playerId,
              name: stat.playerName,
              number: stat.playerNumber,
              position: stat.position,
              matchesPlayed: 0,
              starts: 0,
              subEntries: 0,
              minutes: 0,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              cards: 0,
              shots: 0,
              shotsOnTarget: 0
            };
          }

          const agg = playerAgg[stat.playerId];
          if (stat.status === 'titular') {
            agg.matchesPlayed += 1;
            agg.starts += 1;
          } else if (stat.status === 'suplente' && stat.minutes > 0) {
            agg.matchesPlayed += 1;
            agg.subEntries += 1;
          }

          agg.minutes += (stat.minutes || 0);
          agg.goals += (stat.goals || 0);
          agg.assists += (stat.assists || 0);
          agg.yellowCards += (stat.yellowCards || 0);
          agg.redCards += (stat.redCards || 0);
          agg.cards += ((stat.yellowCards || 0) + (stat.redCards || 0));
          agg.shots += (stat.shots || 0);
          agg.shotsOnTarget += (stat.shotsOnTarget || 0);
        });
      }
    });

    return Object.values(playerAgg);
  }, [matches, selectedCompetition, selectedTeam]);

  // Sort handler for the individual ranking table
  const handleSortRanking = (field: 'number' | 'minutes' | 'goals' | 'assists' | 'shots' | 'shotsOnTarget' | 'cards') => {
    if (rankingSortField === field) {
      setRankingSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setRankingSortField(field);
      // For dorsal number default to asc (1, 2, 3..); for stat metrics default to desc (highest first)
      setRankingSortDirection(field === 'number' ? 'asc' : 'desc');
    }
  };

  // Sorted list for individual ranking table
  const sortedRankings = useMemo(() => {
    return [...aggregatedRankings].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (rankingSortField) {
        case 'number':
          valA = a.number !== undefined && a.number !== null ? a.number : 999;
          valB = b.number !== undefined && b.number !== null ? b.number : 999;
          break;
        case 'minutes':
          valA = a.minutes || 0;
          valB = b.minutes || 0;
          break;
        case 'goals':
          valA = a.goals || 0;
          valB = b.goals || 0;
          break;
        case 'shots':
          valA = a.shots || 0;
          valB = b.shots || 0;
          break;
        case 'shotsOnTarget':
          valA = a.shotsOnTarget || 0;
          valB = b.shotsOnTarget || 0;
          break;
        case 'cards':
          valA = (a.cards ?? ((a.yellowCards || 0) + (a.redCards || 0))) || 0;
          valB = (b.cards ?? ((b.yellowCards || 0) + (b.redCards || 0))) || 0;
          break;
        default:
          valA = a.number !== undefined && a.number !== null ? a.number : 999;
          valB = b.number !== undefined && b.number !== null ? b.number : 999;
      }

      if (valA === valB) {
        const numA = a.number !== undefined && a.number !== null ? a.number : 999;
        const numB = b.number !== undefined && b.number !== null ? b.number : 999;
        return numA - numB;
      }

      return rankingSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedRankings, rankingSortField, rankingSortDirection]);

  // Helper to render sort icon indicator on ranking table headers
  const renderSortIndicator = (field: 'number' | 'minutes' | 'goals' | 'assists' | 'shots' | 'shotsOnTarget' | 'cards') => {
    if (rankingSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />;
    }
    return rankingSortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-600 font-bold shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-600 font-bold shrink-0" />
    );
  };

  // Filtered squad list for the active match sheet
  const filteredSquadList = useMemo(() => {
    return matchSquadPlayers.filter(player => {
      const pId = String(player.id);
      const stat = matchPlayerStats[pId];
      const pName = player.name || (player as any).nombre || '';
      
      // Status filter
      if (statusFilter !== 'all') {
        if (stat?.status !== statusFilter) return false;
      }

      // Search filter
      if (playerSearchQuery.trim()) {
        const q = playerSearchQuery.toLowerCase();
        const numStr = String(player.number || '');
        const matchName = pName.toLowerCase().includes(q);
        const matchNum = numStr.includes(q);
        const matchPos = (stat?.position || '').toLowerCase().includes(q);
        return matchName || matchNum || matchPos;
      }

      return true;
    });
  }, [matchSquadPlayers, matchPlayerStats, statusFilter, playerSearchQuery]);

  // List of other teams (excluding the active match's team / current selected team)
  const otherTeamsList = useMemo(() => {
    let activeTeamName = selectedMatch?.team || selectedTeam?.name || '';
    let activeTeamId = selectedTeam?.id || '';

    if (teams && teams.length > 0) {
      const foundT = teams.find(t => 
        t.name.toLowerCase() === activeTeamName.toLowerCase() || 
        t.id === activeTeamName ||
        activeTeamName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (foundT) {
        activeTeamId = foundT.id;
        activeTeamName = foundT.name;
      }
    }

    if (teams && teams.length > 0) {
      return teams.filter(t => {
        if (activeTeamId && t.id.toLowerCase() === activeTeamId.toLowerCase()) return false;
        if (activeTeamName && (t.name.toLowerCase() === activeTeamName.toLowerCase() || t.name.toLowerCase().includes(activeTeamName.toLowerCase()) || activeTeamName.toLowerCase().includes(t.name.toLowerCase()))) return false;
        return true;
      });
    }

    const defaultList = [
      { id: 'FEMENINO_A', name: 'ATB FEMENINO A' },
      { id: 'FEMENINO_B', name: 'ATB FEMENINO B' },
      { id: 'FEMENINO_C', name: 'ATB FEMENINO C' },
      { id: 'FEMENINO_D', name: 'ATB FEMENINO D' }
    ];
    return defaultList.filter(t => !t.name.toLowerCase().includes(activeTeamName.toLowerCase()));
  }, [teams, selectedMatch, selectedTeam]);

  // List of available external players to add (from other squads/filiales)
  const availableExternalPlayers = useMemo(() => {
    const currentInMatchIds = new Set(Object.keys(matchPlayerStats));

    return allPlayers.filter(p => {
      const pId = String(p.id);
      if (currentInMatchIds.has(pId)) return false;

      // Do NOT show players of the main match team
      if (isPlayerInMainMatchTeam(p)) return false;

      // Filter by selected other team if not 'all'
      if (externalTeamFilter !== 'all') {
        const pTeamId = String(p.teamId || (p as any).team_id || (p as any).teamid || '');
        const pTeamName = String((p as any).team_name || (p as any).team || p.teamId || '');
        
        // Find matching team in teams list
        const filterTeam = teams.find(t => t.id === externalTeamFilter || t.name === externalTeamFilter);
        
        let matchesTeam = false;
        if (filterTeam) {
          if (pTeamId && (pTeamId === filterTeam.id || pTeamId.toLowerCase() === filterTeam.id.toLowerCase())) {
            matchesTeam = true;
          } else if (pTeamName && (pTeamName.toLowerCase().includes(filterTeam.name.toLowerCase()) || filterTeam.name.toLowerCase().includes(pTeamName.toLowerCase()))) {
            matchesTeam = true;
          }
        } else {
          if (pTeamId && (pTeamId === externalTeamFilter || pTeamId.toLowerCase() === externalTeamFilter.toLowerCase())) {
            matchesTeam = true;
          } else if (pTeamName && (pTeamName.toLowerCase().includes(externalTeamFilter.toLowerCase()) || externalTeamFilter.toLowerCase().includes(pTeamName.toLowerCase()))) {
            matchesTeam = true;
          }
        }

        if (!matchesTeam) return false;
      }

      // Search filter
      if (externalSearchQuery.trim()) {
        const q = externalSearchQuery.toLowerCase();
        const pName = (p.name || (p as any).nombre || '').toLowerCase();
        const pNum = String(p.number !== undefined && p.number !== null ? p.number : '');
        const pPos = (p.posicion_especifica || p.demarcacion || p.position || '').toLowerCase();
        return pName.includes(q) || pNum.includes(q) || pPos.includes(q);
      }

      return true;
    });
  }, [allPlayers, matchPlayerStats, externalTeamFilter, externalSearchQuery, teams, selectedMatch, selectedTeam]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <BarChart2 className="w-6 h-6 text-sky-600" />
          <span>ESTADÍSTICAS</span>
        </h3>

        {/* Top Navigation Tabs & Competition Filter */}
        {!selectedMatch && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Desplegable Selector de Competición */}
            <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <label htmlFor="stats-competition-select" className="text-[11px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Competición:
              </label>
              <select
                id="stats-competition-select"
                value={selectedCompetition}
                onChange={(e) => setSelectedCompetition(e.target.value)}
                className="bg-white text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs outline-none cursor-pointer hover:border-sky-300 focus:ring-2 focus:ring-sky-400 transition-all"
              >
                <option value="all">Todas las Competiciones</option>
                {availableCompetitions.map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                id="stats-tab-matches"
                onClick={() => setActiveMainTab('matches')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeMainTab === 'matches'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-sky-600" />
                Partidos Finalizados ({finishedMatches.length})
              </button>
              <button
                id="stats-tab-rankings"
                onClick={() => setActiveMainTab('rankings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeMainTab === 'rankings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                Ranking Individual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DETALLE Y PLANTILLA DESPLEGADA DE UN PARTIDO SELECCIONADO */}
      {/* ========================================================================= */}
      {selectedMatch ? (
        <div className="space-y-6">
          {/* Match Detail Header Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <Trophy className="w-80 h-80 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <button
                  id="stats-btn-back-matches"
                  onClick={() => setSelectedMatch(null)}
                  className="inline-flex items-center gap-2 text-xs font-black text-sky-400 hover:text-sky-300 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a Partidos Finalizados
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                  {isEditingMatch ? (
                    <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                      <Trophy className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Competición:</span>
                      <select
                        id="stats-match-competition-select"
                        value={selectedMatch.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setSelectedMatch(prev => prev ? { ...prev, type: newType } : null);
                          setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, type: newType } : m));
                        }}
                        className="bg-slate-900 text-sky-300 font-bold border border-slate-700 rounded-lg px-2 py-0.5 outline-none cursor-pointer focus:ring-1 focus:ring-sky-400 text-xs"
                      >
                        {availableCompetitions.map(comp => (
                          <option key={comp} value={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                      {selectedMatch.type}
                    </span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {selectedMatch.dateIso}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {selectedMatch.time} hs
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedMatch.location}
                  </span>
                </div>

                {/* Score & Teams */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-black text-white">{selectedMatch.homeTeam}</h2>
                    <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-2xl flex items-center gap-2 font-mono text-2xl md:text-3xl font-black text-sky-400 shadow-inner">
                      <span>{selectedMatch.homeScore ?? 0}</span>
                      <span className="text-slate-500">-</span>
                      <span>{selectedMatch.awayScore ?? 0}</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white">{selectedMatch.awayTeam}</h2>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                {!isEditingMatch ? (
                  <button
                    id="stats-btn-start-edit"
                    type="button"
                    onClick={() => setIsEditingMatch(true)}
                    className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Editar Acta</span>
                  </button>
                ) : (
                  <>
                    <button
                      id="stats-btn-cancel-edit"
                      type="button"
                      onClick={() => setIsEditingMatch(false)}
                      className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span>Ver Resumen</span>
                    </button>

                    <button
                      id="stats-btn-save-stats"
                      type="button"
                      disabled={isSavingStats}
                      onClick={handleSaveStats}
                      className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingStats ? 'Guardando...' : 'Guardar Estadísticas'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Success Toast */}
            {saveSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {saveSuccessMsg}
              </motion.div>
            )}
          </div>

          {/* Match Summary KPIs (4 Cards: Goles Jugadoras, Remates Totales, Remates a Puerta, Tarjetas) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Goles Jugadoras */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goles Jugadoras</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-sky-600">{matchTotals.totalGoals}</span>
                <span className="text-xs font-bold text-slate-400">goles</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Marcador: {selectedMatch.homeScore ?? 0} - {selectedMatch.awayScore ?? 0}</p>
            </div>

            {/* 2. Remates Totales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remates Totales</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{matchTotals.totalShots}</span>
                <span className="text-xs font-bold text-slate-400">tiros</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{matchTotals.totalShotsOnTarget} a puerta ({matchTotals.shotAccuracy}%)</p>
            </div>

            {/* 3. Remates a Puerta */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remates a Puerta</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-600">{matchTotals.totalShotsOnTarget}</span>
                <span className="text-xs font-bold text-slate-400">a puerta</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Peligro ofensivo</p>
            </div>

            {/* 4. Tarjetas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarjetas</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600">{matchTotals.totalYellowCards}</span>
                <span className="text-xs font-bold text-slate-400">TA</span>
                {matchTotals.totalRedCards > 0 && (
                  <span className="text-sm font-bold text-rose-600">/ {matchTotals.totalRedCards} TR</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Disciplina en el encuentro</p>
            </div>
          </div>

          {/* Plantilla Desplegada Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Filter & Search Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {isEditingMatch ? 'Edición de Acta & Rendimiento' : 'Resumen de la Convocatoria & Rendimiento'}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {isEditingMatch 
                      ? `${filteredSquadList.length} jugadoras en la convocatoria activa`
                      : `${filteredSquadList.length} jugadoras registradas en el partido`}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar jugadora..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none w-44"
                  />
                </div>

                {/* Status Segmented Buttons */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Todas ({matchSquadPlayers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('titular')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                      statusFilter === 'titular' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Titulares ({matchTotals.startersCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('suplente')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                      statusFilter === 'suplente' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Suplentes ({matchTotals.subsCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('nc')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                      statusFilter === 'nc' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    NC ({matchTotals.ncCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('lesionada')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                      statusFilter === 'lesionada' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Lesionada ({matchTotals.injuredCount})
                  </button>
                </div>
              </div>
            </div>

            {!isEditingMatch ? (
              /* ========================================================================= */
              /* VISTA 1: RESUMEN DE LA CONVOCATORIA SIN EDICIÓN (LECTURA)                 */
              /* ========================================================================= */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[200px]">Jugadora</th>
                      <th className="py-3 px-3 min-w-[140px]">Titularidad</th>
                      <th className="py-3 px-3 min-w-[100px] text-center">Minutos</th>
                      <th className="py-3 px-3 min-w-[160px]">Posición</th>
                      <th className="py-3 px-3 min-w-[90px] text-center">Goles</th>
                      <th className="py-3 px-3 min-w-[100px] text-center">Asistencias</th>
                      <th className="py-3 px-3 min-w-[110px] text-center">Tarjetas</th>
                      <th className="py-3 px-3 min-w-[90px] text-center">Remates</th>
                      <th className="py-3 px-3 min-w-[110px] text-center">A Puerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSquadList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                          No se encontraron jugadoras con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredSquadList.map((player, idx) => {
                        const pId = String(player.id || `p_${idx}`);
                        const origPlayer = findPlayerInfo(pId) || player;
                        const defaultPos = getDefaultPlayerPosition(origPlayer);

                        const stat = matchPlayerStats[pId] || {
                          playerId: pId,
                          playerName: player.name || `Jugadora #${player.number}`,
                          playerNumber: player.number,
                          status: 'suplente',
                          minutes: 0,
                          position: defaultPos,
                          goals: 0,
                          yellowCards: 0,
                          redCards: 0,
                          cards: 0,
                          shots: 0,
                          shotsOnTarget: 0
                        };

                        const isStarter = stat.status === 'titular';
                        const isSub = stat.status === 'suplente';
                        const isNC = stat.status === 'nc';
                        const isInjured = stat.status === 'lesionada';

                        return (
                          <tr
                            key={pId}
                            className={`transition-colors ${
                              isStarter
                                ? 'bg-white hover:bg-slate-50/80'
                                : isSub
                                ? 'bg-slate-50/40 hover:bg-slate-100/50'
                                : 'bg-slate-50/80 opacity-70 hover:opacity-100'
                            }`}
                          >
                            {/* 1. DORSAL */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black font-mono shadow-2xs ${
                                  isStarter
                                    ? 'bg-slate-900 text-white'
                                    : isSub
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {stat.playerNumber !== undefined && stat.playerNumber !== null
                                  ? stat.playerNumber
                                  : player.number !== undefined && player.number !== null
                                  ? player.number
                                  : '-'}
                              </span>
                            </td>

                            {/* 2. JUGADORA */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                  {(origPlayer as any).image || (origPlayer as any).foto ? (
                                    <img
                                      src={(origPlayer as any).image || (origPlayer as any).foto}
                                      alt={origPlayer.name || stat.playerName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-xs">
                                      {((stat.playerName || origPlayer.name || 'J').charAt(0)).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {stat.playerName || origPlayer.name}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. TITULARIDAD */}
                            <td className="py-3.5 px-3">
                              {isStarter ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Titular
                              </span>
                            ) : isSub ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-200">
                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                Suplente
                              </span>
                            ) : isInjured ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Lesionada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                No Convocada
                              </span>
                            )}
                          </td>

                          {/* 4. MINUTOS */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`font-mono font-black text-xs ${stat.minutes > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {stat.minutes > 0 ? `${stat.minutes}'` : "0'"}
                            </span>
                          </td>

                          {/* 5. POSICIÓN */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                              {stat.position || defaultPos}
                            </span>
                          </td>

                          {/* 6. GOLES */}
                          <td className="py-3.5 px-3 text-center">
                            {stat.goals > 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                ⚽ {stat.goals}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>

                          {/* 6.5. ASISTENCIAS */}
                          <td className="py-3.5 px-3 text-center">
                            {stat.assists > 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                                🎯 {stat.assists}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>

                          {/* 7. TARJETAS */}
                          <td className="py-3.5 px-3 text-center">
                            {stat.yellowCards > 0 || stat.redCards > 0 ? (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {stat.yellowCards > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono font-black text-xs">
                                    <span className="w-2 h-3 bg-amber-400 rounded-2xs inline-block"></span>
                                    {stat.yellowCards}
                                  </span>
                                )}
                                {stat.redCards > 0 && (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-mono font-black text-xs">
                                    <span className="w-2 h-3 bg-rose-500 rounded-2xs inline-block"></span>
                                    {stat.redCards}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>

                          {/* 8. REMATES */}
                          <td className="py-3.5 px-3 text-center">
                            {stat.shots > 0 ? (
                              <span className="font-mono font-bold text-xs text-slate-800">
                                {stat.shots}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>

                          {/* 9. REMATES A PUERTA */}
                          <td className="py-3.5 px-3 text-center">
                            {stat.shotsOnTarget > 0 ? (
                              <span className="inline-flex items-center font-mono font-black text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                                {stat.shotsOnTarget}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ========================================================================= */
            /* VISTA 2: FORMULARIO DE EDICIÓN INTERACTIVA DEL ACTA                       */
            /* ========================================================================= */
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 min-w-[190px]">Jugadora</th>
                    <th className="py-3 px-3 min-w-[150px]">TITULARIDAD</th>
                    <th className="py-3 px-3 min-w-[100px] text-center">MINUTOS</th>
                    <th className="py-3 px-3 min-w-[170px]">POSICIÓN</th>
                    <th className="py-3 px-3 min-w-[100px] text-center">GOLES</th>
                    <th className="py-3 px-3 min-w-[100px] text-center bg-blue-50 text-blue-700">ASISTENCIAS</th>
                    <th className="py-3 px-3 min-w-[110px] text-center">TARJETAS</th>
                    <th className="py-3 px-3 min-w-[100px] text-center">REMATES</th>
                    <th className="py-3 px-3 min-w-[120px] text-center">REMATES A PUERTA</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSquadList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                        No se encontraron jugadoras con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredSquadList.map((player, idx) => {
                      const pId = String(player.id || `p_${idx}`);
                      const origPlayer = findPlayerInfo(pId) || player;
                      const defaultPos = getDefaultPlayerPosition(origPlayer);

                      const stat = matchPlayerStats[pId] || {
                        playerId: pId,
                        playerName: player.name || `Jugadora #${player.number}`,
                        playerNumber: player.number,
                        status: 'titular',
                        minutes: 90,
                        position: defaultPos,
                        goals: 0,
                        assists: 0,
                        yellowCards: 0,
                        redCards: 0,
                        cards: 0,
                        shots: 0,
                        shotsOnTarget: 0
                      };

                      const isStarter = stat.status === 'titular';
                      const isSub = stat.status === 'suplente';
                      const isNC = stat.status === 'nc';
                      const isInjured = stat.status === 'lesionada';
                      const isExternal = stat.isExternal || player.teamId !== selectedMatch.team;

                      return (
                        <tr 
                          key={pId} 
                          className={`transition-colors hover:bg-slate-50/70 ${
                            isStarter ? 'bg-white' : isSub ? 'bg-sky-50/20' : 'bg-slate-50/40 text-slate-400'
                          }`}
                        >
                          {/* Dorsal */}
                          <td className="py-3.5 px-4 text-center font-black">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs shadow-2xs">
                              {player.number !== undefined ? player.number : idx + 1}
                            </span>
                          </td>

                          {/* Jugadora */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                {(player as any).image || (player as any).foto ? (
                                  <img 
                                    src={(player as any).image || (player as any).foto} 
                                    alt={player.name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-xs">
                                    {(player.name || 'J').charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">
                                  {player.name || `${(player as any).nombre || ''} ${(player as any).apellidos || ''}`.trim()}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 1. TITULARIDAD (titular, suplente, NC, lesionada) */}
                          <td className="py-3.5 px-3">
                            <select
                              id={`stats-status-${pId}`}
                              value={stat.status}
                              onChange={(e) => handleUpdatePlayerField(pId, 'status', e.target.value as PlayerMatchStatus)}
                              className={`w-full text-xs font-black px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-all shadow-2xs ${
                                isStarter 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-2 focus:ring-emerald-400' 
                                  : isSub 
                                  ? 'bg-sky-50 text-sky-800 border-sky-300 focus:ring-2 focus:ring-sky-400'
                                  : isInjured 
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-2 focus:ring-rose-400'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 focus:ring-2 focus:ring-slate-400'
                              }`}
                            >
                              <option value="titular">🟢 Titular</option>
                              <option value="suplente">🔵 Suplente</option>
                              <option value="nc">⚪ NC (No Convocada)</option>
                              <option value="lesionada">🔴 Lesionada</option>
                            </select>
                          </td>

                          {/* 2. MINUTOS */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                id={`stats-min-${pId}`}
                                type="number"
                                min={0}
                                max={130}
                                disabled={isNC || isInjured}
                                value={stat.minutes}
                                onChange={(e) => handleUpdatePlayerField(pId, 'minutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-16 text-center font-mono font-bold text-xs py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                              />
                              <span className="text-[11px] font-bold text-slate-400">'</span>
                            </div>
                          </td>

                          {/* 3. POSICIÓN (desplegable con todas las posiciones, predeterminada la suya) */}
                          <td className="py-3.5 px-3">
                            <select
                              id={`stats-pos-${pId}`}
                              disabled={isNC || isInjured}
                              value={stat.position}
                              onChange={(e) => handleUpdatePlayerField(pId, 'position', e.target.value)}
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {MATCH_POSITIONS.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                              ))}
                            </select>
                          </td>

                          {/* 4. GOLES */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={stat.goals <= 0 || isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'goals', Math.max(0, stat.goals - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`w-8 text-center font-mono font-black text-sm ${stat.goals > 0 ? 'text-sky-600' : 'text-slate-700'}`}>
                                {stat.goals}
                              </span>
                              <button
                                type="button"
                                disabled={isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'goals', stat.goals + 1)}
                                className="w-6 h-6 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* 4.5. ASISTENCIAS */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={stat.assists <= 0 || isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'assists', Math.max(0, stat.assists - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`w-8 text-center font-mono font-black text-sm ${stat.assists > 0 ? 'text-indigo-600' : 'text-slate-700'}`}>
                                {stat.assists}
                              </span>
                              <button
                                type="button"
                                disabled={isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'assists', (stat.assists || 0) + 1)}
                                className="w-6 h-6 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* 5. TARJETAS */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-2">
                              {/* Tarjeta Amarilla (TA) */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isNC || isInjured}
                                  onClick={() => handleUpdatePlayerField(pId, 'yellowCards', (stat.yellowCards || 0) >= 2 ? 0 : (stat.yellowCards || 0) + 1)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-black border flex items-center gap-1 transition-all ${
                                    (stat.yellowCards || 0) > 0 
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs' 
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-amber-300'
                                  }`}
                                  title="Clic para alternar tarjetas amarillas (0, 1, 2)"
                                >
                                  <span className="w-2.5 h-3.5 bg-amber-400 rounded-2xs inline-block shadow-2xs"></span>
                                  <span>{stat.yellowCards || 0}</span>
                                </button>
                              </div>

                              {/* Tarjeta Roja (TR) */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isNC || isInjured}
                                  onClick={() => handleUpdatePlayerField(pId, 'redCards', (stat.redCards || 0) >= 1 ? 0 : 1)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-black border flex items-center gap-1 transition-all ${
                                    (stat.redCards || 0) > 0 
                                      ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs' 
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-rose-300'
                                  }`}
                                  title="Clic para alternar tarjeta roja (0, 1)"
                                >
                                  <span className="w-2.5 h-3.5 bg-rose-500 rounded-2xs inline-block shadow-2xs"></span>
                                  <span>{stat.redCards || 0}</span>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 6. REMATES */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={stat.shots <= 0 || isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'shots', Math.max(0, stat.shots - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-xs text-slate-800">
                                {stat.shots}
                              </span>
                              <button
                                type="button"
                                disabled={isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'shots', stat.shots + 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* 7. REMATES A PUERTA */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={stat.shotsOnTarget <= 0 || isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'shotsOnTarget', Math.max(0, stat.shotsOnTarget - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`w-8 text-center font-mono font-black text-xs ${stat.shotsOnTarget > 0 ? 'text-purple-600' : 'text-slate-800'}`}>
                                {stat.shotsOnTarget}
                              </span>
                              <button
                                type="button"
                                disabled={isNC || isInjured}
                                onClick={() => handleUpdatePlayerField(pId, 'shotsOnTarget', stat.shotsOnTarget + 1)}
                                className="w-6 h-6 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Remove row if external */}
                          <td className="py-3.5 px-2 text-center">
                            {stat.isExternal && (
                              <button
                                type="button"
                                title="Quitar jugadora del partido"
                                onClick={() => handleRemovePlayerFromMatch(pId)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ========================================================================= */}
            {/* DESPLEGABLE PARA AÑADIR JUGADORAS DE OTRA PLANTILLA CON BUSCADOR */}
            {/* ========================================================================= */}
            <div className="p-4 bg-slate-50/90 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  id="stats-btn-toggle-add-external"
                  type="button"
                  onClick={() => setIsAddExternalOpen(!isAddExternalOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black transition-all shadow-2xs"
                >
                  <UserPlus className="w-4 h-4 text-sky-600" />
                  <span>Añadir Jugadora de Otra Plantilla / Filial</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAddExternalOpen ? 'rotate-180' : ''}`} />
                </button>

                <span className="text-[11px] text-slate-500 font-medium">
                  {availableExternalPlayers.length} jugadoras disponibles en otros equipos/filiales
                </span>
              </div>

              {/* Collapsible Dropdown & Search Panel */}
              <AnimatePresence>
                {isAddExternalOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-slate-200/80 space-y-3 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Team Selector Dropdown */}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          id="stats-external-team-select"
                          value={externalTeamFilter}
                          onChange={(e) => setExternalTeamFilter(e.target.value)}
                          className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="all">Todas las Plantillas Filiales</option>
                          {otherTeamsList.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Search by Name */}
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="stats-external-search-input"
                          type="text"
                          placeholder="Buscar por nombre, apellidos o dorsal..."
                          value={externalSearchQuery}
                          onChange={(e) => setExternalSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Available External Players List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80">
                      {availableExternalPlayers.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-bold">
                          No se encontraron jugadoras disponibles con los filtros actuales.
                        </div>
                      ) : (
                        availableExternalPlayers.map((player) => {
                          const defaultPos = getDefaultPlayerPosition(player);

                          return (
                            <div
                              key={player.id}
                              className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-black">
                                  {player.number !== undefined && player.number !== null ? player.number : '—'}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">
                                    {player.name || `${(player as any).nombre || ''} ${(player as any).apellidos || ''}`.trim()}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    Posición predeterminada: <strong className="text-slate-600">{defaultPos}</strong>
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddExternalPlayer(player)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-black transition-all shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir a la Convocatoria</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </>
            )}

            {/* Bottom Footer Action Bar */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-500" />
                <span>
                  {!isEditingMatch
                    ? 'Estás en la vista de resumen del partido. Para modificar datos o añadir jugadoras, pulsa en "Editar Acta".'
                    : 'Los cambios se guardan de forma permanente al pulsar "Guardar Estadísticas".'}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!isEditingMatch ? (
                  <>
                    <button
                      id="stats-btn-bottom-back"
                      type="button"
                      onClick={() => setSelectedMatch(null)}
                      className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Volver a Partidos
                    </button>
                    <button
                      id="stats-btn-bottom-edit"
                      type="button"
                      onClick={() => setIsEditingMatch(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Editar Acta</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="stats-btn-bottom-cancel-edit"
                      type="button"
                      onClick={() => setIsEditingMatch(false)}
                      className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Ver Resumen
                    </button>
                    <button
                      id="stats-btn-bottom-save"
                      type="button"
                      disabled={isSavingStats}
                      onClick={handleSaveStats}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingStats ? 'Guardando...' : 'Guardar Estadísticas'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeMainTab === 'matches' ? (
        /* ========================================================================= */
        /* VISTA 2: LISTA DE PARTIDOS FINALIZADOS (Clic para abrir plantilla) */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-sky-500" /> Partidos Finalizados ({finishedMatches.length})
            </h4>
            <span className="text-[10px] text-slate-500 font-bold">
              Haz clic en cualquier partido para abrir y editar las estadísticas de la plantilla
            </span>
          </div>

          {loadingMatches ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">Cargando partidos finalizados...</p>
            </div>
          ) : finishedMatches.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Trophy className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-black text-slate-800">
                {selectedCompetition !== 'all' 
                  ? `No hay partidos finalizados en "${selectedCompetition}"`
                  : 'No hay partidos finalizados registrados'}
              </h5>
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                {selectedCompetition !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCompetition('all')}
                    className="text-sky-600 hover:text-sky-700 font-bold underline cursor-pointer"
                  >
                    Ver todas las competiciones
                  </button>
                ) : (
                  <span>
                    Los partidos deben tener el estado <strong>"Finalizado"</strong> en el Calendario para poder registrar sus estadísticas de plantilla.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finishedMatches.map(match => {
                const hasStats = match.playerStats && match.playerStats.length > 0;
                const totalGoalsLogged = match.playerStats?.reduce((acc, p) => acc + (p.goals || 0), 0) || 0;
                const totalStarters = match.playerStats?.filter(p => p.status === 'titular').length || 0;

                return (
                  <motion.div
                    key={match.id}
                    id={`stats-match-card-${match.id}`}
                    whileHover={{ y: -2 }}
                    onClick={() => handleOpenMatchSheet(match)}
                    className="bg-white hover:bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 group"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {match.type}
                        </span>
                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {match.team}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> FINALIZADO
                      </span>
                    </div>

                    {/* Match Score & Teams */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex-1 text-left">
                        <p className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                          {match.homeTeam}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Local</span>
                      </div>

                      <div className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-mono text-xl font-black text-center shadow-inner mx-3 flex items-center gap-2">
                        <span className="text-sky-400">{match.homeScore ?? 0}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-sky-400">{match.awayScore ?? 0}</span>
                      </div>

                      <div className="flex-1 text-right">
                        <p className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                          {match.awayTeam}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Visitante</span>
                      </div>
                    </div>

                    {/* Footer Info & Stats Status */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-500 font-medium text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {match.dateIso}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {match.location}
                        </span>
                      </div>

                      {hasStats ? (
                        <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-sky-600" /> {totalStarters} Titulares · {totalGoalsLogged} Goles
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
                          <Plus className="w-3 h-3" /> Clic para Rellenar
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA 3: RESUMEN GLOBAL & RANKING INDIVIDUAL */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Main Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partidos Finalizados</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{finishedMatches.length}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Registrados en calendario</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goles Totales Anotados</p>
              <p className="text-3xl font-black text-sky-600 mt-1">
                {aggregatedRankings.reduce((acc, p) => acc + (p.goals || 0), 0)}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Por las jugadoras</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencias Totales</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">
                {aggregatedRankings.reduce((acc, p) => acc + (p.assists || 0), 0)}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Pases de gol</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remates Totales</p>
              <p className="text-3xl font-black text-purple-600 mt-1">
                {aggregatedRankings.reduce((acc, p) => acc + (p.shots || 0), 0)}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">
                {aggregatedRankings.reduce((acc, p) => acc + (p.shotsOnTarget || 0), 0)} a puerta
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarjetas Acumuladas</p>
              <p className="text-3xl font-black text-amber-600 mt-1">
                {aggregatedRankings.reduce((acc, p) => acc + (p.cards || 0), 0)}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-2">
                {aggregatedRankings.reduce((acc, p) => acc + (p.yellowCards || 0), 0)} TA · {aggregatedRankings.reduce((acc, p) => acc + (p.redCards || 0), 0)} TR
              </p>
            </div>
          </div>

          {/* Detailed Individual Stats Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-500" /> Estadísticas Acumuladas Individuales ({currentTeamName}) {selectedCompetition !== 'all' && <span className="text-sky-600 font-bold normal-case text-xs">· {selectedCompetition}</span>}
              </h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {sortedRankings.length} Jugadoras con Registro
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th 
                      onClick={() => handleSortRanking('number')}
                      title="Ordenar por Dorsal"
                      className="py-3 px-3 cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>#</span>
                        {renderSortIndicator('number')}
                      </div>
                    </th>
                    <th className="py-3 px-3">Jugadora</th>
                    <th className="py-3 px-3">Posición</th>
                    <th className="py-3 px-3 text-center">Partidos (Tit/Sup)</th>
                    <th 
                      onClick={() => handleSortRanking('minutes')}
                      title="Ordenar por Minutos"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Minutos</span>
                        {renderSortIndicator('minutes')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortRanking('goals')}
                      title="Ordenar por Goles"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Goles</span>
                        {renderSortIndicator('goals')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortRanking('assists')}
                      title="Ordenar por Asistencias"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Asistencias</span>
                        {renderSortIndicator('assists')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortRanking('shots')}
                      title="Ordenar por Remates"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Remates</span>
                        {renderSortIndicator('shots')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortRanking('shotsOnTarget')}
                      title="Ordenar por Remates a Puerta"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Remates a Puerta</span>
                        {renderSortIndicator('shotsOnTarget')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortRanking('cards')}
                      title="Ordenar por Tarjetas"
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Tarjetas (TA/TR)</span>
                        {renderSortIndicator('cards')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRankings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                        Aún no se han guardado actas de partidos. Haz clic en la pestaña "Partidos Finalizados" y rellena la plantilla de un partido.
                      </td>
                    </tr>
                  ) : (
                    sortedRankings.map((player, idx) => (
                      <tr key={`${player.id}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-500">{player.number !== undefined && player.number !== null ? player.number : idx + 1}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-900">{player.name}</td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium">{player.position}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                          {player.matchesPlayed} <span className="text-[10px] text-slate-400">({player.starts}T / {player.subEntries}S)</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">{player.minutes}'</td>
                        <td className="py-3.5 px-3 text-center font-black text-sky-600 text-sm">{player.goals}</td>
                        <td className="py-3.5 px-3 text-center font-black text-indigo-600 text-sm">{player.assists}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">{player.shots}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-purple-600">{player.shotsOnTarget}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                          {player.yellowCards} TA {player.redCards > 0 && `/ ${player.redCards} TR`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
