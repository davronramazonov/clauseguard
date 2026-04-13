import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import Result from './pages/Result'
import Pricing from './pages/Pricing'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import axios from 'axios'

const API_URL = '/api'

const baseUz = {
  title: 'Clauseg.ai',
  heroTitle: 'Hujjatlaringizni AI bilan tekshiring',
  heroSubtitle: 'Xavfli bandlarni aniqlang, huquqiy xatolarni toping va himoyalaning',
  uploadText: 'Hujjatni shu yerga olib keling yoki tanlang',
  uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (10MB gacha)',
  analyze: 'Tahlil qilish',
  analyzing: '⏳ Tahlil qilinmoqda...',
  aiAnalyzing: 'AI tahlil qilinmoqda...',
  pleaseWaitAnalyze: 'Hujjatingizni tahlil qilish uchun kuting',

  premium: 'Premium',
  pricing: 'Narxlar',
  profile: 'Profil',
  login: 'Kirish',
  register: "Ro'yxatdan o'tish",
  logout: 'Chiqish',
  free: 'Bepul',
  premium_plan: 'Premium',
  monthly: 'oylik',
  yearly: 'yillik',

  fileMode: 'Fayl',
  textMode: 'Matn',
  urlMode: 'URL',
  chooseFile: 'Fayl tanlash',
  or: 'yoki',
  back: 'Orqaga',
  backHome: 'Bosh sahifaga',
  newAnalysis: 'Yangi tahlil',

  enterText: 'Matn kiriting',
  enterUrl: 'URL kiriting',
  loginRequired: 'Iltimos, avval tizimga kiring',
  uploadError: 'Faylni yuklashda xatolik',
  analyzeError: 'Tahlil xatosi',
  fileTooLarge: 'Fayl hajmi 10MB dan oshmasligi kerak',
  urlPremiumHint: '⚠️ Link tahlili faqat Premium foydalanuvchilar uchun',

  textPlaceholder: "Hujjat matnini shu yerda yozing yoki nusxa ko'chiring...",
  currentJurisdictionLabel: 'Huquqiy hudud',

  analysisResult: 'Tahlil natijasi',
  resultNotFound: 'Natija topilmadi',
  resultLoadError: 'Natijani yuklab bo‘lmadi',
  summaryTitle: '📋 Xulosa',
  riskDetected: '⚠️ Xavf bor',
  safeResult: '✅ Xavfsiz',
  risksTitle: '⚠️ Xavflar',
  recommendationsTitle: '💡 Tavsiyalar',
  legalReferencesTitle: '⚖️ Huquqiy asoslar',
  jurisdictionInfoTitle: '🌍 Tahlil konteksti',
  languageLabel: 'Til',
  confidenceLabel: 'Aniqlik',
  confidenceHigh: 'Yuqori',
  confidenceMedium: "O‘rtacha",
  confidenceLow: 'Past',
  suggestedJurisdictionLabel: 'Hujjatdan sezilgan hudud',
  detectedSignalsTitle: '🔎 Aniqlangan signallar',
  detectedSignalsHint: 'Bu bo‘lim hujjatdan qaysi yurisdiksiya alomatlari topilganini ko‘rsatadi.',
  riskHigh: '🔴 Yuqori',
  riskMedium: "🟡 O‘rtacha",
  riskLow: '🟢 Past',

  pricingSubtitle: "O‘zingizga mos tarifni tanlang va hujjatlaringizni ishonch bilan tekshiring",
  startNow: 'Boshlash',
  popular: '⭐ Mashhur',
  getPremium: 'Premium olish',
  businessPlan: 'Business',
  contactUs: "Bog'lanish",
  havePromo: '🎫 Promo kod bormi?',
  promoPlaceholder: 'PROMO123',
  activatePromo: '✅ Faollashtirish',
  activating: '⏳ Faollashtirilmoqda...',
  promoActivated: '✓ Premium muvaffaqiyatli faollashdi!',
  enterPromoCode: 'Promo kodni kiriting',
  genericError: 'Xatolik',
  freeFeature1: '5 ta tahlil / oy',
  freeFeature2: 'Asosiy hujjat tahlili',
  freeFeature3: 'Xavf darajalari',
  freeFeature4: 'Qisqa xulosa va tavsiyalar',
  premiumFeature1: '🚀 Cheksiz tahlil',
  premiumFeature2: '📄 Ko‘proq fayl formatlari',
  premiumFeature3: '🔗 URL / oferta tahlili',
  premiumFeature4: '⚖️ Huquqiy asoslar',
  premiumFeature5: '💡 AI tavsiyalar',
  premiumFeature6: '🎯 Tezkor qo‘llab-quvvatlash',
  businessFeature1: '🚀 Cheksiz tahlil',
  businessFeature2: '🏷️ Kompaniya identifikatori',
  businessFeature3: '⚙️ Admin boshqaruvi',
  businessFeature4: '👥 Jamoa bilan ishlash',
  businessFeature5: '🔒 Kuchliroq xavfsizlik',
  businessFeature6: '💼 Biznes qo‘llab-quvvatlash',

  profileLoadError: 'Profilni yuklab bo‘lmadi',
  profileNotFound: 'Profil topilmadi',
  totalAnalysesLabel: 'Jami tahlillar',
  thisMonthLabel: 'Bu oy',
  planLabel: 'Tarif',
  roleLabel: 'Rol',
  premiumActive: 'Premium faol',
  validUntil: 'Amal qiladi',
  unlimited: 'Cheksiz',
  aboutUsTitle: 'Biz haqimizda',
  aboutUsText: "Clauseg.ai — bu sun'iy intellekt yordamida hujjatlarni tahlil qiluvchi platforma. Xavfli bandlarni va huquqiy xatarlarni aniqlashga yordam beradi.",

  organizationCodeTitle: 'Tashkilot kodi',
  organizationCodeHint: 'Agar sizga firma yoki davlat tashkiloti maxsus kod bergan bo‘lsa, shu yerga kiriting.',
  organizationCodePlaceholder: 'Masalan: ORG-123456',
  activateOrganizationCode: 'Faollashtirish',
  organizationCodeApplied: '✅ Tashkilot kodi muvaffaqiyatli faollashdi',
  organizationCodeFailed: 'Tashkilot kodini faollashtirib bo‘lmadi',
  enterOrganizationCode: 'Tashkilot kodini kiriting',
  organizationLinked: 'Tashkilotga ulangan account',

  loginSubtitle: 'Hisobingizga kiring',
  adminLoginTitle: '👑 Admin kirishi',
  adminLoginSubtitle: 'Admin panelga kirish',
  userLoginTab: 'Foydalanuvchi',
  adminLoginTab: 'Admin',
  adminUsernameLabel: 'Admin username',
  adminUsernamePlaceholder: 'sharqtech',
  usernameLabel: 'Username',
  usernamePlaceholder: 'username',
  passwordLabel: 'Parol',
  loggingIn: '⏳ Kirilmoqda...',
  adminLoginButton: 'Admin kirish',
  noAccount: "Hisobingiz yo'qmi?",
  loginFailed: 'Kirish muvaffaqiyatsiz bo‘ldi',

  registerSubtitle: 'Yangi hisob yarating',
  firstNameLabel: 'Ism',
  firstNamePlaceholder: 'Ism',
  lastNameLabel: 'Familiya',
  lastNamePlaceholder: 'Familiya',
  registering: "⏳ Ro'yxatdan o'tilmoqda...",
  haveAccount: 'Hisobingiz bormi?',
  registerFailed: "Ro'yxatdan o'tish muvaffaqiyatsiz bo‘ldi",

  extractTextMode: 'Matn chiqarish',
extractTextUploadText: 'Matnini chiqarish uchun faylni shu yerga olib keling yoki tanlang',
extractTextButton: 'Fayldan matn chiqarish',
extractTextTitle: 'Ajratilgan matn',
copyText: '📋 Nusxalash',
copiedText: '✅ Nusxalandi',
extractingText: 'Matn ajratilmoqda...',
pleaseWaitExtract: 'Fayldagi matn tayyorlanmoqda',
extractTextError: 'Fayldan matn ajratib bo‘lmadi',
copyFailed: 'Matnni nusxalab bo‘lmadi'
}

