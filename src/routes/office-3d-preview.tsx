import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { DemoLoginGate } from "@/components/DemoLoginGate";

/**
 * Independent, interactive 3D architectural study.
 * CSS 3D primitives are real perspective-transformed geometry, not a flat render.
 * No finance, authentication, existing office, or agent logic is changed.
 */
const sectors = [
  { name: "Diretoria", x: -310, z: -175, w: 220, d: 150, desks: [[-355,-190]], glass: true },
  { name: "Pesquisa", x: -295, z: 90, w: 250, d: 245, desks: [[-355,35],[-250,35],[-355,135],[-250,135]], glass: true },
  { name: "Trading", x: 245, z: -100, w: 260, d: 270, desks: [[175,-175],[290,-175],[175,-75],[290,-75]], glass: false },
  { name: "Gestão de Risco", x: 240, z: 195, w: 250, d: 145, desks: [[175,180],[290,180]], glass: true },
  { name: "Recepção", x: -265, z: 275, w: 270, d: 95, desks: [], glass: false },
] as const;

const place = (x: number, y: number, z: number): CSSProperties => ({
  position: "absolute", left: "50%", top: "50%",
  transform: `translate3d(${x}px, ${z}px, ${y}px)`,
  transformStyle: "preserve-3d",
});
function Block({ x, z, w, d, h, color, topColor, label }: {
  x: number; z: number; w: number; d: number; h: number;
  color: string; topColor?: string; label?: string;
}) {
  return <div style={{ ...place(x-w/2, -h, z-d/2), width: w, height: d, background: topColor ?? color,
    border: "1px solid #0002", boxShadow: "0 8px 16px #0002" }}>
    <div style={{ position: "absolute", left: 0, top: "100%", width: w, height: h,
      background: color, transformOrigin: "top", transform: "rotateX(-90deg)" }}/>
    <div style={{ position: "absolute", left: "100%", top: 0, width: h, height: d,
      background: color, filter: "brightness(.72)", transformOrigin: "left", transform: "rotateY(90deg)" }}/>
    {label && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
      fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: 1 }}>{label}</span>}
  </div>;
}
function Glass({ x, z, w, angle = 0 }: { x: number; z: number; w: number; angle?: number }) {
  return <div style={{ ...place(x, -85, z), width: w, height: 85,
    background: "linear-gradient(125deg,#c6f5ff55,#ffffff19)", border: "2px solid #607783",
    boxShadow: "inset 0 0 14px #fff4", transformOrigin: "left bottom",
    transform: `translate3d(${x}px, ${z}px, 85px) rotateZ(${angle}deg) rotateX(90deg)` }} />;
}
function Desk({ x, z }: { x: number; z: number }) {
  return <>
    <Block x={x} z={z} w={70} d={37} h={28} color="#bca58c" topColor="#e2d1b8" />
    <Block x={x} z={z-7} w={23} d={4} h={25} color="#244f62" topColor="#32677b" />
    <Block x={x} z={z+40} w={22} d={22} h={20} color="#526774" topColor="#748b96" />
  </>;
}
function OfficeStudy() {
  const [yaw, setYaw] = useState(-36);
  const [tilt, setTilt] = useState(59);
  const [zoom, setZoom] = useState(0.77);
  const [furnished, setFurnished] = useState(true);
  const drag = useRef<{ x: number; y: number; yaw: number; tilt: number } | null>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setYaw(drag.current.yaw + (e.clientX-drag.current.x)*0.32);
    setTilt(Math.max(25,Math.min(78,drag.current.tilt-(e.clientY-drag.current.y)*0.2)));
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setFurnished(v=>!v)} className="rounded-lg border border-slate-500 px-3 py-2 text-sm">{furnished?"Ocultar móveis":"Mostrar móveis"}</button>
      <button type="button" onClick={() => {setYaw(-36);setTilt(59);setZoom(.77);}} className="rounded-lg border border-slate-500 px-3 py-2 text-sm">Restaurar câmera</button>
      <label className="flex items-center gap-2 text-sm">Zoom <input aria-label="Zoom da câmera" type="range" min="0.45" max="1.5" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
    </div>
    <div aria-label="Prévia 3D navegável da empresa" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,yaw,tilt};}} onPointerMove={onMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
      className="relative h-[min(74vh,740px)] min-h-[420px] w-full touch-none overflow-hidden rounded-xl border border-slate-700"
      style={{ background:"radial-gradient(ellipse at 50% 35%,#e4e8e9,#9ba7b1 80%,#536575)", perspective:"1300px", cursor:"grab" }}>
      <div style={{ position:"absolute",left:"50%",top:"51%",width:0,height:0,transformStyle:"preserve-3d",
        transform:`scale(${zoom}) rotateX(${tilt}deg) rotateZ(${yaw}deg)` }}>
        <div style={{ position:"absolute",left:-460,top:-375,width:920,height:750,
          background:"repeating-linear-gradient(90deg,#d5d7d4 0px,#d5d7d4 74px,#c9cdca 75px)",
          border:"10px solid #27323a",boxShadow:"0 30px 60px #1d293655" }}/>
        {sectors.map(s=><div key={s.name}>
          <div style={{...place(s.x-s.w/2,1,s.z-s.d/2),width:s.w,height:s.d,
            background:s.name==="Recepção"?"#c6b49b":"#d7c3a9",
            opacity:.8, border:"1px solid #b4a18a"}} />
          <div style={{...place(s.x,2,s.z),width:0,height:0}}>
            <span style={{position:"absolute",transform:"translate(-50%,-50%)",fontSize:15,fontWeight:800,
              color:"#334155",whiteSpace:"nowrap",textShadow:"0 1px #fff9"}}>{s.name.toUpperCase()}</span>
          </div>
          {s.glass && <Glass x={s.x-s.w/2} z={s.z+s.d/2} w={s.w-55}/>}
          {furnished && s.desks.map(([x,z],i)=><Desk key={i} x={x} z={z}/>)}
        </div>)}
        {furnished && <>
          <Block x={-280} z={295} w={155} d={32} h={42} color="#9b8a78" topColor="#d9c2a5" label="RECEPÇÃO"/>
          <Block x={-20} z={10} w={120} d={65} h={18} color="#859397" topColor="#b7c5c6"/>
          <Block x={-20} z={-65} w={95} d={35} h={20} color="#7a8889" topColor="#b8c5c2"/>
          <Block x={85} z={40} w={45} d={45} h={18} color="#c2a789" topColor="#ead8bf"/>
          <Block x={-95} z={-10} w={25} d={25} h={48} color="#547e5b" topColor="#6ca174"/>
        </>}
        {[-1,1].map(side=><div key={side} style={{...place(side*455, -120,0),
          width:750,height:120,background:"#eef0ef",border:"3px solid #35434a",
          transform:`translate3d(${side*455}px,0px,0px) rotateZ(90deg) rotateX(90deg)`}}/>)}
      </div>
      <div className="absolute bottom-3 left-3 rounded bg-slate-900/75 px-3 py-2 text-xs text-white">Arraste para girar e inclinar • ajuste o zoom acima</div>
    </div>
    <p className="text-xs text-slate-400">Estudo inicial com geometria 3D manipulável. Não é a conversão automática da fotografia em Blender: móveis, paredes e acabamentos serão reconstruídos progressivamente. Nenhum agente ou função financeira está conectado a esta prévia.</p>
  </div>;
}
export const Route = createFileRoute("/office-3d-preview")({
  head:()=>({meta:[{title:"Nova empresa 3D | Signal Symphony Desk"}]}),
  component:()=> <DemoLoginGate><main className="min-h-screen bg-slate-950 px-3 py-6 text-white">
    <div className="mx-auto max-w-6xl space-y-4">
      <Link to="/architecture-preview" className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm">← Arquitetura anterior</Link>
      <h1 className="text-2xl font-bold text-cyan-300">Signal Symphony Desk — Nova empresa 3D</h1>
      <p className="text-sm text-slate-300">Prévia experimental separada, inspirada na nova referência corporativa: espaços de trabalho, salas de vidro, recepção e convivência. Arraste para explorar a perspectiva.</p>
      <OfficeStudy/>
    </div>
  </main></DemoLoginGate>
});
