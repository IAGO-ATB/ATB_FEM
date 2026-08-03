import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Phone, Calendar, Trophy, Activity, Shield, User } from 'lucide-react';
import { Player } from '../types';

interface PlayerProfileProps {
  player: Player;
  onBack: () => void;
}

export default function PlayerProfile({ player, onBack }: PlayerProfileProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row"
    >
      {/* Sidebar Profile Info */}
      <div className="w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col items-center text-center">
        <button 
          onClick={onBack}
          className="self-start mb-6 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center border-4 border-sky-500 mb-6 shadow-xl">
          <User className="w-16 h-16 text-slate-600" />
        </div>
        
        <h3 className="text-2xl font-bold mb-1">{player.name}</h3>
        <p className="text-sky-400 font-bold uppercase tracking-widest text-xs mb-6">{player.position}</p>
        
        <div className="flex gap-4 mb-8">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Dorsal</p>
            <p className="text-xl font-bold">{player.number}</p>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Edad</p>
            <p className="text-xl font-bold">24</p>
          </div>
        </div>

        <div className="w-full space-y-3 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Mail className="w-4 h-4 text-sky-500" />
            <span>contacto@club.com</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Phone className="w-4 h-4 text-sky-500" />
            <span>+34 600 000 000</span>
          </div>
        </div>
      </div>

      {/* Main Stats Area */}
      <div className="flex-1 p-8 bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-sky-500" />
          Rendimiento Temporada 26/27
        </h4>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Partidos" value={player.stats.matchesPlayed} icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Goles" value={player.stats.goals} color="text-sky-500" icon={<Shield className="w-4 h-4" />} />
          <StatCard label="Asistencias" value={player.stats.assists} icon={<Shield className="w-4 h-4" />} />
          <StatCard label="Minutos" value={980} icon={<Calendar className="w-4 h-4" />} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Últimos Partidos</h5>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">vs Real Madrid Fem</span>
                </div>
                <span className="text-xs font-bold text-slate-400">12/05/2026</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button className="flex-1 bg-[#0f172a] text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">
            EDITAR PERFIL
          </button>
          <button className="flex-1 border border-slate-200 bg-white text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
            DESCARGAR PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color = "text-slate-900", icon }: { label: string, value: string | number, color?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="text-slate-300">{icon}</div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