const translations = {
  uz: baseUz,

  ru: {
    ...baseUz,
    heroTitle: 'Анализируйте документы с AI',
    heroSubtitle: 'Выявляйте опасные пункты, находите юридические ошибки и защищайте себя',
    uploadText: 'Перетащите документ сюда или выберите файл',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (до 10MB)',
    analyze: 'Анализировать',
    analyzing: '⏳ Идёт анализ...',
    aiAnalyzing: 'AI анализирует документ...',
    pleaseWaitAnalyze: 'Пожалуйста, подождите, пока документ анализируется',

    pricing: 'Тарифы',
    profile: 'Профиль',
    login: 'Вход',
    register: 'Регистрация',
    logout: 'Выйти',
    free: 'Бесплатно',
    monthly: 'в месяц',
    yearly: 'в год',

    fileMode: 'Файл',
    textMode: 'Текст',
    chooseFile: 'Выбрать файл',
    or: 'или',
    back: 'Назад',
    backHome: 'На главную',
    newAnalysis: 'Новый анализ',

    enterText: 'Введите текст',
    enterUrl: 'Введите URL',
    loginRequired: 'Пожалуйста, сначала войдите в систему',
    uploadError: 'Ошибка при загрузке файла',
    analyzeError: 'Ошибка анализа',
    fileTooLarge: 'Размер файла не должен превышать 10MB',
    urlPremiumHint: '⚠️ Анализ ссылок доступен только для Premium пользователей',

    textPlaceholder: 'Введите текст документа сюда или вставьте его...',
    currentJurisdictionLabel: 'Юрисдикция',

    analysisResult: 'Результат анализа',
    resultNotFound: 'Результат не найден',
    resultLoadError: 'Не удалось загрузить результат',
    summaryTitle: '📋 Краткое содержание',
    riskDetected: '⚠️ Есть риски',
    safeResult: '✅ Безопасно',
    risksTitle: '⚠️ Риски',
    recommendationsTitle: '💡 Рекомендации',
    legalReferencesTitle: '⚖️ Правовые основы',
    jurisdictionInfoTitle: '🌍 Контекст анализа',
    languageLabel: 'Язык',
    confidenceLabel: 'Точность',
    confidenceHigh: 'Высокая',
    confidenceMedium: 'Средняя',
    confidenceLow: 'Низкая',
    suggestedJurisdictionLabel: 'Обнаруженная по документу юрисдикция',
    detectedSignalsTitle: '🔎 Обнаруженные сигналы',
    detectedSignalsHint: 'Этот блок показывает, какие признаки юрисдикции были найдены в документе.',
    riskHigh: '🔴 Высокий',
    riskMedium: '🟡 Средний',
    riskLow: '🟢 Низкий',

    pricingSubtitle: 'Выберите подходящий тариф и анализируйте документы уверенно',
    startNow: 'Начать',
    popular: '⭐ Популярно',
    getPremium: 'Получить Premium',
    contactUs: 'Связаться',
    havePromo: '🎫 Есть промокод?',
    activatePromo: '✅ Активировать',
    activating: '⏳ Активация...',
    promoActivated: '✓ Premium успешно активирован!',
    enterPromoCode: 'Введите промокод',
    genericError: 'Ошибка',
    freeFeature1: '5 анализов / месяц',
    freeFeature2: 'Базовый анализ документов',
    freeFeature3: 'Уровни риска',
    freeFeature4: 'Краткое резюме и рекомендации',
    premiumFeature1: '🚀 Безлимитный анализ',
    premiumFeature2: '📄 Больше форматов файлов',
    premiumFeature3: '🔗 Анализ URL / оферты',
    premiumFeature4: '⚖️ Правовые основы',
    premiumFeature5: '💡 Рекомендации AI',
    premiumFeature6: '🎯 Приоритетная поддержка',
    businessFeature1: '🚀 Безлимитный анализ',
    businessFeature2: '🏷️ Идентификатор компании',
    businessFeature3: '⚙️ Админ-управление',
    businessFeature4: '👥 Работа с командой',
    businessFeature5: '🔒 Повышенная безопасность',
    businessFeature6: '💼 Поддержка для бизнеса',

    profileLoadError: 'Не удалось загрузить профиль',
    profileNotFound: 'Профиль не найден',
    totalAnalysesLabel: 'Всего анализов',
    thisMonthLabel: 'В этом месяце',
    planLabel: 'Тариф',
    roleLabel: 'Роль',
    premiumActive: 'Premium активен',
    validUntil: 'Действует до',
    unlimited: 'Безлимитно',
    aboutUsTitle: 'О нас',
    aboutUsText: 'Clauseg.ai — это платформа для анализа документов с помощью искусственного интеллекта. Она помогает выявлять опасные пункты и юридические риски.',

    organizationCodeTitle: 'Код организации',
    organizationCodeHint: 'Если компания или государственная организация выдала вам специальный код, введите его здесь.',
    organizationCodePlaceholder: 'Например: ORG-123456',
    activateOrganizationCode: 'Активировать',
    organizationCodeApplied: '✅ Код организации успешно активирован',
    organizationCodeFailed: 'Не удалось активировать код организации',
    enterOrganizationCode: 'Введите код организации',
    organizationLinked: 'Аккаунт привязан к организации',

    loginSubtitle: 'Войдите в свой аккаунт',
    adminLoginTitle: '👑 Вход администратора',
    adminLoginSubtitle: 'Вход в панель администратора',
    userLoginTab: 'Пользователь',
    adminLoginTab: 'Админ',
    adminUsernameLabel: 'Имя администратора',
    adminUsernamePlaceholder: 'sharqtech',
    usernameLabel: 'Имя пользователя',
    usernamePlaceholder: 'username',
    passwordLabel: 'Пароль',
    loggingIn: '⏳ Вход...',
    adminLoginButton: 'Вход администратора',
    noAccount: 'Нет аккаунта?',
    loginFailed: 'Не удалось войти',

    registerSubtitle: 'Создайте новый аккаунт',
    firstNameLabel: 'Имя',
    firstNamePlaceholder: 'Имя',
    lastNameLabel: 'Фамилия',
    lastNamePlaceholder: 'Фамилия',
    registering: '⏳ Регистрация...',
    haveAccount: 'Уже есть аккаунт?',
    registerFailed: 'Не удалось зарегистрироваться',

    extractTextMode: 'Извлечь текст',
extractTextUploadText: 'Перетащите файл сюда или выберите его для извлечения текста',
extractTextButton: 'Извлечь текст из файла',
extractTextTitle: 'Извлечённый текст',
copyText: '📋 Копировать',
copiedText: '✅ Скопировано',
extractingText: 'Извлечение текста...',
pleaseWaitExtract: 'Подготавливается текст из файла',
extractTextError: 'Не удалось извлечь текст из файла',
copyFailed: 'Не удалось скопировать текст'
  },

  en: {
    ...baseUz,
    heroTitle: 'Analyze documents with AI',
    heroSubtitle: 'Identify dangerous clauses, find legal errors and protect yourself',
    uploadText: 'Drag and drop a document here or choose a file',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (up to 10MB)',
    analyze: 'Analyze',
    analyzing: '⏳ Analyzing...',
    aiAnalyzing: 'AI is analyzing the document...',
    pleaseWaitAnalyze: 'Please wait while your document is being analyzed',

    pricing: 'Pricing',
    profile: 'Profile',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    free: 'Free',
    monthly: '/month',
    yearly: '/year',

    fileMode: 'File',
    textMode: 'Text',
    chooseFile: 'Choose file',
    or: 'or',
    back: 'Back',
    backHome: 'Back to home',
    newAnalysis: 'New analysis',

    enterText: 'Enter text',
    enterUrl: 'Enter URL',
    loginRequired: 'Please log in first',
    uploadError: 'File upload error',
    analyzeError: 'Analysis error',
    fileTooLarge: 'File size must not exceed 10MB',
    urlPremiumHint: '⚠️ URL analysis is available only for Premium users',

    textPlaceholder: 'Type or paste document text here...',
    currentJurisdictionLabel: 'Jurisdiction',

    analysisResult: 'Analysis result',
    resultNotFound: 'Result not found',
    resultLoadError: 'Could not load result',
    summaryTitle: '📋 Summary',
    riskDetected: '⚠️ Risks found',
    safeResult: '✅ Safe',
    risksTitle: '⚠️ Risks',
    recommendationsTitle: '💡 Recommendations',
    legalReferencesTitle: '⚖️ Legal references',
    jurisdictionInfoTitle: '🌍 Analysis context',
    languageLabel: 'Language',
    confidenceLabel: 'Confidence',
    confidenceHigh: 'High',
    confidenceMedium: 'Medium',
    confidenceLow: 'Low',
    suggestedJurisdictionLabel: 'Jurisdiction detected from document',
    detectedSignalsTitle: '🔎 Detected signals',
    detectedSignalsHint: 'This section shows which jurisdiction signals were found in the document.',
    riskHigh: '🔴 High',
    riskMedium: '🟡 Medium',
    riskLow: '🟢 Low',

    pricingSubtitle: 'Choose the plan that fits you and analyze documents with confidence',
    startNow: 'Get started',
    popular: '⭐ Popular',
    getPremium: 'Get Premium',
    contactUs: 'Contact us',
    havePromo: '🎫 Have a promo code?',
    activatePromo: '✅ Activate',
    activating: '⏳ Activating...',
    promoActivated: '✓ Premium activated successfully!',
    enterPromoCode: 'Enter promo code',
    genericError: 'Error',
    freeFeature1: '5 analyses / month',
    freeFeature2: 'Basic document analysis',
    freeFeature3: 'Risk levels',
    freeFeature4: 'Short summary and recommendations',
    premiumFeature1: '🚀 Unlimited analysis',
    premiumFeature2: '📄 More file formats',
    premiumFeature3: '🔗 URL / offer analysis',
    premiumFeature4: '⚖️ Legal references',
    premiumFeature5: '💡 AI recommendations',
    premiumFeature6: '🎯 Priority support',
    businessFeature1: '🚀 Unlimited analysis',
    businessFeature2: '🏷️ Company identifier',
    businessFeature3: '⚙️ Admin controls',
    businessFeature4: '👥 Team collaboration',
    businessFeature5: '🔒 Enhanced security',
    businessFeature6: '💼 Business support',

    profileLoadError: 'Could not load profile',
    profileNotFound: 'Profile not found',
    totalAnalysesLabel: 'Total analyses',
    thisMonthLabel: 'This month',
    planLabel: 'Plan',
    roleLabel: 'Role',
    premiumActive: 'Premium active',
    validUntil: 'Valid until',
    unlimited: 'Unlimited',
    aboutUsTitle: 'About us',
    aboutUsText: 'Clauseg.ai is an AI-powered document analysis platform. It helps identify dangerous clauses and legal risks.',

    organizationCodeTitle: 'Organization code',
    organizationCodeHint: 'If your company or government organization gave you a special code, enter it here.',
    organizationCodePlaceholder: 'For example: ORG-123456',
    activateOrganizationCode: 'Activate',
    organizationCodeApplied: '✅ Organization code activated successfully',
    organizationCodeFailed: 'Could not activate organization code',
    enterOrganizationCode: 'Enter organization code',
    organizationLinked: 'Account linked to organization',

    loginSubtitle: 'Sign in to your account',
    adminLoginTitle: '👑 Admin login',
    adminLoginSubtitle: 'Access the admin panel',
    userLoginTab: 'User',
    adminLoginTab: 'Admin',
    adminUsernameLabel: 'Admin username',
    adminUsernamePlaceholder: 'sharqtech',
    usernameLabel: 'Username',
    usernamePlaceholder: 'username',
    passwordLabel: 'Password',
    loggingIn: '⏳ Signing in...',
    adminLoginButton: 'Admin login',
    noAccount: "Don't have an account?",
    loginFailed: 'Login failed',

    registerSubtitle: 'Create a new account',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'First name',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Last name',
    registering: '⏳ Registering...',
    haveAccount: 'Already have an account?',
    registerFailed: 'Registration failed'
  },

  kk: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'Құжаттарды AI арқылы талдау',
    heroSubtitle: 'Қауіпті тармақтарды анықтап, құқықтық қателерді тауып, өзіңізді қорғаңыз',
    uploadText: 'Құжатты осы жерге әкеліңіз немесе файлды таңдаңыз',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (10MB дейін)',
    analyze: 'Талдау',
    pricing: 'Бағалар',
    profile: 'Профиль',
    login: 'Кіру',
    register: 'Тіркелу',
    logout: 'Шығу',
    free: 'Тегін',
    monthly: 'айына',
    yearly: 'жылына',
    fileMode: 'Файл',
    textMode: 'Мәтін',
    chooseFile: 'Файл таңдау',
    or: 'немесе',
    back: 'Артқа',
    backHome: 'Басты бетке'
  },

  kg: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'Документтерди AI менен талдоо',
    heroSubtitle: 'Кооптуу беренелерди аныктап, укуктук каталарды таап, өзүңүздү коргоңуз',
    uploadText: 'Документти бул жерге сүйрөп келиңиз же файл тандаңыз',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (10MB чейин)',
    analyze: 'Талдоо',
    pricing: 'Баалар',
    profile: 'Профиль',
    login: 'Кирүү',
    register: 'Катталуу',
    logout: 'Чыгуу',
    free: 'Акысыз',
    monthly: 'айына',
    yearly: 'жылына'
  },

  tg: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'Ҳуҷҷатҳоро бо AI таҳлил кунед',
    heroSubtitle: 'Бандҳои хатарнокро муайян кунед, хатогиҳои ҳуқуқиро ёбед ва худро ҳифз намоед',
    uploadText: 'Ҳуҷҷатро ба ин ҷо биёред ё файлро интихоб кунед',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (то 10MB)',
    analyze: 'Таҳлил',
    pricing: 'Нархҳо',
    profile: 'Профил',
    login: 'Ворид шудан',
    register: 'Сабт шудан',
    logout: 'Баромад',
    free: 'Ройгон',
    monthly: 'моҳона',
    yearly: 'солона'
  },

  az: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'Sənədləri AI ilə təhlil edin',
    heroSubtitle: 'Təhlükəli bəndləri müəyyən edin, hüquqi səhvləri tapın və özünüzü qoruyun',
    uploadText: 'Sənədi bura sürükləyin və ya fayl seçin',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (10MB-a qədər)',
    analyze: 'Təhlil et',
    pricing: 'Qiymətlər',
    profile: 'Profil',
    login: 'Daxil ol',
    register: 'Qeydiyyatdan keç',
    logout: 'Çıxış',
    free: 'Pulsuz',
    monthly: 'aylıq',
    yearly: 'illik'
  },

  tr: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'Belgeleri AI ile analiz edin',
    heroSubtitle: 'Tehlikeli maddeleri belirleyin, hukuki hataları bulun ve kendinizi koruyun',
    uploadText: 'Belgeyi buraya sürükleyin veya dosya seçin',
    uploadHint: "PDF, DOC, DOCX, TXT, JPG, PNG (10MB'a kadar)",
    analyze: 'Analiz et',
    pricing: 'Fiyatlar',
    profile: 'Profil',
    login: 'Giriş',
    register: 'Kayıt ol',
    logout: 'Çıkış',
    free: 'Ücretsiz',
    monthly: 'aylık',
    yearly: 'yıllık'
  },

  ar: {
    ...baseUz,
    title: 'Clauseg.ai',
    heroTitle: 'حلّل المستندات بالذكاء الاصطناعي',
    heroSubtitle: 'اكتشف البنود الخطرة، وابحث عن الأخطاء القانونية، واحمِ نفسك',
    uploadText: 'اسحب المستند هنا أو اختر ملفاً',
    uploadHint: 'PDF, DOC, DOCX, TXT, JPG, PNG (حتى 10MB)',
    analyze: 'تحليل',
    pricing: 'الأسعار',
    profile: 'الملف الشخصي',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    free: 'مجاني',
    monthly: 'شهرياً',
    yearly: 'سنوياً'
  }
}

