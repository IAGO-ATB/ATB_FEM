import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, User, Tag, Shield, Pin, ThumbsUp } from 'lucide-react';
import { Team } from '../types';

interface ForumViewProps {
  season: string;
  selectedTeam: Team | null;
}

export default function ForumView({ season, selectedTeam }: ForumViewProps) {
  const currentTeamName = selectedTeam ? selectedTeam.name : 'Todas las Plantillas';

  const [posts, setPosts] = useState([
    {
      id: '1',
      author: 'Laura Ramos (Coach Directora)',
      role: 'Cuerpo Técnico',
      title: 'Plan táctico para la salida de balón ante presión alta',
      content: 'Hola equipo. Para el próximo encuentro del fin de semana, analizaremos los movimientos de apoyo de las mediocentros y la amplitud de las laterales.',
      date: 'Hoy, 10:30',
      team: 'ATB FEMENINO A',
      pinned: true,
      likes: 12,
      commentsCount: 4
    },
    {
      id: '2',
      author: 'Pablo Roca',
      role: 'Entrenador de Porteras',
      title: 'Sesión específica de blocaje y juego con los pies',
      content: 'Recordatorio para las porteras de la plantilla: el jueves a las 17:00 hs realizaremos la sesión en vídeo previa al entreno en césped.',
      date: 'Ayer, 18:45',
      team: 'ATB FEMENINO A',
      pinned: false,
      likes: 7,
      commentsCount: 2
    },
    {
      id: '3',
      author: 'Juanmi Lladó',
      role: '2º Entrenador',
      title: 'Feedback del partido de la filial',
      content: 'Excelente despliegue físico y disciplina táctica de las jugadoras del B. Mantenemos el foco en el trabajo semanal.',
      date: '28 JUL 2026',
      team: 'ATB FEMENINO B',
      pinned: false,
      likes: 9,
      commentsCount: 5
    }
  ]);

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');

  const filteredPosts = posts.filter(p => !selectedTeam || p.team === selectedTeam.name);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent) return;

    const created = {
      id: String(Date.now()),
      author: 'Laura Ramos (Coach Directora)',
      role: 'Cuerpo Técnico',
      title: newPostTitle,
      content: newPostContent,
      date: 'Hace un momento',
      team: selectedTeam ? selectedTeam.name : 'ATB FEMENINO A',
      pinned: false,
      likes: 0,
      commentsCount: 0
    };

    setPosts([created, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
  };

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
          <h3 className="text-xl font-bold text-slate-900 mt-1">Foro de Mentoría & Comunicación Táctica</h3>
        </div>
      </div>

      {/* New Post Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-500" /> Publicar Notificación o Nota de Trabajo
        </h4>

        <form onSubmit={handleCreatePost} className="space-y-3">
          <input
            type="text"
            placeholder="Título del mensaje..."
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
          />
          <textarea
            rows={3}
            placeholder={`Escribe una instrucción táctica o nota para la plantilla (${currentTeamName})...`}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-sky-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-sky-600 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> Publicar en el Foro
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-sky-400 border border-sky-400/30 flex items-center justify-center font-bold text-xs">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{post.author}</p>
                      <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.2 rounded uppercase">
                        {post.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{post.date} · <span className="text-slate-600 font-semibold">{post.team}</span></p>
                  </div>
                </div>

                {post.pinned && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Pin className="w-3 h-3" /> Fijado
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{post.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{post.content}</p>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
                <button className="flex items-center gap-1.5 hover:text-sky-600 transition-colors">
                  <ThumbsUp className="w-4 h-4" /> <span>{post.likes} Me gusta</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-sky-600 transition-colors">
                  <MessageSquare className="w-4 h-4" /> <span>{post.commentsCount} Comentarios</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No hay publicaciones en este foro</p>
            <p className="text-xs text-slate-400">Añade la primera nota táctica para la temporada {season}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
