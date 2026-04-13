const express = require('express');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/apply', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Promo code required' });
    }

    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });
    
    if (!promo) {
      return res.status(400).json({ error: 'Invalid promo code' });
    }

    if (new Date() > promo.expiresAt) {
      return res.status(400).json({ error: 'Promo code expired' });
    }

    if (promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ error: 'Promo code limit reached' });
    }

    const user = await User.findById(req.user._id);
    
    user.isPremium = true;
    user.premiumExpiresAt = new Date(Date.now() + promo.duration * 24 * 60 * 60 * 1000);
    await user.save();

    promo.usedCount += 1;
    await promo.save();

    res.json({ 
      message: 'Premium activated!',
      premiumExpiresAt: user.premiumExpiresAt,
      duration: promo.duration
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
