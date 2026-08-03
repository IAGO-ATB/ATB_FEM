import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, LogIn, Lock, Clock, AlertCircle, Mail, UserPlus } from 'lucide-react';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authState, setAuthState] = useState<'idle' | 'checking'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase no está configurado. Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Configuración.');
      return;
    }

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // App.tsx handles the session state
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAuthState('idle');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }
    setError(null);
    setAuthState('checking');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthState('idle');
      let msg = error.message;
      if (msg === 'Invalid login credentials') {
        msg = 'Correo o contraseña incorrectos. Verifica tus credenciales.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Debes confirmar tu correo electrónico antes de iniciar sesión.';
      }
      setError(msg || 'Ocurrió un error al intentar iniciar sesión.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }
    setError(null);
    setAuthState('checking');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      setError('Registro exitoso. Revisa tu correo para confirmar tu cuenta si es necesario.');
      setAuthState('idle');
    } catch (error: any) {
      console.error('Registration error:', error);
      setAuthState('idle');
      setError(error.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg rotate-12">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">
              Club Femenino Hub
            </h1>
            
            <AnimatePresence mode="wait">
              {authState === 'idle' ? (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                  <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="email"
                          required
                          placeholder="Correo electrónico"
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-sky-500 outline-none transition-all"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="password"
                          required
                          placeholder="Contraseña"
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-sky-500 outline-none transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!supabase}
                      className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-sm transition-all shadow-lg shadow-sky-500/20"
                    >
                      {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      {mode === 'login' ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                    </button>

                    <button 
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                      className="text-slate-400 text-xs font-bold hover:text-sky-400 transition-colors"
                    >
                      {mode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sky-400 text-sm font-bold animate-pulse">
                  Verificando sesión...
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className="w-full p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] font-bold text-center">
              {error}
            </div>
          )}

          <p className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Autenticación gestionada con Supabase
          </p>
        </div>
      </motion.div>
    </div>
  );
};


