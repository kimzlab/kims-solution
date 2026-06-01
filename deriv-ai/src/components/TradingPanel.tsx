import { useState, useRef, useCallback, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import type { DigitStats } from "../types";
import { useDerivAuthContext } from "../contexts/DerivAuthContext";
import type { ContractType, TradeParams, UseDerivAuthReturn, SavedAccount } from "../hooks/useDerivAuth";

type Props = {
  stats: DigitStats;
  selectedSymbol: string;
  marketLabel: string;
  onClose: () => void;
};

// ── Contract catalogue ───────────────────────────────────────────────────────
const UNDER_BARRIERS  = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OVER_BARRIERS   = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const DIGIT_BARRIERS  = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DURATIONS       = [1, 2, 3, 4, 5];
const STAKES_QUICK    = [0.35, 0.5, 1, 2, 5, 10, 20, 50];
const MARTINGALES     = [1, 1.5, 1.7, 2] as const;

type MarketGroup = "UNDER" | "OVER" | "EVEN" | "ODD" | "MATCHES" | "DIFFERS";

const GROUP_META: Record<MarketGroup, { color: string; bg: string; contractType: ContractType; hasBarrier: boolean }> = {
  UNDER:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   contractType: "DIGITUNDER",  hasBarrier: true  },
  OVER:    { color: "#ec4899", bg: "rgba(236,72,153,0.12)",  contractType: "DIGITOVER",   hasBarrier: true  },
  EVEN:    { color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   contractType: "DIGITEVEN",   hasBarrier: false },
  ODD:     { color: "#f97316", bg: "rgba(249,115,22,0.12)",  contractType: "DIGITODD",    hasBarrier: false },
  MATCHES: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  contractType: "DIGITMATCH",  hasBarrier: true  },
  DIFFERS: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  contractType: "DIGITDIFF",   hasBarrier: true  },
};

function barriersFor(group: MarketGroup): number[] {
  if (group === "UNDER")   return UNDER_BARRIERS;
  if (group === "OVER")    return OVER_BARRIERS;
  if (group === "MATCHES" || group === "DIFFERS") return DIGIT_BARRIERS;
  return [];
}

const statusColors: Record<string, string> = {
  pending: "#6366f1", open: "#f59e0b", won: "#22c55e", lost: "#ef4444", error: "#9ca3af",
};

// ── Bot state types ──────────────────────────────────────────────────────────
type BotStatus = "idle" | "running" | "stopped";

interface BotStats {
  currentStake: number;
  totalProfit: number;
  wins: number;
  losses: number;
  totalTrades: number;
  stopReason?: string;
}

