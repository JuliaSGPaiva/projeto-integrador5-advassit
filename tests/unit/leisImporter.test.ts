import { describe, it, expect } from "vitest";
import { parseFrontmatter, chunkLawByArticle } from "@/backend/services/rag/importers/leisImporter";

describe("Unit Tests — Leis Importer (ctresb/leis Parser)", () => {
  it("deve extrair corretamente o frontmatter YAML de uma lei", () => {
    const sampleMarkdown = `---
titulo: "Decreto-Lei nº 5.452 de 01/05/1943"
tipo: "Decreto-Lei"
numero: "5452"
data: 1943-05-01
ementa: "Aprova a Consolidação das Leis do Trabalho."
revogada: false
versao_texto: "compilada (texto vigente)"
fonte: "https://normas.leg.br/..."
---
# Decreto-Lei nº 5.452 de 01/05/1943
Texto de teste da lei.`;

    const { frontmatter, body } = parseFrontmatter(sampleMarkdown);

    expect(frontmatter.titulo).toBe("Decreto-Lei nº 5.452 de 01/05/1943");
    expect(frontmatter.numero).toBe("5452");
    expect(frontmatter.revogada).toBe(false);
    expect(frontmatter.ementa).toBe("Aprova a Consolidação das Leis do Trabalho.");
    expect(body).toContain("# Decreto-Lei nº 5.452 de 01/05/1943");
  });

  it("deve fatiar os artigos mantendo caput, parágrafos e incisos", () => {
    const sampleBody = `
**Art. 2º** Considera-se empregador a empresa individual ou coletiva.
**§ 1º** Equiparam-se ao empregador os profissionais liberais.

**Art. 3º** Considera-se empregado toda pessoa física que prestar serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário.
**Parágrafo único.** Não haverá distinções relativas à espécie de emprego.

**Art. 59.** A duração diária do trabalho poderá ser acrescida de horas extras.
`;

    const chunks = chunkLawByArticle(sampleBody, "CLT", "Consolidação das Leis do Trabalho");

    expect(chunks.length).toBe(3);

    expect(chunks[0].source).toBe("CLT Art. 2º");
    expect(chunks[0].content).toContain("Considera-se empregador");
    expect(chunks[0].content).toContain("§ 1º");

    expect(chunks[1].source).toBe("CLT Art. 3º");
    expect(chunks[1].content).toContain("Considera-se empregado");
    expect(chunks[1].content).toContain("Parágrafo único");

    expect(chunks[2].source).toBe("CLT Art. 59");
    expect(chunks[2].content).toContain("horas extras");
  });
});
