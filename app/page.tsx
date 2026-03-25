'use client';
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

type City = {
  id: number;
  x: number;
  y: number;
};

type SvgSize = {
  W: number;
  H: number;
};

type Tour = number[];

type TutorialStep = {
  title: string;
  icon: string;
  body: string;
};

type ScoreLabel = {
  text: string;
  color: string;
};

type Star = {
  x: number;
  y: number;
  r: number;
  o: number;
  tw: number;
};

type GlowBtnProps = {
  onClick: () => void;
  children: ReactNode;
  color?: string;
  outline?: boolean;
  small?: boolean;
  disabled?: boolean;
};

type OverlayProps = {
  children: ReactNode;
  zIndex?: number;
};

type TutorialModalProps = {
  onClose: () => void;
  onPlay: () => void;
};

type LevelInfo = {
  cities: number;
  desc: string;
  color: string;
};

type Results = {
  playerTour: Tour;
  playerDist: number;
  greedyTour: Tour;
  greedyDist: number;
  optTour: Tour;
  optDist: number;
  score: number;
};

const dist = (a: City, b: City): number => Math.hypot(a.x - b.x, a.y - b.y);
const totalDist = (tour: Tour, cities: City[]): number => {
  if (tour.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < tour.length - 1; i++) d += dist(cities[tour[i]], cities[tour[i + 1]]);
  d += dist(cities[tour[tour.length - 1]], cities[tour[0]]);
  return d;
};
const generateCities = (n: number, W: number, H: number, pad = 60): City[] => {
  const cities: City[] = [];
  let attempts = 0;
  while (cities.length < n && attempts < 2000) {
    attempts++;
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);
    if (cities.every((c) => Math.hypot(c.x - x, c.y - y) > 55))
      cities.push({ x, y, id: cities.length });
  }
  return cities;
};
const nearestNeighbour = (cities: City[]): Tour => {
  const n = cities.length;
  const visited = new Array(n).fill(false);
  const tour: Tour = [0]; visited[0] = true;
  for (let step = 1; step < n; step++) {
    let best = -1, bestD = Infinity;
    const cur = tour[tour.length - 1];
    for (let j = 0; j < n; j++) {
      if (!visited[j]) { const d = dist(cities[cur], cities[j]); if (d < bestD) { bestD = d; best = j; } }
    }
    tour.push(best); visited[best] = true;
  }
  return tour;
};
const twoOpt = (tour: Tour, cities: City[], maxIter = 300): Tour => {
  let improved = true, iter = 0, t = [...tour];
  while (improved && iter < maxIter) {
    improved = false; iter++;
    for (let i = 1; i < t.length - 1; i++) {
      for (let k = i + 1; k < t.length; k++) {
        const d0 = dist(cities[t[i-1]], cities[t[i]]) + dist(cities[t[k]], cities[t[(k+1)%t.length]]);
        const d1 = dist(cities[t[i-1]], cities[t[k]]) + dist(cities[t[i]], cities[t[(k+1)%t.length]]);
        if (d1 < d0 - 0.001) { t = [...t.slice(0,i), ...t.slice(i,k+1).reverse(), ...t.slice(k+1)]; improved = true; }
      }
    }
  }
  return t;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVELS = { easy: 6, medium: 10, hard: 14 } as const;
const CITY_NAMES = ["Aether","Boryn","Crest","Doval","Elun","Faro","Gorin","Harx","Ilex","Juno","Keld","Lyra","Mora","Nexis","Oryn","Phos","Quor","Rysk","Sola","Teva","Ural","Vex","Wyrm","Xios","Yara","Zolt"];
const PHASE = { MENU:"menu", TUTORIAL:"tutorial", PLAYING:"playing", PAUSED:"paused", DONE:"done", REVEAL:"reveal" } as const;
type LevelKey = keyof typeof LEVELS;
type PhaseValue = (typeof PHASE)[keyof typeof PHASE];

type StartMenuProps = {
  onStart: () => void;
  onTutorial: () => void;
  level: LevelKey;
  setLevel: (level: LevelKey) => void;
};

type PauseMenuProps = {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  elapsed: number;
  citiesVisited: number;
  totalCities: number;
};

const factorial = (n: number): number =>
  Array.from({ length: n }, (_, i) => i + 1).reduce((acc, value) => acc * value, 1);

const createSeededRandom = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const createStars = (seed = 1337): Star[] => {
  const random = createSeededRandom(seed);

  return Array.from({ length: 140 }, () => ({
    x: random() * 100,
    y: random() * 100,
    r: random() * 1.4 + 0.2,
    o: random() * 0.55 + 0.15,
    tw: 2 + random() * 4,
  }));
};

// ─── Stars ─────────────────────────────────────────────────────────────────────
function Stars() {
  const [stars] = useState<Star[]>(createStars);
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }}>
      {stars.map((s,i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o}>
          <animate attributeName="opacity" values={`${s.o};${s.o*0.3};${s.o}`} dur={`${s.tw}s`} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function Overlay({ children, zIndex = 20 }: OverlayProps) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex,
      background:"rgba(4,4,18,0.88)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      {children}
    </div>
  );
}

