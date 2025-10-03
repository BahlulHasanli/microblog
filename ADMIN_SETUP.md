# Admin Panel Quraşdırma Təlimatı

## 1. Database Migration

Supabase dashboard-a daxil olun və aşağıdakı SQL sorğusunu icra edin:

```sql
-- Users cədvəlinə is_admin sahəsi əlavə et
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
```

## 2. İlk Admin İstifadəçi Yaratma

Öz email ünvanınızı admin etmək üçün:

```sql
UPDATE users SET is_admin = true WHERE email = 'sizin-email@example.com';
```

## 3. Admin Panel-ə Giriş

Admin panelə daxil olmaq üçün:
- Sayta giriş edin
- `/admin` səhifəsinə keçin
- Yalnız admin hüququ olan istifadəçilər bu səhifəyə daxil ola bilər

## 4. Xüsusiyyətlər

### Postlar Bölməsi:
- **Filtr**: Hamısı / Gözləyən / Təsdiqlənmiş
- **Təsdiq et**: Pending statusdakı postları təsdiq et
- **Edit**: Postu redaktə et (edit-post səhifəsinə yönləndirir)
- **Sil**: Postu database-dən və MDX faylını sil

### İstifadəçilər Bölməsi:
- **Edit**: İstifadəçi məlumatlarını redaktə et (ad, email, username, admin hüququ)
- **Sil**: İstifadəçini sil

## 5. Post Yaratma Prosesi

1. İstifadəçi yeni post yaradır
2. Post MDX faylı kimi `approved: false` ilə yaradılır
3. Post admin paneldə **Gözləyən** bölməsində görünür
4. Admin postu təsdiq edəndən sonra MDX faylında `approved: true` olur
5. Yalnız `approved: true` olan postlar ana səhifədə göstərilir

## 6. Texniki Detallar

- **Post statusu**: MDX faylının frontmatter-ində `approved` sahəsi ilə idarə olunur
- **Database**: Yalnız `users` cədvəlində `is_admin` sahəsi lazımdır
- **Postlar**: MDX faylları kimi `src/content/posts` qovluğunda saxlanılır
- **Təhlükəsizlik**: Admin API endpoint-ləri `requireAdmin` middleware ilə qorunur
