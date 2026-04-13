const express = require('express');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const Analysis = require('../models/Analysis');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(auth, adminOnly);

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/premium', async (req, res) => {
  try {
    const { duration, isBusiness = false } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (isBusiness) {
      user.role = 'business';
      user.businessId = 'BIZ-' + Date.now();
    } else {
      user.isPremium = true;
      user.premiumExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }

    await user.save();
    res.json({ message: 'Premium activated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    ).select('-password');
    
    res.json({ message: 'User blocked', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password');
    
    res.json({ message: 'User unblocked', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const businessUsers = await User.countDocuments({ role: 'business' });
    const totalAnalyses = await Analysis.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analysesToday = await Analysis.countDocuments({ createdAt: { $gte: today } });

    res.json({
      totalUsers,
      premiumUsers,
      blockedUsers,
      businessUsers,
      totalAnalyses,
      analysesToday
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/promo', async (req, res) => {
  try {
    const { code, discount, duration, usageLimit, expiresAt } = req.body;
    
    const promo = new PromoCode({
      code: code.toUpperCase(),
      discount,
      duration,
      usageLimit,
      expiresAt: new Date(expiresAt)
    });
    
    await promo.save();
    res.status(201).json(promo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/promo', async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/promo/:code', async (req, res) => {
  try {
    await PromoCode.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ message: 'Promo code deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
