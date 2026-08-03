export interface Team {
  id: string;
  name: string;
  category: string;
  description?: string;
  image?: string;
  playerCount?: number;
  coach?: string;
  technicalStaff?: string;
  staff?: TeamStaff;
}

export interface StaffMember {
  name: string;
  image?: string;
}

export interface TeamStaff {
  headCoach?: StaffMember;
  secondCoach?: StaffMember;
  physicalTrainer?: StaffMember;
  goalkeeperCoach?: StaffMember;
  analyst?: StaffMember;
  delegate?: StaffMember;
  physio?: StaffMember;
}

export interface Player {
  id: string;
  name: string;
  number?: number;
  position: string;
  secondPosition?: string;
  height?: string; // e.g. "1.72 m" or "172 cm"
  teamId: string;
  stats: PlayerStats;
  image?: string;
  // Nuevos campos solicitados
  nombre?: string;
  apellidos?: string;
  dorsal?: number;
  fecha_nacimiento?: string;
  demarcacion?: string;
  lateralidad?: string;
  observaciones?: string;
  created_at?: string;
  posicion_especifica?: string;
}

export interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  teamId: string;
  scoreHome: number;
  scoreAway: number;
  status: 'scheduled' | 'finished' | 'live';
}

export type UserRole = 'admin' | 'coach' | 'player';

export interface ExerciseTask {
  id: string;
  title: string;
  phase: 'Calentamiento' | 'Parte Principal' | 'Tarea Analítica' | 'Juego de Posición' | 'Partido / Global' | 'Vuelta a la Calma';
  durationMin: number;
  seriesReps?: string;
  spaceSize?: string;
  description: string;
  coachingPoints?: string;
  materials?: string;
  coach?: string; // e.g. MIKY, JUANMI, NICA, IAGO
  codeName?: string; // e.g. SRJ EG 3x3+2, SMJ JUEGO PROGRESION 5X5+6, SGJ EM ATAQUE-DEFENSA
  focoMSB?: string;
  comoParaQue?: string;
  diagramPreset?: 'rondo' | 'posicion' | 'partido' | 'ataque_defensa';
}

export interface StaffAproximacion {
  coachName: string; // MIKY, JUANMI, IAGO, NICA, PABLO, MARTA
  taskTitle: string; // CALENTAMIENTO, 5x5+6, PARTIDO, TAREA 2...
  consigna: string; // Observación / Foco MSB
  comoParaQue: string; // ¿CÓMO? ¿POR / PARA QUÉ?
}

export interface TrainingSession {
  id: string;
  teamId: string;
  season: string;
  title: string;
  sessionNumber?: number;
  date: string;
  time?: string; // e.g. "19:30"
  durationTotalMin: number;
  microcycle?: string;
  dayType?: string; // MD+1, MD+2, MD-4, MD-3, MD-2, MD-1
  intensity: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
  rpe?: number; // 1-10
  numPlayers?: string; // e.g. "14+2"
  availablePlayerNames?: string[];
  wildcardPlayerNames?: string[];
  unavailablePlayerNames?: string[];
  playerStatuses?: Record<string, 'disponible' | 'comodin' | 'no_disponible'>;
  objectivesTactical?: string;
  objectivesPhysical?: string;
  objectivesTechnical?: string;
  materials?: string[];
  tasks: ExerciseTask[];
  staffAproximaciones?: StaffAproximacion[];
  phaseLineups?: {
    phase1Group?: string; // Gabi, López...
    phase2Group?: string; // Blanca, Crespo, Orfila...
    phase3Group?: string; // Cora, Fati, Ada, Vélez, Neus...
    pitchPositions?: Array<{ name: string; x: number; y: number }>;
  };
  notes?: string;
  created_at: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  teamId?: string;
}
