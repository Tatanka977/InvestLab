import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
  AreaChart, Area, ReferenceLine
} from "recharts";

// ─── ASSET DATABASE ──────────────────────────────────────────────────────────
const DB = [
  { isin:"IE00B4L5Y983", ticker:"IWDA",  name:"iShares Core MSCI World ETF",     type:"ETF",      sector:"Global Equity",  geo:"Global",    currency:"USD", price:98.42,   ytd:12.3,  vol:13.2, expRet:8.5,  pe:18.2, div:1.2, beta:0.98, mc:"Grande",  country:"Ireland",  desc:"ETF su circa 1500 azioni dei mercati sviluppati mondiali. Replica l'indice MSCI World." },
  { isin:"IE00B3RBWM25", ticker:"VWRL",  name:"Vanguard FTSE All-World ETF",     type:"ETF",      sector:"Global Equity",  geo:"Global",    currency:"USD", price:112.60,  ytd:11.8,  vol:13.5, expRet:8.3,  pe:17.8, div:1.5, beta:1.00, mc:"Grande",  country:"Ireland",  desc:"ETF su 3700+ azioni globali, mercati sviluppati ed emergenti." },
  { isin:"US0378331005", ticker:"AAPL",  name:"Apple Inc.",                       type:"Azione",   sector:"Tecnologia",     geo:"USA",       currency:"USD", price:213.49,  ytd:18.2,  vol:22.1, expRet:10.2, pe:31.2, div:0.5, beta:1.24, mc:"Mega",    country:"USA",      desc:"La più grande azienda al mondo per capitalizzazione. iPhone, Mac, servizi cloud." },
  { isin:"US5949181045", ticker:"MSFT",  name:"Microsoft Corporation",            type:"Azione",   sector:"Tecnologia",     geo:"USA",       currency:"USD", price:421.11,  ytd:15.6,  vol:19.8, expRet:9.8,  pe:34.5, div:0.7, beta:1.11, mc:"Mega",    country:"USA",      desc:"Leader nel cloud (Azure), produttività (Office 365) e AI (partnership OpenAI)." },
  { isin:"US02079K3059", ticker:"GOOGL", name:"Alphabet Inc. (Google)",           type:"Azione",   sector:"Tecnologia",     geo:"USA",       currency:"USD", price:178.32,  ytd:22.1,  vol:24.3, expRet:11.0, pe:22.1, div:0.0, beta:1.06, mc:"Mega",    country:"USA",      desc:"Holding di Google. Dominante nella ricerca, pubblicità digitale, cloud e AI." },
  { isin:"US67066G1040", ticker:"NVDA",  name:"NVIDIA Corporation",               type:"Azione",   sector:"Tecnologia",     geo:"USA",       currency:"USD", price:131.38,  ytd:145.2, vol:48.7, expRet:18.0, pe:65.3, div:0.0, beta:1.92, mc:"Mega",    country:"USA",      desc:"Leader mondiale in GPU per AI, data center e gaming. Alta volatilità e crescita." },
  { isin:"US88160R1014", ticker:"TSLA",  name:"Tesla Inc.",                       type:"Azione",   sector:"Cons. Disc.",    geo:"USA",       currency:"USD", price:248.50,  ytd:-12.4, vol:52.3, expRet:9.5,  pe:58.1, div:0.0, beta:2.10, mc:"Mega",    country:"USA",      desc:"Produttore di veicoli elettrici e sistemi di stoccaggio energetico. Beta elevato." },
  { isin:"US4592001014", ticker:"IBM",   name:"IBM Corporation",                  type:"Azione",   sector:"Tecnologia",     geo:"USA",       currency:"USD", price:215.80,  ytd:8.4,   vol:18.6, expRet:7.5,  pe:24.4, div:3.2, beta:0.72, mc:"Grande",  country:"USA",      desc:"Tecnologia enterprise: cloud ibrido, AI (Watson), consulenza IT. Dividendo stabile." },
  { isin:"US46090E1038", ticker:"QQQ",   name:"Invesco NASDAQ 100 ETF",           type:"ETF",      sector:"Tecnologia",     geo:"USA",       currency:"USD", price:487.21,  ytd:19.4,  vol:17.6, expRet:10.5, pe:29.8, div:0.6, beta:1.18, mc:"Grande",  country:"USA",      desc:"ETF che replica il NASDAQ-100, 100 maggiori non-finanziarie quotate al NASDAQ." },
  { isin:"IE00B52MJY50", ticker:"CSPX",  name:"iShares Core S&P 500 ETF",        type:"ETF",      sector:"US Equity",      geo:"USA",       currency:"USD", price:535.20,  ytd:13.1,  vol:14.8, expRet:8.8,  pe:22.3, div:1.3, beta:1.00, mc:"Grande",  country:"Ireland",  desc:"ETF sulle 500 maggiori aziende USA. Considerato benchmark del mercato azionario." },
  { isin:"DE0007164600", ticker:"SAP",   name:"SAP SE",                           type:"Azione",   sector:"Tecnologia",     geo:"Europa",    currency:"EUR", price:198.30,  ytd:14.7,  vol:20.1, expRet:9.2,  pe:28.7, div:1.1, beta:0.88, mc:"Mega",    country:"Germania", desc:"Leader europeo nel software ERP e gestione aziendale. Forte transizione al cloud." },
  { isin:"DE0005140008", ticker:"DBK",   name:"Deutsche Bank AG",                 type:"Azione",   sector:"Finanza",        geo:"Europa",    currency:"EUR", price:16.45,   ytd:9.2,   vol:28.4, expRet:7.8,  pe:8.1,  div:2.8, beta:1.44, mc:"Grande",  country:"Germania", desc:"Maggiore banca tedesca. Attiva in investment banking, retail e gestione patrimoniale." },
  { isin:"FR0000131104", ticker:"BNP",   name:"BNP Paribas SA",                   type:"Azione",   sector:"Finanza",        geo:"Europa",    currency:"EUR", price:64.72,   ytd:7.8,   vol:24.6, expRet:7.2,  pe:7.4,  div:5.1, beta:1.31, mc:"Grande",  country:"Francia",  desc:"Prima banca europea per attivi. Alto dividendo, esposizione ai mercati europei." },
  { isin:"GB0002634946", ticker:"DGE",   name:"Diageo PLC",                       type:"Azione",   sector:"Cons. Staples",  geo:"Europa",    currency:"GBP", price:23.18,   ytd:-3.2,  vol:16.4, expRet:6.5,  pe:18.9, div:3.8, beta:0.61, mc:"Mega",    country:"UK",       desc:"Leader mondiale in spirits premium (Johnnie Walker, Guinness). Difensivo." },
  { isin:"IT0003132476", ticker:"ENI",   name:"ENI S.p.A.",                       type:"Azione",   sector:"Energia",        geo:"Europa",    currency:"EUR", price:13.82,   ytd:2.1,   vol:22.8, expRet:6.8,  pe:9.2,  div:6.4, beta:0.87, mc:"Grande",  country:"Italia",   desc:"Multinazionale energetica italiana. Transizione verso rinnovabili, alto dividendo." },
  { isin:"LU0290358497", ticker:"XMEM",  name:"Xtrackers MSCI Emerging Mkts",    type:"ETF",      sector:"EM Equity",      geo:"Emergenti", currency:"USD", price:22.14,   ytd:5.4,   vol:18.9, expRet:9.5,  pe:13.2, div:2.1, beta:1.15, mc:"Grande",  country:"Lussemb.", desc:"ETF sui mercati emergenti. Esposizione a Cina, India, Brasile, Taiwan." },
  { isin:"IE00B1FZSF77", ticker:"IEAC",  name:"iShares € Corp Bond ETF",         type:"Bond ETF", sector:"Corp Bonds",     geo:"Europa",    currency:"EUR", price:115.60,  ytd:3.2,   vol:5.8,  expRet:4.1,  pe:null, div:3.6, beta:0.08, mc:"—",       country:"Ireland",  desc:"ETF su obbligazioni corporate investment grade in euro. Basso rischio, rendimento stabile." },
  { isin:"US9128284X26", ticker:"T2Y",   name:"US Treasury 2Y Bond",             type:"Bond",     sector:"Gov Bonds",      geo:"USA",       currency:"USD", price:98.50,   ytd:2.8,   vol:2.1,  expRet:3.2,  pe:null, div:4.9, beta:0.02, mc:"—",       country:"USA",      desc:"Titolo di Stato USA a 2 anni. Massima sicurezza, rendimento attuale ~4.9%." },
  { isin:"IE00B4WXJJ64", ticker:"IAUP",  name:"iShares Gold Producers ETF",      type:"ETF",      sector:"Commodities",    geo:"Global",    currency:"USD", price:14.32,   ytd:8.9,   vol:26.3, expRet:6.2,  pe:null, div:0.8, beta:0.22, mc:"—",       country:"Ireland",  desc:"ETF su aziende produttrici di oro. Correlazione negativa con equity in crisi." },
  { isin:"JP3633400001", ticker:"7203",  name:"Toyota Motor Corporation",         type:"Azione",   sector:"Cons. Disc.",    geo:"Asia",      currency:"JPY", price:2940,    ytd:11.2,  vol:21.3, expRet:8.1,  pe:9.8,  div:3.1, beta:0.74, mc:"Mega",    country:"Giappone", desc:"Leader mondiale dell'auto. Ibrido e idrogeno. Diversificazione geografica in Asia." },
  { isin:"US17275R1023", ticker:"CVX",   name:"Chevron Corporation",              type:"Azione",   sector:"Energia",        geo:"USA",       currency:"USD", price:148.20,  ytd:3.4,   vol:21.5, expRet:7.2,  pe:13.1, div:4.2, beta:0.82, mc:"Mega",    country:"USA",      desc:"Seconda major petrolifera USA. Dividendo solido, forte generazione di cassa." },
  { isin:"US4781601046", ticker:"JNJ",   name:"Johnson & Johnson",                type:"Azione",   sector:"Salute",         geo:"USA",       currency:"USD", price:147.30,  ytd:2.8,   vol:13.4, expRet:7.0,  pe:16.2, div:3.1, beta:0.55, mc:"Mega",    country:"USA",      desc:"Pharma e medtech. Dividendo crescente da 60+ anni. Titolo difensivo classico." },
  { isin:"US7427181091", ticker:"PG",    name:"Procter & Gamble Co.",             type:"Azione",   sector:"Cons. Staples",  geo:"USA",       currency:"USD", price:162.10,  ytd:5.1,   vol:12.8, expRet:7.1,  pe:24.3, div:2.5, beta:0.56, mc:"Mega",    country:"USA",      desc:"Beni di consumo (Gillette, Pampers, Tide). Dividend Aristocrat, beta bassissimo." },
  { isin:"US38141G1040", ticker:"GS",    name:"Goldman Sachs Group",              type:"Azione",   sector:"Finanza",        geo:"USA",       currency:"USD", price:512.30,  ytd:24.1,  vol:25.6, expRet:10.8, pe:13.8, div:2.3, beta:1.38, mc:"Mega",    country:"USA",      desc:"Primo investment bank mondiale. Forte in M&A, trading, asset management." },
  { isin:"IE00B4L5YX21", ticker:"EMIM",  name:"iShares MSCI EM IMI ETF",         type:"ETF",      sector:"EM Equity",      geo:"Emergenti", currency:"USD", price:31.48,   ytd:6.1,   vol:17.2, expRet:9.8,  pe:12.8, div:2.4, beta:1.18, mc:"Grande",  country:"Ireland",  desc:"ETF mercati emergenti small, mid e large cap. Copertura ampia Asia-LatAm-Africa." },
];

