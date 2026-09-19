# AdvAssist — Triagem Inteligente de Casos Trabalhistas com IA e RAG

**AdvAssist** é uma solução de Inteligência Artificial voltada à triagem inicial de demandas no Direito Trabalhista. Integrando **LLM (Large Language Models)** e **RAG (Retrieval-Augmented Generation)** sobre a CLT e Súmulas do TST, a plataforma conecta trabalhadores e advogados, otimizando o tempo de atendimento e ampliando o acesso à justiça.

---

## 📌 1. Escopo do Projeto

O **AdvAssist** é uma aplicação de Inteligência Artificial voltada à triagem inicial de casos jurídicos, com foco no **Direito Trabalhista**.

* **Formulário de Captação do Cliente:** O cliente acessa um ambiente web (com possibilidade de extensão para mobile) e preenche um formulário com dados de contato (nome, e-mail e telefone) e a descrição livre da sua demanda trabalhista (ex.: verbas rescisórias não pagas, assédio, horas extras, acidente de trabalho, pejotização, entre outras).
* **Pipeline de RAG Jurídico:** Um componente de IA baseado em RAG processa esse relato, gera um resumo estruturado do caso e indica em quais dispositivos da CLT, súmulas do TST ou legislação correlata a situação se enquadra.
* **Mecanismo de Esclarecimento Automático:** Para mitigar o risco de o cliente fornecer um relato incompleto ou vago — o que impediria a IA de identificar corretamente o enquadramento e os próximos passos —, o sistema tem autorização para fazer até **três perguntas de esclarecimento** diretamente ao cliente caso o contexto inicial seja insuficiente (ex.: perguntando sobre subordinação, horário fixo e exclusividade no caso de PJ vs. CLT). As respostas complementares alimentam o mesmo pipeline de RAG antes da geração do resumo final entregue ao advogado.
* **Painel de Triagem para Advogados (`/admin`):** O advogado recebe um resumo estruturado, enquadramento legal e uma **sugestão de próximos passos jurídicos** (ex.: quais documentos solicitar ao cliente, qual o prazo prescricional aplicável, se cabe tentativa de acordo extrajudicial ou reclamação trabalhista), permitindo avaliar rapidamente a viabilidade e prioridade do caso antes mesmo do primeiro contato.
* **Escopo do MVP (Produto Mínimo Viável):** Contempla (i) formulário de captação do cliente; (ii) pipeline de RAG ancorado na base de legislação trabalhista; (iii) painel de triagem para o advogado com resumo, enquadramento e próximos passos; (iv) testes automatizados das partes críticas; e (v) uma rotina de avaliação (*eval*) da qualidade das respostas geradas pela IA.

> ℹ️ **Nota de Escopo:** Fica explicitado que o sistema **não substitui aconselhamento jurídico** nem gera decisões finais — sua função é reduzir o tempo de análise inicial e apoiar a priorização de casos, mantendo o advogado como responsável humano final pela decisão.

---

## ⚖️ 2. Justificativa

Advogados trabalhistas que atuam em escritórios de pequeno porte, Núcleos de Prática Jurídica (NPJ) universitários e serviços de assistência jurídica gratuita frequentemente lidam com um grande volume de atendimentos — muitos envolvendo relatos parecidos (rescisão, horas extras, verbas não pagas) — e pouco tempo para uma triagem detalhada de cada caso. Isso gera gargalos no acesso à justiça trabalhista, sobretudo para trabalhadores de baixa renda que dependem desses serviços e muitas vezes não sabem nomear tecnicamente seus direitos.

A aplicação de LLMs para resumir relatos em linguagem natural, apontar o enquadramento na CLT/súmulas do TST e sugerir os próximos passos jurídicos reduz significativamente o tempo gasto na etapa de triagem, permitindo que o profissional dedique mais tempo à análise estratégica e ao atendimento propriamente dito. O projeto se conecta diretamente à área temática de Direitos Humanos e Justiça, propondo uma solução tecnológica que amplia a capacidade de atendimento jurídico a trabalhadores em situação de vulnerabilidade.

---

## 🎯 3. Área Temática

* **Área Escolhida:** **Direitos Humanos e Justiça**
* **Recorte:** Acesso à justiça trabalhista e eficiência de atendimento jurídico para trabalhadores em vulnerabilidade social.

---

## 👥 4. Comunidade Impactada

Duas frentes da comunidade são impactadas diretamente pela solução:

1. **Advogados e Operadores do Direito:** Advogados trabalhistas em escritórios de pequeno porte, defensorias públicas e Núcleos de Prática Jurídica (NPJ) de universidades, que recebem grande volume de reclamações trabalhistas e possuem equipe reduzida para triagem.
2. **Trabalhadores em Vulnerabilidade Social:** Trabalhadores de baixa renda ou com pouco conhecimento jurídico, que enfrentam dificuldade em relatar sua demanda de forma tecnicamente clara e em entender a quais direitos trabalhistas ela se relaciona antes de procurar um profissional.

A caracterização detalhada dessa comunidade (perfil socioeconômico, volume estimado de atendimentos, principais tipos de demanda) é aprofundada com apoio de fontes abertas (IBGE, dados públicos do TST/CNJ).

