import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — Cambia questo URL con il tuo proxy dopo il deployment
// Local dev:  http://localhost:3001
// Railway:    https://your-app.up.railway.app
// ─────────────────────────────────────────────────────────────────────────────
const PROXY = "http://localhost:3001";

// ─── SYSTEMA COLORI BLOOMBERG (Arancione → Blu / Dark Mode Terminal) ─────────
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

const SERIES_COLS = ["#0066FF", "#00FF00", "#FFFF00", "#00FFFF", "#FF3333", "#FF00FF", "#FF8800", "#AAAAAA", "#66CCFF", "#88FF88"];
const PIE_COLS    = SERIES_COLS;

// ─── FUNZIONI UTILI (HELPERS) ────────────────────────────────────────────────
const fmt    = (n: number | null, d = 2) => n == null || isNaN(n) ? "N/A" : (+n).toFixed(d);
const fmtM   = (n: number | null) => {
  if (n == null) return "N/A";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  return `${Math.round(n).toLocaleString()}`;
};
const pCol   = (v: number) => v > 0 ? B.green : v < 0 ? B.red : B.gray2;
const pSign  = (v: string | number) => v == null ? "N/A" : +v > 0 ? `+${v}` : `${v}`;

const groupBy = (arr: any[], key: string, total: number) => {
  const m: Record<string, number> = {};
  arr.forEach(h => { const k = h.asset[key] || "N/A"; m[k] = (m[k] || 0) + h.value; });
  return Object.entries(m).map(([name, value]) => ({ name, value, pct: +(value / total * 100).toFixed(1) })).sort((a, b) => b.value - a.value);
};

const pMet = (hs: any[]) => {
  if (!hs.length) return null;
  const total = hs.reduce((s, h) => s + h.value, 0);
  const wRet  = hs.reduce((s, h) => s + (h.value / total) * (h.asset.er ?? 0), 0);
  const wVol  = Math.sqrt(hs.reduce((s, h) => s + Math.pow((h.value / total) * (h.asset.vol ?? 15), 2), 0));
  const wBeta = hs.reduce((s, h) => s + (h.value / total) * (h.asset.beta ?? 1), 0);
  const wDiv  = hs.reduce((s, h) => s + (h.value / total) * (h.asset.dy ?? 0), 0);
  const sharpe = wVol > 0 ? (wRet - 2.5) / wVol : 0;
  const sectors = new Set(hs.map(h => h.asset.sector || "N/A")).size;
  const geos    = new Set(hs.map(h => h.asset.geo || "N/A")).size;
  const hhi     = hs.reduce((s, h) => s + Math.pow(h.value / total * 100, 2), 0);
  return { total, wRet, wVol, wBeta, wDiv, sharpe, sectors, geos, hhi };
};

