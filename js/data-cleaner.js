/* ============================================================
 * DATA CLEANER — Validation / Cleaning / Normalization
 * قواعد موثقة في PLAN.md و DATA_DICTIONARY.md
 * - لا تُحذف البيانات الخام أبدًا.
 * - كل صف يحمل flags منفصلة لتحديد حالته.
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;

  /* ---------- أدوات عامة ---------- */
  function serializeSerial(v) {
    if (v == null) return null;
    let n = (typeof v === 'number') ? v : parseFloat(String(v).replace(/,/g, '').trim());
    if (Number.isFinite(n) && n > 25000 && n < 80000) return n;
    return null;
  }

  /** يحول Excel serial أو سلسلة تاريخ إلى ISO yyyy-mm-dd */
  function parseDate(v, opts) {
    opts = opts || {};
    if (v == null) return null;
    const s = String(v).trim();
    if (s === '' ) return null;
    const n = serializeSerial(s);
    if (n) {
      const d = new Date(Math.round((n - 25569) * 86400 * 1000));
      return toISODate(d);
    }
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad2(+m[2]) + '-' + pad2(+m[3]);
    return null;
  }

  function toISODate(d) {
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function pad2(x) { return (x < 10 ? '0' : '') + x; }

  function num(v) { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; }
  function int(v) { const n = num(v); return n == null ? null : Math.round(n); }

  const AR_ = new RegExp('^[\\u0621-\\u064A ]+$');
  function isArabicName(s) {
    if (typeof s !== 'string') return false;
    const t = s.trim();
    if (!AR_.test(t)) return false;
    const w = t.split(/\s+/).length;
    return w >= 3 && w <= 6;
  }
  function isNid(s) { return /^\d{14}$/.test(String(s).trim()); }
  function isNid13(s) { return /^3\d{12}$/.test(String(s).trim()); }
  function isPhone(s) { return /^01\d{9}$/.test(String(s).trim()); }
  function isEmail(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim()); }

  /* تطبيع الأسماء العربية: إزالة اللقب + توحيد الحروف + إزالة الفراغات */
  function normName(s) {
    if (!s) return '';
    let t = String(s).replace(/^\s+|\s+$/g, '');
    t = t.replace(/\s+/g, ' ');
    t = t.replace(/^(م\.?|م\/|أ\.?|أ\/|د\.?|د\/|الباشمهندس?|المهندس?)/, '');
    t = t.replace(/[\u064B-\u0652\u0670]/g, '');           // تشكيل
    t = t.replace(/[أإآا]/g, 'ا').replace(/[ؤ]/g, 'و').replace(/[ئيى]/g, 'ي').replace(/ة/g, 'ه'); // fold
    t = t.replace(/\s+/g, '').toLowerCase();
    return t;
  }
  function normTrainer(raw) {
    const key = (raw || '').trim();
    if (!key) return null;
    const mapped = C.trainerNormalization[key];
    if (mapped !== undefined) return mapped;
    const lower = normName(key);
    // احتياط: توحيد لغوي إن لم يوجد في الجدول
    if (lower.indexOf('الضبع') !== -1) return 'أحمد الضبع';
    if (lower.indexOf('محمود') !== -1 || lower.indexOf('طارق') !== -1) return 'محمود طارق';
    if (lower.indexOf('كريم') !== -1) return 'كريم شعير';
    if (lower.indexOf('اسراء') !== -1 || lower.indexOf('اسر اسراء') !== -1) return 'إسراء فتحي';
    return key;
  }
  function normSession(raw) {
    const key = (raw || '').trim();
    if (!key) return null;
    const mapped = C.sessionNormalization[key];
    if (mapped !== undefined) return mapped;
    const lower = key.toLowerCase();
    if (lower.indexOf('قياد') !== -1) return 'Leadership (القيادة)';
    if (lower.indexOf('brand') !== -1 || lower.indexOf('براند') !== -1 || lower.indexOf('جرافيك') !== -1) return 'Branding (براندنج)';
    if (lower.indexOf('sheet') !== -1 || lower.indexOf('جوجل شيت') !== -1 || lower === 'it') return 'Google Sheets (IT)';
    return key;
  }

  /* ---------- الحضور ---------- */
  const ATT_DATE_YEAR = { min: 2026, max: 2026 };
  function cleanAttendance(rows) {
    const entities = [];
    const seenRows = new Set();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      const joined = r.join('|');
      const exactDup = seenRows.has(joined);
      seenRows.add(joined);
      const name = (r[0] || '').trim();
      const nid = (r[1] || '').trim();
      const track = (r[2] || '').trim();
      const rawDate = r[3] == null ? '' : String(r[3]).trim();
      const id = (r[4] || '').trim();
      const date = parseDate(rawDate);
      let dateOutlier = false;
      if (date) {
        const y = +date.slice(0, 4);
        if (y < ATT_DATE_YEAR.min || y > ATT_DATE_YEAR.max) dateOutlier = true;
      }
      entities.push({
        name, nid, track, date, rawDate,
        id,
        flags: {
          empty: name === '' && nid === '',
          missingName: name === '',
          missingNid: nid === '',
          missingDate: !date,
          duplicateExact: exactDup,
          dateOutlier: dateOutlier
        }
      });
    }
    return entities;
  }

  /* ---------- الـ Feedback ---------- */
  function cleanFeedback(rows) {
    const dimKeys = Object.keys(C.feedbackDimensions);
    const entities = [];
    const seenUuid = new Set();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 30) continue;
      if (!String(r[0] || '').trim() && !String(r[2] || '').trim()) continue;
      const uuid = (r[29] || '').trim();
      const dims = {};
      let dimCount = 0;
      for (let k = 0; k < dimKeys.length; k++) {
        const key = dimKeys[k];
        const col = C.feedbackDimensions[key].col;
        const raw = (r[col] || '').trim();
        const val = (raw && C.ratingScale[raw] != null) ? C.ratingScale[raw] : null;
        dims[key] = val;
        if (val != null) dimCount++;
      }
      const overallRaw = (r[C.overallCol] || '').trim();
      const overall = (overallRaw && C.ratingScale[overallRaw] != null) ? C.ratingScale[overallRaw] : null;
      const techRaw = (r[C.technicalYesCol] || '').trim();
      const techIssue = techRaw === 'نعم' ? true : (techRaw === 'لا' ? false : null);
      entities.push({
        ts: (r[0] || '').trim(),
        date: parseDate(String(r[0] || '').trim()),
        sessionRaw: (r[1] || '').trim(),
        session: normSession(r[1]),
        trainerRaw: (r[2] || '').trim(),
        trainer: normTrainer(r[2]),
        trainingType: (r[3] || '').trim() || null,
        dims: dims, dimCount: dimCount,
        overall: overall,
        techIssue: techIssue,
        techNote: (r[C.technicalNoteCol] || '').trim(),
        recommendations: (r[25] || '').trim(),
        future: (r[26] || '').trim(),
        nominate: (r[27] || '').trim(),
        nominee: (r[28] || '').trim(),
        uuid: uuid,
        flags: {
          duplicateUuid: uuid !== '' && seenUuid.has(uuid),
          missingSession: !(r[1] || '').trim(),
          missingTrainer: !(r[2] || '').trim(),
          shortForm: dimCount <= 4 && dimKeyCount(dims, ['mastery']) === null,
          hasTechnicalNote: !!(r[C.technicalNoteCol] || '').trim()
        }
      });
      if (uuid) seenUuid.add(uuid);
    }
    return entities;
  }
  function dimKeyCount(dims, keys) { let n = 0; for (const k of keys) if (dims[k] != null) n++; return n; }

  /* ---------- التاسكات ---------- */
  function cleanAssignment(rows) {
    const entities = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 7) continue;
      if (!String(r[0] || '').trim() && !String(r[3] || '').trim()) continue;
      const name = (r[1] || '').trim();
      const whatsapp = (r[2] || '').trim();
      const track = (r[3] || '').trim();
      // الرابط يظهر غالبًا في العمود 5 وبعض السجلات في العمود 4
      const link = (r[5] && (r[5] || '').indexOf('http') !== -1) ? (r[5] || '').trim() : ((r[4] || '').trim() || (r[5] || '').trim());
      const file = (r[5] || '').trim();
      entities.push({
        ts: (r[0] || '').trim(),
        date: parseDate(String(r[0] || '').trim()),
        name, whatsapp, track, link, file,
        campTrack: C.assignmentTrackCampMap[track] || null,
        flags: {
          missingName: name === '',
          missingWhatsapp: whatsapp === '',
          missingLink: link === '',
          missingFile: file === '',
          missingBoth: link === '' && file === ''
        }
      });
    }
    return entities;
  }

  /* ---------- الاختبارات: تصنيف النموذج + الهوية + التحقق من الدرجة ---------- */
  const EXAMS = {
    'gsheets-basic':    { label: 'Google Sheets (أساسي / IT)',     max: 7  },
    'gsheets-advanced': { label: 'Google Sheets (متقدم / IT)',     max: 7  },
    'leadership':       { label: 'القيادة (Leadership)',           max: 7  },
    'brand-ai':         { label: 'براندنج / ذكاء اصطناعي',        max: 7  },
    'content':          { label: 'المحتوى (Content Marketing)',    max: 12 },
    'unknown':          { label: 'غير محدد',                       max: 7  }
  };

  function contentJoined(r) { return r.join('|'); }

  function classifyExam(r, isPost) {
    const s = contentJoined(r);
    const c3 = (r[3] || '').trim(), c4 = (r[4] || '').trim(), c5 = (r[5] || '').trim();

    // صف القالب/العنوان داخل البيانات المدمجة
    if (isHeaderRow(r)) return 'unknown';

    // 1) Google Sheets أساسي: هوية كاملة (نid@4 قد يكون 13 رقمًا مع إيميل@1)
    if (isEmail(r[1]) && (isNid(c4) || isNid13(c4)) && isArabicName(c3)) return 'gsheets-basic';

    // 2) اختبار المحتوى: علامات محتوى أو اسم/هاتف في العمودين 17-18
    if (/أنا بحب الكتابة|انا بحب الكتابة|Content Marketing|أي جملة مكتوبة بشكل صحيح|صناعة المحتوى ليست|Portfolio/.test(s) ||
        (isArabicName(r[17]) && isPhone(r[18]))) return 'content';

    // 3) القيادة — بدون هوية (الإجابات في الأعمدة 3-7)
    if (/التأثير في الفريق|إعطاء الأوامر|القدرة على الاستماع والتواصل|الاستماع للطرفين|تستمع للطرفين|كلا الطرفين|فهم أسباب عدم حماسه|فهم السبب وتقديم الدعم|توزيع المهام|القائد يوجه فريقه|القائد يتخذ|أحد أعضاء فريقك|أي سلوك يساعد|بناء الثقة مع فريقه|السيطرة على جميع تفاصيل|اختيار الشخص المناسب وتوضيح المهمة|لماذا يفقد أحد أعضاء فريقك/.test(s)) return 'leadership';

    // 4) براندنج / AI
    if (/الـ Logo هو|مجموعة متكاملة من العناصر والقواعد البصرية|تتعلم من كميات كبيرة من البيانات|صورة لشخص أو أيقونة|صمم بوستر|فيديو له Hook|لماذا قد يعطي الذكاء الاصطناعي|الأنماط والاحتمالات التي تعلمها|تحديد المكانة والصورة|الهوية البصرية|أدوات الذكاء الاصطناعي التوليدي|توليد الشخص كعنصر|إعادة صياغة الـPrompt|التوازن والاتزان البصري|الألوان الأساسية|الأحمر والأصفر والأزرق|الـ Pixel|Vector|PNG|SVG|RGB|CMYK|دليل الهوية|Brand Guidelines|ملصق|مصمم جرافيك/.test(s)) return 'brand-ai';

    // 5) Google Sheets متقدم: إجابات بصيغ + هوية في أي عمود متاح (name@3 + هاتف/نid)
    if (isArabicName(c3) && hasFormula(s) &&
        (isPhone(c4) || isPhone(r[1]) || isNid(c4) || isNid13(c5))) return 'gsheets-advanced';

    return 'unknown';
  }

  function hasFormula(s) {
    if (/=\s*(SUMIF|SUMIFS|AVERAGEIF|AVERAGEIFS|COUNTIF|COUNTIFS|COUNTBLANK|LARGE|SMALL|PROPER|TRIM|MID|LEN|ROUND|LEFT|RIGHT|INDEX|MATCH|VLOOKUP|CONCATENATE|COUNTA|SUM|COUNT|AVERAGE|MAX|MIN)\s*\(/.test(s)) return true;
    if (/=\s*(SUMIF|AVERAGEIFS|AVERAGEIF|COUNTIF|COUNTIFS|LARGE|PROPER|TRIM|MID\b|LEN)\b/.test(s)) return true;
    return false;
  }

  function isHeaderRow(r) {
    const c0 = (r[0] || '').trim(), c2 = String(r[2] || '').trim();
    if (c0 === 'Timestamp' || c0 === 'طابع زمني') return true;
    if (c2 === 'Score' || c2 === 'النتيجة') return true;
    if ((r[3] || '').trim() === 'الاسم بالكامل') return true;
    return false;
  }

  function extractIdentity(r) {
    const out = { email: '', nid: '', phone: '', name: '' };
    const order = [1, 3, 4, 5, 6, 17, 18, 0, 2];
    for (let i = 0; i < order.length; i++) {
      const col = order[i];
      const raw = String(r[col] || '').trim();
      if (!raw) continue;
      if (isEmail(raw)) { if (!out.email) out.email = raw; continue; }
      if (isNid(raw)) { if (!out.nid) out.nid = raw; continue; }
      if (isPhone(raw)) { if (!out.phone) out.phone = raw; continue; }
      if (isArabicName(raw)) { if (!out.name) out.name = raw.replace(/\s+/g, ' ').trim(); }
    }
    return out;
  }

  function cleanQuiz(rows, isPost) {
    const entities = [];
    const seen = new Set();
    const scoreCells = new Set(['Score', 'النتيجة']);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      const hasAny = r.some(function (v) { return v !== '' && v != null; });
      if (!hasAny) continue;
      const ts = String(r[0] || '').trim();
      if (!num(ts) && scoreCells.has(String(r[2] || '').trim()) && !parseDate(ts)) {
        // سجل بلا تاريخ ولا درجة -> صف هامشي
      }
      const isHeader = isHeaderRow(r);
      const exam = isHeader ? 'unknown' : classifyExam(r, isPost);
      const scoreRaw = (r[2] || '').trim();
      const scoreVal = scoreCells.has(scoreRaw) ? null : int(scoreRaw);
      const maxScore = EXAMS[exam] ? EXAMS[exam].max : 7;
      const scoreValid = scoreVal != null && scoreVal >= 0 && scoreVal <= maxScore;
      const id = extractIdentity(r);
      const date = parseDate(ts);
      entities.push({
        ts,
        date,
        isHeader,
        exam,
        examLabel: EXAMS[exam] ? EXAMS[exam].label : 'غير محدد',
        maxScore,
        trackHint: C.examToTrackMap[exam] || null,
        scoreRaw,
        scoreVal,
        scoreValid,
        scoreInRange: scoreValid,
        id,
        hasIdentity: !!(id.email || id.nid || id.phone || id.name),
        flags: {
          isHeader,
          missingDate: !date,
          nonNumericScore: scoreVal == null,
          scoreOutOfRange: !scoreValid,
          noIdentity: !(id.email || id.nid || id.phone || id.name)
        }
      });
    }
    return entities;
  }

  /* ---------- محرك الربط Paired ---------- */
  function identityKey(id) {
    if (id.email) return 'E:' + id.email.toLowerCase();
    if (id.nid) return 'N:' + id.nid;
    if (id.phone) return 'P:' + id.phone;
    if (id.name) return 'M:' + normName(id.name);
    return '';
  }
  function identityKeyMethod(id) {
    if (id.email) return 'email';
    if (id.nid) return 'nid';
    if (id.phone) return 'phone';
    if (id.name) return 'name';
    return '';
  }

  window.DataCleaner = {
    parseDate, normName, normTrainer, normSession, isArabicName, isNid, isPhone, isEmail,
    cleanAttendance, cleanFeedback, cleanAssignment, cleanQuiz,
    classifyExam, isHeaderRow, extractIdentity, identityKey, identityKeyMethod,
    EXAMS
  };
})();