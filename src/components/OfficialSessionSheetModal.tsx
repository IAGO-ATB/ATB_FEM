import React from 'react';
import { X, Download, Shield, Clock, Calendar, AlertCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { TrainingSession, Team } from '../types';
import { supabase } from '../lib/supabase';
import TacticalField from './TacticalField';

interface OfficialSessionSheetModalProps {
  session: TrainingSession;
  team: Team | null;
  season: string;
  onClose: () => void;
}

const DEFAULT_PLAYERS_LIST = [
  'SANDRA', 'ANDREA', 'FATI', 'JOANA', 'HELENA', 'VÉLEZ', 'ANTONELLA', 'GABI', 'NEUS', 
  'IXI', 'NADIA', 'CHLOE', 'MARINA', 'CORA', 'BLANCA', 'ADA', 'ROXANNE', 
  'NEREA', 'JULIETA', 'ABI', 'LÓPEZ', 'CARMEN', 'PAULA', 'MARTA'
];

const DEFAULT_MATERIALS = [
  'BALONES', 'PETOS', 'CHINOS', 'MINIPORTERIAS', 'PORTERÍA GRANDE', 
  'PICAS', 'AROS', 'VALLAS', 'CONOS ALTOS', 'ELÁSTICO'
];

export default function OfficialSessionSheetModal({ session, team, season, onClose }: OfficialSessionSheetModalProps) {
  const [allPotentialPlayers, setAllPotentialPlayers] = React.useState<any[]>([]);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  React.useEffect(() => {
    async function loadPlayers() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*');
        
        if (!error && data) {
          setAllPotentialPlayers(data.map(p => ({
            ...p,
            secondPosition: p.secondPosition || p.second_position || p.segunda_posicion || p.segunda_posicion_especifica || p.secondposition || '',
            name: p.nombre || p.name,
            teamId: p.team_id || p.teamId
          })));
        }
      } catch (e) {
        console.error('Error fetching players in OfficialSessionSheetModal');
      }
    }
    loadPlayers();
  }, []);

  const handleExportPDF = async () => {
    const element = document.getElementById('print-session-sheet');
    if (!element) return;

    try {
      setIsExportingPDF(true);
      await new Promise(r => setTimeout(r, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
        }
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width || pdfHeight;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        const fitHeight = pdfHeight;
        const fitWidth = (img.width * pdfHeight) / img.height;
        const xOffset = (pdfWidth - fitWidth) / 2;
        pdf.addImage(dataUrl, 'PNG', xOffset, 0, fitWidth, fitHeight);
      }

      const cleanSessionNum = session.sessionNumber || '3';
      const cleanDate = (session.date || '').replace(/[\/\.]/g, '-');
      pdf.save(`Ficha_Oficial_ATB_Sesion_${cleanSessionNum}_${cleanDate}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF con html-to-image:', err);
      // Fallback: create PDF via print
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const unavailable = session.unavailablePlayerNames || [];
  const wildcards = session.wildcardPlayerNames || [];
  const playerStatuses = session.playerStatuses || {};

  // Helper to determine position weight for sorting (Porteras -> Defensoras -> Centrocampistas -> Delanteras)
  const getPositionOrder = (pId: string) => {
    const p = allPotentialPlayers.find(item => 
      item.id === pId || 
      item.id === `p_${pId}` || 
      item.id === `filial_${pId}` || 
      item.name?.toUpperCase() === pId.toUpperCase() || 
      item.nombre?.toUpperCase() === pId.toUpperCase()
    );
    if (p) {
      const pos = (p.positionCategory || p.position_category || p.position || p.demarcacion || '').toUpperCase();
      if (pos.includes('PORT') || pos.includes('GK') || pos.includes('ARQ')) return 1;
      if (pos.includes('DEF') || pos.includes('LAT') || pos.includes('CB')) return 2;
      if (pos.includes('MED') || pos.includes('CENTRO') || pos.includes('MID') || pos.includes('MC')) return 3;
      if (pos.includes('DEL') || pos.includes('EXT') || pos.includes('ATT') || pos.includes('ATA')) return 4;
    }

    // Name fallback heuristic matching
    const upper = pId.toUpperCase();
    if (upper.includes('LAURA') || upper.includes('BLANCA') || upper.includes('SANDRA') || upper.includes('PORT')) return 1;
    if (upper.includes('LUCÍA') || upper.includes('LUCIA') || upper.includes('PASTOR') || upper.includes('CARLA') || upper.includes('ANDREA') || upper.includes('ANDRE') || upper.includes('SONIA') || upper.includes('ADA') || upper.includes('VÉLEZ') || upper.includes('VELEZ') || upper.includes('MARTA') || upper.includes('JOANA') || upper.includes('ROXANNE') || upper.includes('HELENA') || (upper.includes('NEREA') && !upper.includes('LÓPEZ') && !upper.includes('LOPEZ')) || upper.includes('FATI') || upper.includes('CORA')) return 2;
    if (upper.includes('RUTH') || upper.includes('AINA') || upper.includes('ELENA') || upper.includes('BESTARD') || upper.includes('VITORIA') || upper.includes('NEUS') || upper.includes('ABI') || upper.includes('NADIA') || upper.includes('JULIETA') || upper.includes('ANTONELLA')) return 3;
    if (upper.includes('SERRA') || upper.includes('SOFÍA') || upper.includes('SOFIA') || upper.includes('COLL') || upper.includes('HERAS') || upper.includes('GABI') || upper.includes('PAULA') || upper.includes('POMER') || upper.includes('NURIA') || upper.includes('CHLOE') || upper.includes('IXI') || upper.includes('LÓPEZ') || upper.includes('LOPEZ')) return 4;

    return 5;
  };

  const getNameFromId = (id: string) => {
    const found = allPotentialPlayers.find(p => 
      p.id === id || 
      p.id === `p_${id}` || 
      p.id === `filial_${id}` || 
      p.name?.toUpperCase() === id.toUpperCase() || 
      p.nombre?.toUpperCase() === id.toUpperCase()
    );
    let raw = found ? (found.nombre || found.name) : id;
    if (!raw) raw = id;
    const upper = raw.toUpperCase().trim();
    const idUpper = id.toUpperCase().trim();

    // 1. Martas -> Last names (PASTOR, PONS, COMPANY, LLADÓ, VÉLEZ, MUÑOZ)
    if (id === 'pa_3' || upper === 'MARTA PASTOR' || upper === 'M. PASTOR' || upper.includes('PASTOR') || idUpper.includes('PASTOR')) {
      return 'PASTOR';
    }
    if (id === 'pb_14' || upper === 'MARTA PONS' || upper === 'M. PONS' || upper.includes('PONS') || idUpper.includes('PONS')) {
      return 'PONS';
    }
    if (id === 'pc_10' || upper === 'MARTA COMPANY' || upper === 'M. COMPANY' || upper.includes('COMPANY') || idUpper.includes('COMPANY')) {
      return 'COMPANY';
    }
    if (id === 'pd_8' || upper === 'MARTA LLADÓ' || upper === 'M. LLADÓ' || upper === 'MARTA LLADO' || upper.includes('LLADÓ') || idUpper.includes('LLADÓ')) {
      return 'LLADÓ';
    }
    if (upper === 'MARTA VÉLEZ' || upper === 'MARTA VELEZ' || upper === 'M. VÉLEZ' || upper === 'M. VELEZ' || idUpper.includes('VELEZ') || idUpper.includes('VÉLEZ') || upper === 'VELEZ' || upper === 'VÉLEZ' || (upper.includes('MARTA') && (upper.includes('VÉLEZ') || upper.includes('VELEZ')))) {
      return 'VÉLEZ';
    }
    if (upper === 'MARTA MUÑOZ' || upper === 'MARTA MUNOZ' || upper === 'M. MUÑOZ' || upper.includes('MUÑOZ')) {
      return 'MUÑOZ';
    }

    // 2. Nereas -> Last names (LÓPEZ, ORFILA)
    if (id === 'pb_13' || upper === 'NEREA LÓPEZ' || upper === 'NEREA LOPEZ' || upper === 'N. LÓPEZ' || upper === 'N. LOPEZ' || idUpper.includes('NEREA_LOPEZ') || idUpper.includes('NEREA_LÓPEZ') || idUpper === 'LÓPEZ' || idUpper === 'LOPEZ' || upper === 'LÓPEZ' || upper === 'LOPEZ' || (upper.includes('NEREA') && (upper.includes('LÓPEZ') || upper.includes('LOPEZ')))) {
      return 'LÓPEZ';
    }
    if (upper === 'NEREA ORFILA' || upper === 'N. ORFILA' || upper.includes('ORFILA') || idUpper.includes('ORFILA')) {
      return 'ORFILA';
    }

    // 3. Paulas -> Last names (VITORIA, SERRA, VICH, SALOM, BESTARD)
    if (id === 'pa_16' || upper === 'PAULA VITORIA' || upper === 'P. VITORIA' || idUpper.includes('VITORIA')) {
      return 'VITORIA';
    }
    if (id === 'pa_7' || upper === 'PAULA SERRA' || upper === 'P. SERRA' || idUpper.includes('SERRA')) {
      return 'SERRA';
    }
    if (id === 'pb_4' || upper === 'PAULA VICH' || upper === 'P. VICH' || idUpper.includes('PAULA_VICH')) {
      return 'VICH';
    }
    if (id === 'pc_1' || upper === 'PAULA SALOM' || upper === 'P. SALOM') {
      return 'SALOM';
    }
    if (id === 'pd_10' || upper === 'PAULA BESTARD' || upper === 'P. BESTARD') {
      return 'BESTARD';
    }

    // 4. Ainas -> Last names (TORRES, FONT)
    if (id === 'pa_8' || upper === 'AINA TORRES' || upper === 'A. TORRES' || idUpper.includes('TORRES')) {
      return 'TORRES';
    }
    if (id === 'pb_17' || upper === 'AINA FONT' || upper === 'A. FONT' || idUpper.includes('AINA_FONT')) {
      return 'FONT';
    }

    // 5. Lauras -> Last names (MARTÍNEZ, BENNASAR, ROSSELLÓ)
    if (id === 'pa_1' || upper === 'LAURA MARTÍNEZ' || upper === 'LAURA MARTINEZ' || idUpper.includes('LAURA_MARTINEZ')) {
      return 'MARTÍNEZ';
    }
    if (id === 'pb_7' || upper === 'LAURA BENNASAR' || upper === 'L. BENNASAR') {
      return 'BENNASAR';
    }
    if (id === 'pc_6' || upper === 'LAURA ROSSELLÓ' || upper === 'L. ROSSELLÓ') {
      return 'ROSSELLÓ';
    }

    // 6. Carlas -> Last names (RODRÍGUEZ, JUAN)
    if (id === 'pa_4' || upper === 'CARLA RODRÍGUEZ' || upper === 'CARLA RODRIGUEZ' || idUpper.includes('RODRIGUEZ')) {
      return 'RODRÍGUEZ';
    }
    if (id === 'pb_9' || upper === 'CARLA JUAN' || upper === 'C. JUAN') {
      return 'JUAN';
    }

    // 7. Marias -> Last names (HERAS, BAUZÀ, CAPÓ)
    if (id === 'pa_17' || upper === 'MARIA HERAS' || upper === 'M. HERAS' || idUpper.includes('HERAS')) {
      return 'HERAS';
    }
    if (id === 'pb_3' || upper === 'MARIA BAUZÀ' || upper === 'M. BAUZÀ') {
      return 'BAUZÀ';
    }
    if (id === 'pc_7' || upper === 'MARIA CAPÓ' || upper === 'M. CAPÓ') {
      return 'CAPÓ';
    }

    // 8. Sofias -> Last names (RUIZ, ROTGER)
    if (id === 'pa_9' || upper === 'SOFÍA RUIZ' || upper === 'SOFIA RUIZ' || idUpper.includes('SOFIA_RUIZ')) {
      return 'RUIZ';
    }
    if (id === 'pd_6' || upper === 'SOFIA ROTGER' || upper === 'S. ROTGER') {
      return 'ROTGER';
    }

    // 9. Andrea -> ANDREA
    if (upper === 'ANDRE' || upper === 'ANDREA' || id === 'pa_5') {
      return 'ANDREA';
    }

    // Generic fallback for any full name string (e.g. "Nombre Apellido")
    if (raw.includes(' ')) {
      const parts = raw.trim().split(/\s+/);
      if (parts.length >= 2) {
        // Return surname
        return parts.slice(1).join(' ').toUpperCase();
      }
    }

    return raw;
  };

  // Derive complete list of unavailable players from playerStatuses and unavailable array
  const unavailableList = React.useMemo(() => {
    const list: string[] = [];
    const addedNames = new Set<string>();

    if (playerStatuses && Object.keys(playerStatuses).length > 0) {
      Object.entries(playerStatuses).forEach(([pId, status]) => {
        if (status === 'no_disponible') {
          const displayName = getNameFromId(pId);
          if (displayName && !addedNames.has(displayName.toUpperCase())) {
            addedNames.add(displayName.toUpperCase());
            list.push(displayName);
          }
        }
      });
    }

    if (unavailable && unavailable.length > 0) {
      unavailable.forEach((unId) => {
        const displayName = getNameFromId(unId);
        if (displayName && !addedNames.has(displayName.toUpperCase())) {
          addedNames.add(displayName.toUpperCase());
          list.push(displayName);
        }
      });
    }

    return list;
  }, [playerStatuses, unavailable, allPotentialPlayers]);

  // Construct top player matrix list sorted by position (Porteras first, then Def, Med, Del)
  let allPlayers: string[] = [];
  if (playerStatuses && Object.keys(playerStatuses).length > 0) {
    allPlayers = Object.keys(playerStatuses);
  } else {
    const combined = Array.from(new Set([...(session.availablePlayerNames || []), ...wildcards, ...unavailable]));
    allPlayers = combined.length > 0 ? combined : DEFAULT_PLAYERS_LIST;
  }

  // Sort by position category
  allPlayers.sort((a, b) => getPositionOrder(a) - getPositionOrder(b));

  // Ensure 26 slots in total
  const displaySlots = Array.from({ length: 26 }, (_, i) => allPlayers[i] || null);
  // Split into 2 rows of 13 columns by column-pairs (Col 0 top=0, bot=1; Col 1 top=2, bot=3; etc.)
  const topRowSlots = Array.from({ length: 13 }, (_, colIdx) => displaySlots[colIdx * 2]);
  const bottomRowSlots = Array.from({ length: 13 }, (_, colIdx) => displaySlots[colIdx * 2 + 1]);

  // Helper to determine specific tactical spot for session sheet campograma
  const getSessionTacticalPosition = (displayName: string, pId: string, rawPos: string): string => {
    const upper = displayName.toUpperCase().trim();
    const idUpper = pId.toUpperCase().trim();

    if (rawPos) {
      const pe = rawPos.trim();
      if (['Portera', 'Lateral Derecho', 'Central', 'Lateral Izquierdo', 'Mediocentro', 'Mediapunta', 'Extremo Derecha', 'Extremo Izquierda', 'Delantera'].includes(pe)) {
        return pe;
      }
    }

    if (upper === 'LÓPEZ' || upper === 'LOPEZ' || pId === 'pb_13' || idUpper.includes('LÓPEZ') || idUpper.includes('LOPEZ')) {
      return 'Delantera';
    }
    if (upper === 'VÉLEZ' || upper === 'VELEZ' || idUpper.includes('VELEZ') || idUpper.includes('VÉLEZ')) {
      return 'Lateral Derecho';
    }
    if (['MARTA', 'PASTOR', 'PONS', 'COMPANY', 'LLADÓ', 'MUÑOZ'].includes(upper)) {
      return 'Mediocentro';
    }
    if (['NEREA', 'ORFILA'].includes(upper)) {
      return 'Central';
    }
    if (upper === 'ANDREA' || upper === 'ANDRE') {
      return 'Lateral Derecho';
    }

    if (upper.includes('SANDRA') || upper.includes('BLANCA') || upper.includes('MARTÍNEZ') || upper.includes('BENNASAR')) return 'Portera';
    if (upper.includes('IXI') || upper.includes('IXIAR') || upper.includes('HERAS') || upper.includes('RUIZ')) return 'Delantera';
    if (upper.includes('JULIETA') || upper.includes('ANTONELLA') || upper.includes('TORRES') || upper.includes('FONT')) return 'Mediocentro';
    if (upper.includes('JOANA') || upper.includes('ROXANNE') || upper.includes('HELENA') || upper.includes('RODRÍGUEZ')) return 'Central';
    if (upper.includes('FATI') || upper.includes('ADA') || upper.includes('CORA')) return 'Lateral Izquierdo';
    if (upper.includes('ABI') || upper.includes('NADIA')) return 'Mediapunta';
    if (upper.includes('GABI') || upper.includes('NEUS') || upper.includes('SERRA')) return 'Extremo Derecha';
    if (upper.includes('NURIA') || upper.includes('PAULA') || upper.includes('VITORIA') || upper.includes('CHLOE')) return 'Extremo Izquierda';

    return 'Mediocentro';
  };

  // Construct player objects formatted for TacticalField
  const activePlayerObjects = React.useMemo(() => {
    const list: any[] = [];
    const seenPlayerIds = new Set<string>();

    allPlayers.forEach(pId => {
      const status = playerStatuses?.[pId] || (
        unavailable.some(u => u.toUpperCase() === pId.toUpperCase()) ? 'no_disponible' :
        wildcards.some(w => w.toUpperCase() === pId.toUpperCase()) ? 'comodin' : 'disponible'
      );
      if (status !== 'no_disponible') {
        const displayName = getNameFromId(pId);
        if (!seenPlayerIds.has(pId.toUpperCase())) {
          seenPlayerIds.add(pId.toUpperCase());
          const fullP = allPotentialPlayers.find(item => 
            item.id === pId || 
            (item.nombre || item.name || '').toUpperCase().trim() === displayName.toUpperCase().trim()
          );
          const rawPos = fullP?.posicion_especifica || fullP?.demarcacion || fullP?.position || '';
          const posForCampograma = getSessionTacticalPosition(displayName, pId, rawPos);

          list.push({
            id: pId,
            name: displayName,
            nombre: displayName,
            number: fullP?.number || fullP?.dorsal || '',
            posicion_especifica: posForCampograma,
            image: fullP?.image || fullP?.photo || fullP?.foto || '',
            status: status as 'disponible' | 'comodin'
          });
        }
      }
    });
    return list;
  }, [allPlayers, playerStatuses, unavailable, wildcards, allPotentialPlayers]);

  const materialsList = session.materials && session.materials.length > 0 
    ? session.materials.map(m => m.toUpperCase()) 
    : DEFAULT_MATERIALS;

  // Prioritize sessionStaffTasks over staffAproximaciones if they exist
  const displayStaffTasks = React.useMemo(() => {
    if (session.sessionStaffTasks && session.sessionStaffTasks.length > 0) {
      // Filter to staff members assigned who have at least some foco content or are explicitly assigned
      const withContent = session.sessionStaffTasks.filter(
        st => (st.foco1 && st.foco1.trim() !== '') || (st.foco2 && st.foco2.trim() !== '')
      );
      const targetList = withContent.length > 0 ? withContent : session.sessionStaffTasks;
      return targetList.map(st => ({
        coachName: st.staffName,
        taskTitle: '',
        consigna: st.foco1 || '—',
        comoParaQue: st.foco2 || '—',
        isNewFormat: true
      }));
    }

    if (session.staffAproximaciones && session.staffAproximaciones.length > 0) {
      const active = session.staffAproximaciones.filter(
        sa => (sa.consigna && sa.consigna.trim() !== '') || (sa.comoParaQue && sa.comoParaQue.trim() !== '')
      );
      return active.length > 0 ? active : session.staffAproximaciones;
    }

    return [
      { coachName: 'MIKY MAYANS', taskTitle: '', consigna: 'Viajar juntas. Base/10.', comoParaQue: 'IMPORTANTE: Foco en MSB en las consignas' },
      { coachName: 'NICA ORTIZ', taskTitle: '', consigna: 'Definir conductas MSB en inferioridad sin saturar a las jugadoras (alturas, carriles, BLOQUE, PAPA, eliminar alejada)', comoParaQue: '—' },
      { coachName: 'PABLO ROCA', taskTitle: '', consigna: 'Adelantar a porteras para que empujen a sus CT y que CT empujen a MC a campo rival (VIAJAR JUNTAS).', comoParaQue: '—' },
      { coachName: 'MARTA CHAVERO', taskTitle: '', consigna: 'PENDIENTE DE LA FRUTA, BALONES Y MATERIAL', comoParaQue: '—' }
    ];
  }, [session.sessionStaffTasks, session.staffAproximaciones]);

  const aproximaciones = displayStaffTasks;

  const tasks = session.tasks && session.tasks.length > 0 ? session.tasks : [
    {
      id: '1',
      title: 'SRJ EG 3x3+2',
      phase: 'Calentamiento' as const,
      durationMin: 12,
      seriesReps: '3 x 4\'',
      coach: 'MIKY',
      description: '3x3+2 comodines exteriores en laterales para trabajar 3-BASE-3 antes de progresar en el juego. Espacio dividido en 2 alturas con miniporterías.',
      foco: 'MCB' as const,
      tipologia: 'RONDOS' as const
    },
    {
      id: '2',
      title: 'SMJ JUEGO PROGRESIÓN 5X5+6',
      phase: 'Juego de Posición' as const,
      durationMin: 15,
      seriesReps: '3 x 5\'',
      coach: 'JUANMI',
      description: '5x5+6 comodines. Espacio dividido por la mitad. Para meter gol hay que pasar por un comodín de cada lado. Robo en campo contrario + gol vale doble.',
      foco: 'MSB' as const,
      tipologia: 'JUEGO DE POSICIÓN' as const
    },
    {
      id: '3',
      title: 'SGJ EM ATAQUE-DEFENSA',
      phase: 'Parte Principal' as const,
      durationMin: 20,
      seriesReps: '2 x 10\'',
      coach: 'NICA',
      description: '7X7+2 ATAQUE DEFENSA, acción balón en diagonal y profundidad máxima, se permite este ataque y la transición del equipo rival que defiende.',
      foco: 'MIXTO' as const,
      tipologia: 'REDUCIDOS' as const
    },
    {
      id: '4',
      title: 'SGJ EM PARTIDO 8x8',
      phase: 'Partido / Global' as const,
      durationMin: 20,
      seriesReps: 'Partido 8x8',
      coach: 'IAGO',
      description: 'Partido 8x8 libre. Comportamientos de la semana con y sin balón.',
      foco: 'MIXTO' as const,
      tipologia: 'PARTIDO CONDICIONADO' as const
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
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Descargar Ficha en PDF"
            >
              {isExportingPDF ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExportingPDF ? 'Generando PDF...' : 'PDF'}</span>
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
          
          {/* TOP PLAYER MATRIX HEADER (2 Rows of 13 Columns) */}
          <div className="mb-2 border-2 border-black bg-white flex flex-col divide-y-2 divide-black text-[9px] font-black text-center">
            {/* Top Row (Cols 1-13) */}
            <div className="grid grid-cols-13 divide-x divide-black">
              {topRowSlots.map((pId, idx) => {
                if (!pId) {
                  return (
                    <div 
                      key={`empty_top_${idx}`}
                      className="p-1 min-h-[22px] bg-white text-transparent selection:bg-transparent flex items-center justify-center text-[9px]"
                    >
                      &nbsp;
                    </div>
                  );
                }

                const status = playerStatuses?.[pId] || (
                  unavailable.some(u => u.toUpperCase() === pId.toUpperCase()) ? 'no_disponible' :
                  wildcards.some(w => w.toUpperCase() === pId.toUpperCase()) ? 'comodin' : 'disponible'
                );
                
                const displayName = getNameFromId(pId);

                let cellStyle = 'bg-white text-black font-bold';
                if (status === 'no_disponible') {
                  cellStyle = 'bg-red-600 text-white font-black';
                } else if (status === 'comodin') {
                  cellStyle = 'bg-amber-400 text-amber-950 font-black';
                }

                return (
                  <div 
                    key={`${pId}_top_${idx}`}
                    className={`p-1 truncate text-center uppercase min-h-[22px] flex items-center justify-center leading-tight text-[8px] sm:text-[9px] ${cellStyle}`}
                    title={`${displayName} (${status})`}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>

            {/* Bottom Row (Cols 14-26) */}
            <div className="grid grid-cols-13 divide-x divide-black">
              {bottomRowSlots.map((pId, idx) => {
                if (!pId) {
                  return (
                    <div 
                      key={`empty_bot_${idx}`}
                      className="p-1 min-h-[22px] bg-white text-transparent selection:bg-transparent flex items-center justify-center text-[9px]"
                    >
                      &nbsp;
                    </div>
                  );
                }

                const status = playerStatuses?.[pId] || (
                  unavailable.some(u => u.toUpperCase() === pId.toUpperCase()) ? 'no_disponible' :
                  wildcards.some(w => w.toUpperCase() === pId.toUpperCase()) ? 'comodin' : 'disponible'
                );
                
                const displayName = getNameFromId(pId);

                let cellStyle = 'bg-white text-black font-bold';
                if (status === 'no_disponible') {
                  cellStyle = 'bg-red-600 text-white font-black';
                } else if (status === 'comodin') {
                  cellStyle = 'bg-amber-400 text-amber-950 font-black';
                }

                return (
                  <div 
                    key={`${pId}_bot_${idx}`}
                    className={`p-1 truncate text-center uppercase min-h-[22px] flex items-center justify-center leading-tight text-[8px] sm:text-[9px] ${cellStyle}`}
                    title={`${displayName} (${status})`}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAIN GRID CONTAINER */}
          <div className="grid grid-cols-16 gap-1 border-2 border-black bg-black">
            
            {/* LEFT COLUMN: META DATA & MATERIALS (Cols 1-2, narrow sidebar) */}
            <div className="col-span-16 lg:col-span-2 bg-white flex flex-col justify-start border-r-2 border-black divide-y-2 divide-black">
              {/* Club Crest & Title Header */}
              <div className="p-1 text-center bg-slate-900 text-white flex flex-col items-center justify-center">
                <div className="w-7 h-7 mb-0.5 bg-white p-0.5 rounded-full border border-sky-400 flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-sky-900" />
                </div>
                <div className="text-[7.5px] font-black uppercase tracking-wider leading-none">CD ATLETICO BALEARES</div>
                <div className="text-[6.5px] font-bold text-sky-300 mt-0.5 uppercase">FEMENINO</div>
              </div>

              {/* General Session Info Table */}
              <div className="text-[7.5px] divide-y divide-black font-bold">
                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider">FECHA</div>
                <div className="text-center py-0.5 font-black bg-white">{session.date}</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider">SESIÓN</div>
                <div className="text-center py-0.5 font-black bg-white">{session.sessionNumber || '3'}</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider">MICROCICLO</div>
                <div className="text-center py-0.5 font-black bg-white">{session.microcycle || '1'} ({session.dayType || 'MD-3'})</div>

                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider">Nº JUGADORAS</div>
                <div className="text-center py-0.5 font-black bg-white">{session.numPlayers || '14+2'}</div>
              </div>

              {/* NO DISPONIBLES RED SECTION */}
              <div>
                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider border-b border-black">
                  NO DISPONIBLES
                </div>
                <div className="bg-red-600 text-white text-[7.5px] font-black divide-y divide-red-700 text-center">
                  {unavailableList.length > 0 ? (
                    unavailableList.map((name, i) => (
                      <div key={i} className="py-0.5 px-0.5 uppercase tracking-tight truncate">
                        {name}
                      </div>
                    ))
                  ) : (
                    <div className="py-0.5 px-0.5 text-[7px] font-bold text-red-100 italic">
                      Sin bajas
                    </div>
                  )}
                </div>
              </div>

              {/* MATERIAL CHECKLIST TABLE */}
              <div>
                <div className="bg-slate-900 text-white font-black text-center py-0.5 text-[7px] uppercase tracking-wider border-b border-black">
                  MATERIAL
                </div>
                <div className="text-[7px] font-bold divide-y divide-slate-200 bg-white">
                  {materialsList.map((mat, i) => (
                    <div key={i} className="px-1 py-0.5 flex items-center justify-between uppercase">
                      <span className="truncate">{mat}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0 ml-1"></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER MAIN COLUMN: TACTICAL TASKS WITH PITCH DIAGRAMS (Cols 3-12) */}
            <div className="col-span-16 lg:col-span-10 bg-white flex flex-col justify-between border-r-2 border-black divide-y-2 divide-black">
              
              {/* 2 COLUMNS x 2 ROWS TASKS MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x-2 divide-black divide-y-2 lg:divide-y-0 divide-black border-b-2 border-black bg-white">
                {/* Left Column (Calentamiento on top, Tarea 1 on bottom) */}
                <div className="flex flex-col divide-y-2 divide-black">
                  {/* Top-Left: Calentamiento (Task 0) */}
                  {(() => {
                    const task = tasks[0];
                    const idx = 0;
                    const phaseTitle = task?.phase || 'CALENTAMIENTO';
                    return (
                      <div className="flex flex-col justify-between bg-white flex-1 p-1.5 min-h-[145px]">
                        <div className="bg-slate-900 text-white px-2 py-1 rounded-t border border-black flex items-center justify-between text-[8.5px]">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-black uppercase tracking-wider text-sky-300 bg-slate-800 px-1 py-0.5 rounded text-[8px] shrink-0">
                              {phaseTitle}
                            </span>
                            <span className="font-black text-[8.5px] text-white truncate">
                              {task?.codeName || task?.title || 'Calentamiento Específico'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[7.5px] font-bold">
                            <span className="text-amber-300 uppercase font-black">{task?.coach || 'CUERPO TÉCNICO'}</span>
                            <span className="text-slate-900 bg-white px-1 py-0.5 rounded font-black">{task?.seriesReps || `${task?.durationMin || 15}'`}</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-row items-stretch gap-1.5 mt-1 border border-black p-1.5 bg-slate-50 rounded-b">
                          <div className="flex-1 flex flex-col justify-between text-[8px] leading-snug">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-800 leading-tight whitespace-pre-wrap">
                                {task?.description || 'Calentamiento coordinativo y activatorio en espacio delimitado.'}
                              </p>
                              {(task?.fases?.length > 0 || task?.contextos?.length > 0) && (
                                <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1">
                                  {task.fases && task.fases.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Fases:</strong> {task.fases.join(', ')}</p>
                                  )}
                                  {task.contextos && task.contextos.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Contexto:</strong> {task.contextos.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-[140px] sm:w-[155px] h-auto min-h-[95px] bg-slate-900 rounded overflow-hidden flex items-center justify-center relative shrink-0 border border-slate-400">
                            {task?.image ? (
                              <img 
                                src={task.image} 
                                alt={task.title} 
                                className="w-full h-full max-h-[110px] object-contain bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <svg className="w-full h-full min-h-[90px] bg-emerald-800" viewBox="0 0 200 130">
                                <line x1="0" y1="65" x2="200" y2="65" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" />
                                <circle cx="100" cy="65" r="22" stroke="white" strokeWidth="1.5" fill="none" />
                                <circle cx="100" cy="65" r="2" fill="white" />
                                <rect x="0" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="175" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="0" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <rect x="196" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <circle cx="50" cy="40" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="50" cy="90" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="80" cy="65" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="140" cy="40" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="140" cy="90" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="110" cy="65" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bottom-Left: Tarea 1 (Task 1) */}
                  {(() => {
                    const task = tasks[1];
                    const idx = 1;
                    const phaseTitle = task?.phase || 'TAREA 1';
                    return (
                      <div className="flex flex-col justify-between bg-white flex-1 p-1.5 min-h-[145px]">
                        <div className="bg-slate-900 text-white px-2 py-1 rounded-t border border-black flex items-center justify-between text-[8.5px]">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-black uppercase tracking-wider text-sky-300 bg-slate-800 px-1 py-0.5 rounded text-[8px] shrink-0">
                              {phaseTitle}
                            </span>
                            <span className="font-black text-[8.5px] text-white truncate">
                              {task?.codeName || task?.title || 'Posesión y Mantenimiento'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[7.5px] font-bold">
                            <span className="text-amber-300 uppercase font-black">{task?.coach || 'CUERPO TÉCNICO'}</span>
                            <span className="text-slate-900 bg-white px-1 py-0.5 rounded font-black">{task?.seriesReps || `${task?.durationMin || 15}'`}</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-row items-stretch gap-1.5 mt-1 border border-black p-1.5 bg-slate-50 rounded-b">
                          <div className="flex-1 flex flex-col justify-between text-[8px] leading-snug">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-800 leading-tight whitespace-pre-wrap">
                                {task?.description || 'Tarea de progresión y conservación del balón en zona media.'}
                              </p>
                              {(task?.fases?.length > 0 || task?.contextos?.length > 0) && (
                                <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1">
                                  {task.fases && task.fases.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Fases:</strong> {task.fases.join(', ')}</p>
                                  )}
                                  {task.contextos && task.contextos.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Contexto:</strong> {task.contextos.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-[140px] sm:w-[155px] h-auto min-h-[95px] bg-slate-900 rounded overflow-hidden flex items-center justify-center relative shrink-0 border border-slate-400">
                            {task?.image ? (
                              <img 
                                src={task.image} 
                                alt={task.title} 
                                className="w-full h-full max-h-[110px] object-contain bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <svg className="w-full h-full min-h-[90px] bg-emerald-800" viewBox="0 0 200 130">
                                <line x1="0" y1="65" x2="200" y2="65" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" />
                                <circle cx="100" cy="65" r="22" stroke="white" strokeWidth="1.5" fill="none" />
                                <circle cx="100" cy="65" r="2" fill="white" />
                                <rect x="0" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="175" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="0" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <rect x="196" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <circle cx="40" cy="30" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                                <circle cx="60" cy="70" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                                <circle cx="80" cy="100" r="5" fill="#ef4444" stroke="black" strokeWidth="1" />
                                <circle cx="130" cy="30" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="150" cy="70" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="100" cy="20" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="100" cy="110" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Column (Tarea 2 on top, Tarea 3 on bottom) */}
                <div className="flex flex-col divide-y-2 divide-black">
                  {/* Top-Right: Tarea 2 (Task 2) */}
                  {(() => {
                    const task = tasks[2];
                    const idx = 2;
                    const phaseTitle = task?.phase || 'TAREA 2';
                    return (
                      <div className="flex flex-col justify-between bg-white flex-1 p-1.5 min-h-[145px]">
                        <div className="bg-slate-900 text-white px-2 py-1 rounded-t border border-black flex items-center justify-between text-[8.5px]">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-black uppercase tracking-wider text-sky-300 bg-slate-800 px-1 py-0.5 rounded text-[8px] shrink-0">
                              {phaseTitle}
                            </span>
                            <span className="font-black text-[8.5px] text-white truncate">
                              {task?.codeName || task?.title || 'Partido Modificado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[7.5px] font-bold">
                            <span className="text-amber-300 uppercase font-black">{task?.coach || 'CUERPO TÉCNICO'}</span>
                            <span className="text-slate-900 bg-white px-1 py-0.5 rounded font-black">{task?.seriesReps || `${task?.durationMin || 20}'`}</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-row items-stretch gap-1.5 mt-1 border border-black p-1.5 bg-slate-50 rounded-b">
                          <div className="flex-1 flex flex-col justify-between text-[8px] leading-snug">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-800 leading-tight whitespace-pre-wrap">
                                {task?.description || 'Simulación de partido con reglas de condicionamiento táctico.'}
                              </p>
                              {(task?.fases?.length > 0 || task?.contextos?.length > 0) && (
                                <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1">
                                  {task.fases && task.fases.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Fases:</strong> {task.fases.join(', ')}</p>
                                  )}
                                  {task.contextos && task.contextos.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Contexto:</strong> {task.contextos.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-[140px] sm:w-[155px] h-auto min-h-[95px] bg-slate-900 rounded overflow-hidden flex items-center justify-center relative shrink-0 border border-slate-400">
                            {task?.image ? (
                              <img 
                                src={task.image} 
                                alt={task.title} 
                                className="w-full h-full max-h-[110px] object-contain bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <svg className="w-full h-full min-h-[90px] bg-emerald-800" viewBox="0 0 200 130">
                                <line x1="0" y1="65" x2="200" y2="65" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" />
                                <circle cx="100" cy="65" r="22" stroke="white" strokeWidth="1.5" fill="none" />
                                <circle cx="100" cy="65" r="2" fill="white" />
                                <rect x="0" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="175" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="0" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <rect x="196" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <circle cx="40" cy="45" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="70" cy="85" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="120" cy="45" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="150" cy="85" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="100" cy="65" r="4" fill="#ffffff" stroke="black" strokeWidth="1" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bottom-Right: Tarea 3 (Task 3) */}
                  {(() => {
                    const task = tasks[3];
                    const idx = 3;
                    const phaseTitle = task?.phase || 'TAREA 3';
                    return (
                      <div className="flex flex-col justify-between bg-white flex-1 p-1.5 min-h-[145px]">
                        <div className="bg-slate-900 text-white px-2 py-1 rounded-t border border-black flex items-center justify-between text-[8.5px]">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-black uppercase tracking-wider text-sky-300 bg-slate-800 px-1 py-0.5 rounded text-[8px] shrink-0">
                              {phaseTitle}
                            </span>
                            <span className="font-black text-[8.5px] text-white truncate">
                              {task?.codeName || task?.title || 'Acciones a Balón Parado / Vuelta a la Calma'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[7.5px] font-bold">
                            <span className="text-amber-300 uppercase font-black">{task?.coach || 'CUERPO TÉCNICO'}</span>
                            <span className="text-slate-900 bg-white px-1 py-0.5 rounded font-black">{task?.seriesReps || `${task?.durationMin || 15}'`}</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-row items-stretch gap-1.5 mt-1 border border-black p-1.5 bg-slate-50 rounded-b">
                          <div className="flex-1 flex flex-col justify-between text-[8px] leading-snug">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-800 leading-tight whitespace-pre-wrap">
                                {task?.description || 'EstrategiaABP y estiramientos compensatorios finales.'}
                              </p>
                              {(task?.fases?.length > 0 || task?.contextos?.length > 0) && (
                                <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1">
                                  {task.fases && task.fases.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Fases:</strong> {task.fases.join(', ')}</p>
                                  )}
                                  {task.contextos && task.contextos.length > 0 && (
                                    <p className="text-[7px] leading-tight"><strong className="text-slate-900 uppercase">Contexto:</strong> {task.contextos.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-[140px] sm:w-[155px] h-auto min-h-[95px] bg-slate-900 rounded overflow-hidden flex items-center justify-center relative shrink-0 border border-slate-400">
                            {task?.image ? (
                              <img 
                                src={task.image} 
                                alt={task.title} 
                                className="w-full h-full max-h-[110px] object-contain bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <svg className="w-full h-full min-h-[90px] bg-emerald-800" viewBox="0 0 200 130">
                                <line x1="0" y1="65" x2="200" y2="65" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" />
                                <circle cx="100" cy="65" r="22" stroke="white" strokeWidth="1.5" fill="none" />
                                <circle cx="100" cy="65" r="2" fill="white" />
                                <rect x="0" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="175" y="35" width="25" height="60" stroke="white" strokeWidth="1.5" fill="none" />
                                <rect x="0" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <rect x="196" y="50" width="4" height="30" fill="white" stroke="black" strokeWidth="0.5" />
                                <circle cx="40" cy="45" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="70" cy="85" r="5" fill="#facc15" stroke="black" strokeWidth="1" />
                                <circle cx="120" cy="45" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="150" cy="85" r="5" fill="#38bdf8" stroke="black" strokeWidth="1" />
                                <circle cx="100" cy="65" r="4" fill="#ffffff" stroke="black" strokeWidth="1" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
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

              {/* BOTTOM 1-4-2-3-1 TACTICAL CAMPOGRAMA DISPLAY (FROM PLANTILLAS / TEAM ROSTER) */}
              <div className="p-2 bg-white">
                <TacticalField players={activePlayerObjects} hideHeader={true} showPlayerNames={true} hidePhotos={true} orientation="horizontal" hidePositionLabels={true} />
              </div>

            </div>

            {/* RIGHT COLUMN: APROXIMACIONES & STAFF OBJECTIVES (Cols 13-16) */}
            <div className="col-span-16 lg:col-span-4 bg-white flex flex-col justify-between divide-y-2 divide-black">
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
              <div className="divide-y-2 divide-black text-[8.5px] font-bold flex-1 bg-white flex flex-col justify-between">
                {aproximaciones.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 divide-x divide-black flex-1 min-h-[50px] items-stretch">
                    {/* Staff Coach Name */}
                    <div className="col-span-3 p-1 font-black text-center text-red-700 bg-slate-50 flex items-center justify-center uppercase border-r border-black">
                      {item.coachName}
                    </div>

                    {/* Consigna / Objective Details */}
                    <div className="col-span-5 p-1.5 leading-tight flex items-center justify-center text-slate-800">
                      <p className="font-semibold text-slate-700 leading-tight text-center w-full">
                        {item.consigna || '—'}
                      </p>
                    </div>

                    {/* ¿Cómo? ¿Por/Para Qué? */}
                    <div className="col-span-4 p-1.5 leading-tight flex items-center justify-center text-slate-900 bg-slate-50 font-bold">
                      <p className="text-center w-full">{item.comoParaQue || '—'}</p>
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
