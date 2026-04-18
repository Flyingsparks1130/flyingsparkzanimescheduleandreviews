import { useState, useMemo, useEffect } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const TODAY = new Date("2026-04-18");

const STATUS = {
  watching:      { label: "Watching",      color: "#22d3ee", symbol: "▶" },
  completed:     { label: "Completed",     color: "#4ade80", symbol: "✓" },
  plan_to_watch: { label: "Plan to Watch", color: "#a78bfa", symbol: "◇" },
  on_hold:       { label: "On Hold",       color: "#fbbf24", symbol: "⏸" },
  dropped:       { label: "Dropped",       color: "#f87171", symbol: "✕" },
};

const SHOWS = [
  { id:1,  title:"Frieren: Beyond Journey's End",    status:"completed",     score:9.4, genre:"Fantasy",       studio:"Madhouse",          year:2023, premiereDate:"2023-09-29", episodes:28 },
  { id:2,  title:"Jujutsu Kaisen S2",                status:"completed",     score:9.0, genre:"Action",        studio:"MAPPA",             year:2023, premiereDate:"2023-07-06", episodes:23 },
  { id:3,  title:"Vinland Saga S2",                  status:"completed",     score:9.2, genre:"Historical",    studio:"MAPPA",             year:2023, premiereDate:"2023-01-10", episodes:24 },
  { id:4,  title:"Attack on Titan: The Final Bow",   status:"completed",     score:9.5, genre:"Action",        studio:"MAPPA",             year:2023, premiereDate:"2023-03-04", episodes:12 },
  { id:5,  title:"Demon Slayer: Swordsmith Village",  status:"completed",    score:8.9, genre:"Action",        studio:"ufotable",          year:2023, premiereDate:"2023-04-09", episodes:11 },
  { id:6,  title:"Oshi no Ko",                       status:"completed",     score:8.7, genre:"Drama",         studio:"Doga Kobo",         year:2023, premiereDate:"2023-04-12", episodes:11 },
  { id:7,  title:"Mushoku Tensei S2",                status:"completed",     score:8.8, genre:"Fantasy",       studio:"Studio Bind",       year:2023, premiereDate:"2023-07-02", episodes:12 },
  { id:8,  title:"Dungeon Meshi",                    status:"completed",     score:9.1, genre:"Fantasy",       studio:"Trigger",           year:2024, premiereDate:"2024-01-04", episodes:24 },
  { id:9,  title:"Dandadan",                         status:"completed",     score:8.6, genre:"Supernatural",  studio:"Science SARU",      year:2024, premiereDate:"2024-10-03", episodes:12 },
  { id:10, title:"Wind Breaker",                     status:"completed",     score:7.8, genre:"Sports",        studio:"CloverWorks",       year:2024, premiereDate:"2024-04-06", episodes:25 },
  { id:11, title:"Kaiju No. 8",                      status:"completed",     score:8.0, genre:"Action",        studio:"Production I.G",    year:2024, premiereDate:"2024-04-13", episodes:12 },
  { id:12, title:"Tower of God S2",                  status:"completed",     score:7.5, genre:"Fantasy",       studio:"Telecom Anim.",     year:2024, premiereDate:"2024-07-07", episodes:13 },
  { id:13, title:"My Hero Academia S7",              status:"dropped",       score:6.5, genre:"Action",        studio:"Bones",             year:2024, premiereDate:"2024-05-04", episodes:21 },
  { id:14, title:"Blue Lock S2",                     status:"watching",      score:8.4, genre:"Sports",        studio:"8-Bit",             year:2024, premiereDate:"2024-10-05", episodes:26 },
  { id:15, title:"Re:Zero S3",                       status:"watching",      score:8.7, genre:"Fantasy",       studio:"White Fox",         year:2024, premiereDate:"2024-10-02", episodes:25 },
  { id:16, title:"Monogatari: Off & Monster",        status:"watching",      score:8.5, genre:"Supernatural",  studio:"Shaft",             year:2024, premiereDate:"2024-10-05", episodes:13 },
  { id:17, title:"Shangri-La Frontier S2",           status:"watching",      score:8.1, genre:"Sci-Fi",        studio:"C2C",               year:2024, premiereDate:"2024-10-06", episodes:25 },
  { id:18, title:"Mahou Shoujo ni Akogarete",        status:"on_hold",       score:7.2, genre:"Comedy",        studio:"Asahi Production",  year:2024, premiereDate:"2024-01-05", episodes:12 },
  { id:19, title:"Yuzuki-san Yonkyoudai",            status:"on_hold",       score:7.9, genre:"Slice of Life", studio:"SynergySP",         year:2024, premiereDate:"2024-10-13", episodes:25 },
  { id:20, title:"Solo Leveling S2",                 status:"watching",      score:8.2, genre:"Action",        studio:"A-1 Pictures",      year:2025, premiereDate:"2025-01-05", episodes:13 },
  { id:21, title:"Sakamoto Days",                    status:"watching",      score:8.5, genre:"Action",        studio:"TMS Entertainment", year:2025, premiereDate:"2025-01-11", episodes:24 },
  { id:22, title:"Neon Genesis Evangelion",          status:"completed",     score:9.0, genre:"Mecha",         studio:"Gainax",            year:2019, premiereDate:"2019-06-21", episodes:26 },
  { id:23, title:"Sousou no Frieren Movie",          status:"plan_to_watch", score:0,   genre:"Fantasy",       studio:"Madhouse",          year:2025, premiereDate:"2025-04-20", episodes:1  },
  { id:24, title:"Re:Zero S3 Part 2",                status:"plan_to_watch", score:0,   genre:"Fantasy",       studio:"White Fox",         year:2025, premiereDate:"2025-04-02", episodes:13 },
  { id:25, title:"Bleach: TYBW Final",               status:"plan_to_watch", score:0,   genre:"Action",        studio:"Pierrot",           year:2025, premiereDate:"2025-07-04", episodes:13 },
  { id:26, title:"Spy x Family S3",                  status:"plan_to_watch", score:0,   genre:"Comedy",        studio:"Wit Studio",        year:2025, premiereDate:"2025-07-12", episodes:12 },
  { id:27, title:"Chainsaw Man S2",                  status:"plan_to_watch", score:0,   genre:"Action",        studio:"MAPPA",             year:2025, premiereDate:"2025-10-01", episodes:12 },
  { id:28, title:"Kimi no Na wa 2",                  status:"plan_to_watch", score:0,   genre:"Romance",       studio:"CoMix Wave",        year:2025, premiereDate:"2025-05-01", episodes:1  },
];

