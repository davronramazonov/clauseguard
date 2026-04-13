require('dotenv').config();
const express = require('express');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-env';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const DB_PATH = process.env.VERCEL ? path.join(require('os').tmpdir(), 'clauseg.db') : path.join(__dirname, 'clauseg.db');
const ADMIN_USER = process.env.ADMIN_USERNAME || 'sharqtech';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'sharqtech1505';
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const FALLBACK_GEMINI_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-pro';

let db;

const LANGUAGE_NAMES = {
  uz: 'Uzbek',
  ru: 'Russian',
  en: 'English',
  kk: 'Kazakh',
  kg: 'Kyrgyz',
  tg: 'Tajik',
  az: 'Azerbaijani',
  tr: 'Turkish',
  ar: 'Arabic'
};

const LANGUAGE_JURISDICTION_MAP = {
  uz: 'uzbekistan',
  ru: 'russia',
  kk: 'kazakhstan',
  tr: 'turkey',
  en: 'international',
  kg: 'kyrgyzstan',
  tg: 'tajikistan',
  az: 'azerbaijan',
  ar: 'international'
};

const JURISDICTION_CONFIG = {
  uzbekistan: { label: 'Uzbekistan', code: 'UZ', defaultLanguage: 'uz' },
  russia: { label: 'Russia', code: 'RU', defaultLanguage: 'ru' },
  kazakhstan: { label: 'Kazakhstan', code: 'KZ', defaultLanguage: 'kk' },
  turkey: { label: 'Turkey', code: 'TR', defaultLanguage: 'tr' },
  kyrgyzstan: { label: 'Kyrgyzstan', code: 'KG', defaultLanguage: 'kg' },
  tajikistan: { label: 'Tajikistan', code: 'TJ', defaultLanguage: 'tg' },
  azerbaijan: { label: 'Azerbaijan', code: 'AZ', defaultLanguage: 'az' },
  international: { label: 'International', code: 'INT', defaultLanguage: 'en' }
};

