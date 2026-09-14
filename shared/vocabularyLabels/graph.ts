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
  member: {
    en: "member", fr: "membre", es: "miembro", ar: "عضو", zh: "成员", ru: "член",
  },
  funds: {
    en: "funds", fr: "finance", es: "financia", ar: "يموّل", zh: "资助", ru: "финансирует",
  },
  contributes: {
    en: "contributes", fr: "contribue", es: "contribuye", ar: "يساهم", zh: "贡献", ru: "вносит вклад",
  },
  transfers: {
    en: "transfers", fr: "transfère", es: "transfiere", ar: "ينقل", zh: "传输", ru: "передаёт",
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
