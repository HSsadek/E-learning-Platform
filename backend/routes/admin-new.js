const express = require('express');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

console.log('🆕 Yeni admin routes yüklendi!');

// Test route
router.get('/test', (req, res) => {
    console.log('🧪 Yeni admin test route çağrıldı!');
    res.json({ message: 'Yeni admin test çalışıyor!' });
});

// Kullanıcı getir
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        console.log('👤 Kullanıcı getiriliyor, ID:', req.params.id);
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            console.log('❌ Kullanıcı bulunamadı');
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        
        console.log('✅ Kullanıcı bulundu:', user.name);
        res.json(user);
    } catch (error) {
        console.error('💥 Hata:', error);
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

module.exports = router;