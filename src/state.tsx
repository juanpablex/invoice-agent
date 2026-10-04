import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bookProposal, createLedger, rejectProposal } from "./core/ledger";
import type { AgentResult } from "./core/agent";
import { DEFAULT_MODEL } from "./core/agent";
import type { Expense } from "./core/types";
import type { Img } from "./image";
import { clearKey, loadSettings, saveSettings } from "./storage";

export interface Job {
  imageUri: Img;
  result?: AgentResult;
}

interface AppState {
  expenses: Expense[];
  job: Job | null;
  setJob: (j: Job | null) => void;
  apiKey: string | null;
  model: string;
  remembered: boolean;
  useReal: boolean;
  setUseReal: (v: boolean) => void;
  saveKey: (key: string, model: string, remember: boolean) => Promise<void>;
  removeKey: () => Promise<void>;
  approve: (proposalId: string) => Expense;
  reject: (proposalId: string) => void;
  ledger: ReturnType<typeof createLedger>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const ledger = useRef(createLedger()).current;
  const [expenses, setExpenses] = useState<Expense[]>(ledger.expenses);
  const [job, setJob] = useState<Job | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [remembered, setRemembered] = useState(false);
  const [useReal, setUseReal] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s.model) setModel(s.model);
      setRemembered(s.remembered);
      if (s.apiKey) {
        setApiKey(s.apiKey);
        setUseReal(true);
      }
    });
  }, []);

  const saveKey = useCallback(async (key: string, m: string, remember: boolean) => {
    await saveSettings(key, m, remember);
    setApiKey(key);
    setModel(m);
    setRemembered(remember);
    setUseReal(true);
  }, []);

  const removeKey = useCallback(async () => {
    await clearKey();
    setApiKey(null);
    setRemembered(false);
    setUseReal(false);
  }, []);

  const approve = useCallback((id: string) => {
    const e = bookProposal(ledger, id);
    setExpenses(ledger.expenses);
    return e;
  }, [ledger]);

  const reject = useCallback((id: string) => rejectProposal(ledger, id), [ledger]);

  const value = useMemo<AppState>(
    () => ({ expenses, job, setJob, apiKey, model, remembered, useReal, setUseReal, saveKey, removeKey, approve, reject, ledger }),
    [expenses, job, apiKey, model, remembered, useReal, saveKey, removeKey, approve, reject, ledger],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
