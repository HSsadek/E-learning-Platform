const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Admin kontrolü
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için admin yetkisi gereklidir.' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Geçersiz token' });
    }
};

module.exports = adminAuth;