function episodesBin(n) {
  if (n <= 1) return "Film";
  if (n <= 13) return "Short (≤13)";
  if (n <= 26) return "Medium (14–26)";
  return "Long (26+)";
}
function seasonOf(d) {
  const m = new Date(d).getMonth() + 1;
  if (m <= 3) return "Winter";
  if (m <= 6) return "Spring";
  if (m <= 9) return "Summer";
  return "Fall";
}
function getXVal(show, xAxis) {
  if (xAxis === "episodes") return episodesBin(show.episodes);
  if (xAxis === "season")   return seasonOf(show.premiereDate);
  if (xAxis === "status")   return STATUS[show.status]?.label || show.status;
  return String(show[xAxis]);
}

const XAXIS_OPTIONS = [
  { id: "genre",    label: "Genre" },
  { id: "studio",   label: "Studio" },
  { id: "year",     label: "Year" },
  { id: "status",   label: "Status" },
  { id: "episodes", label: "Length" },
  { id: "season",   label: "Season" },
];
const SCORE_BUCKETS = [
  { key: "u7",  label: "≤7.0", test: s => s.score < 7 },
  { key: "78",  label: "7–8",  test: s => s.score >= 7 && s.score < 8 },
  { key: "89",  label: "8–9",  test: s => s.score >= 8 && s.score < 9 },
  { key: "9p",  label: "9+",   test: s => s.score >= 9 },
];
const FIXED_ORDER = {
  season:   ["Winter", "Spring", "Summer", "Fall"],
  episodes: ["Film", "Short (≤13)", "Medium (14–26)", "Long (26+)"],
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#080a10;--bg2:#0d1018;--bg3:#131620;--bg4:#191d28;--border:#1a1e2c;--border2:#232840;--text:#d8e0f0;--text2:#6b7590;--text3:#343a52;--accent:#7c6af7;--accent2:#f06595;--r:10px}
html,body,#root{height:100%;overflow:hidden}
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
.app{height:100vh;display:flex;flex-direction:column;overflow:hidden}
.app-body{flex:1;display:flex;overflow:hidden}
.main-area{flex:1;overflow-y:auto;overflow-x:hidden}
.nav{height:50px;display:flex;align-items:center;padding:0 1.5rem;gap:.5rem;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0}
.nav-brand{display:flex;align-items:center;gap:.55rem;margin-right:1.25rem}
.nav-logo{width:26px;height:26px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:7px;display:grid;place-items:center;font-size:13px;flex-shrink:0}
.nav-name{font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;letter-spacing:-.02em}
.nav-tabs{display:flex;gap:2px}
.ntab{padding:.28rem .85rem;background:transparent;border:1px solid transparent;border-radius:6px;color:var(--text2);font-family:'Syne',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .1s}
.ntab:hover{color:var(--text);background:var(--bg3)}
.ntab.on{color:var(--text);background:var(--bg3);border-color:var(--border2)}
.nav-ct{margin-left:auto;font-size:.7rem;color:var(--text3)}
.sidebar{width:192px;flex-shrink:0;background:var(--bg2);border-left:1px solid var(--border);padding:1.1rem .9rem;display:flex;flex-direction:column;gap:.28rem;overflow-y:auto}
.sb-title{font-family:'Syne',sans-serif;font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);padding:0 .3rem .1rem}
.sf{display:flex;align-items:center;gap:.45rem;padding:.38rem .45rem;border-radius:7px;cursor:pointer;user-select:none;transition:background .1s}
.sf:hover{background:var(--bg3)}
.sf-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sf-lbl{flex:1;font-size:.79rem}
.sf-n{font-size:.7rem;color:var(--text3);font-variant-numeric:tabular-nums;min-width:16px;text-align:right}
.sf-cb{accent-color:var(--accent);cursor:pointer}
.sb-sep{height:1px;background:var(--border);margin:.3rem 0}
.sb-tot{padding:.4rem .45rem;background:var(--bg3);border-radius:7px;font-size:.77rem;color:var(--text2);text-align:center}
.sb-tot strong{color:var(--text)}
.ph{padding:1.4rem 1.6rem .9rem}
.ph h1{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:var(--text);letter-spacing:-.025em;margin-bottom:.15rem}
.ph p{font-size:.8rem;color:var(--text2)}

