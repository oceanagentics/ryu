import type { SupportedLocale, MetricKey, MetricUnit, MetricPeriod } from "../domain";

export const metricKeyLabels = {
  record_count: {
    en: "Records", fr: "Enregistrements", es: "Registros", ar: "السجلات", zh: "记录", ru: "Записи",
  },
  occurrence_count: {
    en: "Occurrences", fr: "Occurrences", es: "Ocurrencias", ar: "سجلات التواجد", zh: "物种出现记录", ru: "Находки",
  },
  sample_count: {
    en: "Samples", fr: "Échantillons", es: "Muestras", ar: "العينات", zh: "样本", ru: "Образцы",
  },
  sequence_count: {
    en: "Sequences", fr: "Séquences", es: "Secuencias", ar: "التسلسلات", zh: "序列", ru: "Последовательности",
  },
  species_count: {
    en: "Species", fr: "Espèces", es: "Especies", ar: "الأنواع", zh: "物种", ru: "Виды",
  },
  storage_size_bytes: {
    en: "Size", fr: "Taille", es: "Tamaño", ar: "الحجم", zh: "大小", ru: "Размер",
  },
  session_count: {
    en: "Sessions", fr: "Sessions", es: "Sesiones", ar: "الجلسات", zh: "会话", ru: "Сеансы",
  },
  download_count: {
    en: "Downloads", fr: "Téléchargements", es: "Descargas", ar: "التنزيلات", zh: "下载", ru: "Загрузки",
  },
  contributor_count: {
    en: "Contributors", fr: "Contributeurs", es: "Colaboradores", ar: "المساهمون", zh: "贡献者", ru: "Участники",
  },
  citation_count: {
    en: "Citations", fr: "Citations", es: "Citas", ar: "الاستشهادات", zh: "引用", ru: "Цитирования",
  },
  staff_count: {
    en: "Staff", fr: "Personnel", es: "Personal", ar: "الموظفون", zh: "员工", ru: "Персонал",
  },
  member_organization_count: {
    en: "Member organizations", fr: "Organisations membres", es: "Organizaciones miembros", ar: "المنظمات الأعضاء", zh: "成员组织", ru: "Организации-участники",
  },
  member_country_count: {
    en: "Member countries", fr: "Pays membres", es: "Países miembros", ar: "الدول الأعضاء", zh: "成员国", ru: "Страны-участницы",
  },
} satisfies Record<MetricKey, Record<SupportedLocale, string>>;

export const unitLabels = {
  records: {
    en: "records", fr: "enregistrements", es: "registros", ar: "سجلات", zh: "条记录", ru: "записей",
  },
  occurrences: {
    en: "occurrences", fr: "occurrences", es: "ocurrencias", ar: "سجلات تواجد", zh: "条出现记录", ru: "находок",
  },
  samples: {
    en: "samples", fr: "échantillons", es: "muestras", ar: "عينات", zh: "份样本", ru: "образцов",
  },
  sequences: {
    en: "sequences", fr: "séquences", es: "secuencias", ar: "تسلسلات", zh: "条序列", ru: "последовательностей",
  },
  species: {
    en: "species", fr: "espèces", es: "especies", ar: "أنواع", zh: "个物种", ru: "видов",
  },
  bytes: {
    en: "bytes", fr: "octets", es: "bytes", ar: "بايت", zh: "字节", ru: "байт",
  },
  sessions: {
    en: "sessions", fr: "sessions", es: "sesiones", ar: "جلسات", zh: "次会话", ru: "сеансов",
  },
  downloads: {
    en: "downloads", fr: "téléchargements", es: "descargas", ar: "تنزيلات", zh: "次下载", ru: "загрузок",
  },
  contributors: {
    en: "contributors", fr: "contributeurs", es: "colaboradores", ar: "مساهمون", zh: "名贡献者", ru: "участников",
  },
  citations: {
    en: "citations", fr: "citations", es: "citas", ar: "استشهادات", zh: "次引用", ru: "цитирований",
  },
  people: {
    en: "people", fr: "personnes", es: "personas", ar: "أشخاص", zh: "人", ru: "человек",
  },
  organizations: {
    en: "organizations", fr: "organisations", es: "organizaciones", ar: "منظمات", zh: "个组织", ru: "организаций",
  },
  countries: {
    en: "countries", fr: "pays", es: "países", ar: "دول", zh: "个国家", ru: "стран",
  },
} satisfies Record<MetricUnit, Record<SupportedLocale, string>>;

export const metricPeriodLabels = {
  day: {
    en: "per day", fr: "par jour", es: "por día", ar: "يوميًا", zh: "每天", ru: "в день",
  },
  month: {
    en: "per month", fr: "par mois", es: "por mes", ar: "شهريًا", zh: "每月", ru: "в месяц",
  },
  year: {
    en: "per year", fr: "par an", es: "por año", ar: "سنويًا", zh: "每年", ru: "в год",
  },
  cumulative: {
    en: "cumulative", fr: "cumulé", es: "acumulado", ar: "تراكمي", zh: "累计", ru: "накопительно",
  },
} satisfies Record<MetricPeriod, Record<SupportedLocale, string>>;
