import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Scale, ShieldCheck, FileSpreadsheet, UserCheck } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "AdvAssist | Sistema de Triagem Trabalhista",
  description:
    "Plataforma enterprise de inteligência artificial e RAG para triagem, estruturação fática e enquadramento celetista de demandas trabalhistas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-100 text-slate-900">
        {/* Top Corporate System Header */}
        <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
            {/* System Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-sm group-hover:bg-amber-400 transition-colors">
                <Scale className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold font-heading tracking-tight text-white">
                    Adv<span className="text-amber-400">Assist</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    SISTEMA DE TRIAGEM
                  </span>
                </div>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Atendimento ao Cliente
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-md bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                <span>Painel de Casos</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Sub-header System Banner */}
        <div className="bg-slate-800 text-slate-300 border-b border-slate-700 py-1 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Ambiente Homologado MVP • Groq LLaMA 3.3 (70B) & RAG Trabalhista (CLT/TST)</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span>Perfil: Advogado Trabalhista</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* Corporate Footer */}
        <footer className="bg-white border-t border-slate-200 py-5 px-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 font-medium text-center sm:text-left">
              <strong>AdvAssist MVP:</strong> Sistema automatizado de apoio à triagem fática. Não substitui o parecer técnico de um advogado OAB.
            </p>
            <p className="text-slate-400 font-mono text-[11px]">
              © {new Date().getFullYear()} AdvAssist Enterprise. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