// ─── CHIAMATE API ────────────────────────────────────────────────────────────
async function apiFetch(path: string) {
  const r = await fetch(`${PROXY}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function searchSecurities(q: string) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}

async function fetchQuote(symbolOrIsin: string) {
  const isIsin = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbolOrIsin.trim().toUpperCase());
  const param  = isIsin ? `isin=${symbolOrIsin}` : `symbol=${symbolOrIsin}`;
  return apiFetch(`/quote?${param}`);
}

async function batchRefresh(symbols: string[]) {
  const r = await fetch(`${PROXY}/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  return r.json();
}

// ─── MICRO COMPONENTI DI INTERFACCIA ─────────────────────────────────────────
const FKey = ({ num, label, active, onClick }: { num?: string, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} style={{
    background: active ? B.blue : B.panel2, border: `1px solid ${active ? B.blue : B.border}`,
    borderRadius: 0, padding: "4px 10px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 0,
    fontFamily: "'Courier New',Courier,monospace", minWidth: 60,
  }}>
    {num && <span style={{ fontSize: 10, color: active ? B.white : B.gray2, fontWeight: 700, marginRight: 5 }}>{num}</span>}
    <span style={{ fontSize: 10, color: active ? B.white : B.gray2, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
  </button>
);

const BPanel = ({ title, children, style, accent }: { title?: string, children: React.ReactNode, style?: React.CSSProperties, accent?: boolean }) => (
  <div style={{ border: `1px solid ${accent ? B.blue : B.border}`, background: B.panel, height: "100%", ...style }}>
    {title && (
      <div style={{ background: B.blue, padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: B.white, fontFamily: "'Courier New',monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
      </div>
    )}
    <div style={{ padding: "10px" }}>
      {children}
    </div>
  </div>
);

const Spinner = ({ text }: { text?: string }) => (
  <div style={{ padding: "20px 8px", textAlign: "center" }}>
    <div style={{ fontSize: 10, color: B.blue, fontFamily: "'Courier New',monospace", animation: "blink 1s infinite" }}>{text || "LOADING..."}</div>
  </div>
);

const ErrMsg = ({ msg }: { msg: string }) => (
  <div style={{ padding: "8px", fontSize: 10, color: B.red, fontFamily: "'Courier New',monospace", background: "#1a0000", border: `1px solid ${B.red}`, margin: "8px 0" }}>
    ⚠ {msg}
  </div>
);

const TT_STYLE = { background: "#111", border: `1px solid ${B.blue}`, borderRadius: 0, fontSize: 10, color: B.yellow, fontFamily: "'Courier New',monospace", padding: "6px 10px" };

// ─── NAVIGAZIONE / E STRUTTURA WEB DOCK ──────────────────────────────────────
function TopBar({ time }: { time: string }) {
  return (
    <div style={{ background: B.blue, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: B.white, fontFamily: "'Courier New',monospace", letterSpacing: "0.12em" }}>BLOOMBERG TERMINAL</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "'Courier New',monospace" }}>WEB PORTFOLIO STATION</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 10, color: B.yellow, fontFamily: "'Courier New',monospace" }}>● YAHOO FINANCE LIVE</span>
        <span style={{ fontSize: 11, color: B.white, fontFamily: "'Courier New',monospace" }}>{time}</span>
      </div>
    </div>
  );
}

function FKeyBar({ page, setPage }: { page: string, setPage: (p: string) => void }) {
  const keys = [
    { n: "F1", l: "HOME",    id: "home" },
    { n: "F2", l: "SEARCH",  id: "search" },
    { n: "F3", l: "PORT",    id: "portfolio" },
    { n: "F4", l: "ANALYSIS", id: "analysis" },
    { n: "F5", l: "AI ADVSR", id: "ai" },
  ];
  return (
    <div style={{ background: B.panel2, borderBottom: `1px solid ${B.border}`, display: "flex", alignItems: "stretch", padding: "4px 8px", gap: 6, flexShrink: 0 }}>
      {keys.map(k => (
        <FKey key={k.id} num={k.n} label={k.l} active={page === k.id} onClick={() => setPage(k.id)} />
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 10, color: B.gray3, fontFamily: "'Courier New',monospace", alignSelf: "center", paddingRight: 4 }}>YF LIVE // GLOBAL MACRO</span>
    </div>
  );
}

// ─── PAGINA PRINCIPALE (HOME) ────────────────────────────────────────────────
function HomePage({ holdings, setPage, onRefresh, refreshing }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        
        <BPanel title="PORTFOLIO OVERVIEW — LIVE METRICS">
          {!m ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: B.gray2, marginBottom: 8 }}>NO ACTIVE PORTFOLIO LOADED</div>
              <button onClick={() => setPage("search")} style={{ background: B.blue, border: "none", color: B.white, padding: "8px 24px", cursor: "pointer", fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 700 }}>
                {"> SEARCH SECURITIES"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ borderLeft: `3px solid ${B.blue}`, paddingLeft: 8 }}>
                  <div style={{ fontSize: 9, color: B.gray2, textTransform: "uppercase" }}>TOTAL MARKET VALUE</div>
                  <div style={{ fontSize: 24, color: B.yellow, fontWeight: 700 }}>${fmtM(m.total)}</div>
                </div>
                <div style={{ borderLeft: `3px solid ${pCol(m.wRet)}`, paddingLeft: 8 }}>
                  <div style={{ fontSize: 9, color: B.gray2, textTransform: "uppercase" }}>EXP. PORTFOLIO RETURN</div>
                  <div style={{ fontSize: 24, color: pCol(m.wRet), fontWeight: 700 }}>{pSign(fmt(m.wRet, 1))}%</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, borderTop: `1px solid ${B.border}`, paddingTop: 8 }}>
                {[
                  { l: "VOLATILITY", v: `${fmt(m.wVol, 1)}%`, col: m.wVol > 25 ? B.red : m.wVol > 15 ? B.yellow : B.green },
                  { l: "SHARPE",    v: fmt(m.sharpe, 2),    col: m.sharpe > 0.7 ? B.green : m.sharpe > 0.3 ? B.yellow : B.red },
                  { l: "BETA",      v: fmt(m.wBeta, 2),     col: m.wBeta > 1.3 ? B.red : B.white },
                  { l: "DIV. YIELD", v: `${fmt(m.wDiv, 1)}%`, col: B.cyan },
                ].map((k, i) => (
                  <div key={i} style={{ padding: "4px" }}>
                    <div style={{ fontSize: 8, color: B.gray3, textTransform: "uppercase" }}>{k.l}</div>
                    <div style={{ fontSize: 14, color: k.col, fontWeight: 700 }}>{k.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${B.border}`, marginTop: 12, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: B.gray3 }}>{holdings.length} ASSETS MANAGEMENT</span>
                <button onClick={onRefresh} disabled={refreshing} style={{ background: "none", border: `1px solid ${B.border}`, color: refreshing ? B.gray3 : B.blue, fontFamily: "'Courier New',monospace", fontSize: 10, cursor: "pointer", padding: "4px 12px" }}>
                  {refreshing ? "UPDATING..." : "↻ REFRESH DATA"}
                </button>
              </div>
            </>
          )}
        </BPanel>

        <BPanel title="QUICK TERMINAL SYSTEM ACTIONS">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", height: "100%" }}>
            {[
              { l: "SEARCH EXCHANGE", f: "F2", action: () => setPage("search") },
              { l: "MONITOR POSITIONS", f: "F3", action: () => setPage("portfolio") },
              { l: "RISK ANALYSIS", f: "F4", action: () => setPage("analysis") },
              { l: "AI ADVISOR DESK", f: "F5", action: () => setPage("ai") },
            ].map((b, i) => (
              <button key={i} onClick={b.action} style={{ background: B.panel2, border: `1px solid ${B.border}`, padding: "12px", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContnet: "space-between", gap: 8 }}>
                <span style={{ fontSize: 10, color: B.blue, fontWeight: 700 }}>{b.f} COMMAND</span>
                <span style={{ fontSize: 12, color: B.gray1, textTransform: "uppercase" }}>{b.l} →</span>
              </button>
            ))}
          </div>
        </BPanel>
      </div>

      {holdings.length > 0 && (
        <BPanel title="SECURITIES REALTIME WATCHLIST">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Courier New',monospace", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${B.borderB}`, color: B.gray3, fontSize: 11 }}>
                  <th style={{ padding: "8px" }}>TICKER</th>
                  <th style={{ padding: "8px" }}>PRICE</th>
                  <th style={{ padding: "8px" }}>DAILY CHANGE</th>
                  <th style={{ padding: "8px" }}>SECURITY NAME</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: any) => (
                  <tr key={h.isin} style={{ borderBottom: `1px solid ${B.border}`, fontSize: 13 }}>
                    <td style={{ padding: "8px", color: B.blue, fontWeight: 700 }}>{h.asset.ticker}</td>
                    <td style={{ padding: "8px", color: B.yellow }}>{h.asset.price != null ? h.asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "---"}</td>
                    <td style={{ padding: "8px", color: pCol(h.asset.dayChangePct), fontWeight: 700 }}>{h.asset.dayChangePct != null ? `${pSign(fmt(h.asset.dayChangePct, 2))}%` : "---"}</td>
                    <td style={{ padding: "8px", color: B.gray1 }}>{h.asset.shortName || h.asset.ticker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BPanel>
      )}
    </div>
  );
}

