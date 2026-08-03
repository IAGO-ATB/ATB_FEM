import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, MapPin, Clock, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { Team } from '../types';

interface CalendarViewProps {
  season: string;
  selectedTeam: Team | null;
  teams: Team[];
}

export default function CalendarView({ season, selectedTeam, teams }: CalendarViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const initialMatches = [
    { id: '1', date: '04 AGO 2026', time: '18:00', rival: 'Real Madrid Fem B', location: 'Campo Son Malferit', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO A', status: 'upcoming', homeScore: null, awayScore: null },
    { id: '2', date: '11 AGO 2026', time: '11:30', rival: 'FC Barcelona C', location: 'Ciudad Deportiva Joan Gamper', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO A', status: 'upcoming', homeScore: null, awayScore: null },
    { id: '3', date: '18 AGO 2026', time: '17:00', rival: 'RCD Espanyol B', location: 'Campo Son Malferit', type: 'Liga 2ª RFEF', team: 'ATB FEMENINO B', status: 'upcoming', homeScore: null, awayScore: null },
    { id: '4', date: '28 JUL 2026', time: '19:00', rival: 'Levante Las Planas B', location: 'Campo Son Malferit', type: 'Amistoso Pretemporada', team: 'ATB FEMENINO A', status: 'finished', homeScore: 3, awayScore: 1 },
    { id: '5', date: '20 JUL 2026', time: '18:30', rival: 'UD Collerense', location: 'Coll d’en Rebassa', type: 'Copa Mallorca', team: 'ATB FEMENINO B', status: 'finished', homeScore: 0, awayScore: 2 },
  ];

  const [matchesList, setMatchesList] = useState(initialMatches);

  const [newMatch, setNewMatch] = useState({
    date: '',
    time: '18:00',
    rival: '',
    location: 'Campo Son Malferit',
    type: 'Liga 2ª RFEF',
    team: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A'
  });

  const filteredMatches = matchesList.filter(m => {
    const matchesTeam = !selectedTeam || m.team === selectedTeam.name;
    const matchesFilter = filter === 'all' || m.status === filter;
    return matchesTeam && matchesFilter;
  });

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.rival || !newMatch.date) return;

    const formattedDate = new Date(newMatch.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();

    const created = {
      id: String(Date.now()),
      date: formattedDate,
      time: newMatch.time,
      rival: newMatch.rival,
      location: newMatch.location,
      type: newMatch.type,
      team: selectedTeam ? selectedTeam.name : newMatch.team,
      status: 'upcoming' as const,
      homeScore: null,
      awayScore: null
    };

    setMatchesList([created, ...matchesList]);
    setShowAddModal(false);
    setNewMatch({
      date: '',
      time: '18:00',
      rival: '',
      location: 'Campo Son Malferit',
      type: 'Liga 2ª RFEF',
      team: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase tracking-wider">
              Temporada {season}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {selectedTeam ? selectedTeam.name : 'Todas las Plantillas'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">Calendario de Partidos y Eventos</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Próximos
            </button>
            <button
              onClick={() => setFilter('finished')}
              className={`px-3 py-1.5 rounded-md transition-all ${filter === 'finished' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
            >
              Finalizados
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sky-600 transition-colors shadow-sm shadow-sky-200"
          >
            <Plus className="w-4 h-4" />
            Añadir Partido
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="space-y-4">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center shrink-0 shadow-md">
                  <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider">{m.date.split(' ')[1]}</span>
                  <span className="text-lg font-black">{m.date.split(' ')[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.team}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-bold text-sky-600 uppercase">{m.type}</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">ATB Femenino vs {m.rival}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {m.time} hs
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {m.location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                {m.status === 'finished' ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Resultado Final</p>
                      <p className="text-base font-black text-emerald-900">{m.homeScore} - {m.awayScore}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 px-4 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-sky-700">Programado</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 mb-1">No hay partidos programados</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No se han encontrado partidos registrados para el filtro actual en la Temporada {season}.
            </p>
          </div>
        )}
      </div>

      {/* Add Match Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Añadir Nuevo Partido</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rival</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: FC Barcelona B"
                  value={newMatch.rival}
                  onChange={(e) => setNewMatch({ ...newMatch, rival: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={newMatch.date}
                    onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={newMatch.time}
                    onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación / Estadio</label>
                <input
                  required
                  type="text"
                  value={newMatch.location}
                  onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Competición</label>
                <input
                  type="text"
                  value={newMatch.type}
                  onChange={(e) => setNewMatch({ ...newMatch, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-sky-600"
                >
                  Guardar Partido
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
