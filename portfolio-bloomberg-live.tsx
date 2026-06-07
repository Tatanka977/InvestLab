import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — set your proxy URL after deployment
// Local dev:  http://localhost:3001
// Railway:    https://your-app.up.railway.app
// ─────────────────────────────────────────────────────────────────────────────
const PROXY = "http://localhost:3001";

// ─── BLOOMBERG COLOR SYSTEM (orange → blue) ───────────────────────────────────
const B = {
  bg:      "#000000",
  panel:   "#0A0A0A",
  panel2:  "#111111",
  border:  "#2A2A2A",
  borderB: "#333333",
  blue:    "#0066FF",
  blueL:   "#3388FF",
  blueD:   "#0044CC",
  white:   "#FFFFFF",
  yellow:  "#FFFF00",
  green:   "#00FF00",
  red:     "#FF3333",
  cyan:    "#00FFFF",
  gray1:   "#CCCCCC",
  gray2:   "#888888",
  gray3:   "#555555",
  gray4:   "#333333",
};
const SERIES_COLS = ["#0066FF","#00FF00","#FFFF00","#00FFFF","#FF3333","#FF00FF","#FF8800","#AAAAAA","#66CCFF","#88FF88"];
const PIE_COLS    = SERIES_COLS;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt    = (n,d=2) => n==null||isNaN(n) ? "N/A" : (+n).toFixed(d);
const fmtM   = (n) => {
  if (n==null) return "N/A";
  if (n>=1e12) return `${(n/1e12).toFixed(2)}T`;
  if (n>=1e9)  return `${(n/1e9).toFixed(2)}B`;
  if (n>=1e6)  return `${(n/1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
};
const pCol   = (v) => v>0 ? B.green : v<0 ? B.red : B.gray2;
const pSign  = (v) => v==null ? "N/A" : v>0 ? `+${v}` : `${v}`;
const groupBy = (arr, key, total) => {
  const m={};
  arr.forEach(h=>{ const k=h.asset[key]||"N/A"; m[k]=(m[k]||0)+h.value; });
  return Object.entries(m).map(([name,value])=>({name,value,pct:+(value/total*100).toFixed(1)})).sort((a,b)=>b.value-a.value);
};
const pMet = (hs) => {
  if (!hs.length) return null;
  const total = hs.reduce((s,h)=>s+h.value,0);
  const wRet  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.er??0),0);
  const wVol  = Math.sqrt(hs.reduce((s,h)=>s+Math.pow((h.value/total)*(h.asset.vol??15),2),0));
  const wBeta = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.beta??1),0);
  const wDiv  = hs.reduce((s,h)=>s+(h.value/total)*(h.asset.dy??0),0);
  const sharpe= wVol>0 ? (wRet-2.5)/wVol : 0;
  const sectors = new Set(hs.map(h=>h.asset.sector||"N/A")).size;
  const geos    = new Set(hs.map(h=>h.asset.geo||"N/A")).size;
  const hhi     = hs.reduce((s,h)=>s+Math.pow(h.value/total*100,2),0);
  return {total,wRet,wVol,wBeta,wDiv,sharpe,sectors,geos,hhi};
};

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${PROXY}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function searchSecurities(q) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}

async function fetchQuote(symbolOrIsin) {
  const isIsin = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbolOrIsin.trim().toUpperCase());
  const param  = isIsin ? `isin=${symbolOrIsin}` : `symbol=${symbolOrIsin}`;
  return apiFetch(`/quote?${param}`);
}

async function batchRefresh(symbols) {
  const r = await fetch(`${PROXY}/batch`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ symbols }),
  });
  return r.json();
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
const FKey = ({num,label,active,onClick}) => (
  <button onClick={onClick} style={{
    background:active?B.blue:B.panel2, border:`1px solid ${active?B.blue:B.border}`,
    borderRadius:0, padding:"2px 6px", cursor:"pointer",
    display:"flex", alignItems:"center", gap:0,
    fontFamily:"'Courier New',Courier,monospace", minWidth:52,
  }}>
    {num&&<span style={{fontSize:9,color:active?B.white:B.gray2,fontWeight:700,marginRight:3}}>{num}</span>}
    <span style={{fontSize:9,color:active?B.white:B.gray2,fontWeight:700,
      letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
  </button>
);

const BPanel = ({title,children,style,accent}) => (
  <div style={{border:`1px solid ${accent?B.blue:B.border}`,background:B.panel,...style}}>
    {title&&(
      <div style={{background:accent?B.blue:B.blue,padding:"1px 6px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,fontWeight:700,color:B.white,
          fontFamily:"'Courier New',monospace",letterSpacing:"0.08em",textTransform:"uppercase"}}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

const Spinner = ({text}) => (
  <div style={{padding:"12px 8px",textAlign:"center"}}>
    <div style={{fontSize:9,color:B.blue,fontFamily:"'Courier New',monospace",
      animation:"blink 1s infinite"}}>{text||"LOADING..."}</div>
  </div>
);

const ErrMsg = ({msg}) => (
  <div style={{padding:"6px 8px",fontSize:9,color:B.red,fontFamily:"'Courier New',monospace",
    background:"#1a0000",border:`1px solid ${B.red}`}}>
    ⚠ {msg}
  </div>
);

const TT_STYLE = {background:"#111",border:`1px solid ${B.blue}`,borderRadius:0,
  fontSize:9,color:B.yellow,fontFamily:"'Courier New',monospace",padding:"4px 8px"};

// ─── PHONE SHELL ──────────────────────────────────────────────────────────────
const PW=393, PH=852;

function PhoneShell({children}) {
  const [time,setTime]=useState(()=>new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false}));
  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false})),10000);
    return()=>clearInterval(t);
  },[]);
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"flex-start",minHeight:"100vh",
      background:"#050505",padding:"20px 0",fontFamily:"'Courier New',Courier,monospace"}}>
      <div style={{width:PW,position:"relative",
        boxShadow:"0 0 0 10px #1a1a1a,0 0 0 12px #262626,0 0 0 14px #111,0 30px 80px rgba(0,0,255,0.1)",
        borderRadius:52,overflow:"hidden"}}>
        <div style={{background:B.bg,display:"flex",flexDirection:"column",height:PH}}>
          {/* status bar */}
          <div style={{height:44,background:B.bg,display:"flex",justifyContent:"space-between",
            alignItems:"flex-end",padding:"0 24px 6px",flexShrink:0,position:"relative"}}>
            <span style={{fontSize:12,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace"}}>{time}</span>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,
              width:120,height:28,background:B.bg,borderRadius:"0 0 18px 18px"}}/>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <svg width="15" height="11" viewBox="0 0 15 11">
                <rect x="0" y="3" width="2.5" height="8" fill="white" opacity="0.4"/>
                <rect x="4" y="2" width="2.5" height="9" fill="white" opacity="0.6"/>
                <rect x="8" y="0.5" width="2.5" height="10.5" fill="white" opacity="0.8"/>
                <rect x="12" y="0" width="2.5" height="11" fill="white"/>
              </svg>
              <div style={{width:22,height:10,border:"1px solid rgba(255,255,255,0.3)",borderRadius:2,padding:1,display:"flex",alignItems:"center"}}>
                <div style={{width:"75%",height:"100%",background:B.green,borderRadius:1}}/>
              </div>
            </div>
          </div>
          {children(time)}
        </div>
      </div>
      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",
        fontSize:9,color:"rgba(255,255,255,0.15)",fontFamily:"'Courier New',monospace",
        textTransform:"uppercase",pointerEvents:"none",letterSpacing:"0.14em"}}>
        BLOOMBERG L.P.  PORTFOLIO TERMINAL  ©2026
      </div>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; background:#000; }
        ::-webkit-scrollbar-thumb { background:${B.blue}; }
      `}</style>
    </div>
  );
}

