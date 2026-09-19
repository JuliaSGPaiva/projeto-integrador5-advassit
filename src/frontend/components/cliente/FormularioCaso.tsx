"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/frontend/lib/api";
import { CreateCaseResponse } from "@/backend/services/casesService";
import {
  FileText,
  User,
  Mail,
  Phone,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface FormularioCasoProps {
  onCaseCreated?: (response: CreateCaseResponse) => void;
}

export function FormularioCaso({ onCaseCreated }: FormularioCasoProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    initial_description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.client_name.trim() || formData.client_name.trim().length < 2) {
      errs.client_name = "Informe seu nome completo (mínimo 2 caracteres).";
    }
    if (
      !formData.client_email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)
    ) {
      errs.client_email = "Informe um endereço de e-mail válido.";
    }
    if (!formData.client_phone.trim() || formData.client_phone.trim().length < 8) {
      errs.client_phone = "Informe um telefone/WhatsApp válido com DDD.";
    }
    if (
      !formData.initial_description.trim() ||
      formData.initial_description.trim().length < 10
    ) {
      errs.initial_description =
        "Por favor, descreva detalhadamente sua situação de trabalho (mínimo 10 caracteres).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.createCase(formData);

      if (onCaseCreated) {
        onCaseCreated(response);
      } else {
        router.push(`/caso/${response.case_id}`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar seu relato. Tente novamente.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-panel p-6 sm:p-10 rounded-2xl relative overflow-hidden">
        {/* Glow ambient background inside card */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Triagem Inteligente Trabalhista
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Conte-nos o que aconteceu no seu trabalho
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Nossa inteligência jurídica analisa seu relato em segundos, identifica direitos da CLT cabíveis e organiza seu caso para avaliação de um advogado.
          </p>
        </div>

        {/* Disclaimer / US4: Aviso de automação */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-amber-500/20 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-amber-300">Atenção:</strong> Este é um sistema automatizado de triagem fática preliminar por inteligência artificial. Suas informações serão organizadas e encaminhadas a um advogado especializado para análise formal.
          </div>
        </div>

        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex gap-3 items-center text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Ex.: Carlos Eduardo da Silva"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  className={`w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                    errors.client_name ? "border-red-500/60" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_name && (
                <p className="mt-1 text-xs text-red-400">{errors.client_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                E-mail para Contato *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.client_email}
                  onChange={(e) =>
                    setFormData({ ...formData, client_email: e.target.value })
                  }
                  className={`w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                    errors.client_email ? "border-red-500/60" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_email && (
                <p className="mt-1 text-xs text-red-400">{errors.client_email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                WhatsApp / Telefone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.client_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, client_phone: e.target.value })
                  }
                  className={`w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                    errors.client_phone ? "border-red-500/60" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_phone && (
                <p className="mt-1 text-xs text-red-400">{errors.client_phone}</p>
              )}
            </div>
          </div>

          {/* Relato do Caso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Descreva sua situação de trabalho *
              </label>
              <span className="text-[11px] text-slate-400">
                {formData.initial_description.length} caracteres
              </span>
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <textarea
                rows={6}
                placeholder="Exemplo: Fui contratado como PJ há 1 ano para trabalhar na área de tecnologia, mas tinha horário fixo de entrada e saída (8h às 18h), recebia ordens diretas do gerente e não podia enviar outra pessoa. Fui dispensado e não recebi férias, 13º nem FGTS..."
                value={formData.initial_description}
                onChange={(e) =>
                  setFormData({ ...formData, initial_description: e.target.value })
                }
                className={`w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm leading-relaxed ${
                  errors.initial_description ? "border-red-500/60" : ""
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.initial_description && (
              <p className="mt-1 text-xs text-red-400">
                {errors.initial_description}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              💡 <em>Dica:</em> Mencione detalhes como período trabalhado, funções, horários, se era PJ ou carteira assinada e valores pendentes.
            </p>
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:min-w-[240px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Analisando com IA...</span>
                </>
              ) : (
                <>
                  <span>Enviar para Triagem</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
