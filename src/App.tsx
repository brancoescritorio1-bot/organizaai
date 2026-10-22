import React, { useState, useEffect } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Login } from './components/Login';
import MainApp from './MainApp';
import { Download } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    async function initializeAuth() {
      try {
        // 1. Fetch server-provided config or fallback
        let url = "https://gymxdeijrgorugqqiteh.supabase.co";
        let key = "sb_publishable_" + "KPeLuuPs7mOf395Jv0YmeQ_mueP5jXE";

        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const config = await res.json();
            if (config.supabaseUrl && !config.supabaseUrl.includes('placeholder')) {
              url = config.supabaseUrl;
            }
            if (config.supabaseKey && !config.supabaseKey.includes('placeholder')) {
              key = config.supabaseKey;
            }
          }
        } catch (cfgErr) {
          console.warn('Could not fetch /api/config, using default credentials:', cfgErr);
        }

        // 2. Create Supabase client with persistent session enabled
        const client = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        if (!isMounted) return;
        setSupabaseClient(client);

        // 3. Check for existing session in localStorage / cookies
        const { data, error } = await client.auth.getSession();
        
        if (error) {
          console.error('Session retrieval error:', error.message);
          const errorMsg = (error.message || '').toLowerCase();
          if (errorMsg.includes('refresh token') || errorMsg.includes('refresh_token')) {
            // Invalid refresh token: cleanly reset Supabase auth keys
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('sb-') || k.startsWith('supabase'))) {
                localStorage.removeItem(k);
              }
            }
          }
          if (isMounted) setSession(null);
        } else if (data?.session) {
          if (isMounted) setSession(data.session);
        } else {
          if (isMounted) setSession(null);
        }

        // 4. Listen for auth changes (login, logout, token refresh)
        const { data: subData } = client.auth.onAuthStateChange((event, newSession) => {
          if (!isMounted) return;
          console.log('[Auth] State changed:', event);

          if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
            setSession(null);
          } else if (newSession) {
            setSession(newSession);
          }
        });

        authSubscription = subData.subscription;
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (isMounted) setSession(null);
      } finally {
        // Crucial: Only stop loading after session has been verified, avoiding any flash of Login!
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleLogout = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut().catch(() => {});
      setSession(null);
    }
  };

  // While checking session on launch, show elegant branded loading screen (never flash Login screen!)
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-gray-800 p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-200 mb-4 animate-pulse font-black text-xl">
          OA
        </div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">OrganizaAI</h1>
        <p className="text-xs text-gray-400 font-medium mt-1">Restaurando sua sessão...</p>
        <div className="mt-5 w-40 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>
    );
  }

  // Not logged in: show Login
  if (!session && supabaseClient) {
    return (
      <Login 
        supabaseClient={supabaseClient}
        onLoginSuccess={() => {}} 
      />
    );
  }

  // Logged in: render MainApp
  return (
    <>
      <MainApp onLogout={handleLogout} session={session} supabaseClient={supabaseClient} />
      {deferredPrompt && (
        <button 
          onClick={handleInstall}
          className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition z-50"
          title="Instalar App"
        >
          <Download size={20} />
          Instalar
        </button>
      )}
    </>
  );
}
