"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, Clock, PhoneCall, ShieldCheck, ArrowRight, Printer, FileCheck } from "lucide-react";

interface ConfirmacaoEnvioProps {
  caseId: string;
}

export function ConfirmacaoEnvio({ caseId }: ConfirmacaoEnvioProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(caseId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-emerald-800 text-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FileCheck className="w-5 h-5 text-emerald-300 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Comprovante Oficial de Protocolo de Atendimento
          </h2>
        </div>
        <span className="text-[10px] font-mono bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-bold">
          STATUS: REGISTRADO
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Protocol Box */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Número de Identificação do Caso (Protocolo ID)
            </span>
            <code className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
              {caseId}
            </code>
          </div>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Protocolo</span>
              </>
            )}
          </button>
        </div>

        {/* Confirmation Content */}
        <div className="space-y-3">
          <h3 className="text-base font-extrabold font-heading text-slate-900">
            Relato Fático Estruturado e Encaminhado com Sucesso
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Seus dados e a descrição fática foram processados pela nossa IA de triagem com base na CLT e no TST. O dossiê consolidado já está disponível no painel do advogado.
          </p>
        </div>

        {/* Timeline Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Próximas Etapas do Atendimento
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="p-3.5 flex items-start gap-3 bg-white">
              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                01
              </span>
              <div>
                <p className="font-bold text-slate-900">Análise do Advogado Responsável</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Revisão dos relatos, das normas celetistas identificadas e dos documentos preliminares.
                </p>
              </div>
            </div>

            <div className="p-3.5 flex items-start gap-3 bg-white">
              <span className="w-5 h-5 rounded bg-sky-100 text-sky-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                02
              </span>
              <div>
                <p className="font-bold text-slate-900">Contato Formal</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Retorno via WhatsApp ou e-mail com as orientações técnicas e agendamento de consulta.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
          >
            Abrir Novo Atendimento
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto px-5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <span>Acessar Painel Jurídico</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}


