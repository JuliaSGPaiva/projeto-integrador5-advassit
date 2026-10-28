export interface LawFrontmatter {
  titulo?: string;
  tipo?: string;
  numero?: string;
  data?: string;
  ementa?: string;
  situacao?: string;
  revogada?: boolean;
  fonte?: string;
  versao_texto?: string;
}

export interface LawArticleChunk {
  source: string;
  content: string;
  articleNumber: string;
  lawTitle: string;
}

/**
 * Extrai o frontmatter YAML de um arquivo Markdown do repositório ctresb/leis.
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: LawFrontmatter;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  const rawYaml = match[1];
  const body = markdown.slice(match[0].length);
  const frontmatter: LawFrontmatter = {};

  for (const line of rawYaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    // Remove aspas
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (key === "revogada") {
      frontmatter.revogada = val.toLowerCase() === "true";
    } else if (key in frontmatter || ["titulo", "tipo", "numero", "data", "ementa", "situacao", "fonte", "versao_texto"].includes(key)) {
      (frontmatter as Record<string, unknown>)[key] = val;
    }
  }

  return { frontmatter, body };
}

/**
 * Fatia o corpo de uma lei em blocos por artigo, preservando parágrafos, incisos e alíneas.
 */
export function chunkLawByArticle(
  body: string,
  prefix: string,
  lawTitle: string
): LawArticleChunk[] {
  const chunks: LawArticleChunk[] = [];

  // Padrão de início de artigo no ctresb/leis:
  // **Art. 1º** ou **Art. 2º** ou **Art. 477.** ou Art. 3º etc.
  const articleRegex = /(?:^|\n)(?:\*\*(?:Art\.|Artigo)\s*([0-9]+[ºoª]?|[A-Z0-9\-]+)\.?\*\*|(?:Art\.|Artigo)\s*([0-9]+[ºoª]?|[A-Z0-9\-]+)\.?\s*)/gi;

  const matches: Array<{ index: number; articleNumber: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(body)) !== null) {
    const articleNum = match[1] || match[2];
    if (articleNum) {
      matches.push({
        index: match.index,
        articleNumber: articleNum.trim(),
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const startIndex = current.index;
    const endIndex = next ? next.index : body.length;

    const rawChunk = body.slice(startIndex, endIndex).trim();

    // Limpa tags Markdown irrelevantes e espaços duplicados mantendo a legibilidade
    const cleanContent = rawChunk
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Ignora artigos vazios ou com menos de 20 caracteres
    if (cleanContent.length > 20) {
      // Normaliza o número do artigo (ex: "3º", "477", "59")
      const formattedNumber = current.articleNumber.endsWith(".")
        ? current.articleNumber.slice(0, -1)
        : current.articleNumber;

      const source = `${prefix} Art. ${formattedNumber}`;

      chunks.push({
        source,
        content: cleanContent,
        articleNumber: formattedNumber,
        lawTitle,
      });
    }
  }

  return chunks;
}

/**
 * Baixa uma norma diretamente do repositório ctresb/leis no GitHub via raw.
 */
export async function fetchLawFromGitHub(relativePath: string): Promise<string> {
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  const url = `https://raw.githubusercontent.com/ctresb/leis/main/${cleanPath}`;

  console.log(`[Leis Importer] Baixando: ${url}...`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AdvAssist-RAG-Importer",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar norma de ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}
