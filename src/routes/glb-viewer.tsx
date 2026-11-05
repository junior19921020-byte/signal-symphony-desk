import { createFileRoute } from "@tanstack/react-router";
import { createElement, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/glb-viewer")({
  component: GlbViewer,
});

function GlbViewer() {
  const viewerRef = useRef<HTMLElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [message, setMessage] = useState("Procurando o modelo mais recente do escritório...");
  const [src, setSrc] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<"overview" | "top" | "front">("overview");

  // Blender exports Z-up coordinates to glTF Y-up: (x, y, z) -> (x, z, -y).
  // These are fixed architectural sector centers, not agent positions.
  const sectors = [
    { id: "reception", label: "Recepção", target: "8.6m 0.8m 4.4m" },
    { id: "trading", label: "Mesa de operações", target: "3m 0.8m 2.8m" },
    { id: "risk", label: "Gestão de riscos", target: "-7.2m 0.8m 4.5m" },
    { id: "research", label: "Pesquisa", target: "-7.2m 0.8m -4.9m" },
    { id: "meeting", label: "Reuniões", target: "-7.3m 0.8m 4.5m" },
    { id: "executive", label: "Diretoria", target: "3.5m 0.8m -6.2m" },
  ] as const;
  const [selectedSector, setSelectedSector] = useState<string>("all");

  function chooseSector(id: string, target: string) {
    setSelectedSector(id);
    const viewer = viewerRef.current as (HTMLElement & {
      cameraTarget?: string;
      cameraOrbit?: string;
      jumpCameraToGoal?: () => void;
    }) | null;
    if (!viewer) return;
    viewer.cameraTarget = target;
    viewer.cameraOrbit = id === "all" ? "35deg 55deg auto" : "35deg 50deg 8m";
    viewer.jumpCameraToGoal?.();
  }

  function chooseCamera(view: "overview" | "top" | "front") {
    setCameraView(view);
    const viewer = viewerRef.current as (HTMLElement & { cameraOrbit?: string; jumpCameraToGoal?: () => void }) | null;
    if (!viewer) return;
    viewer.cameraOrbit = view === "top" ? "0deg 5deg auto" : view === "front" ? "0deg 75deg auto" : "35deg 55deg auto";
    viewer.jumpCameraToGoal?.();
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch("/models/signal-office.glb", { method: "HEAD", cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok || !response.headers.get("content-type")?.includes("model") && !response.headers.get("content-type")?.includes("octet-stream")) {
          setMessage("Modelo automático indisponível. Selecione um arquivo GLB salvo no celular.");
          return;
        }
        setSrc("/models/signal-office.glb?v=" + Date.now());
        setMessage("Modelo do escritório carregado automaticamente. Arraste para girar e use dois dedos para aproximar.");
      })
      .catch(() => {
        if (!cancelled) setMessage("Modelo automático indisponível. Você ainda pode selecionar um arquivo GLB.");
      });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";
    script.onerror = () => setMessage("Não foi possível carregar o visualizador. Verifique sua conexão.");
    document.head.appendChild(script);
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      script.remove();
    };
  }, []);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  function selectFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setMessage("Selecione um arquivo com extensão .glb.");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSrc(url);
    setMessage("Modelo carregado. Arraste para girar e use dois dedos para aproximar.");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#071322", color: "#e1f5ff", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/" style={{ color: "#8bdcff" }}>← Signal Symphony Desk</a>
        <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.3rem)", color: "#7edaff", marginTop: 22 }}>Escritório 3D — Visualizador GLB</h1>
        <p>O escritório mais recente abre automaticamente quando publicado. Você também pode abrir um GLB salvo no celular; o arquivo não é enviado ao servidor.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
          <label style={{ background: "#205476", border: "1px solid #8bdcff", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
            Selecionar arquivo GLB
            <input type="file" accept=".glb,model/gltf-binary" onChange={(e) => selectFile(e.target.files?.[0])} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
          </label>
          {(["overview", "top", "front"] as const).map((view) => (
            <button key={view} type="button" onClick={() => chooseCamera(view)} aria-pressed={cameraView === view} style={{ background: cameraView === view ? "#205476" : "#19314a", color: "#fff", border: "1px solid #72869d", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
              {view === "overview" ? "Visão geral" : view === "top" ? "Vista superior" : "Vista frontal"}
            </button>
          ))}
        </div>
        <section aria-label="Navegar pelos setores do escritório" style={{ margin: "16px 0" }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Explorar setores</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={!src} aria-pressed={selectedSector === "all"} onClick={() => chooseSector("all", "auto auto auto")} style={{ background: selectedSector === "all" ? "#205476" : "#19314a", color: "#fff", border: "1px solid #72869d", borderRadius: 10, padding: "10px 14px" }}>Escritório inteiro</button>
            {sectors.map((sector) => (
              <button key={sector.id} type="button" disabled={!src} aria-pressed={selectedSector === sector.id} onClick={() => chooseSector(sector.id, sector.target)} style={{ background: selectedSector === sector.id ? "#205476" : "#19314a", color: "#fff", border: "1px solid #72869d", borderRadius: 10, padding: "10px 14px" }}>{sector.label}</button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "#b9eaff" }}>Selecione um setor para centralizar a câmera. Arraste para girar e use a pinça para ajustar o zoom.</p>
        </section>
        <p role="status" style={{ color: "#b9eaff" }}>{message}</p>
        {src ? (
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #60788a", background: "linear-gradient(#9cb4c2, #d5e0e5)", height: "min(70vh, 720px)", minHeight: 400 }}>
            {/** model-viewer is registered by the client-side dynamic import. */}
            {createElement("model-viewer", { ref: viewerRef, src, alt: "Modelo tridimensional do escritório Signal Symphony Desk", "camera-controls": true, "auto-rotate": false, "camera-orbit": cameraView === "top" ? "0deg 5deg auto" : cameraView === "front" ? "0deg 75deg auto" : "35deg 55deg auto", "shadow-intensity": "1", exposure: "1", style: { width: "100%", height: "100%" } })}
          </div>
        ) : (
          <div style={{ height: 360, borderRadius: 18, border: "1px dashed #60788a", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>O modelo publicado ainda não está disponível. Selecione um GLB para visualizar o escritório.</div>
        )}
      </div>
    </main>
  );
}
