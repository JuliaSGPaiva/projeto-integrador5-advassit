"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CaseRecord,
  ClarificationQuestionRecord,
  DetailedDiagnostic,
  LegalFramingItem,
  ClaimableRightItem,
  PenaltyItem,
  StructuredStepItem,
} from "@/backend/services/supabase/types";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  BookOpen,
  ListOrdered,
  FileText,
  ShieldAlert,
  Copy,
  Check,
  MessageCircle,
  Briefcase,
  UserCheck,
  Scale,
  Coins,
  AlertTriangle,
  CheckSquare,
  Square,
  X,
  ExternalLink,
  Info,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface DetalheCasoProps {
  caseItem: CaseRecord;
  questions: ClarificationQuestionRecord[];
}

function getCleanStepTitle(item: string, idx: number): { titulo: string; fase: string } {
  const lower = item.toLowerCase();
  if (lower.includes("vínculo") || lower.includes("ctps") || lower.includes("anotação")) {
    return {
      titulo: "Reconhecimento de Vínculo e Anotação na CTPS",
      fase: `Etapa ${idx + 1} • Vínculo Empregatício`,
    };
  }
  if (
    lower.includes("calcular") ||
    lower.includes("verbas rescisórias") ||
    lower.includes("pagamento de verbas")
  ) {
    return {
      titulo: "Cálculo e Cobrança de Verbas Rescisórias e FGTS",
      fase: `Etapa ${idx + 1} • Apuração de Haveres`,
    };
  }
  if (
    lower.includes("documentos") ||
    lower.includes("solicitar à empresa") ||
    lower.includes("comprovantes")
  ) {
    return {
      titulo: "Solicitação e Coleta de Documentos da Empresa",
      fase: `Etapa ${idx + 1} • Instrução Probatória`,
    };
  }
  if (
    lower.includes("ingressar") ||
    lower.includes("reclamação") ||
    lower.includes("ação") ||
    lower.includes("dano moral")
  ) {
    return {
      titulo: "Ajuizamento de Reclamação com Pedido de Danos Morais",
      fase: `Etapa ${idx + 1} • Protocolo Judicial`,
    };
  }

  // Fallback: extrai a primeira frase sem truncar palavras
  const cleanFirstPart = item.split(/[,;.]/)[0].trim();
  return {
    titulo: cleanFirstPart.length > 8 ? cleanFirstPart : `Etapa Estratégica ${idx + 1}`,
    fase: `Etapa ${idx + 1}`,
  };
}

function parseDiagnostic(
  raw: unknown,
  initialDescription: string,
  nextStepsText: string | null
): {
  actionType: string;
  articles: LegalFramingItem[];
  claimableRights: ClaimableRightItem[];
  penalties: PenaltyItem[];
  steps: StructuredStepItem[];
} {
  // Caso o legal_framing já esteja no formato rico DetailedDiagnostic
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const data = raw as DetailedDiagnostic;
    return {
      actionType:
        data.action_type ||
        "Reclamação Trabalhista de Reconhecimento de Vínculo Empregatício c/c Cobrança de Verbas Rescisórias e Danos Morais",
      articles: Array.isArray(data.articles) ? data.articles : [],
      claimableRights: Array.isArray(data.claimable_rights) ? data.claimable_rights : [],
      penalties: Array.isArray(data.penalties_and_fines) ? data.penalties_and_fines : [],
      steps:
        Array.isArray(data.steps) && data.steps.length > 0
          ? data.steps
          : generateFallbackSteps(nextStepsText),
    };
  }

  // Caso legado (quando legal_framing era apenas um array de artigos [{ ref, trecho }])
  const legacyArticles = Array.isArray(raw) ? (raw as LegalFramingItem[]) : [];
  const text = (initialDescription || "").toLowerCase();
  const isPj = text.includes("pj") || text.includes("vínculo");

  return {
    actionType: isPj
      ? "Reclamação Trabalhista de Reconhecimento de Vínculo Empregatício c/c Cobrança de Verbas Rescisórias e Danos Morais"
      : "Reclamação Trabalhista com Pedido de Rescisão Indireta e Pagamento de Verbas Contratuais",
    articles: legacyArticles,
    claimableRights: [
      {
        nome: "Reconhecimento de Vínculo e Anotação na CTPS",
        descricao:
          "Registro formal retroativo em carteira de trabalho com todas as contribuições previdenciárias (INSS) correspondentes.",
        base_legal: "CLT Art. 29 e Art. 3º",
      },
      {
        nome: "FGTS Integral + Multa Rescisória de 40%",
        descricao:
          "Depósito obrigatório de 8% mensal sobre a remuneração real com o acréscimo indenizatório de 40% pela dispensa sem justa causa.",
        base_legal: "Lei nº 8.036/1990",
      },
      {
        nome: "Férias Vencidas e Proporcionais + 1/3",
        descricao:
          "Pagamento das férias não usufruídas acrescidas do terço constitucional garantido por lei.",
        base_legal: "CLT Art. 129 e CF/88 Art. 7º, XVII",
      },
      {
        nome: "13º Salário (Integrais e Proporcionais)",
        descricao:
          "Gratificação natalina de todo o período contratual laborado sem quitação.",
        base_legal: "Lei nº 4.090/1962",
      },
      {
        nome: "Horas Extras com Adicional Mínimo de 50%",
        descricao:
          "Apuração das horas laboradas além da 8ª diária e 44ª semanal com reflexos em DSR, aviso prévio e rescisão.",
        base_legal: "CLT Art. 59",
      },
      {
        nome: "Indenização por Danos Morais (Pejotização Fraudulenta)",
        descricao:
          "Reparação civil pela sonegação deliberada de direitos trabalhistas fundamentais e imposição de fraude jurídica.",
        base_legal: "CLT Art. 9º, Art. 223-B e CC Art. 186/927",
      },
    ],
    penalties: [
      {
        multa: "Multa do Art. 477, § 8º da CLT",
        motivo:
          "Atraso ou inobservância do prazo legal de 10 dias corridos para quitação das verbas rescisórias.",
        valor: "Equivalente a 1 salário integral do trabalhador",
      },
      {
        multa: "Multa do Art. 467 da CLT",
        motivo:
          "Não pagamento das verbas rescisórias incontroversas na primeira audiência da Justiça do Trabalho.",
        valor: "Acréscimo de 50% sobre o montante rescisório incontroverso",
      },
      {
        multa: "Multa Administrativa por Empregado sem Registro (Art. 47 CLT)",
        motivo:
          "Infração de ordem pública por manter funcionário ativo sem o devido registro em carteira e e-Social.",
        valor: "Até R$ 3.000,00 por trabalhador prejudicado",
      },
    ],
    steps: generateFallbackSteps(nextStepsText),
  };
}

