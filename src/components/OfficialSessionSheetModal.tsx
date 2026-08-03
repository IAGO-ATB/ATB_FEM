import React from 'react';
import { X, Printer, Download, Shield, Clock, Calendar, AlertCircle } from 'lucide-react';
import { TrainingSession, Team } from '../types';

interface OfficialSessionSheetModalProps {
  session: TrainingSession;
  team: Team | null;
  season: string;
  onClose: () => void;
}

const DEFAULT_PLAYERS_LIST = [
  'SANDRA', 'ANDRE', 'FATI', 'JOANA', 'HELENA', 'MARTA', 'ANTONELLA', 'GABI', 'NEUS', 
  'IXI', 'NADIA', 'CHLOE', 'MARINA', 'CORA', 'BLANCA', 'VÉLEZ', 'ADA', 'ROXANNE', 
  'ORFILA', 'JULIETA', 'ABI', 'LÓPEZ', 'CARMEN', 'PAULA'
];

const DEFAULT_MATERIALS = [
  'BALONES', 'PETOS', 'CHINOS', 'MINIPORTERIAS', 'PORTERÍA GRANDE', 
  'PICAS', 'AROS', 'VALLAS', 'CONOS ALTOS', 'ELÁSTICO'
];

export default function OfficialSessionSheetModal({ session, team, season, onClose }: OfficialSessionSheetModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const unavailable = session.unavailablePlayerNames || [];
  const wildcards = session.wildcardPlayerNames || [];
  const playerStatuses = session.playerStatuses || {};

  // Construct top player matrix list
  let allPlayers: string[] = [];
  if (playerStatuses && Object.keys(playerStatuses).length > 0) {
    allPlayers = Object.keys(playerStatuses);
  } else {
    const combined = Array.from(new Set([...(session.availablePlayerNames || []), ...wildcards, ...unavailable]));
    allPlayers = combined.length > 0 ? combined : DEFAULT_PLAYERS_LIST;
  }

  const materialsList = session.materials && session.materials.length > 0 
    ? session.materials.map(m => m.toUpperCase()) 
    : DEFAULT_MATERIALS;

  const aproximaciones = session.staffAproximaciones || [
    {
      coachName: 'MIKY',
      taskTitle: 'CALENTAMIENTO (3x3+2)',
      consigna: 'Reforzar la idea de 3-BASE-3 con gol a minis. FOCO EN MSB EN RESTO DE TAREAS. REUNIÓN INDIVIDUAL CT PAULA.',
      comoParaQue: 'Que haya jugadoras en la BASE'
    },
    {
      coachName: 'JUANMI',
      taskTitle: '5x5+6',
      consigna: 'Normas de la tarea (pasar por comodines, robo en campo contrario, press alto...) + FOCO MSB en todas las tareas',
      comoParaQue: 'Con alejadas'
    },
    {
      coachName: 'IAGO',
      taskTitle: 'PARTIDO (8x8)',
      consigna: 'IMPORTANTE: Foco en MSB en todas las tareas. Transición ofensiva rápida.',
      comoParaQue: ''
    },
    {
      coachName: 'NICA',
      taskTitle: 'TAREA 2 (Ataque-Defensa)',
      consigna: 'Comportamientos micro: reducir, parar, tocar, no ser superada, recuperar. IMPORTANTE: Foco en MSB.',
      comoParaQue: 'Con cercanas'
    },
    {
      coachName: 'PABLO',
      taskTitle: 'PREPARACIÓN FÍSICA',
      consigna: 'Aceleraciones y desaceleraciones en espacio reducido.',
      comoParaQue: 'Control de carga RPE'
    },
    {
      coachName: 'MARTA',
      taskTitle: 'ANÁLISIS VÍDEO',
      consigna: 'Revisión de líneas de pase e interceptación.',
      comoParaQue: 'Alineación estructural'
    }
  ];

  const tasks = session.tasks && session.tasks.length > 0 ? session.tasks : [
    {
      id: '1',
      title: 'SRJ EG 3x3+2',
      phase: 'Calentamiento' as const,
      durationMin: 12,
      seriesReps: '3 x 4\'',
      coach: 'MIKY',
      description: '3x3+2 comodines exteriores en laterales para trabajar 3-BASE-3 antes de progresar en el juego. Espacio dividido en 2 alturas con miniporterías. FOCO TAREA MCB',
      focoMSB: 'Salto al control + defensa en bloque'
    },
    {
      id: '2',
      title: 'SMJ JUEGO PROGRESIÓN 5X5+6',
      phase: 'Juego de Posición' as const,
      durationMin: 15,
      seriesReps: '3 x 5\'',
      coach: 'JUANMI',
      description: '5x5+6 comodines. Espacio dividido por la mitad. Para meter gol hay que pasar por un comodín de cada lado. Robo en campo contrario + gol vale doble. FOCO MSB: Press alto, continuar presión, tocar, interrumpir.',
      focoMSB: 'Press alto + reestructuración'
    },
    {
      id: '3',
      title: 'SGJ EM ATAQUE-DEFENSA',
      phase: 'Parte Principal' as const,
      durationMin: 20,
      seriesReps: '2 x 10\'',
      coach: 'NICA',
      description: '7X7+2 ATAQUE DEFENSA, acción balón en diagonal y profundidad máxima, se permite este ataque y la transición del equipo rival que defiende. La transición ofensiva 10 segundos para poder marcar... FOCO MSB: Salto al control + defensa en bloque',
      focoMSB: 'Transición ofensiva 10s'
    },
    {
      id: '4',
      title: 'SGJ EM PARTIDO 8x8',
      phase: 'Partido / Global' as const,
      durationMin: 20,
      seriesReps: 'Partido 8x8',
      coach: 'IAGO',
      description: 'Partido 8x8 libre. Comportamientos de la semana con y sin balón.',
      focoMSB: 'Comportamientos semanales'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md overflow-y-auto flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white print:overflow-visible">
      {/* Container */}
      <div className="bg-white w-full max-w-[1400px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Top Control Header Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center border border-sky-400/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider text-white">
                Ficha Técnica de Sesión - Estilo Oficial ATB Femenino
              </h2>
              <p className="text-[11px] text-slate-400">
                {team?.name || 'CD Atlético Baleares Femenino'} | {session.title} ({session.date})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Descargar PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL SHEET CANVAS */}
        <div id="print-session-sheet" className="p-3 sm:p-5 bg-white text-slate-900 font-sans border-2 border-black selection:bg-sky-200">
          
          {/* TOP PLAYER MATRIX HEADER */}
          <div className="mb-2 border-2 border-black bg-white grid grid-cols-12 text-[10px] font-black text-center divide-x-2 divide-black">
            {allPlayers.slice(0, 24).map((pName, idx) => {
              const status = playerStatuses?.[pName] || (
                unavailable.some(u => u.toUpperCase() === pName.toUpperCase() || u.toUpperCase().includes(pName.toUpperCase())) ? 'no_disponible' :
                wildcards.some(w => w.toUpperCase() === pName.toUpperCase() || w.toUpperCase().includes(pName.toUpperCase())) ? 'comodin' : 'disponible'
              );

              let cellStyle = 'bg-white text-black font-bold';
              if (status === 'no_disponible') {
                cellStyle = 'bg-red-600 text-white font-black';
              } else if (status === 'comodin') {
                cellStyle = 'bg-amber-400 text-amber-950 font-black';
              }

              return (
                <div 
                  key={`${pName}_${idx}`}
                  className={`p-1 border-b border-black text-[9px] truncate text-center uppercase ${cellStyle}`}
                  title={`${pName} (${status})`}
                >
                  {pName}
                </div>
              );
            })}
          </div>

          {/* MAIN GRID CONTAINER */}
          <div className="grid grid-cols-12 gap-1 border-2 border-black bg-black">
            
            {/* LEFT COLUMN: META DATA & MATERIALS (Cols 1-2) */}
            <div className="col-span-12 lg:col-span-2 bg-white flex flex-col justify-between border-r-2 border-black divide-y-2 divide-black">
              {/* Club Crest & Title Header */}
              <div className="p-2 text-center bg-slate-900 text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 mb-1 bg-white p-1 rounded-full border-2 border-sky-400 flex items-center justify-center shadow-md">
                  <Shield className="w-8 h-8 text-sky-900" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest leading-none">CD ATLETICO BALEARES</div>
                <div className="text-[8px] font-bold text-sky-300 mt-0.5 uppercase">FEMENINO</div>
              </div>

              {/* General Session Info Table */}
              <div className="text-[9px] divide-y divide-black font-bold">
                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider">FECHA</div>
                <div className="text-center py-1 font-black bg-white">{session.date}</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider">HORA</div>
                <div className="text-center py-1 font-black bg-white">{session.time || '19:30'}</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider">SESIÓN</div>
                <div className="text-center py-1 font-black bg-white">{session.sessionNumber || '3'}</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider">MICROCICLO</div>
                <div className="text-center py-1 font-black bg-white">{session.microcycle || '1'} ({session.dayType || 'MD-3'})</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider">Nº JUGADORAS</div>
                <div className="text-center py-1 font-black bg-white">{session.numPlayers || '14+2'}</div>
              </div>

              {/* NO DISPONIBLES RED SECTION */}
              <div>
                <div className="bg-blue-950 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider border-b border-black">
                  NO DISPONIBLES
                </div>
                <div className="bg-red-600 text-white text-[9px] font-black divide-y divide-red-700 text-center">
                  {unavailable.map((un, i) => (
                    <div key={i} className="py-0.5 uppercase tracking-wide">
                      {un}
                    </div>
                  ))}
                </div>
              </div>

              {/* MATERIAL CHECKLIST TABLE */}
              <div>
                <div className="bg-blue-950 text-white font-black text-center py-0.5 text-[8px] uppercase tracking-wider border-b border-black">
                  MATERIAL
                </div>
                <div className="text-[8px] font-bold divide-y divide-slate-200 bg-white">
                  {materialsList.map((mat, i) => (
                    <div key={i} className="px-1.5 py-0.5 flex items-center justify-between uppercase">
                      <span>{mat}</span>
                      <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER MAIN COLUMN: TACTICAL TASKS WITH PITCH DIAGRAMS (Cols 3-9) */}
            <div className="col-span-12 lg:col-span-7 bg-white flex flex-col justify-between border-r-2 border-black divide-y-2 divide-black">
              
              {/* TASKS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x-2 divide-black text-[9px]">
                {tasks.map((task, idx) => (
                  <div key={task.id || idx} className="flex flex-col justify-between border-b-2 border-black lg:border-b-0 bg-white">
                    {/* Header: Phase & Title */}
                    <div className="bg-slate-100 p-1 border-b-2 border-black text-center">
                      <div className="font-black text-[9px] uppercase tracking-wider text-slate-800">
                        {task.phase || `TAREA ${idx + 1}`}
                      </div>
                      <div className="font-extrabold text-[8px] text-sky-800 truncate">
                        {task.codeName || task.title}
                      </div>
                    </div>

                    {/* Coach & Series/Reps Subheader */}
                    <div className="flex items-center justify-between bg-white px-1.5 py-0.5 border-b border-black font-black text-[8px]">
                      <span className="text-red-700 uppercase font-black">{task.coach || 'CUERPO TÉCNICO'}</span>
                      <span className="text-slate-700 bg-slate-200 px-1 rounded">{task.seriesReps || `${task.durationMin || 15}'`}</span>
                    </div>

                    {/* SOCCER PITCH DIAGRAM GRAPHIC */}
                    <div className="p-1.5 bg-emerald-800 flex items-center justify-center relative min-h-[140px] border-b border-black overflow-hidden shadow-inner">
                      {/* Tactical Pitch Lines (SVG Render) */}
                      <svg className="w-full h-32 border border-white/60 bg-emerald-700 rounded-sm" viewBox="0 0 200 130">
                        {/* Grass pattern lines */}
                        <line x1="0" y1="65" x2="200" y2="65" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" />
                        <circle cx="100" cy="65" r="22" stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="100" cy="65" r="2" fill="white" />
                        
                        {/* Goal boxes */}
                        <rect x="0" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                        <rect x="175" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />

                        {/* Mini goals */}
                        <rect x="0" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                        <rect x="196" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />

                        {/* Players (Yellow, Blue, Red dots) */}
                        {idx === 0 && (
                          <>
                            <circle cx="50" cy="40" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="50" cy="90" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="80" cy="65" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="140" cy="40" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                            <circle cx="140" cy="90" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                            <circle cx="110" cy="65" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                          </>
                        )}
                        {idx === 1 && (
                          <>
                            <circle cx="40" cy="30" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                            <circle cx="60" cy="70" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                            <circle cx="80" cy="100" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                            <circle cx="130" cy="30" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="150" cy="70" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="100" cy="20" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                            <circle cx="100" cy="110" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                          </>
                        )}
                        {idx >= 2 && (
                          <>
                            <circle cx="40" cy="45" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="70" cy="85" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                            <circle cx="120" cy="45" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                            <circle cx="150" cy="85" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                            <circle cx="100" cy="65" r="4" fill="#ffffff" stroke="black" strokeWidth="1" />
                          </>
                        )}
                      </svg>
                      
                      {/* Diagram badge overlay */}
                      <span className="absolute top-2 left-2 bg-black/80 text-white text-[7px] font-black px-1 rounded uppercase">
                        {task.spaceSize || 'Espacio Medido'}
                      </span>
                    </div>

                    {/* Description Text & Coaching Points */}
                    <div className="p-1.5 text-[8.5px] leading-tight space-y-1 bg-white text-slate-800 flex-1 flex flex-col justify-between">
                      <p className="font-medium">{task.description}</p>
                      {task.focoMSB && (
                        <div className="bg-amber-50 border border-amber-200 p-1 rounded text-[8px] font-black text-amber-900">
                          FOCO MSB: {task.focoMSB}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* FASES (M-F-O-L) PLAYER LINEUP BAR */}
              <div className="p-1.5 bg-slate-100 text-[8.5px] font-bold grid grid-cols-12 divide-x divide-black">
                <div className="col-span-3 font-black text-black uppercase">
                  FASES (M-F-O-L):
                </div>
                <div className="col-span-3 px-1 text-slate-800">
                  Gabi, López,
                </div>
                <div className="col-span-3 px-1 text-slate-800">
                  Blanca, Crespo, Orfila,
                </div>
                <div className="col-span-3 px-1 text-slate-800">
                  Cora, Fati, Ada, Vélez, Neus,
                </div>
              </div>

              {/* BOTTOM DUAL PITCH TACTICAL LINEUP DISPLAY */}
              <div className="p-2 bg-white grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Field Pitch 1 */}
                <div className="border border-black rounded bg-emerald-700/10 p-2 relative h-36 flex flex-col justify-between text-[8px] font-black text-black">
                  <div className="absolute inset-0 border border-slate-300 rounded m-1 pointer-events-none" />
                  <div className="flex justify-between items-center z-10">
                    <span className="bg-white px-1 border border-black rounded">ADA / FATI</span>
                    <span className="bg-white px-1 border border-black rounded">POMER</span>
                  </div>
                  <div className="flex justify-around items-center z-10">
                    <div className="bg-white px-1 border border-black rounded text-center">
                      NEREA<br/>HELENA
                    </div>
                    <div className="bg-white px-1 border border-black rounded text-center">
                      MARTA<br/>ANTONELLA
                    </div>
                  </div>
                  <div className="flex justify-between items-center z-10">
                    <div className="bg-white px-1 border border-black rounded text-center">
                      SANDRA<br/>BLANCA
                    </div>
                    <div className="bg-white px-1 border border-black rounded">JULIETA</div>
                    <div className="bg-white px-1 border border-black rounded">ABI</div>
                    <div className="bg-white px-1 border border-black rounded text-center">
                      LÓPEZ<br/>IXIAR
                    </div>
                  </div>
                  <div className="flex justify-between items-center z-10">
                    <div className="bg-white px-1 border border-black rounded text-center">
                      ROXANNE<br/>JOANA
                    </div>
                    <div className="bg-white px-1 border border-black rounded text-center">
                      VÉLEZ<br/>ANDREA
                    </div>
                    <div className="bg-white px-1 border border-black rounded text-center">
                      GABI<br/>NEUS
                    </div>
                  </div>
                </div>

                {/* Field Pitch 2 */}
                <div className="border border-black rounded bg-emerald-700/10 p-2 relative h-36 flex items-center justify-center text-[8px] font-black text-slate-400">
                  <div className="absolute inset-0 border border-slate-300 rounded m-1 pointer-events-none" />
                  <div className="w-16 h-16 rounded-full border border-slate-300 flex items-center justify-center">
                    ESQUEMA TÁCTICO SEGUNDO TIEMPO
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: APROXIMACIONES & STAFF OBJECTIVES (Cols 10-12) */}
            <div className="col-span-12 lg:col-span-3 bg-white flex flex-col justify-between divide-y-2 divide-black">
              {/* Header Title */}
              <div className="bg-slate-900 text-white font-black text-center py-2 text-[12px] uppercase tracking-widest border-b-2 border-black">
                APROXIMACIONES
              </div>

              {/* Sub-Header Column Labels */}
              <div className="grid grid-cols-12 bg-slate-100 font-black text-[8px] text-center border-b-2 border-black divide-x divide-black py-1">
                <div className="col-span-3 uppercase">TÉCNICO</div>
                <div className="col-span-5 uppercase">CONSIGNA / TAREA</div>
                <div className="col-span-4 uppercase">¿CÓMO? ¿POR/PARA QUÉ?</div>
              </div>

              {/* Staff Rows List */}
              <div className="divide-y-2 divide-black text-[8.5px] font-bold flex-1 bg-white">
                {aproximaciones.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 divide-x divide-black min-h-[60px]">
                    {/* Staff Coach Name */}
                    <div className="col-span-3 p-1 font-black text-center text-red-700 bg-slate-50 flex items-center justify-center uppercase border-r border-black">
                      {item.coachName}
                    </div>

                    {/* Consigna / Objective Details */}
                    <div className="col-span-5 p-1.5 leading-tight flex flex-col justify-center text-slate-800">
                      <div className="font-black text-black uppercase mb-0.5 text-[8px]">
                        {item.taskTitle}
                      </div>
                      <p className="font-semibold text-slate-700 leading-tight">
                        {item.consigna}
                      </p>
                    </div>

                    {/* ¿Cómo? ¿Por/Para Qué? */}
                    <div className="col-span-4 p-1.5 leading-tight flex items-center justify-center text-slate-900 bg-slate-50 font-bold text-center">
                      {item.comoParaQue || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* PRINT MEDIA STYLING SPECIFIC FOR HIGH-RES SINGLE PAGE LANDSCAPE FIT */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-session-sheet, #print-session-sheet * {
                visibility: visible;
              }
              #print-session-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 10px;
                border: 2px solid black;
              }
              @page {
                size: A4 landscape;
                margin: 5mm;
              }
            }
          `}</style>

        </div>
      </div>
    </div>
  );
}
