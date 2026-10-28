"use client";

import { useState } from "react";
import { FormularioCaso } from "@/frontend/components/cliente/FormularioCaso";
import { PerguntasEsclarecimento } from "@/frontend/components/cliente/PerguntasEsclarecimento";
import { ConfirmacaoEnvio } from "@/frontend/components/cliente/ConfirmacaoEnvio";
import { CreateCaseResponse } from "@/backend/services/casesService";
import { ShieldCheck, Scale, FileText, Clock, CheckCircle, Lock } from "lucide-react";

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Portal Information & Guarantees (Shown on desktop) */}
      <div className="lg:col-span-4 space-y-5">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Scale className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-base font-extrabold font-heading text-slate-900">
              Triagem de Casos Trabalhistas
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            O <strong>AdvAssist</strong> é um portal de atendimento automatizado para recepção e enquadramento fático preliminar de demandas trabalhistas.
          </p>

          <div className="space-y-3 pt-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Garantias do Atendimento
            </h3>

            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Enquadramento na CLT e TST</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Recuperação automática de artigos e súmulas aplicáveis ao seu relato.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Encaminhamento Direto</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Seu caso é estruturado em um dossiê pronto para análise de um advogado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Privacidade & Sigilo</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Dados isolados e protegidos no banco de dados com chave de serviço.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Time Card */}
        <div className="bg-slate-900 text-white p-4 rounded-lg shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Tempo estimado</p>
              <p className="text-[11px] text-slate-400">Preenchimento em ~3 minutos</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 font-bold">
            GRATUITO
          </span>
        </div>
      </div>

      {/* Right Column: Main Dynamic Form Area */}
      <div className="lg:col-span-8">
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


