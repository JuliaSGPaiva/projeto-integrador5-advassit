"use client";

import { useEffect, useState, useMemo } from "react";
import { CaseRecord } from "@/backend/services/supabase/types";
import { api } from "@/frontend/lib/api";
import { CartaoCaso } from "./CartaoCaso";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Inbox,
  Briefcase,
  FileCheck,
  AlertTriangle,
  Clock,
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
      {/* Page Title & Reload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900">
            Gestão de Atendimentos Trabalhistas
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dossiês fáticos catalogados com fundamentação na CLT e Súmulas do TST
          </p>
        </div>

        <button
          onClick={loadCases}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-bold transition-colors shadow-xs cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total de Casos
            </span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-0.5 block">
              {counts.all}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Prontos p/ Análise
            </span>
            <span className="text-2xl font-black font-mono text-emerald-800 mt-0.5 block">
              {counts.ready}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Aguardando Cliente
            </span>
            <span className="text-2xl font-black font-mono text-amber-800 mt-0.5 block">
              {counts.pending}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Atenção Requerida
            </span>
            <span className="text-2xl font-black font-mono text-rose-800 mt-0.5 block">
              {counts.low}
            </span>
          </div>
          <div className="w-9 h-9 rounded bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Rectangular Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Todos os Casos ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter("ready")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "ready"
                ? "bg-emerald-800 text-white"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Prontos ({counts.ready})
          </button>

          <button
            onClick={() => setStatusFilter("pending_clarification")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "pending_clarification"
                ? "bg-amber-700 text-white"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Aguardando Esclarecimento ({counts.pending})
          </button>

          <button
            onClick={() => setStatusFilter("low_confidence")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "low_confidence"
                ? "bg-rose-700 text-white"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            Baixa Confiança ({counts.low})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por nome, relato ou CLT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sys-input pl-9 pr-3 py-1.5 text-xs font-medium"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Carregando lista de casos...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nenhum registro encontrado</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Não há casos cadastrados correspondentes ao filtro atual.
            </p>
          </div>
        </div>
      ) : (
        /* Cases Data Table / List */
        <div className="space-y-3">
          {filteredCases.map((c) => (
            <CartaoCaso key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}


