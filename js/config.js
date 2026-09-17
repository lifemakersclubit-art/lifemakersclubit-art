/* ============================================================
 * CONFIG — داشبورد تشغيل كامب جذور
 * كل قواعد التطبيع والعتبات والتسميات قابلة للتعديل من هنا فقط.
 * ============================================================ */
/* نقطة النهاية الحية لبيانات Google Sheets (Apps Script Web App).
   يتعطّل تلقائيًا بالعودة إلى processed-data.json إن فشل الرابط. */
window.CAMP_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx25e5ryo8npVWUBSUVp0iLEl1dxSCJ9kzLZZB_MD08-vM2c47tF7dJnIRqfJZ64c9u/exec';

window.CAMP_CONFIG = {
  app: {
    name: 'كامب جذور',
    org: 'صناع الحياة',
    orgFull: 'نوادي صناع الحياة بالجامعات المصرية',
    systemLabel: 'نظام المتابعة والتقييم المركزي',
    version: '1.0.0',
    dataSourceLabel: 'الإدارة المركزية لكامب جذور',
    logo: 'assets/logo-nouadi.png',
    defaultReportTitle: 'التقرير التنفيذي لمتابعة أداء كامب جذور'
  },
  palette: {
    blue: '#014976',
    blueDark: '#012F4A',
    blueDeeper: '#011F31',
    blueSoft: '#EAF2F8',
    orange: '#F17206',
    orangeSoft: '#FDF1E7',
    text: '#17303F',
    textMuted: '#5B7484',
    line: '#E2E8F0',
    bg: '#F5F7FA',
    bgPaper: '#FFFFFF',
    success: '#1F8A70',
    warn: '#C9981F',
    danger: '#C0392B',
    series: ['#014976', '#1F8A70', '#F17206', '#7A9BB5', '#C9981F', '#8AA6A0', '#D06F6F', '#3E5B75', '#B5832D']
  },
  /* أسماء مختصرة متوافق عليها للرسوم البيانية */
  colors: {
    primary: '#014976',
    primaryLight: '#5C89A8',
    primaryDark: '#012F4A',
    accent: '#F17206',
    accentLight: '#F5A864',
    text: '#17303F',
    muted: '#5B7484',
    line: '#E2E8F0',
    ok: '#1F8A70',
    warn: '#C9981F',
    bad: '#C0392B'
  },
  /* تحويل درجة الرضا */
  ratingScale: { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'يحتاج تطوير': 1 },
  ratingScaleMax: 4,
  /* أبعاد تقييم السيشن: key -> { label, col } */
  feedbackDimensions: {
    mastery:   { col: 4,  label: 'إتقان المحتوى العلمي' },
    clarity:   { col: 5,  label: 'وضوح الشرح وتبسيط المفاهيم' },
    goals:     { col: 6,  label: 'تحقيق أهداف السيشن' },
    delivery:  { col: 7,  label: 'القدرة على توصيل المعلومة' },
    interaction:{ col: 8, label: 'إدارة التفاعل والتواصل' },
    participation:{ col: 9, label: 'مشاركة المتدربين' },
    time:      { col: 10, label: 'إدارة الوقت والالتزام' },
    qa:        { col: 11, label: 'التعامل مع الأسئلة والنقاشات' },
    activities:{ col: 12, label: 'استخدام الأنشطة والتمارين' },
    practicality:{ col: 13, label: 'ارتباط المحتوى بالتطبيق العملي' },
    internet:  { col: 19, label: 'جودة واستقرار اتصال الإنترنت', online: true },
    avQuality: { col: 20, label: 'وضوح الصوت والصورة', online: true },
    platform:  { col: 21, label: 'سهولة التواصل عبر المنصة', online: true }
  },
  overallCol: 24,
  technicalYesCol: 22,
  technicalNoteCol: 23,
  trainingTypeCol: 3,
  /* أعمدة النموذج الحضوري (فارغة 100% في النسخة الحالية) */
  offlineColumns: [14, 15, 16, 17, 18],
  /* تطبيع أسماء المدربين: الصيغة الخام -> الاسم الموحد */
  trainerNormalization: {
    'احمد الضبع': 'أحمد الضبع', 'أحمد الضبع': 'أحمد الضبع', 'م. أحمد الضبع': 'أحمد الضبع',
    'م.احمد الضبع': 'أحمد الضبع', 'م/ أحمد الضبع': 'أحمد الضبع', 'م / أحمد الضبع': 'أحمد الضبع',
    'Ahmed eldabaa': 'أحمد الضبع', 'ahmed eldabaa': 'أحمد الضبع', 'أحمد علي الضبع': 'أحمد الضبع',
    'محمود طارق': 'محمود طارق', 'م. محمود طارق': 'محمود طارق', 'م.محمود طارق': 'محمود طارق',
    'م/ محمود طارق': 'محمود طارق', 'المهندس محمود': 'محمود طارق', 'Eng. Mahmoud Tarek': 'محمود طارق',
    'الباشمهندس محمود طارق': 'محمود طارق', 'محمد طارق': 'محمود طارق', 'م. محمد طارق': 'محمود طارق',
    'Mohammed': 'محمود طارق', 'كريم شعير': 'كريم شعير', 'م. كريم شعير': 'كريم شعير', 'كريم': 'كريم شعير',
    'اسراء فتحي': 'إسراء فتحي', 'إسراء فتحي': 'إسراء فتحي', 'اسراء': 'إسراء فتحي', 'إسراء': 'إسراء فتحي',
    'ايه طارق': 'آية طارق', 'د. رضوى محمد': 'د. رضوى محمد', 'منة الله يحيى احمد': 'منة الله يحيى أحمد',
    '.': null, 'مدار جذور': 'فريق التيسير', 'محمود': 'محمود طارق', 'احمد': 'أحمد الضبع',
    'Ahmed': 'أحمد الضبع', 'Abdulrhman Ashraf': 'عبدالرحمن أشرف'
  },
  /* تطبيع أسماء الجلسات */
  sessionNormalization: {
    'القيادة': 'Leadership (القيادة)', 'القياده': 'Leadership (القيادة)', 'Leadership': 'Leadership (القيادة)',
    'leadership': 'Leadership (القيادة)', 'مهارات القيادة': 'Leadership (القيادة)', 'مهارات القياده': 'Leadership (القيادة)',
    'ورشة القيادة': 'Leadership (القيادة)',
    'Branding': 'Branding (براندنج)', 'براندينج': 'Branding (براندنج)', 'براندج': 'Branding (براندنج)',
    'Dranding': 'Branding (براندنج)', 'ورشة Branding': 'Branding (براندنج)', 'ورشةBranding': 'Branding (براندنج)',
    'جرافيك': 'Branding (براندنج)',
    'Google sheets': 'Google Sheets (IT)', 'Google sheet': 'Google Sheets (IT)', 'جوجل شيت': 'Google Sheets (IT)',
    'IT': 'Google Sheets (IT)',
    'جذور': 'جذور', 'كامب جذور': 'جذور', 'كانفا': 'Canva', 'كانفا بلس': 'Canva'
  },
  /* ربط مساقات التاسكات بسياقات الكامب العرضية */
  assignmentTrackCampMap: { 'Google Sheets': 'IT', 'Branding': 'تصميم جرافيك', 'التسويق بالمحتوى': 'التسويق بالمحتوى' },
  /* ربط نماذج الاختبار بسياق الكامب (عرضي) */
  examToTrackMap: {
    'gsheets-basic': 'IT', 'gsheets-advanced': 'IT', 'leadership': 'التنمية والتدريب',
    'brand-ai': 'تصميم جرافيك', 'content': 'التسويق بالمحتوى'
  },
  /* تصنيف المشاكل التقنية بالكلمات المفتاحية (قابلة للتعديل) */
  techIssueCategories: {
    zoom:     { label: 'Zoom / سعة (Capacity)',      keywords: ['zoom', 'زوم', 'ميتنج', 'meeting', '١٠٠', '100', 'السعة', 'القدرة', 'capacity', 'اكتمل'] },
    internet: { label: 'الإنترنت (Internet)',         keywords: ['نت', 'انترنت', 'internet', 'نت قطعة', 'اتصال'] },
    audio:    { label: 'الصوت (Audio)',               keywords: ['صوت', 'سماع', 'ميكروفون', 'صوت وصورة', 'audio'] },
    access:   { label: 'الدخول (Access)',             keywords: ['دخول', 'ادخل', 'منع من الدخول', 'دخلت', 'access', 'again', 'مره'] },
    platform: { label: 'المنصة (Platform)',           keywords: ['شات', 'chat', 'منصة', 'منصه', 'منبر', 'تجميد', 'freeze', 'تطبيق'] },
    other:    { label: 'أخرى (Other)',                keywords: [] }
  },
  /* عتبات اتجاه الأداء (قابلة للتعديل) — للمقارنة بين الفترات */
  trendThresholds: {
    risePct: 5,       // تغير +5% فما فوق = Rising
    fallPct: -5,      // تغير -5% فما دون = Declining
    minBase: 5        // الحد الأدنى للقاعدة حتى لا تكون النسبة مضللة
  },
  /* تنبيهات المراقبة */
  alerts: {
    technicalIssueRate: 0.15,
    attendanceDropPct: -20,
    feedbackDropPct: -20,
    minResponsesForMean: 3,
    highScoreDeviation: 2
  },
  /* فترات "أسبوع" تُحسب ISO (الاثنين بداية الأسبوع) */
  weekStartsOn: 1,
  /* تفاصيل المخازن الأصلية */
  sheets: {
    attendance: 'attendence',
    feedback: 'feedback',
    assignment: 'assignment',
    prequiz: 'prequiz',
    postquiz: 'postquiz'
  },
  /* نطاق الكامب الافتراضي للفلترة */
  defaultDateFrom: '2026-08-25',
  defaultDateTo: '2026-09-17'
};