import React, { useState, useMemo } from 'react';
import { X, BarChart3, Filter, Clock, Target, Layers, TrendingUp, PieChart, Info, CheckCircle } from 'lucide-react';
import { TrainingSession, ExerciseTask } from '../types';

interface TipologiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TrainingSession[];
  teamName: string;
}

const ALL_FOCOS = ['MCB', 'MSB', 'MIXTO', 'SIN FOCO'] as const;

const STANDARD_TIPOLOGIAS = [
  'MANTENIMIENTO',
  'LÚDICO',
  'CONDICIONAL',
  'RONDOS',
  'EVOLUCIONES',
  'RUEDAS DE PASE',
  'JUEGO DE POSICIÓN',
  'JUEGO DE PROGRESIÓN',
  'PARTIDO CONDICIONADO',
  'REDUCIDOS',
  'DIRIGIDO',
  'TRANSICIONES',
];

const FOCO_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  MCB: { bg: 'bg-sky-500', border: 'border-sky-600', text: 'text-sky-600', fill: '#0284c7' },
  MSB: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-600', fill: '#d97706' },
  MIXTO: { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-600', fill: '#9333ea' },
  'SIN FOCO': { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-slate-500', fill: '#64748b' },
};

const TIPOLOGIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MANTENIMIENTO: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300' },
  LÚDICO: { bg: 'bg-amber-400', text: 'text-amber-700', border: 'border-amber-300' },
  CONDICIONAL: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300' },
  RONDOS: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-300' },
  EVOLUCIONES: { bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-300' },
  'RUEDAS DE PASE': { bg: 'bg-lime-500', text: 'text-lime-700', border: 'border-lime-300' },
  'JUEGO DE POSICIÓN': { bg: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-300' },
  'JUEGO DE PROGRESIÓN': { bg: 'bg-fuchsia-500', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
  'PARTIDO CONDICIONADO': { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300' },
  REDUCIDOS: { bg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-300' },
  DIRIGIDO: { bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-300' },
  TRANSICIONES: { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-300' },
};

export default function TipologiaModal({ isOpen, onClose, sessions, teamName }: TipologiaModalProps) {
  const [selectedMicrocycle, setSelectedMicrocycle] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'count' | 'duration'>('count');

  // Extract unique microcycles available in sessions
  const availableMicrocycles = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.microcycle) set.add(s.microcycle);
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [sessions]);

  // Filter sessions by selected microcycle
  const filteredSessions = useMemo(() => {
    if (selectedMicrocycle === 'ALL') return sessions;
    return sessions.filter(s => s.microcycle === selectedMicrocycle);
  }, [sessions, selectedMicrocycle]);

  // Flatten all tasks from filtered sessions
  const allTasks = useMemo(() => {
    const tasks: (ExerciseTask & { sessionDate?: string; microcycle?: string })[] = [];
    filteredSessions.forEach(s => {
      if (Array.isArray(s.tasks)) {
        s.tasks.forEach(t => {
          // Include tasks that have a title, phase, or duration
          if (t && (t.title || t.description || t.durationMin > 0)) {
            tasks.push({
              ...t,
              sessionDate: s.date,
              microcycle: s.microcycle,
            });
          }
        });
      }
    });
    return tasks;
  }, [filteredSessions]);

  // Calculate FOCO breakdown
  const focoStats = useMemo(() => {
    const counts: Record<string, { count: number; durationMin: number }> = {
      MCB: { count: 0, durationMin: 0 },
      MSB: { count: 0, durationMin: 0 },
      MIXTO: { count: 0, durationMin: 0 },
      'SIN FOCO': { count: 0, durationMin: 0 },
    };

    allTasks.forEach(task => {
      let rawFoco = (task.foco || '').trim().toUpperCase();
      if (!rawFoco || rawFoco === '-') rawFoco = 'SIN FOCO';
      if (!counts[rawFoco]) {
        counts[rawFoco] = { count: 0, durationMin: 0 };
      }
      counts[rawFoco].count += 1;
      counts[rawFoco].durationMin += Number(task.durationMin || 0);
    });

    const totalTasks = allTasks.length;
    const totalDuration = allTasks.reduce((acc, t) => acc + Number(t.durationMin || 0), 0);

    return ALL_FOCOS.map(key => {
      const c = counts[key] || { count: 0, durationMin: 0 };
      const pctCount = totalTasks > 0 ? Math.round((c.count / totalTasks) * 100) : 0;
      const pctDuration = totalDuration > 0 ? Math.round((c.durationMin / totalDuration) * 100) : 0;

      return {
        key,
        count: c.count,
        durationMin: c.durationMin,
        pctCount,
        pctDuration,
      };
    });
  }, [allTasks]);

  // Calculate TIPOLOGÍA breakdown
  const tipologiaStats = useMemo(() => {
    const counts: Record<string, { count: number; durationMin: number; mcb: number; msb: number; mixto: number }> = {};

    // Initialize all standard tipologías
    STANDARD_TIPOLOGIAS.forEach(t => {
      counts[t] = { count: 0, durationMin: 0, mcb: 0, msb: 0, mixto: 0 };
    });

    allTasks.forEach(task => {
      let rawTipologia = (task.tipologia || '').trim().toUpperCase();
      if (!rawTipologia) rawTipologia = 'OTRAS';
      if (!counts[rawTipologia]) {
        counts[rawTipologia] = { count: 0, durationMin: 0, mcb: 0, msb: 0, mixto: 0 };
      }
      counts[rawTipologia].count += 1;
      counts[rawTipologia].durationMin += Number(task.durationMin || 0);

      const f = (task.foco || '').toUpperCase();
      if (f === 'MCB') counts[rawTipologia].mcb += 1;
      else if (f === 'MSB') counts[rawTipologia].msb += 1;
      else if (f === 'MIXTO') counts[rawTipologia].mixto += 1;
    });

    const totalTasks = allTasks.length;
    const totalDuration = allTasks.reduce((acc, t) => acc + Number(t.durationMin || 0), 0);

    return Object.keys(counts)
      .map(key => {
        const c = counts[key];
        const pctCount = totalTasks > 0 ? Math.round((c.count / totalTasks) * 100) : 0;
        const pctDuration = totalDuration > 0 ? Math.round((c.durationMin / totalDuration) * 100) : 0;

        return {
          key,
          count: c.count,
          durationMin: c.durationMin,
          pctCount,
          pctDuration,
          mcb: c.mcb,
          msb: c.msb,
          mixto: c.mixto,
          isMantenimiento: key === 'MANTENIMIENTO',
        };
      })
      // Sort: MANTENIMIENTO first or sorted by count descending, keeping non-zero
      .sort((a, b) => {
        if (a.isMantenimiento) return -1;
        if (b.isMantenimiento) return 1;
        return b.count - a.count;
      });
  }, [allTasks]);

  // Overall statistics
  const totalTasksCount = allTasks.length;
  const totalMinutes = allTasks.reduce((acc, t) => acc + Number(t.durationMin || 0), 0);

  const topFoco = useMemo(() => {
    let top = focoStats[0];
    focoStats.forEach(f => {
      if (f.count > (top?.count || 0)) top = f;
    });
    return top;
  }, [focoStats]);

  const topTipologia = useMemo(() => {
    let top = tipologiaStats[0];
    tipologiaStats.forEach(t => {
      if (t.count > (top?.count || 0)) top = t;
    });
    return top;
  }, [tipologiaStats]);

  // Maximum value for column chart height scaling
  const maxFocoVal = Math.max(...focoStats.map(f => (viewMode === 'count' ? f.count : f.durationMin)), 1);
  const maxTipologiaVal = Math.max(...tipologiaStats.map(t => (viewMode === 'count' ? t.count : t.durationMin)), 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 text-white border border-slate-700/80 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 md:p-6 bg-slate-800/90 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  {teamName}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  • {filteredSessions.length} {filteredSessions.length === 1 ? 'Sesión' : 'Sesiones'} analizadas
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                TIPOLOGÍA Y FOCO DE TAREAS
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL CONTROLS / FILTER BAR */}
        <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Microcycle Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-bold text-slate-300 uppercase tracking-tight">Microciclo:</span>
            <select
              value={selectedMicrocycle}
              onChange={e => setSelectedMicrocycle(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">Todos los Microciclos ({sessions.length} sesiones)</option>
              {availableMicrocycles.map(mc => (
                <option key={mc} value={mc}>
                  {mc}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle (Nº Tareas vs Minutos Totales) */}
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Métrica:</span>
            <button
              onClick={() => setViewMode('count')}
              className={`px-3 py-1 rounded-lg font-black text-[11px] uppercase transition-all cursor-pointer ${
                viewMode === 'count' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nº de Tareas
            </button>
            <button
              onClick={() => setViewMode('duration')}
              className={`px-3 py-1 rounded-lg font-black text-[11px] uppercase transition-all cursor-pointer ${
                viewMode === 'duration' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minutos Totales
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* SUMMARY STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Tareas</span>
                <Layers className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{totalTasksCount}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{totalMinutes} minutos acumulados</p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Foco Predominante</span>
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-400">{topFoco?.key || '-'}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {topFoco?.count || 0} tareas ({topFoco?.pctCount || 0}%)
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Tipología Top</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-black text-emerald-400 truncate">{topTipologia?.key || '-'}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {topTipologia?.count || 0} tareas ({topTipologia?.pctCount || 0}%)
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Promedio / Tarea</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {totalTasksCount > 0 ? (totalMinutes / totalTasksCount).toFixed(1) : 0} <span className="text-xs font-normal">min</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Duración media por ejercicio</p>
              </div>
            </div>
          </div>

          {/* SECTION 1: COLUMN CHART BY FOCO DE LA TAREA */}
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
              <div>
                <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-400" />
                  Gráfico de Columnas: Recuento por FOCO de la Tarea
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Análisis comparativo de los momentos tácticos (MCB - Momento Con Balón, MSB - Momento Sin Balón, MIXTO)
                </p>
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-300 bg-sky-500/20 px-3 py-1 rounded-xl self-start sm:self-auto border border-sky-400/30">
                {viewMode === 'count' ? 'Mostrando Nº de Tareas' : 'Mostrando Minutos Totales'}
              </span>
            </div>

            {totalTasksCount === 0 ? (
              <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs">
                No hay tareas registradas en el periodo seleccionado para generar el gráfico por Foco.
              </div>
            ) : (
              <div className="space-y-4">
                {/* COLUMN CHART CONTAINER */}
                <div className="h-64 pt-6 pb-2 px-4 bg-slate-900/80 rounded-2xl border border-slate-700/80 flex items-end justify-around gap-4 md:gap-8 relative overflow-hidden">
                  
                  {/* Y-AXIS BACKGROUND GRID LINES */}
                  <div className="absolute inset-x-0 top-6 bottom-12 flex flex-col justify-between pointer-events-none px-2 opacity-20">
                    <div className="w-full border-b border-dashed border-slate-400" />
                    <div className="w-full border-b border-dashed border-slate-400" />
                    <div className="w-full border-b border-dashed border-slate-400" />
                    <div className="w-full border-b border-dashed border-slate-400" />
                  </div>

                  {focoStats.map(f => {
                    const val = viewMode === 'count' ? f.count : f.durationMin;
                    const heightPct = maxFocoVal > 0 ? Math.max((val / maxFocoVal) * 100, 6) : 6;
                    const styleConfig = FOCO_COLORS[f.key] || FOCO_COLORS['SIN FOCO'];
                    const displayPct = viewMode === 'count' ? f.pctCount : f.pctDuration;

                    return (
                      <div key={f.key} className="flex-1 flex flex-col items-center h-full justify-end z-10 max-w-[120px] group">
                        {/* VALUE TOOLTIP BADGE ABOVE COLUMN */}
                        <div className="mb-2 text-center transition-transform group-hover:-translate-y-1">
                          <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-600 shadow-md inline-block">
                            {viewMode === 'count' ? `${f.count} tareas` : `${f.durationMin} min`}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                            {displayPct}%
                          </span>
                        </div>

                        {/* COLUMN BAR */}
                        <div className="w-full bg-slate-800/80 rounded-t-xl p-1 flex items-end justify-center h-full max-h-[170px]">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full ${styleConfig.bg} rounded-t-lg transition-all duration-500 shadow-lg group-hover:brightness-110 flex items-center justify-center`}
                          >
                            {/* Value label inside bar if tall enough */}
                            {heightPct > 25 && (
                              <span className="text-[11px] font-black text-white drop-shadow-md tracking-wider">
                                {val}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* COLUMN FOOTER / X-AXIS LABEL */}
                        <div className="mt-3 text-center">
                          <span className={`text-xs font-black uppercase tracking-wider ${styleConfig.text}`}>
                            {f.key}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FOCO LEGEND / EXPLANATION */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-sky-950/40 border border-sky-800/50 rounded-xl flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                    <div>
                      <span className="font-bold text-sky-300">MCB (Momento Con Balón)</span>
                      <p className="text-[10px] text-slate-400">Ataque organizado, transiciones ofensivas.</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300">MSB (Momento Sin Balón)</span>
                      <p className="text-[10px] text-slate-400">Defensa organizada, presión y repliegue.</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-purple-950/40 border border-purple-800/50 rounded-xl flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                    <div>
                      <span className="font-bold text-purple-300">MIXTO</span>
                      <p className="text-[10px] text-slate-400">Fases globales, partidos condicionados, ida/vuelta.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: COLUMN CHART BY TIPO DE TAREA (TIPOLOGÍA) */}
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
              <div>
                <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Gráfico de Columnas: Recuento por TIPOLOGÍA de Tarea
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Desglose metodológico (Mantenimiento, Rondos, Juegos de Posición, Partidos Condicionados, etc.)
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mantenimiento destacado
                </span>
              </div>
            </div>

            {totalTasksCount === 0 ? (
              <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs">
                No hay tareas registradas para analizar la Tipología.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* COLUMN CHART CONTAINER FOR TIPOLOGÍAS */}
                <div className="h-72 pt-8 pb-3 px-3 bg-slate-900/80 rounded-2xl border border-slate-700/80 flex items-end gap-2 md:gap-3 overflow-x-auto">
                  {tipologiaStats.map(t => {
                    const val = viewMode === 'count' ? t.count : t.durationMin;
                    const heightPct = maxTipologiaVal > 0 ? Math.max((val / maxTipologiaVal) * 100, 5) : 5;
                    const colorScheme = TIPOLOGIA_COLORS[t.key] || { bg: 'bg-slate-500', text: 'text-slate-300', border: 'border-slate-400' };
                    const displayPct = viewMode === 'count' ? t.pctCount : t.pctDuration;

                    return (
                      <div
                        key={t.key}
                        className={`min-w-[75px] md:min-w-[90px] flex-1 flex flex-col items-center h-full justify-end z-10 group ${
                          t.isMantenimiento ? 'p-1 rounded-2xl bg-emerald-950/30 border border-emerald-500/40' : ''
                        }`}
                      >
                        {/* VALUE TOOLTIP BADGE */}
                        <div className="mb-2 text-center transition-transform group-hover:-translate-y-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-xs inline-block whitespace-nowrap ${
                            t.isMantenimiento ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-white border-slate-600'
                          }`}>
                            {viewMode === 'count' ? `${t.count} t.` : `${t.durationMin}m`}
                          </span>
                          <span className="block text-[9.5px] font-bold text-slate-400 mt-0.5">
                            {displayPct}%
                          </span>
                        </div>

                        {/* COLUMN BAR */}
                        <div className="w-full bg-slate-800/80 rounded-t-xl p-1 flex items-end justify-center h-full max-h-[180px]">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full ${colorScheme.bg} rounded-t-lg transition-all duration-500 shadow-lg group-hover:brightness-110 flex items-center justify-center relative ${
                              t.isMantenimiento ? 'ring-2 ring-emerald-400/80' : ''
                            }`}
                          >
                            {/* Number label inside bar */}
                            {heightPct > 20 && (
                              <span className="text-[10px] font-black text-white drop-shadow-md">
                                {val}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* X-AXIS LABEL */}
                        <div className="mt-3 text-center w-full px-0.5">
                          <span
                            className={`text-[9.5px] md:text-[10px] font-black uppercase tracking-tight block truncate ${
                              t.isMantenimiento ? 'text-emerald-400 font-extrabold underline decoration-emerald-400' : 'text-slate-300'
                            }`}
                            title={t.key}
                          >
                            {t.key}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DETAILED SUMMARY TABLE OF TIPOLOGÍAS & FOCO BREAKDOWN */}
                <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/90 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Tipología de Tarea</th>
                        <th className="py-3 px-3 text-center">Nº Tareas</th>
                        <th className="py-3 px-3 text-center">% del Total</th>
                        <th className="py-3 px-3 text-center">Tiempo Total</th>
                        <th className="py-3 px-3 text-center text-sky-400">MCB</th>
                        <th className="py-3 px-3 text-center text-amber-400">MSB</th>
                        <th className="py-3 px-3 text-center text-purple-400">MIXTO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tipologiaStats.map((row, idx) => {
                        const isHighlight = row.isMantenimiento;
                        return (
                          <tr
                            key={row.key}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              isHighlight ? 'bg-emerald-950/20 font-bold text-white' : ''
                            }`}
                          >
                            <td className="py-3 px-4 flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  TIPOLOGIA_COLORS[row.key]?.bg || 'bg-slate-500'
                                }`}
                              />
                              <span className={isHighlight ? 'text-emerald-400 font-black' : 'font-semibold'}>
                                {row.key}
                              </span>
                              {isHighlight && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase font-bold">
                                  Destacado
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-black">{row.count}</td>
                            <td className="py-3 px-3 text-center text-slate-400">{row.pctCount}%</td>
                            <td className="py-3 px-3 text-center text-slate-300 font-bold">{row.durationMin} min</td>
                            <td className="py-3 px-3 text-center text-sky-400 font-bold">{row.mcb}</td>
                            <td className="py-3 px-3 text-center text-amber-400 font-bold">{row.msb}</td>
                            <td className="py-3 px-3 text-center text-purple-400 font-bold">{row.mixto}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            <span>Los datos se actualizan automáticamente al crear o editar sesiones de la plantilla.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
