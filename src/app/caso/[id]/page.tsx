"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/frontend/lib/api";
import { CaseRecord, ClarificationQuestionRecord } from "@/backend/services/supabase/types";
import { PerguntasEsclarecimento } from "@/frontend/components/cliente/PerguntasEsclarecimento";
import { ConfirmacaoEnvio } from "@/frontend/components/cliente/ConfirmacaoEnvio";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default function CasoDetailPage({
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

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCase(caseId);
      setCaseItem(res.caseItem);
      setQuestions(res.questions || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar dados do caso."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [caseId]);

  if (loading) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Verificando status do caso...</p>
      </div>
    );
  }

  if (error || !caseItem) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center max-w-lg mx-auto space-y-4">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Caso não encontrado</h2>
        <p className="text-xs text-slate-400">{error || "Não foi possível carregar as informações."}</p>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  // Se estiver pendente de esclarecimento e tiver perguntas não respondidas
  if (
    caseItem.status === "pending_clarification" &&
    questions.length > 0 &&
    questions.some((q) => !q.answer_text)
  ) {
    return (
      <PerguntasEsclarecimento
        caseId={caseId}
        questions={questions.map((q) => ({
          order: q.question_order,
          text: q.question_text,
        }))}
        onClarified={fetchStatus}
      />
    );
  }

  return <ConfirmacaoEnvio caseId={caseId} />;
}
