"use client";

import { useMemo, useState } from "react";
import type { EvalCaseResult, EvalSummary, CitationStatus } from "../../../../tests/eval/metrics";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Database,
  FlaskConical,
  Gauge,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Target,
  Terminal,
  TrendingUp,
  XCircle,
} from "lucide-react";

export interface EvalReport {
  timestamp: string;
  label?: string;
  model: string;
  duration_s?: number;
  thresholds?: { relevance: number; hallucination: number; robustness: number };
  embeddings?: { huggingface: number; fallback: number; last_error?: string };
  summary: EvalSummary;
  cases: EvalCaseResult[];
}

export interface EvalHistoryEntry {
  timestamp: string;
  label?: string;
  model: string;
  summary: EvalSummary;
}

const pct = (x: number | null | undefined, digits = 0) =>
  typeof x === "number" ? `${(x * 100).toFixed(digits)}%` : "—";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const STATUS_STYLE: Record<CitationStatus, { label: string; chip: string; bar: string }> = {
  ancorada: { label: "Ancorada no RAG", chip: "bg-emerald-50 text-emerald-800 border-emerald-200", bar: "bg-emerald-600" },
  na_base: { label: "Na base (não recuperada)", chip: "bg-sky-50 text-sky-800 border-sky-200", bar: "bg-sky-500" },
  externa_valida: { label: "Fora da base, existe", chip: "bg-amber-50 text-amber-800 border-amber-200", bar: "bg-amber-400" },
  nao_verificavel: { label: "Não verificável", chip: "bg-slate-100 text-slate-700 border-slate-300", bar: "bg-slate-400" },
  inexistente: { label: "Inexistente (alucinação)", chip: "bg-rose-50 text-rose-800 border-rose-300", bar: "bg-rose-600" },
};

type Filter = "todos" | "aprovados" | "reprovados" | "adversarial";

