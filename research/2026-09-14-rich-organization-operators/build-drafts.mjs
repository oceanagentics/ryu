import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(directory, "canonical-operators.json"), "utf8"));
const locales = ["ar", "zh", "en", "fr", "ru", "es"];
const accessedAt = "2026-09-14";

const tr = (ar, zh, en, fr, ru, es) => ({ ar, zh, en, fr, ru, es });
const localized = (values) => Object.fromEntries(locales.map((locale) => [locale, values[locale]]));

const sourceTitles = {
  about: (name) => tr(`نبذة عن ${name.ar}`, `关于${name.zh}`, `About ${name.en}`, `À propos de ${name.fr}`, `О ${name.ru}`, `Acerca de ${name.es}`),
  contact: (name) => tr(`الاتصال بـ ${name.ar}`, `${name.zh}联系方式`, `Contact ${name.en}`, `Contacter ${name.fr}`, `Контакты ${name.ru}`, `Contacto de ${name.es}`),
  history: (name) => tr(`تاريخ ${name.ar}`, `${name.zh}历史`, `${name.en} history`, `Histoire de ${name.fr}`, `История ${name.ru}`, `Historia de ${name.es}`),
  annual: (name, year) => tr(`التقرير السنوي لـ ${name.ar} لعام ${year}`, `${name.zh}${year}年年度报告`, `${name.en} ${year} annual report`, `Rapport annuel ${year} de ${name.fr}`, `Годовой отчет ${name.ru} за ${year} год`, `Informe anual ${year} de ${name.es}`),
  team: (name) => tr(`فريق ${name.ar}`, `${name.zh}团队`, `${name.en} team`, `Équipe de ${name.fr}`, `Команда ${name.ru}`, `Equipo de ${name.es}`),
};

function source(id, url, title, description) {
  return {
    id,
    url,
    title: localized(title),
    ...(description ? { description: localized(description) } : {}),
    accessedAt,
  };
}

