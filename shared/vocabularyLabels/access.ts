import type { AccessCost, AccessRequirement, AccessMethod, SupportedLocale, SystemAccessType } from "../domain";

export const accessTypeLabels = {
  read: {
    en: "Read", fr: "Lecture", es: "Lectura", ar: "قراءة", zh: "读取", ru: "Чтение",
  },
  write: {
    en: "Write", fr: "Écriture", es: "Escritura", ar: "كتابة", zh: "写入", ru: "Запись",
  },
} satisfies Record<SystemAccessType, Record<SupportedLocale, string>>;

export const accessMethodLabels = {
  form: { en: "Form", fr: "Formulaire", es: "Formulario", ar: "نموذج", zh: "表单", ru: "Форма" },
  upload: { en: "Upload", fr: "Téléverser", es: "Subir archivos", ar: "رفع ملفات", zh: "上传", ru: "Загрузка" },
  harvest: { en: "Harvesting", fr: "Moissonnage", es: "Recolección automatizada", ar: "حصاد آلي", zh: "自动采集", ru: "Автоматический сбор" },
  browse: { en: "Browse", fr: "Explorer", es: "Explorar", ar: "تصفح", zh: "浏览", ru: "Просмотр" },
  download: { en: "Download", fr: "Télécharger", es: "Descargar", ar: "تنزيل", zh: "下载", ru: "Скачивание" },
  api: { en: "API", fr: "API", es: "API", ar: "واجهة برمجة التطبيقات", zh: "API", ru: "API" },
  software: { en: "Software", fr: "Logiciel", es: "Software", ar: "برمجيات", zh: "软件", ru: "Программное обеспечение" },
  request: { en: "Request", fr: "Sur demande", es: "Previa solicitud", ar: "عند الطلب", zh: "申请", ru: "По запросу" },
} satisfies Record<AccessMethod, Record<SupportedLocale, string>>;

export const accessRequirementLabels = {
  account: { en: "Account required", fr: "Compte requis", es: "Cuenta obligatoria", ar: "يتطلب حسابًا", zh: "需要账户", ru: "Требуется учётная запись" },
  api_key: { en: "API key or token required", fr: "Clé API ou jeton requis", es: "Clave API o token obligatorio", ar: "يتطلب مفتاح API أو رمز وصول", zh: "需要 API 密钥或令牌", ru: "Требуется ключ API или токен" },
  approval: { en: "Approval required", fr: "Approbation requise", es: "Aprobación obligatoria", ar: "يتطلب موافقة", zh: "需要批准", ru: "Требуется одобрение" },
  affiliation: { en: "Eligible affiliation required", fr: "Affiliation admissible requise", es: "Afiliación elegible obligatoria", ar: "يتطلب انتماءً إلى جهة مؤهلة", zh: "需要符合资格的机构归属", ru: "Требуется принадлежность к допущенной организации" },
} satisfies Record<AccessRequirement, Record<SupportedLocale, string>>;

export const accessCostLabels = {
  free: { en: "Free", fr: "Gratuit", es: "Gratuito", ar: "مجاني", zh: "免费", ru: "Бесплатно" },
  paid: { en: "Paid", fr: "Payant", es: "De pago", ar: "مدفوع", zh: "付费", ru: "Платно" },
  mixed: { en: "Free and paid", fr: "Gratuit et payant", es: "Gratuito y de pago", ar: "مجاني ومدفوع", zh: "免费与付费", ru: "Бесплатно и платно" },
  unknown: { en: "Cost not verified", fr: "Coût non vérifié", es: "Coste sin verificar", ar: "التكلفة غير متحقق منها", zh: "费用尚未核实", ru: "Стоимость не проверена" },
} satisfies Record<AccessCost, Record<SupportedLocale, string>>;