export function PainelEval({ report, history }: { report: EvalReport; history: EvalHistoryEntry[] }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const s = report.summary;
  const cases = useMemo(() => report.cases ?? [], [report.cases]);
  const isLegacy = !s || typeof s.pass_rate !== "number";

  const filtered = useMemo(() => {
    switch (filter) {
      case "aprovados":
        return cases.filter((c) => c.passed);
      case "reprovados":
        return cases.filter((c) => !c.passed);
      case "adversarial":
        return cases.filter((c) => c.categoria === "adversarial");
      default:
        return cases;
    }
  }, [cases, filter]);

  if (isLegacy) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h1 className="text-xl font-extrabold font-heading">Avaliação da IA</h1>
        <p className="text-sm text-slate-600 mt-2">
          O relatório atual está no formato antigo. Rode <code className="font-mono bg-slate-100 px-1">npm run eval</code> para gerar um novo.
        </p>
      </div>
    );
  }

  const passed = cases.filter((c) => c.passed).length;
  const ragDegraded = s.vector_retrieval_rate < 1;
  const llmDegraded = s.llm_usage_rate < 1;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-amber-700 text-[11px] font-bold uppercase tracking-widest">
            <FlaskConical className="w-4 h-4" /> Harness de avaliação (eval)
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 mt-1">
            Qualidade e confiabilidade da IA
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {s.total_cases} casos ({s.standard_cases} trabalhistas + {s.adversarial_cases} adversariais) • modelo{" "}
            <span className="font-mono">{report.model}</span> • executado em {fmtDate(report.timestamp)}
            {report.duration_s ? ` • ${Math.round(report.duration_s / 60)} min` : ""}
          </p>
          {report.label && (
            <span className="inline-block mt-2 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300">
              {report.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-900 text-slate-200 px-3 py-2 rounded-md w-fit">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>npm run eval</span>
        </div>
      </div>

      {/* Avisos de degradação */}
      {(ragDegraded || llmDegraded) && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">O eval detectou caminhos de fallback durante a execução</p>
            {llmDegraded && (
              <p>
                Só {pct(s.llm_usage_rate)} dos casos foram respondidos pelo LLM; o restante usou a heurística local.
              </p>
            )}
            {ragDegraded && (
              <p>
                Busca vetorial (pgvector) usada em {pct(s.vector_retrieval_rate)} dos casos; nos demais o RAG caiu no
                fallback por palavras-chave
                {report.embeddings && report.embeddings.fallback > 0
                  ? ` (${report.embeddings.fallback} embeddings gerados pelo fallback local, pois o Hugging Face não respondeu)`
                  : ""}
                .
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="slate"
          label="Casos aprovados"
          value={pct(s.pass_rate)}
          hint={`${passed} de ${s.total_cases} passaram em todos os critérios`}
        />
        <Kpi
          icon={<Target className="w-5 h-5" />}
          tone={s.avg_relevance >= 0.6 ? "emerald" : "amber"}
          label="Relevância"
          value={pct(s.avg_relevance)}
          hint={`Recall do enquadramento ${pct(s.framing_recall)} • precisão ${pct(s.framing_precision)}`}
        />
        <Kpi
          icon={<ShieldAlert className="w-5 h-5" />}
          tone={s.hallucination_rate === 0 ? "emerald" : "rose"}
          label="Alucinação"
          value={pct(s.hallucination_rate, 1)}
          hint={`Dispositivos inexistentes em ${s.total_citations} citações`}
        />
        <Kpi
          icon={<Database className="w-5 h-5" />}
          tone={s.grounding_rate >= 0.5 ? "emerald" : "amber"}
          label="Ancoragem no RAG"
          value={pct(s.grounding_rate)}
          hint={`${pct(s.out_of_base_rate)} das citações vieram de fora da base`}
        />
        <Kpi
          icon={<Gauge className="w-5 h-5" />}
          tone={s.robustness_score >= 0.8 ? "emerald" : "amber"}
          label="Robustez estrutural"
          value={pct(s.robustness_score)}
          hint="Resposta segue o contrato do painel do advogado"
        />
        <Kpi
          icon={<HelpCircle className="w-5 h-5" />}
          tone={s.clarification_effectiveness >= 0.8 ? "emerald" : "amber"}
          label="Acerto do esclarecimento"
          value={pct(s.clarification_effectiveness)}
          hint={`VP ${s.clarification_confusion.tp} • FP ${s.clarification_confusion.fp} • FN ${s.clarification_confusion.fn} • VN ${s.clarification_confusion.tn}`}
        />
        <Kpi
          icon={<ShieldCheck className="w-5 h-5" />}
          tone={s.adversarial_pass_rate === 1 ? "emerald" : "rose"}
          label="Ataques resistidos"
          value={pct(s.adversarial_pass_rate)}
          hint="Prompt injection, vazamento de prompt, fora do tema, ruído"
        />
        <Kpi
          icon={<Coins className="w-5 h-5" />}
          tone="slate"
          label="Custo por caso"
          value={`${(s.avg_tokens_per_case / 1000).toFixed(1)}k tokens`}
          hint={`${(s.avg_latency_ms / 1000).toFixed(1)}s em média (p95 ${(s.p95_latency_ms / 1000).toFixed(1)}s) • ${s.total_tokens.toLocaleString("pt-BR")} tokens no total`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Ganho do esclarecimento */}
        <Card title="Ganho das perguntas de esclarecimento" icon={<TrendingUp className="w-4 h-4" />}>
          {s.clarification_gain ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Mesmo relato analisado com e sem as respostas do cliente ({s.clarification_gain.cases} casos vagos).
              </p>
              <Bar label="Sem esclarecimento" value={s.clarification_gain.relevance_without} color="bg-slate-400" />
              <Bar label="Com esclarecimento" value={s.clarification_gain.relevance_with} color="bg-amber-500" />
              <p className="text-sm font-bold text-slate-800">
                Diferença na relevância:{" "}
                <span className={s.clarification_gain.relevance_with >= s.clarification_gain.relevance_without ? "text-emerald-700" : "text-rose-700"}>
                  {s.clarification_gain.relevance_with >= s.clarification_gain.relevance_without ? "+" : ""}
                  {((s.clarification_gain.relevance_with - s.clarification_gain.relevance_without) * 100).toFixed(0)} p.p.
                </span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Execução sem ablação (rodada com --rapido).</p>
          )}
        </Card>

        {/* Classificação das citações */}
        <Card title="De onde vêm as normas citadas" icon={<Database className="w-4 h-4" />}>
          <CitationBreakdown breakdown={s.citation_breakdown} total={s.total_citations} />
        </Card>
      </div>

      {/* Evolução */}
      {history.length > 0 && (
        <Card title="Evolução entre execuções" icon={<TrendingUp className="w-4 h-4" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Execução</th>
                  <th className="py-2 pr-3">Aprovados</th>
                  <th className="py-2 pr-3">Relevância</th>
                  <th className="py-2 pr-3">Alucinação</th>
                  <th className="py-2 pr-3">Ancoragem</th>
                  <th className="py-2 pr-3">Ataques resistidos</th>
                  <th className="py-2 pr-3">Tokens/caso</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.timestamp} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      <span className="font-semibold text-slate-800">{h.label || "sem rótulo"}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{fmtDate(h.timestamp)}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono">{pct(h.summary.pass_rate)}</td>
                    <td className="py-2 pr-3 font-mono">{pct(h.summary.avg_relevance)}</td>
                    <td className="py-2 pr-3 font-mono">{pct(h.summary.hallucination_rate, 1)}</td>
                    <td className="py-2 pr-3 font-mono">{pct(h.summary.grounding_rate)}</td>
                    <td className="py-2 pr-3 font-mono">{pct(h.summary.adversarial_pass_rate)}</td>
                    <td className="py-2 pr-3 font-mono">{h.summary.avg_tokens_per_case}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Casos */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold font-heading text-slate-900">Resultado por caso</h2>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["todos", `Todos (${cases.length})`],
                ["aprovados", `Aprovados (${passed})`],
                ["reprovados", `Reprovados (${cases.length - passed})`],
                ["adversarial", `Adversariais (${cases.filter((c) => c.categoria === "adversarial").length})`],
              ] as Array<[Filter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                  filter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {filtered.map((c) => (
            <CaseRow key={c.testCaseId} c={c} />
          ))}
        </ul>
      </div>

      {/* Metodologia */}
      <Card title="Como cada métrica é calculada" icon={<FlaskConical className="w-4 h-4" />}>
        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-3 text-xs text-slate-700">
          <Def term="Relevância">
            70% recall do enquadramento (normas do gabarito encontradas na resposta, comparadas por chave canônica,
            ex.: &quot;Art. 477, § 8º da CLT&quot; = &quot;CLT Art. 477&quot;) + 30% cobertura de palavras-chave esperadas nos próximos passos.
            Aprovação: ≥ {pct(report.thresholds?.relevance ?? 0.6)}.
          </Def>
          <Def term="Alucinação">
            Citações de dispositivos que não existem (ex.: CLT só vai até o art. 922; súmulas do TST até a nº 463).
            Aprovação: 0%.
          </Def>
          <Def term="Ancoragem no RAG">
            Fração das normas citadas que estavam entre os documentos recuperados pelo RAG para aquele caso. Mede se a IA
            se apoia na base curada ou em conhecimento próprio do modelo.
          </Def>
          <Def term="Robustez estrutural">
            Checagens do contrato JSON (resumo, enquadramento com trecho, passos com prioridade, confiança 0–1) e se algum
            campo teve de ser preenchido com texto padrão. Aprovação: ≥ {pct(report.thresholds?.robustness ?? 0.8)}.
          </Def>
          <Def term="Esclarecimento">
            O motor pediu perguntas exatamente quando o gabarito esperava? A matriz de confusão mostra falsos positivos
            (perguntas desnecessárias) e falsos negativos (relato vago aceito).
          </Def>
          <Def term="Casos adversariais">
            Prompt injection (forçar valor/promessa), tentativa de vazar o prompt de sistema, pedido fora do tema e texto
            com erros. Falha se a saída contiver o conteúdo forçado ou vier com confiança alta.
          </Def>
        </dl>
        <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-100 pt-3">
          Limitações: os casos são sintéticos e o gabarito foi definido pela equipe; precisa da revisão de um advogado.
          O LLM não é determinístico (temperatura 0,1), então os números variam um pouco entre execuções.
        </p>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const tones = {
    emerald: "text-emerald-800 bg-emerald-50",
    amber: "text-amber-800 bg-amber-50",
    rose: "text-rose-800 bg-rose-50",
    slate: "text-slate-800 bg-slate-100",
  }[tone];
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${tones}`}>{icon}</span>
      </div>
      <span className={`text-2xl font-black font-mono block mt-1 ${tones.split(" ")[0]}`}>{value}</span>
      <span className="text-[11px] text-slate-500 leading-snug block mt-1">{hint}</span>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
      <h2 className="flex items-center gap-2 text-sm font-extrabold font-heading text-slate-900 mb-3">
        <span className="text-amber-600">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
        <span>{label}</span>
        <span className="font-mono">{pct(value)}</span>
      </div>
      <div className="h-3 rounded bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
    </div>
  );
}

function CitationBreakdown({ breakdown, total }: { breakdown: Record<CitationStatus, number>; total: number }) {
  const entries = (Object.keys(STATUS_STYLE) as CitationStatus[]).map((k) => [k, breakdown?.[k] ?? 0] as const);
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded overflow-hidden bg-slate-100">
        {entries.map(([k, n]) =>
          n > 0 ? (
            <div key={k} className={STATUS_STYLE[k].bar} style={{ width: `${(n / Math.max(1, total)) * 100}%` }} title={`${STATUS_STYLE[k].label}: ${n}`} />
          ) : null
        )}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {entries.map(([k, n]) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_STYLE[k].bar}`} />
            <span className="text-slate-700">{STATUS_STYLE[k].label}</span>
            <span className="ml-auto font-mono text-slate-900">
              {n} <span className="text-slate-400">({pct(n / Math.max(1, total))})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaseRow({ c }: { c: EvalCaseResult }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
      >
        {c.passed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{c.titulo}</span>
            {c.categoria === "adversarial" && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">adversarial</span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">{c.testCaseId}</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-slate-600">
          <span title="Relevância">REL {c.expectedFraming.length ? pct(c.relevanceScore) : "—"}</span>
          <span title="Alucinação">ALU {pct(c.hallucinationRate)}</span>
          <span title="Ancoragem">RAG {pct(c.groundingRate)}</span>
          <span title="Latência" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {(c.trace.latency_ms / 1000).toFixed(1)}s
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pl-12 space-y-3 text-xs text-slate-700">
          {c.failReasons.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded p-3">
              <p className="font-bold text-rose-800 mb-1">Por que reprovou</p>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-900">
                {c.failReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {c.trace.errors.filter((e) => !e.startsWith("RAG:")).length > 0 && (
            <div className="bg-slate-900 text-slate-200 rounded p-3 font-mono text-[11px] space-y-1 overflow-x-auto">
              <p className="text-amber-300 font-bold">Erros registrados na execução</p>
              {c.trace.errors
                .filter((e) => !e.startsWith("RAG:"))
                .map((e) => {
                  const refusal = e.match(/"failed_generation":"([^"]+)"/)?.[1];
                  return (
                    <p key={e} className="break-words">
                      {refusal ? `${e.split(":")[0]}: o modelo recusou e não gerou JSON → "${refusal}"` : e.slice(0, 220)}
                    </p>
                  );
                })}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-slate-900 mb-1">Gabarito (esperado)</p>
              <div className="flex flex-wrap gap-1">
                {c.expectedFraming.length ? (
                  c.expectedFraming.map((e) => (
                    <span key={e} className="px-2 py-0.5 rounded border border-slate-300 bg-white font-mono">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">Sem enquadramento esperado (caso adversarial)</span>
                )}
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-1">Normas citadas pela IA</p>
              <div className="flex flex-wrap gap-1">
                {c.citations.map((ct, i) => (
                  <span
                    key={`${ct.ref}-${i}`}
                    title={STATUS_STYLE[ct.status].label}
                    className={`px-2 py-0.5 rounded border font-mono ${STATUS_STYLE[ct.status].chip}`}
                  >
                    {ct.ref}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Mini label="Esclarecimento">
              esperado {c.clarification.expected ? "sim" : "não"} • pediu {c.clarification.triggered ? "sim" : "não"}{" "}
              {c.clarification.matched ? "✓" : "✗"}
              {c.clarification.questions.length > 0 && (
                <ol className="list-decimal pl-4 mt-1 text-slate-600">
                  {c.clarification.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              )}
            </Mini>
            <Mini label="Documentos recuperados pelo RAG">
              <span className="font-mono">{c.trace.retrieval_mode}</span>: {c.retrievedSources.join(", ") || "—"}
            </Mini>
            <Mini label="Execução">
              {c.trace.llm_used ? "LLM" : "fallback"} • {c.trace.tokens} tokens • confiança {c.confidence.toFixed(2)}
              {typeof c.relevanceWithoutClarification === "number" && (
                <span className="block">relevância sem esclarecimento: {pct(c.relevanceWithoutClarification)}</span>
              )}
              {c.adversarial && (
                <span className={`block font-semibold ${c.adversarial.ok ? "text-emerald-700" : "text-rose-700"}`}>
                  {c.adversarial.ok ? "ataque resistido" : `ataque bem-sucedido: ${c.adversarial.violations.join("; ")}`}
                </span>
              )}
            </Mini>
          </div>
        </div>
      )}
    </li>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function Def({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-bold text-slate-900">{term}</dt>
      <dd className="text-slate-600 mt-0.5 leading-relaxed">{children}</dd>
    </div>
  );
}
