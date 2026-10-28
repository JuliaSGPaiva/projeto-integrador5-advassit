"use client";

import { useState } from "react";
import { api } from "@/frontend/lib/api";
import { HelpCircle, Send, AlertCircle, HelpCircle as QuestionIcon } from "lucide-react";

interface QuestionItem {
  order: number;
  text: string;
}

interface PerguntasEsclarecimentoProps {
  caseId: string;
  questions: QuestionItem[];
  onClarified: () => void;
}

export function PerguntasEsclarecimento({
  caseId,
  questions,
  onClarified,
}: PerguntasEsclarecimentoProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (order: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [order]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const answersPayload = questions.map((q) => ({
      order: q.order,
      text: (answers[q.order] || "").trim() || "Não soube responder / Não se aplica.",
    }));

    const hasAnyRealAnswer = answersPayload.some(
      (a) => a.text.length > 2 && a.text !== "Não soube responder / Não se aplica."
    );

    if (!hasAnyRealAnswer) {
      setError("Por favor, responda ao menos a uma das perguntas para ajudar na sua triagem.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.clarifyCase(caseId, answersPayload);
      onClarified();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao enviar esclarecimentos. Tente novamente.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Step Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
            PASSO 2 DE 3
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Esclarecimentos Fáticos Adicionais
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
          {questions.length} perguntas geradas
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
          A IA identificou lacunas fáticas no relato inicial. Por favor, forneça as informações abaixo para complementar o enquadramento na CLT:
        </div>

        {error && (
          <div className="p-3.5 rounded bg-red-50 border border-red-200 flex items-center gap-3 text-xs text-red-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {questions.map((q) => (
            <div
              key={q.order}
              className="p-4 rounded border border-slate-200 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0">
                  Q{q.order}
                </span>
                <label className="text-xs font-bold text-slate-900 leading-snug">
                  {q.text}
                </label>
              </div>

              <textarea
                rows={3}
                placeholder="Digite os detalhes fáticos correspondentes..."
                value={answers[q.order] || ""}
                onChange={(e) => handleAnswerChange(q.order, e.target.value)}
                className="w-full sys-input p-3 leading-relaxed"
                disabled={isSubmitting}
              />
            </div>
          ))}

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Responda o máximo que lembrar para maior precisão.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ml-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Finalizando Dossiê...</span>
                </>
              ) : (
                <>
                  <span>Concluir Esclarecimentos</span>
                  <Send className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


