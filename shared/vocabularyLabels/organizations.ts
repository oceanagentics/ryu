import type { OrganizationOfficeKind, SupportedLocale } from "../domain";

export const organizationOfficeKindLabels = {
  headquarters: {
    en: "Headquarters", fr: "Siège", es: "Sede", ar: "المقر الرئيسي", zh: "总部", ru: "Штаб-квартира",
  },
  office: {
    en: "Office", fr: "Bureau", es: "Oficina", ar: "مكتب", zh: "办公室", ru: "Офис",
  },
} satisfies Record<OrganizationOfficeKind, Record<SupportedLocale, string>>;