const JURISDICTION_PATTERNS = {
  uzbekistan: [
    /o['‘’`]?zbekiston\s+respublikasi/iu,
    /uzbekistan/iu,
    /\bmchj\b/iu,
    /\bso['‘’`]?m\b/iu,
    /\bsum\b/iu,
    /\.uz\b/iu,
    /fuqarolik\s+kodeksi/iu
  ],
  russia: [
    /rossiya\s+federatsiyasi/iu,
    /российская\s+федерация/iu,
    /\bооо\b/iu,
    /\bруб(?:\.|ль|лей|ля)?\b/iu,
    /\.ru\b/iu,
    /гражданский\s+кодекс/iu
  ],
  kazakhstan: [
    /qozog['‘’`]?iston\s+respublikasi/iu,
    /respublika\s+kazakhstan/iu,
    /республика\s+казахстан/iu,
    /\bтоо\b/iu,
    /\bтенге\b/iu,
    /\.kz\b/iu
  ],
  turkey: [
    /t[üu]rkiye\s+cumhuriyeti/iu,
    /\ba\.ş\.\b/iu,
    /\bltd\.?\s*şti\.?\b/iu,
    /\blira\b/iu,
    /\.tr\b/iu
  ],
  kyrgyzstan: [
    /kyrgyz\s+respublikasy/iu,
    /кыргызская\s+республика/iu,
    /\bsom\b/iu,
    /\.kg\b/iu
  ],
  tajikistan: [
    /ҷумҳурии\s+тоҷикистон/iu,
    /республика\s+таджикистан/iu,
    /\.tj\b/iu
  ],
  azerbaijan: [
    /azərbaycan\s+respublikası/iu,
    /азербайджанская\s+республика/iu,
    /\.az\b/iu,
    /\bmanat\b/iu
  ]
};

function ensureUploadsDir() {
  const dir = process.env.VERCEL ? path.join(require('os').tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function saveDB() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

function getScalar(sql) {
  try {
    const result = db.exec(sql);
    return result?.[0]?.values?.[0]?.[0] || 0;
  } catch {
    return 0;
  }
}

function generateBusinessId(prefix = 'ORG') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function randomDigits(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

function codeExists(tableName, code) {
  const stmt = db.prepare(`SELECT id FROM ${tableName} WHERE code = ? LIMIT 1`);
  stmt.bind([code]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function generateUniqueCode(tableName, prefix) {
  let attempt = 0;
  while (attempt < 50) {
    const candidate = `${prefix}-${randomDigits(6)}`;
    if (!codeExists(tableName, candidate)) {
      return candidate;
    }
    attempt += 1;
  }
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      isPremium INTEGER DEFAULT 0,
      premiumExpiresAt TEXT,
      businessId TEXT,
      usageCount INTEGER DEFAULT 0,
      monthlyUsage INTEGER DEFAULT 0,
      lastUsageDate TEXT,
      isBlocked INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      inputText TEXT,
      fileName TEXT,
      url TEXT,
      result TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      usageLimit INTEGER NOT NULL,
      usedCount INTEGER DEFAULT 0,
      expiresAt TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS organization_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      organizationName TEXT NOT NULL,
      planType TEXT NOT NULL DEFAULT 'business',
      seatLimit INTEGER NOT NULL DEFAULT 10,
      usedSeats INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 30,
      expiresAt TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      businessId TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDB();
}

function sanitizeFilename(name = 'file') {
  return String(name)
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('File delete error:', e.message);
  }
}

function isPremiumActive(user) {
  return !!(
    user &&
    user.isPremium &&
    user.premiumExpiresAt &&
    new Date(user.premiumExpiresAt) > new Date()
  );
}

function isBusinessUser(user) {
  return user?.role === 'business';
}

function isAdminUser(user) {
  return user?.role === 'admin';
}

function getUserUsageState(user) {
  const now = new Date();
  let monthlyUsage = Number(user?.monthlyUsage || 0);

  if (user?.lastUsageDate) {
    const lastDate = new Date(user.lastUsageDate);
    if (
      lastDate.getMonth() !== now.getMonth() ||
      lastDate.getFullYear() !== now.getFullYear()
    ) {
      monthlyUsage = 0;
    }
  }

  return { now, monthlyUsage };
}

function getUsageMeta(user) {
  const premium = isPremiumActive(user);
  const business = isBusinessUser(user);
  const unlimited = premium || business || isAdminUser(user);

  return { premium, business, unlimited };
}

function enforceMonthlyLimit(user) {
  const { monthlyUsage } = getUserUsageState(user);
  const { unlimited } = getUsageMeta(user);

  if (!unlimited && monthlyUsage >= 5) {
    return { blocked: true, monthlyUsage, limit: 5 };
  }

  return { blocked: false, monthlyUsage, limit: 5 };
}

function incrementUserUsage(userId, monthlyUsage, now) {
  db.run(
    'UPDATE users SET monthlyUsage = ?, usageCount = usageCount + 1, lastUsageDate = ? WHERE id = ?',
    [monthlyUsage + 1, now.toISOString(), userId]
  );
}

function buildUsageResponse(user, monthlyUsage) {
  const { unlimited } = getUsageMeta(user);
  return {
    usageRemaining: unlimited ? 'unlimited' : Math.max(0, 5 - (monthlyUsage + 1)),
    used: monthlyUsage + 1
  };
}

function getDefaultJurisdiction(lang = 'uz') {
  return LANGUAGE_JURISDICTION_MAP[lang] || 'international';
}

function normalizeJurisdictionInput(value, lang = 'uz') {
  if (!value) return getDefaultJurisdiction(lang);
  const normalized = String(value).trim().toLowerCase();
  return JURISDICTION_CONFIG[normalized] ? normalized : getDefaultJurisdiction(lang);
}

function detectJurisdictionFromText(text = '', lang = 'uz') {
  const content = String(text || '').slice(0, 15000);
  const scores = {};
  const signals = [];

  for (const jurisdiction of Object.keys(JURISDICTION_PATTERNS)) {
    scores[jurisdiction] = 0;
    for (const pattern of JURISDICTION_PATTERNS[jurisdiction]) {
      if (pattern.test(content)) {
        scores[jurisdiction] += 1;
        signals.push({ jurisdiction, pattern: pattern.toString() });
      }
    }
  }

  let bestJurisdiction = null;
  let bestScore = 0;

  for (const [jurisdiction, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestJurisdiction = jurisdiction;
      bestScore = score;
    }
  }

  const defaultJurisdiction = getDefaultJurisdiction(lang);

  if (!bestJurisdiction || bestScore === 0) {
    return {
      jurisdiction: defaultJurisdiction,
      suggestedJurisdiction: null,
      confidence: 'low',
      signals: [],
      scores
    };
  }

  if (bestJurisdiction === defaultJurisdiction) {
    return {
      jurisdiction: defaultJurisdiction,
      suggestedJurisdiction: null,
      confidence: bestScore >= 3 ? 'high' : 'medium',
      signals,
      scores
    };
  }

  return {
    jurisdiction: defaultJurisdiction,
    suggestedJurisdiction: bestJurisdiction,
    confidence: bestScore >= 3 ? 'high' : 'medium',
    signals,
    scores
  };
}

function stripCodeFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function findBalancedJsonObject(text) {
  const source = String(text || '');
  const start = source.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, i + 1);
        }
      }
    }
  }

  return source.slice(start);
}

function cleanupJsonString(raw) {
  let text = String(raw || '').trim();

  text = text.replace(/^\uFEFF/, '');
  text = text.replace(/[\u201C\u201D]/g, '"');
  text = text.replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/,\s*([}\]])/g, '$1');
  text = text.replace(/[\u0000-\u0019]+/g, ' ');
  text = text.replace(/\r\n/g, '\n');

  return text;
}

