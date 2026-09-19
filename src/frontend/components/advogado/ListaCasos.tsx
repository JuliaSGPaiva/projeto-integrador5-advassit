"use client";

import { useEffect, useState, useMemo } from "react";
import { CaseRecord } from "@/backend/services/supabase/types";
import { api } from "@/frontend/lib/api";
import { CartaoCaso } from "./CartaoCaso";
import {
  Search,
  Filter,
  RefreshCw,
  FolderSearch,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Inbox,
} from "lucide-react";

export function ListaCasos() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminCases(
        statusFilter === "all" ? undefined : statusFilter,
        1,
        100
      );
      setCases(res.cases || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar lista de casos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const filteredCases = useMemo(() => {
    if (!searchTerm.trim()) return cases;
    const term = searchTerm.toLowerCase();
    return cases.filter(
      (c) =>
        c.client_name.toLowerCase().includes(term) ||
        c.initial_description.toLowerCase().includes(term) ||
        (c.legal_summary && c.legal_summary.toLowerCase().includes(term))
    );
  }, [cases, searchTerm]);

  // Contadores
  const counts = useMemo(() => {
    return {
      all: cases.length,
      ready: cases.filter((c) => c.status === "ready").length,
      pending: cases.filter((c) => c.status === "pending_clarification").length,
      low: cases.filter((c) => c.status === "low_confidence").length,
    };
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Casos Recebidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Painel de triagem jurídica inteligente para advogados trabalhistas
          </p>
        </div>

        <button
          onClick={loadCases}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "all"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span>Todos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("ready")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "ready"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Prontos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("pending_clarification")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "pending_clarification"
                ? "bg-amber-500/90 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aguardando Esclarecimento</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("low_confidence")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === "low_confidence"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Baixa Confiança</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {counts.low}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome ou fatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-9 pr-3 py-1.5 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Carregando casos do banco de dados...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-12 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum caso encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? "Nenhum caso corresponde aos termos da busca digitada."
                : "Nenhum caso cadastrado com esse status no momento."}
            </p>
          </div>
        </div>
      ) : (
        /* Cases List */
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((c) => (
            <CartaoCaso key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}