const records = [
  {
    id: "cbd-secretariat",
    url: "https://www.cbd.int/secretariat/",
    text: {
      ar: {
        title: "أمانة اتفاقية التنوع البيولوجي",
        summary: "أمانة معاهدة تدعم اتفاقية التنوع البيولوجي وبروتوكولاتها.",
        description: "تُعِد الأمانة اجتماعات مؤتمر الأطراف وهيئاته الفرعية وتخدمها، وتنسق مع الهيئات الدولية ذات الصلة. كما تدير بوابة غرفة تبادل المعلومات بشأن الحصول وتقاسم المنافع وقاعدتها المركزية في إطار ولاية الأطراف.",
        mission: "دعم أهداف اتفاقية التنوع البيولوجي وتنفيذها من خلال خدمة هيئاتها وتنسيق المعلومات والتعاون.",
      },
      zh: {
        title: "生物多样性公约秘书处",
        summary: "为《生物多样性公约》及其议定书提供支持的条约秘书处。",
        description: "秘书处筹备并服务缔约方大会及其附属机构的会议，并与有关国际机构协调。它还在缔约方授权下管理获取与惠益分享信息交换所门户及其中央数据库。",
        mission: "通过服务《生物多样性公约》各机构以及协调信息与合作，支持《公约》的目标和实施。",
      },
      en: {
        title: "Secretariat of the Convention on Biological Diversity",
        summary: "Treaty secretariat supporting the Convention on Biological Diversity and its protocols.",
        description: "The Secretariat prepares and services meetings of the Conference of the Parties and its subsidiary bodies and coordinates with relevant international bodies. It also administers the Access and Benefit-sharing Clearing-House portal and central database under the Parties’ mandate.",
        mission: "Support the goals and implementation of the Convention on Biological Diversity by servicing its bodies and coordinating information and cooperation.",
      },
      fr: {
        title: "Secrétariat de la Convention sur la diversité biologique",
        summary: "Secrétariat de traité chargé d’appuyer la Convention sur la diversité biologique et ses protocoles.",
        description: "Le Secrétariat prépare et dessert les réunions de la Conférence des Parties et de ses organes subsidiaires, et assure la coordination avec les organismes internationaux compétents. Il administre aussi le portail du Centre d’échange sur l’accès et le partage des avantages et sa base centrale, dans le cadre du mandat des Parties.",
        mission: "Soutenir les objectifs et la mise en œuvre de la Convention sur la diversité biologique en desservant ses organes et en coordonnant l’information et la coopération.",
      },
      ru: {
        title: "Секретариат Конвенции о биологическом разнообразии",
        summary: "Секретариат договора, обеспечивающий работу Конвенции о биологическом разнообразии и ее протоколов.",
        description: "Секретариат готовит и обслуживает совещания Конференции Сторон и ее вспомогательных органов и координирует работу с соответствующими международными организациями. В рамках мандата Сторон он также администрирует портал Механизма посредничества по регулированию доступа и совместному использованию выгод и его центральную базу данных.",
        mission: "Поддерживать цели и осуществление Конвенции о биологическом разнообразии, обслуживая ее органы и координируя информацию и сотрудничество.",
      },
      es: {
        title: "Secretaría del Convenio sobre la Diversidad Biológica",
        summary: "Secretaría de tratado que apoya el Convenio sobre la Diversidad Biológica y sus protocolos.",
        description: "La Secretaría prepara y presta servicios a las reuniones de la Conferencia de las Partes y sus órganos subsidiarios, y coordina con los organismos internacionales pertinentes. También administra el portal del Centro de Intercambio de Información sobre Acceso y Participación en los Beneficios y su base de datos central conforme al mandato de las Partes.",
        mission: "Apoyar los objetivos y la aplicación del Convenio sobre la Diversidad Biológica mediante el servicio a sus órganos y la coordinación de información y cooperación.",
      },
    },
    aliases: ["SCBD", "CBD Secretariat"],
    established: null,
    metrics: [{ id: "staff-current-undated", key: "staff_count", value: 110, observedAt: null, source: "official-role" }],
    offices: [{ id: "montreal", kind: "headquarters", source: "official-role", location: tr("مونتريال، كيبك، كندا", "加拿大魁北克省蒙特利尔", "Montreal, Quebec, Canada", "Montréal, Québec, Canada", "Монреаль, Квебек, Канада", "Montreal, Quebec, Canadá") }],
    gaps: {
      established: tr(
        "توضح المصادر الرسمية الأساس القانوني للأمانة وتاريخ سريان الاتفاقية، لكنها لا تنشر تاريخ تأسيس منفصلًا خاصًا بالأمانة.",
        "官方资料说明了秘书处的法律依据和《公约》的生效日期，但未公布秘书处自身单独的成立日期。",
        "Official sources explain the Secretariat’s legal basis and the Convention’s entry into force, but do not publish a distinct establishment date for the Secretariat itself.",
        "Les sources officielles précisent la base juridique du Secrétariat et l’entrée en vigueur de la Convention, mais ne publient pas de date de création propre au Secrétariat.",
        "Официальные источники описывают правовую основу Секретариата и вступление Конвенции в силу, но не публикуют отдельную дату учреждения самого Секретариата.",
        "Las fuentes oficiales explican la base jurídica de la Secretaría y la entrada en vigor del Convenio, pero no publican una fecha de establecimiento propia de la Secretaría."
      ),
    },
    profileRefs: ["official-role", "abs-modalities", "abs-decision2024"],
    sources: {
      "official-role": source(
        "official-role",
        "https://www.cbd.int/secretariat/role",
        tr("دور أمانة اتفاقية التنوع البيولوجي", "生物多样性公约秘书处的职责", "Role of the CBD Secretariat", "Rôle du Secrétariat de la CDB", "Роль Секретариата КБР", "Función de la Secretaría del CDB"),
        tr(
          "تصف الصفحة الولاية والموقع في مونتريال منذ عام 1996، وتذكر نحو 110 موظفين، بمن فيهم العاملون لفترات قصيرة والاستشاريون؛ ولا تؤرخ هذا العدد.",
          "该页面说明秘书处的职能及其自1996年以来位于蒙特利尔，并称约有110名工作人员，包括短期人员和顾问；该人数未注明统计日期。",
          "The page describes the mandate and Montreal location since 1996 and reports approximately 110 staff, including short-term staff and consultants; it does not date that count.",
          "La page décrit le mandat et l’implantation à Montréal depuis 1996 et indique environ 110 personnes, y compris le personnel de courte durée et les consultants, sans dater ce chiffre.",
          "Страница описывает мандат и размещение в Монреале с 1996 года и указывает примерно 110 сотрудников, включая краткосрочный персонал и консультантов; дата подсчета не приведена.",
          "La página describe el mandato y la ubicación en Montreal desde 1996 e indica aproximadamente 110 personas, incluido personal de corta duración y consultores; no fecha ese recuento."
        )
      ),
    },
  },
  {
    id: "international-seabed-authority",
    url: "https://isa.org.jm/",
    text: {
      ar: { title: "السلطة الدولية لقاع البحار", summary: "منظمة حكومية دولية مستقلة تنظم الأنشطة المتعلقة بالموارد المعدنية في المنطقة الدولية لقاع البحار وتراقبها.", description: "أُنشئت السلطة بموجب اتفاقية الأمم المتحدة لقانون البحار واتفاق تنفيذ الجزء الحادي عشر. وهي تنظم أنشطة الموارد المعدنية في المنطقة لصالح البشرية جمعاء، وتحمي البيئة البحرية من آثار تلك الأنشطة، وتدير قاعدة DeepData.", mission: "تنظيم الأنشطة المتعلقة بالموارد المعدنية في المنطقة ومراقبتها لصالح البشرية جمعاء مع ضمان حماية البيئة البحرية." },
      zh: { title: "国际海底管理局", summary: "负责组织和控制国际海底区域矿产资源活动的自治政府间组织。", description: "国际海底管理局依据《联合国海洋法公约》及其第十一部分执行协定设立。它为全人类利益组织和控制“区域”内的矿产资源活动，保护海洋环境免受这些活动的不利影响，并运营DeepData。", mission: "为全人类利益组织和控制“区域”内的矿产资源活动，同时确保有效保护海洋环境。" },
      en: { title: "International Seabed Authority", summary: "Autonomous intergovernmental organization that organizes and controls mineral-resource activities in the international seabed Area.", description: "ISA was established under the United Nations Convention on the Law of the Sea and its Part XI implementation agreement. It organizes and controls mineral-resource activities in the Area for the benefit of humankind, protects the marine environment from effects of those activities, and operates DeepData.", mission: "Organize and control mineral-resource activities in the Area for the benefit of humankind while ensuring effective protection of the marine environment." },
      fr: { title: "Autorité internationale des fonds marins", summary: "Organisation intergouvernementale autonome qui organise et contrôle les activités relatives aux ressources minérales dans la Zone internationale des fonds marins.", description: "L’Autorité a été créée en vertu de la Convention des Nations Unies sur le droit de la mer et de l’Accord relatif à l’application de sa partie XI. Elle organise et contrôle les activités liées aux ressources minérales dans la Zone au bénéfice de l’humanité, protège le milieu marin contre les effets de ces activités et exploite DeepData.", mission: "Organiser et contrôler les activités relatives aux ressources minérales dans la Zone au bénéfice de l’humanité, tout en assurant une protection efficace du milieu marin." },
      ru: { title: "Международный орган по морскому дну", summary: "Автономная межправительственная организация, которая организует и контролирует деятельность, связанную с минеральными ресурсами международного района морского дна.", description: "Орган учрежден в соответствии с Конвенцией ООН по морскому праву и Соглашением об осуществлении ее Части XI. Он организует и контролирует деятельность с минеральными ресурсами в Районе на благо всего человечества, защищает морскую среду от последствий этой деятельности и эксплуатирует DeepData.", mission: "Организовывать и контролировать деятельность с минеральными ресурсами в Районе на благо человечества, обеспечивая эффективную защиту морской среды." },
      es: { title: "Autoridad Internacional de los Fondos Marinos", summary: "Organización intergubernamental autónoma que organiza y controla las actividades relativas a los recursos minerales en la Zona internacional de los fondos marinos.", description: "La Autoridad fue establecida en virtud de la Convención de las Naciones Unidas sobre el Derecho del Mar y el Acuerdo de aplicación de su Parte XI. Organiza y controla las actividades relativas a los recursos minerales en la Zona en beneficio de la humanidad, protege el medio marino frente a sus efectos y opera DeepData.", mission: "Organizar y controlar las actividades relativas a los recursos minerales en la Zona en beneficio de la humanidad, garantizando la protección efectiva del medio marino." },
    },
    aliases: ["ISA"],
    established: { date: "1994-11-16", source: "official-profile" },
    metrics: [{ id: "member-countries-2026-02", key: "member_country_count", value: 171, observedAt: "2026-02-06", source: "official-profile" }],
    offices: [{ id: "kingston", kind: "headquarters", source: "official-profile", location: tr("كينغستون، جامايكا", "牙买加金斯敦", "Kingston, Jamaica", "Kingston, Jamaïque", "Кингстон, Ямайка", "Kingston, Jamaica") }],
    gaps: {},
    profileRefs: ["official-profile", "about", "odis-news"],
    sources: {
      "official-profile": source(
        "official-profile",
        "https://isa.org.jm/about-isa/",
        sourceTitles.about(tr("السلطة الدولية لقاع البحار", "国际海底管理局", "the International Seabed Authority", "l’Autorité internationale des fonds marins", "Международном органе по морскому дну", "la Autoridad Internacional de los Fondos Marinos")),
        tr(
          "تذكر الصفحة أن السلطة بدأت وجودها في 16 نوفمبر 1994، وأن مقرها في كينغستون، وأنها ضمت في 6 فبراير 2026 عدد 171 دولة عضو والاتحاد الأوروبي؛ يسجل المقياس الدول فقط.",
          "该页面记载管理局于1994年11月16日成立、总部设在金斯敦，并称截至2026年2月6日有171个成员国和欧洲联盟；指标仅记录国家数量。",
          "The page reports that ISA came into existence on 16 November 1994, is headquartered in Kingston, and had 171 Member States plus the European Union on 6 February 2026; the metric records countries only.",
          "La page indique que l’Autorité a vu le jour le 16 novembre 1994, a son siège à Kingston et comptait, au 6 février 2026, 171 États membres plus l’Union européenne ; la mesure ne retient que les pays.",
          "Страница сообщает, что Орган начал существовать 16 ноября 1994 года, имеет штаб-квартиру в Кингстоне и на 6 февраля 2026 года насчитывал 171 государство-член и Европейский союз; показатель учитывает только страны.",
          "La página indica que la Autoridad comenzó a existir el 16 de noviembre de 1994, tiene su sede en Kingston y contaba el 6 de febrero de 2026 con 171 Estados miembros más la Unión Europea; la métrica registra solo países."
        )
      ),
    },
  },
  {
    id: "embl-ebi",
    url: "https://www.ebi.ac.uk/about/",
    text: {
      ar: { title: "المعهد الأوروبي للمعلوماتية الحيوية التابع لـEMBL", summary: "موقع EMBL في المملكة المتحدة ومعهد للمعلوماتية الحيوية يوفر بيانات وخدمات جزيئية مفتوحة.", description: "يوفر EMBL-EBI موارد بيانات وخدمات معلوماتية حيوية متاحة بحرية، ويجري أبحاثًا حاسوبية، ويقدم التدريب وينسق المعلوماتية الحيوية في أوروبا. وهو يشغّل الأرشيف الأوروبي للنيوكليوتيدات من موقعه في هينكستون.", mission: "تمكين علوم الحياة من خلال بيانات وخدمات معلوماتية حيوية مفتوحة، وأبحاث حاسوبية، وتدريب وتعاون دولي." },
      zh: { title: "EMBL欧洲生物信息学研究所", summary: "EMBL在英国的研究所，提供开放的分子数据和生物信息学服务。", description: "EMBL-EBI提供免费开放的数据资源和生物信息学服务，开展计算研究，提供培训，并协调欧洲生物信息学工作。它在欣克斯顿运营欧洲核苷酸档案库。", mission: "通过开放的生物信息学数据与服务、计算研究、培训和国际协作推动生命科学。" },
      en: { title: "EMBL-EBI", summary: "EMBL’s UK site and bioinformatics institute providing open molecular data and services.", description: "EMBL-EBI provides freely available data resources and bioinformatics services, conducts computational research, delivers training and coordinates bioinformatics in Europe. From its Hinxton site it operates the European Nucleotide Archive.", mission: "Advance life science through open bioinformatics data and services, computational research, training and international coordination." },
      fr: { title: "Institut européen de bio-informatique de l’EMBL", summary: "Site britannique de l’EMBL et institut de bio-informatique fournissant des données et services moléculaires ouverts.", description: "L’EMBL-EBI fournit des ressources de données et des services de bio-informatique en libre accès, mène des recherches computationnelles, assure des formations et coordonne la bio-informatique en Europe. Depuis son site de Hinxton, il exploite l’European Nucleotide Archive.", mission: "Faire progresser les sciences de la vie grâce à des données et services bio-informatiques ouverts, à la recherche computationnelle, à la formation et à la coordination internationale." },
      ru: { title: "Европейский институт биоинформатики EMBL", summary: "Британский центр EMBL и институт биоинформатики, предоставляющий открытые молекулярные данные и сервисы.", description: "EMBL-EBI предоставляет свободно доступные ресурсы данных и биоинформатические сервисы, ведет вычислительные исследования, обучает специалистов и координирует биоинформатику в Европе. В Хинкстоне институт эксплуатирует Европейский нуклеотидный архив.", mission: "Развивать науки о жизни с помощью открытых биоинформатических данных и сервисов, вычислительных исследований, обучения и международной координации." },
      es: { title: "Instituto Europeo de Bioinformática del EMBL", summary: "Sede británica del EMBL e instituto de bioinformática que ofrece datos y servicios moleculares abiertos.", description: "EMBL-EBI proporciona recursos de datos y servicios bioinformáticos de acceso libre, realiza investigación computacional, imparte formación y coordina la bioinformática en Europa. Desde su sede de Hinxton opera el Archivo Europeo de Nucleótidos.", mission: "Impulsar las ciencias de la vida mediante datos y servicios bioinformáticos abiertos, investigación computacional, formación y coordinación internacional." },
    },
    aliases: ["EMBL-EBI", "European Bioinformatics Institute"],
    established: { date: "1994", source: "official-profile" },
    metrics: [{ id: "staff-fte-2025", key: "staff_count", value: 646, observedAt: "2025", source: "impact-report-2026" }],
    offices: [{ id: "hinxton", kind: "headquarters", source: "official-contact", location: tr("هينكستون، كامبريدجشير، المملكة المتحدة", "英国剑桥郡欣克斯顿", "Hinxton, Cambridgeshire, United Kingdom", "Hinxton, Cambridgeshire, Royaume-Uni", "Хинкстон, Кембриджшир, Великобритания", "Hinxton, Cambridgeshire, Reino Unido") }],
    gaps: {},
    profileRefs: ["official-profile"],
    sources: {
      "official-profile": source(
        "official-profile",
        "https://www.ebi.ac.uk/about/",
        sourceTitles.about(tr("EMBL-EBI", "EMBL-EBI", "EMBL-EBI", "l’EMBL-EBI", "EMBL-EBI", "EMBL-EBI")),
        tr("تذكر الصفحة أن EMBL-EBI أُنشئ في المملكة المتحدة عام 1994؛ ويسجل التاريخ السنة فقط لأن يوم التأسيس القانوني غير منشور.", "该页面称EMBL-EBI于1994年在英国设立；由于未公布具体法律成立日期，记录仅采用年份。", "The page states that EMBL-EBI was set up in the UK in 1994; the record uses year precision because no legal day is published.", "La page indique que l’EMBL-EBI a été créé au Royaume-Uni en 1994 ; la date est limitée à l’année car aucun jour de création juridique n’est publié.", "Страница сообщает, что EMBL-EBI был создан в Великобритании в 1994 году; указана только точность до года, поскольку юридическая дата по дням не опубликована.", "La página indica que EMBL-EBI se estableció en el Reino Unido en 1994; se registra solo el año porque no se publica un día de constitución jurídica.")
      ),
      "impact-report-2026": source(
        "impact-report-2026",
        "https://www.embl.org/documents/wp-content/uploads/2026/05/EMBL-EBI_impact_report_2026.pdf",
        tr("تقرير الأثر الاقتصادي لـEMBL-EBI لعام 2026", "EMBL-EBI 2026年经济影响报告", "EMBL-EBI economic impact report 2026", "Rapport 2026 sur l’impact économique de l’EMBL-EBI", "Отчет EMBL-EBI об экономическом воздействии за 2026 год", "Informe de impacto económico 2026 de EMBL-EBI"),
        tr("يفيد التقرير بأن EMBL-EBI وظّف 646 موظفًا بما يعادل الدوام الكامل في عام 2025؛ وهو قياس FTE وليس عدد الأشخاص الفعليين.", "报告称EMBL-EBI在2025年雇用了646名全职当量人员；这是FTE口径，并非实际人数。", "The report states that EMBL-EBI employed 646 full-time-equivalent staff in 2025; this is an FTE measure, not a headcount.", "Le rapport indique que l’EMBL-EBI employait 646 équivalents temps plein en 2025 ; il s’agit d’une mesure en ETP, pas d’un nombre de personnes.", "В отчете указано, что в 2025 году EMBL-EBI имел 646 штатных единиц в эквиваленте полной занятости; это FTE, а не численность людей.", "El informe señala que EMBL-EBI empleó 646 equivalentes a tiempo completo en 2025; es una medida FTE, no un recuento de personas.")
      ),
      "official-contact": source(
        "official-contact",
        "https://www.ebi.ac.uk/about/contact/",
        sourceTitles.contact(tr("EMBL-EBI", "EMBL-EBI", "EMBL-EBI", "l’EMBL-EBI", "EMBL-EBI", "EMBL-EBI")),
        tr("تسرد الصفحة العنوان الرسمي الوحيد لـEMBL-EBI في حرم ويلكوم للجينوم في هينكستون.", "该页面列出EMBL-EBI在欣克斯顿Wellcome基因组园区的官方地址。", "The page lists EMBL-EBI’s official address on the Wellcome Genome Campus in Hinxton.", "La page indique l’adresse officielle de l’EMBL-EBI sur le Wellcome Genome Campus à Hinxton.", "Страница приводит официальный адрес EMBL-EBI в кампусе Wellcome Genome Campus в Хинкстоне.", "La página indica la dirección oficial de EMBL-EBI en el Wellcome Genome Campus de Hinxton.")
      ),
    },
  },
  {
    id: "q-quatics",
    url: "https://www.q-quatics.org/",
    text: {
      ar: { title: "Quantitative Aquatics, Inc. (Q-quatics)", summary: "منظمة فلبينية غير ربحية تطور وتحافظ على نظم معلومات عالمية عن التنوع البيولوجي ومصايد الأسماك المائية.", description: "تدعم Q-quatics تجميع بيانات الموارد المائية الحية ونشرها مجانًا، وتطور أدوات للبحث والإدارة والحفظ. وهي تستضيف وتدير FishBase وSeaLifeBase وAquaMaps تحت التوجيه العلمي لاتحاد FishBase.", mission: "صيانة وتطوير شبكة مفتوحة من نظم معلومات التنوع البيولوجي ومصايد الأسماك لجميع أشكال الحياة المائية." },
      zh: { title: "Quantitative Aquatics, Inc.（Q-quatics）", summary: "一家菲律宾非营利机构，开发并维护全球水生生物多样性和渔业信息系统。", description: "Q-quatics支持水生生物资源数据的汇集与免费传播，并开发用于研究、管理和保护的工具。它在FishBase联盟的科学指导下托管和管理FishBase、SeaLifeBase和AquaMaps。", mission: "维护和发展一个面向所有水生生物的开放生物多样性与渔业信息系统网络。" },
      en: { title: "Quantitative Aquatics, Inc. (Q-quatics)", summary: "Philippine nonprofit that develops and maintains global aquatic biodiversity and fisheries information systems.", description: "Q-quatics supports the assembly and free dissemination of data on living aquatic resources and develops tools for research, management and conservation. It hosts and manages FishBase, SeaLifeBase and AquaMaps under the scientific guidance of the FishBase Consortium.", mission: "Maintain and develop an open network of biodiversity and fisheries information systems covering all aquatic life." },
      fr: { title: "Quantitative Aquatics, Inc. (Q-quatics)", summary: "Organisation philippine à but non lucratif qui développe et maintient des systèmes mondiaux d’information sur la biodiversité aquatique et les pêches.", description: "Q-quatics soutient l’assemblage et la diffusion gratuite de données sur les ressources aquatiques vivantes et développe des outils pour la recherche, la gestion et la conservation. Elle héberge et gère FishBase, SeaLifeBase et AquaMaps sous la direction scientifique du FishBase Consortium.", mission: "Maintenir et développer un réseau ouvert de systèmes d’information sur la biodiversité et les pêches couvrant toute la vie aquatique." },
      ru: { title: "Quantitative Aquatics, Inc. (Q-quatics)", summary: "Филиппинская некоммерческая организация, развивающая и поддерживающая глобальные информационные системы по водному биоразнообразию и рыболовству.", description: "Q-quatics поддерживает сбор и бесплатное распространение данных о живых водных ресурсах и разрабатывает инструменты для исследований, управления и охраны природы. Под научным руководством консорциума FishBase организация размещает и управляет FishBase, SeaLifeBase и AquaMaps.", mission: "Поддерживать и развивать открытую сеть информационных систем по биоразнообразию и рыболовству, охватывающую всю водную жизнь." },
      es: { title: "Quantitative Aquatics, Inc. (Q-quatics)", summary: "Organización filipina sin fines de lucro que desarrolla y mantiene sistemas mundiales de información sobre biodiversidad acuática y pesca.", description: "Q-quatics apoya la recopilación y difusión gratuita de datos sobre recursos acuáticos vivos y desarrolla herramientas para investigación, gestión y conservación. Aloja y gestiona FishBase, SeaLifeBase y AquaMaps bajo la orientación científica del Consorcio FishBase.", mission: "Mantener y desarrollar una red abierta de sistemas de información sobre biodiversidad y pesca que abarque toda la vida acuática." },
    },
    aliases: ["Q-quatics", "Qq"],
    established: { date: "2017-02-09", source: "official-profile" },
    metrics: [{ id: "regular-staff-2023", key: "staff_count", value: 25, observedAt: "2023", source: "annual-report-2023" }],
    offices: [{ id: "los-banos", kind: "headquarters", source: "official-contact", location: tr("لوس بانيوس، لاغونا، الفلبين", "菲律宾拉古纳省洛斯巴尼奥斯", "Los Baños, Laguna, Philippines", "Los Baños, Laguna, Philippines", "Лос-Баньос, Лагуна, Филиппины", "Los Baños, Laguna, Filipinas") }],
    gaps: {},
    profileRefs: ["official-profile"],
    sources: {
      "official-profile": source(
        "official-profile",
        "https://www.q-quatics.org/about-us/",
        sourceTitles.about(tr("Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics")),
        tr("تذكر الصفحة أن Q-quatics منظمة فلبينية غير ربحية مسجلة في 9 فبراير 2017؛ وهذا هو تاريخ التأسيس القانوني المستخدم.", "该页面称Q-quatics是菲律宾非营利机构，并于2017年2月9日完成证券交易委员会注册；记录采用该法律成立日期。", "The page identifies Q-quatics as a Philippine nonprofit registered with the Securities and Exchange Commission on 9 February 2017; that legal registration date is used.", "La page présente Q-quatics comme une organisation philippine à but non lucratif enregistrée auprès de la Securities and Exchange Commission le 9 février 2017 ; cette date d’enregistrement juridique est retenue.", "Страница называет Q-quatics филиппинской некоммерческой организацией, зарегистрированной Комиссией по ценным бумагам и биржам 9 февраля 2017 года; использована эта дата юридической регистрации.", "La página identifica a Q-quatics como una entidad filipina sin fines de lucro registrada ante la Comisión de Bolsa y Valores el 9 de febrero de 2017; se usa esa fecha de registro jurídico.")
      ),
      "annual-report-2023": source(
        "annual-report-2023",
        "https://www.q-quatics.org/wp-content/uploads/2025/05/Q-quatics_Annual_Report_2023.pdf",
        sourceTitles.annual(tr("Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics"), "2023"),
        tr("يفيد التقرير بأن الفريق ضم 25 موظفًا منتظمًا في عام 2023؛ ويذكر استشاريًا بصورة منفصلة ولا يضاف إلى المقياس.", "报告称2023年团队有25名正式员工；另行提到的一名顾问未计入指标。", "The report states that the team comprised 25 regular staff in 2023; a consultant mentioned separately is not added to the metric.", "Le rapport indique que l’équipe comptait 25 membres réguliers en 2023 ; un consultant mentionné séparément n’est pas ajouté à la mesure.", "В отчете указано, что в 2023 году команда состояла из 25 штатных сотрудников; отдельно упомянутый консультант в показатель не включен.", "El informe indica que el equipo contaba con 25 empleados regulares en 2023; un consultor mencionado por separado no se suma a la métrica.")
      ),
      "official-contact": source(
        "official-contact",
        "https://www.q-quatics.org/contact-us/",
        sourceTitles.contact(tr("Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics", "Q-quatics")),
        tr("تسرد صفحة الاتصال عنوان Q-quatics في Khush Hall بمدينة لوس بانيوس في لاغونا.", "联系页面列出Q-quatics位于拉古纳省洛斯巴尼奥斯Khush Hall的地址。", "The contact page lists Q-quatics at Khush Hall in Los Baños, Laguna.", "La page de contact situe Q-quatics à Khush Hall, à Los Baños dans la province de Laguna.", "На странице контактов указан адрес Q-quatics в Khush Hall, Лос-Баньос, провинция Лагуна.", "La página de contacto sitúa a Q-quatics en Khush Hall, Los Baños, Laguna.")
      ),
    },
  },
  {
    id: "swedish-museum-of-natural-history",
    url: "https://www.nrm.se/engelska/in-english/about-us",
    text: {
      ar: { title: "المتحف السويدي للتاريخ الطبيعي", summary: "وكالة حكومية ومؤسسة بحثية ومتحف وطني للتاريخ الطبيعي في ستوكهولم.", description: "يجمع المتحف بين البحث العلمي وإدارة المجموعات والمعارض والتعليم العام، وهو مسؤول وطنيًا عن مجال التاريخ الطبيعي في السويد. ويستضيف فريق FishBase Sweden ويوفر إحدى خدمات FishBase.", mission: "تعزيز الاهتمام والمعرفة والبحث في الكون والأرض والحياة والتنوع البيولوجي والبيئة الطبيعية.", },
      zh: { title: "瑞典自然历史博物馆", summary: "位于斯德哥尔摩的政府机构、研究机构和国家级自然历史博物馆。", description: "该馆结合科学研究、藏品管理、展览和公众教育，并承担瑞典自然历史领域的国家职责。它是FishBase Sweden团队所在地，并提供FishBase的一项服务。", mission: "促进公众对宇宙、地球、生命、生物多样性和自然环境的兴趣、知识与研究。" },
      en: { title: "Swedish Museum of Natural History", summary: "Government agency, research institution and national natural-history museum in Stockholm.", description: "The museum combines scientific research, collection stewardship, exhibitions and public education and has national responsibility for natural history in Sweden. It hosts the FishBase Sweden team and serves a FishBase instance.", mission: "Promote interest, knowledge and research concerning the universe, Earth, living organisms, biodiversity and the natural environment." },
      fr: { title: "Muséum suédois d’histoire naturelle", summary: "Agence publique, établissement de recherche et muséum national d’histoire naturelle à Stockholm.", description: "Le Muséum associe recherche scientifique, gestion des collections, expositions et éducation du public, et assume une responsabilité nationale pour l’histoire naturelle en Suède. Il accueille l’équipe FishBase Sweden et dessert une instance de FishBase.", mission: "Promouvoir l’intérêt, les connaissances et la recherche concernant l’univers, la Terre, le vivant, la biodiversité et l’environnement naturel." },
      ru: { title: "Шведский музей естественной истории", summary: "Государственное ведомство, исследовательское учреждение и национальный музей естественной истории в Стокгольме.", description: "Музей объединяет научные исследования, хранение коллекций, выставки и просвещение и несет национальную ответственность за естественную историю в Швеции. Здесь работает команда FishBase Sweden и обслуживается один из экземпляров FishBase.", mission: "Развивать интерес, знания и исследования Вселенной, Земли, живых организмов, биоразнообразия и природной среды." },
      es: { title: "Museo Sueco de Historia Natural", summary: "Agencia pública, institución de investigación y museo nacional de historia natural en Estocolmo.", description: "El museo combina investigación científica, custodia de colecciones, exposiciones y educación pública, y tiene responsabilidad nacional sobre la historia natural en Suecia. Alberga el equipo de FishBase Sweden y sirve una instancia de FishBase.", mission: "Promover el interés, el conocimiento y la investigación sobre el universo, la Tierra, los seres vivos, la biodiversidad y el medio natural." },
    },
    aliases: ["NRM", "Naturhistoriska riksmuseet"],
    established: { date: "1819", source: "strategic-plan" },
    metrics: [{ id: "staff-2025-12-31", key: "staff_count", value: 283, observedAt: "2025-12-31", source: "annual-report-2025" }],
    offices: [{ id: "stockholm", kind: "headquarters", source: "official-contact", location: tr("فريسكاتي، ستوكهولم، السويد", "瑞典斯德哥尔摩Frescati", "Frescati, Stockholm, Sweden", "Frescati, Stockholm, Suède", "Фрескати, Стокгольм, Швеция", "Frescati, Estocolmo, Suecia") }],
    gaps: {},
    profileRefs: ["official-profile", "identity"],
    sources: {
      "official-profile": source("official-profile", "https://www.nrm.se/engelska/in-english/about-us/vision-and-tasks", tr("رؤية المتحف السويدي للتاريخ الطبيعي ومهامه", "瑞典自然历史博物馆的愿景与任务", "Swedish Museum of Natural History vision and tasks", "Vision et missions du Muséum suédois d’histoire naturelle", "Видение и задачи Шведского музея естественной истории", "Visión y funciones del Museo Sueco de Historia Natural")),
      "strategic-plan": source(
        "strategic-plan",
        "https://www.nrm.se/download/18.49de620c18bcc06edc389d5/1700312133221/strategic-plan-2023-2030-swedish-museum-natural-history.pdf",
        tr("الخطة الاستراتيجية للمتحف السويدي للتاريخ الطبيعي 2023–2030", "瑞典自然历史博物馆2023—2030年战略计划", "Swedish Museum of Natural History strategic plan 2023–2030", "Plan stratégique 2023–2030 du Muséum suédois d’histoire naturelle", "Стратегический план Шведского музея естественной истории на 2023–2030 годы", "Plan estratégico 2023–2030 del Museo Sueco de Historia Natural"),
        tr("تذكر الخطة أن المتحف تأسس عام 1819 وأن جذور مجموعاته أقدم؛ يسجل التاريخ تأسيس المتحف لا تاريخ المجموعات السابقة.", "该计划说明博物馆成立于1819年，而其藏品源流更早；记录的是博物馆本身的成立年份，而非前身藏品的年代。", "The plan states that the museum was founded in 1819 and that its collections have older roots; the date records the museum’s founding, not those predecessor collections.", "Le plan indique que le Muséum a été fondé en 1819 et que ses collections ont des origines plus anciennes ; la date retenue est celle du Muséum, non celle des collections antérieures.", "В плане указано, что музей основан в 1819 году, а его коллекции имеют более ранние корни; дата относится к музею, а не к коллекциям-предшественникам.", "El plan indica que el museo fue fundado en 1819 y que sus colecciones tienen raíces anteriores; la fecha corresponde al museo, no a esas colecciones predecesoras.")
      ),
      "annual-report-2025": source(
        "annual-report-2025",
        "https://www.nrm.se/download/18.4dd0638619c47e72d5963880/1771586822521/arsredovisning-2025-naturhistoriska-riksmuseet.pdf",
        sourceTitles.annual(tr("المتحف السويدي للتاريخ الطبيعي", "瑞典自然历史博物馆", "Swedish Museum of Natural History", "Muséum suédois d’histoire naturelle", "Шведского музея естественной истории", "Museo Sueco de Historia Natural"), "2025"),
        tr("يسجل التقرير 283 موظفًا في الوكالة في 31 ديسمبر 2025، منهم 211 دائمًا و72 بعقود محددة المدة.", "报告记载截至2025年12月31日该机构共有283名员工，其中211名为长期雇员、72名为定期雇员。", "The report records 283 employees at the agency on 31 December 2025, comprising 211 permanent and 72 fixed-term employees.", "Le rapport comptabilise 283 personnes employées par l’agence au 31 décembre 2025, dont 211 permanentes et 72 sous contrat à durée déterminée.", "В отчете указано 283 сотрудника ведомства на 31 декабря 2025 года: 211 постоянных и 72 срочных сотрудника.", "El informe registra 283 empleados en la agencia a 31 de diciembre de 2025: 211 permanentes y 72 temporales.")
      ),
      "official-contact": source(
        "official-contact",
        "https://www.nrm.se/engelska/in-english/about-us/contact-us",
        sourceTitles.contact(tr("المتحف السويدي للتاريخ الطبيعي", "瑞典自然历史博物馆", "the Swedish Museum of Natural History", "le Muséum suédois d’histoire naturelle", "Шведского музея естественной истории", "el Museo Sueco de Historia Natural")),
        tr("تسرد الصفحة عنوان الزيارة الرسمي في Frescativägen 40 بستوكهولم.", "该页面列出位于斯德哥尔摩Frescativägen 40的官方访问地址。", "The page lists the official visiting address at Frescativägen 40 in Stockholm.", "La page indique l’adresse officielle de visite, Frescativägen 40 à Stockholm.", "На странице указан официальный адрес для посетителей: Frescativägen 40, Стокгольм.", "La página indica la dirección oficial de visita en Frescativägen 40, Estocolmo.")
      ),
    },
  },
  {
    id: "global-fishing-watch-operator",
    url: "https://globalfishingwatch.org/",
    text: {
      ar: { title: "Global Fishing Watch, Inc.", summary: "منظمة دولية مستقلة غير ربحية تعمل على تعزيز حوكمة المحيطات من خلال شفافية النشاط البشري في البحر.", description: "تحول Global Fishing Watch بيانات الأقمار الصناعية والسفن إلى خرائط وبيانات وتحليلات عامة مجانية لدعم العلوم والسياسات وإدارة المحيطات. وهي تملك منصة Global Fishing Watch وتشغّل منتجاتها وخدماتها وتشارك في شراكات الشفافية في مصايد الأسماك.", mission: "تعزيز حوكمة المحيطات بزيادة شفافية النشاط البشري في البحر وإتاحة المعرفة الناتجة للجمهور مجانًا." },
      zh: { title: "Global Fishing Watch, Inc.", summary: "通过提高海上人类活动透明度来推进海洋治理的独立国际非营利组织。", description: "Global Fishing Watch将卫星和船舶数据转化为免费公开的地图、数据和分析，以支持科学、政策和海洋管理。该机构拥有并运营Global Fishing Watch平台及其产品和服务，并参与渔业透明度合作。", mission: "通过提高海上人类活动透明度并免费公开由此产生的知识，推进海洋治理。" },
      en: { title: "Global Fishing Watch, Inc.", summary: "Independent international nonprofit advancing ocean governance through transparency of human activity at sea.", description: "Global Fishing Watch turns satellite and vessel data into free public maps, data and analysis that support science, policy and ocean management. The organization owns and operates the Global Fishing Watch platform and its products and services and participates in fisheries-transparency partnerships.", mission: "Advance ocean governance by increasing transparency of human activity at sea and making the resulting knowledge freely available." },
      fr: { title: "Global Fishing Watch, Inc.", summary: "Organisation internationale indépendante à but non lucratif qui fait progresser la gouvernance de l’océan par la transparence des activités humaines en mer.", description: "Global Fishing Watch transforme des données satellitaires et de navigation en cartes, données et analyses publiques et gratuites au service de la science, des politiques et de la gestion de l’océan. L’organisation possède et exploite la plateforme Global Fishing Watch ainsi que ses produits et services, et participe à des partenariats de transparence des pêches.", mission: "Faire progresser la gouvernance de l’océan en renforçant la transparence des activités humaines en mer et en rendant les connaissances produites librement accessibles." },
      ru: { title: "Global Fishing Watch, Inc.", summary: "Независимая международная некоммерческая организация, развивающая управление океаном через прозрачность деятельности человека в море.", description: "Global Fishing Watch преобразует спутниковые и судовые данные в бесплатные общедоступные карты, данные и аналитические материалы для науки, политики и управления океаном. Организация владеет платформой Global Fishing Watch, эксплуатирует ее продукты и сервисы и участвует в партнерствах по прозрачности рыболовства.", mission: "Совершенствовать управление океаном, повышая прозрачность деятельности человека в море и обеспечивая свободный доступ к полученным знаниям." },
      es: { title: "Global Fishing Watch, Inc.", summary: "Organización internacional independiente sin fines de lucro que impulsa la gobernanza oceánica mediante la transparencia de la actividad humana en el mar.", description: "Global Fishing Watch convierte datos satelitales y de embarcaciones en mapas, datos y análisis públicos y gratuitos que apoyan la ciencia, las políticas y la gestión oceánica. La organización posee y opera la plataforma Global Fishing Watch, sus productos y servicios, y participa en alianzas de transparencia pesquera.", mission: "Impulsar la gobernanza oceánica aumentando la transparencia de la actividad humana en el mar y haciendo libremente accesible el conocimiento resultante." },
    },
    aliases: ["GFW", "Global Fishing Watch"],
    established: { date: "2017-06", source: "official-profile" },
    metrics: [{ id: "staff-2023", key: "staff_count", value: 90, observedAt: "2023", source: "annual-report-2023" }],
    offices: [{ id: "washington-dc", kind: "headquarters", source: "official-address", location: tr("واشنطن العاصمة، الولايات المتحدة", "美国华盛顿哥伦比亚特区", "Washington, D.C., United States", "Washington, D.C., États-Unis", "Вашингтон, округ Колумбия, США", "Washington, D. C., Estados Unidos") }],
    gaps: {},
    profileRefs: ["official-profile", "annual", "terms"],
    sources: {
      "official-profile": source(
        "official-profile",
        "https://globalfishingwatch.org/a-vision-for-our-global-ocean/",
        tr("رؤية Global Fishing Watch للمحيط العالمي", "Global Fishing Watch的全球海洋愿景", "Global Fishing Watch: A vision for our global ocean", "Global Fishing Watch : une vision pour notre océan mondial", "Global Fishing Watch: видение мирового океана", "Global Fishing Watch: una visión para nuestro océano global"),
        tr("تفرق الصفحة بين تأسيس المبادرة في 2015 وإنشاء المنظمة الدولية المستقلة غير الربحية في يونيو 2017؛ يستخدم السجل تاريخ المنظمة المستقلة.", "该页面区分了2015年创立的合作项目与2017年6月成立的独立国际非营利组织；记录采用后者日期。", "The page distinguishes the collaboration founded in 2015 from establishment of the independent international nonprofit in June 2017; the record uses the latter date.", "La page distingue la collaboration lancée en 2015 de la création de l’organisation internationale indépendante à but non lucratif en juin 2017 ; la fiche retient cette dernière date.", "Страница различает сотрудничество, начатое в 2015 году, и учреждение независимой международной некоммерческой организации в июне 2017 года; в записи используется последняя дата.", "La página distingue la colaboración fundada en 2015 del establecimiento de la organización internacional independiente sin fines de lucro en junio de 2017; el registro usa esta última fecha.")
      ),
      "annual-report-2023": source(
        "annual-report-2023",
        "https://globalfishingwatch.org/annual-report-2023/",
        sourceTitles.annual(tr("Global Fishing Watch", "Global Fishing Watch", "Global Fishing Watch", "Global Fishing Watch", "Global Fishing Watch", "Global Fishing Watch"), "2023"),
        tr("يصف التقرير فريقًا يضم قرابة 90 موظفًا في 27 دولة في عام 2023؛ تسجل القيمة الرقم التقريبي المنشور ولا تعني عددًا دقيقًا.", "报告称2023年团队在27个国家拥有近90名员工；指标记录公布的近似值，并非精确人数。", "The report describes nearly 90 staff across 27 countries in 2023; the value records the published approximation, not an exact headcount.", "Le rapport décrit près de 90 personnes réparties dans 27 pays en 2023 ; la valeur reprend l’approximation publiée et non un effectif exact.", "В отчете говорится о почти 90 сотрудниках в 27 странах в 2023 году; значение отражает опубликованное приближение, а не точную численность.", "El informe describe cerca de 90 empleados en 27 países en 2023; el valor recoge la aproximación publicada, no un recuento exacto.")
      ),
      "official-address": source(
        "official-address",
        "https://globalfishingwatch.org/our-apis/documentation/docs/license-rate-limits",
        tr("شروط ترخيص Global Fishing Watch وعنوانها", "Global Fishing Watch许可条款与地址", "Global Fishing Watch licence terms and address", "Conditions de licence et adresse de Global Fishing Watch", "Лицензионные условия и адрес Global Fishing Watch", "Condiciones de licencia y dirección de Global Fishing Watch"),
        tr("تعرض الصفحة العنوان المؤسسي لـGlobal Fishing Watch في واشنطن العاصمة؛ ولا تُعامل أماكن عمل الموظفين الموزعين كفروع.", "该页面列出Global Fishing Watch在华盛顿特区的机构地址；分布式员工的工作地点不计为办事处。", "The page gives Global Fishing Watch’s organizational address in Washington, D.C.; locations of distributed staff are not treated as offices.", "La page indique l’adresse institutionnelle de Global Fishing Watch à Washington, D.C. ; les lieux de travail du personnel distribué ne sont pas considérés comme des bureaux.", "На странице указан адрес организации Global Fishing Watch в Вашингтоне; места работы распределенных сотрудников не считаются офисами.", "La página proporciona la dirección institucional de Global Fishing Watch en Washington, D. C.; las ubicaciones del personal distribuido no se consideran oficinas.")
      ),
    },
  },
  {
    id: "ioc-unesco-iode",
    url: "https://iode.org/",
    text: {
      ar: { title: "التبادل الدولي للبيانات والمعلومات الأوقيانوغرافية التابع لليونسكو/اللجنة الأوقيانوغرافية الحكومية الدولية", summary: "برنامج اللجنة الأوقيانوغرافية الحكومية الدولية لتبادل البيانات والمعلومات البحرية بين الدول الأعضاء.", description: "ينسق برنامج IODE شبكة عالمية من المراكز والوحدات الوطنية والمنتسبة التي تدير بيانات المحيطات ومعلوماتها وتتيحها. ومن مكتب مشروع اللجنة الأوقيانوغرافية الحكومية الدولية في أوستنده، يدعم البرنامج منتجات وخدمات من بينها OBIS وODIS.", mission: "تعزيز البحث البحري والتنمية عبر تسهيل تبادل البيانات والمعلومات الأوقيانوغرافية وتلبية احتياجات المستخدمين." },
      zh: { title: "联合国教科文组织政府间海洋学委员会国际海洋学数据与信息交换计划", summary: "政府间海洋学委员会促进成员国之间海洋数据和信息交换的计划。", description: "IODE协调由国家海洋数据中心及相关数据和信息单位组成的全球网络，管理并提供海洋数据与信息。该计划从奥斯坦德的政府间海洋学委员会项目办公室支持包括OBIS和ODIS在内的产品与服务。", mission: "通过促进海洋学数据和信息交换并满足用户需求，推动海洋研究与发展。" },
      en: { title: "IOC-UNESCO International Oceanographic Data and Information Exchange (IODE)", summary: "IOC programme for exchanging ocean data and information among participating Member States.", description: "IODE coordinates a global network of national and associate centres and units that manage and make ocean data and information available. From the IOC Project Office in Ostend, the programme supports products and services that include OBIS and ODIS.", mission: "Enhance marine research and development by facilitating the exchange of oceanographic data and information and meeting user needs." },
      fr: { title: "Échange international des données et de l’information océanographiques de la COI-UNESCO (IODE)", summary: "Programme de la COI consacré à l’échange de données et d’informations océaniques entre les États membres participants.", description: "L’IODE coordonne un réseau mondial de centres et d’unités nationaux et associés qui gèrent et mettent à disposition les données et informations océaniques. Depuis le Bureau de projet de la COI à Ostende, le programme soutient des produits et services dont l’OBIS et l’ODIS.", mission: "Renforcer la recherche et le développement marins en facilitant l’échange de données et d’informations océanographiques et en répondant aux besoins des utilisateurs." },
      ru: { title: "Международный обмен океанографическими данными и информацией МОК-ЮНЕСКО (IODE)", summary: "Программа МОК по обмену океанскими данными и информацией между участвующими государствами-членами.", description: "IODE координирует глобальную сеть национальных и ассоциированных центров и подразделений, которые управляют океанскими данными и информацией и предоставляют к ним доступ. Из Проектного офиса МОК в Остенде программа поддерживает продукты и сервисы, включая OBIS и ODIS.", mission: "Содействовать морским исследованиям и развитию, облегчая обмен океанографическими данными и информацией и удовлетворяя потребности пользователей." },
      es: { title: "Intercambio Internacional de Datos e Información Oceanográficos de la COI-UNESCO (IODE)", summary: "Programa de la COI para intercambiar datos e información oceánicos entre los Estados miembros participantes.", description: "IODE coordina una red mundial de centros y unidades nacionales y asociados que gestionan y ponen a disposición datos e información oceánicos. Desde la Oficina de Proyectos de la COI en Ostende, el programa apoya productos y servicios que incluyen OBIS y ODIS.", mission: "Mejorar la investigación y el desarrollo marinos facilitando el intercambio de datos e información oceanográficos y atendiendo las necesidades de los usuarios." },
    },
    aliases: ["IODE", "International Oceanographic Data and Information Exchange"],
    established: { date: "1961", source: "official-profile" },
    metrics: [],
    offices: [{ id: "ostend-project-office", kind: "office", source: "official-contact", location: tr("حرم InnovOcean، أوستنده، بلجيكا", "比利时奥斯坦德InnovOcean园区", "InnovOcean Campus, Ostend, Belgium", "Campus InnovOcean, Ostende, Belgique", "Кампус InnovOcean, Остенде, Бельгия", "Campus InnovOcean, Ostende, Bélgica") }],
    gaps: {
      scale: tr(
        "تنشر IODE أعدادًا منفصلة لأنواع مختلفة من مراكز البيانات والوحدات، ولا تنشر رقمًا واحدًا قابلًا للمقارنة للموظفين أو المنظمات الأعضاء.",
        "IODE分别公布不同类型的数据中心和单位数量，但没有发布可比的统一员工数或成员组织数。",
        "IODE publishes separate counts for unlike categories of data centres and units, not one comparable staff or member-organization total.",
        "L’IODE publie des décomptes séparés pour des catégories différentes de centres et d’unités, et non un total comparable de personnel ou d’organisations membres.",
        "IODE публикует отдельные числа для разных категорий центров и подразделений, но не единый сопоставимый итог по персоналу или организациям-участникам.",
        "IODE publica recuentos separados para categorías distintas de centros y unidades, no un total comparable de personal u organizaciones miembros."
      ),
    },
    profileRefs: ["official-profile"],
    sources: {
      "official-profile": source(
        "official-profile",
        "https://iode.org/about/",
        sourceTitles.about(tr("برنامج IODE", "IODE计划", "the IODE programme", "le programme IODE", "программе IODE", "el programa IODE")),
        tr("تذكر الصفحة أن IODE أُنشئ في عام 1961؛ ولا تحدد يومًا أو شهرًا، لذلك يسجل التاريخ بالسنة فقط.", "该页面称IODE成立于1961年；未注明月份或日期，因此记录仅采用年份。", "The page states that IODE was established in 1961; no month or day is given, so the date uses year precision.", "La page indique que l’IODE a été créé en 1961 ; aucun mois ni jour n’étant précisé, la date est limitée à l’année.", "Страница сообщает, что IODE создан в 1961 году; месяц и день не указаны, поэтому дата приведена с точностью до года.", "La página indica que IODE se estableció en 1961; no se especifican mes ni día, por lo que la fecha usa precisión anual.")
      ),
      "official-contact": source(
        "official-contact",
        "https://iode.org/contact/",
        sourceTitles.contact(tr("IODE", "IODE", "IODE", "l’IODE", "IODE", "IODE")),
        tr("تحدد الصفحة مكتب مشروع اللجنة الأوقيانوغرافية الحكومية الدولية لـIODE في حرم InnovOcean بأوستنده؛ ويسجل كمكتب برنامج لا كمقر مستقل لليونسكو.", "该页面将IOC/IODE项目办公室列在奥斯坦德InnovOcean园区；记录将其作为计划办事处，而非联合国教科文组织的独立总部。", "The page locates the IOC Project Office for IODE at the InnovOcean Campus in Ostend; it is recorded as a programme office, not an independent UNESCO headquarters.", "La page situe le Bureau de projet de la COI pour l’IODE sur le campus InnovOcean à Ostende ; il est enregistré comme bureau de programme, non comme siège autonome de l’UNESCO.", "Страница размещает Проектный офис МОК для IODE в кампусе InnovOcean в Остенде; он записан как офис программы, а не самостоятельная штаб-квартира ЮНЕСКО.", "La página sitúa la Oficina de Proyectos de la COI para IODE en el campus InnovOcean de Ostende; se registra como oficina del programa, no como sede independiente de la UNESCO.")
      ),
    },
  },
  {
    id: "unep-wcmc",
    url: "https://www.unep-wcmc.org/",
    text: {
      ar: { title: "المركز العالمي لرصد حفظ الطبيعة التابع لبرنامج الأمم المتحدة للبيئة", summary: "مركز خبرة عالمي في التنوع البيولوجي يعمل بتعاون بين برنامج الأمم المتحدة للبيئة ومؤسسة WCMC الخيرية البريطانية.", description: "يعمل UNEP-WCMC عند تقاطع العلم والسياسة والتطبيق، ويطور المعرفة والقدرات لتحسين حالة الطبيعة ودعم القرارات الحكومية والتجارية. يدير المركز مبادرة Protected Planet ويجمع مخزوناتها العالمية للمناطق المحمية والمصانة.", mission: "تطوير المعرفة والقدرات لتحسين حالة الطبيعة للجميع.", },
      zh: { title: "联合国环境规划署世界保护监测中心", summary: "由联合国环境规划署与英国慈善机构WCMC合作运营的全球生物多样性专业中心。", description: "UNEP-WCMC在科学、政策与实践的交汇处开展工作，发展知识与能力，以改善自然状况并支持政府和企业决策。该中心管理Protected Planet项目，并汇编全球保护地和其他有效区域保护措施名录。", mission: "发展知识和能力，改善惠及所有人的自然状况。" },
      en: { title: "UN Environment Programme World Conservation Monitoring Centre", summary: "Global biodiversity centre of expertise operated through collaboration between UNEP and the UK charity WCMC.", description: "UNEP-WCMC works at the interface of science, policy and practice, developing knowledge and capacity to improve the state of nature and support government and business decisions. The Centre operates Protected Planet and compiles its global protected and conserved area inventories.", mission: "Develop knowledge and capacity to improve the state of nature for all." },
      fr: { title: "Centre mondial de surveillance de la conservation de la nature du PNUE", summary: "Centre mondial d’expertise sur la biodiversité exploité par une collaboration entre le PNUE et l’organisme caritatif britannique WCMC.", description: "Le PNUE-WCMC travaille à l’interface entre science, politiques et pratique, en développant les connaissances et les capacités nécessaires pour améliorer l’état de la nature et éclairer les décisions publiques et privées. Le Centre exploite Protected Planet et compile ses inventaires mondiaux d’aires protégées et conservées.", mission: "Développer les connaissances et les capacités afin d’améliorer l’état de la nature pour tous." },
      ru: { title: "Всемирный центр мониторинга охраны природы ЮНЕП", summary: "Глобальный экспертный центр по биоразнообразию, работающий в партнерстве ЮНЕП и британской благотворительной организации WCMC.", description: "UNEP-WCMC работает на стыке науки, политики и практики, развивая знания и потенциал для улучшения состояния природы и поддержки решений государственных органов и бизнеса. Центр эксплуатирует Protected Planet и формирует его глобальные реестры охраняемых и сохраняемых территорий.", mission: "Развивать знания и потенциал, чтобы улучшать состояние природы для всех." },
      es: { title: "Centro Mundial de Vigilancia de la Conservación del PNUMA", summary: "Centro mundial de excelencia en biodiversidad operado mediante la colaboración entre el PNUMA y la entidad benéfica británica WCMC.", description: "UNEP-WCMC trabaja en la interfaz entre ciencia, políticas y práctica, desarrollando conocimiento y capacidad para mejorar el estado de la naturaleza y apoyar decisiones públicas y empresariales. El Centro opera Protected Planet y compila sus inventarios mundiales de áreas protegidas y conservadas.", mission: "Desarrollar conocimiento y capacidad para mejorar el estado de la naturaleza para todas las personas." },
    },
    aliases: ["UNEP-WCMC", "WCMC"],
    established: { date: "2000", source: "collaboration-history" },
    metrics: [{ id: "experts-current-undated", key: "staff_count", value: 200, observedAt: null, source: "official-team" }],
    offices: [{ id: "cambridge", kind: "headquarters", source: "official-contact", location: tr("كامبريدج، المملكة المتحدة", "英国剑桥", "Cambridge, United Kingdom", "Cambridge, Royaume-Uni", "Кембридж, Великобритания", "Cambridge, Reino Unido") }],
    gaps: {},
    profileRefs: ["official-profile", "pp-management", "pp-ibat"],
    sources: {
      "official-profile": source("official-profile", "https://www.unep-wcmc.org/en/about", sourceTitles.about(tr("UNEP-WCMC", "UNEP-WCMC", "UNEP-WCMC", "le PNUE-WCMC", "UNEP-WCMC", "UNEP-WCMC"))),
      "collaboration-history": source(
        "collaboration-history",
        "https://www.unep-wcmc.org/en/news/jerry-harrison-40-years-of-unep-wcmc-and-global-biodiversity-policy",
        sourceTitles.history(tr("UNEP-WCMC", "UNEP-WCMC", "UNEP-WCMC", "du PNUE-WCMC", "UNEP-WCMC", "UNEP-WCMC")),
        tr("تذكر الصفحة أن WCMC دخل في تعاون مع برنامج الأمم المتحدة للبيئة عام 2000؛ يمثل التاريخ بداية شراكة UNEP-WCMC الحالية، لا أقدم المنظمات السابقة.", "该页面称WCMC于2000年开始与联合国环境规划署合作；该日期代表当前UNEP-WCMC合作关系的开始，而非更早前身机构的成立。", "The page states that WCMC entered into collaboration with UNEP in 2000; the date marks the present UNEP-WCMC partnership, not the founding of older predecessor bodies.", "La page indique que le WCMC est entré en collaboration avec le PNUE en 2000 ; cette date marque le partenariat actuel PNUE-WCMC, et non la fondation d’organismes antérieurs.", "Страница сообщает, что WCMC вступил в сотрудничество с ЮНЕП в 2000 году; дата обозначает начало нынешнего партнерства UNEP-WCMC, а не основание более ранних организаций-предшественников.", "La página indica que WCMC inició su colaboración con el PNUMA en 2000; la fecha marca la alianza UNEP-WCMC actual, no la fundación de organismos predecesores anteriores.")
      ),
      "official-team": source(
        "official-team",
        "https://www.unep-wcmc.org/en/the-team",
        sourceTitles.team(tr("UNEP-WCMC", "UNEP-WCMC", "UNEP-WCMC", "du PNUE-WCMC", "UNEP-WCMC", "UNEP-WCMC")),
        tr("تصف الصفحة فريقًا يضم أكثر من 200 خبير دون تاريخ قياس؛ تسجل القيمة الحد المنشور 200 ولا تعني عددًا دقيقًا أو كاملًا للموظفين.", "该页面称团队有200多名专家，但未注明统计日期；指标记录公布的门槛值200，并不代表精确或完整的员工人数。", "The page describes a team of over 200 experts without a measurement date; the value records the published threshold of 200, not an exact or exhaustive employee count.", "La page décrit une équipe de plus de 200 spécialistes sans date de mesure ; la valeur retient le seuil publié de 200, et non un effectif exact ou exhaustif.", "Страница описывает команду из более чем 200 экспертов без даты измерения; значение фиксирует опубликованный порог 200, а не точную или полную численность персонала.", "La página describe un equipo de más de 200 expertos sin fecha de medición; el valor registra el umbral publicado de 200, no una plantilla exacta ni exhaustiva.")
      ),
      "official-contact": source(
        "official-contact",
        "https://www.unep-wcmc.org/en/contact",
        sourceTitles.contact(tr("UNEP-WCMC", "UNEP-WCMC", "UNEP-WCMC", "le PNUE-WCMC", "UNEP-WCMC", "UNEP-WCMC")),
        tr("تحدد صفحة الاتصال موقع المركز في كامبريدج بالمملكة المتحدة؛ ولا توجد في الصفحة أدلة على مكاتب تنظيمية إضافية.", "联系页面将该中心列在英国剑桥；页面未提供其他组织办事处的证据。", "The contact page locates the Centre in Cambridge, United Kingdom; it does not document additional organizational offices.", "La page de contact situe le Centre à Cambridge, au Royaume-Uni, et ne documente pas d’autres bureaux de l’organisation.", "На странице контактов Центр расположен в Кембридже, Великобритания; дополнительных офисов организации она не документирует.", "La página de contacto sitúa el Centro en Cambridge, Reino Unido, y no documenta otras oficinas de la organización.")
      ),
    },
  },
  {
    id: "flanders-marine-institute",
    url: "https://www.vliz.be/en/",
    text: {
      ar: { title: "معهد فلاندرز البحري", summary: "معهد بحوث بحرية متعدد التخصصات في فلاندرز يدعم العلم والسياسة والصناعة والجمهور.", description: "يعالج VLIZ الاحتياجات المجتمعية من خلال البحث وإدارة البيانات والابتكار التكنولوجي وتثمين المعرفة، ويوفر بنية تحتية وخدمات للعلوم البحرية. ومن مقره في أوستنده يشغّل بنى معلوماتية بحرية تشمل WoRMS وMarine Regions وEurOBIS.", mission: "تعزيز معرفة المحيط والتميز في البحث البحري وضمان أن تدعم الأدلة العلمية الإدارة المستدامة للنظم البحرية والساحلية." },
      zh: { title: "佛兰德海洋研究所", summary: "佛兰德地区的多学科海洋研究机构，为科学、政策、产业和公众提供支持。", description: "VLIZ通过研究、数据管理、技术创新和知识转化应对社会需求，并为海洋科学提供基础设施和服务。该研究所从奥斯坦德运营包括WoRMS、Marine Regions和EurOBIS在内的海洋信息基础设施。", mission: "增进海洋知识和海洋研究卓越性，并确保科学证据支持海洋与沿海生态系统的可持续管理。" },
      en: { title: "Flanders Marine Institute", summary: "Multidisciplinary marine research institute in Flanders serving science, policy, industry and the public.", description: "VLIZ addresses societal needs through research, data stewardship, technological innovation and knowledge valorization and provides infrastructure and services for marine science. From Ostend it operates marine information infrastructures including WoRMS, Marine Regions and EurOBIS.", mission: "Advance ocean knowledge and excellence in marine research and ensure scientific evidence supports sustainable management of marine and coastal ecosystems." },
      fr: { title: "Institut marin flamand", summary: "Institut multidisciplinaire de recherche marine en Flandre au service de la science, des politiques, de l’industrie et du public.", description: "Le VLIZ répond aux besoins de la société par la recherche, la gestion des données, l’innovation technologique et la valorisation des connaissances, et fournit des infrastructures et services aux sciences marines. Depuis Ostende, il exploite des infrastructures d’information marine dont WoRMS, Marine Regions et EurOBIS.", mission: "Faire progresser la connaissance de l’océan et l’excellence de la recherche marine, et veiller à ce que les données scientifiques soutiennent la gestion durable des écosystèmes marins et côtiers." },
      ru: { title: "Фландрский морской институт", summary: "Многопрофильный морской исследовательский институт Фландрии, работающий для науки, политики, промышленности и общества.", description: "VLIZ отвечает на общественные потребности с помощью исследований, управления данными, технологических инноваций и использования знаний, предоставляя инфраструктуру и сервисы морской науке. Из Остенде он эксплуатирует морские информационные инфраструктуры, включая WoRMS, Marine Regions и EurOBIS.", mission: "Расширять знания об океане и повышать качество морских исследований, обеспечивая использование научных данных для устойчивого управления морскими и прибрежными экосистемами." },
      es: { title: "Instituto Marino de Flandes", summary: "Instituto multidisciplinario de investigación marina de Flandes al servicio de la ciencia, las políticas, la industria y el público.", description: "VLIZ responde a necesidades sociales mediante investigación, custodia de datos, innovación tecnológica y valorización del conocimiento, y proporciona infraestructuras y servicios para las ciencias marinas. Desde Ostende opera infraestructuras de información marina como WoRMS, Marine Regions y EurOBIS.", mission: "Impulsar el conocimiento del océano y la excelencia en la investigación marina, y asegurar que la evidencia científica apoye la gestión sostenible de los ecosistemas marinos y costeros." },
    },
    aliases: ["VLIZ", "Vlaams Instituut voor de Zee"],
    established: { date: "1999-10-01", source: "official-history" },
    metrics: [{ id: "staff-2022", key: "staff_count", value: 150, observedAt: "2022", source: "official-scale" }],
    offices: [{ id: "ostend", kind: "headquarters", source: "official-contact", location: tr("حرم InnovOcean، أوستنده، بلجيكا", "比利时奥斯坦德InnovOcean园区", "InnovOcean Campus, Ostend, Belgium", "Campus InnovOcean, Ostende, Belgique", "Кампус InnovOcean, Остенде, Бельгия", "Campus InnovOcean, Ostende, Bélgica") }],
    gaps: {},
    profileRefs: ["official-profile", "worms-profile"],
    additionalEdges: [{
      id: "rel-government-of-flanders-funds-flanders-marine-institute",
      sourceNodeId: "government-of-flanders",
      targetNodeId: "flanders-marine-institute",
      kind: "funds",
      note: "VLIZ states that it receives an annual grant from the Flemish Region and the Province of West Flanders. This edge records the documented Flemish-government support only; the page does not publish an amount or grant term, and the province is not folded into this relationship.",
      properties: {
        scope: "Annual institutional grant from the Flemish Region",
        status: "Current funding arrangement described on the official organization page; amount and term not published",
        sourceRefs: ["official-operation"],
      },
      sources: {
        "official-operation": source(
          "official-operation",
          "https://vliz.be/en/who-we-are/about-vliz/our-operation",
          tr("عمل معهد فلاندرز البحري وحوكمته", "佛兰德海洋研究所的运营与治理", "Flanders Marine Institute operation and governance", "Fonctionnement et gouvernance de l’Institut marin flamand", "Деятельность и управление Фландрского морского института", "Funcionamiento y gobernanza del Instituto Marino de Flandes")
        ),
      },
    }],
    sources: {
      "official-profile": source("official-profile", "https://vliz.be/en/who-we-are/about-vliz/mission-strengths", tr("مهمة معهد فلاندرز البحري ونقاط قوته", "佛兰德海洋研究所的使命与优势", "Flanders Marine Institute mission and strengths", "Mission et atouts de l’Institut marin flamand", "Миссия и сильные стороны Фландрского морского института", "Misión y fortalezas del Instituto Marino de Flandes")),
      "worms-profile": source("worms-profile", "https://www.vliz.be/en/worms", tr("VLIZ وWoRMS", "VLIZ与WoRMS", "VLIZ and WoRMS", "Le VLIZ et WoRMS", "VLIZ и WoRMS", "VLIZ y WoRMS")),
      "official-history": source(
        "official-history",
        "https://vliz.be/en/news/vliz-celebrates-its-20th-birthday-kick-festive-year-2020-ostend-football-stadium",
        sourceTitles.history(tr("معهد فلاندرز البحري", "佛兰德海洋研究所", "the Flanders Marine Institute", "l’Institut marin flamand", "Фландрского морского института", "el Instituto Marino de Flandes")),
        tr("تذكر الصفحة أن VLIZ أُنشئ رسميًا في 1 أكتوبر 1999 بدعم من حكومة فلاندرز ومقاطعة فلاندرز الغربية ومؤسسة البحوث الفلمنكية.", "该页面记载VLIZ在佛兰德政府、西佛兰德省和佛兰德研究基金会支持下，于1999年10月1日正式成立。", "The page states that VLIZ was officially established on 1 October 1999 with support from the Flemish Government, the Province of West Flanders and Research Foundation Flanders.", "La page indique que le VLIZ a été officiellement créé le 1er octobre 1999 avec le soutien du Gouvernement flamand, de la Province de Flandre-Occidentale et du Fonds de la recherche scientifique de Flandre.", "Страница сообщает, что VLIZ официально учрежден 1 октября 1999 года при поддержке Правительства Фландрии, провинции Западная Фландрия и Фонда научных исследований Фландрии.", "La página indica que VLIZ se estableció oficialmente el 1 de octubre de 1999 con apoyo del Gobierno de Flandes, la Provincia de Flandes Occidental y la Fundación para la Investigación de Flandes.")
      ),
      "official-scale": source(
        "official-scale",
        "https://vliz.be/en/150-employees-and-1000-vliz-members",
        tr("150 موظفًا و1000 عضو في VLIZ", "VLIZ拥有150名员工和1000名成员", "150 employees and 1,000 VLIZ members", "150 employés et 1 000 membres du VLIZ", "150 сотрудников и 1000 членов VLIZ", "150 empleados y 1.000 miembros de VLIZ"),
        tr("تذكر الصفحة أن عدد موظفي VLIZ بلغ 150 في عام 2022؛ ولا يضاف الموظفون الجدد المذكورون لاحقًا لأن الصفحة لا تنشر مجموعًا محدثًا.", "该页面称VLIZ员工数在2022年达到150人；由于页面未发布更新总数，随后提到的新员工未另行加总。", "The page states that VLIZ reached 150 employees in 2022; later hires mentioned on the page are not added because it does not publish a revised total.", "La page indique que le VLIZ a atteint 150 employés en 2022 ; les recrutements ultérieurs mentionnés ne sont pas ajoutés, faute de total révisé publié.", "Страница сообщает, что в 2022 году штат VLIZ достиг 150 сотрудников; упомянутые позднейшие наймы не прибавлены, поскольку обновленный итог не опубликован.", "La página indica que VLIZ alcanzó 150 empleados en 2022; las contrataciones posteriores mencionadas no se suman porque no publica un total revisado.")
      ),
      "official-contact": source(
        "official-contact",
        "https://vliz.be/nl/contact",
        sourceTitles.contact(tr("معهد فلاندرز البحري", "佛兰德海洋研究所", "the Flanders Marine Institute", "l’Institut marin flamand", "Фландрского морского института", "el Instituto Marino de Flandes")),
        tr("تسرد الصفحة مقر VLIZ في حرم InnovOcean بأوستنده. ولا يسجل المحطة البحرية أو السفينة كمكاتب تنظيمية.", "该页面列出VLIZ位于奥斯坦德InnovOcean园区的总部；海洋站和研究船不作为机构办事处记录。", "The page lists VLIZ at the InnovOcean Campus in Ostend. The marine station and research vessel are not recorded as organizational offices.", "La page situe le VLIZ sur le campus InnovOcean à Ostende. La station marine et le navire de recherche ne sont pas enregistrés comme bureaux de l’organisation.", "На странице VLIZ расположен в кампусе InnovOcean в Остенде. Морская станция и исследовательское судно не записаны как офисы организации.", "La página sitúa VLIZ en el campus InnovOcean de Ostende. La estación marina y el buque de investigación no se registran como oficinas de la organización.")
      ),
    },
  },
];

