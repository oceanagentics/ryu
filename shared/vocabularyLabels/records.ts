import type { SupportedLocale, RecordDepth, ReviewState } from "../domain";

export const recordDepthLabels = {
  stub: {
    en: "Stub", fr: "Ébauche", es: "Borrador mínimo", ar: "مختصر أولي", zh: "占位", ru: "Заготовка",
  },
  thin: {
    en: "Thin", fr: "Léger", es: "Ligero", ar: "موجز", zh: "简略", ru: "Краткая",
  },
  rich: {
    en: "Rich", fr: "Riche", es: "Completo", ar: "غني", zh: "完整", ru: "Полная",
  },
} satisfies Record<RecordDepth, Record<SupportedLocale, string>>;

export const reviewStateLabels = {
  agent_researched: {
    en: "Agent researched", fr: "Recherché par agent", es: "Investigado por agente", ar: "بحثه وكيل", zh: "代理已研究",
    ru: "Исследовано агентом",
  },
  human_reviewed: {
    en: "Human reviewed", fr: "Révisé par humain", es: "Revisado por humano", ar: "راجعه إنسان", zh: "人工已审核",
    ru: "Проверено человеком",
  },
  needs_revision: {
    en: "Needs revision", fr: "Révision requise", es: "Necesita revisión", ar: "يحتاج إلى مراجعة", zh: "需要修订",
    ru: "Требует доработки",
  },
} satisfies Record<ReviewState, Record<SupportedLocale, string>>;