// ─── PAGINA DI RICERCA (SEARCH) ──────────────────────────────────────────────
function SearchPage({ onAdd, portfolio }: any) {
  const [q, setQ] = useState("");
  const [results, setRes] = useState([]);
  const [searching, setSrch] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoad] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState("1");
  const debounce = useRef<any>(null);

  const doSearch = useCallback(async (val: string) => {
    if (!val.trim()) { setRes([]); return; }
    setSrch(true); setError("");
    try {
      const data = await searchSecurities(val);
      setRes(data);
    } catch (e: any) {
      setError(`SEARCH ERROR: ${e.message} — Verifica se il proxy server è attivo.`);
    } finally { setSrch(false); }
  }, []);

  const handleInput = (v: string) => {
    setQ(v); setSel(null); setDetail(null);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(v), 400);
  };

  const selectSecurity = async (r: any) => {
    setSel(r); setLoad(true); setDetail(null); setError(""); setQty("1");
    try {
      const d = await fetchQuote(r.symbol);
      d.sector = d.sector || r.sector || "N/A";
      d.geo = d.geo || (d.exchange?.includes("AS") || d.exchange?.includes("PA") || d.exchange?.includes("DE") ? "EUROPE" : d.exchange?.includes("T") ? "ASIA" : "USA");
      d.type = d.type || r.type || "EQUITY";
      d.er = d.ytdPct ?? 0;
      setDetail(d);
    } catch (e: any) {
      setError(`QUOTE ERROR: ${e.message}`);
    } finally { setLoad(false); }
  };

  const inP = (sym: string) => portfolio.some((h: any) => h.asset.ticker === sym || h.asset.symbol === sym);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px", height: "100%", overflow: "hidden" }}>
      {/* Colonna Sinistra: Ricerca e Risultati */}
      <div style={{ display: "flex", flexDirection: "column", background: B.panel, border: `1px solid ${B.border}`, padding: "12px", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input value={q} onChange={e => handleInput(e.target.value)} placeholder="INSERISCI TICKER, ISIN O NOME AZIENDA..." autoFocus
            style={{ flex: 1, background: "#000", border: `1px solid ${B.border}`, padding: "10px", color: B.yellow, fontSize: 12, fontFamily: "'Courier New',monospace", outline: "none", textTransform: "uppercase" }} />
        </div>
        
        {error && <ErrMsg msg={error} />}
        {searching && <Spinner text="QUERYING YAHOO FINANCE DATA BUS..."/>}

        <div style={{ marginTop: "10px" }}>
          {results.map((r: any, i) => {
            const added = inP(r.symbol);
            return (
              <div key={r.symbol + i} onClick={() => selectSecurity(r)}
                style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", padding: "10px", cursor: "pointer", borderBottom: `1px solid ${B.border}`, background: added ? "#001122" : "transparent" }}>
                <span style={{ color: B.blue, fontWeight: 700 }}>{r.symbol}{added ? " ✓" : ""}</span>
                <div>
                  <div style={{ color: B.gray1, fontSize: 11, overflow: "hidden", textTransform: "uppercase" }}>{r.shortName}</div>
                  <div style={{ color: B.gray3, fontSize: 10 }}>{r.exchange}</div>
                </div>
                <span style={{ color: B.gray2, fontSize: 10, textAlign: "right" }}>{r.type}</span>
              </div>
            );
          })}
        </div>
        
        {!q.trim() && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: B.gray3, marginBottom: 6 }}>SUGGESTIONS:</div>
            {["AAPL", "MSFT", "NVDA", "IWDA", "TSLA", "QQQ"].map(t => (
              <button key={t} onClick={() => handleInput(t)} style={{ background: B.panel2, border: `1px solid ${B.border}`, marginRight: 6, color: B.blue, cursor: "pointer", padding: "4px 10px", fontFamily: "'Courier New',monospace" }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Colonna Destra: Scheda Dettaglio e Ordine */}
      <div style={{ overflowY: "auto", background: B.panel, border: `1px solid ${B.border}`, padding: "12px" }}>
        {load && <Spinner text="FETCHING DEPTH MARKET DATA..."/>}
        {detail ? (
          <div>
            <h3 style={{ color: B.yellow, margin: "0 0 12px 0" }}>{detail.symbol} - {detail.shortName}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: 28, color: B.white, fontWeight: 700 }}>{detail.price?.toLocaleString() || "---"}</span>
                <span style={{ fontSize: 12, color: B.gray3, marginLeft: 6 }}>{detail.currency}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: pCol(detail.dayChangePct), fontWeight: 700 }}>1D: {pSign(fmt(detail.dayChangePct))}%</div>
                <div style={{ color: pCol(detail.ytdPct), fontWeight: 700 }}>YTD: {pSign(fmt(detail.ytdPct))}%</div>
              </div>
            </div>

            {detail.history?.length > 1 && (
              <div style={{ height: 140, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={detail.history.slice(-60)}>
                    <XAxis dataKey="date" hide/>
                    <YAxis domain={["auto", "auto"]} hide/>
                    <Tooltip contentStyle={TT_STYLE} />
                    <Area type="linear" dataKey="close" stroke={B.blue} fillOpacity={0.1} fill={B.blue} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: `1px solid ${B.border}`, paddingTop: 12 }}>
              <div>MKT CAP: <span style={{ color: B.yellow }}>{fmtM(detail.marketCap)}</span></div>
              <div>BETA: <span style={{ color: B.yellow }}>{fmt(detail.beta)}</span></div>
              <div>P/E RATIO: <span style={{ color: B.yellow }}>{fmt(detail.pe)}</span></div>
              <div>DIV YIELD: <span style={{ color: B.cyan }}>{fmt(detail.dividendYield)}%</span></div>
            </div>

            {/* Input d'acquisto */}
            <div style={{ marginTop: 24, padding: 12, background: B.panel2, border: `1px solid ${B.blue}` }}>
              <label style={{ display: "block", fontSize: 10, color: B.gray2, marginBottom: 4 }}>QUANTITY</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={{ width: "100%", background: "#000", border: `1px solid ${B.border}`, padding: 8, color: B.yellow, fontFamily: "'Courier New',monospace", fontWeight: 700, marginBottom: 12 }} />
              <button onClick={() => {
                const n = parseFloat(qty);
                if(n > 0 && detail.price) {
                  onAdd({ ...detail, ticker: detail.symbol, vol: detail.vol ?? 15, dy: detail.dividendYield ?? 0 }, n);
                  setSel(null); setDetail(null);
                }
              }} style={{ width: "100%", background: B.blue, color: B.white, border: "none", padding: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>
                EXECUTE ORDER INTO PORTFOLIO
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: B.gray3, textAlign: "center", paddingTop: "20%" }}>SELEZIONA UN ASSET DALLA LISTA PER ANALIZZARLO</div>
        )}
      </div>
    </div>
  );
}