---

## 📊 5. Indicadores de Impacto Previstos

### 5.1 Indicadores Quantitativos
- **Tempo médio de triagem** de um caso antes e depois do uso do sistema (minutos por caso).
- **Número de casos processados** pelo sistema em um período de teste.
- **Taxa de concordância** entre o enquadramento legal (CLT/súmulas do TST) sugerido pela IA e a avaliação de um advogado revisor.
- **Taxa de erro/alucinação** identificada no harness de avaliação (*eval*) do componente de IA.
- **Percentual de acionamento do esclarecimento:** Frequência em que o mecanismo de até três perguntas adicionais foi acionado por falta de detalhe no relato inicial.

### 5.2 Indicadores Qualitativos
- **Percepção de clareza e utilidade** do resumo e das sugestões de próximos passos, coletada via questionário com advogados que testarem o sistema.
- **Facilidade de uso do formulário** relatada pelos clientes/usuários simulados durante os testes.

---

## 🔄 6. Metodologia

O desenvolvimento segue uma abordagem iterativa, alinhada aos três checkpoints do edital (**C1, C2 e C3**):

1. **Definição do Recorte Jurídico do MVP:** Foco em Direito Trabalhista e priorização de 3 a 5 tipos de demanda mais comuns (verbas rescisórias, horas extras, assédio moral, pejotização) para delimitação da base de conhecimento.
2. **Curadoria da Base de Conhecimento:** Levantamento e estruturação de trechos da CLT, súmulas do TST e jurisprudência simplificada para compor a base vetorial do RAG.
3. **Desenvolvimento do Backend (API):** Construção dos serviços de chamada ao LLM (via Groq/GroqCloud), busca vetorial (embeddings) e engenharia de prompts para geração do resumo, enquadramento e sugestão de próximos passos.
4. **Mecanismo de Esclarecimento:** Implementação da lógica onde a IA avalia se o relato inicial é suficiente e, se necessário, realiza até 3 perguntas de acompanhamento ao cliente.
5. **Desenvolvimento do Frontend Web:** Interfaces intuitivas com fluxos para o formulário do cliente (`/`) e painel do advogado (`/admin`).
6. **Testes Automatizados:** Suíte de testes unitários e de integração (Vitest e Supertest) cobrindo partes críticas como validação de payload, pipeline RAG e rotas API.
7. **Harness de Avaliação (Eval Engine):** Script automatizado para medição de relevância, taxa de alucinação, robustez e ganho de qualidade proporcionado pelas perguntas de esclarecimento.
8. **IA Responsável e Deploy:** Aplicação contínua de princípios de IA responsável, deploy em nuvem com URL pública e documentação contínua no repositório GitHub.

---

## 🛠️ 7. Stack Tecnológica e Arquitetura

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS | Interface web responsiva para clientes e advogados |
| **Backend / API** | Next.js Route Handlers (`src/app/api/`), Node.js, Zod | Endpoints REST internos e validação rigorosa de dados |
| **Banco de Dados** | Supabase (PostgreSQL) + Extensão `pgvector` | Armazenamento de casos, perguntas e busca vetorial de RAG |
| **LLM & RAG** | Groq (Llama), Embeddings vetoriais | Processamento de linguagem natural e recuperação da CLT/TST |
| **Testes & Eval** | Vitest, Supertest, Harness de Eval próprio (`tests/eval`) | Testes automatizados e avaliação de qualidade da IA |
| **Deploy** | Vercel | Hospedagem Serverless em deploy único |

---

## ⚡ 8. Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+ recomendado)
- NPM, Yarn ou PNPM
- Projeto no [Supabase](https://supabase.com) com extensão `pgvector` habilitada
- API Key da [Groq](https://groq.com)

### Passos de Instalação

1. **Clonar e instalar dependências:**
   ```bash
   git clone https://github.com/JuliaSGPaiva/projeto-integrador5-advassit.git
   cd advassist
   npm install
   ```

2. **Configurar Variáveis de Ambiente:**
   Crie o arquivo `.env.local` na raiz com as chaves:
   ```env
   GROQ_API_KEY=sua_chave_groq
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

3. **Executar em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 9. Execução de Testes e Avaliação da IA

* **Testes Unitários e de Integração:**
  ```bash
  npm test
  ```

* **Harness de Avaliação (Eval) da IA:**
  ```bash
  npx tsx tests/eval/runEval.ts
  ```

---

## 🔒 10. Segurança & Considerações do MVP

- **Isolamento de Chaves:** As chaves de serviço do Supabase e Groq são utilizadas estritamente no backend serverless.
- **Políticas RLS:** O acesso às tabelas é restrito via `service_role`, bloqueando acesso direto pela chave pública.
- **Nota sobre a Rota `/admin`:** Na versão MVP, a rota de visualização dos advogados é mantida simplificada sem autenticação por login/senha.

---

## 📑 11. Documentação Técnica Completa

Para especificações detalhadas de arquitetura, contratos de API, schemas do banco de dados e definições das métricas do Eval, consulte a [Documentação Técnica Completa](AdvAssist_Documentacao_Tecnica.md).


