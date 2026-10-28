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
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Step Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
            PASSO 1 DE 3
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Formulário de Atendimento e Fatos
          </h2>
        </div>
        <span className="text-xs font-medium text-slate-500 hidden sm:inline">
          Campos marcados com * são obrigatórios
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* US4 Disclaimer */}
        <div className="p-3.5 rounded bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Aviso de Triagem Automatizada:</strong> As informações inseridas serão catalogadas via IA e fundamentadas na CLT antes do envio ao advogado responsável.
          </span>
        </div>

        {serverError && (
          <div className="p-3.5 rounded bg-red-50 border border-red-200 flex items-center gap-3 text-xs text-red-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identificação do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nome Completo do Trabalhador *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ex.: Carlos Eduardo da Silva"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  className={`w-full sys-input pl-9 pr-3 py-2.5 ${
                    errors.client_name ? "border-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_name && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.client_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                E-mail Principal *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.client_email}
                  onChange={(e) =>
                    setFormData({ ...formData, client_email: e.target.value })
                  }
                  className={`w-full sys-input pl-9 pr-3 py-2.5 ${
                    errors.client_email ? "border-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_email && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.client_email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                WhatsApp / Telefone com DDD *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.client_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, client_phone: e.target.value })
                  }
                  className={`w-full sys-input pl-9 pr-3 py-2.5 ${
                    errors.client_phone ? "border-red-500" : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.client_phone && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.client_phone}</p>
              )}
            </div>
          </div>

          {/* Relato do Caso */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Descrição dos Fatos Trabalhistas *
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {formData.initial_description.length} caracteres
              </span>
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={6}
                placeholder="Descreva o caso com detalhes: periódo trabalhado, se possuía carteira assinada ou era contratado como PJ, horários cumpridos, motivo do desligamento e verbas que não foram pagas..."
                value={formData.initial_description}
                onChange={(e) =>
                  setFormData({ ...formData, initial_description: e.target.value })
                }
                className={`w-full sys-input pl-9 pr-3 py-2.5 leading-relaxed ${
                  errors.initial_description ? "border-red-500" : ""
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.initial_description && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {errors.initial_description}
              </p>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Seu relato será avaliado em tempo real pela IA.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ml-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando Triagem...</span>
                </>
              ) : (
                <>
                  <span>Prosseguir para Análise</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