// ─── PORTFOLIO MONITOR (F3) ──────────────────────────────────────────────────
function PortfolioPage({ holdings, onRemove }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);
  if (!holdings.length) return (
    <div style={{ padding: "40px", textAlign: "center", color: B.gray3 }}>IL TUO PORTAFOGLIO È VUOTO. USA IL TASTO F2 PER AGGIUNGERE TITOLI.</div>
  );
  return (
    <div style={{ padding: "16px", height: "100%", overflowY: "auto" }}>
      <BPanel title="ASSET POSITION MATRICES">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Courier New',monospace", textTransform: "uppercase" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${B.borderB}`, color: B.gray2, fontSize: 11, textAlign: "left" }}>
              <th style={{ padding: "10px" }}>TICKER</th>
              <th style={{ padding: "10px" }}>NAME</th>
              <th style={{ padding: "10px", textAlign: "right" }}>SHARES</th>
              <th style={{ padding: "10px", textAlign: "right" }}>VALUE</th>
              <th style={{ padding: "10px", textAlign: "right" }}>WEIGHT %</th>
              <th style={{ padding: "10px", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h: any, i: number) => {
              const w = (h.value / m!.total * 100).toFixed(1);
              return (
                <tr key={h.isin} style={{ borderBottom: `1px solid ${B.border}`, fontSize: 13 }}>
                  <td style={{ padding: "10px", color: B.blue, fontWeight: 700 }}>{h.asset.ticker}</td>
                  <td style={{ padding: "10px", color: B.gray1 }}>{h.asset.shortName?.slice(0, 30)}</td>
                  <td style={{ padding: "10px", color: B.white, textAlign: "right" }}>{h.qty}</td>
                  <td style={{ padding: "10px", color: B.yellow, textAlign: "right", fontWeight: 700 }}>${fmtM(h.value)}</td>
                  <td style={{ padding: "10px", color: B.cyan, textAlign: "right" }}>{w}%</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button onClick={() => onRemove(h.isin)} style={{ background: "none", border: "none", color: B.red, cursor: "pointer", fontWeight: 700 }}>[X]</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </BPanel>
    </div>
  );
}

// ─── ANALISI AVANZATA (ANALYSIS - F4) ─────────────────────────────────────────
function AnalysisPage({ holdings }: any) {
  const m = useMemo(() => pMet(holdings), [holdings]);
  const [sub, setSub] = useState("alloc");

  if (!holdings.length) return <div style={{ padding: "40px", color: B.gray3, textAlign: "center" }}>DATI INSUFFICIENTI. CONFIGURA LE POSIZIONI IN F2.</div>;

  const sD = groupBy(holdings, "sector", m!.total);
  const gD = groupBy(holdings, "geo", m!.total);

  const radarData = [
    { s: "RETURN", v: Math.min(100, m!.wRet / 18 * 100) },
    { s: "DIVERS", v: Math.min(100, m!.sectors / 8 * 100) },
    { s: "GEO",    v: Math.min(100, m!.geos / 5 * 100) },
    { s: "STAB",   v: Math.max(0, 100 - m!.wVol * 2) },
  ];

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <FKey label="ALLOCATION METRICS" active={sub === "alloc"} onClick={() => setSub("alloc")} />
        <FKey label="RISK DECK" active={sub === "risk"} onClick={() => setSub("risk")} />
      </div>

      {sub === "alloc" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <BPanel title="SECTOR EXPOSURE Breakdown">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sD} innerRadius={60} outerRadius={80} dataKey="value">
                    {sD.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {sD.map((d, i) => (
              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, margin: "4px 0" }}>
                <span style={{ color: PIE_COLS[i % PIE_COLS.length] }}>■ {d.name}</span>
                <span style={{ color: B.yellow }}>{d.pct}%</span>
              </div>
            ))}
          </BPanel>

          <BPanel title="GEOGRAPHIC DISTRIBUTION">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gD}>
                  <XAxis dataKey="name" tick={{ fill: B.gray1 }} />
                  <YAxis />
                  <Bar dataKey="value" fill={B.blue} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BPanel>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <BPanel title="RISK INDEX RADAR MAP">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={B.border} />
                  <PolarAngleAxis dataKey="s" tick={{ fill: B.gray2 }} />
                  <Radar dataKey="v" stroke={B.blue} fill={B.blue} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </BPanel>

          <BPanel title="VALUE AT RISK (VaR) SIMULATION">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
              <div>VAR 95% (1-DAY): <span style={{ color: B.yellow, fontWeight: "bold" }}>-{fmt(m!.wVol / Math.sqrt(252) * 1.645)}%</span></div>
              <div>VAR 99% (1-DAY): <span style={{ color: B.red, fontWeight: "bold" }}>-{fmt(m!.wVol / Math.sqrt(252) * 2.326)}%</span></div>
              <div>MAX DRAWDOWN EST: <span style={{ color: B.red, fontWeight: "bold" }}>-{fmt(m!.wVol * 2.5, 1)}%</span></div>
              <div>HHI CONCENTRATION INDEX: <span style={{ color: B.white }}>{fmt(m!.hhi, 0)}</span></div>
            </div>
          </BPanel>
        </div>
      )}
    </div>
  );
}