// ─── GlowBtn ─────────────────────────────────────────────────────────────────
function GlowBtn({ onClick, children, color="#c084fc", outline=false, small=false, disabled=false }: GlowBtnProps) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: small ? "7px 22px" : "11px 34px",
        borderRadius:5, border:`1.5px solid ${disabled?"#2a2a4a":color}`,
        background: disabled?"transparent": outline ? "transparent" : hov ? `${color}33` : `${color}1a`,
        color: disabled?"#2a2a4a":color,
        fontSize: small?"0.68rem":"0.78rem", letterSpacing:"0.18em",
        cursor: disabled?"not-allowed":"pointer",
        fontFamily:"'Courier New',monospace", fontWeight:700, textTransform:"uppercase",
        boxShadow: (!disabled&&hov) ? `0 0 18px ${color}55` : `0 0 6px ${color}22`,
        transition:"all 0.18s", userSelect:"none",
      }}>
      {children}
    </button>
  );
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title:"What is TSP?", icon:"🗺️",
    body:`The Travelling Salesman Problem (TSP) asks:\n\n"Given a list of cities, what is the shortest route that visits every city exactly once and returns to the start?"\n\nIt is one of the most famous problems in computer science — classified as NP-Hard, meaning no known algorithm solves it perfectly in polynomial time for large inputs.`,
  },
  {
    title:"Your Mission", icon:"🎯",
    body:`You are a wandering merchant trying to trade with every city.\n\n① Click any city to set it as your START.\n② Click each remaining city in order to build your route.\n③ When all cities are visited, click START again to close the loop.\n\nYour path draws in real time — try to avoid crossing your own lines!`,
  },
  {
    title:"The Algorithms", icon:"🤖",
    body:`After you finish, two real algorithms will solve the same map:\n\n🔵 Nearest Neighbour (Greedy)\nAlways picks the closest unvisited city. Fast — O(n²) — but often not optimal.\n\n🟢 2-Opt Improvement\nStarts from the greedy route and repeatedly un-crosses edges until no swap improves the distance. Much closer to optimal!`,
  },
  {
    title:"Scoring & Tips", icon:"💡",
    body:`Your Efficiency Score = (best algorithm distance ÷ your distance) × 100%\n\n95%+ → Legendary 🏆\n85%+ → Excellent ⭐\n70%+ → Good Job 👍\n\nPro tips:\n• Plan ahead — look for a rough loop before clicking\n• On Easy, faint lines show all possible edges\n• Use ↩ UNDO to fix mistakes\n• Press ESC or ⏸ to pause anytime`,
  },
];

function TutorialModal({ onClose, onPlay }: TutorialModalProps) {
  const [step, setStep] = useState(0);
  const cur = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  return (
    <Overlay zIndex={30}>
      <div style={{
        width:"min(92vw,520px)",
        background:"linear-gradient(160deg,#0c0c28 0%,#080818 100%)",
        border:"1px solid #2a2a5a", borderRadius:12,
        padding:"32px 30px 26px",
        boxShadow:"0 0 60px rgba(192,132,252,0.18)",
        fontFamily:"'Courier New',monospace",
      }}>
        {/* Progress dots */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:22 }}>
          {TUTORIAL_STEPS.map((_,i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width:i===step?24:8, height:8, borderRadius:4,
              background:i===step?"#c084fc":"#222248",
              cursor:"pointer", transition:"all 0.3s",
            }}/>
          ))}
        </div>
        {/* Icon + title */}
        <div style={{ textAlign:"center", marginBottom:18 }}>
          <div style={{ fontSize:"2.2rem", marginBottom:10 }}>{cur.icon}</div>
          <div style={{ fontSize:"1rem", fontWeight:700, color:"#f0abfc", letterSpacing:"0.12em" }}>{cur.title}</div>
        </div>
        {/* Body */}
        <div style={{
          fontSize:"0.7rem", color:"#8888cc", lineHeight:2.0,
          background:"rgba(16,16,48,0.6)", borderRadius:8,
          padding:"16px 18px", marginBottom:22,
          minHeight:160, whiteSpace:"pre-line",
          border:"1px solid #1a1a3a",
        }}>
          {cur.body}
        </div>
        {/* Navigation */}
        <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center" }}>
          <GlowBtn small outline color="#4040a0" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()}>
            {step===0?"✕ Close":"← Back"}
          </GlowBtn>
          <span style={{ fontSize:"0.58rem", color:"#2a2a6a", letterSpacing:"0.1em" }}>
            {step+1} / {TUTORIAL_STEPS.length}
          </span>
          {isLast
            ? <GlowBtn small color="#a8ff78" onClick={onPlay}>▶ Play Now</GlowBtn>
            : <GlowBtn small onClick={() => setStep(s=>s+1)}>Next →</GlowBtn>
          }
        </div>
      </div>
    </Overlay>
  );
}

