/*
 * Blueprint Editorial design reminder:
 * Use technical hierarchy, warm editorial reading surfaces, deep blueprint navy,
 * signal-orange preferred-path markers, asymmetric composition, and concise
 * decision-oriented copy. Interactions should clarify trade-offs, not decorate them.
 */
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Database,
  ExternalLink,
  Gauge,
  GitBranch,
  Layers3,
  Menu,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const heroImage = "/manus-storage/blueprint-editorial-hero_60ac77a5.png";
const stackImage = "/manus-storage/architecture-stack_fca71ee7.png";
const loopImage = "/manus-storage/decision-loop_032575b3.png";
const markImage = "/manus-storage/scaling-monogram_02f9a6fd.png";

const navItems = [
  { id: "decision", label: "Decision" },
  { id: "compare", label: "Compare" },
  { id: "architecture", label: "Architecture" },
  { id: "roadmap", label: "Roadmap" },
];

const phases = [
  {
    no: "00",
    label: "Truth & foundation",
    title: "Make the platform durable before making it bigger.",
    body: "Freeze the feature surface, move the system of record to PostgreSQL, add object storage, formalize job contracts, and make tenant boundaries observable.",
    items: ["PostgreSQL + migrations", "MinIO-compatible storage", "Valkey/BullMQ job contract", "API contract tests"],
    tone: "orange",
  },
  {
    no: "01",
    label: "Media pipeline",
    title: "Keep the engine. Add the production contract.",
    body: "Unify video, narration, and music under ProductionBrief, ClipPlan, NarrationSpan, and MusicCue. Add quality gates and a human approval state before publish.",
    items: ["Narration profiles", "Music ducking + loudness", "Render state machine", "Quality report"],
    tone: "mint",
  },
  {
    no: "02",
    label: "Content Factory",
    title: "Turn bulk jobs into a campaign system.",
    body: "A campaign should ingest, cluster, select, generate, review, retry, schedule, and publish without forcing a creator to jump across engineering screens.",
    items: ["Campaign entity", "Story clustering", "Per-stage retries", "Approval board"],
    tone: "blue",
  },
  {
    no: "03",
    label: "Command center",
    title: "Give the creator one calm surface for a complex machine.",
    body: "Ideas inbox, content calendar, templates, brand kit, platform variants, and progress become one guided workflow instead of disconnected modules.",
    items: ["Content calendar", "Brand kit", "Platform variants", "Creator memory"],
    tone: "paper",
  },
  {
    no: "04",
    label: "Intelligence at scale",
    title: "Let outcomes teach the next brief.",
    body: "Add cost events, resource-aware workers, explainable analytics, fact confidence, script criticism, and embeddings only where the data model can support them.",
    items: ["Cost ledger", "GPU/CPU pools", "Editorial QA", "Content insights"],
    tone: "lavender",
  },
];

const comparisonRows = [
  { capability: "Video creation", current: "VideoCreator, scenes, ShortCreator, FFmpeg, Remotion, RenderWorker", media: "Add brief, clip plan, render QA", scale: "Durable render jobs + campaign orchestration", decision: "Keep + extend" },
  { capability: "TTS", current: "TtsAdapter, Kokoro, voice/language selection", media: "Narration profile, spans, pronunciation, audio QA", scale: "Provider isolation + cost tracking", decision: "Keep behind interface" },
  { capability: "Music", current: "Catalog, tags, selection, composition path", media: "Music brief, cues, ducking, loudness, rights", scale: "Object storage + resource scheduling", decision: "Add mixer layer" },
  { capability: "Persistence", current: "JSON/file-backed stores", media: "Not a media concern", scale: "PostgreSQL + migrations + transactions", decision: "Replace boundary" },
  { capability: "Jobs", current: "Workers, Redis/direct modes", media: "Explicit lifecycle", scale: "Valkey/BullMQ first; Temporal later", decision: "Standardize" },
  { capability: "Publishing", current: "Platform adapters + scheduler", media: "Approval before publish", scale: "Variants, OAuth lifecycle, idempotency", decision: "Harden" },
];

