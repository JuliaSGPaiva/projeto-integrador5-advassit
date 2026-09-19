"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, Clock, PhoneCall, ShieldCheck, ArrowRight } from "lucide-react";

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
    <div className="max-w-2xl mx-auto">
      <div className="glass-panel p-8 sm:p-12 rounded-2xl text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/25 animate-bounce-short">
          <CheckCircle2 className="w-10 h-10 text-slate-950 stroke-[2.5]" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          Triagem Concluída com Sucesso
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Seu relato foi recebido e catalogado!
        </h1>

        <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-lg mx-auto">
          A inteligência artificial estruturou as informações do seu caso e os dispositivos da CLT aplicáveis. O dossiê já foi disponibilizado no painel jurídico para revisão detalhada.
        </p>

        {/* Número de Protocolo */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-white/10 max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-left overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Código do Protocolo
            </span>
            <code className="text-xs font-mono text-amber-300 truncate block mt-0.5">
              {caseId}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Copiar código de protocolo"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Timeline / Próximos Passos */}
        <div className="mt-8 pt-8 border-t border-white/10 text-left space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            O que acontece agora?
          </h3>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">1. Avaliação Jurídica</p>
              <p className="text-xs text-slate-400 mt-0.5">
                O advogado responsável revisará o resumo, o enquadramento celetista e os cálculos iniciais.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">2. Contato Personalizado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nossa equipe entrará em contato via WhatsApp ou e-mail com as recomendações de próximos passos.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition-colors"
          >
            Abrir Outro Caso
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-300 text-sm font-semibold transition-all flex items-center justify-center gap-2 group"
          >
            <span>Ver no Painel do Advogado (Demo)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
