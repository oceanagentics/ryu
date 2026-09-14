import type {
  RecordDepth,
  ReviewState,
  SupportedLocale,
  TreatyConsentMethod,
  TreatyParticipationStatus,
} from "../domain";

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

export const treatyParticipationStatusLabels = {
  party: {
    en: "Party", fr: "Partie", es: "Parte", ar: "طرف", zh: "缔约方", ru: "Сторона",
  },
  signatory_not_party: {
    en: "Signatory, not a Party", fr: "Signataire non partie", es: "Signatario, no parte",
    ar: "موقّع غير طرف", zh: "签署方（非缔约方）", ru: "Подписант, не являющийся стороной",
  },
  not_party: {
    en: "Not a Party", fr: "Non-partie", es: "No parte", ar: "ليس طرفًا", zh: "非缔约方", ru: "Не является стороной",
  },
  withdrawn: {
    en: "Withdrawn", fr: "Retiré", es: "Retirado", ar: "منسحب", zh: "已退出", ru: "Участие прекращено",
  },
} satisfies Record<TreatyParticipationStatus, Record<SupportedLocale, string>>;

export const treatyConsentMethodLabels = {
  ratification: {
    en: "Ratification", fr: "Ratification", es: "Ratificación", ar: "تصديق", zh: "批准", ru: "Ратификация",
  },
  acceptance: {
    en: "Acceptance", fr: "Acceptation", es: "Aceptación", ar: "قبول", zh: "接受", ru: "Принятие",
  },
  approval: {
    en: "Approval", fr: "Approbation", es: "Aprobación", ar: "موافقة", zh: "核准", ru: "Утверждение",
  },
  accession: {
    en: "Accession", fr: "Adhésion", es: "Adhesión", ar: "انضمام", zh: "加入", ru: "Присоединение",
  },
  definitive_signature: {
    en: "Definitive signature", fr: "Signature définitive", es: "Firma definitiva", ar: "توقيع نهائي",
    zh: "最终签署", ru: "Окончательное подписание",
  },
} satisfies Record<TreatyConsentMethod, Record<SupportedLocale, string>>;