function generateFallbackSteps(nextStepsText: string | null): StructuredStepItem[] {
  if (!nextStepsText) {
    return [
      {
        fase: "Fase 1 • Pré-Processual",
        titulo: "Coleta e Blindagem de Provas",
        descricao:
          "Reunir contratos, notas fiscais, e-mails de cobrança, mensagens de WhatsApp com chefia, registros de ponto e arrolar testemunhas.",
        prioridade: "Alta",
      },
      {
        fase: "Fase 2 • Cálculos e Notificação",
        titulo: "Elaboração de Planilha de Cálculos",
        descricao:
          "Apurar detalhadamente FGTS com 40%, horas extras, 13º, férias e reflexos para instruir a petição inicial.",
        prioridade: "Média",
      },
      {
        fase: "Fase 3 • Fase Judicial",
        titulo: "Ajuizamento da Reclamação Trabalhista",
        descricao:
          "Protocolar a petição inicial com pedido de nulidade da pejotização (Art. 9º da CLT), reconhecimento de vínculo e condenação nas verbas e multas.",
        prioridade: "Alta",
      },
    ];
  }

  // Divide pelas numerações "1. ...; 2. ..."
  const rawParts = nextStepsText
    .split(/(?:;\s*|\n+)(?:\d+\.\s*)?/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter((s) => s.length > 5);

  if (rawParts.length === 0) {
    return [
      {
        fase: "Etapa 1",
        titulo: "Ação Estratégica Inicial",
        descricao: nextStepsText,
        prioridade: "Alta",
      },
    ];
  }

  return rawParts.map((item, idx) => {
    const { titulo, fase } = getCleanStepTitle(item, idx);
    return {
      fase,
      titulo,
      descricao: item,
      prioridade: idx < 2 ? "Alta" : "Média",
    };
  });
}

export function DetalheCaso({ caseItem, questions }: DetalheCasoProps) {
  const [copied, setCopied] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeModalStep, setActiveModalStep] = useState<{
    step: StructuredStepItem;
    index: number;
  } | null>(null);

  const formattedDate = new Date(caseItem.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidencePercent = caseItem.confidence_score
    ? Math.round(Number(caseItem.confidence_score) * 100)
    : 80;

  const isLowConfidence = caseItem.status === "low_confidence" || confidencePercent < 65;

  const diagnostic = parseDiagnostic(
    caseItem.legal_framing,
    caseItem.initial_description,
    caseItem.next_steps
  );

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = diagnostic.steps.length;

  const copyDossier = () => {
    const text = `
DOSSIÊ JURÍDICO TRABALHISTA - ADVASSIST
======================================================
CLIENTE: ${caseItem.client_name}
E-MAIL: ${caseItem.client_email} | TELEFONE: ${caseItem.client_phone}
DATA DE RECEPÇÃO: ${formattedDate}
ÍNDICE DE CONFIABILIDADE DA TRIAGEM: ${confidencePercent}%

1. AÇÃO JUDICIAL CABÍVEL:
${diagnostic.actionType}

2. RESUMO EXECUTIVO DOS FATOS:
${caseItem.legal_summary || "Pendente"}

3. VERBAS E DIREITOS PLEITEÁVEIS:
${diagnostic.claimableRights
  .map((r, i) => `${i + 1}. ${r.nome} (${r.base_legal})\n   ${r.descricao}`)
  .join("\n")}

4. MULTAS E PENALIDADES À EMPRESA:
${diagnostic.penalties
  .map((p, i) => `${i + 1}. ${p.multa}\n   Motivo: ${p.motivo}\n   Cálculo: ${p.valor}`)
  .join("\n")}

5. FUNDAMENTAÇÃO LEGAL IDENTIFICADA (CLT / TST):
${diagnostic.articles.map((f) => `- ${f.ref}: ${f.trecho}`).join("\n")}

6. PLANO DE AÇÃO E PRÓXIMOS PASSOS:
${diagnostic.steps
  .map((s, i) => `[${s.fase}] ${s.titulo} (Prioridade: ${s.prioridade})\n- ${s.descricao}`)
  .join("\n")}

7. RELATO ORIGINAL DO CLIENTE:
${caseItem.initial_description}
======================================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappUrl = `https://wa.me/55${caseItem.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${caseItem.client_name}, recebemos sua solicitação no AdvAssist e estamos analisando seu caso trabalhista.`
  )}`;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase font-bold">
              <span>CASOS</span>
              <span>/</span>
              <span>PROTOCOLO #{caseItem.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 mt-0.5">
              Dossiê Jurídico: {caseItem.client_name}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyDossier}
            className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dossiê Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Dossiê Completo</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Falar no WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Low Confidence Warning Alert */}
      {isLowConfidence && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold">Atenção: Triagem com baixa taxa de completude probatória</h4>
            <p className="text-amber-800 leading-relaxed font-medium">
              O caso apresenta elementos iniciais ou lacunas de datas/valores. Recomenda-se colher
              documentos adicionais antes de ajuizar a demanda.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Layout: 2/3 Content Column and 1/3 Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (65%): Central Judicial Dossier */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Factual Executive Summary */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Resumo Executivo da Triagem Fática</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                GERADO POR IA
              </span>
            </div>
            <div className="p-5 text-xs text-slate-800 leading-relaxed font-medium">
              {caseItem.legal_summary || "Processando análise preliminar..."}
            </div>
          </div>

          {/* Card 2: Legal Action & Strategic Thesis */}
          <div className="sys-card overflow-hidden border-indigo-200 bg-gradient-to-br from-white to-indigo-50/20">
            <div className="sys-card-header flex items-center justify-between border-b border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Ação Judicial Cabível e Tese Estratégica</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                PROCESSO CABÍVEL
              </span>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-heading leading-snug">
                {diagnostic.actionType}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Fundamentada na descaracterização da contratação civil/PJ por fraude à legislação
                trabalhista (Art. 9º da CLT), pleiteando a nulidade do contrato comercial e a
                reparação de todos os títulos sonegados.
              </p>
            </div>
          </div>

          {/* Card 3: Claimable Rights (What the client can receive) */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>O que o Trabalhador Pode Receber (Verbas e Direitos Pleiteáveis)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {diagnostic.claimableRights.length} DIREITOS IDENTIFICADOS
              </span>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {diagnostic.claimableRights.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.base_legal}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {item.nome}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium mt-1">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Fines & Company Penalties */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Multas e Penalidades Aplicáveis Contra a Empresa</span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                SANÇÕES LEGAIS
              </span>
            </div>
            <div className="p-5 space-y-3">
              {diagnostic.penalties.map((penalty, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-rose-100 bg-rose-50/30 space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      {penalty.multa}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                      Cálculo: {penalty.valor}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-relaxed pl-5">
                    <span className="font-semibold text-slate-900">Motivo:</span> {penalty.motivo}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Normative Framing (CLT & TST) */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Fundamentação Legal Identificada (CLT / Súmulas TST)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {diagnostic.articles.length} NORMAS CITADAS
              </span>
            </div>
            <div className="p-5 space-y-2.5">
              {diagnostic.articles.length > 0 ? (
                diagnostic.articles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border border-slate-200 bg-slate-50/60 space-y-1"
                  >
                    <span className="text-[11px] font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-300 inline-block">
                      {item.ref}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
                      {item.trecho}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma fundamentação legal vinculada até o momento.
                </p>
              )}
            </div>
          </div>

          {/* Card 6: Full Factual History */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Histórico Fático Integral</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-500 mb-1.5">
                  Relato Inicial do Trabalhador:
                </h4>
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {caseItem.initial_description}
                </div>
              </div>

              {questions.length > 0 && (
                <div>
                  <h4 className="text-[11px] uppercase font-bold text-slate-500 mb-2">
                    Esclarecimentos Prestados ao Sistema:
                  </h4>
                  <div className="space-y-2.5">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                      >
                        <p className="font-bold text-slate-900">
                          Q{q.question_order}: {q.question_text}
                        </p>
                        <p className="text-slate-700 font-medium pl-2 border-l-2 border-amber-500">
                          R: {q.answer_text || "Sem resposta..."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (35%): Client Data & Strategic Checklist */}
        <div className="lg:col-span-4 space-y-6">
          {/* Client Card */}
          <div className="sys-card overflow-hidden">
            <div className="sys-card-header flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span>Ficha de Identificação</span>
            </div>
            <div className="p-4 space-y-3 text-xs font-medium">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
                <span className="font-bold text-slate-900 text-sm">{caseItem.client_name}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">E-mail</span>
                <span className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {caseItem.client_email}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Telefone</span>
                <span className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {caseItem.client_phone}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Recepção</span>
                <span className="text-slate-700 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* AI Score Card */}
          <div className="sys-card p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Índice de Confiabilidade da Triagem
            </span>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-black font-mono ${
                  confidencePercent >= 75
                    ? "text-emerald-700"
                    : confidencePercent >= 55
                    ? "text-amber-700"
                    : "text-rose-700"
                }`}
              >
                {confidencePercent}%
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {confidencePercent >= 75 ? "ALTO" : confidencePercent >= 55 ? "MÉDIO" : "REVISÃO"}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded overflow-hidden border border-slate-200">
              <div
                className={`h-full ${
                  confidencePercent >= 75
                    ? "bg-emerald-600"
                    : confidencePercent >= 55
                    ? "bg-amber-600"
                    : "bg-rose-600"
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Lawyer Checklist Card */}
          <div className="sys-card overflow-hidden border-slate-300 shadow-sm">
            <div className="sys-card-header flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                <span>Checklist do Advogado</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {completedCount}/{totalSteps} CONCLUÍDOS
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-[11px] text-slate-500 font-medium">
                Clique em uma etapa para ver todos os detalhes ou marque o checkbox para concluir:
              </p>

              <div className="space-y-3">
                {diagnostic.steps.map((step, idx) => {
                  const isDone = Boolean(completedSteps[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveModalStep({ step, index: idx })}
                      className={`p-3 rounded-lg border transition-all cursor-pointer select-none space-y-2 group ${
                        isDone
                          ? "bg-emerald-50/50 border-emerald-300"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox independente com stopPropagation */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStep(idx);
                            }}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title={isDone ? "Desmarcar conclusão" : "Marcar como concluída"}
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          <div>
                            <span
                              className={`text-xs font-bold leading-snug block ${
                                isDone ? "line-through text-slate-500" : "text-slate-900 group-hover:text-indigo-950"
                              }`}
                            >
                              {step.titulo}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-medium block mt-0.5">
                              {step.fase}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                            step.prioridade === "Alta"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {step.prioridade}
                        </span>
                      </div>

                      {/* Botão de abrir detalhes */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800 pl-6">
                        <span>Ver instruções e detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL COM DETALHES COMPLETOS DA ETAPA */}
      {activeModalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    {activeModalStep.step.fase}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      activeModalStep.step.prioridade === "Alta"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    PRIORIDADE {activeModalStep.step.prioridade}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {activeModalStep.step.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalStep(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Descrição Detalhada */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Escopo e Descrição da Tarefa:</span>
                </h4>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                  {activeModalStep.step.descricao}
                </div>
              </div>

              {/* Dicas Práticas para o Advogado */}
              <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Instruções de Sucesso para a Demanda:
                </span>
                <p className="text-[11px] text-indigo-900/80 leading-relaxed font-medium">
                  Certifique-se de arquivar recibos bancários, capturas de tela com horários e
                  indicar ao menos 2 testemunhas que presenciavam a rotina presencial ou virtual
                  subordinada.
                </p>
              </div>

              {/* Botão de Checkbox dentro do Modal */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleStep(activeModalStep.index);
                  }}
                  className={`w-full py-3 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    completedSteps[activeModalStep.index]
                      ? "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {completedSteps[activeModalStep.index] ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Etapa Concluída! (Clique para desmarcar)</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>Marcar esta etapa como Concluída</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveModalStep(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
