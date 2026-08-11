import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Loader2, Edit2, Plus, X, Upload, Trash2 } from 'lucide-react';
import { Team } from '../types';
import { supabase } from '../lib/supabase';
import { ImageCropper } from './ImageCropper';
import { uploadImage } from '../lib/upload';

const REAL_FEMENINO_A_STAFF = {
  headCoach: { name: 'Miky Mayans' },
  secondCoach: { name: 'Juanmi Lladó' },
  physicalTrainer: { name: 'Iago Alvarez' },
  goalkeeperCoach: { name: 'Pablo Roca' },
  analyst: { name: 'Nica Ortiz' },
  delegate: { name: 'Marta Chavero' },
  physio: { name: 'Alberto Marín' }
};

const INITIAL_TEAMS: Team[] = [];

interface TeamsViewProps {
  season?: string;
  teams?: Team[];
  onSelectTeam: (team: Team) => void;
  onTeamsChange?: (teams: Team[]) => void;
}

export default function TeamsView({ season, teams: propTeams = INITIAL_TEAMS, onSelectTeam, onTeamsChange }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>(propTeams);

  useEffect(() => {
    setTeams(propTeams);
  }, [propTeams, season]);

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      const updated = teams.filter(t => t.id !== teamId);
      setTeams(updated);
      onTeamsChange?.(updated);
    }
  };
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [cropperData, setCropperData] = useState<{ image: string, field: string, roleKey?: string } | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    category: '', 
    coach: '', 
    technicalStaff: '',
    staff: {
      headCoach: { name: '', image: '' },
      secondCoach: { name: '', image: '' },
      physicalTrainer: { name: '', image: '' },
      goalkeeperCoach: { name: '', image: '' },
      analyst: { name: '', image: '' },
      delegate: { name: '', image: '' },
      physio: { name: '', image: '' },
    }
  });

  useEffect(() => {
    async function fetchTeamsAndCounts() {
      let baseTeams = propTeams;

      if (supabase) {
        try {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .order('name', { ascending: true });

          if (!teamsError && teamsData) {
            if (teamsData.length > 0) {
              baseTeams = teamsData.map((t: any) => ({
                ...t,
                technicalStaff: t.technical_staff || t.technicalstaff || t.technicalStaff
              }));
            }
          }
        } catch (err: any) {
          console.log('Error cargando equipos de Supabase');
        }
      }

      const seasonStr = season || '2026/2027';

      const enrichedTeams = await Promise.all(
        baseTeams.map(async (team) => {
          let sbCount: number | null = null;
          if (supabase) {
            try {
              const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', team.id);
              sbCount = count;
            } catch (e) {}
          }

          const finalCount = sbCount || 0;

          return {
            ...team,
            playerCount: finalCount
          };
        })
      );

      setTeams(enrichedTeams);
    }

    fetchTeamsAndCounts();
  }, [propTeams, season]);

  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({ 
        name: team.name, 
        category: team.category,
        coach: team.coach || '',
        technicalStaff: team.technicalStaff || '',
        staff: (team.staff as any) || {
          headCoach: { name: team.coach || '', image: '' },
          secondCoach: { name: '', image: '' },
          physicalTrainer: { name: '', image: '' },
          goalkeeperCoach: { name: '', image: '' },
          analyst: { name: '', image: '' },
          delegate: { name: '', image: '' },
          physio: { name: '', image: '' },
        }
      });
    } else {
      setEditingTeam(null);
      setFormData({ 
        name: '', 
        category: '', 
        coach: '', 
        technicalStaff: '',
        staff: {
          headCoach: { name: '', image: '' },
          secondCoach: { name: '', image: '' },
          physicalTrainer: { name: '', image: '' },
          goalkeeperCoach: { name: '', image: '' },
          analyst: { name: '', image: '' },
          delegate: { name: '', image: '' },
          physio: { name: '', image: '' },
        }
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload staff images to Storage
    const updatedStaff = { ...formData.staff };
    const staffKeys = Object.keys(updatedStaff) as Array<keyof typeof updatedStaff>;
    
    for (const key of staffKeys) {
      if (updatedStaff[key]?.image && updatedStaff[key]?.image?.startsWith('data:')) {
        const url = await uploadImage(updatedStaff[key]!.image!, 'FOTOS CT', String(key));
        if (url) updatedStaff[key]!.image = url;
      }
    }

    const teamData: Team = {
      id: editingTeam?.id || `TEAM_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      ...formData,
      staff: updatedStaff
    };

    let updatedTeams: Team[];
    if (editingTeam) {
      updatedTeams = teams.map(t => t.id === editingTeam.id ? teamData : t);
    } else {
      updatedTeams = [...teams, teamData];
    }
    setTeams(updatedTeams);
    onTeamsChange?.(updatedTeams);

    const teamToSave = {
      id: teamData.id,
      name: teamData.name,
      category: teamData.category,
      coach: teamData.coach,
      technical_staff: teamData.technicalStaff,
      staff: teamData.staff
    };

    if (supabase) {
      try {
        const { error } = editingTeam 
          ? await supabase.from('teams').upsert([teamToSave])
          : await supabase.from('teams').insert([teamToSave]);

        if (error) {
          console.error('Supabase Error:', error.message, error.details);
        } else {
          console.log('Sincronizado con éxito');
        }
      } catch (err) {
        console.error('Error de red/conexión con Supabase:', err);
      }
    }

    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sky-500" />
        <p className="text-sm font-medium">Sincronizando con Supabase ATBFEM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team, index) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectTeam(team)}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-sky-300 transition-all group flex flex-col cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-slate-900 tracking-tight">{team.name}</h3>
            <div className="flex gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(team);
                }}
                className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                title="Editar plantilla"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTeam(team.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Eliminar plantilla"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoría</p>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                {team.category}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {team.staff?.headCoach?.image ? (
                <div className="w-10 h-10 rounded-full border border-slate-100 overflow-hidden bg-white shrink-0 shadow-sm">
                  <img 
                    src={team.staff.headCoach.image} 
                    alt={team.coach} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-slate-300" />
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Entrenador/a</p>
                <p className="text-xs font-bold text-slate-700">
                  {team.coach || 'Por asignar'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jugadoras</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, team.playerCount || 0))].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                      <Users className="w-3 h-3 text-slate-400" />
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {team.playerCount || 0} registradas
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onSelectTeam(team)}
            className="mt-4 w-full py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-sky-50 hover:text-sky-600 transition-colors uppercase tracking-widest"
          >
            VER PLANTILLA
          </button>
        </motion.div>
      ))}

      {/* Botón Agregar Plantilla */}
      <button 
        onClick={() => handleOpenModal()}
        className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 gap-2 hover:border-sky-200 hover:text-sky-400 cursor-pointer transition-all bg-slate-50/50 min-h-[180px]"
      >
        <Plus className="w-8 h-8" />
        <span className="text-xs font-bold uppercase tracking-widest">Agregar Plantilla</span>
      </button>
    </div>

    {/* Modal de Gestión de Equipo */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingTeam ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-widest border-b border-sky-50 pb-1">Información General</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre de la Plantilla</label>
                    <input 
                      required autoFocus
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="Ej. FEMENINO JUVENIL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Categoría</label>
                    <input 
                      required
                      type="text" 
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      placeholder="Ej. Cadete"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-widest border-b border-sky-50 pb-1">Cuerpo Técnico</h4>
                  
                  {/* Head Coach */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Entrenador/a Principal</label>
                      <input 
                        type="text" 
                        value={formData.staff.headCoach?.name || ''}
                        onChange={e => {
                          const name = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            coach: name,
                            staff: { ...prev.staff, headCoach: { ...prev.staff.headCoach!, name } } 
                          }));
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 text-[10px]">Imagen Entrenador/a</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={formData.staff.headCoach?.image || ''}
                          onChange={e => setFormData(prev => ({ 
                            ...prev, 
                            staff: { ...prev.staff, headCoach: { ...prev.staff.headCoach!, image: e.target.value } } 
                          }))}
                          className="flex-1 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                          placeholder="URL o Base64..."
                        />
                        <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-1 transition-colors">
                          <Upload className="w-3 h-3" />
                          SUBIR
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCropperData({ 
                                    image: reader.result as string, 
                                    field: 'staff', 
                                    roleKey: 'headCoach' 
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Other Staff Members */}
                  {[
                    { key: 'secondCoach', label: '2º Entrenador/a' },
                    { key: 'physicalTrainer', label: 'Preparador/a Físico' },
                    { key: 'goalkeeperCoach', label: 'Entr. Porteras' },
                    { key: 'analyst', label: 'Analista' },
                    { key: 'delegate', label: 'Delegada/o' },
                    { key: 'physio', label: 'Fisioterapeuta' }
                  ].map((role) => (
                    <div key={role.key} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">{role.label}</label>
                      <div className="grid grid-cols-1 gap-2">
                        <input 
                          type="text" 
                          value={(formData.staff as any)[role.key]?.name || ''}
                          onChange={e => setFormData(prev => ({ 
                            ...prev, 
                            staff: { ...prev.staff, [role.key]: { ...(prev.staff as any)[role.key], name: e.target.value } } 
                          }))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                          placeholder="Nombre"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={(formData.staff as any)[role.key]?.image || ''}
                            onChange={e => setFormData(prev => ({ 
                              ...prev, 
                              staff: { ...prev.staff, [role.key]: { ...(prev.staff as any)[role.key], image: e.target.value } } 
                            }))}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                            placeholder="URL o Base64..."
                          />
                          <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-1 transition-colors">
                            <Upload className="w-3 h-3" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setCropperData({ 
                                      image: reader.result as string, 
                                      field: 'staff', 
                                      roleKey: role.key 
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-100 sticky bottom-0 z-10"
                >
                  {editingTeam ? 'GUARDAR CAMBIOS' : 'CREAR PLANTILLA'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropperData && (
          <ImageCropper 
            image={cropperData.image}
            onCancel={() => setCropperData(null)}
            onCropComplete={(croppedImage) => {
              if (cropperData.field === 'staff') {
                setFormData(prev => ({ 
                  ...prev, 
                  staff: { 
                    ...prev.staff, 
                    [cropperData.roleKey!]: { 
                      ...(prev.staff as any)[cropperData.roleKey!], 
                      image: croppedImage 
                    } 
                  } 
                }));
              }
              setCropperData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
