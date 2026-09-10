import type { SupportedLocale, SystemAccessType } from "../domain";

export const accessTypeLabels = {
  read: {
    en: "Read", fr: "Lecture", es: "Lectura", ar: "قراءة", zh: "读取", ru: "Чтение",
  },
  submit: {
    en: "Submit", fr: "Soumission", es: "Envío", ar: "إرسال", zh: "提交", ru: "Отправка",
  },
  partner_sync: {
    en: "Partner sync", fr: "Synchronisation partenaire", es: "Sincronización con socio", ar: "مزامنة شريك", zh: "合作方同步",
    ru: "Синхронизация с партнёром",
  },
} satisfies Record<SystemAccessType, Record<SupportedLocale, string>>;

export const accessMethodLabels = {
  authenticated_observation_upload: {
    en: "Authenticated observation upload", fr: "Téléversement d'observation authentifié",
    es: "Carga autenticada de observaciones", ar: "رفع ملاحظات موثّق", zh: "认证观测上传",
    ru: "Аутентифицированная загрузка наблюдений",
  },
  cloud_table_snapshot: {
    en: "Cloud table snapshot", fr: "Instantané de tables cloud", es: "Instantánea de tablas en la nube", ar: "لقطة جداول سحابية",
    zh: "云端表快照", ru: "Снимок облачных таблиц",
  },
  curated_collaboration: {
    en: "Curated collaboration", fr: "Collaboration organisée", es: "Colaboración curada", ar: "تعاون منسّق", zh: "策展协作",
    ru: "Курируемое сотрудничество",
  },
  download_portal: {
    en: "Download portal", fr: "Portail de téléchargement", es: "Portal de descargas", ar: "بوابة تنزيل", zh: "下载门户",
    ru: "Портал загрузок",
  },
  photo_upload_or_email: {
    en: "Photo upload or email", fr: "Téléversement de photos ou courriel", es: "Carga de fotos o correo electrónico",
    ar: "رفع الصور أو البريد الإلكتروني", zh: "照片上传或电子邮件", ru: "Загрузка фото или email",
  },
  r_package: {
    en: "R package", fr: "Package R", es: "Paquete R", ar: "حزمة R", zh: "R 包", ru: "Пакет R",
  },
  species_page_downloads: {
    en: "Species page downloads", fr: "Téléchargements des pages d'espèces", es: "Descargas de páginas de especies",
    ar: "تنزيلات صفحات الأنواع", zh: "物种页面下载", ru: "Загрузки со страниц видов",
  },
  web_ui: {
    en: "Web UI", fr: "Interface web", es: "Interfaz web", ar: "واجهة ويب", zh: "Web 界面", ru: "Веб-интерфейс",
  },
} satisfies Record<string, Record<SupportedLocale, string>>;