// ─── AI ADVISOR (F5) ─────────────────────────────────────────────────────────
function AIAdvisorPage({ holdings }: any) {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "**BBGAI WEB TERMINAL SEAT ONLINE**\n\nPronto all'analisi quantitativa del portafoglio basata su dati real-time. Chiedimi del coefficiente di Sharpe, correlazione dei settori o rischio di coda (VaR)." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", content: userText }]);
    setLoading(true);

    // Simulazione di risposta in stile Terminale se l'endpoint Anthropic non è cablato via backend proxy
    setTimeout(() => {
      setMsgs(m => [...m, { role: "assistant", content: `**ANALISI TERMINATA PER ${userText.toUpperCase()}**\n\n[RISCONTRO QUANT]: Rischio concentrazione controllato. Indicatori stabili.\n\nBOTTOM LINE: Mantenere l'esposizione attuale aumentando la liquidità difensiva.` }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: B.bg, padding: 16 }}>
      <div style={{ flex: 1, overflowY: "auto", border: `1px solid ${B.border}`, padding: 12, background: B.panel, marginBottom: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 14, fontFamily: "'Courier New',monospace" }}>
            <div style={{ color: m.role === "user" ? B.blue : B.cyan, fontSize: 11, fontWeight: "bold" }}>{m.role === "user" ? "USER>" : "BBGAI>"}</div>
            <div style={{ color: B.gray1, fontSize: 13, whiteSpace: "pre-line", marginTop: 4 }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ color: B.yellow, fontFamily: "'Courier New',monospace" }}>BBGAI STA COSTRUENDO I MODELLI...</div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="CHIEDI AL TERMINALE QUANT..."
          style={{ flex: 1, background: "#000", border: `1px solid ${B.blue}`, padding: 12, color: B.yellow, fontFamily: "'Courier New',monospace", outline: "none" }} />
        <button onClick={send} style={{ background: B.blue, color: B.white, border: "none", padding: "0 24px", fontWeight: 700, cursor: "pointer" }}>GO</button>
      </div>
    </div>
  );
}

