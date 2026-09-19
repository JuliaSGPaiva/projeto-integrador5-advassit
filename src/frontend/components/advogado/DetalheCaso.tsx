"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseRecord, ClarificationQuestionRecord } from "@/backend/services/supabase/types";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  BookOpen,
  ListOrdered,
  FileText,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";

interface DetalheCasoProps {
  caseItem: CaseRecord;
  questions: ClarificationQuestionRecord[];
}

export function DetalheCaso({ caseItem, questions }: DetalheCasoProps) {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(caseItem.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidencePercent = caseItem.confidence_score
    ? Math.round(Number(caseItem.confidence_score) * 100)
    : 80;

  const isLowConfidence =
    caseItem.status === "low_confidence" || confidencePercent < 65;

  const copyDossier = () => {
    const text = `
DOSSIÊ TRABALHISTA - ADVASSIST
-----------------------------------------
Cliente: ${caseItem.client_name}
E-mail: ${caseItem.client_email}
Telefone: ${caseItem.client_phone}
Data: ${formattedDate}
Confiança da IA: ${confidencePercent}%

RESUMO EXECUTIVO:
${caseItem.legal_summary || "Pendente"}

ENQUADRAMENTO LEGAL:
${
  caseItem.legal_framing?.map((f) => `- ${f.ref}: ${f.trecho}`).join("\n") ||
  "Pendente"
}

PRÓXIMOS PASSOS SUGERIDOS:
${caseItem.next_steps || "Pendente"}

RELATO ORIGINAL DO CLIENTE:
${caseItem.initial_description}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappUrl = `https://wa.me/55${caseItem.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${caseItem.client_name}, recebemos sua solicitação no AdvAssist e estamos analisando seu caso trabalhista.`
  )}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Casos</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={copyDossier}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Dossiê</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Falar no WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Low Confidence Warning Banner (US8) */}
      {isLowConfidence && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-start gap-3 text-rose-200">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="text-rose-300 block mb-0.5">
              Atenção: Caso sinalizado com Baixa Confiança da IA ({confidencePercent}%)
            </strong>
            O relato fático inicial possui pontos divergentes ou carência de comprovação prévia. Recomenda-se entrevista individual detalhada com o trabalhador e checagem minuciosa de documentos.
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {caseItem.client_name}
              </h1>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  caseItem.status === "ready"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : caseItem.status === "pending_clarification"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                }`}
              >
                {caseItem.status === "ready"
                  ? "Pronto para Análise"
                  : caseItem.status === "pending_clarification"
                  ? "Aguardando Esclarecimento"
                  : "Revisão Manual"}
              </span>
            </div>

            {/* Client Contacts */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {caseItem.client_email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {caseItem.client_phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Confidence Score Gauge */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 min-w-[200px] text-center lg:text-right">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
              Score de Confiabilidade
            </span>
            <div className="flex items-baseline justify-center lg:justify-end gap-1.5">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  confidencePercent >= 75
                    ? "text-emerald-400"
                    : confidencePercent >= 55
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {confidencePercent}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  confidencePercent >= 75
                    ? "bg-emerald-400"
                    : confidencePercent >= 55
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Executive Summary & Legal Framing (US6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo Executivo da IA */}
        <div className="glass-panel-gold p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-amber-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Resumo Jurídico Preliminar
            </h2>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line flex-1">
            {caseItem.legal_summary || "Resumo em processamento..."}
          </p>
        </div>

        {/* Enquadramento Legal da CLT e Súmulas */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-sky-400">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Enquadramento Legal Sugerido
            </h2>
          </div>

          {caseItem.legal_framing && caseItem.legal_framing.length > 0 ? (
            <div className="space-y-3">
              {caseItem.legal_framing.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5"
                >
                  <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 inline-block mb-1.5">
                    {item.ref}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.trecho}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Nenhuma norma específica enquadrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* Próximos Passos Jurídicos */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4 text-emerald-400">
          <ListOrdered className="w-5 h-5" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Próximos Passos Recomendados pela IA
          </h2>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {caseItem.next_steps || "Sem próximos passos gerados."}
        </div>
      </div>

      {/* Contexto Fático Completo (US7) */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2 text-slate-300 border-b border-white/10 pb-3">
          <FileText className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Contexto Fático Integral do Trabalhador
          </h2>
        </div>

        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
            Relato Inicial do Cliente:
          </h4>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {caseItem.initial_description}
          </div>
        </div>

        {/* Perguntas e Respostas de Esclarecimento */}
        {questions.length > 0 && (
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Esclarecimentos Prestados pelo Cliente:
            </h4>
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2"
                >
                  <p className="text-xs font-semibold text-amber-300">
                    Pergunta {q.question_order}: {q.question_text}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-200 pl-3 border-l-2 border-amber-500/40">
                    <strong>Resposta:</strong> {q.answer_text || "Aguardando resposta..."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