/* TIMELINE */
.tl-scroll{overflow-x:auto;padding:0 1.6rem 1.5rem}
.tl-slots{display:flex;min-width:max-content;position:relative}
.tl-slots::after{content:'';position:absolute;top:calc(284px + 19px);left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent2));z-index:0;pointer-events:none}
.tslot{width:208px;flex-shrink:0;display:flex;flex-direction:column}
.tslot-top{height:284px;padding:0 7px;display:flex;align-items:flex-end}
.tslot-conn{height:38px;display:flex;flex-direction:column;align-items:center;z-index:1}
.tslot-vl{flex:1;width:1px;background:var(--border2)}
.tslot-dot{width:11px;height:11px;border-radius:50%;border:2px solid var(--bg);flex-shrink:0}
.tslot-bottom{height:284px;padding:0 7px;display:flex;align-items:flex-start}
.today-slot{width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;z-index:2}
.today-top{height:284px;display:flex;align-items:flex-end;padding-bottom:3px}
.today-tag{font-family:'Syne',sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#f06595;background:rgba(240,101,149,.1);border:1px solid rgba(240,101,149,.25);padding:2px 5px;border-radius:4px;white-space:nowrap}
.today-conn{height:38px;display:flex;flex-direction:column;align-items:center;z-index:3}
.today-vlt{flex:1;width:2px;background:#f06595}
.today-cdot{width:11px;height:11px;border-radius:50%;background:#f06595;border:2px solid var(--bg);box-shadow:0 0 10px #f06595;flex-shrink:0}
.today-vlb{flex:1;width:2px;background:rgba(240,101,149,.3)}
.today-btm{height:284px}
.tcard{width:190px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r);overflow:hidden;cursor:default;transition:all .14s ease}
.tcard:hover{background:var(--bg4);transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.4)}
.tcard-img{width:100%;height:114px;object-fit:cover;object-position:top center;display:block}
.tcard-img-ph{width:100%;height:114px;display:flex;align-items:center;justify-content:center}
.tcard-body{padding:.55rem .7rem}
.tcard-dt{font-size:.62rem;color:var(--text3);margin-bottom:.28rem;letter-spacing:.01em}
.tcard-ti{font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;line-height:1.3;margin-bottom:.3rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tcard-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:.28rem}
.tcard-tag{font-size:.58rem;font-weight:600;padding:2px 5px;border-radius:3px;border:1px solid;letter-spacing:.02em}
.tcard-sc{font-size:.7rem;font-weight:600;color:#fbbf24}

/* ANALYTICS */
.analytics-page{padding:0 1.6rem 2rem}
.ctrl-bar{display:flex;align-items:center;gap:.5rem;padding:.65rem 1rem;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:1.1rem;flex-wrap:wrap}
.ctrl-lbl{font-size:.73rem;color:var(--text2);white-space:nowrap}
.ctrl-div{width:1px;height:18px;background:var(--border2);margin:0 .1rem;flex-shrink:0}
.cbtn{padding:.28rem .62rem;border:1px solid var(--border2);border-radius:5px;background:transparent;color:var(--text2);font-family:'Syne',sans-serif;font-size:.74rem;font-weight:700;cursor:pointer;transition:all .1s;white-space:nowrap}
.cbtn:hover{color:var(--text);border-color:var(--accent)}
.cbtn.on{color:var(--accent);border-color:var(--accent);background:rgba(124,106,247,.1)}
.cbtn.hm.on{color:var(--accent2);border-color:var(--accent2);background:rgba(240,101,149,.1)}
.ctrl-ct{margin-left:auto;font-size:.7rem;color:var(--text3);white-space:nowrap}
.scatter-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:1rem .75rem .5rem;margin-bottom:.9rem}

/* TOOLTIP */
.stt{background:#0e1119;border:1px solid var(--border2);border-radius:9px;min-width:205px;max-width:235px;box-shadow:0 8px 30px rgba(0,0,0,.6);overflow:hidden}
.stt-img{width:100%;height:96px;object-fit:cover;object-position:top center;display:block}
.stt-img-ph{width:100%;height:96px;display:flex;align-items:center;justify-content:center}
.stt-inner{padding:.65rem .85rem}
.stt-ti{font-family:'Syne',sans-serif;font-weight:700;font-size:.8rem;color:var(--text);margin-bottom:.42rem;line-height:1.3}
.stt-row{display:flex;justify-content:space-between;gap:1rem;font-size:.72rem;padding:.1rem 0}
.stt-row span{color:var(--text2)}
.stt-row strong{color:var(--text);font-weight:600}
.scatter-legend{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem}
.leg-item{display:flex;align-items:center;gap:5px;font-size:.73rem;color:var(--text2)}
.leg-dot{width:8px;height:8px;border-radius:50%}

/* HEATMAP */
.hm-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:1.1rem 1.4rem 1.2rem;margin-bottom:.9rem;overflow-x:auto}
.hm-title{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.85rem}
.hm-grid{display:grid;gap:4px}
.hm-ch{font-size:.7rem;color:var(--text3);text-align:center;padding:.25rem .15rem;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:.04em}
.hm-rh{font-size:.73rem;color:var(--text);display:flex;align-items:center;min-height:44px;padding-right:.55rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.hm-cell{height:44px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.77rem;font-weight:700;cursor:default;transition:transform .14s,box-shadow .14s;position:relative}
.hm-cell:hover{transform:scale(1.07);z-index:3;box-shadow:0 0 0 1px rgba(124,106,247,.5),0 4px 16px rgba(0,0,0,.35)}
.hm-tip{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:#0c0e16;border:1px solid var(--border2);border-radius:5px;padding:3px 8px;font-size:.67rem;font-weight:500;color:var(--text);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .1s;z-index:10}
.hm-cell:hover .hm-tip{opacity:1}
.hm-legend{display:flex;align-items:center;gap:.5rem;margin-top:.85rem;justify-content:flex-end}
.hm-bar{height:7px;width:100px;border-radius:4px;background:linear-gradient(90deg,rgba(124,106,247,.07),rgba(124,106,247,.85))}
.hm-lab{font-size:.67rem;color:var(--text3)}

/* INSIGHTS */
.insights-panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.insights-head{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.1rem;border-bottom:1px solid var(--border)}
.insights-head h2{font-family:'Syne',sans-serif;font-size:.92rem;font-weight:700;color:var(--text);margin-bottom:.1rem}
.insights-head p{font-size:.72rem;color:var(--text2)}
.ins-btn{padding:.38rem .9rem;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:6px;color:#fff;font-family:'Syne',sans-serif;font-size:.73rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .12s,transform .12s}
.ins-btn:hover{opacity:.9;transform:translateY(-1px)}
.ins-btn:disabled{opacity:.5;cursor:wait;transform:none}
.ins-body{padding:1.1rem;min-height:90px}
.ins-empty{font-size:.8rem;color:var(--text3);font-style:italic;text-align:center;padding:1.25rem 0}
.ins-text{font-size:.86rem;color:var(--text);line-height:1.75;white-space:pre-wrap}
.pulse{display:flex;gap:5px;align-items:center;justify-content:center;padding:1.25rem 0}
.pulse span{width:7px;height:7px;border-radius:50%;animation:pd 1.1s ease-in-out infinite}
.pulse span:nth-child(1){background:var(--accent)}
.pulse span:nth-child(2){background:#b870ce;animation-delay:.18s}
.pulse span:nth-child(3){background:var(--accent2);animation-delay:.36s}
@keyframes pd{0%,60%,100%{transform:scale(1);opacity:.5}30%{transform:scale(1.5);opacity:1}}

/* TOOLS */
.tools-page{padding:0 1.6rem 2rem}
.subtabs{display:flex;gap:2px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:3px;width:fit-content;margin-bottom:1.1rem}
.stab{padding:.3rem .9rem;background:transparent;border:1px solid transparent;border-radius:5px;color:var(--text2);font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .1s}
.stab:hover{color:var(--text)}
.stab.on{color:var(--text);background:var(--bg3);border-color:var(--border2)}
.cpanel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.cp-hero{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(124,106,247,.05),rgba(240,101,149,.05))}
.cp-icon{font-size:1.8rem}
.cp-hero h3{font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:.12rem}
.cp-hero p{font-size:.78rem;color:var(--text2)}
.cp-stats{display:flex;border-bottom:1px solid var(--border)}
.cp-stat{flex:1;padding:.85rem 1rem;text-align:center;border-right:1px solid var(--border)}
.cp-stat:last-child{border-right:none}
.cp-stat strong{display:block;font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;color:var(--text)}
.cp-stat span{font-size:.7rem;color:var(--text2)}
.cp-list{max-height:280px;overflow-y:auto}
.cp-row{display:flex;align-items:center;gap:.7rem;padding:.5rem 1.2rem;border-bottom:1px solid var(--border);transition:background .1s}
.cp-row:hover{background:var(--bg3)}
.cp-row:last-child{border-bottom:none}
.cp-thumb{width:34px;height:48px;border-radius:5px;object-fit:cover;object-position:top center;flex-shrink:0;display:block}
.cp-thumb-ph{width:34px;height:48px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-family:'Syne',sans-serif;font-weight:800;color:rgba(255,255,255,.22)}
.cp-info{flex:1;min-width:0}
.cp-ti{font-size:.79rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-dt{font-size:.68rem;color:var(--text3)}
.cp-st{font-size:.68rem;font-weight:700;flex-shrink:0}
.cp-foot{padding:.9rem 1.2rem;border-top:1px solid var(--border)}
.sync-btn{width:100%;padding:.62rem;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:7px;color:#fff;font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;letter-spacing:.02em;transition:opacity .12s,transform .12s}
.sync-btn:hover{opacity:.9;transform:translateY(-1px)}
.sync-btn:disabled{opacity:.5;cursor:wait;transform:none}
.exp-grid{display:grid;grid-template-columns:repeat(3,1fr)}
.exp-item{padding:1.5rem;display:flex;flex-direction:column;align-items:center;gap:.4rem;border-right:1px solid var(--border);cursor:pointer;transition:background .1s}
.exp-item:last-child{border-right:none}
.exp-item:hover{background:var(--bg3)}
.exp-icon{font-size:1.5rem}
.exp-lbl{font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;color:var(--text)}
.exp-desc{font-size:.68rem;color:var(--text2);text-align:center}
`;

export default function App() {
  const [page, setPage] = useState("timeline");
  const [statusFilter, setStatusFilter] = useState(new Set(Object.keys(STATUS)));
  const [xAxis, setXAxis] = useState("genre");
  const [heatmap, setHeatmap] = useState(false);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [calTab, setCalTab] = useState("sync");
  const [calSyncing, setCalSyncing] = useState(false);
  const [covers, setCovers] = useState({});

  // inject fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  // fetch covers from Jikan in batches (3 requests/1.1s for rate limit)
  useEffect(() => {
    let cancelled = false;
    async function fetchBatch(batch) {
      const pairs = await Promise.all(batch.map(async (show) => {
        try {
          const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(show.title)}&limit=1&sfw=true`);
          const d = await r.json();
          return [show.id, d.data?.[0]?.images?.jpg?.image_url ?? null];
        } catch { return [show.id, null]; }
      }));
      return Object.fromEntries(pairs.filter(([, v]) => v));
    }
    async function run() {
      for (let i = 0; i < SHOWS.length; i += 3) {
        if (cancelled) return;
        const partial = await fetchBatch(SHOWS.slice(i, i + 3));
        if (!cancelled) setCovers(prev => ({ ...prev, ...partial }));
        if (i + 3 < SHOWS.length && !cancelled) await new Promise(r => setTimeout(r, 1100));
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const filteredSorted = useMemo(() =>
    SHOWS.filter(s => statusFilter.has(s.status))
         .sort((a, b) => new Date(a.premiereDate) - new Date(b.premiereDate)),
    [statusFilter]
  );

  const timelineItems = useMemo(() => {
    const items = [];
    let todayAdded = false, si = 0;
    for (const show of filteredSorted) {
      if (!todayAdded && new Date(show.premiereDate) > TODAY) { items.push({ type: "today" }); todayAdded = true; }
      items.push({ type: "show", show, isTop: si % 2 === 0 });
      si++;
    }
    return items;
  }, [filteredSorted]);

  const scoredShows = useMemo(() =>
    SHOWS.filter(s => s.score > 0 && statusFilter.has(s.status)), [statusFilter]
  );

  const { plotData, xCategories, xDomain, xTickVals } = useMemo(() => {
    if (!scoredShows.length) return { plotData: [], xCategories: null, xDomain: [0, 1], xTickVals: [] };
    if (xAxis === "year") {
      const data = scoredShows.map(s => ({ ...s, px: s.year + (((s.id * 137 + 42) % 100) / 100) * 0.5 - 0.25, py: s.score }));
      const yrs = [...new Set(scoredShows.map(s => s.year))].sort((a, b) => a - b);
      return { plotData: data, xCategories: null, xDomain: [yrs[0] - 0.6, yrs[yrs.length - 1] + 0.6], xTickVals: yrs };
    }
    const vals = FIXED_ORDER[xAxis] ?? [...new Set(scoredShows.map(s => getXVal(s, xAxis)))].sort();
    const idx = Object.fromEntries(vals.map((v, i) => [v, i]));
    const data = scoredShows.map(s => {
      const xv = getXVal(s, xAxis);
      return { ...s, px: (idx[xv] ?? 0) + (((s.id * 97 + 13) % 100) / 100) * 0.5 - 0.25, py: s.score };
    });
    return { plotData: data, xCategories: vals, xDomain: [-0.6, vals.length - 0.4], xTickVals: vals.map((_, i) => i) };
  }, [scoredShows, xAxis]);

  const heatmapCats = useMemo(() => {
    if (FIXED_ORDER[xAxis]) return FIXED_ORDER[xAxis];
    if (xAxis === "year") return [...new Set(scoredShows.map(s => String(s.year)))].sort((a, b) => +a - +b);
    return [...new Set(scoredShows.map(s => getXVal(s, xAxis)))].sort();
  }, [scoredShows, xAxis]);

  const toggleStatus = key => setStatusFilter(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const getCover = (show) => covers[show.id] ?? null;
  const coverPh = (show) => { const c = STATUS[show.status]?.color ?? "#7c6af7"; return `linear-gradient(155deg,${c}32 0%,${c}08 100%)`; };

  async function generateInsights() {
    setInsightsLoading(true); setInsights("");
    try {
      const axisLabel = XAXIS_OPTIONS.find(o => o.id === xAxis)?.label ?? xAxis;
      const summary = scoredShows.map(s => `${s.title} | ${axisLabel}: ${getXVal(s, xAxis)} | score: ${s.score} | ${STATUS[s.status]?.label}`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `You're analyzing someone's anime watch list, displayed as a Score vs ${axisLabel} chart. Data:\n\n${summary}\n\nWrite 3–4 sharp, specific insights about their taste patterns. Name specific shows. Be direct, analytical, a little opinionated. Under 190 words.` }]
        })
      });
      const d = await res.json();
      setInsights(d.content?.find(b => b.type === "text")?.text ?? "No insights generated.");
    } catch { setInsights("Failed to reach Claude API."); }
    finally { setInsightsLoading(false); }
  }

  const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, SHOWS.filter(s => s.status === k).length]));
  const xLabel = XAXIS_OPTIONS.find(o => o.id === xAxis)?.label ?? xAxis;

  // ── Timeline Card ──
  const TCard = ({ show, isTop }) => {
    const cfg = STATUS[show.status];
    const cover = getCover(show);
    return (
      <div className="tcard" style={{ borderTop: isTop ? `2px solid ${cfg?.color}` : undefined, borderBottom: !isTop ? `2px solid ${cfg?.color}` : undefined }}>
        {cover
          ? <img className="tcard-img" src={cover} alt={show.title} loading="lazy" />
          : <div className="tcard-img-ph" style={{ background: coverPh(show) }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"2rem", color:cfg?.color, opacity:.22 }}>{show.title[0]}</span>
            </div>
        }
        <div className="tcard-body">
          <div className="tcard-dt">{show.premiereDate}</div>
          <div className="tcard-ti">{show.title}</div>
          <div className="tcard-row">
            <span className="tcard-tag" style={{ color:cfg?.color, borderColor:cfg?.color+"44", background:cfg?.color+"18" }}>{cfg?.symbol} {cfg?.label}</span>
            <span className="tcard-tag" style={{ color:"var(--text2)", borderColor:"var(--border2)", background:"var(--bg4)" }}>{show.genre}</span>
          </div>
          {show.score > 0 && <div className="tcard-sc">★ {show.score}</div>}
        </div>
      </div>
    );
  };

  // ── Heatmap ──
  const HeatmapView = () => {
    const maxCount = Math.max(1, ...heatmapCats.flatMap(cat =>
      SCORE_BUCKETS.map(b => scoredShows.filter(s => getXVal(s, xAxis) === cat && b.test(s)).length)
    ));
    const rowW = Math.min(165, Math.max(85, Math.max(...heatmapCats.map(c => c.length)) * 7.8 + 18));
    return (
      <div className="hm-wrap">
        <div className="hm-title">Score distribution · by {xLabel}</div>
        <div className="hm-grid" style={{ gridTemplateColumns: `${rowW}px repeat(${SCORE_BUCKETS.length}, 1fr)` }}>
          <div />
          {SCORE_BUCKETS.map(b => <div key={b.key} className="hm-ch">{b.label}</div>)}
          {heatmapCats.map(cat => [
            <div key={`${cat}-l`} className="hm-rh" title={cat}>{cat}</div>,
            ...SCORE_BUCKETS.map(b => {
              const n = scoredShows.filter(s => getXVal(s, xAxis) === cat && b.test(s)).length;
              const alpha = n > 0 ? 0.09 + (n / maxCount) * 0.82 : 0;
              const bright = n / maxCount > 0.52;
              return (
                <div key={`${cat}-${b.key}`} className="hm-cell"
                  style={{
                    background: n > 0 ? `rgba(124,106,247,${alpha})` : "var(--bg3)",
                    border: `1px solid ${n > 0 ? "rgba(124,106,247,.2)" : "transparent"}`,
                    color: bright ? "#0d0f1a" : (n > 0 ? "rgba(195,190,255,.9)" : "var(--text3)"),
                  }}>
                  {n > 0 && n}
                  <div className="hm-tip">{cat} · {b.label}: {n} show{n !== 1 ? "s" : ""}</div>
                </div>
              );
            })
          ])}
        </div>
        <div className="hm-legend">
          <span className="hm-lab">Fewer</span>
          <div className="hm-bar" />
          <span className="hm-lab">More</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo">⊚</div>
            <span className="nav-name">AnimeLens</span>
          </div>
          <div className="nav-tabs">
            {[["timeline","Timeline"],["analytics","Analytics"],["tools","Tools"]].map(([id, lbl]) => (
              <button key={id} className={`ntab${page === id ? " on" : ""}`} onClick={() => setPage(id)}>{lbl}</button>
            ))}
          </div>
          <span className="nav-ct">{SHOWS.length} shows tracked</span>
        </nav>

        <div className="app-body">
          <div className="main-area">

            {/* TIMELINE */}
            {page === "timeline" && (
              <div>
                <div className="ph">
                  <h1>My Anime Timeline</h1>
                  <p>{filteredSorted.length} shows · sorted by premiere date · scroll right →</p>
                </div>
                <div className="tl-scroll">
                  <div className="tl-slots">
                    {timelineItems.map((item) => {
                      if (item.type === "today") return (
                        <div key="today" className="today-slot">
                          <div className="today-top"><div className="today-tag">Today</div></div>
                          <div className="today-conn">
                            <div className="today-vlt" /><div className="today-cdot" /><div className="today-vlb" />
                          </div>
                          <div className="today-btm" />
                        </div>
                      );
                      const { show, isTop } = item;
                      return (
                        <div key={show.id} className="tslot">
                          <div className="tslot-top">{isTop && <TCard show={show} isTop={true} />}</div>
                          <div className="tslot-conn">
                            <div className="tslot-vl" />
                            <div className="tslot-dot" style={{ background: STATUS[show.status]?.color }} />
                            <div className="tslot-vl" />
                          </div>
                          <div className="tslot-bottom">{!isTop && <TCard show={show} isTop={false} />}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {page === "analytics" && (
              <div className="analytics-page">
                <div className="ph">
                  <h1>Score Analysis</h1>
                  <p>Explore your ratings across different dimensions</p>
                </div>

                <div className="ctrl-bar">
                  <span className="ctrl-lbl">X Axis</span>
                  {XAXIS_OPTIONS.map(opt => (
                    <button key={opt.id} className={`cbtn${xAxis === opt.id ? " on" : ""}`}
                      onClick={() => { setXAxis(opt.id); setInsights(""); }}>
                      {opt.label}
                    </button>
                  ))}
                  <div className="ctrl-div" />
                  <button className={`cbtn hm${heatmap ? " on" : ""}`} onClick={() => setHeatmap(h => !h)}>
                    ▦ Heatmap
                  </button>
                  <span className="ctrl-ct">{scoredShows.length} scored</span>
                </div>

                {heatmap ? <HeatmapView /> : (
                  <div className="scatter-wrap">
                    <ResponsiveContainer width="100%" height={370}>
                      <ScatterChart margin={{ top: 16, right: 24, bottom: xAxis !== "year" ? 74 : 32, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.034)" />
                        <XAxis type="number" dataKey="px" domain={xDomain} ticks={xTickVals}
                          tickFormatter={v => xCategories ? (xCategories[Math.round(v)] ?? "") : String(v)}
                          tick={{ fill:"#5a6278", fontSize:11, fontFamily:"Outfit" }}
                          tickLine={false} axisLine={{ stroke:"#1a1e2c" }}
                          angle={xAxis !== "year" ? -38 : 0}
                          textAnchor={xAxis !== "year" ? "end" : "middle"}
                          height={xAxis !== "year" ? 84 : 35} interval={0}
                        />
                        <YAxis type="number" dataKey="py" domain={[5.5, 10]}
                          tick={{ fill:"#5a6278", fontSize:11, fontFamily:"Outfit" }}
                          tickLine={false} axisLine={{ stroke:"#1a1e2c" }} width={32}
                        />
                        <ZAxis range={[55, 55]} />
                        <Tooltip cursor={{ stroke:"rgba(255,255,255,0.05)", strokeWidth:1 }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            const c = STATUS[d.status];
                            const cover = getCover(d);
                            return (
                              <div className="stt">
                                {cover
                                  ? <img className="stt-img" src={cover} alt={d.title} />
                                  : <div className="stt-img-ph" style={{ background: coverPh(d) }}>
                                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.8rem", color:c?.color, opacity:.25 }}>{d.title[0]}</span>
                                    </div>
                                }
                                <div className="stt-inner">
                                  <div className="stt-ti">{d.title}</div>
                                  <div className="stt-row"><span>Score</span><strong style={{ color:"#fbbf24" }}>★ {d.score}</strong></div>
                                  <div className="stt-row"><span>{xLabel}</span><strong>{getXVal(d, xAxis)}</strong></div>
                                  <div className="stt-row"><span>Status</span><strong style={{ color:c?.color }}>{c?.label}</strong></div>
                                  <div className="stt-row"><span>Studio</span><strong>{d.studio}</strong></div>
                                  <div className="stt-row"><span>Year</span><strong>{d.year}</strong></div>
                                  <div className="stt-row"><span>Episodes</span><strong>{d.episodes}</strong></div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={plotData} isAnimationActive={false}>
                          {plotData.map(e => <Cell key={e.id} fill={STATUS[e.status]?.color ?? "#888"} fillOpacity={0.85} />)}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="scatter-legend">
                  {Object.entries(STATUS).map(([k, c]) => {
                    const n = plotData.filter(s => s.status === k).length;
                    if (!n) return null;
                    return <div key={k} className="leg-item"><div className="leg-dot" style={{ background:c.color }} />{c.label}<span style={{ color:"var(--text3)", marginLeft:2 }}>({n})</span></div>;
                  })}
                </div>

                <div className="insights-panel">
                  <div className="insights-head">
                    <div>
                      <h2>AI Insights</h2>
                      <p>Claude's analysis of your {xLabel} slice</p>
                    </div>
                    <button className="ins-btn" onClick={generateInsights} disabled={insightsLoading}>
                      {insightsLoading ? "Analyzing…" : `Analyze ${xLabel} slice`}
                    </button>
                  </div>
                  <div className="ins-body">
                    {insightsLoading && <div className="pulse"><span /><span /><span /></div>}
                    {!insightsLoading && insights && <div className="ins-text">{insights}</div>}
                    {!insightsLoading && !insights && <div className="ins-empty">Click "Analyze {xLabel} slice" to generate a deep reading of your taste patterns</div>}
                  </div>
                </div>
              </div>
            )}

            {/* TOOLS */}
            {page === "tools" && (
              <div className="tools-page">
                <div className="ph"><h1>Tools</h1><p>Calendar sync and export utilities</p></div>
                <div className="subtabs">
                  {[["sync","Google Calendar"],["export","Export Data"]].map(([id, lbl]) => (
                    <button key={id} className={`stab${calTab === id ? " on" : ""}`} onClick={() => setCalTab(id)}>{lbl}</button>
                  ))}
                </div>

                {calTab === "sync" && (() => {
                  const toSync = SHOWS.filter(s => s.status === "watching" || s.status === "plan_to_watch");
                  return (
                    <div className="cpanel">
                      <div className="cp-hero">
                        <div className="cp-icon">📅</div>
                        <div><h3>Google Calendar Sync</h3><p>Push your watching & upcoming shows into Google Calendar as events.</p></div>
                      </div>
                      <div className="cp-stats">
                        {[[toSync.length,"Ready to sync"],[SHOWS.filter(s=>s.status==="watching").length,"Currently watching"],[SHOWS.filter(s=>s.status==="plan_to_watch").length,"Planned"]].map(([v,l])=>(
                          <div key={l} className="cp-stat"><strong>{v}</strong><span>{l}</span></div>
                        ))}
                      </div>
                      <div className="cp-list">
                        {toSync.map(s => {
                          const c = STATUS[s.status];
                          const cover = getCover(s);
                          return (
                            <div key={s.id} className="cp-row">
                              {cover
                                ? <img className="cp-thumb" src={cover} alt={s.title} loading="lazy" />
                                : <div className="cp-thumb-ph" style={{ background: coverPh(s) }}>{s.title[0]}</div>
                              }
                              <div className="cp-info">
                                <div className="cp-ti">{s.title}</div>
                                <div className="cp-dt">{s.premiereDate} · {s.episodes} eps</div>
                              </div>
                              <span className="cp-st" style={{ color: c.color }}>{c.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="cp-foot">
                        <button className="sync-btn" onClick={() => { setCalSyncing(true); setTimeout(()=>setCalSyncing(false),2000); }} disabled={calSyncing}>
                          {calSyncing ? "Syncing…" : `Sync ${toSync.length} shows to Google Calendar`}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {calTab === "export" && (
                  <div className="cpanel">
                    <div className="cp-hero">
                      <div className="cp-icon">⬇</div>
                      <div><h3>Export Your Data</h3><p>Download your full anime list in your preferred format.</p></div>
                    </div>
                    <div className="exp-grid">
                      {[["📊","CSV","Spreadsheet-compatible"],["{}","JSON","Developer-friendly"],["📆","iCal (.ics)","Calendar import"]].map(([icon,lbl,desc])=>(
                        <div key={lbl} className="exp-item">
                          <div className="exp-icon">{icon}</div>
                          <div className="exp-lbl">{lbl}</div>
                          <div className="exp-desc">{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {page !== "tools" && (
            <aside className="sidebar">
              <div className="sb-title">Filter by Status</div>
              {Object.entries(STATUS).map(([key, cfg]) => (
                <label key={key} className="sf">
                  <div className="sf-dot" style={{ background: cfg.color }} />
                  <span className="sf-lbl">{cfg.label}</span>
                  <span className="sf-n">{counts[key]}</span>
                  <input type="checkbox" className="sf-cb" checked={statusFilter.has(key)} onChange={() => toggleStatus(key)} />
                </label>
              ))}
              <div className="sb-sep" />
              <div className="sb-tot"><strong>{filteredSorted.length}</strong> of {SHOWS.length} shown</div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