const languageFlags = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
  kk: '🇰🇿',
  kg: '🇰🇬',
  tg: '🇹🇯',
  az: '🇦🇿',
  tr: '🇹🇷',
  ar: '🇸🇦'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [lang, setLang] = useState('uz')
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const savedLang = localStorage.getItem('clauseg-lang') || 'uz'
    setLang(savedLang)

    const token = localStorage.getItem('clauseg-token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      setUser(res.data.user)
    } catch (err) {
      localStorage.removeItem('clauseg-token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (data) => {
    localStorage.setItem('clauseg-token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data.user)
    setShowAuth(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('clauseg-token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    navigate('/')
  }

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('clauseg-lang', newLang)
  }

  const openLogin = () => {
    setAuthMode('login')
    setShowAuth(true)
  }

  const openRegister = () => {
    setAuthMode('register')
    setShowAuth(true)
  }

  const t = translations[lang] || translations.uz

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </div>
          {t.title}
        </Link>

        <div className="header-actions">
          <select
            className="lang-select"
            value={lang}
            onChange={(e) => changeLang(e.target.value)}
          >
            {Object.entries(translations).map(([code]) => (
              <option key={code} value={code}>
                {languageFlags[code]} {code.toUpperCase()}
              </option>
            ))}
          </select>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-ghost">Admin</Link>
              )}
              <Link to="/pricing" className="btn btn-primary">{t.premium}</Link>
              <Link to="/profile" className="btn btn-ghost">{t.profile}</Link>
              <button onClick={handleLogout} className="btn btn-ghost">{t.logout}</button>
            </>
          ) : (
            <>
              <button onClick={openLogin} className="btn btn-ghost">{t.login}</button>
              <button onClick={openRegister} className="btn btn-primary">{t.register}</button>
            </>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home user={user} t={t} lang={lang} />} />
          <Route path="/result/:id" element={<Result t={t} lang={lang} />} />
          <Route path="/pricing" element={<Pricing user={user} t={t} />} />
          <Route path="/profile" element={<Profile user={user} t={t} />} />
          <Route path="/admin" element={<Admin user={user} t={t} />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>© 2026 Clauseg.ai — AI Document Analyzer</p>
      </footer>

      <AnimatePresence>
        {showAuth && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAuth(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              {authMode === 'login' ? (
                <Login onLogin={handleLogin} onSwitch={() => setAuthMode('register')} t={t} />
              ) : (
                <Register onRegister={handleLogin} onSwitch={() => setAuthMode('login')} t={t} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}