const decisions = [
  { label: "Keep", title: "Existing media domain", text: "VideoCreator, ShortCreator, FFmpeg/Remotion, TtsAdapter, music catalog, workers, publishers, scheduler, and analytics remain the foundation.", icon: CheckCircle2, color: "mint" },
  { label: "Add", title: "Canonical production contracts", text: "ProductionBrief, ClipPlan, NarrationProfile, NarrationSpan, MusicBrief, MusicCue, QualityReport, and ApprovalDecision make the system composable.", icon: PlusIcon, color: "orange" },
  { label: "Replace", title: "Fragile scaling boundaries", text: "Move JSON stores to PostgreSQL, local media to object storage, and ambiguous queue behavior to explicit durable jobs.", icon: ArrowDownRight, color: "blue" },
  { label: "Defer", title: "Complexity before proof", text: "Temporal, Keycloak, pgvector, AI music generation, and multi-armed bandits wait until the foundation and attribution are ready.", icon: Timer, color: "lavender" },
];

function PlusIcon(props: React.ComponentProps<typeof Sparkles>) {
  return <Sparkles {...props} />;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("current");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabContent = useMemo(() => {
    if (activeTab === "media") return { eyebrow: "Media layer", title: "One production contract, three coordinated modalities.", body: "Do not add three new products. Add the missing orchestration: clip plans for video, narration spans for TTS, and music cues for BGM." };
    if (activeTab === "scale") return { eyebrow: "Scale layer", title: "Upgrade the boundaries that fail under concurrency.", body: "PostgreSQL, object storage, explicit job contracts, idempotency, tenant-scoped caches, and observability turn working modules into a dependable platform." };
    return { eyebrow: "Current foundation", title: "The hard media work is already here.", body: "The project already has a creator workflow, scene editing, render workers, TTS, music, publishers, scheduling, analytics, and tenant-aware security." };
  }, [activeTab]);

  const copyPage = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Decision link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy was blocked by the browser");
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Scaling Architecture Decision home">
          <img src={markImage} alt="" className="brand-mark" />
          <span><strong>Scale / Route</strong><small>architecture decision</small></span>
        </a>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"} aria-label="Primary navigation">
          {navItems.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
        </nav>
        <div className="top-actions">
          <span className="status-pill"><span className="status-dot" /> v1.0 / preferred path</span>
          <button className="icon-button menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={18} /></button>
          <button className="copy-button" onClick={copyPage}><Clipboard size={15} /> {copied ? "Copied" : "Share decision"}</button>
        </div>
      </header>

      <aside className="document-rail" aria-label="Section index"><span className="rail-title">ROUTE / INDEX</span>{navItems.map((item, index) => <a key={item.id} href={`#${item.id}`}><span>0{index + 1}</span>{item.label}</a>)}<span className="rail-line" /></aside>
      <div className="route-track" aria-hidden="true"><span className="route-node node-1" /><span className="route-node node-2" /><span className="route-node node-3" /><span className="route-node node-4" /></div>

      <main id="top">
        <section className="hero-section" style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 18, 35, .97) 0%, rgba(7, 18, 35, .86) 42%, rgba(7, 18, 35, .34) 100%), url(${heroImage})` }}>
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="kicker light-kicker"><span>DECISION BRIEF / 2026</span><i /><span>CONTENT PLATFORM</span></p>
              <h1>Scale the foundation<br /><em>before</em> you multiply<br />the features.</h1>
              <p className="hero-lede">A practical route from a capable video platform to a durable, creator-first Content Factory—without throwing away the media engine that already works.</p>
              <div className="hero-actions"><a className="primary-cta" href="#decision">Read the preferred route <ArrowRight size={17} /></a><a className="text-cta" href="#roadmap">Jump to roadmap <ArrowDownRight size={16} /></a></div>
            </div>
            <div className="hero-note"><span className="note-index">01</span><p>KEEP THE MEDIA ENGINE.<br /><strong>REPLACE THE FRAGILE BOUNDARIES.</strong></p></div>
          </div>
          <div className="hero-footer"><span>Prepared for scaling decisions</span><span>Current → Preferred</span><span>Read time 06 min</span></div>
        </section>

        <section className="decision-strip" id="decision">
          <div className="section-shell decision-grid">
            <div className="section-label"><span className="label-number">01</span><span>THE CALL</span></div>
            <div className="decision-statement"><p className="eyebrow">Preferred architecture</p><h2>Do not rebuild the product.<br /><span>Rebuild its boundaries.</span></h2><p>Keep the existing video, TTS, music, publishing, scheduling, and analytics domain. Add the contracts, durable storage, state machine, quality gate, and Content Factory that make it safe to scale.</p></div>
            <div className="decision-aside"><div className="aside-rule" /><p>“Replace infrastructure boundaries, not working domain capabilities.”</p><span>— operating principle</span></div>
          </div>
        </section>

        <section className="tab-section" id="compare">
          <div className="section-shell">
            <div className="section-heading-row"><div><p className="eyebrow">Two reports / one route</p><h2>What the project has.<br /><span>What scale asks for.</span></h2></div><div className="heading-meta">A single view for product,<br />engineering, and operations.</div></div>
            <div className="tabs" role="tablist" aria-label="Decision lenses">
              {[{id:"current",label:"Current foundation",icon:Layers3},{id:"media",label:"Media layer",icon:Play},{id:"scale",label:"Scale layer",icon:Gauge}].map(({id,label,icon:Icon}) => <button key={id} className={activeTab === id ? "tab active" : "tab"} onClick={() => setActiveTab(id)} role="tab" aria-selected={activeTab === id}><Icon size={15} />{label}</button>)}
            </div>
            <div className="tab-panel"><div className="tab-index">/ {activeTab === "current" ? "01" : activeTab === "media" ? "02" : "03"}</div><div><p className="eyebrow orange-text">{tabContent.eyebrow}</p><h3>{tabContent.title}</h3><p>{tabContent.body}</p></div><ArrowRight className="tab-arrow" size={23} /></div>
            <div className="matrix-wrap"><table><thead><tr><th>Capability</th><th>Current project</th><th>Decision report</th><th>Scaling proposal</th><th>Preferred move</th></tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.capability}><td><strong>{row.capability}</strong></td><td>{row.current}</td><td>{row.media}</td><td>{row.scale}</td><td><span className="table-decision">{row.decision}</span></td></tr>)}</tbody></table></div>
          </div>
        </section>

        <section className="architecture-section" id="architecture">
          <div className="section-shell architecture-grid"><div className="architecture-copy"><p className="eyebrow light-kicker">The preferred system</p><h2>One coherent<br /><em>production engine.</em></h2><p>Video, voice, music, QA, approval, publishing, and analytics should share a single production contract—then run on infrastructure that can survive concurrency.</p><div className="architecture-list"><div><span>01</span><p><strong>ProductionBrief</strong><br />The canonical intent: audience, style, clips, narration, music, brand.</p></div><div><span>02</span><p><strong>Durable execution</strong><br />PostgreSQL + object storage + explicit Valkey/BullMQ jobs.</p></div><div><span>03</span><p><strong>Human release gate</strong><br />Quality report → approval → platform variants → publish.</p></div></div><a className="outline-cta" href="#roadmap">See the migration order <ArrowRight size={16} /></a></div><div className="architecture-visual"><div className="stack-diagram" aria-label="Preferred architecture stack diagram"><div className="stack-orbit orbit-one" /><div className="stack-orbit orbit-two" /><div className="stack-block block-db"><Database size={18} /><span>POSTGRESQL</span></div><div className="stack-block block-storage"><Layers3 size={18} /><span>OBJECT STORAGE</span></div><div className="stack-block block-queue"><Network size={18} /><span>DURABLE QUEUE</span></div><div className="stack-block block-render"><Play size={18} /><span>RENDER / PUBLISH</span></div><div className="stack-route route-a" /><div className="stack-route route-b" /><div className="stack-route route-c" /><div className="stack-stamp">PREFERRED<br /><strong>ROUTE</strong></div></div><div className="visual-caption"><span>ARCHITECTURE / 01</span><span>FOUNDATION → FACTORY</span></div></div></div>
        </section>

        <section className="decisions-section"><div className="section-shell"><div className="section-heading-row"><div><p className="eyebrow">Decision matrix</p><h2>Keep. Add. Replace.<br /><span>Defer the noise.</span></h2></div><div className="heading-meta">The fastest path is not<br />the one with the most tools.</div></div><div className="decision-cards">{decisions.map(({label,title,text,icon:Icon,color}) => <article className={`decision-card document-note ${color}`} key={label}><div className="card-top"><span className="decision-tag">{label}</span><Icon size={20} /></div><h3>{title}</h3><p>{text}</p><span className="card-line" /></article>)}</div></div></section>

        <section className="loop-section"><div className="section-shell loop-grid"><div className="loop-visual"><div className="loop-diagram" aria-label="Operating loop: brief, build, approve, learn"><div className="loop-ring" /><div className="loop-center"><span>CONTENT</span><strong>LOOP</strong></div><div className="loop-node loop-brief"><span>01</span><strong>BRIEF</strong></div><div className="loop-node loop-build"><span>02</span><strong>BUILD</strong></div><div className="loop-node loop-approve"><span>03</span><strong>APPROVE</strong></div><div className="loop-node loop-learn"><span>04</span><strong>LEARN</strong></div></div><div className="visual-caption"><span>OPERATING LOOP / 02</span><span>OUTCOMES TEACH THE NEXT BRIEF</span></div></div><div className="loop-copy"><p className="eyebrow">The intelligence loop</p><h2>Every publish should make the next brief <span>sharper.</span></h2><p>Analytics is not the final dashboard. It is the feedback layer that should improve hooks, voices, visual choices, timing, and the next campaign—once event attribution is reliable.</p><div className="loop-points"><div><Zap size={18} /><span><strong>Measure</strong> capture events, cost, quality, and platform outcomes.</span></div><div><Sparkles size={18} /><span><strong>Learn</strong> surface explainable patterns, not mysterious scores.</span></div><div><GitBranch size={18} /><span><strong>Route</strong> feed the winning patterns into the next Content Factory brief.</span></div></div></div></div></section>

        <section className="roadmap-section" id="roadmap"><div className="section-shell"><div className="section-heading-row roadmap-header"><div><p className="eyebrow">Migration runway</p><h2>Foundation first.<br /><span>Intelligence last.</span></h2></div><div className="heading-meta"><span className="orange-text">05 phases</span><br />Each phase earns the next.</div></div><div className="roadmap-list">{phases.map((phase) => <article className={`phase-row ${phase.tone}`} key={phase.no}><div className="phase-no">{phase.no}</div><div className="phase-main"><p className="phase-label">{phase.label}</p><h3>{phase.title}</h3><p>{phase.body}</p></div><div className="phase-items">{phase.items.map((item) => <span key={item}><Check size={14} />{item}</span>)}</div><ArrowRight className="phase-arrow" size={20} /></article>)}</div></div></section>

        <section className="final-section"><div className="section-shell final-inner"><div><p className="eyebrow light-kicker">The one-line decision</p><h2>Existing media domain<br /><em>+ durable platform boundaries.</em></h2><p>That is the route to a scalable Content Factory without a rewrite-shaped detour.</p></div><div className="final-badge"><ShieldCheck size={26} /><span>READY TO<br /><strong>ALIGN</strong></span></div></div></section>
      </main>

      <footer className="footer"><div className="footer-brand"><img src={markImage} alt="" className="brand-mark" /><span><strong>Scale / Route</strong><small>architecture decision</small></span></div><div className="footer-meta"><span>Decision brief / 2026</span><span>Current project → preferred scale</span><button onClick={copyPage}><ExternalLink size={14} /> Share this route</button></div></footer>
    </div>
  );
}
