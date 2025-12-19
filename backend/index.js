const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Express uygulaması oluşturma 
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5501', 'http://127.0.0.1:5501'],
    credentials: true
}));
app.use(express.json());

// Tüm istekleri logla
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

// Uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static dosyalar için uploads klasörünü serve et
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Sadece resim dosyalarına izin ver
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Temel route 
app.get('/', (req, res) => {
    console.log('🏠 Root route çağrıldı!');
    res.send('Online Okul Sistemi Backend Çalışıyor');
});

// Test route
app.get('/test', (req, res) => {
    console.log('🧪 Direct test route çağrıldı!');
    res.json({ message: 'Direct test çalışıyor!' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));

// Sunucu başlat 
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başlatıldı.`);
});


