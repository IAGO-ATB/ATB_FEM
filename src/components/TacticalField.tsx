import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../types';
import { Users } from 'lucide-react';

interface TacticalFieldProps {
  players: Player[];
  hideHeader?: boolean;
  className?: string;
  showPlayerNames?: boolean;
  hidePhotos?: boolean;
  orientation?: 'vertical' | 'horizontal';
  hidePositionLabels?: boolean;
}

export default function TacticalField({ 
  players, 
  hideHeader = false, 
  className = '', 
  showPlayerNames = false, 
  hidePhotos = false,
  orientation = 'vertical',
  hidePositionLabels = false
}: TacticalFieldProps) {
  const isHorizontal = orientation === 'horizontal';

  // Mapping of specific positions to tactical spots in 4-2-3-1
  const tacticalSpots = isHorizontal ? [
    { id: 'gk', label: 'Portera', pos: 'Portera', top: '50%', left: '10%' },
    
    { id: 'lb', label: 'Lateral Izq.', pos: 'Lateral Izquierdo', top: '15%', left: '28%' },
    { id: 'lcb', label: 'Central Izq.', pos: 'Central Izquierdo', top: '38%', left: '26%' },
    { id: 'rcb', label: 'Central Der.', pos: 'Central Derecho', top: '62%', left: '26%' },
    { id: 'rb', label: 'Lateral Der.', pos: 'Lateral Derecho', top: '85%', left: '28%' },
    
    { id: 'lcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '38%', left: '45%' },
    { id: 'rcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '62%', left: '45%' },
    
    { id: 'lw', label: 'Extremo Izq.', pos: 'Extremo Izquierda', top: '15%', left: '68%' },
    { id: 'cam', label: 'Mediapunta', pos: 'Mediapunta', top: '50%', left: '65%' },
    { id: 'rw', label: 'Extremo Der.', pos: 'Extremo Derecha', top: '85%', left: '68%' },
    
    { id: 'st', label: 'Delantera', pos: 'Delantera', top: '50%', left: '88%' },
  ] : [
    { id: 'gk', label: 'Portera', pos: 'Portera', top: '85%', left: '50%' },
    
    { id: 'rb', label: 'Lateral Der.', pos: 'Lateral Derecho', top: '65%', left: '85%' },
    { id: 'rcb', label: 'Central Der.', pos: 'Central Derecho', top: '70%', left: '62%' },
    { id: 'lcb', label: 'Central Izq.', pos: 'Central Izquierdo', top: '70%', left: '38%' },
    { id: 'lb', label: 'Lateral Izq.', pos: 'Lateral Izquierdo', top: '65%', left: '15%' },
    
    { id: 'rcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '50%', left: '60%' },
    { id: 'lcdm', label: 'Mediocentro', pos: 'Mediocentro', top: '50%', left: '40%' },
    
    { id: 'rw', label: 'Extremo Der.', pos: 'Extremo Derecha', top: '30%', left: '85%' },
    { id: 'cam', label: 'Mediapunta', pos: 'Mediapunta', top: '32%', left: '50%' },
    { id: 'lw', label: 'Extremo Izq.', pos: 'Extremo Izquierda', top: '30%', left: '15%' },
    
    { id: 'st', label: 'Delantera', pos: 'Delantera', top: '12%', left: '50%' },
  ];

  const getPlayerSpot = (p: Player): string => {
    // 1. Direct match on posicion_especifica if present and valid (restores original behavior for Plantillas interface)
    if (p.posicion_especifica) {
      const pe = p.posicion_especifica.trim();
      const valid = ['Portera', 'Lateral Derecho', 'Central Derecho', 'Central Izquierdo', 'Carril Derecho', 'Carril Izquierdo', 'Lateral Izquierdo', 'Mediocentro', 'Mediapunta', 'Extremo Derecha', 'Extremo Izquierda', 'Delantera'];
      if (valid.includes(pe)) {
        if (pe === 'Carril Derecho') return 'Lateral Derecho';
        if (pe === 'Carril Izquierdo') return 'Lateral Izquierdo';
        return pe;
      }
      if (pe === 'Central') return 'Central Derecho';
      if (pe === 'Carrilero Derecho') return 'Lateral Derecho';
      if (pe === 'Carrilero Izquierdo') return 'Lateral Izquierdo';
    }

    const name = (p.name || p.nombre || '').toUpperCase().trim();
    const id = (p.id || '').toLowerCase();
    const pos = (p.posicion_especifica || p.demarcacion || p.position || '').trim().toLowerCase();

    // 2. Name / ID heuristics as fallback
    if (name.includes('SANDRA') || name.includes('BLANCA') || id === 'pa_13' || id === 'pb_1' || pos.includes('port') || pos.includes('gk')) return 'Portera';
    if (name.includes('LÓPEZ') || name.includes('LOPEZ') || id === 'pb_13' || id.includes('lopez') || name.includes('IXIAR') || name.includes('IXI')) return 'Delantera';
    if (name.includes('VÉLEZ') || name.includes('VELEZ') || id.includes('velez')) return 'Lateral Derecho';
    if (name.includes('MARTA') || name.includes('JULIETA') || name.includes('ANTONELLA') || name.includes('RUTH') || name.includes('AINA') || id === 'pa_3' || id === 'pb_14' || id === 'pc_10') return 'Mediocentro';
    if (name.includes('ANDREA') || name.includes('ANDRE') || id === 'pa_5') return 'Lateral Derecho';
    if (name.includes('ORFILA') || (name.includes('NEREA') && !name.includes('LÓPEZ') && !name.includes('LOPEZ') && id !== 'pb_13')) return 'Central Izquierdo';
    if (name.includes('JOANA') || name.includes('ROXANNE') || name.includes('HELENA')) return 'Central Derecho';
    if (name.includes('FATI') || name.includes('ADA') || name.includes('CORA')) return 'Lateral Izquierdo';
    if (name.includes('ABI') || name.includes('NADIA')) return 'Mediapunta';
    if (name.includes('GABI') || name.includes('NEUS') || name.includes('SOFÍA') || name.includes('SOFIA')) return 'Extremo Derecha';
    if (name.includes('POMER') || name.includes('NURIA') || name.includes('PAULA') || name.includes('CHLOE')) return 'Extremo Izquierda';

    if (pos.includes('lat') && pos.includes('der')) return 'Lateral Derecho';
    if (pos.includes('lat') && pos.includes('izq')) return 'Lateral Izquierdo';
    if (pos.includes('carril') && pos.includes('der')) return 'Lateral Derecho';
    if (pos.includes('carril') && pos.includes('izq')) return 'Lateral Izquierdo';
    if (pos.includes('centr') && pos.includes('izq')) return 'Central Izquierdo';
    if (pos.includes('centr') || pos.includes('cb')) return 'Central Derecho';
    if (pos.includes('med') || pos.includes('piv') || pos.includes('mc')) return 'Mediocentro';
    if (pos.includes('ext') && pos.includes('der')) return 'Extremo Derecha';
    if (pos.includes('ext') && pos.includes('izq')) return 'Extremo Izquierda';
    if (pos.includes('del') || pos.includes('dc')) return 'Delantera';

    return 'Mediocentro';
  };

  const getPlayersByPos = (posName: string) => {
    return players.filter(p => getPlayerSpot(p) === posName);
  };

  return (
    <div className={`${hideHeader ? '' : 'mt-16 space-y-6'} ${className}`}>
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100"></div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Disposición Táctica (4-2-3-1)</h4>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
      )}

      <div className={`relative w-full max-w-2xl mx-auto bg-emerald-700 rounded-[1.25rem] overflow-hidden shadow-2xl border-4 border-white/20 p-2 ${
        isHorizontal ? 'aspect-[16/9] md:aspect-[2/1]' : 'aspect-[3/4] md:aspect-[4/3]'
      }`}>
        {/* Pitch Markings */}
        <div className="absolute inset-2.5 border-2 border-white/30 rounded-xl pointer-events-none">
          {isHorizontal ? (
            <>
              {/* Halfway line vertical */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-20 md:h-20 border-2 border-white/30 rounded-full" />
              
              {/* Areas */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1/5 h-3/5 border-r-2 border-y-2 border-white/30" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/5 h-3/5 border-l-2 border-y-2 border-white/30" />
              
              {/* Penalty Spots */}
              <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-1 h-1 bg-white/50 rounded-full" />
              <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-1 h-1 bg-white/50 rounded-full" />
            </>
          ) : (
            <>
              {/* Halfway line horizontal */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full" />
              
              {/* Areas */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-t-2 border-x-2 border-white/30" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/5 border-b-2 border-x-2 border-white/30" />
              
              {/* Penalty Spots */}
              <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full" />
            </>
          )}
        </div>

        {/* Players */}
        <div className="absolute inset-0 p-3">
          {tacticalSpots.map((spot) => {
            const spotPlayers = getPlayersByPos(spot.pos);
            
            // For shared spots (Mediocentro), we split the pool if needed
            let displayPlayers = spotPlayers;
            if (spot.pos === 'Mediocentro') {
              if (spot.id === 'lcdm') {
                // Mediocentro Izquierdo: MARTA, RUTH, AINA
                displayPlayers = spotPlayers.filter(p => {
                  const n = (p.name || p.nombre || '').toUpperCase();
                  return n.includes('MARTA') || n.includes('RUTH') || n.includes('AINA');
                });
                if (displayPlayers.length === 0 && spotPlayers.length > 0) {
                  displayPlayers = spotPlayers.slice(Math.ceil(spotPlayers.length / 2));
                }
              } else {
                // Mediocentro Derecho: JULIETA, ANTONELLA
                displayPlayers = spotPlayers.filter(p => {
                  const n = (p.name || p.nombre || '').toUpperCase();
                  return n.includes('JULIETA') || n.includes('ANTONELLA');
                });
                if (displayPlayers.length === 0 && spotPlayers.length > 0) {
                  displayPlayers = spotPlayers.slice(0, Math.ceil(spotPlayers.length / 2));
                }
              }
            }

            return (
              <div 
                key={spot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                style={{ top: spot.top, left: spot.left }}
              >
                {displayPlayers.length > 0 ? (
                  showPlayerNames ? (
                    <div className="flex flex-wrap justify-center items-center gap-1 max-w-[130px] mb-1">
                      {displayPlayers.map((player, idx) => {
                        const displayName = (player.name || player.nombre || '').toUpperCase();
                        const isComodin = (player as any).status === 'comodin';
                        return (
                          <motion.div
                            key={player.id || idx}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative group flex flex-col items-center"
                          >
                            {!hidePhotos && (
                              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border shadow-md overflow-hidden bg-black flex items-center justify-center ${
                                isComodin ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-white'
                              }`}>
                                {player.image ? (
                                  <img src={player.image} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black text-[9px] md:text-[10px]">
                                    {player.number || displayName.substring(0, 1)}
                                  </div>
                                )}
                              </div>
                            )}
                            <span className={`px-1 py-0.5 rounded text-[7.5px] md:text-[8.5px] font-black uppercase tracking-tight shadow border leading-none text-center whitespace-nowrap ${
                              !hidePhotos ? 'mt-0.5' : ''
                            } ${
                              isComodin
                                ? 'bg-amber-400 text-amber-950 border-amber-600'
                                : 'bg-white text-slate-900 border-black'
                            }`}>
                              {displayName}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center -space-x-2 md:-space-x-3 mb-1">
                      {displayPlayers.map((player, idx) => {
                        const displayName = (player.name || player.nombre || '').toUpperCase();
                        const isComodin = (player as any).status === 'comodin';
                        return (
                          <motion.div
                            key={player.id || idx}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative group shrink-0"
                            title={displayName}
                          >
                            <div className={`w-8 h-8 md:w-11 md:h-11 rounded-full border-2 shadow-lg overflow-hidden bg-black flex items-center justify-center ${
                              isComodin ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-white'
                            }`}>
                              {player.image ? (
                                <img 
                                  src={player.image} 
                                  alt={displayName} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black text-[10px] md:text-xs">
                                  {player.number || displayName.substring(0, 1)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 md:w-11 md:h-11 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center bg-black/20 mb-1">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                  </div>
                )}

                {!hidePositionLabels && (
                  <span className="text-[8px] md:text-[9.5px] font-black text-white uppercase tracking-wider bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm border border-white/10 text-center whitespace-nowrap leading-none">
                    {spot.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
