const express = require('express');
const router = express.Router();

console.log('🧪 Admin-test routes yüklendi!');

router.get('/test', (req, res) => {
    console.log('🎯 Admin-test route çağrıldı!');
    res.json({ message: 'Admin-test çalışıyor!' });
});

module.exports = router;