function tryParseJsonCandidate(candidate) {
  const cleaned = cleanupJsonString(candidate);
  return JSON.parse(cleaned);
}

function extractJsonObject(text) {
  const trimmed = stripCodeFences(text);

  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  const balanced = findBalancedJsonObject(trimmed);
  if (balanced) {
    try {
      return tryParseJsonCandidate(balanced);
    } catch (_) {}
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return tryParseJsonCandidate(match[0]);
    } catch (_) {}
  }

  throw new Error('No valid JSON found in AI response');
}

function normalizeLaws(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((law) => {
      if (typeof law === 'string') {
        return {
          title: law,
          article: '',
          reason: ''
        };
      }

      if (law && typeof law === 'object') {
        return {
          title: String(law.title || law.name || '').trim(),
          article: String(law.article || law.articleNumber || '').trim(),
          reason: String(law.reason || law.explanation || '').trim()
        };
      }

      return null;
    })
    .filter((law) => law && law.title);
}

function normalizeRecommendations(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => (item.length > 180 ? `${item.slice(0, 177)}...` : item));
}

function normalizeAnalysisResult(parsed, meta = {}) {
  const jurisdiction = meta.jurisdiction || 'international';
  const suggestedJurisdiction = meta.suggestedJurisdiction || null;

  return {
    hasRisks: !!parsed?.hasRisks,
    summary: parsed?.summary || 'Tahlil yakunlandi',
    risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
    laws: normalizeLaws(parsed?.laws),
    recommendations: normalizeRecommendations(parsed?.recommendations),
    language: meta.language || 'uz',
    languageLabel: LANGUAGE_NAMES[meta.language] || 'Unknown',
    jurisdiction,
    jurisdictionLabel: JURISDICTION_CONFIG[jurisdiction]?.label || 'International',
    suggestedJurisdiction,
    suggestedJurisdictionLabel: suggestedJurisdiction
      ? JURISDICTION_CONFIG[suggestedJurisdiction]?.label || suggestedJurisdiction
      : null,
    jurisdictionConfidence: meta.jurisdictionConfidence || 'low',
    jurisdictionSignals: Array.isArray(meta.jurisdictionSignals) ? meta.jurisdictionSignals : []
  };
}

function fallbackAnalysis(message = 'Analysis failed', meta = {}) {
  return normalizeAnalysisResult(
    {
      hasRisks: false,
      risks: [],
      laws: [],
      recommendations: [],
      summary: message
    },
    meta
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(error) {
  return error?.response?.status === 429;
}

function getQuotaMessage(error) {
  const data = error?.response?.data;
  const raw = data?.error?.message || error?.message || '';
  const match = String(raw).match(/Please retry in ([\d.]+)s/i);

  if (match) {
    const seconds = Math.ceil(Number(match[1]));
    return `AI limiti tugagan. Taxminan ${seconds} soniyadan keyin yana urinib ko‘ring.`;
  }

  return 'AI limiti vaqtincha tugagan. Birozdan keyin yana urinib ko‘ring.';
}

async function callGemini({ model, prompt, apiKey }) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2600,
          responseMimeType: 'application/json'
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      }
    );

    const candidates = response?.data?.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content) {
      return candidates[0].content.parts[0].text;
    }

    throw new Error("Gemini API dan bo'sh javob qaytdi");
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      const errorMessage = error.response.data.error.message;
      console.error(`Gemini API Xatosi (${model}):`, errorMessage);
      throw new Error(`Gemini xatosi: ${errorMessage}`);
    }
    console.error(`Tarmoq xatosi yoki Gemini ishlamayapti (${model}):`, error.message);
    throw error;
  }
}

