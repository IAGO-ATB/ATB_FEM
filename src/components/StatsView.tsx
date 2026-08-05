import React from 'react';
import { motion } from 'motion/react';
import { BarChart2, Award, Zap, Shield, TrendingUp, Users, Target } from 'lucide-react';
import { Team } from '../types';

interface StatsViewProps {
  season: string;
  selectedTeam: Team | null;
}

export default function StatsView({ season, selectedTeam }: StatsViewProps) {
  const currentTeamName = selectedTeam ? selectedTeam.name : 'Todas las Plantillas';

  const statsByTeam = {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    avgPossession: '0%'
  };

  const topScorers: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">
              Temporada {season}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {currentTeamName}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">Análisis Estadístico & Rendimiento</h3>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partidos Jugados</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{statsByTeam.matches}</p>
          <div className="flex gap-2 text-[10px] font-bold mt-2">
            <span className="text-emerald-600">{statsByTeam.wins}V</span>
            <span className="text-amber-600">{statsByTeam.draws}E</span>
            <span className="text-rose-600">{statsByTeam.losses}D</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Goles Favor / Contra</p>
          <p className="text-3xl font-black text-sky-600 mt-1">{statsByTeam.goalsFor} <span className="text-slate-400 text-lg font-normal">/ {statsByTeam.goalsAgainst}</span></p>
          <p className="text-[10px] text-slate-500 font-bold mt-2">Diferencia +{statsByTeam.goalsFor - statsByTeam.goalsAgainst}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portería a Cero</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{statsByTeam.cleanSheets}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-2">43% de los partidos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posesión Media</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{statsByTeam.avgPossession}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-2">Control de juego</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-500" /> Estadísticas Individuales ({currentTeamName})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Jugadora</th>
                <th className="py-3 px-2">Posición</th>
                <th className="py-3 px-2 text-center">Goles</th>
                <th className="py-3 px-2 text-center">Asistencias</th>
                <th className="py-3 px-2 text-center">Minutos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topScorers.map((player, idx) => (
                <tr key={`${player.name}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-slate-900">{player.name}</td>
                  <td className="py-3.5 px-2 text-slate-500 font-medium">{player.position}</td>
                  <td className="py-3.5 px-2 text-center font-black text-sky-600 text-sm">{player.goals}</td>
                  <td className="py-3.5 px-2 text-center font-bold text-slate-700">{player.assists}</td>
                  <td className="py-3.5 px-2 text-center text-slate-500 font-mono">{player.minutes}'</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