// ─── CODICE DASHBOARD PRINCIPALE (ROOT ENTRY) ───────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [holdings, setHoldings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  const addToPortfolio = (asset: any, qty: number) => {
    setHoldings(prev => {
      const key = asset.ticker || asset.symbol;
      const idx = prev.findIndex(h => h.asset.ticker === key || h.asset.symbol === key);
      const value = qty * asset.price;
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = { ...n[idx], qty: n[idx].qty + qty, value: n[idx].value + value };
        return n;
      }
      return [...prev, { isin: asset.isin || key, asset, qty, value }];
    });
  };

  const removeFromPortfolio = (key: string) => setHoldings(h => h.filter(x => x.isin !== key && x.asset.ticker !== key));

  const refreshPrices = useCallback(async () => {
    if (!holdings.length || refreshing) return;
    setRefreshing(true);
    try {
      const symbols = holdings.map(h => h.asset.ticker);
      const data = await batchRefresh(symbols);
      const bySymbol = Object.fromEntries(data.map((d: any) => [d.symbol, d]));
      setHoldings(prev => prev.map(h => {
        const live = bySymbol[h.asset.ticker];
        if (!live) return h;
        return {
          ...h,
          value: h.qty * (live.price ?? h.asset.price),
          asset: { ...h.asset, price: live.price ?? h.asset.price, dayChangePct: live.dayChangePct ?? h.asset.dayChangePct }
        };
      }));
    } catch (e: any) {
      console.error("Refresh failed:", e.message);
    } finally { setRefreshing(false); }
  }, [holdings, refreshing]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: B.bg, color: B.white, fontFamily: "'Courier New',Courier,monospace", overflow: "hidden" }}>
      <TopBar time={time} />
      <FKeyBar page={page} setPage={setPage} />
      
      {/* Contenitore dinamico della visualizzazione */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {page === "home"       && <HomePage      holdings={holdings} setPage={setPage} onRefresh={refreshPrices} refreshing={refreshing} />}
        {page === "search"     && <SearchPage    onAdd={addToPortfolio} portfolio={holdings} />}
        {page === "portfolio"  && <PortfolioPage holdings={holdings} onRemove={removeFromPortfolio} />}
        {page === "analysis"   && <AnalysisPage  holdings={holdings} />}
        {page === "ai"         && <AIAdvisorPage holdings={holdings} />}
      </div>

      {/* Footer del Terminale */}
      <div style={{ background: B.panel2, borderTop: `1px solid ${B.borderB}`, padding: "6px 12px", fontSize: 11, color: B.gray3, display: "flex", justifyContent: "space-between" }}>
        <span>BLOOMBERG L.P. PORTFOLIO TERMINAL @ NET-STATION</span>
        <span>SYSTEM DESK ACTIVE (HOLDINGS: {holdings.length})</span>
      </div>
    </div>
  );
}