function normalizeEdge(edge) {
  const result = {
    id: edge.id,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    kind: edge.kind,
    note: edge.note,
    properties: edge.properties ?? {},
    sources: structuredClone(edge.sources ?? {}),
  };
  if (edge.id === "rel-embl-council-governs-embl") {
    const governance = result.sources["src-relationship-embl-governance"];
    governance.title = localized(tr("حوكمة EMBL", "EMBL治理", "EMBL governance", "Gouvernance de l’EMBL", "Управление EMBL", "Gobernanza de EMBL"));
  }
  return result;
}

function buildDraft(definition) {
  const baseline = canonical.find((record) => record.id === definition.id);
  if (!baseline) throw new Error(`Missing canonical record: ${definition.id}`);
  const nodeSources = { ...structuredClone(baseline.record.sources ?? {}), ...definition.sources };
  const properties = {
    established: definition.established,
    metrics: definition.metrics,
    offices: definition.offices.map(({ id, kind, source: sourceId }) => ({ id, kind, source: sourceId })),
  };
  const localizations = Object.fromEntries(locales.map((locale) => {
    const text = definition.text[locale];
    const researchGaps = Object.fromEntries(Object.entries(definition.gaps).map(([key, values]) => [key, values[locale]]));
    return [locale, {
      title: text.title,
      summary: text.summary,
      description: text.description,
      details: {
        aliases: definition.aliases,
        profile: { mission: text.mission, sourceRefs: definition.profileRefs },
        offices: definition.offices.map((office) => ({ id: office.id, location: office.location[locale] })),
        ...(Object.keys(researchGaps).length ? { researchGaps } : {}),
      },
      translatedFromLocale: locale === "en" ? null : "en",
    }];
  }));
  return {
    id: definition.id,
    record: {
      kind: "organization",
      url: definition.url,
      recordDepth: "rich",
      properties,
      sources: nodeSources,
    },
    localizations,
    edges: [...baseline.edges.map(normalizeEdge), ...(definition.additionalEdges ?? [])],
    routes: [],
  };
}

const drafts = records.map(buildDraft);
for (const draft of drafts) {
  fs.writeFileSync(path.join(directory, "drafts", `${draft.id}.json`), `${JSON.stringify(draft, null, 2)}\n`);
}
fs.writeFileSync(path.join(directory, "batch.json"), `${JSON.stringify(drafts, null, 2)}\n`);