const byIsin   = Object.fromEntries(DB.map(d=>[d.isin,d]));
const byTicker = Object.fromEntries(DB.map(d=>[d.ticker.toUpperCase(),d]));

const lookupAny = (q) => {
  const s = q.trim().toUpperCase();
  return byIsin[s] || byTicker[s] || null;
};
const fuzzy = (q) => {
  if(!q.trim()) return DB;
  const s = q.toLowerCase();
  return DB.filter(d =>
    d.isin.toLowerCase().includes(s) ||
    d.ticker.toLowerCase().includes(s) ||
    d.name.toLowerCase().includes(s) ||
    d.sector.toLowerCase().includes(s) ||
    d.country.toLowerCase().includes(s)
  );
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:       "#050810",
  surface:  "#080C17",
  card:     "#0C1220",
  card2:    "#101828",
  border:   "#182035",
  borderL:  "#1E2D45",
  text:     "#D8E4F0",
  textDim:  "#8A9BB5",
  muted:    "#4A5A72",
  faint:    "#131D2E",
  accent:   "#00F5B0",
  accentDim:"#00C48A",
  blue:     "#3B91FF",
  violet:   "#8B5CF6",
  amber:    "#F59E0B",
  red:      "#F05060",
  green:    "#22D3A0",
  cyan:     "#22D3EE",
  gold:     "#D4AF37",
};

