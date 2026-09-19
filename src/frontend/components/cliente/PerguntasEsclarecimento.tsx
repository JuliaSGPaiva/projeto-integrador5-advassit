"use client";

import { useState } from "react";
import { api } from "@/frontend/lib/api";
import { HelpCircle, Send, AlertCircle, Sparkles } from "lucide-react";

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

    // Formata o payload
    const answersPayload = questions.map((q) => ({
      order: q.order,
      text: (answers[q.order] || "").trim() || "Não soube responder / Não se aplica.",
    }));

    // Verifica se pelo menos uma resposta foi preenchida com substância
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
    <div className="max-w-3xl mx-auto">
      <div className="glass-panel p-6 sm:p-10 rounded-2xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Fase de Esclarecimento
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Precisamos de apenas alguns detalhes adicionais
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Para que o advogado tenha todas as informações essenciais da CLT, responda às perguntas pontuais geradas pela nossa IA com base no seu relato inicial.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex gap-3 items-center text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q) => (
            <div
              key={q.order}
              className="p-5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-amber-500/30 transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {q.order}
                </span>
                <label className="text-sm font-semibold text-slate-100 leading-snug">
                  {q.text}
                </label>
              </div>

              <textarea
                rows={3}
                placeholder="Digite sua resposta com o máximo de detalhes que lembrar..."
                value={answers[q.order] || ""}
                onChange={(e) => handleAnswerChange(q.order, e.target.value)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm leading-relaxed"
                disabled={isSubmitting}
              />
            </div>
          ))}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
              Se não souber responder com precisão a alguma pergunta, informe o que souber.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Finalizando análise...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Concluir e Enviar Respostas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
