import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AccountProfile() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (mounted) { setEmail(error ? null : (data.user?.email ?? null)); }
    }).catch(() => { if (mounted) setError("Não foi possível verificar a conta."); });
    return () => { mounted = false; };
  }, []);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.replace("/");
    } catch {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
      setBusy(false);
    }
  }
  return <section className="mt-4 space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5" aria-label="Minha conta">
    <h2 className="text-xl font-bold text-[#d4af37]">Minha Conta</h2>
    <p className="text-sm text-slate-300">Acesso privado ao ambiente de simulação DEMO.</p>
    <div className="rounded-lg bg-slate-800 p-4">
      <p className="text-xs text-slate-400">E-mail da conta conectada</p>
      <p className="mt-1 break-all font-medium">{email ?? "Não disponível"}</p>
    </div>
    <p className="text-xs text-amber-300">Dados de operações e auditoria podem estar armazenados somente neste navegador. Sair não apaga automaticamente esses registros locais.</p>
    <button type="button" onClick={logout} disabled={busy} className="min-h-11 w-full rounded-lg border border-red-400 bg-red-950/40 p-3 font-semibold text-red-100 disabled:opacity-50">{busy ? "Saindo…" : "Sair da conta"}</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
