"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/frontend/lib/api";
import { CaseRecord, ClarificationQuestionRecord } from "@/backend/services/supabase/types";
import { DetalheCaso } from "@/frontend/components/advogado/DetalheCaso";
import { ShieldAlert, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseItem, setCaseItem] = useState<CaseRecord | null>(null);
  const [questions, setQuestions] = useState<ClarificationQuestionRecord[]>([]);

  const loadCase = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminCase(caseId);
      setCaseItem(res.caseItem);
      setQuestions(res.questions || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar detalhes do caso."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Carregando dossiê jurídico do caso...</p>
      </div>
    );
  }

  if (error || !caseItem) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center max-w-lg mx-auto space-y-4">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Caso não encontrado</h2>
        <p className="text-xs text-slate-400">{error || "Não foi possível carregar as informações."}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </Link>
          <button
            onClick={loadCase}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar</span>
          </button>
        </div>
      </div>
    );
  }

  return <DetalheCaso caseItem={caseItem} questions={questions} />;
}