async function analyzeWithAI(text, lang = 'uz', jurisdictionMeta = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('AI Error: GEMINI_API_KEY topilmadi');
    return fallbackAnalysis('AI unavailable', { language: lang, ...jurisdictionMeta });
  }

  const safeText = String(text || '').trim().slice(0, 9000);
  if (!safeText) {
    return fallbackAnalysis('Tahlil uchun matn topilmadi', { language: lang, ...jurisdictionMeta });
  }

  const currentJurisdiction = jurisdictionMeta?.jurisdiction || getDefaultJurisdiction(lang);

  const prompt = `
You are a professional legal document analyzer AI.

Return ONLY valid JSON.
Do not add markdown.
Do not add explanations outside JSON.
Do not wrap with triple backticks.

Response language: ${LANGUAGE_NAMES[lang] || 'Uzbek'}
Current jurisdiction context: ${JURISDICTION_CONFIG[currentJurisdiction]?.label || 'International'}

Rules:
1. Output must be strict valid JSON.
2. For laws, return specific legal references whenever reasonably possible.
3. Each law item must include:
   - title
   - article
   - reason
4. If exact article is unclear, use an empty string.
5. Recommendations must be short and practical.
6. Keep summary concise.

Required JSON format:
{
  "hasRisks": true,
  "summary": "short summary",
  "risks": [
    {
      "clause": "problematic clause",
      "level": "high",
      "explanation": "why risky",
      "recommendation": "short action"
    }
  ],
  "laws": [
    {
      "title": "law or code name",
      "article": "article number",
      "reason": "short reason"
    }
  ],
  "recommendations": [
    "short recommendation 1",
    "short recommendation 2"
  ]
}

Document:
${safeText}
`;

  const models = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(Boolean);
  let lastQuotaError = null;
  let lastParseError = null;

  for (const model of models) {
    const maxAttempts = model === PRIMARY_GEMINI_MODEL ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        console.log(`AI request -> model: ${model}, attempt: ${attempt}`);
        const resultText = await callGemini({ model, prompt, apiKey });

        if (!resultText) {
          throw new Error('Empty AI response');
        }

        const parsed = extractJsonObject(resultText);
        return normalizeAnalysisResult(parsed, { language: lang, ...jurisdictionMeta });
      } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data || error.message;
        console.error(`AI Error -> model: ${model}, attempt: ${attempt}, status:`, status);
        console.error('AI Error data:', data);

        if (isQuotaError(error)) {
          lastQuotaError = error;
          break;
        }

        lastParseError = error;

        if (attempt < maxAttempts) {
          await sleep(800);
        }
      }
    }
  }

  if (lastQuotaError) {
    return fallbackAnalysis(getQuotaMessage(lastQuotaError), {
      language: lang,
      ...jurisdictionMeta
    });
  }

  if (lastParseError) {
    return fallbackAnalysis('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.', {
      language: lang,
      ...jurisdictionMeta
    });
  }

  return fallbackAnalysis('AI vaqtincha band. Iltimos, birozdan keyin qayta urinib ko‘ring.', {
    language: lang,
    ...jurisdictionMeta
  });
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

