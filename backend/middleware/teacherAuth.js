const jwt = require('jsonwebtoken');

const teacherAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Öğretmen veya admin kontrolü (pending_teacher erişemez)
        if (decoded.role !== 'teacher' && decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için onaylanmış öğretmen yetkisi gereklidir.' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Geçersiz token' });
    }
};

module.exports = teacherAuth;