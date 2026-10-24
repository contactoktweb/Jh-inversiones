"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, Clock3, CopyCheck, Heart, HelpCircle, LockKeyhole, MoveUpRight, Plus, ShieldCheck, Sparkles, TrendingUp, Wallet, X, Layers3, ChartNoAxesCombined, CalendarDays, Eye, BellRing, MousePointerClick, SlidersHorizontal } from "lucide-react";
import Nav from "./nav";
import Logo from "./logo";
import CheckoutButton from "./checkout-button";
import { plans } from "@/lib/plans";
import { formatUsd } from "@/lib/finance";
import { DEFAULT_DAILY_RATE_PCT, MIN_INVESTMENT_USD, MIN_TERM_DAYS } from "@/lib/rates";
import { brand } from "@/lib/brand";

const reveal = {initial:{opacity:0,y:34},whileInView:{opacity:1,y:0},viewport:{once:true,amount:.12},transition:{duration:.7,ease:[.2,.72,.22,1] as [number,number,number,number]}};

function Eyebrow({children,dark=false}:{children:React.ReactNode;dark?:boolean}){return <span className={`bm-eyebrow${dark?" bm-eyebrow-dark":""}`}><i/>{children}</span>}
function CTA({children,href,secondary=false}:{children:React.ReactNode;href:string;secondary?:boolean}){return <Link className={`bm-button ${secondary?"bm-button-light":""}`} href={href}>{children}<ArrowUpRight size={18}/></Link>}

const curveShapes = {
 "1M":"M0 177 C65 183 94 170 133 148 S205 158 256 116 S305 134 352 101 S428 92 471 59 S536 77 580 28",
 "3M":"M0 181 C49 180 63 146 99 154 S158 142 185 126 S229 141 258 105 S300 116 323 90 S358 105 393 70 S433 79 469 41 S525 63 580 16",
 "6M":"M0 190 C54 185 93 178 126 157 S182 162 212 139 S292 121 331 107 S398 72 449 66 S511 39 580 22",
 "1A":"M0 198 C58 193 83 170 133 174 S201 140 248 127 S321 108 373 94 S448 67 486 46 S551 38 580 12"
} as const;

function Curve({color="#1571FF",fill=false,period="3M"}:{color?:string;fill?:boolean;period?:keyof typeof curveShapes}){
 const d=curveShapes[period];
 return <svg viewBox="0 0 580 220" className="bm-curve" preserveAspectRatio="none" role="img" aria-label={`Gráfico esquemático de simulación, periodo de visualización ${period}`}><defs><linearGradient id="bm-grad" x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><g className="bm-curve-grid">{[34,90,146,200].map(y=><line key={y} x1="0" x2="580" y1={y} y2={y}/>)}</g>{fill&&<path fill="url(#bm-grad)" d={`${d} L580 220 H0Z`}/>}<motion.path key={period} initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.15}} d={d} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" className="bm-curve-line"/><circle cx="580" cy={period==="3M"?16:period==="1M"?28:period==="6M"?22:12} r="6" fill={color} stroke="#fff" strokeWidth="3"/></svg>;
}

const DEMO_CAPITAL_USD = 500;
const demoPeriod = (days: number, progress: string) => {
  const gain = DEMO_CAPITAL_USD * DEFAULT_DAILY_RATE_PCT / 100 * days;
  return { balance: formatUsd(DEMO_CAPITAL_USD + gain), change: `+ ${formatUsd(gain)}`, pct: `+${(DEFAULT_DAILY_RATE_PCT * days).toFixed(1)}%`, days: `${days} días`, progress, capital: formatUsd(DEMO_CAPITAL_USD) };
};
const demoDataByPeriod = {
  "1M": demoPeriod(30, "100%"),
  "3M": demoPeriod(90, "42%"),
  "6M": demoPeriod(180, "25%"),
  "1A": demoPeriod(365, "12%"),
} as const;

