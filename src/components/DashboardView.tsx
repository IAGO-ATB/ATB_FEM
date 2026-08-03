import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Calendar, Trophy, Award, Activity, Shield, ArrowRight, TrendingUp } from 'lucide-react';
import { Team, Player } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardViewProps {
  season: string;
  selectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  teams: Team[];
}

export default function DashboardView({ season, selectedTeam, onSelectTeam, teams }: DashboardViewProps) {
  const currentTeamName = selectedTeam ? selectedTeam.name : 'Todas las Plantillas';
  const [totalPlayers, setTotalPlayers] = useState<number>(0);

  useEffect(() => {
    async function computeTotal() {
      const teamsToCount = selectedTeam ? [selectedTeam] : teams;
      let total = 0;
      const seasonStr = season || '2026/2027';

      for (const t of teamsToCount) {
        let sbCount: number | null = null;
        if (supabase) {
          try {
            const { count } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('teamid', t.id);
            sbCount = count;
          } catch (e) {}
        }

        let localCount = 0;
        const key = `app_players_${seasonStr}_${t.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localCount = parsed.length;
          } catch (e) {}
        } else if (seasonStr === '2026/2027' && t.id === 'FEMENINO_A') {
          localCount = 4;
        }

        total += Math.max(sbCount || 0, localCount);
      }

      setTotalPlayers(total);
    }

    computeTotal();
  }, [season, selectedTeam, teams]);

  // Mock data adapted to current season and selected team
  const matches = [
    { id: '1', date: '04 AGO 2026', time: '18:00', rival: 'Real Madrid Fem B', location: 'Campo Son Malferit', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO A' },
    { id: '2', date: '11 AGO 2026', time: '11:30', rival: 'FC Barcelona C', location: 'Ciudad Deportiva', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO A' },
    { id: '3', date: '18 AGO 2026', time: '17:00', rival: 'RCD Espanyol B', location: 'Campo Son Malferit', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO B' },
  ].filter(m => !selectedTeam || m.team === selectedTeam.name || selectedTeam.id === 'FEMENINO_A');

  const topScorers = [
    { name: 'Sofía Ruiz', team: 'ATB FEMENINO A', goals: 15, position: 'Delantera' },
    { name: 'Elena Gómez', team: 'ATB FEMENINO A', goals: 8, position: 'Mediapunta' },
    { name: 'Lucía Fernández', team: 'ATB FEMENINO B', goals: 6, position: 'Extremo Izq.' },
    { name: 'María Torres', team: 'ATB FEMENINO C', goals: 5, position: 'Delantera' },
  ].filter(s => !selectedTeam || s.team === selectedTeam.name);

  return (
    <div className="space-y-6">
      {/* Active Context Banner */}
      <div className="bg-gradient-to-r from-[#0f172a] via-slate-800 to-sky-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-sky-500/20 text-sky-300 text-xs font-bold rounded-full border border-sky-400/30 uppercase tracking-widest">
                Temporada {season}
              </span>
              <span className="px-3 py-1 bg-white/10 text-slate-200 text-xs font-bold rounded-full border border-white/10 uppercase tracking-widest">
                {currentTeamName}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Panel de Control {selectedTeam ? `- ${selectedTeam.name}` : 'General'}
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Vista consolidada de rendimiento, plantilla y próximos compromisos para la temporada {season}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!selectedTeam && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-center min-w-[120px]">
                <p className="text-2xl font-black text-white">{teams.length}</p>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Plantillas</p>
              </div>
            )}
            <div className="bg-sky-500/20 backdrop-blur-md p-4 rounded-xl border border-sky-400/30 text-center min-w-[120px]">
              <p className="text-2xl font-black text-sky-400">{totalPlayers}</p>
              <p className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Jugadoras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posición Clasificación</p>
            <p className="text-2xl font-black text-slate-900">2º Lugar</p>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> 28 pts acumulados
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rendimiento</p>
            <p className="text-2xl font-black text-slate-900">78%</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Últimos 5 partidos</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goles Marcados</p>
            <p className="text-2xl font-black text-slate-900">34</p>
            <p className="text-xs text-purple-600 font-bold mt-0.5">2.8 por partido</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximo Partido</p>
            <p className="text-sm font-bold text-slate-900 truncate">vs Real Madrid B</p>
            <p className="text-xs text-amber-600 font-bold mt-0.5">En 4 días</p>
          </div>
        </div>
      </div>

      {/* Main Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Matches */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Calendario Destacado</h3>
              <p className="text-xs text-slate-500">Temporada {season} · {currentTeamName}</p>
            </div>
            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
              3 Próximos
            </span>
          </div>

          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-black text-sky-600 uppercase">{match.date.split(' ')[1]}</span>
                    <span className="text-base font-black text-slate-900">{match.date.split(' ')[0]}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{match.rival}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{match.location}</span> · <span className="text-slate-700 font-medium">{match.time} hs</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded uppercase">
                    {match.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Scorers */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Máximas Goleadoras</h3>
              <p className="text-xs text-slate-500">Temporada {season}</p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {topScorers.length > 0 ? (
              topScorers.map((scorer, idx) => (
                <div key={`${scorer.name}_${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700/20 text-amber-800'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{scorer.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{scorer.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-sky-600">{scorer.goals}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">goles</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No hay registros de goleadoras para esta selección.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Select Team Grid if "Todas las Plantillas" is selected */}
      {!selectedTeam && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Acceso Rápido a Plantillas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTeam(t)}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all text-left bg-slate-50/50 hover:bg-white group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{t.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{t.category}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
