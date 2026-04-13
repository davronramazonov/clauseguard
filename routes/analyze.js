const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const { auth } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

const checkUsage = async (user) => {
  const now = new Date();
  const lastDate = user.lastUsageDate;
  
  if (!lastDate || lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
    user.monthlyUsage = 0;
    user.lastUsageDate = now;
    await user.save();
  }

  if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now) {
    return { allowed: true, isPremium: true };
  }

  if (user.role === 'business') {
    return { allowed: true, isPremium: true };
  }

  if (user.monthlyUsage >= 5) {
    return { allowed: false, isPremium: false, message: 'Monthly limit reached' };
  }

  return { allowed: true, isPremium: false };
};

const analyzeWithAI = async (text, lang = 'uz') => {
  const prompt = `You are a legal document analyzer. Analyze the following text for potential risks, legal issues, and provide recommendations.

Language for response: ${lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English'}

Analyze this document and return a JSON object with the following structure:
{
  "hasRisks": boolean,
  "risks": [
    {
      "clause": "The problematic clause text",
      "level": "high|medium|low",
      "explanation": "Why this is risky in 1-2 sentences"
    }
  ],
  "laws": ["Relevant law articles/codes if applicable"],
  "recommendations": ["What actions the user should take"],
  "summary": "Brief overall summary of the document"
}

Document text:
${text}

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const candidates = response?.data?.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content) {
      const resultText = candidates[0].content.parts[0].text;
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    return {
      hasRisks: false,
      risks: [],
      laws: [],
      recommendations: [],
      summary: 'Could not parse AI response or response was empty'
    };
  } catch (error) {
    let errorMessage = error.message;
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message;
    }
    console.error('AI Analysis Error:', errorMessage);
    
    return {
      hasRisks: false,
      risks: [],
      laws: [],
      recommendations: [],
      summary: `Analysis failed: ${errorMessage}`
    };
  }
};

router.post('/', auth, async (req, res) => {
  try {
    const { text, type = 'text', fileName, url, lang = 'uz' } = req.body;
    
    if (!text && !fileName) {
      return res.status(400).json({ error: 'Text or file required' });
    }

    if (type === 'url' && !req.user.isPremium && req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'URL analysis requires Premium subscription' });
    }

    const usageCheck = await checkUsage(req.user);
    if (!usageCheck.allowed) {
      return res.status(403).json({ error: usageCheck.message, upgradeRequired: true });
    }

    const inputText = text || '';
    
    const analysisResult = await analyzeWithAI(inputText, lang);

    const analysis = new Analysis({
      userId: req.user._id,
      type,
      inputText,
      fileName,
      url,
      result: analysisResult
    });
    await analysis.save();

    req.user.monthlyUsage += 1;
    req.user.usageCount += 1;
    req.user.lastUsageDate = new Date();
    await req.user.save();

    res.json({
      id: analysis._id,
      result: analysisResult,
      usageRemaining: usageCheck.isPremium ? 'unlimited' : 5 - req.user.monthlyUsage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