async function parseFileToText(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdf(fs.readFileSync(filePath));
      return data.text || '';
    }

    if (mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }

    if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
      const {
        data: { text }
      } = await Tesseract.recognize(filePath, 'eng+uzb+rus');
      return text || '';
    }

    return '';
  } catch (e) {
    console.error('Parse error:', e.message);
    return '';
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadsDir()),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${sanitizeFilename(file.originalname || 'upload.bin')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Not allowed file type'), false);
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'admin') {
      req.user = {
        id: 0,
        role: 'admin',
        username: ADMIN_USER,
        firstName: 'Admin',
        lastName: 'SharqTech'
      };
      return next();
    }

    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([decoded.userId]);

    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();

      if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

      req.user = user;
      return next();
    }

    stmt.free();
    return res.status(401).json({ error: 'User not found' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ userId: 0, role: 'admin' }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES
      });

      return res.json({
        token,
        user: {
          id: 0,
          username: ADMIN_USER,
          role: 'admin',
          firstName: 'Admin',
          lastName: 'SharqTech'
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, username, password } = req.body;

    if (!firstName || !lastName || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedUsername = String(username).trim();
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    checkStmt.bind([normalizedUsername]);

    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Username already exists' });
    }
    checkStmt.free();

    const hashedPassword = await bcrypt.hash(password, 12);

    db.run(
      'INSERT INTO users (firstName, lastName, username, password) VALUES (?, ?, ?, ?)',
      [String(firstName).trim(), String(lastName).trim(), normalizedUsername, hashedPassword]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const userId = idStmt.getAsObject().id;
    idStmt.free();

    saveDB();

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      token,
      user: {
        id: userId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        username: normalizedUsername,
        role: 'user',
        isPremium: false
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([String(username).trim()]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account blocked' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        isPremium: !!user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        monthlyUsage: user.monthlyUsage,
        usageCount: user.usageCount,
        businessId: user.businessId
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  if (isAdminUser(req.user)) {
    return res.json({
      user: {
        id: 0,
        username: ADMIN_USER,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'SharqTech'
      }
    });
  }

  return res.json({
    user: {
      id: req.user.id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      username: req.user.username,
      role: req.user.role,
      isPremium: !!req.user.isPremium,
      premiumExpiresAt: req.user.premiumExpiresAt,
      monthlyUsage: req.user.monthlyUsage,
      usageCount: req.user.usageCount,
      businessId: req.user.businessId
    }
  });
});

app.post('/api/analyze/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const limitCheck = enforceMonthlyLimit(req.user);
    if (limitCheck.blocked) {
      safeUnlink(req.file.path);
      return res.status(403).json({
        error: 'Monthly limit reached (5 analyses)',
        upgradeRequired: true,
        used: limitCheck.monthlyUsage,
        limit: limitCheck.limit
      });
    }

    const text = await parseFileToText(req.file.path, req.file.mimetype);
    safeUnlink(req.file.path);

    if (!String(text || '').trim()) {
      return res.status(400).json({
        error: "Could not extract text from file. Faylni o'qib bo'lmadi yoki matn topilmadi."
      });
    }

    const lang = req.body.lang || 'uz';
    const requestedJurisdiction = normalizeJurisdictionInput(req.body.jurisdiction, lang);
    const detection = detectJurisdictionFromText(text, lang);

    const jurisdictionMeta = {
      jurisdiction: requestedJurisdiction,
      suggestedJurisdiction: detection.suggestedJurisdiction,
      jurisdictionConfidence: detection.confidence,
      jurisdictionSignals: detection.signals
    };

    const result = await analyzeWithAI(text, lang, jurisdictionMeta);

    db.run(
      'INSERT INTO analyses (userId, type, inputText, fileName, result) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'file', text, req.file.originalname, JSON.stringify(result)]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const analysisId = idStmt.getAsObject().id;
    idStmt.free();

    const { now, monthlyUsage } = getUserUsageState(req.user);
    incrementUserUsage(req.user.id, monthlyUsage, now);
    saveDB();

    return res.json({
      id: analysisId,
      result,
      ...buildUsageResponse(req.user, monthlyUsage)
    });
  } catch (error) {
    if (req.file?.path) safeUnlink(req.file.path);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze/camera', auth, async (req, res) => {
  let tempPath = '';

  try {
    const { image, lang = 'uz', jurisdiction } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data required' });
    }

    const limitCheck = enforceMonthlyLimit(req.user);
    if (limitCheck.blocked) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        upgradeRequired: true,
        used: limitCheck.monthlyUsage,
        limit: limitCheck.limit
      });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    tempPath = path.join(ensureUploadsDir(), `camera-${Date.now()}.png`);
    fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));

    const text = await parseFileToText(tempPath, 'image/png');
    safeUnlink(tempPath);
    tempPath = '';

    if (!String(text || '').trim()) {
      return res.status(400).json({ error: 'Could not extract text from image' });
    }

    const requestedJurisdiction = normalizeJurisdictionInput(jurisdiction, lang);
    const detection = detectJurisdictionFromText(text, lang);

    const jurisdictionMeta = {
      jurisdiction: requestedJurisdiction,
      suggestedJurisdiction: detection.suggestedJurisdiction,
      jurisdictionConfidence: detection.confidence,
      jurisdictionSignals: detection.signals
    };

    const result = await analyzeWithAI(text, lang, jurisdictionMeta);

    db.run(
      'INSERT INTO analyses (userId, type, inputText, fileName, result) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'camera', text, 'camera-capture.png', JSON.stringify(result)]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const analysisId = idStmt.getAsObject().id;
    idStmt.free();

    const { now, monthlyUsage } = getUserUsageState(req.user);
    incrementUserUsage(req.user.id, monthlyUsage, now);
    saveDB();

    return res.json({
      id: analysisId,
      result,
      ...buildUsageResponse(req.user, monthlyUsage)
    });
  } catch (error) {
    if (tempPath) safeUnlink(tempPath);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze', auth, async (req, res) => {
  try {
    const { text, type = 'text', url, lang = 'uz', jurisdiction } = req.body;

    if (!text && !url) {
      return res.status(400).json({ error: 'Text or URL required' });
    }

    if (type === 'url') {
      if (!url || !isValidHttpUrl(url)) {
        return res.status(400).json({ error: 'Valid URL required' });
      }

      const { unlimited, business, premium } = getUsageMeta(req.user);
      if (!unlimited && !business && !premium) {
        return res.status(403).json({ error: 'URL analysis requires Premium' });
      }
    }

    const limitCheck = enforceMonthlyLimit(req.user);
    if (limitCheck.blocked) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        upgradeRequired: true,
        used: limitCheck.monthlyUsage,
        limit: limitCheck.limit
      });
    }

    let inputText = String(text || '').trim();

    if (url) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          maxContentLength: 2 * 1024 * 1024,
          headers: { 'User-Agent': 'ClausegAI/1.0' }
        });

        const $ = cheerio.load(response.data);
        $('script, style, nav, footer, header, noscript').remove();
        inputText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
      } catch (e) {
        console.error('URL fetch error:', e.message);
        return res.status(400).json({ error: 'Could not fetch URL content' });
      }
    }

    if (!inputText) {
      return res.status(400).json({ error: 'No readable text found for analysis' });
    }

    const requestedJurisdiction = normalizeJurisdictionInput(jurisdiction, lang);
    const detection = detectJurisdictionFromText(inputText, lang);

    const jurisdictionMeta = {
      jurisdiction: requestedJurisdiction,
      suggestedJurisdiction: detection.suggestedJurisdiction,
      jurisdictionConfidence: detection.confidence,
      jurisdictionSignals: detection.signals
    };

    const result = await analyzeWithAI(inputText, lang, jurisdictionMeta);

    db.run(
      'INSERT INTO analyses (userId, type, inputText, url, result) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, type, inputText, url || null, JSON.stringify(result)]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const analysisId = idStmt.getAsObject().id;
    idStmt.free();

    const { now, monthlyUsage } = getUserUsageState(req.user);
    incrementUserUsage(req.user.id, monthlyUsage, now);
    saveDB();

    return res.json({
      id: analysisId,
      result,
      ...buildUsageResponse(req.user, monthlyUsage)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/extract-text/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const text = await parseFileToText(req.file.path, req.file.mimetype);
    safeUnlink(req.file.path);

    if (!String(text || '').trim()) {
      return res.status(400).json({ error: 'Fayldan matn ajratib bo‘lmadi' });
    }

    return res.json({
      success: true,
      fileName: req.file.originalname,
      extractedText: String(text).trim(),
      charCount: String(text).trim().length
    });
  } catch (error) {
    if (req.file?.path) safeUnlink(req.file.path);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/analyze/history', auth, (req, res) => {
  const stmt = db.prepare(
    'SELECT id, type, fileName, url, result, createdAt FROM analyses WHERE userId = ? ORDER BY createdAt DESC LIMIT 50'
  );
  stmt.bind([req.user.id]);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    try {
      row.result = JSON.parse(row.result);
    } catch {}
    results.push(row);
  }

  stmt.free();
  res.json(results);
});

