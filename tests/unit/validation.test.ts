import { describe, it, expect } from "vitest";
import { createCaseSchema, clarifyCaseSchema } from "@/backend/lib/validation";

describe("Unit Tests — Validation Schemas", () => {
  describe("createCaseSchema", () => {
    it("deve validar com sucesso um payload completo e correto", () => {
      const validPayload = {
        client_name: "Mariana Souza",
        client_email: "mariana@exemplo.com",
        client_phone: "11988887777",
        initial_description:
          "Trabalho há 2 anos cumprindo 10 horas diárias sem nunca ter recebido o pagamento de horas extras.",
      };

      const result = createCaseSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("deve rejeitar payload com e-mail inválido", () => {
      const invalidPayload = {
        client_name: "Mariana Souza",
        client_email: "email-invalido",
        client_phone: "11988887777",
        initial_description: "Descrição válida com tamanho suficiente.",
      };

      const result = createCaseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.client_email).toBeDefined();
      }
    });

    it("deve rejeitar relato muito curto (menos de 10 caracteres)", () => {
      const invalidPayload = {
        client_name: "Mariana Souza",
        client_email: "mariana@exemplo.com",
        client_phone: "11988887777",
        initial_description: "Fui demit",
      };

      const result = createCaseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.initial_description).toBeDefined();
      }
    });
  });

  describe("clarifyCaseSchema", () => {
    it("deve aceitar array de respostas com ordem válida", () => {
      const validPayload = {
        answers: [
          { order: 1, text: "Sim, cumpria horário das 8h às 18h." },
          { order: 2, text: "Recebia ordens diretas do coordenador de TI." },
        ],
      };

      const result = clarifyCaseSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("deve rejeitar se o array de respostas estiver vazio", () => {
      const invalidPayload = { answers: [] };
      const result = clarifyCaseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar se a ordem for fora do intervalo permitido (1 a 3)", () => {
      const invalidPayload = {
        answers: [{ order: 5, text: "Resposta fora do range." }],
      };
      const result = clarifyCaseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
