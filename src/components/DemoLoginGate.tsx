import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * DEMO-only UI gate. This is NOT an authorization boundary: private data must
 * be protected independently by server-side authentication and RLS policies.
 * Public sign-up must be disabled in the auth provider configuration.
 */
export function DemoLoginGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Não foi possível verificar o acesso.");
      setSession(data.session);
      setChecking(false);
    }).catch(() => {
      if (active) { setError("Serviço de login indisponível."); setChecking(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setChecking(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError("Não foi possível entrar. Confira suas credenciais e a autorização da conta.");
    } catch {
      setError("Serviço de login indisponível.");
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    setError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/" },
      });
      if (error) setError("Login com Google indisponível. Verifique a configuração do provedor.");
    } catch {
      setError("Não foi possível iniciar o login com Google.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="min-h-screen flex items-center justify-center p-6" role="status">Verificando acesso…</main>;
  if (session) return <>{children}</>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 text-card-foreground">
        <h1 className="text-2xl font-semibold">Signal Symphony Desk</h1>
        <p className="text-sm text-muted-foreground">Acesso privado · ambiente de simulação DEMO</p>
        <form onSubmit={signIn} className="space-y-3">
          <label className="block text-sm">E-mail
            <input className="mt-1 w-full rounded border bg-background p-2" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">Senha
            <input className="mt-1 w-full rounded border bg-background p-2" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="w-full rounded bg-primary p-2 text-primary-foreground disabled:opacity-50" disabled={busy} type="submit">Entrar com e-mail</button>
        </form>
        <button className="w-full rounded border p-2 disabled:opacity-50" disabled={busy} onClick={signInGoogle} type="button">Entrar com Google</button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Cadastro público não disponível nesta tela. A restrição real de contas deve ser aplicada no servidor e no provedor de autenticação.</p>
      </section>
    </main>
  );
}