app.get('/api/analyze/:id', auth, (req, res) => {
  const stmt = db.prepare('SELECT * FROM analyses WHERE id = ? AND (userId = ? OR ? = 1)');
  const isAdmin = isAdminUser(req.user);
  stmt.bind([req.params.id, req.user.id, isAdmin ? 1 : 0]);

  if (stmt.step()) {
    const analysis = stmt.getAsObject();
    stmt.free();
    try {
      analysis.result = JSON.parse(analysis.result);
    } catch {}
    return res.json(analysis);
  }

  stmt.free();
  return res.status(404).json({ error: 'Not found' });
});

app.get('/api/users/profile', auth, (req, res) => {
  if (isAdminUser(req.user)) {
    return res.json({
      id: 0,
      username: ADMIN_USER,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'SharqTech',
      isPremium: true
    });
  }

  const user = { ...req.user };
  delete user.password;
  user.isPremium = !!user.isPremium;
  return res.json(user);
});

app.get('/api/config/jurisdictions', (req, res) => {
  res.json({
    languages: Object.keys(LANGUAGE_NAMES).map((code) => ({
      code,
      label: LANGUAGE_NAMES[code],
      defaultJurisdiction: getDefaultJurisdiction(code)
    })),
    jurisdictions: Object.entries(JURISDICTION_CONFIG).map(([key, value]) => ({
      key,
      ...value
    }))
  });
});

