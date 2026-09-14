import type { SupportedLocale } from "../domain";

export const detailsMessages = {
  "details.from": {
    en: "From", fr: "De", es: "Desde", ar: "من", zh: "起点", ru: "От",
  },
  "details.to": {
    en: "To", fr: "Vers", es: "Hacia", ar: "إلى", zh: "终点", ru: "К",
  },
  "details.closeEntityDetails": {
    en: "Close entity details", fr: "Fermer les détails de l'entité", es: "Cerrar detalles de la entidad",
    ar: "أغلق تفاصيل الكيان", zh: "关闭实体详情", ru: "Закрыть сведения об объекте",
  },
  "details.profile": {
    en: "Profile", fr: "Profil", es: "Perfil", ar: "الملف", zh: "档案", ru: "Профиль",
  },
  "details.organization": {
    en: "Organization", fr: "Organisation", es: "Organización", ar: "المنظمة", zh: "组织", ru: "Организация",
  },
  "details.mission": {
    en: "Mission", fr: "Mission", es: "Misión", ar: "المهمة", zh: "使命", ru: "Миссия",
  },
  "details.established": {
    en: "Established", fr: "Création", es: "Fundación", ar: "تاريخ التأسيس", zh: "成立时间", ru: "Основана",
  },
  "details.organizationScale": {
    en: "Scale", fr: "Taille", es: "Escala", ar: "الحجم", zh: "规模", ru: "Масштаб",
  },
  "details.offices": {
    en: "Office locations", fr: "Implantations", es: "Ubicaciones de oficinas", ar: "مواقع المكاتب", zh: "办公地点", ru: "Расположение офисов",
  },
  "details.review": {
    en: "Review", fr: "Révision", es: "Revisión", ar: "المراجعة", zh: "审核", ru: "Проверка",
  },
  "details.reviewHistory": {
    en: "Revision history", fr: "Historique des révisions", es: "Historial de revisiones", ar: "سجل التنقيحات", zh: "修订历史",
    ru: "История изменений",
  },
  "details.localization": {
    en: "Localization", fr: "Localisation", es: "Localización", ar: "الترجمة المحلية", zh: "本地化", ru: "Локализация",
  },
  "details.state": {
    en: "State", fr: "État", es: "Estado", ar: "الحالة", zh: "状态", ru: "Состояние",
  },
  "details.latestReviewActivity": {
    en: "Latest review activity", fr: "Dernière activité de révision", es: "Última actividad de revisión", ar: "أحدث نشاط مراجعة",
    zh: "最新审核动态", ru: "Последние события проверки",
  },
  "details.viewWholeHistory": {
    en: "View whole history", fr: "Voir tout l’historique", es: "Ver todo el historial", ar: "عرض السجل الكامل", zh: "查看完整历史",
    ru: "Посмотреть всю историю",
  },
  "details.hideHistory": {
    en: "Hide history", fr: "Masquer l’historique", es: "Ocultar historial", ar: "إخفاء السجل", zh: "收起历史", ru: "Скрыть историю",
  },
  "details.reviewDate": {
    en: "Review date", fr: "Date de révision", es: "Fecha de revisión", ar: "تاريخ المراجعة", zh: "审核日期", ru: "Дата проверки",
  },
  "details.dateUnavailable": {
    en: "Date unavailable", fr: "Date indisponible", es: "Fecha no disponible", ar: "التاريخ غير متاح", zh: "日期不可用",
    ru: "Дата недоступна",
  },
  "details.reviewHistoryFailed": {
    en: "Could not load review history.", fr: "Impossible de charger l’historique des révisions.",
    es: "No se pudo cargar el historial de revisiones.", ar: "تعذر تحميل سجل المراجعات.", zh: "无法加载审核历史。",
    ru: "Не удалось загрузить историю проверок.",
  },
  "details.noReviewHistory": {
    en: "No review history recorded.", fr: "Aucun historique de révision enregistré.",
    es: "No hay historial de revisiones registrado.", ar: "لا يوجد سجل مراجعات.", zh: "暂无审核历史。",
    ru: "История проверок отсутствует.",
  },
  "details.data": {
    en: "Data", fr: "Données", es: "Datos", ar: "البيانات", zh: "数据", ru: "Данные",
  },
  "details.readAccess": {
    en: "Read access", fr: "Accès en lecture", es: "Acceso de lectura", ar: "وصول القراءة", zh: "读取访问", ru: "Доступ для чтения",
  },
  "details.writeAccess": {
    en: "Write / contribution access", fr: "Accès en écriture / contribution", es: "Acceso de escritura / contribución",
    ar: "وصول الكتابة / المساهمة", zh: "写入 / 贡献访问", ru: "Доступ для записи / вклада",
  },
  "details.ryu": {
    en: "Data access routes", fr: "Voies d’accès aux données", es: "Rutas de acceso a datos", ar: "مسارات الوصول إلى البيانات", zh: "数据访问路径", ru: "Маршруты доступа к данным",
  },
  "details.usage": {
    en: "Usage", fr: "Usage", es: "Uso", ar: "الاستخدام", zh: "使用情况", ru: "Использование",
  },
  "details.connections": {
    en: "Connections", fr: "Connexions", es: "Conexiones", ar: "الاتصالات", zh: "连接", ru: "Связи",
  },
  "details.userView": {
    en: "User view", fr: "Vue utilisateur", es: "Vista de usuario", ar: "عرض المستخدم", zh: "用户视图", ru: "Пользовательский вид",
  },
  "details.rawFields": {
    en: "Raw fields", fr: "Champs bruts", es: "Campos sin procesar", ar: "الحقول الخام", zh: "原始字段", ru: "Сырые поля",
  },
  "details.rawFieldsFailed": {
    en: "Could not load raw fields.", fr: "Impossible de charger les champs bruts.",
    es: "No se pudieron cargar los campos sin procesar.", ar: "تعذر تحميل الحقول الخام.", zh: "无法加载原始字段。",
    ru: "Не удалось загрузить сырые поля.",
  },
  "details.displayedLocale": {
    en: "Displayed locale", fr: "Langue affichée", es: "Idioma mostrado", ar: "اللغة المعروضة", zh: "显示语言", ru: "Показанный язык",
  },
  "details.reviewState": {
    en: "Review state", fr: "État de révision", es: "Estado de revisión", ar: "حالة المراجعة", zh: "审核状态",
    ru: "Состояние проверки",
  },
  "details.reviewerNote": {
    en: "Reviewer note", fr: "Note du réviseur", es: "Nota del revisor", ar: "ملاحظة المراجع", zh: "审核备注",
    ru: "Заметка проверяющего",
  },
  "details.reviewer": {
    en: "Reviewer", fr: "Réviseur", es: "Revisor", ar: "المراجع", zh: "审核人", ru: "Проверяющий",
  },
  "details.entityType": {
    en: "Entity type", fr: "Type d'entité", es: "Tipo de entidad", ar: "نوع الكيان", zh: "实体类型", ru: "Тип объекта",
  },
  "details.recordDepth": {
    en: "Record depth", fr: "Niveau de fiche", es: "Profundidad del registro", ar: "عمق السجل", zh: "记录深度", ru: "Глубина записи",
  },
  "details.discipline": {
    en: "Disciplines", fr: "Disciplines", es: "Disciplinas", ar: "التخصصات", zh: "学科", ru: "Дисциплины",
  },
  "details.aliases": {
    en: "Aliases", fr: "Noms alternatifs", es: "Nombres alternativos", ar: "الأسماء البديلة", zh: "别名",
    ru: "Альтернативные названия",
  },
  "details.country": {
    en: "Country code", fr: "Code pays", es: "Código de país", ar: "رمز البلد", zh: "国家代码", ru: "Код страны",
  },
  "details.treatyParticipation": {
    en: "Treaty participation", fr: "Participation aux traités", es: "Participación en tratados",
    ar: "المشاركة في المعاهدات", zh: "条约参与情况", ru: "Участие в договорах",
  },
  "details.signatureDate": {
    en: "Signature date", fr: "Date de signature", es: "Fecha de firma", ar: "تاريخ التوقيع", zh: "签署日期", ru: "Дата подписания",
  },
  "details.consentMethod": {
    en: "Consent method", fr: "Mode de consentement", es: "Método de consentimiento", ar: "طريقة التعبير عن الموافقة",
    zh: "同意方式", ru: "Способ выражения согласия",
  },
  "details.depositDate": {
    en: "Deposit date", fr: "Date de dépôt", es: "Fecha de depósito", ar: "تاريخ الإيداع", zh: "交存日期", ru: "Дата депонирования",
  },
  "details.effectiveDate": {
    en: "Effective date", fr: "Date d’effet", es: "Fecha de entrada en vigor", ar: "تاريخ النفاذ", zh: "生效日期", ru: "Дата вступления в силу",
  },
  "details.focalPoint": {
    en: "Official focal point", fr: "Point focal officiel", es: "Punto focal oficial", ar: "جهة الاتصال الرسمية",
    zh: "官方联络点", ru: "Официальный координатор",
  },
  "details.officialDirectory": {
    en: "Official directory", fr: "Répertoire officiel", es: "Directorio oficial", ar: "الدليل الرسمي", zh: "官方名录", ru: "Официальный справочник",
  },
  "details.dataTypes": {
    en: "Data types", fr: "Types de données", es: "Tipos de datos", ar: "أنواع البيانات", zh: "数据类型", ru: "Типы данных",
  },
  "details.formats": {
    en: "Formats", fr: "Formats", es: "Formatos", ar: "الصيغ", zh: "格式", ru: "Форматы",
  },
  "details.standards": {
    en: "Standards", fr: "Normes", es: "Estándares", ar: "المعايير", zh: "标准", ru: "Стандарты",
  },
  "details.operatedBy": {
    en: "Operated by {operator}", fr: "Exploité par {operator}", es: "Operado por {operator}", ar: "يشغّله {operator}",
    zh: "由 {operator} 运营", ru: "Оператор: {operator}",
  },
  "details.operatorNotRecorded": {
    en: "Operator not recorded", fr: "Opérateur non renseigné", es: "Operador no registrado", ar: "المشغّل غير مسجل",
    zh: "未记录运营方", ru: "Оператор не указан",
  },
  "details.mainUrlNotRecorded": {
    en: "Main URL not recorded", fr: "URL principale non renseignée", es: "URL principal no registrada",
    ar: "الرابط الرئيسي غير مسجل", zh: "未记录主 URL", ru: "Основной URL не указан",
  },
  "details.noGalleryItem": {
    en: "No gallery item recorded", fr: "Aucun élément de galerie renseigné", es: "No hay elemento de galería registrado",
    ar: "لا يوجد عنصر معرض مسجل", zh: "未记录图库项目", ru: "Элемент галереи не указан",
  },
  "details.galleryImageAlt": {
    en: "Database sample", fr: "Exemple de base de données", es: "Ejemplo de base de datos", ar: "عينة من قاعدة البيانات",
    zh: "数据库样本", ru: "Образец базы данных",
  },
  "details.previousGalleryImage": {
    en: "Previous gallery image", fr: "Image précédente de la galerie", es: "Imagen anterior de la galería",
    ar: "صورة المعرض السابقة", zh: "上一张图库图片", ru: "Предыдущее изображение галереи",
  },
  "details.nextGalleryImage": {
    en: "Next gallery image", fr: "Image suivante de la galerie", es: "Imagen siguiente de la galería", ar: "صورة المعرض التالية",
    zh: "下一张图库图片", ru: "Следующее изображение галереи",
  },
  "details.reviewUpdateFailed": {
    en: "Review update failed", fr: "Échec de la mise à jour de la révision", es: "Error al actualizar la revisión",
    ar: "فشل تحديث المراجعة", zh: "审核更新失败", ru: "Не удалось обновить проверку",
  },
  "details.saveReview": {
    en: "Save review", fr: "Enregistrer la révision", es: "Guardar revisión", ar: "حفظ المراجعة", zh: "保存审核",
    ru: "Сохранить проверку",
  },
  "details.noReadAccess": {
    en: "No read access path recorded", fr: "Aucun accès en lecture renseigné", es: "No hay ruta de acceso de lectura registrada",
    ar: "لا يوجد مسار وصول للقراءة مسجل", zh: "未记录读取访问路径", ru: "Путь доступа для чтения не указан",
  },
  "details.noWriteAccess": {
    en: "No write or contribution path recorded", fr: "Aucun accès en écriture ou contribution renseigné",
    es: "No hay ruta de escritura o contribución registrada", ar: "لا يوجد مسار كتابة أو مساهمة مسجل", zh: "未记录写入或贡献路径",
    ru: "Путь записи или вклада не указан",
  },
  "details.noDataMetric": {
    en: "No data metric recorded", fr: "Aucune mesure de données renseignée", es: "No hay métricas de datos registradas",
    ar: "لا توجد مقاييس بيانات مسجلة", zh: "尚未记录数据规模指标", ru: "Показатели объёма данных не записаны",
  },
  "details.noUsageMetric": {
    en: "No usage metric recorded", fr: "Aucune métrique d'usage renseignée", es: "No hay métrica de uso registrada",
    ar: "لا توجد مقياس استخدام مسجل", zh: "未记录使用指标", ru: "Метрика использования не указана",
  },
  "details.noRelationship": {
    en: "No relationship recorded", fr: "Aucune relation renseignée", es: "No hay relación registrada", ar: "لا توجد علاقة مسجلة",
    zh: "未记录关系", ru: "Связь не указана",
  },
  "details.priority": {
    en: "Priority {priority}", fr: "Priorité {priority}", es: "Prioridad {priority}", ar: "الأولوية {priority}",
    zh: "优先级 {priority}", ru: "Приоритет {priority}",
  },
  "details.target": {
    en: "Target", fr: "Cible", es: "Destino", ar: "الهدف", zh: "目标", ru: "Цель",
  },
  "details.upstream": {
    en: "Upstream", fr: "Amont", es: "Origen", ar: "المصدر الأعلى", zh: "上游", ru: "Вышестоящий источник",
  },
  "details.format": {
    en: "Format", fr: "Format", es: "Formato", ar: "الصيغة", zh: "格式", ru: "Формат",
  },
  "details.contract": {
    en: "Contract", fr: "Contrat", es: "Contrato", ar: "العقد", zh: "合约", ru: "Контракт",
  },
  "source.id": {
    en: "ID", fr: "ID", es: "ID", ar: "المعرّف", zh: "ID", ru: "ID",
  },
  "source.accessed": {
    en: "Accessed", fr: "Consulté", es: "Consultado", ar: "تاريخ الوصول", zh: "访问日期", ru: "Дата доступа",
  },
  "source.url": {
    en: "URL", fr: "URL", es: "URL", ar: "الرابط", zh: "URL", ru: "URL",
  },
  "source.notLoaded": {
    en: "Source record {id} is not loaded.", fr: "La source {id} n'est pas chargée.", es: "La fuente {id} no está cargada.",
    ar: "سجل المصدر {id} غير محمّل.", zh: "来源记录 {id} 未加载。", ru: "Запись источника {id} не загружена.",
  },
  "details.accessRequirementsUnknown": { en: "Requirements not verified", fr: "Conditions non vérifiées", es: "Requisitos sin verificar", ar: "المتطلبات غير متحقق منها", zh: "要求尚未核实", ru: "Требования не проверены" },
  "details.accessNoRequirements": { en: "No prerequisites", fr: "Aucun prérequis", es: "Sin requisitos previos", ar: "لا متطلبات مسبقة", zh: "无先决条件", ru: "Без предварительных условий" },
} satisfies Record<string, Record<SupportedLocale, string>>;
