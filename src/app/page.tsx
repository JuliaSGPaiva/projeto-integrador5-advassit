"use client";

import { useState } from "react";
import { FormularioCaso } from "@/frontend/components/cliente/FormularioCaso";
import { PerguntasEsclarecimento } from "@/frontend/components/cliente/PerguntasEsclarecimento";
import { ConfirmacaoEnvio } from "@/frontend/components/cliente/ConfirmacaoEnvio";
import { CreateCaseResponse } from "@/backend/services/casesService";
import { Shield, Sparkles, Scale, CheckCircle2 } from "lucide-react";

type FlowStep = "form" | "clarify" | "success";

export default function HomePage() {
  const [step, setStep] = useState<FlowStep>("form");
  const [currentCaseId, setCurrentCaseId] = useState<string>("");
  const [questions, setQuestions] = useState<Array<{ order: number; text: string }>>([]);

  const handleCaseCreated = (res: CreateCaseResponse) => {
    setCurrentCaseId(res.case_id);
    if (res.status === "pending_clarification" && res.questions && res.questions.length > 0) {
      setQuestions(res.questions);
      setStep("clarify");
    } else {
      setStep("success");
    }
  };

  const handleClarified = () => {
    setStep("success");
  };

  return (
    <div className="space-y-12">
      {/* Hero Banner only shown during form step */}
      {step === "form" && (
        <div className="text-center max-w-3xl mx-auto pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 mb-6">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Advocacia Trabalhista com Inteligência Artificial e RAG</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Defenda seus direitos com{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              triagem jurídica ágil
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Envie o relato do que ocorreu na sua relação de trabalho. Em instantes, nossa IA avalia as regras da CLT e direciona para o advogado ideal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">
                Análise com Groq LLaMA 3.3
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center gap-3">
              <Scale className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">
                Fundamentação na CLT e TST
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">
                Privacidade & Sigilo RLS
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Workflow Area */}
      <div>
        {step === "form" && (
          <FormularioCaso onCaseCreated={handleCaseCreated} />
        )}

        {step === "clarify" && (
          <PerguntasEsclarecimento
            caseId={currentCaseId}
            questions={questions}
            onClarified={handleClarified}
          />
        )}

        {step === "success" && (
          <ConfirmacaoEnvio caseId={currentCaseId} />
        )}
      </div>
    </div>
  );
}