app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  try {
    const totalUsers = getScalar('SELECT COUNT(*) as count FROM users');
    const premiumUsers = getScalar("SELECT COUNT(*) as count FROM users WHERE isPremium = 1");
    const businessUsers = getScalar("SELECT COUNT(*) as count FROM users WHERE role = 'business'");
    const blockedUsers = getScalar('SELECT COUNT(*) as count FROM users WHERE isBlocked = 1');
    const totalAnalyses = getScalar('SELECT COUNT(*) as count FROM analyses');
    const organizationCodes = getScalar('SELECT COUNT(*) as count FROM organization_codes');

    const today = new Date().toISOString().slice(0, 10);
    const analysesToday = getScalar(
      `SELECT COUNT(*) as count FROM analyses WHERE date(createdAt) = '${today}'`
    );

    return res.json({
      totalUsers,
      premiumUsers,
      businessUsers,
      blockedUsers,
      totalAnalyses,
      analysesToday,
      organizationCodes
    });
  } catch {
    return res.json({
      totalUsers: 0,
      premiumUsers: 0,
      businessUsers: 0,
      blockedUsers: 0,
      totalAnalyses: 0,
      analysesToday: 0,
      organizationCodes: 0
    });
  }
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const stmt = db.prepare(
    'SELECT id, firstName, lastName, username, role, isPremium, premiumExpiresAt, businessId, usageCount, monthlyUsage, isBlocked, createdAt FROM users ORDER BY createdAt DESC'
  );

  const users = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    row.isPremium = !!row.isPremium;
    row.isBlocked = !!row.isBlocked;
    users.push(row);
  }

  stmt.free();
  return res.json({ users, total: users.length });
});

app.post('/api/admin/users/:id/premium', auth, adminOnly, (req, res) => {
  const { duration, isBusiness } = req.body;
  const userId = parseInt(req.params.id, 10);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  if (isBusiness) {
    db.run(
      'UPDATE users SET role = ?, businessId = ?, isPremium = 0, premiumExpiresAt = NULL WHERE id = ?',
      ['business', generateBusinessId('BIZ'), userId]
    );
  } else {
    const days = Number(duration) || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    db.run(
      'UPDATE users SET isPremium = 1, premiumExpiresAt = ?, role = ?, businessId = NULL WHERE id = ?',
      [expiresAt, 'user', userId]
    );
  }

  saveDB();
  return res.json({ message: 'Premium activated' });
});

app.post('/api/admin/users/:id/block', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  db.run('UPDATE users SET isBlocked = 1 WHERE id = ?', [userId]);
  saveDB();
  return res.json({ message: 'User blocked' });
});

app.post('/api/admin/users/:id/unblock', auth, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  db.run('UPDATE users SET isBlocked = 0 WHERE id = ?', [userId]);
  saveDB();
  return res.json({ message: 'User unblocked' });
});

app.get('/api/admin/promo', auth, adminOnly, (req, res) => {
  const stmt = db.prepare('SELECT * FROM promo_codes ORDER BY createdAt DESC');
  const promos = [];
  while (stmt.step()) promos.push(stmt.getAsObject());
  stmt.free();
  return res.json(promos);
});