// ─── Start Menu ───────────────────────────────────────────────────────────────
function StartMenu({ onStart, onTutorial, level, setLevel }: StartMenuProps) {
  const levelInfo: Record<LevelKey, LevelInfo> = {
    easy:   { cities:LEVELS.easy,   desc:"All edges shown. Perfect for beginners.", color:"#a8ff78" },
    medium: { cities:LEVELS.medium, desc:"The classic challenge. No hints.",        color:"#78c8ff" },
    hard:   { cities:LEVELS.hard,   desc:"Dense map for algorithm veterans.",       color:"#ff7878" },
  };
  return (
    <div style={{
      minHeight:"100vh", background:"#06060f",
      backgroundImage:"radial-gradient(ellipse at 30% 60%, #0d0d2b 0%, #06060f 65%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"'Courier New',monospace", color:"#e0e0ff",
      position:"relative", overflow:"hidden",
    }}>
      <Stars/>
      {/* Decorative grid */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.05, pointerEvents:"none" }}>
        {Array.from({length:12},(_,i)=><line key={`h${i}`} x1="0" y1={`${i*9}%`} x2="100%" y2={`${i*9}%`} stroke="#6060ff" strokeWidth="0.5"/>)}
        {Array.from({length:16},(_,i)=><line key={`v${i}`} x1={`${i*7}%`} y1="0" x2={`${i*7}%`} y2="100%" stroke="#6060ff" strokeWidth="0.5"/>)}
      </svg>

      <div style={{ position:"relative", zIndex:1, textAlign:"center", width:"min(92vw,480px)", padding:"0 16px" }}>
        {/* Header */}
        <div style={{ fontSize:"0.6rem", color:"#3a3a6a", letterSpacing:"0.28em", marginBottom:10 }}>
          DAA · DESIGN &amp; ANALYSIS OF ALGORITHMS
        </div>
        <div style={{ fontSize:"clamp(1.8rem,5vw,2.8rem)", fontWeight:900, letterSpacing:"0.07em", lineHeight:1.1, marginBottom:8 }}>
          <span style={{ color:"#c084fc", textShadow:"0 0 30px rgba(192,132,252,0.6)" }}>WANDERING</span>
          <br/>
          <span style={{ color:"#f0abfc" }}>MERCHANT</span>
        </div>
        <div style={{ fontSize:"0.58rem", color:"#3a3a6a", letterSpacing:"0.2em", marginBottom:40 }}>
          TRAVELLING SALESMAN PROBLEM · INTERACTIVE VISUALIZER
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom:30 }}>
          <div style={{ fontSize:"0.52rem", color:"#3a3a6a", letterSpacing:"0.22em", marginBottom:12 }}>
            SELECT DIFFICULTY
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            {(Object.entries(levelInfo) as [LevelKey, LevelInfo][]).map(([key, info]) => (
              <div key={key} onClick={() => setLevel(key)} style={{
                flex:1, minWidth:120, maxWidth:150,
                padding:"14px 10px", borderRadius:8, cursor:"pointer",
                border:`1.5px solid ${level===key ? info.color : "#1a1a3a"}`,
                background: level===key ? `${info.color}12` : "transparent",
                boxShadow: level===key ? `0 0 16px ${info.color}20` : "none",
                transition:"all 0.2s",
              }}>
                <div style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
                  color: level===key ? info.color : "#404070", marginBottom:6 }}>{key}</div>
                <div style={{ fontSize:"1.4rem", fontWeight:900, color: level===key ? info.color : "#282860", marginBottom:4 }}>
                  {info.cities}
                </div>
                <div style={{ fontSize:"0.52rem", color:"#2a2a60", letterSpacing:"0.05em", lineHeight:1.6 }}>
                  {info.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
          <GlowBtn onClick={onStart}>▶ &nbsp; Start Game</GlowBtn>
          <GlowBtn outline color="#7878b0" onClick={onTutorial}>? &nbsp; How to Play</GlowBtn>
        </div>

        <div style={{ marginTop:36, fontSize:"0.52rem", color:"#222248", letterSpacing:"0.1em", lineHeight:2 }}>
          ALGORITHMS USED: NEAREST NEIGHBOUR · 2-OPT IMPROVEMENT<br/>
          TSP IS NP-HARD · O(N!) BRUTE FORCE COMPLEXITY
        </div>
      </div>
    </div>
  );
}