const PIE_COLS = [
  "#00F5B0","#3B91FF","#8B5CF6","#F59E0B","#F05060",
  "#22D3EE","#A3E635","#FB923C","#E879F9","#34D399"
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt  = (n,d=2) => n==null ? "—" : (+n).toFixed(d);
const fmtK = (n) => n>=1e6 ? `€${(n/1e6).toFixed(2)}M` : `€${n.toLocaleString("it-IT",{maximumFractionDigits:0})}`;
const pctC = (v) => v>0 ? C.accent : v<0 ? C.red : C.textDim;
const groupBy = (arr, key, total) => {
  const m={};
  arr.forEach(h=>{ const k=h.asset[key]; m[k]=(m[k]||0)+h.value; });
  return Object.entries(m).map(([name,value])=>({name,value,pct:+(value/total*100).toFixed(1)}))
    .sort((a,b)=>b.value-a.value);
};
const pMet = (hs) => {
  if(!hs.length) return null;
  const total = hs.reduce((s,h)=>s+h.value,0);
  const wRet  = hs.reduce((s,h)=>s+(h.value/total)*h.asset.expRet,0);
  const wVol  = Math.sqrt(hs.reduce((s,h)=>s+Math.pow((h.value/total)*h.asset.vol,2),0));
  const sharpe= (wRet-2.5)/wVol;
  const wBeta = hs.reduce((s,h)=>s+(h.value/total)*h.asset.beta,0);
  const wDiv  = hs.reduce((s,h)=>s+(h.value/total)*h.asset.div,0);
  const sectors = new Set(hs.map(h=>h.asset.sector)).size;
  const geos    = new Set(hs.map(h=>h.asset.geo)).size;
  const maxW    = Math.max(...hs.map(h=>h.value/total*100));
  const hhi     = hs.reduce((s,h)=>s+Math.pow(h.value/total*100,2),0);
  return {total,wRet,wVol,sharpe,wBeta,wDiv,sectors,geos,maxW,hhi};
};

// fake price history for sparklines
const makeHistory = (asset, days=60) => {
  const pts=[]; let p=asset.price*(1-asset.ytd/100);
  for(let i=0;i<days;i++){
    const noise=(Math.sin(i*2.3+asset.price%7)*0.012+Math.cos(i*1.7+asset.vol)*0.01)*p;
    const drift=(asset.ytd/100/days)*p;
    p+=drift+noise;
    pts.push({d:i, v:+p.toFixed(2)});
  }
  return pts;
};

// efficient frontier points (mock)
const makeFrontier = () =>
  Array.from({length:30},(_,i)=>{
    const v=3+i*2.2; const r=2.8+Math.sqrt(i)*1.8+Math.random()*0.4;
    return {vol:+v.toFixed(1),ret:+r.toFixed(2)};
  });

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
const Tag = ({children,col})=>(
  <span style={{display:"inline-block",padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:"0.07em",
    background:(col||C.blue)+"1A",color:col||C.blue,border:`1px solid ${(col||C.blue)}30`}}>{children}</span>
);
const KPIBox = ({label,value,sub,col,mono})=>(
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 16px",flex:1,minWidth:120}}>
    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:5}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",color:col||C.text,
      fontVariantNumeric:mono?"tabular-nums":undefined}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>{sub}</div>}
  </div>
);
const SectionTitle = ({children})=>(
  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>
    {children}
  </div>
);
const Divider = ()=><div style={{height:1,background:C.border}}/>;
const Scrollable = ({children,style})=>(
  <div style={{overflowY:"auto",...style}}>{children}</div>
);