function TopBar({time}) {
  return (
    <div style={{background:B.blue,display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"2px 8px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:11,fontWeight:700,color:B.white,fontFamily:"'Courier New',monospace",letterSpacing:"0.12em"}}>BLOOMBERG</span>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontFamily:"'Courier New',monospace"}}>PORTFOLIO TERMINAL</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:8,color:B.yellow,fontFamily:"'Courier New',monospace"}}>● YAHOO FINANCE LIVE</span>
        <span style={{fontSize:9,color:B.white,fontFamily:"'Courier New',monospace"}}>{time}</span>
      </div>
    </div>
  );
}

function FKeyBar({page,setPage}) {
  const keys=[
    {n:"F1",l:"HOME",    id:"home"},
    {n:"F2",l:"SEARCH",  id:"search"},
    {n:"F3",l:"PORT",    id:"portfolio"},
    {n:"F4",l:"ANALYSIS",id:"analysis"},
    {n:"F5",l:"AI ADVSR",id:"ai"},
  ];
  return (
    <div style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,
      display:"flex",alignItems:"stretch",padding:"2px 4px",gap:3,flexShrink:0}}>
      {keys.map(k=>(
        <FKey key={k.id} num={k.n} label={k.l} active={page===k.id} onClick={()=>setPage(k.id)}/>
      ))}
      <div style={{flex:1}}/>
      <span style={{fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace",
        alignSelf:"center",paddingRight:4}}>YF LIVE  F9=HELP</span>
    </div>
  );
}

