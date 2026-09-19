"use client";

import Link from "next/link";
import { CaseRecord } from "@/backend/services/supabase/types";
import {
  Clock,
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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return {
          label: "Pronto para Avaliação",
          icon: CheckCircle2,
          classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        };
      case "pending_clarification":
        return {
          label: "Aguardando Esclarecimento",
          icon: HelpCircle,
          classes: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        };
      case "low_confidence":
        return {
          label: "Revisão Manual Necessária",
          icon: ShieldAlert,
          classes: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        };
      default:
        return {
          label: "Em Processamento",
          icon: Activity,
          classes: "bg-sky-500/15 border-sky-500/30 text-sky-300",
        };
    }
  };

  const badge = getStatusBadge(item.status);
  const BadgeIcon = badge.icon;

  const formattedDate = new Date(item.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidencePercent = item.confidence_score
    ? Math.round(Number(item.confidence_score) * 100)
    : null;

  return (
    <Link
      href={`/admin/${item.id}`}
      className="block glass-panel p-5 sm:p-6 rounded-xl hover:border-amber-500/40 transition-all duration-200 group relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
            {item.client_name}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.classes}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Relato Preliminar */}
      <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed mb-4">
        {item.legal_summary || item.initial_description}
      </p>

      {/* Tags de Enquadramento Legal e Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.legal_framing && item.legal_framing.length > 0 ? (
            item.legal_framing.map((f, i) => (
              <span
                key={i}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
              >
                {f.ref}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">
              Aguardando enquadramento da IA
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {confidencePercent !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Confiança IA:</span>
              <span
                className={`font-semibold font-mono ${
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
          )}

          <span className="text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center text-xs font-semibold">
            Ver Caso <ChevronRight className="w-4 h-4 ml-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