// ── Compact contract selector ────────────────────────────────────────────────
function ContractSelector({
  group, barrier, onGroupChange, onBarrierChange, compact,
}: {
  group: MarketGroup;
  barrier: number;
  onGroupChange: (g: MarketGroup) => void;
  onBarrierChange: (b: number) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const barriers = barriersFor(group);
  const meta = GROUP_META[group];

  return (
    <div>
      {/* Group row */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
        {(Object.keys(GROUP_META) as MarketGroup[]).map(g => (
          <button
            key={g}
            onClick={() => { onGroupChange(g); if (!GROUP_META[g].hasBarrier) onBarrierChange(0); }}
            style={{
              padding: compact ? "4px 8px" : "5px 10px",
              borderRadius: "8px",
              border: `2px solid ${group === g ? GROUP_META[g].color : "transparent"}`,
              background: group === g ? GROUP_META[g].bg : theme.card,
              color: group === g ? GROUP_META[g].color : theme.textSub,
              cursor: "pointer",
              fontSize: compact ? "10px" : "11px",
              fontWeight: 700,
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Barrier chips */}
      {meta.hasBarrier && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {barriers.map(b => (
            <button
              key={b}
              onClick={() => onBarrierChange(b)}
              style={{
                width: compact ? "26px" : "30px",
                height: compact ? "26px" : "30px",
                borderRadius: "7px",
                border: `2px solid ${barrier === b ? meta.color : "transparent"}`,
                background: barrier === b ? meta.bg : theme.card,
                color: barrier === b ? meta.color : theme.textSub,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: barrier === b ? 700 : 400,
              }}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Account bar component ─────────────────────────────────────────────────────
type ThemeShape = ReturnType<typeof useTheme>["theme"];
function AccountBar({
  auth, tokenInput, setTokenInput, demoTokenInput, setDemoTokenInput,
  showDemoAdd, setShowDemoAdd, authError, doAuth, doAddDemo,
  realAccounts, demoAccounts, theme,
}: {
  auth: UseDerivAuthReturn;
  tokenInput: string; setTokenInput: (v:string)=>void;
  demoTokenInput: string; setDemoTokenInput: (v:string)=>void;
  showDemoAdd: boolean; setShowDemoAdd: (v:boolean)=>void;
  authError: string|null;
  doAuth: (t:string)=>void;
  doAddDemo: (t:string)=>void;
  realAccounts: SavedAccount[];
  demoAccounts: SavedAccount[];
  theme: ThemeShape;
}) {
  const hasReal = realAccounts.length > 0;
  const hasDemo = demoAccounts.length > 0;

  // ── Slot component (real or demo) ─────────────────────────────────────
  const AccountSlot = ({
    acct, isActive, isVirtual, onConnect, onSwitch, connectHint,
    tokenValue, onTokenChange, onTokenSubmit, loading,
  }: {
    acct?: SavedAccount; isActive?: boolean; isVirtual: boolean;
    onConnect?: ()=>void; onSwitch?: ()=>void; connectHint?: string;
    tokenValue?: string; onTokenChange?: (v:string)=>void; onTokenSubmit?: ()=>void;
    loading?: boolean;
  }) => {
    const accent = isVirtual ? "#06b6d4" : "#22c55e";
    const accentBg = isVirtual ? "rgba(6,182,212,0.10)" : "rgba(34,197,94,0.10)";
    const label = isVirtual ? "DEMO" : "REAL";

    if (acct) {
      // Connected slot
      return (
        <div
          onClick={!isActive ? onSwitch : undefined}
          style={{
            flex: 1, padding: "10px 13px", borderRadius: "13px",
            border: `2px solid ${isActive ? accent : theme.border}`,
            background: isActive ? accentBg : theme.card,
            cursor: isActive ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: accent, letterSpacing: "0.1em" }}>
              {label} {isActive && "✓"}
            </div>
            {!isActive && (
              <div style={{ fontSize: "9px", color: theme.textSub }}>tap to switch</div>
            )}
          </div>
          <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "1px" }}>{acct.loginid}</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: accent, marginTop: "2px", letterSpacing: "-0.5px" }}>
            {acct.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "10px", color: theme.textSub }}>{acct.currency}</div>
        </div>
      );
    }

    // Empty slot — show add button
    return (
      <div style={{ flex: 1 }}>
        {!onConnect ? null : !tokenValue && tokenValue !== undefined ? (
          <button
            onClick={onConnect}
            style={{
              width: "100%", height: "100%", minHeight: "80px",
              padding: "10px 12px", borderRadius: "13px",
              border: `2px dashed ${isVirtual ? "rgba(6,182,212,0.4)" : "rgba(99,102,241,0.4)"}`,
              background: isVirtual ? "rgba(6,182,212,0.04)" : "rgba(99,102,241,0.04)",
              color: isVirtual ? "#67e8f9" : "#a5b4fc", cursor: "pointer",
              fontSize: "11px", fontWeight: 600, textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
            }}
          >
            <div style={{ fontSize: "18px" }}>{isVirtual ? "🎮" : "💳"}</div>
            <div>+ Add {label}</div>
            {isVirtual && <div style={{ fontSize: "9px", color: "#67e8f9", opacity: 0.8 }}>10,000 USD practice</div>}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: isVirtual ? "#67e8f9" : "#a5b4fc", marginBottom: "2px" }}>
              {isVirtual ? "🎮 Demo API Token" : "💳 Real API Token"}
            </div>
            {isVirtual && (
              <div style={{ fontSize: "10px", color: theme.textSub, lineHeight: 1.5, marginBottom: "4px" }}>
                Log into <strong style={{ color: "#67e8f9" }}>app.deriv.com</strong> → switch to your{" "}
                <strong style={{ color: "#67e8f9" }}>virtual account</strong> (VRTC…) → go to Account Settings → API Token → create a token with Read + Trade.
                Virtual accounts have <strong style={{ color: "#4ade80" }}>10,000 USD</strong> for practice.
              </div>
            )}
            <div style={{ display: "flex", gap: "5px" }}>
              <input
                type="password"
                placeholder={`Paste ${isVirtual ? "virtual" : "real"} account token...`}
                value={tokenValue ?? ""}
                onChange={e => onTokenChange?.(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (tokenValue?.trim()) && onTokenSubmit?.()}
                style={{ flex: 1, padding: "8px 10px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "9px", color: theme.text, fontSize: "11px", outline: "none", minWidth: 0 }}
              />
              <button
                onClick={() => tokenValue?.trim() && onTokenSubmit?.()}
                disabled={!tokenValue?.trim() || loading}
                style={{ padding: "8px 11px", background: isVirtual ? "#06b6d4" : "#6366f1", border: "none", borderRadius: "9px", color: "white", fontSize: "11px", fontWeight: 700, cursor: tokenValue?.trim() ? "pointer" : "default", whiteSpace: "nowrap" }}
              >
                {loading ? "⟳" : "Connect"}
              </button>
              <button onClick={() => onConnect?.()} style={{ padding: "8px 9px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "9px", color: theme.textSub, fontSize: "11px", cursor: "pointer" }}>✕</button>
            </div>
            <a
              href={`https://app.deriv.com/account/api-token`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "10px", color: theme.textSub, textDecoration: "none" }}
            >
              Get token from Deriv ↗
            </a>
          </div>
        )}
      </div>
    );
  };

  if (!auth.isAuthorized && !auth.isAuthorizing) {
    // Not connected at all
    return (
      <div style={{ padding: "12px 14px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", marginBottom: "8px" }}>
          🔑 Connect your Deriv account
        </div>
        <div style={{ fontSize: "11px", color: theme.textSub, marginBottom: "10px", lineHeight: 1.6 }}>
          Create an API token at <strong style={{ color: "#a5b4fc" }}>app.deriv.com → Account Settings → API Token</strong>.
          Tick <strong>Read</strong> + <strong>Trade</strong> permissions, then paste it below.
        </div>
        <input
          type="password"
          placeholder="API token (real or virtual account)..."
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tokenInput.trim() && doAuth(tokenInput.trim())}
          style={{ width: "100%", padding: "9px 12px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "10px", color: theme.text, fontSize: "12px", boxSizing: "border-box", outline: "none", marginBottom: "8px" }}
        />
        {(auth.error || authError) && (
          <div style={{ fontSize: "11px", color: "#f87171", marginBottom: "6px" }}>⚠ {auth.error ?? authError}</div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => tokenInput.trim() && doAuth(tokenInput.trim())}
            disabled={!tokenInput.trim() || auth.isAuthorizing}
            style={{ flex: 1, padding: "9px", background: tokenInput.trim() ? "#6366f1" : theme.card, border: "none", borderRadius: "10px", color: "white", fontSize: "12px", fontWeight: 700, cursor: tokenInput.trim() ? "pointer" : "default" }}
          >
            {auth.isAuthorizing ? "⟳ Connecting..." : "Connect"}
          </button>
          <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer"
            style={{ padding: "9px 12px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "10px", color: theme.textSub, fontSize: "11px", textDecoration: "none", display: "flex", alignItems: "center" }}>
            Get Token ↗
          </a>
        </div>
      </div>
    );
  }

  if (auth.isAuthorizing && !auth.isAuthorized) {
    return (
      <div style={{ padding: "12px", background: theme.card, borderRadius: "12px", textAlign: "center", fontSize: "12px", color: "#a5b4fc" }}>
        ⟳ Connecting…
      </div>
    );
  }

  // Authorized — show account slots
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
        {/* REAL slot */}
        <AccountSlot
          acct={realAccounts[0]}
          isActive={!auth.account?.isVirtual}
          isVirtual={false}
          onSwitch={() => auth.switchAccount(realAccounts[0]?.loginid ?? "")}
          onConnect={hasReal ? undefined : () => setShowDemoAdd(false)}
          tokenValue={!hasReal ? tokenInput : undefined}
          onTokenChange={!hasReal ? setTokenInput : undefined}
          onTokenSubmit={!hasReal ? () => tokenInput.trim() && doAuth(tokenInput.trim()) : undefined}
          loading={auth.isAuthorizing}
        />

        {/* DEMO slot */}
        <AccountSlot
          acct={demoAccounts[0]}
          isActive={Boolean(auth.account?.isVirtual)}
          isVirtual
          onSwitch={() => auth.switchAccount(demoAccounts[0]?.loginid ?? "")}
          onConnect={() => setShowDemoAdd(!showDemoAdd)}
          tokenValue={showDemoAdd ? demoTokenInput : undefined}
          onTokenChange={showDemoAdd ? setDemoTokenInput : undefined}
          onTokenSubmit={showDemoAdd ? () => demoTokenInput.trim() && doAddDemo(demoTokenInput.trim()) : undefined}
          loading={auth.isAuthorizing}
        />
      </div>

      {auth.isAuthorizing && (
        <div style={{ fontSize: "11px", color: "#a5b4fc", textAlign: "center", marginBottom: "4px" }}>⟳ Switching…</div>
      )}
      {(auth.error || authError) && (
        <div style={{ fontSize: "11px", color: "#f87171", marginBottom: "4px" }}>⚠ {auth.error ?? authError}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={auth.logout} style={{ fontSize: "10px", color: theme.textSub, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Disconnect all
        </button>
      </div>
    </div>
  );
}

// ── Main TradingPanel ────────────────────────────────────────────────────────
export default function TradingPanel({ stats, selectedSymbol, marketLabel, onClose }: Props) {
  const { theme } = useTheme();
  const auth = useDerivAuthContext();

  // ── Global tab + auth ────────────────────────────────────────────────────
  const [tab, setTab] = useState<"trade" | "bot" | "log">("trade");
  const [tokenInput,      setTokenInput]      = useState("");
  const [demoTokenInput,  setDemoTokenInput]  = useState("");
  const [showDemoAdd,     setShowDemoAdd]      = useState(false);
  const [authError,       setAuthError]        = useState<string | null>(null);
  const currency = auth.account?.currency ?? "USD";

  // ── Trade tab state ──────────────────────────────────────────────────────
  const [tGroup,    setTGroup]   = useState<MarketGroup>("UNDER");
  const [tBarrier,  setTBarrier] = useState(6);
  const [tStake,    setTStake]   = useState(1);
  const [tDuration, setTDuration]= useState(5);
  const [tProposal, setTProposal]= useState<{id:string;payout:number;stake:number;longcode:string}|null>(null);
  const [tFetching, setTFetching]= useState(false);
  const [tPlacing,  setTPlacing] = useState(false);
  const [tError,    setTError]   = useState<string|null>(null);

  // ── Bot tab state ────────────────────────────────────────────────────────
  const [bGroup,      setBGroup]    = useState<MarketGroup>("UNDER");
  const [bBarrier,    setBBarrier]  = useState(6);
  const [bStake,      setBStake]    = useState(1);
  const [bMartingale, setBMartingale]=useState<number>(1);
  const [bStopLoss,   setBStopLoss] = useState(10);
  const [bTakeProfit, setBTakeProfit]=useState(20);
  const [bDuration,   setBDuration] = useState(5);
  const [bAutoMode,   setBAutoMode] = useState(false);
  const [botStatus,   setBotStatus] = useState<BotStatus>("idle");
  const [botStats,    setBotStats]  = useState<BotStats>({
    currentStake: 1, totalProfit: 0, wins: 0, losses: 0, totalTrades: 0,
  });
  const [botError,    setBotError]  = useState<string|null>(null);

  // Bot engine refs
  const botRunningRef = useRef(false);
  const botStatsRef   = useRef<BotStats>(botStats);
  const botConfigRef  = useRef({ bGroup, bBarrier, bStake, bMartingale, bStopLoss, bTakeProfit, bDuration, bAutoMode });

  // Keep config ref up to date
  useEffect(() => {
    botConfigRef.current = { bGroup, bBarrier, bStake, bMartingale, bStopLoss, bTakeProfit, bDuration, bAutoMode };
  }, [bGroup, bBarrier, bStake, bMartingale, bStopLoss, bTakeProfit, bDuration, bAutoMode]);

  // ── Auth helpers ─────────────────────────────────────────────────────────
  const doAuth = async (token: string) => {
    setAuthError(null);
    try { await auth.authorize(token); }
    catch (e) { setAuthError(e instanceof Error ? e.message : "Failed"); }
  };

  const doAddDemo = async (token: string) => {
    setAuthError(null);
    try { await auth.addAccount(token); setShowDemoAdd(false); setDemoTokenInput(""); }
    catch (e) { setAuthError(e instanceof Error ? e.message : "Failed"); }
  };

  // ── Trade tab actions ─────────────────────────────────────────────────────
  const fetchProposal = useCallback(async () => {
    setTFetching(true); setTProposal(null); setTError(null);
    const ct = GROUP_META[tGroup].contractType;
    const params: TradeParams = {
      symbol: selectedSymbol, contractType: ct,
      barrier: GROUP_META[tGroup].hasBarrier ? tBarrier : undefined,
      stake: tStake, duration: tDuration, currency,
    };
    try {
      const p = await auth.getProposal(params);
      setTProposal(p);
    } catch (e) { setTError(e instanceof Error ? e.message : "Failed"); }
    finally { setTFetching(false); }
  }, [auth, selectedSymbol, tGroup, tBarrier, tStake, tDuration, currency]);

  const executeTrade = useCallback(async () => {
    if (!tProposal) return;
    setTPlacing(true); setTError(null);
    const ct = GROUP_META[tGroup].contractType;
    const params: TradeParams = {
      symbol: selectedSymbol, contractType: ct,
      barrier: GROUP_META[tGroup].hasBarrier ? tBarrier : undefined,
      stake: tStake, duration: tDuration, currency,
    };
    try {
      await auth.placeTrade(params, tProposal.id);
      setTProposal(null);
      setTab("log");
    } catch (e) { setTError(e instanceof Error ? e.message : "Failed"); }
    finally { setTPlacing(false); }
  }, [auth, tProposal, selectedSymbol, tGroup, tBarrier, tStake, tDuration, currency]);

  // ── Bot engine ────────────────────────────────────────────────────────────
  const stopBot = useCallback((reason: string) => {
    botRunningRef.current = false;
    setBotStatus("stopped");
    setBotStats(s => ({ ...s, stopReason: reason }));
  }, []);

  const runBotCycle = useCallback(async () => {
    if (!botRunningRef.current) return;
    const cfg = botConfigRef.current;
    const stats = botStatsRef.current;
    setBotError(null);

    try {
      const ct = GROUP_META[cfg.bGroup].contractType;
      const params: TradeParams = {
        symbol: selectedSymbol,
        contractType: ct,
        barrier: GROUP_META[cfg.bGroup].hasBarrier ? cfg.bBarrier : undefined,
        stake: stats.currentStake,
        duration: cfg.bDuration,
        currency,
      };

      // Get proposal
      const proposal = await auth.getProposal(params);
      if (!botRunningRef.current) return;

      // Place trade
      const trade = await auth.placeTrade(params, proposal.id);
      if (!botRunningRef.current) return;
      if (!trade.contractId) { stopBot("No contract ID"); return; }

      // Wait for settlement
      const settled = await auth.waitForSettle(trade.contractId);
      if (!botRunningRef.current) return;

      const profit = settled.profit ?? 0;
      const won = profit > 0;

      // Update stats
      const newStats: BotStats = {
        currentStake: won
          ? cfg.bStake // reset to initial on win
          : Math.min(stats.currentStake * cfg.bMartingale, cfg.bStake * 50),
        totalProfit: stats.totalProfit + profit,
        wins:   stats.wins   + (won ? 1 : 0),
        losses: stats.losses + (won ? 0 : 1),
        totalTrades: stats.totalTrades + 1,
      };
      botStatsRef.current = newStats;
      setBotStats({ ...newStats });

      // Check stop conditions
      if (newStats.totalProfit >= cfg.bTakeProfit) { stopBot(`✓ Take profit reached (${ cfg.bTakeProfit})`); return; }
      if (newStats.totalProfit <= -cfg.bStopLoss)  { stopBot(`✗ Stop loss triggered (-${cfg.bStopLoss})`); return; }

      // Continue?
      if (cfg.bAutoMode && botRunningRef.current) {
        setTimeout(() => runBotCycle(), 800);
      } else {
        // Manual: one trade done, go back to idle
        botRunningRef.current = false;
        setBotStatus("idle");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setBotError(msg);
      if (botRunningRef.current) {
        // Retry after delay in auto mode
        if (cfg.bAutoMode) {
          setTimeout(() => runBotCycle(), 3000);
        } else {
          botRunningRef.current = false;
          setBotStatus("idle");
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, selectedSymbol, currency, stopBot]);

  const startBot = useCallback(() => {
    const cfg = botConfigRef.current;
    botStatsRef.current = {
      currentStake: bStake,
      totalProfit: 0,
      wins: 0,
      losses: 0,
      totalTrades: 0,
    };
    setBotStats({ ...botStatsRef.current });
    setBotStatus("running");
    setBotError(null);
    botRunningRef.current = true;
    runBotCycle();
  }, [bStake, runBotCycle]);

  const stopBotManual = () => stopBot("Stopped by user");

  const runOneManual = useCallback(() => {
    const cfg = botConfigRef.current;
    if (botStatus === "idle" || botStatus === "stopped") {
      if (botStatus === "stopped") {
        // Keep existing stats, just run one more
        botRunningRef.current = true;
        setBotStatus("running");
        runBotCycle();
      } else {
        startBot();
      }
    }
  }, [botStatus, startBot, runBotCycle]);

  const resetMartingale = () => {
    const newStats = { ...botStatsRef.current, currentStake: bStake };
    botStatsRef.current = newStats;
    setBotStats({ ...newStats });
  };

  // Cleanup on unmount
  useEffect(() => () => { botRunningRef.current = false; }, []);

  // ── UI helpers ──────────────────────────────────────────────────────────
  const card = (children: React.ReactNode, noPad?: boolean) => (
    <div style={{ background: theme.cardInner, borderRadius: "14px", padding: noPad ? "0" : "14px 16px", marginBottom: "10px", overflow: "hidden" }}>
      {children}
    </div>
  );

  const sectionTitle = (label: string) => (
    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: theme.textSub, marginBottom: "8px" }}>
      {label}
    </div>
  );

  const realAccounts  = auth.accounts.filter(a => !a.isVirtual);
  const demoAccounts  = auth.accounts.filter(a =>  a.isVirtual);
  const totalPnL      = botStats.totalProfit;
  const pnlColor      = totalPnL > 0 ? "#22c55e" : totalPnL < 0 ? "#ef4444" : theme.textSub;
  const botMeta       = GROUP_META[bGroup];
  const isRunning     = botStatus === "running";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "430px",
          background: theme.root,
          borderLeft: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
          animation: "slide-from-right 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${theme.border}`, position: "sticky", top: 0, background: theme.root, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: theme.text }}>💰 Live Trading</div>
              <div style={{ fontSize: "11px", color: theme.textSub }}>{marketLabel}</div>
            </div>
            <button onClick={onClose} style={{ background: theme.cardInner, border: `1px solid ${theme.border}`, color: theme.textSub, width: "32px", height: "32px", borderRadius: "10px", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>

          {/* ── Account bar ──────────────────────────────────────────── */}
          <AccountBar
            auth={auth}
            tokenInput={tokenInput}
            setTokenInput={setTokenInput}
            demoTokenInput={demoTokenInput}
            setDemoTokenInput={setDemoTokenInput}
            showDemoAdd={showDemoAdd}
            setShowDemoAdd={setShowDemoAdd}
            authError={authError}
            doAuth={doAuth}
            doAddDemo={doAddDemo}
            realAccounts={realAccounts}
            demoAccounts={demoAccounts}
            theme={theme}
          />
        </div>

        {/* Only show tabs if authorized */}
        {auth.isAuthorized && (
          <>
            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "4px", padding: "10px 20px 0", borderBottom: `1px solid ${theme.border}` }}>
              {(["trade", "bot", "log"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: "9px 4px",
                    borderRadius: "10px 10px 0 0",
                    border: "none",
                    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                    background: tab === t ? "rgba(99,102,241,0.12)" : "transparent",
                    color: tab === t ? "#a5b4fc" : theme.textSub,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {t === "trade" ? "🎯 Trade" : t === "bot" ? "🤖 Bot" : `📋 Log (${auth.trades.length})`}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>

              {/* ── TRADE TAB ─────────────────────────────────────────── */}
              {tab === "trade" && (
                <>
                  {card(
                    <>
                      {sectionTitle("CONTRACT TYPE & BARRIER")}
                      <ContractSelector group={tGroup} barrier={tBarrier} onGroupChange={g => { setTGroup(g); setTProposal(null); }} onBarrierChange={b => { setTBarrier(b); setTProposal(null); }} />
                    </>
                  )}

                  {card(
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        {sectionTitle(`STAKE (${currency})`)}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                          {STAKES_QUICK.map(s => (
                            <button key={s} onClick={() => { setTStake(s); setTProposal(null); }} style={{ padding: "4px 7px", borderRadius: "7px", border: `2px solid ${tStake === s ? "#22c55e" : "transparent"}`, background: tStake === s ? "rgba(34,197,94,0.15)" : theme.card, color: tStake === s ? "#4ade80" : theme.textSub, cursor: "pointer", fontSize: "10px", fontWeight: 700 }}>{s}</button>
                          ))}
                        </div>
                        <input type="number" min={0.35} step={0.01} value={tStake} onChange={e => { setTStake(parseFloat(e.target.value)||0.35); setTProposal(null); }} style={{ width: "100%", padding: "7px 9px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "12px", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        {sectionTitle("DURATION (ticks)")}
                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                          {DURATIONS.map(d => (
                            <button key={d} onClick={() => { setTDuration(d); setTProposal(null); }} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `2px solid ${tDuration === d ? "#f59e0b" : "transparent"}`, background: tDuration === d ? "rgba(245,158,11,0.15)" : theme.card, color: tDuration === d ? "#fcd34d" : theme.textSub, cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>{d}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!tProposal ? (
                    <button onClick={fetchProposal} disabled={tFetching} style={{ width: "100%", padding: "13px", background: tFetching ? theme.cardInner : "#6366f1", border: "none", borderRadius: "12px", color: "white", fontSize: "14px", fontWeight: 700, cursor: tFetching ? "default" : "pointer", marginBottom: "8px" }}>
                      {tFetching ? "⟳ Getting quote..." : "📋 Get Quote"}
                    </button>
                  ) : (
                    <div style={{ padding: "14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "14px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", color: theme.textSub }}>Stake</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: theme.text }}>{tProposal.stake.toFixed(2)} {currency}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: theme.textSub }}>Potential payout</span>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#22c55e" }}>{tProposal.payout.toFixed(2)} {currency}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: theme.textSub, marginBottom: "10px", lineHeight: 1.5 }}>{tProposal.longcode}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button onClick={() => setTProposal(null)} style={{ padding: "10px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "10px", color: theme.textSub, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Cancel</button>
                        <button onClick={executeTrade} disabled={tPlacing} style={{ padding: "10px", background: tPlacing ? theme.card : "#22c55e", border: "none", borderRadius: "10px", color: tPlacing ? theme.textSub : "black", cursor: tPlacing ? "default" : "pointer", fontSize: "13px", fontWeight: 700 }}>
                          {tPlacing ? "⟳ Placing..." : "✓ Place Trade"}
                        </button>
                      </div>
                    </div>
                  )}
                  {tError && <div style={{ padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", fontSize: "12px", color: "#f87171" }}>⚠ {tError}</div>}
                </>
              )}

              {/* ── BOT TAB ───────────────────────────────────────────── */}
              {tab === "bot" && (
                <>
                  {/* Live status panel */}
                  <div style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `2px solid ${isRunning ? botMeta.color : theme.border}`,
                    background: isRunning ? botMeta.bg : theme.card,
                    marginBottom: "12px",
                    transition: "all 0.3s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isRunning ? botMeta.color : theme.textSub, boxShadow: isRunning ? `0 0 8px ${botMeta.color}` : "none", animation: isRunning ? "scan-pulse 1.5s infinite" : "none" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: isRunning ? botMeta.color : theme.textSub }}>
                          {botStatus === "running" ? "BOT RUNNING" : botStatus === "stopped" ? "BOT STOPPED" : "BOT IDLE"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: theme.textSub }}>
                        {bGroup}{GROUP_META[bGroup].hasBarrier ? ` ${bBarrier}` : ""} · {bDuration}t
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
                      {[
                        { label: "P&L", value: `${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}`, color: pnlColor },
                        { label: "Stake", value: botStats.currentStake.toFixed(2), color: theme.text },
                        { label: "W / L", value: `${botStats.wins}/${botStats.losses}`, color: theme.text },
                        { label: "Trades", value: String(botStats.totalTrades), color: theme.text },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "9px", color: theme.textSub, fontWeight: 700, letterSpacing: "0.06em" }}>{label}</div>
                          <div style={{ fontSize: "14px", fontWeight: 800, color, marginTop: "2px" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {botStats.stopReason && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textSub, textAlign: "center" }}>{botStats.stopReason}</div>
                    )}
                    {botError && (
                      <div style={{ marginTop: "6px", padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: "7px", fontSize: "11px", color: "#f87171" }}>⚠ {botError}</div>
                    )}
                  </div>

                  {/* Contract */}
                  {card(
                    <>
                      {sectionTitle("CONTRACT TYPE")}
                      <ContractSelector group={bGroup} barrier={bBarrier} onGroupChange={setBGroup} onBarrierChange={setBBarrier} compact />
                    </>
                  )}

                  {/* Stake + Duration */}
                  {card(
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        {sectionTitle(`INITIAL STAKE (${currency})`)}
                        <input
                          type="number" min={0.35} step={0.01} value={bStake}
                          onChange={e => { const v = parseFloat(e.target.value)||0.35; setBStake(v); botStatsRef.current.currentStake = v; setBotStats(s => ({...s, currentStake: v})); }}
                          disabled={isRunning}
                          style={{ width: "100%", padding: "8px 10px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "9px", color: theme.text, fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        {sectionTitle("DURATION (ticks)")}
                        <div style={{ display: "flex", gap: "4px" }}>
                          {DURATIONS.map(d => (
                            <button key={d} onClick={() => setBDuration(d)} disabled={isRunning} style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", border: `2px solid ${bDuration === d ? "#f59e0b" : "transparent"}`, background: bDuration === d ? "rgba(245,158,11,0.15)" : theme.card, color: bDuration === d ? "#fcd34d" : theme.textSub, cursor: isRunning ? "default" : "pointer", fontSize: "12px", fontWeight: 700 }}>{d}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Martingale */}
                  {card(
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        {sectionTitle("MARTINGALE (on loss)")}
                        <button onClick={resetMartingale} style={{ fontSize: "10px", padding: "3px 8px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", color: "#a5b4fc", cursor: "pointer", fontWeight: 600, marginBottom: "8px" }}>
                          ↺ Reset Stake
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {MARTINGALES.map(m => (
                          <button
                            key={m}
                            onClick={() => setBMartingale(m)}
                            disabled={isRunning}
                            style={{
                              flex: 1, padding: "10px 4px", borderRadius: "10px",
                              border: `2px solid ${bMartingale === m ? (m === 1 ? "#22c55e" : m === 2 ? "#ef4444" : "#f59e0b") : "transparent"}`,
                              background: bMartingale === m ? (m === 1 ? "rgba(34,197,94,0.15)" : m === 2 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)") : theme.card,
                              color: bMartingale === m ? (m === 1 ? "#4ade80" : m === 2 ? "#f87171" : "#fcd34d") : theme.textSub,
                              cursor: isRunning ? "default" : "pointer", fontSize: "12px", fontWeight: 800,
                            }}
                          >
                            {m === 1 ? "OFF" : `${m}×`}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textSub }}>
                        Current stake: <strong style={{ color: theme.text }}>{botStats.currentStake.toFixed(2)} {currency}</strong>
                        {bMartingale > 1 && <span style={{ color: "#f59e0b" }}> · next loss → {(botStats.currentStake * bMartingale).toFixed(2)}</span>}
                      </div>
                    </>
                  )}

                  {/* Stop loss + Take profit */}
                  {card(
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        {sectionTitle("STOP LOSS")}
                        <input
                          type="number" min={0} step={0.5} value={bStopLoss}
                          onChange={e => setBStopLoss(parseFloat(e.target.value)||0)}
                          disabled={isRunning}
                          style={{ width: "100%", padding: "8px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "9px", color: "#f87171", fontSize: "13px", fontWeight: 700, boxSizing: "border-box" }}
                        />
                        <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "4px" }}>Stop when loss ≥ {bStopLoss}</div>
                      </div>
                      <div>
                        {sectionTitle("TAKE PROFIT")}
                        <input
                          type="number" min={0} step={0.5} value={bTakeProfit}
                          onChange={e => setBTakeProfit(parseFloat(e.target.value)||0)}
                          disabled={isRunning}
                          style={{ width: "100%", padding: "8px 10px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "9px", color: "#4ade80", fontSize: "13px", fontWeight: 700, boxSizing: "border-box" }}
                        />
                        <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "4px" }}>Stop when profit ≥ {bTakeProfit}</div>
                      </div>
                    </div>
                  )}

                  {/* Mode + Controls */}
                  {card(
                    <>
                      {sectionTitle("TRADE MODE")}
                      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                        <button
                          onClick={() => setBAutoMode(false)}
                          disabled={isRunning}
                          style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${!bAutoMode ? "#6366f1" : "transparent"}`, background: !bAutoMode ? "rgba(99,102,241,0.15)" : theme.card, color: !bAutoMode ? "#a5b4fc" : theme.textSub, cursor: isRunning ? "default" : "pointer", fontSize: "12px", fontWeight: 700 }}
                        >
                          🤚 Manual<br /><span style={{ fontSize: "9px", fontWeight: 400 }}>One trade per click</span>
                        </button>
                        <button
                          onClick={() => setBAutoMode(true)}
                          disabled={isRunning}
                          style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${bAutoMode ? "#f97316" : "transparent"}`, background: bAutoMode ? "rgba(249,115,22,0.12)" : theme.card, color: bAutoMode ? "#fb923c" : theme.textSub, cursor: isRunning ? "default" : "pointer", fontSize: "12px", fontWeight: 700 }}
                        >
                          🤖 Auto<br /><span style={{ fontSize: "9px", fontWeight: 400 }}>Runs continuously</span>
                        </button>
                      </div>

                      {/* Bot control buttons */}
                      {isRunning ? (
                        <button onClick={stopBotManual} style={{ width: "100%", padding: "14px", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", borderRadius: "12px", color: "#f87171", cursor: "pointer", fontSize: "14px", fontWeight: 800 }}>
                          ⏹ Stop Bot
                        </button>
                      ) : bAutoMode ? (
                        <button onClick={startBot} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#f97316,#fb923c)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 800 }}>
                          🤖 Start Auto Bot
                        </button>
                      ) : (
                        <button onClick={runOneManual} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 800 }}>
                          ▶ Run One Trade
                        </button>
                      )}
                    </>
                  )}

                  {/* Safety note */}
                  <div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", fontSize: "10px", color: theme.textSub, lineHeight: 1.6 }}>
                    ⚠ <strong style={{ color: "#fcd34d" }}>Caution:</strong> The auto bot trades real money continuously. Always test on a Demo account first. Martingale can multiply losses — set a stop loss.
                  </div>
                </>
              )}

              {/* ── LOG TAB ───────────────────────────────────────────── */}
              {tab === "log" && (
                auth.trades.length === 0
                  ? <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textSub, fontSize: "13px" }}>No trades yet.</div>
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {/* Summary */}
                      {auth.trades.length > 0 && (() => {
                        const settled = auth.trades.filter(t => t.status === "won" || t.status === "lost");
                        const totalProfit = settled.reduce((s, t) => s + (t.profit ?? 0), 0);
                        const wins = settled.filter(t => t.status === "won").length;
                        return (
                          <div style={{ padding: "12px", background: theme.card, borderRadius: "12px", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", color: theme.textSub }}>{settled.length} settled · {wins}W/{settled.length - wins}L</span>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>{totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)} {currency}</span>
                          </div>
                        );
                      })()}

                      {auth.trades.map(t => (
                        <div key={t.id} style={{ padding: "11px 13px", background: theme.card, borderRadius: "11px", border: `1px solid ${t.status === "won" ? "rgba(34,197,94,0.25)" : t.status === "lost" ? "rgba(239,68,68,0.18)" : theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>
                                {t.contractType.replace("DIGIT", "")}
                                {t.barrier !== undefined ? ` ${t.barrier}` : ""}
                                <span style={{ fontSize: "10px", color: theme.textSub, marginLeft: "6px" }}>{t.symbol}</span>
                              </div>
                              <div style={{ fontSize: "10px", color: theme.textSub, marginTop: "2px" }}>
                                {t.timestamp.toLocaleTimeString()} · {t.stake.toFixed(2)} {currency}
                                {t.exitSpot && <span> · exit {t.exitSpot}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ padding: "2px 7px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, background: `${statusColors[t.status] ?? "#374151"}20`, color: statusColors[t.status] ?? "#9ca3af", border: `1px solid ${statusColors[t.status] ?? "#374151"}33` }}>
                                {t.status.toUpperCase()}
                              </div>
                              {t.profit !== undefined && (
                                <div style={{ fontSize: "14px", fontWeight: 800, color: t.profit >= 0 ? "#22c55e" : "#ef4444", marginTop: "3px" }}>
                                  {t.profit >= 0 ? "+" : ""}{t.profit.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                          {t.error && <div style={{ fontSize: "10px", color: "#f87171", marginTop: "4px" }}>{t.error}</div>}
                        </div>
                      ))}
                    </div>
                  )
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-from-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes scan-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
