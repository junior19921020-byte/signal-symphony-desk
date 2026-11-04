import { createFileRoute } from "@tanstack/react-router";
import { createElement, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/glb-viewer")({
  component: GlbViewer,
});

function GlbViewer() {
  const viewerRef = useRef<HTMLElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [message, setMessage] = useState("Selecione o arquivo signal-office.glb que você já baixou.");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";
    script.onerror = () => setMessage("Não foi possível carregar o visualizador. Verifique sua conexão.");
    document.head.appendChild(script);
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

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
        <p>Abra o modelo que já está salvo no seu celular. Nenhum arquivo é enviado ao servidor.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
          <label style={{ background: "#205476", border: "1px solid #8bdcff", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
            Selecionar arquivo GLB
            <input type="file" accept=".glb,model/gltf-binary" onChange={(e) => selectFile(e.target.files?.[0])} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
          </label>
          <button type="button" onClick={() => (viewerRef.current as (HTMLElement & { resetTurntableRotation?: () => void; jumpCameraToGoal?: () => void }) | null)?.resetTurntableRotation?.()} style={{ background: "#19314a", color: "#fff", border: "1px solid #72869d", borderRadius: 12, padding: "14px 18px" }}>Restaurar câmera</button>
        </div>
        <p role="status" style={{ color: "#b9eaff" }}>{message}</p>
        {src ? (
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #60788a", background: "linear-gradient(#9cb4c2, #d5e0e5)", height: "min(70vh, 720px)", minHeight: 400 }}>
            {/** model-viewer is registered by the client-side dynamic import. */}
            {createElement("model-viewer", { ref: viewerRef, src, alt: "Modelo tridimensional do escritório Signal Symphony Desk", "camera-controls": true, "auto-rotate": true, "shadow-intensity": "1", exposure: "1", style: { width: "100%", height: "100%" } })}
          </div>
        ) : (
          <div style={{ height: 360, borderRadius: 18, border: "1px dashed #60788a", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>Selecione o arquivo GLB para visualizar o escritório.</div>
        )}
      </div>
    </main>
  );
}
