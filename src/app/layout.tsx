import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Scale, ShieldCheck, FileSpreadsheet } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AdvAssist | Triagem Inteligente de Casos Trabalhistas",
  description:
    "Plataforma de inteligência artificial e RAG para triagem ágil, estruturação fática e enquadramento celetista de demandas trabalhistas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-all">
                <Scale className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-white">
                    Adv<span className="text-amber-400">Assist</span>
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    IA Jurídica
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Triagem & Enquadramento Trabalhista com RAG
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Abrir Caso
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm shadow-amber-500/10"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Painel do Advogado</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Demo banner indicator */}
        <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-amber-500/10 border-b border-white/5 py-1.5 px-4 text-center text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-300/90">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Ambiente Acadêmico / MVP
          </span>
          <span className="mx-2 text-slate-600">•</span>
          <span>
            Groq LLaMA 3.3 (70B) + Base RAG (CLT / Súmulas TST) + Supabase pgvector
          </span>
        </div>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="glass-panel border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-4xl mx-auto space-y-2">
            <p>
              <strong>Aviso Legal (US4):</strong> O AdvAssist é uma ferramenta automatizada de inteligência artificial destinada à triagem preliminar e organização de informações fáticas. Não constitui consultoria jurídica formal nem substitui a atuação privativa de um advogado regularmente inscrito na OAB.
            </p>
            <p className="text-slate-600">
              © {new Date().getFullYear()} AdvAssist — Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
