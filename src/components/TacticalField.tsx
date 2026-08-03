import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../types';
import { Users } from 'lucide-react';

interface TacticalFieldProps {
  players: Player[];
}

export default function TacticalField({ players }: TacticalFieldProps) {
  // Mapping of specific positions to tactical spots in 4-2-3-1
  const tacticalSpots = [
    { id: 'gk', label: 'Portera', pos: 'Portera', top: '85%', left: '50%' },
    
    { id: 'rb', label: 'Lateral Der.', pos: 'Lateral Derecho', top: '65%', left: '85%' },
    { id: 'rcb', label: 'Central', pos: 'Central', top: '70%', left: '62%' },
    { id: 'lcb', label: 'Central', pos: 'Central', top: '70%', left: '38%' },
    { id: 'lb', label: 'Lateral Izq.', pos: 'Lateral Izquierdo', top: '65%', left: '15%' },
    
    { id: 'rcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '50%', left: '60%' },
    { id: 'lcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '50%', left: '40%' },
    
    { id: 'rw', label: 'Extremo Der.', pos: 'Extremo Derecha', top: '30%', left: '85%' },
    { id: 'cam', label: 'Mediapunta', pos: 'Mediapunta', top: '32%', left: '50%' },
    { id: 'lw', label: 'Extremo Izq.', pos: 'Extremo Izquierda', top: '30%', left: '15%' },
    
    { id: 'st', label: 'Delantera', pos: 'Delantera', top: '12%', left: '50%' },
  ];

  const getPlayersByPos = (posName: string) => {
    return players.filter(p => p.posicion_especifica === posName);
  };

  return (
    <div className="mt-16 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100"></div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Disposición Táctica (4-2-3-1)</h4>
        <div className="h-px flex-1 bg-slate-100"></div>
      </div>

      <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] md:aspect-[4/3] bg-emerald-600 rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-white/20 p-3">
        {/* Pitch Markings */}
        <div className="absolute inset-3 border-2 border-white/30 rounded-xl">
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full" />
          
          {/* Areas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-t-2 border-x-2 border-white/30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-b-2 border-x-2 border-white/30" />
          
          {/* Penalty Spots */}
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
        </div>

        {/* Players */}
        <div className="absolute inset-0 p-4">
          {tacticalSpots.map((spot) => {
            const spotPlayers = getPlayersByPos(spot.pos);
            
            // For shared spots (Central, Mediocentro), we split the pool
            let displayPlayers = spotPlayers;
            if (spot.pos === 'Central') {
              displayPlayers = spot.id === 'rcb' 
                ? spotPlayers.slice(0, Math.ceil(spotPlayers.length / 2))
                : spotPlayers.slice(Math.ceil(spotPlayers.length / 2));
            } else if (spot.pos === 'Mediocentro') {
              displayPlayers = spot.id === 'rcdm'
                ? spotPlayers.slice(0, Math.ceil(spotPlayers.length / 2))
                : spotPlayers.slice(Math.ceil(spotPlayers.length / 2));
            }

            return (
              <div 
                key={spot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ top: spot.top, left: spot.left }}
              >
                <div className="relative">
                  {displayPlayers.length > 0 ? (
                    <div className="flex -space-x-3">
                      {displayPlayers.map((player, idx) => (
                        <motion.div
                          key={player.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative group"
                        >
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white shadow-lg overflow-hidden bg-white">
                            {player.image ? (
                              <img src={player.image} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                <span className="text-[10px] font-black">{player.number}</span>
                              </div>
                            )}
                          </div>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {player.name}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                      <div className="w-1 h-1 bg-white/20 rounded-full" />
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[8px] md:text-[9px] font-bold text-white/60 uppercase tracking-tighter bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {spot.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