function BottomNav({page,setPage,badge}) {
  const tabs=[
    {id:"home",    fn:"F1",label:"HOME"},
    {id:"search",  fn:"F2",label:"SRCH"},
    {id:"portfolio",fn:"F3",label:"PORT",badge},
    {id:"analysis",fn:"F4",label:"ANLY"},
    {id:"ai",      fn:"F5",label:"AI"},
  ];
  return (
    <div style={{background:B.panel2,borderTop:`1px solid ${B.borderB}`,
      display:"flex",paddingBottom:20,flexShrink:0}}>
      {tabs.map(t=>{
        const active=page===t.id;
        return (
          <button key={t.id} onClick={()=>setPage(t.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",
            padding:"6px 0 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:1,
            borderTop:`2px solid ${active?B.blue:"transparent"}`,position:"relative"}}>
            {t.badge>0&&<div style={{position:"absolute",top:3,right:"18%",
              background:B.blue,color:B.white,fontSize:8,fontWeight:700,
              fontFamily:"'Courier New',monospace",padding:"0 4px",lineHeight:"14px"}}>{t.badge}</div>}
            <span style={{fontSize:8,color:active?B.blue:B.gray3,fontFamily:"'Courier New',monospace"}}>{t.fn}</span>
            <span style={{fontSize:10,color:active?B.blue:B.gray2,fontWeight:700,
              fontFamily:"'Courier New',monospace",letterSpacing:"0.06em"}}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({holdings,setPage,onRefresh,refreshing}) {
  const m=useMemo(()=>pMet(holdings),[holdings]);

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:4}}>
      <BPanel title="PORTFOLIO OVERVIEW  LIVE DATA">
        <div style={{padding:"6px 8px"}}>
          {!m?(
            <div style={{padding:"12px 0",textAlign:"center"}}>
              <div style={{fontSize:11,color:B.gray2,fontFamily:"'Courier New',monospace",marginBottom:8}}>NO ACTIVE PORTFOLIO</div>
              <div style={{fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:12}}>
                USE F2/SRCH  SEARCH SECURITIES BY ISIN OR TICKER
              </div>
              <button onClick={()=>setPage("search")} style={{
                background:B.blue,border:"none",color:B.white,
                padding:"6px 20px",cursor:"pointer",
                fontFamily:"'Courier New',monospace",fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>
                {"> SEARCH SECURITIES"}
              </button>
            </div>
          ):(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
                <div style={{borderLeft:`3px solid ${B.blue}`,paddingLeft:6}}>
                  <div style={{fontSize:8,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>TOTAL MKT VALUE</div>
                  <div style={{fontSize:20,color:B.yellow,fontWeight:700,letterSpacing:"-0.02em"}}>${fmtM(m.total)}</div>
                </div>
                <div style={{borderLeft:`3px solid ${pCol(m.wRet)}`,paddingLeft:6}}>
                  <div style={{fontSize:8,color:B.gray2,textTransform:"uppercase",marginBottom:1}}>PORT EXP RETURN</div>
                  <div style={{fontSize:20,color:pCol(m.wRet),fontWeight:700}}>{pSign(fmt(m.wRet,1))}%</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,
                borderTop:`1px solid ${B.border}`,paddingTop:4}}>
                {[
                  {l:"VOLATILITY",v:`${fmt(m.wVol,1)}%`,col:m.wVol>25?B.red:m.wVol>15?B.yellow:B.green},
                  {l:"SHARPE",    v:fmt(m.sharpe,2),    col:m.sharpe>0.7?B.green:m.sharpe>0.3?B.yellow:B.red},
                  {l:"BETA",      v:fmt(m.wBeta,2),     col:m.wBeta>1.3?B.red:B.white},
                  {l:"DIV YIELD", v:`${fmt(m.wDiv,1)}%`,col:B.cyan},
                ].map((k,i)=>(
                  <div key={i} style={{padding:"3px 4px",borderRight:i<3?`1px solid ${B.border}`:"none"}}>
                    <div style={{fontSize:7,color:B.gray3,textTransform:"uppercase",marginBottom:1}}>{k.l}</div>
                    <div style={{fontSize:13,color:k.col,fontWeight:700}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{borderTop:`1px solid ${B.border}`,marginTop:4,paddingTop:4,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace"}}>
                  {holdings.length} SECURITIES  ·  LIVE YAHOO FINANCE DATA
                </span>
                <button onClick={onRefresh} disabled={refreshing} style={{
                  background:"none",border:`1px solid ${B.border}`,color:refreshing?B.gray3:B.blue,
                  fontFamily:"'Courier New',monospace",fontSize:8,cursor:refreshing?"not-allowed":"pointer",
                  padding:"2px 8px",animation:refreshing?"blink 0.5s infinite":"none"}}>
                  {refreshing?"UPDATING...":"↻ REFRESH"}
                </button>
              </div>
            </>
          )}
        </div>
      </BPanel>

      {/* live positions ticker */}
      {holdings.length>0&&(
        <BPanel title="SECURITIES — LIVE PRICES" style={{marginTop:1}}>
          {holdings.map(h=>(
            <div key={h.isin} style={{display:"flex",alignItems:"center",gap:8,
              padding:"4px 8px",borderBottom:`1px solid ${B.border}`,
              fontFamily:"'Courier New',monospace"}}>
              <span style={{fontSize:10,color:B.blue,fontWeight:700,minWidth:52}}>{h.asset.ticker}</span>
              <span style={{fontSize:10,color:B.yellow,minWidth:70}}>{h.asset.price!=null?h.asset.price.toLocaleString(undefined,{maximumFractionDigits:2}):"---"}</span>
              <span style={{fontSize:10,color:pCol(h.asset.dayChangePct),minWidth:50,fontWeight:700}}>
                {h.asset.dayChangePct!=null?`${pSign(fmt(h.asset.dayChangePct,2))}%`:"---"}
              </span>
              <span style={{fontSize:9,color:B.gray2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.asset.shortName||h.asset.ticker}</span>
            </div>
          ))}
        </BPanel>
      )}

      {/* quick actions */}
      <div style={{padding:"4px",background:B.panel2,marginTop:1,
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
        {[
          {l:"SEARCH SECUR",f:"F2",action:()=>setPage("search")},
          {l:"PORTFOLIO",   f:"F3",action:()=>setPage("portfolio")},
          {l:"RISK ANALYSIS",f:"F4",action:()=>setPage("analysis")},
          {l:"AI ADVISOR",  f:"F5",action:()=>setPage("ai")},
        ].map((b,i)=>(
          <button key={i} onClick={b.action} style={{
            background:B.panel2,border:`1px solid ${B.border}`,
            padding:"6px 8px",cursor:"pointer",textAlign:"left",
            display:"flex",alignItems:"center",gap:6,fontFamily:"'Courier New',monospace"}}>
            <span style={{fontSize:8,color:B.blue,fontWeight:700}}>{b.f}</span>
            <span style={{fontSize:9,color:B.gray1,textTransform:"uppercase",letterSpacing:"0.05em"}}>{b.l}</span>
            <span style={{marginLeft:"auto",fontSize:9,color:B.gray3}}>{">"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SEARCH PAGE ──────────────────────────────────────────────────────────────
function SearchPage({onAdd,portfolio}) {
  const [q,setQ]         = useState("");
  const [results,setRes] = useState([]);
  const [searching,setSrch]=useState(false);
  const [sel,setSel]     = useState(null);
  const [loading,setLoad]= useState(false);
  const [detail,setDetail]=useState(null);
  const [error,setError] = useState("");
  const [qty,setQty]     = useState("1");
  const debounce         = useRef(null);

  const doSearch = useCallback(async (val) => {
    if (!val.trim()) { setRes([]); return; }
    setSrch(true); setError("");
    try {
      const data = await searchSecurities(val);
      setRes(data);
    } catch(e) {
      setError(`SEARCH ERROR: ${e.message} — Is the proxy running?`);
    } finally { setSrch(false); }
  },[]);

  const handleInput = (v) => {
    setQ(v); setSel(null); setDetail(null);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(()=>doSearch(v), 400);
  };

  const selectSecurity = async (r) => {
    setSel(r); setLoad(true); setDetail(null); setError(""); setQty("1");
    try {
      const d = await fetchQuote(r.symbol);
      // enrich with sector/geo from search result
      d.sector  = d.sector  || r.sector  || "N/A";
      d.geo     = d.geo     || (d.exchange?.includes("AS")||d.exchange?.includes("PA")||d.exchange?.includes("DE")?"EUROPE":
                                d.exchange?.includes("T")?"ASIA":"USA");
      d.type    = d.type    || r.type    || "EQUITY";
      d.er      = d.ytdPct  ?? 0;  // use YTD as proxy for expected return
      setDetail(d);
    } catch(e) {
      setError(`QUOTE ERROR: ${e.message}`);
    } finally { setLoad(false); }
  };

  const inP = (sym) => portfolio.some(h=>h.asset.ticker===sym||h.asset.symbol===sym);

  if (sel) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"3px 6px",background:B.panel2,borderBottom:`1px solid ${B.border}`,
        display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <button onClick={()=>{setSel(null);setDetail(null);}} style={{
          background:"none",border:"none",cursor:"pointer",
          color:B.blue,fontFamily:"'Courier New',monospace",fontSize:9,padding:0}}>{"< BACK"}</button>
        <span style={{fontSize:10,color:B.yellow,fontFamily:"'Courier New',monospace",fontWeight:700}}>{sel.symbol}</span>
        <span style={{fontSize:9,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{sel.shortName}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:10}}>
        {loading && <Spinner text="FETCHING LIVE DATA FROM YAHOO FINANCE..."/>}
        {error   && <ErrMsg msg={error}/>}
        {detail  && (
          <div>
            <BPanel title={`${detail.symbol}  ${(detail.shortName||"").slice(0,28)}`}>
              <div style={{padding:"4px 8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div>
                    <div style={{fontSize:26,color:B.yellow,fontWeight:700,letterSpacing:"-0.02em"}}>
                      {detail.price?.toLocaleString(undefined,{maximumFractionDigits:2})||"---"}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
                      <span style={{fontSize:11,color:pCol(detail.dayChangePct),fontWeight:700}}>
                        {pSign(fmt(detail.dayChangePct,2))}%
                      </span>
                      <span style={{fontSize:9,color:B.gray3}}>1D</span>
                      <span style={{fontSize:11,color:pCol(detail.ytdPct),fontWeight:700}}>
                        {pSign(fmt(detail.ytdPct,2))}%
                      </span>
                      <span style={{fontSize:9,color:B.gray3}}>YTD</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:B.blue}}>{detail.currency}  {detail.type}</div>
                    <div style={{fontSize:9,color:B.gray3}}>{detail.exchange}</div>
                    {detail.recommendation&&(
                      <div style={{fontSize:9,color:
                        detail.recommendation==="buy"||detail.recommendation==="strong_buy"?B.green:
                        detail.recommendation==="sell"||detail.recommendation==="strong_sell"?B.red:B.yellow,
                        fontWeight:700,textTransform:"uppercase",marginTop:2}}>
                        {detail.recommendation.replace("_"," ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </BPanel>

            {/* price chart */}
            {detail.history?.length>1&&(
              <BPanel title={`${detail.symbol}  3M PRICE CHART  YAHOO FINANCE`} style={{marginTop:1}}>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={detail.history.slice(-60)}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={B.blue} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={B.blue} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide/>
                    <YAxis domain={["auto","auto"]} hide/>
                    <Tooltip contentStyle={TT_STYLE} formatter={(v)=>[`${detail.currency} ${v}`,"CLOSE"]}
                      labelFormatter={(l)=>l}/>
                    <ReferenceLine y={detail.history[0]?.close} stroke={B.gray4} strokeDasharray="2 2"/>
                    <Area type="linear" dataKey="close"
                      stroke={(detail.ytdPct??0)>=0?B.blue:B.red}
                      strokeWidth={1.5} fill="url(#cg)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </BPanel>
            )}

            {/* key stats */}
            <BPanel title="KEY STATISTICS  LIVE FUNDAMENTALS" style={{marginTop:1}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                {[
                  {l:"P/E RATIO",      v:detail.pe?fmt(detail.pe,1):"N/A",            col:null},
                  {l:"FWD P/E",        v:detail.forwardPE?fmt(detail.forwardPE,1):"N/A",col:null},
                  {l:"DIV YIELD",      v:`${fmt(detail.dividendYield,2)}%`,            col:detail.dividendYield>3?B.green:B.yellow},
                  {l:"BETA",           v:fmt(detail.beta,2),                           col:detail.beta>1.5?B.red:detail.beta>1?B.yellow:B.green},
                  {l:"VOLATILITY",     v:detail.vol?`${fmt(detail.vol,1)}%`:"N/A",    col:detail.vol>35?B.red:detail.vol>20?B.yellow:B.green},
                  {l:"MKT CAP",        v:detail.marketCap?`$${fmtM(detail.marketCap)}`:"N/A",col:null},
                  {l:"EPS (TTM)",      v:detail.eps?fmt(detail.eps,2):"N/A",          col:detail.eps>0?B.green:B.red},
                  {l:"ROE",            v:detail.roe?`${detail.roe}%`:"N/A",           col:detail.roe>15?B.green:B.yellow},
                  {l:"REV GROWTH",     v:detail.revenueGrowth?`${detail.revenueGrowth}%`:"N/A",col:pCol(detail.revenueGrowth)},
                  {l:"TARGET PRICE",   v:detail.targetPrice?`${fmt(detail.targetPrice,2)}`:"N/A",col:B.cyan},
                  {l:"YTD PERF",       v:`${pSign(fmt(detail.ytdPct,2))}%`,           col:pCol(detail.ytdPct)},
                  {l:"DAY CHANGE",     v:`${pSign(fmt(detail.dayChangePct,2))}%`,     col:pCol(detail.dayChangePct)},
                ].map((k,i)=>(
                  <div key={i} style={{padding:"5px 8px",
                    borderBottom:`1px solid ${B.border}`,
                    borderRight:i%2===0?`1px solid ${B.border}`:"none"}}>
                    <div style={{fontSize:7,color:B.gray3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{k.l}</div>
                    <div style={{fontSize:14,color:k.col||B.yellow,fontWeight:700}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </BPanel>

            {/* order entry */}
            <BPanel title="ORDER ENTRY  ADD TO PORTFOLIO" style={{marginTop:1}} accent>
              <div style={{padding:"8px"}}>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:B.gray2,textTransform:"uppercase",marginBottom:3}}>QTY</div>
                    <input type="number" min="0" step="any" value={qty} onChange={e=>setQty(e.target.value)}
                      style={{width:"100%",background:"#000",border:`1px solid ${B.blue}`,
                        borderRadius:0,padding:"7px 8px",color:B.yellow,fontSize:13,
                        fontFamily:"'Courier New',monospace",outline:"none",fontWeight:700}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:B.gray2,textTransform:"uppercase",marginBottom:3}}>CONSIDERATION</div>
                    <div style={{background:"#000",border:`1px solid ${B.border}`,
                      padding:"7px 8px",fontSize:12,fontFamily:"'Courier New',monospace",
                      color:B.cyan,fontWeight:700}}>
                      {detail.currency} {detail.price?((parseFloat(qty)||0)*detail.price).toLocaleString(undefined,{maximumFractionDigits:2}):"---"}
                    </div>
                  </div>
                </div>
                <button onClick={()=>{
                  const n=parseFloat(qty);
                  if(n>0 && detail.price){
                    onAdd({
                      ticker:      detail.symbol,
                      symbol:      detail.symbol,
                      isin:        detail.isin||detail.symbol,
                      shortName:   detail.shortName||detail.symbol,
                      name:        detail.longName||detail.shortName||detail.symbol,
                      price:       detail.price,
                      ccy:         detail.currency||"USD",
                      currency:    detail.currency||"USD",
                      type:        detail.type||"EQUITY",
                      sector:      detail.sector||"N/A",
                      geo:         detail.geo||"N/A",
                      exchange:    detail.exchange||"",
                      ytd:         detail.ytdPct??0,
                      dayChangePct:detail.dayChangePct??0,
                      vol:         detail.vol??15,
                      er:          detail.ytdPct??0,
                      beta:        detail.beta??1,
                      dy:          detail.dividendYield??0,
                      pe:          detail.pe??null,
                      marketCap:   detail.marketCap??null,
                      history:     detail.history??[],
                    }, n);
                    setSel(null); setDetail(null);
                  }
                }} style={{width:"100%",background:B.blue,border:"none",color:B.white,
                  padding:"10px",cursor:"pointer",fontFamily:"'Courier New',monospace",
                  fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  {inP(sel.symbol)?"▲ UPDATE POSITION":"▶ ADD TO PORTFOLIO  <GO>"}
                </button>
              </div>
            </BPanel>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"4px 6px",borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:0}}>
          <span style={{fontSize:10,color:B.blue,fontFamily:"'Courier New',monospace",
            background:B.panel2,border:`1px solid ${B.border}`,borderRight:"none",
            padding:"6px 8px",fontWeight:700}}>SRCH</span>
          <input value={q} onChange={e=>handleInput(e.target.value)}
            placeholder="TICKER  ISIN  COMPANY NAME"
            autoFocus
            style={{flex:1,background:"#000",border:`1px solid ${B.border}`,
              padding:"6px 8px",color:B.yellow,fontSize:10,
              fontFamily:"'Courier New',monospace",outline:"none",
              letterSpacing:"0.05em",textTransform:"uppercase"}}/>
        </div>
        {error && <ErrMsg msg={error}/>}
        {!error&&<div style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace",marginTop:3,paddingLeft:2}}>
          {searching?"SEARCHING YAHOO FINANCE...":`${results.length} RESULTS  ·  TAP TO VIEW DETAIL`}
        </div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"52px 1fr 60px",
        padding:"2px 8px",background:B.blue,flexShrink:0}}>
        {["TICKER","NAME / EXCHANGE","TYPE"].map((h,i)=>(
          <span key={i} style={{fontSize:8,color:B.white,fontFamily:"'Courier New',monospace",
            fontWeight:700,letterSpacing:"0.08em"}}>{h}</span>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {searching&&<Spinner text="QUERYING YAHOO FINANCE..."/>}
        {results.map((r,i)=>{
          const added=inP(r.symbol);
          return (
            <div key={r.symbol+i} onClick={()=>selectSecurity(r)}
              style={{display:"grid",gridTemplateColumns:"52px 1fr 60px",
                padding:"5px 8px",cursor:"pointer",borderBottom:`1px solid ${B.border}`,
                background:added?"#001122":"transparent"}}>
              <span style={{fontSize:10,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>
                {r.symbol}{added?" ✓":""}
              </span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9,color:B.gray1,fontFamily:"'Courier New',monospace",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.shortName}</div>
                <div style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace"}}>{r.exchange}</div>
              </div>
              <span style={{fontSize:8,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{r.type}</span>
            </div>
          );
        })}
        {!searching&&q.trim()&&results.length===0&&(
          <div style={{padding:"12px 8px",fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center"}}>
            NO RESULTS FOR "{q.toUpperCase()}"
          </div>
        )}
        {!q.trim()&&(
          <div style={{padding:"8px"}}>
            <div style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:6}}>SUGGESTED SEARCHES:</div>
            {["AAPL","MSFT","NVDA","IWDA","CSPX","TSLA","SAP","ENI","QQQ","BNP"].map(t=>(
              <button key={t} onClick={()=>handleInput(t)} style={{
                background:B.panel2,border:`1px solid ${B.border}`,marginRight:4,marginBottom:4,
                color:B.blue,fontSize:9,cursor:"pointer",padding:"3px 8px",
                fontFamily:"'Courier New',monospace",fontWeight:700}}>{t}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PORTFOLIO PAGE ───────────────────────────────────────────────────────────
function PortfolioPage({holdings,onRemove,onChangeQty}) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  if (!holdings.length) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
      <div style={{fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace",textAlign:"center",lineHeight:1.8}}>
        NO SECURITIES IN PORTFOLIO<br/>USE F2 SEARCH TO ADD LIVE POSITIONS
      </div>
    </div>
  );
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.blue,display:"grid",gridTemplateColumns:"repeat(4,1fr)",flexShrink:0}}>
        {[
          {l:"PORT VALUE",v:`$${fmtM(m.total)}`},
          {l:"EXP RET",   v:`${pSign(fmt(m.wRet,1))}%`},
          {l:"VOLATILITY",v:`${fmt(m.wVol,1)}%`},
          {l:"SHARPE",    v:fmt(m.sharpe,2)},
        ].map((k,i)=>(
          <div key={i} style={{padding:"3px 6px",borderRight:i<3?`1px solid rgba(255,255,255,0.2)`:"none"}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,0.65)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{k.l}</div>
            <div style={{fontSize:11,color:B.white,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
        padding:"2px 6px",background:B.panel2,borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
        {["TICKER","NAME","VALUE","WT%","DAY%",""].map((h,i)=>(
          <span key={i} style={{fontSize:7,color:B.gray3,fontFamily:"'Courier New',monospace",
            fontWeight:700,letterSpacing:"0.08em",textAlign:i>1?"right":"left"}}>{h}</span>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {holdings.map((h,i)=>{
          const w=(h.value/m.total*100).toFixed(1);
          return (
            <div key={h.isin||h.asset.ticker} style={{borderBottom:`1px solid ${B.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
                padding:"5px 6px",gap:0,alignItems:"center"}}>
                <span style={{fontSize:10,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>{h.asset.ticker}</span>
                <span style={{fontSize:8,color:B.gray2,fontFamily:"'Courier New',monospace",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:4}}>
                  {(h.asset.shortName||h.asset.name||"").slice(0,20)}
                </span>
                <span style={{fontSize:9,color:B.yellow,fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
                  ${fmtM(h.value)}
                </span>
                <span style={{fontSize:9,color:B.cyan,fontFamily:"'Courier New',monospace",textAlign:"right"}}>{w}%</span>
                <span style={{fontSize:9,color:pCol(h.asset.dayChangePct),fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
                  {h.asset.dayChangePct!=null?`${pSign(fmt(h.asset.dayChangePct,2))}%`:"---"}
                </span>
                <button onClick={()=>onRemove(h.isin||h.asset.ticker)} style={{
                  background:"none",border:"none",color:B.gray3,cursor:"pointer",
                  fontSize:10,fontFamily:"'Courier New',monospace",textAlign:"right"}}>X</button>
              </div>
              <div style={{height:2,background:B.panel2}}>
                <div style={{height:"100%",width:`${w}%`,background:SERIES_COLS[i%SERIES_COLS.length]}}/>
              </div>
            </div>
          );
        })}
        <div style={{display:"grid",gridTemplateColumns:"50px 1fr 52px 40px 46px 22px",
          padding:"5px 6px",background:B.panel2,borderTop:`1px solid ${B.blue}`}}>
          <span style={{fontSize:8,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>TOTAL</span>
          <span/><span/>
          <span style={{fontSize:9,color:B.yellow,fontFamily:"'Courier New',monospace",textAlign:"right",fontWeight:700}}>
            ${fmtM(m.total)}
          </span>
          <span/>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYSIS PAGE ────────────────────────────────────────────────────────────
function AnalysisPage({holdings}) {
  const m=useMemo(()=>pMet(holdings),[holdings]);
  const [sub,setSub]=useState("alloc");
  if (!holdings.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace"}}>NO DATA — ADD SECURITIES VIA F2</span>
    </div>
  );
  const sD=groupBy(holdings,"sector",m.total);
  const gD=groupBy(holdings,"geo",m.total);
  const tD=groupBy(holdings,"type",m.total);
  const radarData=[
    {s:"RETURN",v:Math.min(100,m.wRet/18*100)},
    {s:"DIVERS",v:Math.min(100,m.sectors/8*100)},
    {s:"GEO",   v:Math.min(100,m.geos/5*100)},
    {s:"STAB",  v:Math.max(0,100-m.wVol*2)},
    {s:"LIQ",   v:holdings.filter(h=>h.asset.type?.includes("ETF")||h.asset.type?.includes("BOND")).length/holdings.length*100},
    {s:"CCY",   v:Math.min(100,new Set(holdings.map(h=>h.asset.currency||h.asset.ccy||"USD")).size/4*100)},
  ];
  const score=Math.round(radarData.reduce((s,d)=>s+d.v,0)/radarData.length);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:2,padding:"3px 4px",borderBottom:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
        {[{id:"alloc",l:"ALLOCATION"},{id:"risk",l:"RISK"},{id:"perf",l:"PERFORMANCE"}].map(t=>(
          <FKey key={t.id} label={t.l} active={sub===t.id} onClick={()=>setSub(t.id)}/>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {sub==="alloc"&&(
          <div>
            {[{data:sD,t:"SECTOR BREAKDOWN"},{data:gD,t:"GEOGRAPHIC BREAKDOWN"},{data:tD,t:"ASSET CLASS"}].map(({data,t})=>(
              <BPanel key={t} title={t} style={{marginBottom:1}}>
                <div style={{padding:"4px 8px 6px"}}>
                  <div style={{display:"flex",gap:0,alignItems:"center"}}>
                    <ResponsiveContainer width={90} height={90}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={42} paddingAngle={1} dataKey="value" strokeWidth={0}>
                          {data.map((_,i)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{flex:1,paddingLeft:6}}>
                      {data.slice(0,5).map((d,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                          <div style={{width:6,height:6,background:PIE_COLS[i%PIE_COLS.length],flexShrink:0}}/>
                          <span style={{fontSize:8,color:B.gray1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"}}>{d.name}</span>
                          <span style={{fontSize:8,color:B.yellow,fontFamily:"'Courier New',monospace",flexShrink:0}}>{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {data.map((d,i)=>(
                    <div key={d.name} style={{marginBottom:3}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}>
                        <span style={{fontSize:7,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{d.name}</span>
                        <span style={{fontSize:7,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{d.pct}%</span>
                      </div>
                      <div style={{height:3,background:B.panel2}}>
                        <div style={{height:"100%",width:`${d.pct}%`,background:PIE_COLS[i%PIE_COLS.length]}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </BPanel>
            ))}
          </div>
        )}
        {sub==="risk"&&(
          <div>
            <BPanel title={`PORTFOLIO SCORE  ${score}/100`}>
              <div style={{display:"flex",alignItems:"center",padding:"4px 8px"}}>
                <ResponsiveContainer width={130} height={130}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={B.border}/>
                    <PolarAngleAxis dataKey="s" tick={{fill:B.gray3,fontSize:8,fontFamily:"'Courier New',monospace"}}/>
                    <Radar dataKey="v" stroke={B.blue} fill={B.blue} fillOpacity={0.15} strokeWidth={1.5}/>
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{flex:1,paddingLeft:8}}>
                  <div style={{fontSize:32,color:score>65?B.green:score>40?B.yellow:B.red,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{score}</div>
                  <div style={{fontSize:8,color:B.gray2,fontFamily:"'Courier New',monospace"}}>PORT SCORE</div>
                </div>
              </div>
            </BPanel>
            <BPanel title="VALUE AT RISK  RISK METRICS" style={{marginTop:1}}>
              <div style={{padding:"4px 8px"}}>
                {[
                  {l:"VAR 95% (1-DAY)",  v:`-${fmt(m.wVol/Math.sqrt(252)*1.645,2)}%`,col:B.yellow},
                  {l:"VAR 99% (1-DAY)",  v:`-${fmt(m.wVol/Math.sqrt(252)*2.326,2)}%`,col:B.red},
                  {l:"MAX DRAWDOWN EST", v:`-${fmt(m.wVol*2.5,1)}%`,                 col:B.red},
                  {l:"SHARPE RATIO",     v:fmt(m.sharpe,2),                          col:m.sharpe>0.6?B.green:m.sharpe>0.3?B.yellow:B.red},
                  {l:"HHI CONC INDEX",   v:fmt(m.hhi,0),                             col:m.hhi>3000?B.red:m.hhi>1500?B.yellow:B.green},
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",
                    borderBottom:i<4?`1px solid ${B.border}`:"none"}}>
                    <span style={{fontSize:8,color:B.gray2,fontFamily:"'Courier New',monospace"}}>{r.l}</span>
                    <span style={{fontSize:11,color:r.col,fontFamily:"'Courier New',monospace",fontWeight:700}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </BPanel>
          </div>
        )}
        {sub==="perf"&&(
          <div>
            <BPanel title="RETURN vs VOLATILITY">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={holdings.map(h=>({n:h.asset.ticker,r:+(h.asset.ytd??0).toFixed(1),v:+(h.asset.vol??0).toFixed(1)}))}>
                  <CartesianGrid strokeDasharray="1 1" stroke={B.border}/>
                  <XAxis dataKey="n" tick={{fill:B.gray3,fontSize:8,fontFamily:"'Courier New',monospace"}}/>
                  <YAxis tick={{fill:B.gray3,fontSize:8,fontFamily:"'Courier New',monospace"}}/>
                  <Tooltip contentStyle={TT_STYLE}/>
                  <Bar dataKey="r" name="YTD %" fill={B.blue} maxBarSize={16}/>
                  <Bar dataKey="v" name="VOL %" fill={B.red}  maxBarSize={16}/>
                </BarChart>
              </ResponsiveContainer>
            </BPanel>
            <BPanel title="YTD PERFORMANCE RANKING" style={{marginTop:1}}>
              {[...holdings].sort((a,b)=>(b.asset.ytd??0)-(a.asset.ytd??0)).map((h,i)=>(
                <div key={h.isin||h.asset.ticker} style={{display:"flex",alignItems:"center",gap:6,
                  padding:"4px 8px",borderBottom:`1px solid ${B.border}`}}>
                  <span style={{fontSize:9,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700,minWidth:44}}>{h.asset.ticker}</span>
                  <div style={{flex:1,height:3,background:B.panel2,position:"relative"}}>
                    <div style={{position:"absolute",top:0,height:"100%",
                      left:(h.asset.ytd??0)<0?`${Math.max(0,50-Math.abs(h.asset.ytd??0)/3)}%`:"50%",
                      width:`${Math.min(50,Math.abs(h.asset.ytd??0)/3)}%`,
                      background:pCol(h.asset.ytd)}}/>
                    <div style={{position:"absolute",top:-1,left:"50%",width:1,height:5,background:B.border}}/>
                  </div>
                  <span style={{fontSize:9,color:pCol(h.asset.ytd),fontFamily:"'Courier New',monospace",fontWeight:700,minWidth:48,textAlign:"right"}}>
                    {pSign(fmt(h.asset.ytd,2))}%
                  </span>
                </div>
              ))}
            </BPanel>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI ADVISOR ───────────────────────────────────────────────────────────────
const SYS_PROMPT=`You are BBGAI, a Bloomberg-style financial AI terminal assistant with expertise in:
portfolio theory (MPT, CAPM, Fama-French), fundamental analysis (DCF, P/E, EV/EBITDA),
technical analysis, risk management (VaR, CVaR, drawdown), asset allocation,
global markets, ETFs, bonds, macro economics, and financial regulations.
The portfolio data you receive is LIVE from Yahoo Finance.
Response style: concise, data-driven, professional terminal style.
Use CAPS for key terms. Max 280 words. Bold **key metrics** with asterisks.
Always end with "BOTTOM LINE:" summary. Respond in English.`;

const QUICK_Q=["ANALYZE PORTFOLIO","DIVERSIFICATION CHECK","RISK ASSESSMENT","IMPROVE ALLOCATION","EXPLAIN SHARPE","VAR ANALYSIS","SECTOR EXPOSURE","REDUCE VOLATILITY"];

function AIAdvisorPage({holdings}) {
  const [msgs,setMsgs]=useState([{role:"assistant",content:"**BBGAI TERMINAL ONLINE  YAHOO FINANCE LIVE DATA**\n\nI am your Bloomberg AI financial advisor with access to your live portfolio data from Yahoo Finance.\n\nI can analyze diversification, risk metrics, sector exposure, performance attribution, and suggest improvements.\n\nBBGAI>_"}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [showQ,setShowQ]=useState(true);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const portCtx=useCallback(()=>{
    if(!holdings.length) return "NO PORTFOLIO LOADED.";
    const m=pMet(holdings);
    return [
      `LIVE PORTFOLIO SNAPSHOT (${holdings.length} SECURITIES — YAHOO FINANCE DATA):`,
      `MKT VALUE: $${fmtM(m.total)} | EXP RET: ${fmt(m.wRet,2)}% | VOL: ${fmt(m.wVol,2)}% | SHARPE: ${fmt(m.sharpe,2)} | BETA: ${fmt(m.wBeta,2)} | DIV YIELD: ${fmt(m.wDiv,2)}%`,
      `SECTORS: ${m.sectors} | GEO REGIONS: ${m.geos} | HHI: ${fmt(m.hhi,0)}`,
      "POSITIONS: "+holdings.map(h=>`${h.asset.ticker}(WT:${(h.value/m.total*100).toFixed(0)}%,VOL:${h.asset.vol??'N/A'}%,BETA:${h.asset.beta??'N/A'},YTD:${h.asset.ytd??'N/A'}%,1D:${h.asset.dayChangePct??'N/A'}%,PE:${h.asset.pe??'N/A'},DIV:${h.asset.dy??'N/A'}%,SECT:${h.asset.sector||'N/A'})`).join(" | "),
    ].join("\n");
  },[holdings]);

  const send=async(text)=>{
    const msg=text||input.trim();
    if(!msg||loading) return;
    setInput(""); setShowQ(false);
    const newMsgs=[...msgs,{role:"user",content:msg}];
    setMsgs(newMsgs); setLoading(true);
    const apiMsgs=newMsgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
    apiMsgs[apiMsgs.length-1].content=`[LIVE PORTFOLIO]\n${portCtx()}\n\n[QUERY]\n${msg}`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYS_PROMPT,messages:apiMsgs})
      });
      const data=await res.json();
      const reply=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"ERROR: NO RESPONSE";
      setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    } catch(e) {
      setMsgs(m=>[...m,{role:"assistant",content:`ERROR: ${e.message}`}]);
    } finally {setLoading(false);}
  };

  const renderMsg=(text)=>text.split("\n").map((line,i)=>{
    if(!line.trim()) return <div key={i} style={{height:4}}/>;
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    const rendered=parts.map((p,j)=>
      p.startsWith("**")&&p.endsWith("**")
        ?<span key={j} style={{color:B.yellow,fontWeight:700}}>{p.slice(2,-2)}</span>:p
    );
    return <div key={i} style={{fontSize:10,color:B.gray1,fontFamily:"'Courier New',monospace",lineHeight:1.6}}>{rendered}</div>;
  });

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:B.panel2,borderBottom:`1px solid ${B.border}`,padding:"4px 8px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <span style={{fontSize:11,color:B.blue,fontFamily:"'Courier New',monospace",fontWeight:700}}>BBGAI</span>
          <span style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace",marginLeft:8}}>AI FINANCIAL TERMINAL  YAHOO FINANCE LIVE</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:6,height:6,background:B.green,animation:"blink 2s infinite"}}/>
          <span style={{fontSize:8,color:B.green,fontFamily:"'Courier New',monospace"}}>ONLINE</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:4}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:"4px 8px",borderBottom:`1px solid ${B.border}`,
            background:m.role==="user"?"#000822":"transparent"}}>
            <div style={{fontSize:8,color:m.role==="user"?B.blue:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2,fontWeight:700}}>
              {m.role==="user"?"USER>":"BBGAI>"}
            </div>
            <div>{renderMsg(m.content)}</div>
          </div>
        ))}
        {loading&&(
          <div style={{padding:"6px 8px",borderBottom:`1px solid ${B.border}`}}>
            <div style={{fontSize:8,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:2}}>BBGAI{">"}</div>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {[0,1,2].map(j=>(
                <div key={j} style={{width:5,height:5,background:B.blue,
                  animation:`pulse 1s ${j*0.2}s infinite ease-in-out`}}/>
              ))}
              <span style={{fontSize:9,color:B.gray3,fontFamily:"'Courier New',monospace",marginLeft:4}}>PROCESSING LIVE DATA...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {showQ&&(
        <div style={{padding:"3px 4px",borderTop:`1px solid ${B.border}`,background:B.panel2,flexShrink:0}}>
          <div style={{fontSize:7,color:B.gray3,fontFamily:"'Courier New',monospace",marginBottom:3,paddingLeft:2}}>QUICK COMMANDS:</div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {QUICK_Q.map((q,i)=>(
              <button key={i} onClick={()=>send(q)} disabled={loading} style={{
                background:"#000",border:`1px solid ${B.border}`,padding:"3px 6px",
                color:B.gray2,fontSize:8,cursor:"pointer",
                fontFamily:"'Courier New',monospace",textTransform:"uppercase"}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${B.blue}`,background:B.panel2,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <span style={{fontSize:10,color:B.blue,fontFamily:"'Courier New',monospace",padding:"8px 8px",fontWeight:700}}>{">"}</span>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") send(); }}
            placeholder="ENTER COMMAND OR QUERY..."
            style={{flex:1,background:"transparent",border:"none",
              padding:"8px 0",color:B.yellow,fontSize:10,
              fontFamily:"'Courier New',monospace",outline:"none",
              letterSpacing:"0.04em",textTransform:"uppercase"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
            background:loading||!input.trim()?B.panel2:B.blue,
            border:"none",padding:"8px 12px",color:B.white,
            fontFamily:"'Courier New',monospace",fontSize:9,fontWeight:700,
            cursor:loading||!input.trim()?"not-allowed":"pointer",textTransform:"uppercase"}}>GO</button>
        </div>
        <div style={{fontSize:7,color:B.gray4,fontFamily:"'Courier New',monospace",
          padding:"0 8px 4px",letterSpacing:"0.04em"}}>
          FOR INFORMATIONAL PURPOSES ONLY. NOT FINANCIAL ADVICE.
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]     = useState("home");
  const [holdings,setHoldings] = useState([]);
  const [refreshing,setRefreshing] = useState(false);

  const addToPortfolio = (asset, qty) => {
    setHoldings(prev => {
      const key = asset.ticker || asset.symbol;
      const idx = prev.findIndex(h => h.asset.ticker===key || h.asset.symbol===key);
      const value = qty * asset.price;
      if (idx>=0) {
        const n=[...prev];
        n[idx]={...n[idx],qty:n[idx].qty+qty,value:n[idx].value+value};
        return n;
      }
      return [...prev, {isin:asset.isin||key, asset, qty, value}];
    });
  };

  const removeFromPortfolio = (key) =>
    setHoldings(h => h.filter(x => x.isin!==key && x.asset.ticker!==key));

  const changeQty = (key, qty) =>
    setHoldings(prev => prev.map(h => {
      if (h.isin!==key && h.asset.ticker!==key) return h;
      return {...h, qty, value: qty*h.asset.price};
    }).filter(h => h.qty>0));

  // Refresh all live prices
  const refreshPrices = useCallback(async () => {
    if (!holdings.length || refreshing) return;
    setRefreshing(true);
    try {
      const symbols = holdings.map(h => h.asset.ticker);
      const data    = await batchRefresh(symbols);
      const bySymbol = Object.fromEntries(data.map(d=>[d.symbol,d]));
      setHoldings(prev => prev.map(h => {
        const live = bySymbol[h.asset.ticker];
        if (!live) return h;
        const newAsset = {...h.asset,
          price:        live.price ?? h.asset.price,
          dayChangePct: live.dayChangePct ?? h.asset.dayChangePct,
          pe:           live.pe ?? h.asset.pe,
          dividendYield:live.dividendYield ?? h.asset.dy,
          dy:           live.dividendYield ?? h.asset.dy,
          marketCap:    live.marketCap ?? h.asset.marketCap,
        };
        return {...h, asset:newAsset, value: h.qty * (live.price ?? h.asset.price)};
      }));
    } catch(e) {
      console.error("Refresh failed:", e.message);
    } finally { setRefreshing(false); }
  }, [holdings, refreshing]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!holdings.length) return;
    const t = setInterval(refreshPrices, 60000);
    return () => clearInterval(t);
  }, [refreshPrices]);

  return (
    <PhoneShell>
      {(time) => (
        <>
          <TopBar time={time}/>
          <FKeyBar page={page} setPage={setPage}/>
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {page==="home"       && <HomePage     holdings={holdings} setPage={setPage} onRefresh={refreshPrices} refreshing={refreshing}/>}
            {page==="search"     && <SearchPage   onAdd={addToPortfolio} portfolio={holdings}/>}
            {page==="portfolio"  && <PortfolioPage holdings={holdings} onRemove={removeFromPortfolio} onChangeQty={changeQty}/>}
            {page==="analysis"   && <AnalysisPage  holdings={holdings}/>}
            {page==="ai"         && <AIAdvisorPage holdings={holdings}/>}
          </div>
          <BottomNav page={page} setPage={setPage} badge={holdings.length}/>
        </>
      )}
    </PhoneShell>
  );
}