app.post('/api/admin/promo', auth, adminOnly, (req, res) => {
  const { code, duration, usageLimit, expiresAt } = req.body;

  if (!duration || !expiresAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let normalizedCode = String(code || '').toUpperCase().trim();
  if (!normalizedCode) {
    normalizedCode = generateUniqueCode('promo_codes', 'PROMO');
  } else if (codeExists('promo_codes', normalizedCode)) {
    return res.status(400).json({ error: 'Promo code already exists' });
  }

  db.run(
    'INSERT INTO promo_codes (code, discount, duration, usageLimit, expiresAt) VALUES (?, ?, ?, ?, ?)',
    [normalizedCode, 100, Number(duration), Number(usageLimit) || 1, expiresAt]
  );

  saveDB();
  return res.json({ message: 'Promo code created', code: normalizedCode });
});

app.delete('/api/admin/promo/:code', auth, adminOnly, (req, res) => {
  db.run('DELETE FROM promo_codes WHERE code = ?', [String(req.params.code).toUpperCase().trim()]);
  saveDB();
  return res.json({ message: 'Promo code deleted' });
});

app.get('/api/admin/organization-codes', auth, adminOnly, (req, res) => {
  const stmt = db.prepare('SELECT * FROM organization_codes ORDER BY createdAt DESC');
  const codes = [];
  while (stmt.step()) codes.push(stmt.getAsObject());
  stmt.free();
  return res.json(codes);
});

app.post('/api/admin/organization-codes', auth, adminOnly, (req, res) => {
  const { code, organizationName, planType = 'business', seatLimit, duration, expiresAt } = req.body;

  if (!organizationName || !seatLimit || !duration || !expiresAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let normalizedCode = String(code || '').toUpperCase().trim();
  if (!normalizedCode) {
    normalizedCode = generateUniqueCode('organization_codes', 'ORG');
  } else if (codeExists('organization_codes', normalizedCode)) {
    return res.status(400).json({ error: 'Organization code already exists' });
  }

  const businessId = generateBusinessId(planType === 'government' ? 'GOV' : 'ORG');

  db.run(
    `INSERT INTO organization_codes
      (code, organizationName, planType, seatLimit, usedSeats, duration, expiresAt, isActive, businessId)
     VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?)`,
    [
      normalizedCode,
      String(organizationName).trim(),
      String(planType).trim(),
      Number(seatLimit),
      Number(duration),
      expiresAt,
      businessId
    ]
  );

  saveDB();
  return res.json({
    message: 'Organization code created',
    code: normalizedCode,
    businessId
  });
});

app.delete('/api/admin/organization-codes/:code', auth, adminOnly, (req, res) => {
  db.run('DELETE FROM organization_codes WHERE code = ?', [
    String(req.params.code).toUpperCase().trim()
  ]);
  saveDB();
  return res.json({ message: 'Organization code deleted' });
});

app.post('/api/promo/apply', auth, (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: 'Promo code required' });
  }

  const stmt = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND isActive = 1');
  stmt.bind([code]);

  if (!stmt.step()) {
    stmt.free();
    return res.status(400).json({ error: 'Invalid promo code' });
  }

  const promo = stmt.getAsObject();
  stmt.free();

  if (new Date() > new Date(promo.expiresAt)) {
    return res.status(400).json({ error: 'Promo code expired' });
  }

  if (promo.usedCount >= promo.usageLimit) {
    return res.status(400).json({ error: 'Promo code limit reached' });
  }

  const expiresAt = new Date(
    Date.now() + Number(promo.duration) * 24 * 60 * 60 * 1000
  ).toISOString();

  db.run(
    'UPDATE users SET isPremium = 1, premiumExpiresAt = ?, role = ?, businessId = NULL WHERE id = ?',
    [expiresAt, 'user', req.user.id]
  );
  db.run('UPDATE promo_codes SET usedCount = usedCount + 1 WHERE id = ?', [promo.id]);

  saveDB();

  return res.json({
    message: 'Premium activated!',
    premiumExpiresAt: expiresAt,
    duration: promo.duration
  });
});

app.post('/api/organization/apply', auth, (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();

  if (!code) {
    return res.status(400).json({ error: 'Organization code required' });
  }

  const stmt = db.prepare('SELECT * FROM organization_codes WHERE code = ? AND isActive = 1');
  stmt.bind([code]);

  if (!stmt.step()) {
    stmt.free();
    return res.status(400).json({ error: 'Invalid organization code' });
  }

  const org = stmt.getAsObject();
  stmt.free();

  if (new Date() > new Date(org.expiresAt)) {
    return res.status(400).json({ error: 'Organization code expired' });
  }

  if (Number(org.usedSeats) >= Number(org.seatLimit)) {
    return res.status(400).json({ error: 'Seat limit reached' });
  }

  if (req.user.businessId && req.user.businessId === org.businessId) {
    return res.status(400).json({ error: 'User already linked to this organization' });
  }

  if (req.user.role === 'business' && req.user.businessId && req.user.businessId !== org.businessId) {
    return res.status(400).json({ error: 'User already linked to another organization' });
  }

  db.run(
    'UPDATE users SET role = ?, businessId = ?, isPremium = 0, premiumExpiresAt = NULL WHERE id = ?',
    ['business', org.businessId, req.user.id]
  );

  db.run('UPDATE organization_codes SET usedSeats = usedSeats + 1 WHERE id = ?', [org.id]);

  saveDB();

  return res.json({
    message: 'Organization access activated',
    organizationName: org.organizationName,
    businessId: org.businessId,
    planType: org.planType
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: !!db
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initDB()
  .then(() => {
    ensureUploadsDir();
    console.log('✅ Database initialized');

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('❌ Database error:', err);
    if (!process.env.VERCEL) process.exit(1);
  });

module.exports = app;