import { z } from "zod";

export const createCaseSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres.")
    .max(120, "Nome não pode exceder 120 caracteres."),
  client_email: z
    .string()
    .trim()
    .email("Informe um e-mail válido."),
  client_phone: z
    .string()
    .trim()
    .min(8, "Telefone deve ter pelo menos 8 dígitos.")
    .max(30, "Telefone inválido."),
  initial_description: z
    .string()
    .trim()
    .min(10, "Descreva seu caso com pelo menos 10 caracteres.")
    .max(5000, "O relato não pode exceder 5.000 caracteres."),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const clarifyCaseSchema = z.object({
  answers: z
    .array(
      z.object({
        order: z.number().int().min(1).max(3),
        text: z.string().trim().min(1, "A resposta não pode estar vazia.").max(2000),
      })
    )
    .min(1, "Envie pelo menos uma resposta de esclarecimento."),
});

export type ClarifyCaseInput = z.infer<typeof clarifyCaseSchema>;