// ─── Pause Menu ───────────────────────────────────────────────────────────────
function PauseMenu({ onResume, onRestart, onMainMenu, elapsed, citiesVisited, totalCities }: PauseMenuProps) {
  const fmt = (s: number): string => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  return (
    <Overlay zIndex={25}>
      <div style={{
        width:"min(88vw,380px)",
        background:"linear-gradient(160deg,#0c0c28,#080818)",
        border:"1px solid #2a2a5a", borderRadius:12,
        padding:"36px 30px",
        boxShadow:"0 0 60px rgba(192,132,252,0.15)",
        fontFamily:"'Courier New',monospace", textAlign:"center",
      }}>
        <div style={{ fontSize:"2.2rem", marginBottom:8 }}>⏸</div>
        <div style={{ fontSize:"1.1rem", fontWeight:700, color:"#f0abfc", letterSpacing:"0.2em", marginBottom:4 }}>
          PAUSED
        </div>
        <div style={{ fontSize:"0.55rem", color:"#3a3a6a", letterSpacing:"0.18em", marginBottom:28 }}>
          GAME IS PAUSED · BREATHE
        </div>

        {/* Stats */}
        <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:28 }}>
          {[
            { label:"TIME",      val: fmt(elapsed) },
            { label:"VISITED",   val: `${citiesVisited}/${totalCities}` },
            { label:"LEFT",      val: totalCities-citiesVisited },
          ].map(s => (
            <div key={s.label} style={{
              background:"rgba(16,16,48,0.7)", border:"1px solid #1a1a3a",
              borderRadius:6, padding:"10px 14px", flex:1,
            }}>
              <div style={{ fontSize:"0.48rem", color:"#3a3a6a", letterSpacing:"0.15em", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:"1rem", color:"#c084fc", fontWeight:700 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
          <GlowBtn onClick={onResume} color="#a8ff78">▶ Resume Game</GlowBtn>
          <GlowBtn outline color="#78c8ff" onClick={onRestart}>↺ Restart Level</GlowBtn>
          <GlowBtn outline color="#5050a0" onClick={onMainMenu}>⌂ Main Menu</GlowBtn>
        </div>

        <div style={{ marginTop:22, fontSize:"0.52rem", color:"#222248", letterSpacing:"0.12em" }}>
          PRESS ESC TO RESUME
        </div>
      </div>
    </Overlay>
  );
}

// ─── MAIN GAME ────────────────────────────────────────────────────────────────
export default function WanderingMerchant() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgSize, setSvgSize] = useState<SvgSize>({ W:700, H:440 });
  const [cities, setCities] = useState<City[]>([]);
  const [playerTour, setPlayerTour] = useState<Tour>([]);
  const [phase, setPhase] = useState<PhaseValue>(PHASE.MENU);
  const [level, setLevel] = useState<LevelKey>("medium");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const clearGameTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseGame = useCallback(() => {
    clearGameTimer();
    setPhase(PHASE.PAUSED);
  }, [clearGameTimer]);

  const resumeGame = useCallback(() => {
    setPhase(PHASE.PLAYING);
    timerRef.current = setInterval(() => setElapsed((e) => e+1), 1000);
  }, []);

  // ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key==="Escape") {
        if (phase===PHASE.PLAYING) pauseGame();
        else if (phase===PHASE.PAUSED) resumeGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pauseGame, resumeGame]);

  // SVG responsive sizing
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById("svg-container");
      if (el) { const w = el.clientWidth; setSvgSize({ W:w, H:Math.round(w*0.6) }); }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  const startGame = useCallback((lvl?: LevelKey) => {
    const useLvl = lvl || level;
    const { W, H } = svgSize;
    const n = LEVELS[useLvl];
    const newCities = generateCities(n, W, H);
    setCities(newCities);
    setPlayerTour([]);
    setElapsed(0);
    setResults(null);
    setAnimStep(0);
    setPhase(PHASE.PLAYING);
    clearGameTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e+1), 1000);
  }, [clearGameTimer, svgSize, level]);

  useEffect(() => () => clearGameTimer(), [clearGameTimer]);
  const goMenu = () => {
    clearGameTimer();
    setPhase(PHASE.MENU);
    setCities([]); setPlayerTour([]); setResults(null);
  };

  const handleCityClick = (id: number) => {
    if (phase!==PHASE.PLAYING) return;
    if (playerTour.includes(id)) {
      if (id===playerTour[0] && playerTour.length===cities.length) finishGame([...playerTour, playerTour[0]]);
      return;
    }
    const newTour = [...playerTour, id];
    setPlayerTour(newTour);
    if (newTour.length===cities.length) setTimeout(() => finishGame([...newTour, newTour[0]]), 400);
  };

  const undoLast = () => {
    if (phase!==PHASE.PLAYING || playerTour.length===0) return;
    setPlayerTour((t) => t.slice(0,-1));
  };

  const finishGame = (completedTour: Tour) => {
    clearGameTimer();
    const greedy = nearestNeighbour(cities);
    const optimized = twoOpt([...greedy], cities);
    const playerD = totalDist(completedTour.slice(0,-1), cities);
    const greedyD = totalDist(greedy, cities);
    const optD = totalDist(optimized, cities);
    setResults({
      playerTour: completedTour, playerDist: playerD,
      greedyTour:[...greedy, greedy[0]], greedyDist: greedyD,
      optTour:[...optimized, optimized[0]], optDist: optD,
      score: Math.round((optD / playerD) * 100),
    });
    setPhase(PHASE.DONE);
    setTimeout(() => { setPhase(PHASE.REVEAL); setAnimStep(1); }, 600);
  };

  useEffect(() => {
    if (phase===PHASE.REVEAL && animStep<3) {
      const t = setTimeout(() => setAnimStep((s) => s+1), 900);
      return () => clearTimeout(t);
    }
  }, [phase, animStep]);

  const fmt = (s: number): string => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const scoreLabel = (s: number): ScoreLabel => {
    if (s>=95) return { text:"LEGENDARY 🏆",  color:"#ffd700" };
    if (s>=85) return { text:"EXCELLENT ⭐",  color:"#a8ff78" };
    if (s>=70) return { text:"GOOD JOB 👍",   color:"#78c8ff" };
    if (s>=55) return { text:"DECENT",        color:"#ffb347" };
    return           { text:"KEEP TRYING",    color:"#ff7878" };
  };

  const drawPath = (tour: Tour, color: string, opacity = 1, dasharray = "none", strokeW = 2): ReactNode => {
    if (tour.length<2) return null;
    const pts = tour.map((id) => `${cities[id].x},${cities[id].y}`).join(" ");
    return <polyline points={pts} fill="none" stroke={color} strokeWidth={strokeW}
      strokeOpacity={opacity} strokeDasharray={dasharray} strokeLinejoin="round" strokeLinecap="round"/>;
  };

  const { W, H } = svgSize;
  const isPlaying = phase===PHASE.PLAYING;
  const isDone = phase===PHASE.DONE || phase===PHASE.REVEAL;
  const showGreedy = phase===PHASE.REVEAL && animStep>=2;
  const showOpt    = phase===PHASE.REVEAL && animStep>=3;

  // ── MENU SCREEN ─────────────────────────────────────────────────────────────
  if (phase===PHASE.MENU) {
    return (
      <>
        <StartMenu
          onStart={() => startGame()}
          onTutorial={() => setShowTutorial(true)}
          level={level} setLevel={setLevel}
        />
        {showTutorial && (
          <TutorialModal
            onClose={() => setShowTutorial(false)}
            onPlay={() => { setShowTutorial(false); startGame(); }}
          />
        )}
      </>
    );
  }

  // ── GAME SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh", background:"#06060f",
      backgroundImage:"radial-gradient(ellipse at 20% 50%, #0d0d2b 0%, #06060f 60%)",
      fontFamily:"'Courier New',monospace", color:"#e0e0ff",
      display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:48,
    }}>

      {/* PAUSE OVERLAY */}
      {phase===PHASE.PAUSED && (
        <PauseMenu
          onResume={resumeGame}
          onRestart={() => startGame()}
          onMainMenu={goMenu}
          elapsed={elapsed}
          citiesVisited={playerTour.length}
          totalCities={cities.length}
        />
      )}

      {/* TUTORIAL OVERLAY (in-game) */}
      {showTutorial && (
        <TutorialModal
          onClose={() => { setShowTutorial(false); if (isPlaying) {} }}
          onPlay={() => { setShowTutorial(false); }}
        />
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        width:"100%", padding:"11px 18px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid #111130",
        background:"rgba(6,6,20,0.92)", backdropFilter:"blur(8px)",
        boxSizing:"border-box", flexWrap:"wrap", gap:8,
        position:"sticky", top:0, zIndex:10,
      }}>
        {/* Left */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={goMenu} style={{
            background:"transparent", border:"1px solid #1a1a44",
            color:"#4040a0", fontSize:"0.58rem", letterSpacing:"0.14em",
            padding:"5px 12px", borderRadius:4, cursor:"pointer",
            fontFamily:"'Courier New',monospace",
          }}>⌂ MENU</button>
          <div>
            <div style={{ fontSize:"0.88rem", fontWeight:700, color:"#c084fc", letterSpacing:"0.1em" }}>
              ◈ WANDERING MERCHANT
            </div>
            <div style={{ fontSize:"0.48rem", color:"#2a2a6a", letterSpacing:"0.16em" }}>
              TSP VISUALIZER · {level.toUpperCase()} MODE
            </div>
          </div>
        </div>

        {/* Center stats */}
        <div style={{ display:"flex", gap:18, alignItems:"center" }}>
          {[
            { label:"TIME",    val:fmt(elapsed),                    show:true },
            { label:"VISITED", val:`${playerTour.length}/${cities.length}`, show:!isDone },
          ].filter(s=>s.show).map(s=>(
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"0.46rem", color:"#3030a0", letterSpacing:"0.14em" }}>{s.label}</div>
              <div style={{ fontSize:"0.9rem", color:"#f0abfc", fontWeight:700 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {isPlaying && playerTour.length>0 && (
            <button onClick={undoLast} style={{
              background:"transparent", border:"1px solid #2a2a5a",
              color:"#6060a0", fontSize:"0.58rem", padding:"5px 12px",
              borderRadius:4, cursor:"pointer", letterSpacing:"0.1em",
              fontFamily:"'Courier New',monospace",
            }}>↩ UNDO</button>
          )}
          <button onClick={() => setShowTutorial(true)} style={{
            background:"transparent", border:"1px solid #1a1a44",
            color:"#3a3a80", fontSize:"0.58rem", padding:"5px 12px",
            borderRadius:4, cursor:"pointer", letterSpacing:"0.1em",
            fontFamily:"'Courier New',monospace",
          }}>? HELP</button>
          {isPlaying && (
            <button onClick={pauseGame} title="Pause (ESC)" style={{
              background:"rgba(192,132,252,0.1)", border:"1.5px solid #c084fc",
              color:"#c084fc", fontSize:"0.62rem", padding:"5px 16px",
              borderRadius:4, cursor:"pointer", letterSpacing:"0.12em",
              fontFamily:"'Courier New',monospace", fontWeight:700,
            }}>⏸ PAUSE</button>
          )}
          {isDone && (
            <button onClick={() => startGame()} style={{
              background:"rgba(168,255,120,0.1)", border:"1.5px solid #a8ff78",
              color:"#a8ff78", fontSize:"0.62rem", padding:"5px 16px",
              borderRadius:4, cursor:"pointer", letterSpacing:"0.12em",
              fontFamily:"'Courier New',monospace", fontWeight:700,
            }}>↺ RETRY</button>
          )}
        </div>
      </div>

      {/* ── MAP ── */}
      <div id="svg-container" style={{
        width:"min(96vw,780px)", marginTop:16,
        borderRadius:8, border:"1px solid #111130",
        background:"rgba(5,5,18,0.98)",
        boxShadow:"0 0 40px rgba(192,132,252,0.06), inset 0 0 60px rgba(0,0,20,0.4)",
        position:"relative", overflow:"hidden",
      }}>
        <Stars/>
        {/* Grid overlay */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.055, pointerEvents:"none" }}>
          {Array.from({length:9},(_,i)=><line key={`h${i}`} x1="0" y1={`${i*13}%`} x2="100%" y2={`${i*13}%`} stroke="#5050ff" strokeWidth="0.5"/>)}
          {Array.from({length:12},(_,i)=><line key={`v${i}`} x1={`${i*10}%`} y1="0" x2={`${i*10}%`} y2="100%" stroke="#5050ff" strokeWidth="0.5"/>)}
        </svg>

        <svg ref={svgRef} width={W} height={H} style={{ display:"block", cursor:isPlaying?"crosshair":"default" }}>
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow2"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          {/* Full graph hint (easy mode only) */}
          {isPlaying && level==="easy" && cities.map((a,i) =>
            cities.slice(i+1).map((b,j) => (
              <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#2020aa" strokeWidth="0.5" strokeOpacity="0.22"/>
            ))
          )}

          {/* Algorithm paths */}
          {showGreedy && results && drawPath(results.greedyTour, "#38bdf8", 0.7, "6 3", 2)}
          {showOpt    && results && drawPath(results.optTour, "#a8ff78", 0.9, "none", 2.5)}

          {/* Player path */}
          {(isPlaying||isDone) && drawPath(
            isDone && results ? results.playerTour : [...playerTour],
            "#f0abfc", isDone?0.45:1, "none", isDone?1.5:2.5
          )}

          {/* Cities */}
          {cities.map((c,i) => {
            const isVisited = playerTour.includes(i);
            const isFirst = playerTour[0]===i;
            const isHov = hovered===i;
            const canClose = isFirst && playerTour.length===cities.length && isPlaying;
            const orderNum = isVisited && !isFirst ? playerTour.indexOf(i)+1 : null;
            return (
              <g key={i}
                onClick={() => handleCityClick(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor:isPlaying?"pointer":"default" }}
                filter={isHov||isFirst?"url(#glow2)":"url(#glow)"}
              >
                {isFirst && isPlaying && (
                  <circle cx={c.x} cy={c.y} r={13} fill="none"
                    stroke={canClose?"#a8ff78":"#f0abfc"} strokeWidth={1.5} strokeOpacity={0.5}>
                    <animate attributeName="r" values={canClose?"13;20;13":"11;16;11"} dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.7;0.15;0.7" dur="1.6s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle cx={c.x} cy={c.y} r={isHov?11:8}
                  fill={isVisited?"#6d28d9":isDone?"#181832":"#08081e"}
                  stroke={isFirst?(canClose?"#a8ff78":"#f0abfc"):isVisited?"#a855f7":isHov?"#c084fc":"#22226a"}
                  strokeWidth={isFirst?2.5:1.8}
                  style={{ transition:"r 0.12s, fill 0.2s" }}
                />
                {orderNum && (
                  <text x={c.x} y={c.y+4} textAnchor="middle" fontSize="9"
                    fill="white" fontWeight="bold" fontFamily="'Courier New',monospace">{orderNum}</text>
                )}
                {isFirst && (
                  <text x={c.x} y={c.y+4} textAnchor="middle" fontSize="9"
                    fill={canClose?"#a8ff78":"#f0abfc"} fontWeight="bold"
                    fontFamily="'Courier New',monospace">S</text>
                )}
                <text x={c.x} y={c.y+23} textAnchor="middle" fontSize="8.5"
                  fill={isVisited?"#8855cc":"#282860"}
                  letterSpacing="0.04em" fontFamily="'Courier New',monospace">
                  {CITY_NAMES[i]}
                </text>
              </g>
            );
          })}

          {/* Closing dashed preview */}
          {isPlaying && playerTour.length===cities.length && cities.length>0 && (
            <line
              x1={cities[playerTour[playerTour.length-1]]?.x}
              y1={cities[playerTour[playerTour.length-1]]?.y}
              x2={cities[playerTour[0]]?.x}
              y2={cities[playerTour[0]]?.y}
              stroke="#a8ff78" strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.7}
            />
          )}
        </svg>

        {/* HUD prompts */}
        {isPlaying && playerTour.length===0 && (
          <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
            fontSize:"0.56rem", color:"#3a3a7a", letterSpacing:"0.14em", pointerEvents:"none",
            background:"rgba(5,5,18,0.8)", padding:"5px 16px", borderRadius:20, border:"1px solid #111130",
          }}>
            CLICK ANY CITY TO BEGIN YOUR ROUTE
          </div>
        )}
        {isPlaying && playerTour.length>0 && playerTour.length<cities.length && (
          <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
            fontSize:"0.56rem", color:"#4a4a90", letterSpacing:"0.14em", pointerEvents:"none",
            background:"rgba(5,5,18,0.8)", padding:"5px 16px", borderRadius:20, border:"1px solid #111130",
          }}>
            {cities.length-playerTour.length} CITIES REMAINING · ESC TO PAUSE
          </div>
        )}
        {isPlaying && playerTour.length===cities.length && (
          <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
            fontSize:"0.6rem", color:"#a8ff78", letterSpacing:"0.14em", pointerEvents:"none",
            background:"rgba(5,5,18,0.9)", padding:"6px 18px", borderRadius:20,
            border:"1px solid #a8ff7844", boxShadow:"0 0 14px #a8ff7820",
          }}>
            ↩ CLICK THE [S] START CITY TO CLOSE THE LOOP
          </div>
        )}
      </div>

      {/* ── LEGEND ── */}
      {phase===PHASE.REVEAL && (
        <div style={{ display:"flex", gap:22, marginTop:12, fontSize:"0.6rem",
          color:"#444488", letterSpacing:"0.1em", flexWrap:"wrap", justifyContent:"center" }}>
          <span><span style={{ color:"#f0abfc" }}>━━</span> YOUR ROUTE</span>
          {showGreedy && <span><span style={{ color:"#38bdf8" }}>╌╌</span> NEAREST NEIGHBOUR</span>}
          {showOpt    && <span><span style={{ color:"#a8ff78" }}>━━</span> 2-OPT OPTIMIZED</span>}
        </div>
      )}

      {/* ── RESULTS PANEL ── */}
      {results && phase===PHASE.REVEAL && animStep>=1 && (
        <div style={{
          marginTop:18, width:"min(96vw,780px)",
          background:"rgba(5,5,18,0.98)", border:"1px solid #111130",
          borderRadius:8, padding:"24px 22px", boxSizing:"border-box",
        }}>
          {/* Score */}
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:"0.52rem", color:"#3030a0", letterSpacing:"0.25em", marginBottom:8 }}>
              EFFICIENCY SCORE
            </div>
            <div style={{
              fontSize:"clamp(2.4rem,7vw,3.4rem)", fontWeight:900,
              color:scoreLabel(results.score).color,
              textShadow:`0 0 28px ${scoreLabel(results.score).color}`, lineHeight:1,
            }}>
              {results.score}%
            </div>
            <div style={{ fontSize:"0.72rem", letterSpacing:"0.22em",
              color:scoreLabel(results.score).color, marginTop:6, opacity:0.85 }}>
              {scoreLabel(results.score).text}
            </div>
            <div style={{ fontSize:"0.56rem", color:"#333370", marginTop:6 }}>
              Completed in {fmt(elapsed)}
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:18 }}>
            {[
              { label:"YOUR DISTANCE",  val:results.playerDist.toFixed(1), color:"#f0abfc", sub:"Manual route" },
              { label:"GREEDY (NN)",    val:results.greedyDist.toFixed(1), color:"#38bdf8", sub:"Nearest Neighbour" },
              { label:"2-OPT",         val:results.optDist.toFixed(1),    color:"#a8ff78", sub:"Best approximation" },
            ].map(s => (
              <div key={s.label} style={{
                background:"rgba(12,12,36,0.8)", border:`1px solid ${s.color}20`,
                borderTop:`2px solid ${s.color}`, borderRadius:6, padding:"14px 16px",
              }}>
                <div style={{ fontSize:"0.48rem", color:"#303070", letterSpacing:"0.18em", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:"1.5rem", color:s.color, fontWeight:900 }}>{s.val}</div>
                <div style={{ fontSize:"0.5rem", color:"#252558", marginTop:4, letterSpacing:"0.1em" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Algorithm insight */}
          <div style={{
            padding:"16px 18px", background:"rgba(12,12,36,0.6)",
            borderRadius:6, border:"1px solid #111130", marginBottom:20,
          }}>
            <div style={{ fontSize:"0.5rem", color:"#3030a0", letterSpacing:"0.2em", marginBottom:10 }}>ALGORITHM INSIGHT</div>
            <div style={{ fontSize:"0.67rem", color:"#6666aa", lineHeight:2.1 }}>
              <span style={{ color:"#38bdf8" }}>Nearest Neighbour</span> greedily picks the closest unvisited city — O(n²), fast but suboptimal.{"  "}
              <span style={{ color:"#a8ff78" }}>2-Opt</span> improves it by repeatedly swapping edges to eliminate crossings — much better quality.{"  "}
              True TSP is <span style={{ color:"#c084fc" }}>NP-Hard</span>: with {cities.length} cities there are {cities.length}! ≈ <em>{cities.length < 20 ? factorial(cities.length).toLocaleString() : "billions"}</em> possible routes.
            </div>
          </div>

          {/* CTA */}
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <GlowBtn onClick={() => startGame()} color="#a8ff78">↺ Play Again</GlowBtn>
            <GlowBtn outline color="#c084fc" onClick={goMenu}>⌂ Main Menu</GlowBtn>
          </div>
        </div>
      )}

      <style>{`* { box-sizing:border-box; } body { margin:0; }`}</style>
    </div>
  );
}
