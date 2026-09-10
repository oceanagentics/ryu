import type { SupportedLocale, GraphNodeKind, GraphEdgeKind } from "../domain";

export const nodeKindLabels = {
  country: {
    en: "Country", fr: "Pays", es: "País", ar: "بلد", zh: "国家", ru: "Страна",
  },
  organization: {
    en: "Organization", fr: "Organisation", es: "Organización", ar: "منظمة", zh: "组织", ru: "Организация",
  },
  system: {
    en: "System", fr: "Système", es: "Sistema", ar: "نظام", zh: "系统", ru: "Система",
  },
} satisfies Record<GraphNodeKind, Record<SupportedLocale, string>>;

export const edgeKindLabels = {
  governs: {
    en: "governs", fr: "gouverne", es: "gobierna", ar: "يحكم", zh: "治理", ru: "управляет",
  },
  operates: {
    en: "operates", fr: "exploite", es: "opera", ar: "يشغّل", zh: "运营", ru: "эксплуатирует",
  },
  member_of: {
    en: "member of", fr: "membre de", es: "miembro de", ar: "عضو في", zh: "成员属于", ru: "член",
  },
  funds: {
    en: "funds", fr: "finance", es: "financia", ar: "يموّل", zh: "资助", ru: "финансирует",
  },
  publishes_to: {
    en: "publishes to", fr: "publie vers", es: "publica en", ar: "ينشر إلى", zh: "发布到", ru: "публикует в",
  },
  syncs_to: {
    en: "syncs to", fr: "se synchronise avec", es: "sincroniza con", ar: "يتزامن مع", zh: "同步到", ru: "синхронизируется с",
  },
} satisfies Record<GraphEdgeKind, Record<SupportedLocale, string>>;

export const relationshipDirectionLabels = {
  incoming: {
    en: "incoming", fr: "entrant", es: "entrante", ar: "وارد", zh: "传入", ru: "входящая",
  },
  outgoing: {
    en: "outgoing", fr: "sortant", es: "saliente", ar: "صادر", zh: "传出", ru: "исходящая",
  },
} satisfies Record<"incoming" | "outgoing", Record<SupportedLocale, string>>;
