import { z } from 'zod';

export const DimensionSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .describe('Score de 0 a 10 para esta dimensão'),
  justificativa: z
    .string()
    .describe('Explicação objetiva do score, com base nos fatos da conversa'),
  evidencias: z
    .array(z.string())
    .describe(
      'Trechos ou paráfrases da conversa que sustentam a justificativa',
    ),
});

export const QaOutputSchema = z.object({
  qualificacaoLead: DimensionSchema.describe(
    'Qualidade na identificação do perfil, histórico, objetivos e necessidades do cliente antes de recomendar qualquer curso.',
  ),
  adequacaoRecomendacao: DimensionSchema.describe(
    'Pertinência das recomendações de curso ao perfil e aos objetivos declarados pelo cliente. Avalia se o agente apresentou o curso certo para a pessoa certa.',
  ),
  conducaoConversao: DimensionSchema.describe(
    'Efetividade na condução do cliente em direção a um próximo passo concreto: matrícula, transferência para especialista ou agendamento.',
  ),
  gestaoObjecoes: DimensionSchema.describe(
    'Qualidade no tratamento de dúvidas, resistências e objeções — especialmente perguntas sobre preço, prazo e comparação entre cursos.',
  ),
  clarezaComunicacao: DimensionSchema.describe(
    'Clareza, objetividade, adequação de linguagem e ausência de informações contraditórias ao longo do atendimento.',
  ),
  consistenciaContexto: DimensionSchema.describe(
    'Capacidade do agente de manter o contexto da conversa, sem ignorar respostas anteriores do cliente nem repetir perguntas já respondidas.',
  ),

  scoreGeral: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Média ponderada das seis dimensões. Peso: qualificacaoLead 20%, adequacaoRecomendacao 20%, conducaoConversao 20%, gestaoObjecoes 15%, clarezaComunicacao 15%, consistenciaContexto 10%.',
    ),

  pontosFortes: z
    .array(z.string())
    .describe('Lista de aspectos positivos identificados no atendimento'),

  oportunidadesMelhoria: z
    .array(z.string())
    .describe(
      'Lista de aspectos que reduzem a qualidade do atendimento e devem ser corrigidos',
    ),

  recomendaRevisaoHumana: z
    .boolean()
    .describe(
      'true se o atendimento apresenta falhas graves que exigem revisão humana imediata',
    ),

  motivosRevisao: z
    .array(z.string())
    .describe(
      'Razões que justificam revisão humana. Vazio se recomendaRevisaoHumana for false.',
    ),

  resumoExecutivo: z
    .string()
    .describe(
      'Parágrafo de 2 a 4 frases com o diagnóstico geral do atendimento, incluindo o ponto crítico de melhoria',
    ),
});

export type QaOutput = z.infer<typeof QaOutputSchema>;