// Recharts tooltip style
const TT = {background:C.card,border:`1px solid ${C.borderL}`,borderRadius:8,fontSize:11,color:C.text};

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function Donut({data,title,size=140}){
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{display:"flex",gap:14,alignItems:"center"}}>
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={size*0.29} outerRadius={size*0.49}
              paddingAngle={2} dataKey="value" strokeWidth={0}>
              {data.map((_,i)=><Cell key={i} fill={PIE_COLS[i%PIE_COLS.length]}/>)}
            </Pie>
            <Tooltip formatter={(v,n,p)=>[fmtK(v),p.payload.name]} contentStyle={TT}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
          {data.slice(0,7).map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:7,height:7,borderRadius:1,background:PIE_COLS[i%PIE_COLS.length],flexShrink:0}}/>
              <span style={{fontSize:11,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
              <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ALLOC BAR ───────────────────────────────────────────────────────────────
function AllocBar({data,title}){
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
      <SectionTitle>{title}</SectionTitle>
      {data.map((d,i)=>(
        <div key={d.name} style={{marginBottom:11}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,color:C.text,fontWeight:500}}>{d.name}</span>
            <span style={{fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{d.pct}% · {fmtK(d.value)}</span>
          </div>
          <div style={{height:5,background:C.faint,borderRadius:3}}>
            <div style={{height:"100%",width:`${d.pct}%`,
              background:`linear-gradient(90deg,${PIE_COLS[i%PIE_COLS.length]},${PIE_COLS[(i+3)%PIE_COLS.length]}80)`,
              borderRadius:3,transition:"width 0.5s ease"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── RADAR SCORE ─────────────────────────────────────────────────────────────
function RadarScore({holdings}){
  const total=holdings.reduce((s,h)=>s+h.value,0)||1;
  const avgVol=holdings.reduce((s,h)=>s+(h.value/total)*h.asset.vol,0);
  const data=[
    {s:"Rendimento", v:Math.min(100,holdings.reduce((s,h)=>s+(h.value/total)*h.asset.expRet,0)/18*100)},
    {s:"Diversif.",  v:Math.min(100,new Set(holdings.map(h=>h.asset.sector)).size/8*100)},
    {s:"Geografica", v:Math.min(100,new Set(holdings.map(h=>h.asset.geo)).size/5*100)},
    {s:"Stabilità",  v:Math.max(0,100-avgVol*2)},
    {s:"Liquidità",  v:holdings.filter(h=>h.asset.type.includes("ETF")||h.asset.type.includes("Bond")).length/holdings.length*100},
    {s:"Multi-val.", v:Math.min(100,new Set(holdings.map(h=>h.asset.currency)).size/4*100)},
  ];
  const score=Math.round(data.reduce((s,d)=>s+d.v,0)/data.length);
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:0}}>
        <SectionTitle>Score Portafoglio</SectionTitle>
        <div style={{fontSize:28,fontWeight:800,fontFamily:"'Syne',sans-serif",
          color:score>65?C.accent:score>40?C.amber:C.red,marginTop:-8}}>
          {score}<span style={{fontSize:12,color:C.muted,fontWeight:400}}>/100</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data}>
          <PolarGrid stroke={C.border}/>
          <PolarAngleAxis dataKey="s" tick={{fill:C.muted,fontSize:10}}/>
          <Radar dataKey="v" stroke={C.accent} fill={C.accent} fillOpacity={0.12} strokeWidth={1.5}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── SEARCH PAGE ─────────────────────────────────────────────────────────────
function SearchPage({onAdd,portfolio}){
  const [q,setQ]=useState("");
  const [sel,setSel]=useState(null);
  const [qty,setQty]=useState("1");
  const results=useMemo(()=>fuzzy(q),[q]);
  const inP=(isin)=>portfolio.some(h=>h.isin===isin);
  const hist=useMemo(()=>sel?makeHistory(sel):[],[sel]);

  return(
    <div style={{display:"flex",height:"calc(100vh - 56px)",overflow:"hidden"}}>
      {/* sidebar */}
      <div style={{width:320,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.surface}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13}}>⌕</span>
            <input value={q} onChange={e=>{setQ(e.target.value);setSel(null);}}
              placeholder="ISIN · ticker · nome · settore"
              autoFocus
              style={{width:"100%",boxSizing:"border-box",background:C.faint,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"9px 10px 9px 28px",color:C.text,fontSize:12,
                fontFamily:"'DM Mono',monospace",outline:"none",letterSpacing:"0.04em"}}/>
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:7,paddingLeft:2}}>{results.length} titoli · cerca per ISIN, ticker, nome, paese</div>
        </div>
        <Scrollable style={{flex:1}}>
          {results.map(a=>{
            const active=sel?.isin===a.isin;
            const added=inP(a.isin);
            return(
              <div key={a.isin} onClick={()=>{setSel(a);setQty("1");}}
                style={{padding:"11px 14px",cursor:"pointer",
                  background:active?C.card:"transparent",
                  borderLeft:`2px solid ${active?C.accent:"transparent"}`,
                  borderBottom:`1px solid ${C.border}`,transition:"background 0.1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Mono',monospace"}}>{a.ticker}</span>
                    {added&&<Tag col={C.accent}>✓ aggiunto</Tag>}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:pctC(a.ytd)}}>{a.ytd>0?"+":""}{a.ytd}%</span>
                </div>
                <div style={{fontSize:10,color:C.textDim,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Tag>{a.type}</Tag><Tag col={C.violet}>{a.geo}</Tag><Tag col={C.amber}>{a.sector}</Tag>
                </div>
              </div>
            );
          })}
        </Scrollable>
      </div>

      {/* detail */}
      <Scrollable style={{flex:1,padding:"18px 22px",background:C.bg}}>
        {!sel&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.muted,gap:10}}>
            <div style={{fontSize:36,opacity:0.15}}>◎</div>
            <div style={{fontSize:13}}>Seleziona un titolo dalla lista</div>
            <div style={{fontSize:11,color:C.faint,marginTop:4,textAlign:"center",maxWidth:280}}>
              Puoi cercare per ISIN (IE00B4L5Y983), ticker (NVDA), nome o settore
            </div>
          </div>
        )}
        {sel&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* header card */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:26,fontWeight:900,fontFamily:"'Syne',sans-serif",color:C.text}}>{sel.ticker}</span>
                    <Tag>{sel.type}</Tag><Tag col={C.violet}>{sel.sector}</Tag>
                    <Tag col={C.amber}>{sel.geo}</Tag><Tag col={C.cyan}>{sel.country}</Tag>
                  </div>
                  <div style={{fontSize:13,color:C.textDim,marginBottom:4}}>{sel.name}</div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{sel.isin}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text}}>
                    {sel.currency} {sel.price.toLocaleString()}
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:pctC(sel.ytd)}}>{sel.ytd>0?"+":""}{sel.ytd}% YTD</div>
                </div>
              </div>
              <div style={{marginTop:12,fontSize:12,color:C.textDim,lineHeight:1.6,background:C.faint,padding:"10px 14px",borderRadius:8,borderLeft:`3px solid ${C.accent}40`}}>
                {sel.desc}
              </div>
            </div>

            {/* sparkline */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Andamento 60 giorni (simulato)</SectionTitle>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={hist}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={["auto","auto"]} hide/>
                  <XAxis dataKey="d" hide/>
                  <Tooltip contentStyle={TT} formatter={(v)=>[`${sel.currency} ${v}`,"Prezzo"]} labelFormatter={()=>""}/>
                  <ReferenceLine y={hist[0]?.v} stroke={C.border} strokeDasharray="3 3"/>
                  <Area type="monotone" dataKey="v" stroke={C.accent} strokeWidth={1.5} fill="url(#ag)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* KPIs grid */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Indicatori Chiave</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.border,borderRadius:8,overflow:"hidden"}}>
                {[
                  {l:"P/E Ratio",    v:sel.pe?fmt(sel.pe,1):"—",    n:"Prezzo/Utili"},
                  {l:"Dividendo",    v:`${sel.div}%`,               n:"Yield annuo"},
                  {l:"Beta",         v:fmt(sel.beta,2),             n:"vs Mercato", col:sel.beta>1.5?C.red:sel.beta>1?C.amber:C.green},
                  {l:"Volatilità",   v:`${fmt(sel.vol,1)}%`,        n:"Annualizzata",col:sel.vol>35?C.red:sel.vol>20?C.amber:C.green},
                  {l:"Rend.Atteso",  v:`${fmt(sel.expRet,1)}%`,     n:"Stima annua", col:C.accent},
                  {l:"YTD",          v:`${sel.ytd>0?"+":""}${sel.ytd}%`,n:"Anno corrente",col:pctC(sel.ytd)},
                  {l:"Market Cap",   v:sel.mc,                      n:"Dimensione"},
                  {l:"Valuta",       v:sel.currency,                n:"Denominazione"},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.card2,padding:"13px 15px"}}>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:19,fontWeight:700,fontFamily:"'DM Mono',monospace",color:k.col||C.text}}>{k.v}</div>
                    <div style={{fontSize:9,color:C.muted,marginTop:2}}>{k.n}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* risk bars */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Profilo Rischio/Rendimento</SectionTitle>
              {[
                {l:"Volatilità Annua",  v:sel.vol,       max:55, col:sel.vol>35?C.red:sel.vol>20?C.amber:C.green, fmt:`${fmt(sel.vol,1)}%`},
                {l:"Beta vs Benchmark", v:sel.beta*50,   max:100,col:sel.beta>1.5?C.red:sel.beta>1?C.amber:C.green,fmt:fmt(sel.beta,2)},
                {l:"Rendimento Atteso", v:sel.expRet,    max:22, col:C.blue, fmt:`${fmt(sel.expRet,1)}%`},
                {l:"Dividend Yield",    v:sel.div,       max:8,  col:C.amber, fmt:`${fmt(sel.div,1)}%`},
              ].map(r=>(
                <div key={r.l} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:C.textDim}}>{r.l}</span>
                    <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:r.col}}>{r.fmt}</span>
                  </div>
                  <div style={{height:5,background:C.faint,borderRadius:3}}>
                    <div style={{height:"100%",width:`${Math.min(100,r.v/r.max*100)}%`,background:r.col,borderRadius:3,transition:"width 0.4s ease"}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* add panel */}
            <div style={{background:C.card,border:`1px solid ${C.accent}30`,borderRadius:14,padding:18}}>
              <SectionTitle>Aggiungi al Portafoglio</SectionTitle>
              <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Quantità</div>
                  <input type="number" min="0.001" step="any" value={qty} onChange={e=>setQty(e.target.value)}
                    style={{width:120,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                      padding:"9px 12px",color:C.text,fontSize:14,fontFamily:"'DM Mono',monospace",outline:"none"}}/>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Controvalore</div>
                  <div style={{padding:"9px 14px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                    fontSize:14,fontFamily:"'DM Mono',monospace",color:C.blue,minWidth:160}}>
                    {sel.currency} {((parseFloat(qty)||0)*sel.price).toLocaleString(undefined,{maximumFractionDigits:2})}
                  </div>
                </div>
                <button onClick={()=>{ const n=parseFloat(qty); if(n>0) onAdd(sel,n); }}
                  style={{padding:"9px 22px",
                    background:inP(sel.isin)?`${C.accent}20`:`linear-gradient(135deg,${C.accent},${C.accentDim})`,
                    border:inP(sel.isin)?`1px solid ${C.accent}50`:"none",
                    borderRadius:8,color:inP(sel.isin)?C.accent:"#050810",
                    fontWeight:800,fontSize:13,cursor:"pointer",letterSpacing:"0.04em",fontFamily:"'Syne',sans-serif"}}>
                  {inP(sel.isin)?"↑ Aggiorna":"+ Aggiungi"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Scrollable>
    </div>
  );
}

// ─── PORTFOLIO PAGE ───────────────────────────────────────────────────────────
function PortfolioPage({holdings,onRemove,onChangeQty}){
  const [sub,setSub]=useState("composizione");
  const m=useMemo(()=>pMet(holdings),[holdings]);
  const SUBS=["composizione","allocazione","rischio","frontiera"];

  if(!holdings.length) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"calc(100vh - 100px)",color:C.muted,gap:12}}>
      <div style={{fontSize:44,opacity:0.1}}>◎</div>
      <div style={{fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif",color:C.text}}>Portafoglio vuoto</div>
      <div style={{fontSize:12}}>Vai su <b style={{color:C.accent}}>Ricerca</b> per aggiungere titoli</div>
    </div>
  );

  const sD=groupBy(holdings,"sector",m.total);
  const gD=groupBy(holdings,"geo",m.total);
  const tD=groupBy(holdings,"type",m.total);
  const cD=groupBy(holdings,"currency",m.total);
  const frontier=makeFrontier();

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)",overflow:"hidden"}}>
      {/* KPI strip */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0,overflowX:"auto"}}>
        {[
          {l:"Valore Totale",   v:fmtK(m.total),              col:C.text},
          {l:"Rendimento Att.", v:`${fmt(m.wRet,1)}%`,         col:C.accent},
          {l:"Volatilità",      v:`${fmt(m.wVol,1)}%`,         col:m.wVol>25?C.red:m.wVol>15?C.amber:C.green},
          {l:"Sharpe Ratio",    v:fmt(m.sharpe,2),             col:m.sharpe>0.7?C.accent:m.sharpe>0.3?C.amber:C.red},
          {l:"Beta Port.",      v:fmt(m.wBeta,2),              col:m.wBeta>1.3?C.red:C.text},
          {l:"Div. Yield",      v:`${fmt(m.wDiv,1)}%`,         col:C.amber},
          {l:"Settori",         v:`${m.sectors}`,              col:C.blue},
          {l:"Aree Geo",        v:`${m.geos}`,                 col:C.violet},
          {l:"HHI Conc.",       v:fmt(m.hhi,0),                col:m.hhi>3000?C.red:m.hhi>1500?C.amber:C.green, note:m.hhi>3000?"Alta":"Bassa"},
          {l:"Posizioni",       v:`${holdings.length}`,        col:C.text},
        ].map((k,i)=>(
          <div key={i} style={{padding:"10px 18px",borderRight:`1px solid ${C.border}`,minWidth:105,flexShrink:0}}>
            <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:17,fontWeight:800,fontFamily:"'Syne',sans-serif",color:k.col}}>{k.v}</div>
            {k.note&&<div style={{fontSize:8,color:k.col,marginTop:2}}>{k.note}</div>}
          </div>
        ))}
      </div>

      {/* sub tabs */}
      <div style={{display:"flex",padding:"0 18px",borderBottom:`1px solid ${C.border}`,background:C.bg,flexShrink:0}}>
        {SUBS.map(t=>(
          <button key={t} onClick={()=>setSub(t)} style={{padding:"9px 14px",background:"none",border:"none",cursor:"pointer",
            color:sub===t?C.accent:C.muted,
            borderBottom:`2px solid ${sub===t?C.accent:"transparent"}`,
            fontSize:11,fontWeight:700,textTransform:"capitalize",letterSpacing:"0.07em"}}>
            {t}
          </button>
        ))}
      </div>

      <Scrollable style={{flex:1,padding:"18px 20px",background:C.bg}}>
        {/* COMPOSIZIONE */}
        {sub==="composizione"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 90px 90px 110px 90px 80px 80px 36px",
                padding:"9px 16px",borderBottom:`1px solid ${C.border}`,gap:0,background:C.surface}}>
                {["Titolo","Tipo","Qtà","Valore","Peso","YTD","Vol.",""].map((h,i)=>(
                  <div key={i} style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",
                    letterSpacing:"0.1em",textAlign:i>1?"right":"left"}}>{h}</div>
                ))}
              </div>
              {holdings.map((h,i)=>{
                const w=(h.value/m.total*100).toFixed(1);
                return(
                  <div key={h.isin} style={{display:"grid",gridTemplateColumns:"2fr 90px 90px 110px 80px 80px 80px 36px",
                    padding:"11px 16px",borderBottom:i<holdings.length-1?`1px solid ${C.border}`:"none",
                    alignItems:"center",gap:0,transition:"background 0.1s"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                        <span style={{fontWeight:700,fontSize:12,fontFamily:"'DM Mono',monospace",color:C.text}}>{h.asset.ticker}</span>
                        <span style={{fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{h.asset.name}</span>
                      </div>
                      <div style={{height:3,background:C.faint,borderRadius:2,maxWidth:200}}>
                        <div style={{height:"100%",width:`${w}%`,background:C.blue,borderRadius:2}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}><Tag>{h.asset.type}</Tag></div>
                    <div style={{textAlign:"right"}}>
                      <input type="number" min="0" step="any" value={h.qty}
                        onChange={e=>onChangeQty(h.isin,parseFloat(e.target.value)||0)}
                        style={{width:80,background:C.faint,border:`1px solid ${C.border}`,borderRadius:5,
                          padding:"4px 7px",color:C.text,fontSize:11,fontFamily:"'DM Mono',monospace",textAlign:"right",outline:"none"}}/>
                    </div>
                    <div style={{textAlign:"right",fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtK(h.value)}</div>
                    <div style={{textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",color:C.muted}}>{w}%</div>
                    <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:pctC(h.asset.ytd)}}>{h.asset.ytd>0?"+":""}{h.asset.ytd}%</div>
                    <div style={{textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",color:C.textDim}}>{h.asset.vol}%</div>
                    <button onClick={()=>onRemove(h.isin)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:4}}>✕</button>
                  </div>
                );
              })}
              <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:20,background:C.surface}}>
                {[
                  {l:"Totale",     v:fmtK(m.total),          col:C.text},
                  {l:"Rend. Med.", v:`${fmt(m.wRet,1)}%`,    col:C.accent},
                  {l:"Vol. Med.",  v:`${fmt(m.wVol,1)}%`,    col:m.wVol>20?C.amber:C.green},
                  {l:"Div. Yield", v:`${fmt(m.wDiv,1)}%`,    col:C.amber},
                ].map((k,i)=>(
                  <div key={i}>
                    <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{k.l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:k.col,fontFamily:"'DM Mono',monospace"}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Donut data={sD} title="Settore"/>
              <Donut data={gD} title="Area Geografica"/>
            </div>
          </div>
        )}

        {/* ALLOCAZIONE */}
        {sub==="allocazione"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <AllocBar data={sD} title="Settore"/>
            <AllocBar data={gD} title="Geografica"/>
            <AllocBar data={tD} title="Tipo Asset"/>
            <AllocBar data={cD} title="Valuta"/>
          </div>
        )}

        {/* RISCHIO */}
        {sub==="rischio"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <RadarScore holdings={holdings}/>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Contributo al Rischio</SectionTitle>
              {[...holdings].sort((a,b)=>b.asset.vol-a.asset.vol).map(h=>{
                const w=h.value/m.total;
                const contrib=(w*h.asset.vol).toFixed(1);
                const col=h.asset.vol>35?C.red:h.asset.vol>22?C.amber:C.accent;
                return(
                  <div key={h.isin} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",color:C.text}}>{h.asset.ticker}</span>
                      <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>σ {h.asset.vol}% · w.contrib {contrib}%</span>
                    </div>
                    <div style={{height:5,background:C.faint,borderRadius:3}}>
                      <div style={{height:"100%",width:`${Math.min(100,h.asset.vol/55*100)}%`,background:col,borderRadius:3}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,gridColumn:"span 2"}}>
              <SectionTitle>Rischio vs Rendimento per Posizione</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={holdings.map(h=>({n:h.asset.ticker,r:h.asset.expRet,v:h.asset.vol}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="n" tick={{fill:C.muted,fontSize:10}}/>
                  <YAxis tick={{fill:C.muted,fontSize:10}}/>
                  <Tooltip contentStyle={TT}/>
                  <Legend wrapperStyle={{fontSize:10,color:C.muted}}/>
                  <Bar dataKey="r" name="Rend. Atteso %" fill={C.accent}  radius={[3,3,0,0]}/>
                  <Bar dataKey="v" name="Volatilità %"  fill={C.violet}  radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FRONTIERA EFFICIENTE */}
        {sub==="frontiera"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,gridColumn:"span 2"}}>
              <SectionTitle>Frontiera Efficiente (simulata) — Rischio vs Rendimento</SectionTitle>
              <div style={{fontSize:10,color:C.muted,marginBottom:12}}>Il punto ◆ rappresenta il tuo portafoglio attuale. La curva mostra il trade-off ottimale rischio/rendimento.</div>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="vol" name="Volatilità %" type="number" domain={[0,30]}
                    tick={{fill:C.muted,fontSize:10}} label={{value:"Volatilità %",position:"insideBottom",offset:-2,fill:C.muted,fontSize:10}}/>
                  <YAxis dataKey="ret" name="Rendimento %" type="number" domain={[0,18]}
                    tick={{fill:C.muted,fontSize:10}} label={{value:"Rend. %",angle:-90,position:"insideLeft",fill:C.muted,fontSize:10}}/>
                  <Tooltip contentStyle={TT} formatter={(v,n)=>[`${v}%`,n]}/>
                  <Scatter name="Frontiera" data={frontier} fill={C.border} line={{stroke:C.blue,strokeWidth:1.5}} shape="circle"/>
                  <Scatter name="Portafoglio" data={[{vol:+fmt(m.wVol,1),ret:+fmt(m.wRet,1)}]} fill={C.accent} shape="diamond"/>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Analisi Concentrazione (HHI)</SectionTitle>
              <div style={{fontSize:12,color:C.textDim,lineHeight:1.6,marginBottom:12}}>
                L'Indice Herfindahl-Hirschman (HHI) misura la concentrazione del portafoglio.<br/>
                <span style={{color:C.green}}>HHI &lt; 1500</span>: ben diversificato &nbsp;
                <span style={{color:C.amber}}>1500-3000</span>: moderato &nbsp;
                <span style={{color:C.red}}>&gt; 3000</span>: concentrato
              </div>
              <div style={{fontSize:36,fontWeight:800,fontFamily:"'Syne',sans-serif",
                color:m.hhi>3000?C.red:m.hhi>1500?C.amber:C.green,marginBottom:8}}>
                {fmt(m.hhi,0)}
              </div>
              <div style={{height:8,background:C.faint,borderRadius:4,marginBottom:16}}>
                <div style={{height:"100%",width:`${Math.min(100,m.hhi/5000*100)}%`,
                  background:m.hhi>3000?C.red:m.hhi>1500?C.amber:C.green,borderRadius:4}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {holdings.sort((a,b)=>b.value-a.value).slice(0,6).map((h,i)=>{
                  const w=(h.value/m.total*100);
                  return(
                    <div key={h.isin} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.text}}>{h.asset.ticker}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:80,height:4,background:C.faint,borderRadius:2}}>
                          <div style={{height:"100%",width:`${w}%`,background:PIE_COLS[i],borderRadius:2}}/>
                        </div>
                        <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace",minWidth:36,textAlign:"right"}}>{w.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <SectionTitle>Stima VaR e Draw-down</SectionTitle>
              {[
                {l:"VaR 95% (1 giorno)",    v:`-${fmt(m.wVol/Math.sqrt(252)*1.645,2)}%`,  desc:"Perdita massima stimata nel 95% dei casi"},
                {l:"VaR 99% (1 giorno)",    v:`-${fmt(m.wVol/Math.sqrt(252)*2.326,2)}%`,  desc:"Perdita massima stimata nel 99% dei casi"},
                {l:"Max Draw-down stimato", v:`-${fmt(m.wVol*2.5,1)}%`,                   desc:"Stima conservativa max calo da picco"},
                {l:"Rend. Risk-adj. (Sharpe)",v:fmt(m.sharpe,2),                          desc:"Rendimento per unità di rischio sopra rf"},
              ].map((r,i)=>(
                <div key={i} style={{padding:"10px 0",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:C.textDim}}>{r.l}</span>
                    <span style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:r.v.startsWith("-")?C.red:C.accent}}>{r.v}</span>
                  </div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Scrollable>
    </div>
  );
}

// ─── AI ADVISOR PAGE ──────────────────────────────────────────────────────────
const SYS_PROMPT = `Sei FinanceGPT, un advisor finanziario AI di alto livello specializzato in:
- Analisi di portafogli azionari e obbligazionari
- Teoria moderna del portafoglio (MPT), CAPM, fattori di Fama-French
- Valutazione fondamentale (DCF, multipli P/E, EV/EBITDA, P/B)
- Analisi tecnica (RSI, medie mobili, supporti/resistenze)
- Gestione del rischio (VaR, CVaR, drawdown, correlazioni)
- Strategie di diversificazione e asset allocation
- Mercati globali: USA, Europa, Asia, Emergenti
- ETF, obbligazioni, commodities, derivati
- Economia macro: tassi d'interesse, inflazione, cicli economici
- Normativa italiana ed europea (MIFID II, fiscalità investimenti, PIR, PAC)

Rispondi sempre in italiano, in modo preciso, professionale ma accessibile.
Usa dati numerici, percentuali e ragionamenti quantitativi quando possibile.
Se ti viene fornito un portafoglio, analizzalo in dettaglio commentando:
diversificazione, rischio, rendimento atteso, concentrazione, punti di forza e debolezze.
Non dare mai consigli fiscali o legali specifici, e ricorda sempre che le analisi sono a scopo informativo.
Struttura le risposte con paragrafi chiari. Usa emoji finanziarie (📊📈📉💼) con moderazione.`;

const QUICK = [
  "Analizza il mio portafoglio completo",
  "Il portafoglio è ben diversificato?",
  "Qual è il rischio reale del portafoglio?",
  "Come migliorerei l'asset allocation?",
  "Spiega lo Sharpe Ratio del portafoglio",
  "Quali settori sono sovra/sotto-pesati?",
  "Cosa è il VaR e come si calcola?",
  "Strategie per ridurre la volatilità",
];

function AIAdvisorPage({holdings}){
  const [msgs,setMsgs]=useState([
    {role:"assistant",content:"Ciao! Sono **FinanceGPT**, il tuo advisor AI specializzato in finanza. 📊\n\nPosso analizzare il tuo portafoglio, rispondere a domande su titoli, strategie d'investimento, rischio, diversificazione e molto altro.\n\nSe hai già aggiunto titoli al portafoglio, posso farne un'analisi completa. Cosa vuoi sapere?"}
  ]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  const portfolioContext = useCallback(()=>{
    if(!holdings.length) return "L'utente non ha ancora caricato un portafoglio.";
    const m=pMet(holdings);
    const lines=[
      `PORTAFOGLIO ATTUALE (${holdings.length} posizioni):`,
      `Valore totale: €${m.total.toLocaleString("it-IT",{maximumFractionDigits:0})}`,
      `Rendimento atteso ponderato: ${fmt(m.wRet,2)}%`,
      `Volatilità ponderata: ${fmt(m.wVol,2)}%`,
      `Sharpe Ratio: ${fmt(m.sharpe,2)}`,
      `Beta ponderato: ${fmt(m.wBeta,2)}`,
      `Dividend yield medio: ${fmt(m.wDiv,2)}%`,
      `HHI concentrazione: ${fmt(m.hhi,0)}`,
      `Settori diversi: ${m.sectors} | Aree geografiche: ${m.geos}`,
      "",
      "POSIZIONI:",
      ...holdings.map(h=>`- ${h.asset.ticker} (${h.asset.name}): ${h.qty} pz @ ${h.asset.currency} ${h.asset.price} = €${h.value.toLocaleString("it-IT",{maximumFractionDigits:0})} (${(h.value/m.total*100).toFixed(1)}%) | Vol ${h.asset.vol}% | Beta ${h.asset.beta} | YTD ${h.asset.ytd}% | Settore: ${h.asset.sector} | Geo: ${h.asset.geo}`),
    ];
    return lines.join("\n");
  },[holdings]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if(!userMsg || loading) return;
    setInput("");
    const newMsgs=[...msgs,{role:"user",content:userMsg}];
    setMsgs(newMsgs);
    setLoading(true);

    const apiMsgs = newMsgs.map(m=>({
      role: m.role==="assistant"?"assistant":"user",
      content: m.content
    }));
    // inject portfolio context into the last user message
    apiMsgs[apiMsgs.length-1].content =
      `[CONTESTO PORTAFOGLIO]\n${portfolioContext()}\n\n[DOMANDA UTENTE]\n${userMsg}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: SYS_PROMPT,
          messages: apiMsgs,
        })
      });
      const data = await res.json();
      const reply = data.content?.map(b=>b.type==="text"?b.text:"").join("") || "Errore nella risposta.";
      setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    } catch(e){
      setMsgs(m=>[...m,{role:"assistant",content:`⚠️ Errore di connessione: ${e.message}`}]);
    } finally {
      setLoading(false);
      setTimeout(()=>inputRef.current?.focus(),100);
    }
  };

  // simple markdown renderer
  const renderMd = (text) => {
    const lines = text.split("\n");
    return lines.map((line,i)=>{
      if(line.startsWith("## ")) return <div key={i} style={{fontSize:14,fontWeight:800,color:C.accent,marginTop:10,marginBottom:4,fontFamily:"'Syne',sans-serif"}}>{line.slice(3)}</div>;
      if(line.startsWith("# "))  return <div key={i} style={{fontSize:16,fontWeight:800,color:C.text,marginTop:12,marginBottom:6,fontFamily:"'Syne',sans-serif"}}>{line.slice(2)}</div>;
      if(line.startsWith("- "))  return <div key={i} style={{fontSize:12,color:C.textDim,lineHeight:1.7,paddingLeft:12}}>• {renderInline(line.slice(2))}</div>;
      if(line.trim()==="") return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{fontSize:12,color:C.textDim,lineHeight:1.75}}>{renderInline(line)}</div>;
    });
  };
  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p,i)=>{
      if(p.startsWith("**")&&p.endsWith("**"))
        return <strong key={i} style={{color:C.text,fontWeight:700}}>{p.slice(2,-2)}</strong>;
      return p;
    });
  };

  return(
    <div style={{display:"flex",height:"calc(100vh - 56px)",overflow:"hidden"}}>
      {/* sidebar */}
      <div style={{width:240,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.surface}}>
        <div style={{padding:"14px 14px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.gold},${C.amber})`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>◈</div>
            <div>
              <div style={{fontSize:12,fontWeight:800,fontFamily:"'Syne',sans-serif",color:C.text}}>FinanceGPT</div>
              <div style={{fontSize:9,color:C.accent}}>● Online</div>
            </div>
          </div>
          <div style={{fontSize:9,color:C.muted,lineHeight:1.6}}>
            Specializzato in analisi di portafoglio, teoria MPT, valutazione fondamentale, gestione del rischio e mercati globali.
          </div>
        </div>
        <Divider/>
        <div style={{padding:"10px 10px 6px"}}>
          <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,padding:"0 4px"}}>Domande rapide</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {QUICK.map((q,i)=>(
              <button key={i} onClick={()=>send(q)} disabled={loading}
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 10px",
                  color:C.textDim,fontSize:10,cursor:loading?"not-allowed":"pointer",textAlign:"left",
                  lineHeight:1.4,transition:"all 0.1s",fontFamily:"inherit",
                  opacity:loading?0.5:1}}>
                {q}
              </button>
            ))}
          </div>
        </div>
        {holdings.length>0&&(
          <>
            <Divider/>
            <div style={{padding:"10px 14px"}}>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Portafoglio caricato</div>
              <div style={{fontSize:11,color:C.accent,fontWeight:700}}>{holdings.length} posizioni</div>
              <div style={{fontSize:11,color:C.text,fontFamily:"'DM Mono',monospace"}}>{fmtK(holdings.reduce((s,h)=>s+h.value,0))}</div>
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3}}>
                {holdings.slice(0,6).map(h=>(
                  <div key={h.isin} style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.textDim}}>{h.asset.ticker}</span>
                    <span style={{fontSize:10,color:C.muted}}>{(h.value/holdings.reduce((s,x)=>s+x.value,0)*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* chat */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg}}>
        {/* messages */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:10,justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-start"}}>
              {m.role==="assistant"&&(
                <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.gold},${C.amber})`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>◈</div>
              )}
              <div style={{
                maxWidth:"75%",
                background:m.role==="user"?`linear-gradient(135deg,${C.accent}22,${C.blue}22)`:C.card,
                border:`1px solid ${m.role==="user"?C.accent+"40":C.border}`,
                borderRadius:m.role==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",
                padding:"12px 16px",
              }}>
                {m.role==="user"
                  ? <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{m.content}</div>
                  : <div>{renderMd(m.content)}</div>
                }
              </div>
              {m.role==="user"&&(
                <div style={{width:28,height:28,borderRadius:8,background:C.faint,border:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>👤</div>
              )}
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.gold},${C.amber})`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>◈</div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 2px",padding:"12px 16px"}}>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.accent,
                      animation:`pulse 1.2s ${i*0.2}s infinite ease-in-out`,opacity:0.7}}/>
                  ))}
                  <span style={{fontSize:11,color:C.muted,marginLeft:6}}>FinanceGPT sta analizzando…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* input bar */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,background:C.surface}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}}
              placeholder="Fai una domanda finanziaria… (Invio per inviare, Shift+Invio per nuova riga)"
              rows={2}
              style={{flex:1,background:C.card,border:`1px solid ${C.borderL}`,borderRadius:10,
                padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",
                resize:"none",outline:"none",lineHeight:1.5}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()}
              style={{padding:"10px 20px",height:42,
                background:loading||!input.trim()?C.faint:`linear-gradient(135deg,${C.accent},${C.accentDim})`,
                border:"none",borderRadius:10,
                color:loading||!input.trim()?C.muted:"#050810",
                fontWeight:800,fontSize:13,cursor:loading||!input.trim()?"not-allowed":"pointer",
                fontFamily:"'Syne',sans-serif",transition:"all 0.15s",flexShrink:0}}>
              Invia ↑
            </button>
          </div>
          <div style={{fontSize:9,color:C.muted,marginTop:6,paddingLeft:2}}>
            FinanceGPT è alimentato da Claude AI · Le analisi sono a scopo informativo, non costituiscono consulenza finanziaria personalizzata
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{transform:scale(0.8);opacity:0.4}50%{transform:scale(1.2);opacity:1}}`}</style>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("Ricerca");
  const [holdings,setHoldings]=useState([]);
  const PAGES=["Ricerca","Portafoglio","AI Advisor"];

  const addToPortfolio=(asset,qty)=>{
    setHoldings(prev=>{
      const idx=prev.findIndex(h=>h.isin===asset.isin);
      const value=qty*asset.price;
      if(idx>=0){
        const n=[...prev];
        n[idx]={...n[idx],qty:n[idx].qty+qty,value:n[idx].value+value};
        return n;
      }
      return [...prev,{isin:asset.isin,asset,qty,value}];
    });
  };
  const removeFromPortfolio=(isin)=>setHoldings(h=>h.filter(x=>x.isin!==isin));
  const changeQty=(isin,qty)=>{
    setHoldings(prev=>prev.map(h=>{
      if(h.isin!==isin) return h;
      return {...h,qty,value:qty*h.asset.price};
    }).filter(h=>h.qty>0));
  };

  const total=holdings.reduce((s,h)=>s+h.value,0);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <nav style={{height:56,display:"flex",alignItems:"center",padding:"0 20px",gap:0,
        borderBottom:`1px solid ${C.border}`,background:C.surface,
        position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:28}}>
          <div style={{width:30,height:30,borderRadius:8,
            background:`linear-gradient(135deg,${C.accent},${C.violet})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◈</div>
          <div>
            <span style={{fontSize:15,fontWeight:900,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.03em"}}>PortfolioLab</span>
            <span style={{fontSize:9,color:C.muted,marginLeft:8,letterSpacing:"0.08em"}}>PRO</span>
          </div>
        </div>
        {PAGES.map(p=>(
          <button key={p} onClick={()=>setPage(p)} style={{
            padding:"0 16px",height:56,background:"none",border:"none",cursor:"pointer",
            color:page===p?C.accent:C.muted,
            borderBottom:`2px solid ${page===p?C.accent:"transparent"}`,
            fontSize:12,fontWeight:700,letterSpacing:"0.06em",
            display:"flex",alignItems:"center",gap:7,transition:"color 0.15s"}}>
            {p==="AI Advisor"&&<span style={{fontSize:10,background:`linear-gradient(135deg,${C.gold},${C.amber})`,
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900}}>AI</span>}
            {p==="Portafoglio"&&holdings.length>0&&(
              <span style={{background:C.accent,color:"#050810",borderRadius:8,fontSize:9,
                fontWeight:900,padding:"1px 6px",lineHeight:"14px"}}>{holdings.length}</span>
            )}
            {p}
          </button>
        ))}
        {holdings.length>0&&(
          <div style={{marginLeft:"auto",display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <span style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Portafoglio</span>
            <span style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:C.text}}>{fmtK(total)}</span>
          </div>
        )}
      </nav>

      {page==="Ricerca"    && <SearchPage   onAdd={addToPortfolio}   portfolio={holdings}/>}
      {page==="Portafoglio"&& <PortfolioPage holdings={holdings}     onRemove={removeFromPortfolio} onChangeQty={changeQty}/>}
      {page==="AI Advisor" && <AIAdvisorPage holdings={holdings}/>}
    </div>
  );
}
