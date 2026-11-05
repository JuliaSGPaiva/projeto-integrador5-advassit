"use client";

import Link from "next/link";
import { CaseRecord, LegalFramingItem } from "@/backend/services/supabase/types";
import {
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Activity,
  Calendar,
} from "lucide-react";

interface CartaoCasoProps {
  item: CaseRecord;
}

export function CartaoCaso({ item }: CartaoCasoProps) {
  const getStatusDot = (status: string) => {
    switch (status) {
      case "ready":
        return {
          label: "PRONTO P/ ANÁLISE",
          dotClass: "bg-emerald-500",
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      case "pending_clarification":
        return {
          label: "AGUARDANDO CLIENTE",
          dotClass: "bg-amber-500",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "low_confidence":
        return {
          label: "REVISÃO MANUAL",
          dotClass: "bg-rose-500",
          badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
        };
      default:
        return {
          label: "PROCESSANDO",
          dotClass: "bg-sky-500",
          badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
        };
    }
  };

  const statusInfo = getStatusDot(item.status);

  const formattedDate = new Date(item.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidencePercent = item.confidence_score
    ? Math.round(Number(item.confidence_score) * 100)
    : null;

  const articles: LegalFramingItem[] = Array.isArray(item.legal_framing)
    ? item.legal_framing
    : Array.isArray(item.legal_framing?.articles)
    ? item.legal_framing.articles
    : [];

  return (
    <Link
      href={`/admin/${item.id}`}
      className="block bg-white p-4 sm:p-5 rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all duration-150 group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Client & Status */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${statusInfo.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>

          <h3 className="text-sm font-extrabold font-heading text-slate-900 group-hover:text-amber-700 transition-colors">
            {item.client_name}
          </h3>
        </div>

        {/* Right: Date & Access */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {formattedDate}
          </span>

          <span className="text-slate-900 group-hover:translate-x-0.5 transition-transform inline-flex items-center text-xs font-bold">
            Abrir <ChevronRight className="w-4 h-4 ml-0.5 text-amber-600" />
          </span>
        </div>
      </div>

      {/* Relato Preliminar / Resumo */}
      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed my-2.5 font-medium">
        {item.legal_summary || item.initial_description}
      </p>

      {/* Tags de Enquadramento Legal e Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">CLT/TST:</span>
          {articles.length > 0 ? (
            articles.map((f, i) => (
              <span
                key={i}
                className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700"
              >
                {f.ref}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Pendente
            </span>
          )}
        </div>

        {confidencePercent !== null && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Score IA:</span>
            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full ${
                  confidencePercent >= 75
                    ? "bg-emerald-600"
                    : confidencePercent >= 55
                    ? "bg-amber-600"
                    : "bg-rose-600"
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span
              className={`font-mono font-bold text-xs ${
                confidencePercent >= 75
                  ? "text-emerald-700"
                  : confidencePercent >= 55
                  ? "text-amber-700"
                  : "text-rose-700"
              }`}
            >
              {confidencePercent}%
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}