function DemoInterface({
  compact = false,
  selectedPeriod,
  onPeriodChange,
}: {
  compact?: boolean;
  selectedPeriod?: "1M" | "3M" | "6M" | "1A";
  onPeriodChange?: (p: "1M" | "3M" | "6M" | "1A") => void;
}) {
  const [internalPeriod, setInternalPeriod] = useState<"1M" | "3M" | "6M" | "1A">("3M");
  const period = selectedPeriod ?? internalPeriod;
  const setPeriod = onPeriodChange ?? setInternalPeriod;
  const data = demoDataByPeriod[period];

  return (
    <div className={`bm-app-window${compact ? " bm-app-compact" : ""}`}>
      <div className="bm-app-top">
        <div className="bm-app-brand">
          <span className="bm-app-logo">JH</span>
          <span>Monitor de Inversión</span>
        </div>
        <span className="bm-live-badge">
          <i className="pulse-dot" /> ESCENARIO DINÁMICO
        </span>
      </div>
      <div className="bm-app-main">
        <div className="bm-app-subtitle">
          Balance proyectado del plan <span>· Simulación ilustrativa</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="bm-app-balance"
          >
            {data.balance}
            <span> USD</span>
          </motion.div>
        </AnimatePresence>
        <span className="bm-app-change">
          <TrendingUp size={15} /> {data.change} <span>variación ({data.pct})</span>
        </span>
        <div className="bm-app-chart">
          <Curve fill period={period} />
        </div>
        <div className="bm-app-periods">
          {(["1M", "3M", "6M", "1A"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              className={item === period ? "selected" : ""}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="bm-app-stats">
          <div>
            <span>Capital base</span>
            <strong>{data.capital}</strong>
          </div>
          <div>
            <span>Plazo del ciclo</span>
            <strong>{data.days}</strong>
          </div>
          <div>
            <span>Avance del ciclo</span>
            <strong>{data.progress}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const [heroPeriod, setHeroPeriod] = useState<"1M" | "3M" | "6M" | "1A">("3M");
  const data = demoDataByPeriod[heroPeriod];

  return (
    <section className="bm-hero" id="inicio">
      <div className="bm-hero-grid" aria-hidden="true" />
      <div className="bm-hero-halo bm-halo-gold" aria-hidden="true" />
      <div className="bm-hero-halo bm-halo-sapphire" aria-hidden="true" />
      <div className="bm-hero-halo bm-halo-ring" aria-hidden="true" />

      <div className="bm-container bm-hero-layout">
        <motion.div
          className="bm-hero-copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.72, 0.22, 1] }}
        >
          <div className="bm-hero-pill">
            <span className="bm-pill-dot"><i /></span>
            <span className="bm-pill-text">TECNOLOGÍA PATRIMONIAL TRANSPARENTE</span>
            <span className="bm-pill-tag">JH V2.4</span>
          </div>

          <div className="bm-min-badge"><Wallet size={17} /> Empieza a invertir desde ${MIN_INVESTMENT_USD} USD</div>

          <h1>
            Tu futuro merece <em>una mejor perspectiva</em>
          </h1>

          <p className="bm-hero-lead">
            Comienza con solo 50 dólares en adelante. Sigue tu inversión y tus ganancias diarias en tiempo real desde tu panel personal, con un plazo mínimo de un mes y total claridad en cada paso.
          </p>

          <div className="bm-hero-metrics">
            <div className="bm-hm-item">
              <strong className="bm-hm-val">$50</strong>
              <span className="bm-hm-lbl">Inversión mínima</span>
            </div>
            <div className="bm-hm-sep" />
            <div className="bm-hm-item">
              <strong className="bm-hm-val">1 mes</strong>
              <span className="bm-hm-lbl">Plazo mínimo</span>
            </div>
            <div className="bm-hm-sep" />
            <div className="bm-hm-item">
              <strong className="bm-hm-val">24/7</strong>
              <span className="bm-hm-lbl">Seguimiento en línea</span>
            </div>
          </div>

          <div className="bm-hero-buttons">
            <Link href="#planes" className="bm-btn-gold">
              <span>Explorar planes</span>
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/acceso" className="bm-btn-glass">
              <span>Iniciar sesión</span>
              <ArrowUpRight size={17} />
            </Link>
          </div>

          <div className="bm-hero-reassurance">
            <span><ShieldCheck size={16} /> Desde 50 USD</span>
            <span><TrendingUp size={16} /> Ganancias diarias visibles</span>
            <span><Check size={16} /> Todo en un solo panel</span>
          </div>
        </motion.div>

        <div className="bm-hero-visual">
          <div className="bm-yellow-orbit" aria-hidden="true" />
          <div className="bm-blue-disc" aria-hidden="true" />
          <div className="bm-orbit-energy" aria-hidden="true" />

          <motion.div
            className="bm-preview-wrap"
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.72, 0.22, 1] }}
          >
            <DemoInterface selectedPeriod={heroPeriod} onPeriodChange={setHeroPeriod} />
          </motion.div>

          <motion.div
            className="bm-float-glass bm-float-top-left"
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="bm-float-icon bm-icon-emerald">
              <TrendingUp size={19} />
            </div>
            <div className="bm-float-text">
              <span className="bm-float-kicker">PROYECCIÓN ILUSTRATIVA</span>
              <strong className="bm-float-value">{data.change} USD</strong>
            </div>
            <span className="bm-float-badge">{data.pct}</span>
          </motion.div>

          <motion.div
            className="bm-float-glass bm-float-bottom-right"
            animate={{ y: [0, 11, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          >
            <div className="bm-float-icon bm-icon-royal">
              <Clock3 size={19} />
            </div>
            <div className="bm-float-text">
              <span className="bm-float-kicker">PERIODO SELECCIONADO</span>
              <strong className="bm-float-value">Avance visual · {data.progress}</strong>
            </div>
          </motion.div>

          <motion.div
            className="bm-float-glass bm-float-accent"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          >
            <div className="bm-float-icon bm-icon-gold">
              <ShieldCheck size={18} />
            </div>
            <div className="bm-float-text">
              <span className="bm-float-kicker">TRANSPARENCIA</span>
              <strong className="bm-float-value">100% Verificable</strong>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="bm-hero-floor">
        <div className="bm-container">
          <span className="bm-floor-kicker">DISEÑADO PARA ENTENDER, VISUALIZAR Y DECIDIR</span>
          <Link href="#beneficios" className="bm-floor-link">
            <span>DESCUBRE CÓMO FUNCIONA</span>
            <ArrowDown size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Ribbon(){return <div className="bm-ribbon"><div className="bm-container"><span><ShieldCheck size={20}/> Datos claros</span><span><ChartNoAxesCombined size={20}/> Visualización intuitiva</span><span><CalendarDays size={20}/> Periodos a tu ritmo</span><span><CopyCheck size={20}/> Solicitudes organizadas</span></div></div>}

function Benefits(){return <section className="bm-section bm-benefits" id="beneficios"><div className="bm-container"><motion.div {...reveal} className="bm-benefit-heading"><div><Eyebrow dark>MENOS RUIDO, MÁS CLARIDAD</Eyebrow><h2>Finanzas que se sienten <em>más sencillas.</em></h2></div><p>La información que necesitas, presentada con intención. Cada pantalla está diseñada para ayudarte a entender tus opciones antes de dar el siguiente paso.</p></motion.div>
 <div className="bm-benefit-grid"><motion.article {...reveal} className="bm-benefit-card"><div className="bm-benefit-icon bm-icon-blue"><Eye size={27}/></div><span className="bm-card-number">01 / EXPLORA</span><h3>Todo a simple vista.</h3><p>Compara valores, plazos y características sin navegar entre decenas de pantallas.</p><div className="bm-mini-list"><span>Elige un escenario</span><span className="bm-mini-pill">En minutos <ArrowUpRight size={13}/></span></div></motion.article>
 <motion.article {...reveal} className="bm-benefit-card bm-benefit-blue"><div className="bm-benefit-icon bm-icon-white"><ChartNoAxesCombined size={27}/></div><span className="bm-card-number">02 / VISUALIZA</span><h3>Tu progreso, más cerca.</h3><p>Un dashboard pensado para ver fechas, avance y cálculos ilustrativos en un solo lugar.</p><div className="bm-mini-progress"><div><span>Progreso del periodo</span><b>42%</b></div><i><span/></i></div></motion.article>
 <motion.article {...reveal} className="bm-benefit-card"><div className="bm-benefit-icon bm-icon-yellow"><BellRing size={26}/></div><span className="bm-card-number">03 / GESTIONA</span><h3>Sin pasos de más.</h3><p>Cuando corresponda, registra una solicitud desde tu panel y consulta su estado.</p><div className="bm-mini-notice"><Check size={17}/> Solicitud organizada</div></motion.article></div>
 </div></section>}

const tabs=[{id:"resumen",label:"Mi resumen",tag:"VISIÓN GENERAL",title:"Todo está conectado.",body:"Consulta tu capital invertido, tus ganancias y el tiempo transcurrido desde una sola vista.",icon:Eye},{id:"seguimiento",label:"Seguimiento",tag:"PROGRESO DEL PERIODO",title:"Cada día cuenta.",body:"Conoce cuánto tiempo ha transcurrido y cómo se calcula la proyección temporal de tu plan.",icon:ChartNoAxesCombined},{id:"solicitudes",label:"Solicitudes",tag:"GESTIÓN SENCILLA",title:"Un paso, cuando llegue el momento.",body:"Solicita el retiro de tu capital y ganancias al cumplir el plazo mínimo de un mes.",icon:BellRing}] as const;
function Experience(){const [active,setActive]=useState<(typeof tabs)[number]["id"]>("resumen");const selected=tabs.find(t=>t.id===active)!;
return <section className="bm-section bm-experience" id="experiencia"><div className="bm-container"><motion.div {...reveal} className="bm-section-center"><Eyebrow dark>DISEÑADO ALREDEDOR DE TI</Eyebrow><h2>Una experiencia que <em>habla tu idioma.</em></h2><p>Descubre cómo se siente tener toda la información esencial de tu plan en un espacio visual y ordenado.</p></motion.div>
<div className="bm-experience-grid"><div className="bm-exp-copy"><div className="bm-exp-tabs" role="tablist" aria-label="Vistas del producto">{tabs.map(t=><button role="tab" aria-selected={active===t.id} onClick={()=>setActive(t.id)} className={active===t.id?"active":""} key={t.id}>{t.label}</button>)}</div>
<AnimatePresence mode="wait"><motion.div key={active} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-9}} transition={{duration:.26}}><span className="bm-exp-tag">{selected.tag}</span><h3>{selected.title}</h3><p>{selected.body}</p><div className="bm-exp-checks"><span><Check size={18}/> Información a tu alcance</span><span><Check size={18}/> Sin complicaciones técnicas</span><span><Check size={18}/> Diseñado para cualquier pantalla</span></div></motion.div></AnimatePresence><Link href="/acceso" className="bm-inline-cta">Iniciar sesión <ArrowUpRight size={18}/></Link></div>
<div className="bm-exp-visual"><div className="bm-exp-decor"/><div className="bm-exp-frame">
{active==="resumen"&&<DemoInterface compact/>}
{active==="seguimiento"&&<div className="bm-alt-panel"><div className="bm-alt-head"><span>SEGUIMIENTO DE TU PLAN</span><span className="bm-alt-state"><i/> EN CURSO</span></div><h4>Órbita <span>· 90 días</span></h4><div className="bm-alt-center"><span>Tiempo transcurrido</span><strong>42%</strong><div className="bm-alt-track"><i/></div><div className="bm-alt-progress-note"><span>12 AGO · INICIO</span><span>10 NOV · FINALIZA</span></div></div><div className="bm-alt-row"><span><CalendarDays size={18}/> 38 días transcurridos</span><span>52 restantes</span></div><p>Los porcentajes representan únicamente el avance del plazo.</p></div>}
{active==="solicitudes"&&<div className="bm-alt-panel"><div className="bm-alt-head"><span>CENTRO DE SOLICITUDES</span><span className="bm-alt-state"><i/> DEMO</span></div><h4>Solicitudes <span>· Vista previa</span></h4><div className="bm-request-card"><div className="bm-request-icon"><CopyCheck size={29}/></div><h5>Un proceso que se entiende</h5><p>Cuando tu inversión cumpla el plazo mínimo de un mes, podrás solicitar el retiro desde aquí.</p><div className="bm-request-button">Solicitar retiro <ArrowUpRight size={17}/></div></div><div className="bm-alt-row"><span>Estado de ejemplo</span><span>Disponible al finalizar</span></div></div>}
</div><div className="bm-exp-visual-caption"><Sparkles size={16}/> Interfaces ilustrativas del prototipo JH Inversiones</div></div></div></div></section>}

function How(){const steps=[{n:"01",title:"Explora tus opciones",text:"Revisa las modalidades de demostración, compara plazos y elige una opción para conocer su funcionamiento.",Icon:MousePointerClick},{n:"02",title:"Visualiza un escenario",text:"Prueba el simulador y observa cifras hipotéticas asociadas a cada periodo, con sus condiciones claramente señaladas.",Icon:SlidersHorizontal},{n:"03",title:"Sigue tu recorrido",text:"Accede al panel, consulta el avance temporal y gestiona una solicitud cuando corresponda.",Icon:Eye}];return <section className="bm-section bm-how" id="como-funciona"><div className="bm-container"><motion.div {...reveal} className="bm-how-head"><div><Eyebrow dark>ASÍ DE SIMPLE</Eyebrow><h2>Empieza con claridad. <em>Sigue con confianza.</em></h2></div><p>No necesitas dominar un lenguaje financiero complejo para navegar por tu experiencia.</p></motion.div><div className="bm-how-steps">{steps.map(({n,title,text,Icon})=><motion.article {...reveal} className="bm-how-step" key={n}><div className="bm-step-top"><span>{n}</span><Icon size={28}/></div><h3>{title}</h3><p>{text}</p><ArrowUpRight className="bm-step-arrow" size={20}/></motion.article>)}</div></div></section>}

function Plans(){return <section id="planes" className="bm-section bm-plans"><div className="bm-container"><motion.div {...reveal} className="bm-plans-header"><div><Eyebrow dark>ENCUENTRA TU RITMO</Eyebrow><h2>Un plan para cada <em>horizonte.</em></h2></div><p>Empieza a invertir desde 50 dólares en adelante. Todas las modalidades tienen un plazo mínimo de un mes y acumulan la ganancia diaria publicada por la administración.</p></motion.div><div className="bm-plan-grid">{plans.map((plan,i)=><motion.article {...reveal} className={`bm-plan-card ${i===1?"bm-plan-featured":""}`} key={plan.id}>
<div className="bm-plan-top"><span>0{i+1} / {plan.eyebrow}</span>{i===1&&<span className="bm-recommend">EJEMPLO DESTACADO</span>}</div><h3>{plan.name}</h3><p>{plan.caption}</p><div className="bm-plan-value"><span>Inversión desde</span><strong>${plan.minUsd.toLocaleString("en-US")} USD</strong></div><div className="bm-plan-meta"><span><Clock3 size={18}/> Plazo mínimo de {plan.durationDays} días</span><span><TrendingUp size={18}/> Ganancia diaria ({DEFAULT_DAILY_RATE_PCT}% por defecto)</span></div><div className="bm-plan-line"/><ul>{plan.features.map(feature=><li key={feature}><Check size={17}/>{feature}</li>)}</ul><CheckoutButton amountUsd={plan.minUsd} label="Invertir en este plan"/></motion.article>)}</div>
<div className="bm-plan-warning"><HelpCircle size={19}/><p><strong>Importante:</strong> el porcentaje de ganancia diaria lo define la administración y puede variar cada día. Ningún escenario garantiza resultados; antes de operar con fondos reales deben definirse términos, autorizaciones y proveedores aprobados.</p></div></div></section>}

function Calculator(){const [selectedId,setSelectedId]=useState<(typeof plans)[number]["id"]>(plans[0].id);const plan=plans.find(p=>p.id===selectedId)!;const [amount,setAmount]=useState<number>(plan.minUsd);const assumedGain=amount*DEFAULT_DAILY_RATE_PCT/100*MIN_TERM_DAYS;const max=plan.minUsd*20;const step=plan.minUsd>=500?50:10;
const select=(id:typeof selectedId)=>{const p=plans.find(x=>x.id===id)!;setSelectedId(id);setAmount(p.minUsd)};
return <section id="simulador" className="bm-section bm-calc"><div className="bm-container"><motion.div {...reveal} className="bm-calc-heading"><Eyebrow dark>HAZLO A TU MANERA</Eyebrow><h2>Explora los números. <em>Imagina el recorrido.</em></h2><p>Mueve el control y prueba distintos montos desde 50 USD. El cálculo usa la tasa diaria por defecto ({DEFAULT_DAILY_RATE_PCT}%) durante el plazo mínimo de un mes.</p></motion.div><motion.div {...reveal} className="bm-calc-card"><div className="bm-calc-controls"><span className="bm-calc-kicker">01 / CONFIGURA TU ESCENARIO</span><h3>Comienza con una idea.</h3><label htmlFor="bm-amount">Selecciona un plan</label><div className="bm-calc-options">{plans.map(p=><button key={p.id} className={selectedId===p.id?"active":""} onClick={()=>select(p.id)}>{p.name}</button>)}</div><div className="bm-slider-label"><label htmlFor="bm-amount">Monto a invertir</label><strong>{formatUsd(amount)}</strong></div><input id="bm-amount" type="range" value={amount} min={plan.minUsd} max={max} step={step} onChange={e=>setAmount(Number(e.target.value))} style={{"--bm-range":`${(amount-plan.minUsd)/(max-plan.minUsd)*100}%`} as React.CSSProperties}/><div className="bm-slider-ends"><span>{formatUsd(plan.minUsd)}</span><span>{formatUsd(max)}</span></div><div className="bm-calc-duration"><span><Clock3 size={18}/> Plazo mínimo</span><strong>{MIN_TERM_DAYS} días</strong></div><p className="bm-calc-disclosure">La tasa diaria la fija la administración y puede variar. Los resultados son estimaciones y no constituyen asesoría ni rendimiento garantizado.</p></div><div className="bm-calc-output"><div className="bm-calc-out-top"><span>02 / RESULTADO ESTIMADO</span><span><i/> {DEFAULT_DAILY_RATE_PCT}% DIARIO</span></div><p>Valor estimado al cumplir el mes</p><motion.div key={selectedId+amount} initial={{opacity:.5,y:12}} animate={{opacity:1,y:0}} className="bm-calc-total">{formatUsd(amount+assumedGain)}</motion.div><div className="bm-calc-gain"><TrendingUp size={18}/>{formatUsd(assumedGain)} <span>ganancia estimada</span></div><div className="bm-calc-visual"><div className="bm-calc-bars"><span style={{width:`${100*amount/(amount+assumedGain)}%`}}/></div><div><span>Capital inicial</span><span>Al mes</span></div></div><CheckoutButton amountUsd={amount} label="Invertir este monto"/></div></motion.div></div></section>}

const faq=[
 ["¿Desde cuánto puedo invertir?","Puedes empezar a invertir desde 50 dólares (USD) en adelante. El plazo mínimo de cada inversión es de un mes (30 días)."],
 ["¿Cómo se calculan mis ganancias?","Cada día tu inversión suma capital × el porcentaje de ganancia que la administración publica para ese día. Si no se publica ninguno, se aplica el 1.5% por defecto. El porcentaje puede variar y no está garantizado."],
 ["¿Dónde veo mi inversión?","Al iniciar sesión verás en tu panel el capital invertido, las ganancias acumuladas día a día, el tiempo transcurrido y la fecha desde la que puedes solicitar el retiro."],
 ["¿Cuándo puedo retirar?","Después del plazo mínimo de un mes aparece el botón «Solicitar retiro». La solicitud se notifica a la administración y queda sujeta a revisión; no ejecuta pagos automáticamente."],
 ["¿Puedo depositar dinero real ahora?","No. Este prototipo está en modo demostración. Una operación real requiere cumplir con la normativa aplicable, los permisos correspondientes y las condiciones del proveedor de pagos."],
];
function FAQ(){const [opened,setOpened]=useState<number|null>(0);return <section className="bm-section bm-faq" id="preguntas"><div className="bm-container bm-faq-layout"><div><Eyebrow dark>TE LO EXPLICAMOS MEJOR</Eyebrow><h2>Preguntas claras. <em>Respuestas directas.</em></h2><p>Sin letra pequeña escondida en la experiencia: conoce cómo funciona antes de decidir.</p><Link href="/acceso" className="bm-inline-cta">Iniciar sesión <ArrowUpRight size={18}/></Link></div><div className="bm-faq-items">{faq.map(([q,a],i)=><div className={`bm-faq-item${opened===i?" active":""}`} key={q}><button aria-expanded={opened===i} onClick={()=>setOpened(opened===i?null:i)}><span>{q}</span>{opened===i?<X size={21}/>:<Plus size={21}/>}</button><AnimatePresence initial={false}>{opened===i&&<motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.25}}>{a}</motion.p>}</AnimatePresence></div>)}</div></div></section>}
function Bottom(){return <><section className="bm-end"><div className="bm-container bm-end-content"><div className="bm-end-sun"/><motion.div {...reveal}><Eyebrow>EL SIGUIENTE PASO EMPIEZA AQUÍ</Eyebrow><h2>Tu futuro se construye <em>paso a paso.</em></h2><p>Conoce una nueva manera de visualizar tus decisiones y seguir tu recorrido financiero.</p><CTA href="#planes">Explorar mis opciones</CTA></motion.div></div></section><footer className="bm-footer"><div className="bm-container"><div className="bm-footer-main"><div className="bm-footer-about"><Logo/><p>Ideas más claras. Experiencias mejor diseñadas.</p><small>Plataforma demostrativa de productos de inversión.</small></div><div className="bm-footer-columns"><div><strong>Explorar</strong><Link href="/#beneficios">Beneficios</Link><Link href="/#experiencia">La experiencia</Link><Link href="/#planes">Planes</Link></div><div><strong>Tu espacio</strong><Link href="/acceso">Acceder</Link><Link href="/acceso">Dashboard</Link><Link href="/#simulador">Simulador</Link></div><div><strong>Información</strong><Link href="/#preguntas">Preguntas frecuentes</Link><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link></div></div></div><div className="bm-footer-bottom"><span>© {new Date().getFullYear()} {brand.name}. Todos los derechos reservados.</span><a href="https://www.kytcode.lat" target="_blank" rel="noopener noreferrer" className="bm-kt-link">Desarrollado por K&T <Heart size={14} className="bm-heart-icon" fill="#ffffff" color="#ffffff"/></a><p>Demo: cifras hipotéticas, no rendimientos reales ni garantías.</p><Link href="#inicio" className="bm-footer-top-btn">Volver arriba <ArrowUp size={14}/></Link></div></div></footer></>}

export default function Landing(){const {scrollYProgress}=useScroll();const scaleX=useSpring(scrollYProgress,{stiffness:100,damping:30,restDelta:.001});return <MotionConfig reducedMotion="user"><div className="bm-page"><motion.div className="bm-scroll-indicator" style={{scaleX}}/><Nav/><main><Hero/><Ribbon/><Benefits/><Experience/><How/><Plans/><Calculator/><FAQ/><Bottom/></main></div></MotionConfig>}
