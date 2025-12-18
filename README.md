# Online Okul Sistemi (Online Eğitim Platformu)

Modern bir online eğitim platformu. Öğrenciler kursları görüntüleyebilir, kayıt olabilir ve öğretmenler kurs oluşturabilir.

## Teknolojiler

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT (Authentication)
- bcryptjs (Şifre hashleme)

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)
- Bootstrap 5
- Font Awesome

## Özellikler

### Genel
- ✅ Kullanıcı kayıt ve giriş sistemi
- ✅ Rol bazlı yetkilendirme (Öğrenci, Öğretmen, Admin)
- ✅ Kurs listeleme ve detay görüntüleme
- ✅ Kurslara kayıt olma
- ✅ Kullanıcı profili
- ✅ Responsive tasarım

### Admin Özellikleri
- ✅ Dashboard (İstatistikler ve genel bakış)
- ✅ Kullanıcı yönetimi (Rol değiştirme, banlama)
- ✅ Kurs onay sistemi
- ✅ Kategori yönetimi
- ✅ Duyuru sistemi

### Öğretmen Özellikleri
- ✅ Öğretmen dashboard'u
- ✅ Kurs oluşturma ve düzenleme
- ✅ Taslak/Onay sistemi
- ✅ Öğrenci takibi ve ilerleme analizi
- ✅ Soru-cevap sistemi
- ✅ Kurs duyuruları
- ✅ Gelir analizi

### Öğrenci Özellikleri
- ✅ Öğrenci dashboard'u
- ✅ Gelişmiş kurs arama ve filtreleme
- ✅ Kurs detay sayfaları
- ✅ Kurs kayıt sistemi
- ✅ İnteraktif ders izleme
- ✅ İlerleme takibi ve tamamlama
- ✅ Soru-cevap sistemi
- ✅ Kurs değerlendirme ve yorum
- ✅ Kişiselleştirilmiş öneriler
- ✅ Video tabanlı öğrenme

## Kurulum

### Backend Kurulumu

1. Backend klasörüne gidin:
```bash
cd backend
```

2. Gerekli paketleri yükleyin:
```bash
npm install
```

3. `.env` dosyasını düzenleyin:
```
PORT=5000
MONGODB_URL=mongodb://localhost:27017/online-okul
JWT_SECRET=your_jwt_secret_key_here
```

4. MongoDB'nin çalıştığından emin olun

5. Sunucuyu başlatın:
```bash
npm run dev
```

Backend http://localhost:5000 adresinde çalışacaktır.

### Frontend Kurulumu

1. Frontend klasöründeki `index.html` dosyasını bir tarayıcıda açın
2. Veya Live Server gibi bir araç kullanın

## API Endpoints

### Authentication
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi

### Courses
- `GET /api/courses` - Tüm kursları listele
- `GET /api/courses/:id` - Belirli bir kursu getir
- `POST /api/courses` - Yeni kurs oluştur (Öğretmen/Admin)
- `POST /api/courses/:id/enroll` - Kursa kayıt ol
- `POST /api/courses/:id/complete-lesson` - Ders tamamla
- `POST /api/courses/:id/ask-question` - Soru sor

### Student
- `GET /api/student/dashboard` - Öğrenci dashboard'u
- `GET /api/student/search` - Kurs arama ve filtreleme
- `GET /api/student/courses/:id` - Kurs detayı (öğrenci perspektifi)
- `GET /api/student/courses/:id/lesson/:lessonIndex` - Ders içeriği
- `POST /api/student/courses/:id/review` - Kurs değerlendir
- `GET /api/student/my-questions` - Öğrencinin soruları
- `GET /api/student/my-reviews` - Öğrencinin değerlendirmeleri
- `GET /api/student/recommendations` - Kurs önerileri

### Users
- `GET /api/users/profile` - Kullanıcı profilini getir
- `PUT /api/users/profile` - Profili güncelle
- `GET /api/users` - Tüm kullanıcıları listele (Admin)

### Admin
- `GET /api/admin/dashboard` - Admin dashboard istatistikleri
- `GET /api/admin/users` - Kullanıcı yönetimi
- `PUT /api/admin/users/:id/role` - Kullanıcı rolü değiştir
- `PUT /api/admin/users/:id/ban` - Kullanıcı banla/ban kaldır
- `GET /api/admin/courses/pending` - Bekleyen kurslar
- `PUT /api/admin/courses/:id/approve` - Kurs onayla/reddet
- `GET /api/admin/announcements` - Duyuru yönetimi

### Teacher
- `GET /api/teacher/dashboard` - Öğretmen dashboard'u
- `GET /api/teacher/courses` - Öğretmenin kursları
- `POST /api/teacher/courses` - Yeni kurs oluştur
- `PUT /api/teacher/courses/:id` - Kurs güncelle
- `PUT /api/teacher/courses/:id/submit` - Kursu onaya gönder
- `GET /api/teacher/courses/:id/students` - Kurs öğrencileri
- `GET /api/teacher/courses/:id/questions` - Kurs soruları
- `PUT /api/teacher/questions/:id/answer` - Soru yanıtla
- `POST /api/teacher/courses/:id/announcement` - Kurs duyurusu
- `GET /api/teacher/earnings` - Gelir analizi

## Kullanıcı Rolleri

- **Öğrenci**: Kursları görüntüleyebilir ve kayıt olabilir
- **Öğretmen**: Kurs oluşturabilir ve yönetebilir
- **Admin**: Tüm yetkilere sahip

## Geliştirme Notları

- Backend port: 5000
- CORS aktif (Frontend ile iletişim için)
- JWT token 7 gün geçerli
- Şifreler bcrypt ile hashlenmiş

## Sonraki Adımlar

- [ ] Video yükleme sistemi
- [ ] Ders içerikleri yönetimi
- [ ] Quiz ve sınav sistemi
- [ ] Sertifika oluşturma
- [ ] Ödeme entegrasyonu
- [ ] Canlı ders sistemi
- [ ] Forum/Yorum sistemi

## Lisans

MIT