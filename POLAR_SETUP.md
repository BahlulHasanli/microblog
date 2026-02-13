# Polar Dəstək Sistemi - Setup Təlimatları

## 1. Verilənlər Bazası Migrasiyaları

Aşağıdakı SQL fayllarını Supabase SQL Editor-də icra edin:

### 1.1. Support Me cədvəlini yarat
```bash
migrations/create_support_me_table.sql
```

### 1.2. Users cədvəlinə polar_customer_id əlavə et
```bash
migrations/add_polar_customer_id_to_users.sql
```

## 2. Environment Dəyişənləri

`.env` faylınıza aşağıdakı dəyişənləri əlavə edin:

```env
# Polar Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_SUCCESS_URL=https://the99.az/notes/
```

## 3. Polar Webhook Konfigurasiyası

### 3.1. Webhook URL
Polar dashboard-da webhook URL-ni konfiqurasiya edin:
```
https://the99.az/api/polar/webhook
```

### 3.2. Webhook Events
Aşağıdakı event-ləri aktivləşdirin:
- `checkout.completed`
- `checkout.updated`

### 3.3. Webhook Testing
Local development üçün ngrok və ya Cloudflare Tunnel istifadə edə bilərsiniz:

```bash
# ngrok ilə
ngrok http 4321

# Sonra Polar-da webhook URL-ni yeniləyin:
# https://your-ngrok-url.ngrok.io/api/polar/webhook
```

## 4. Polar Product Konfigurasiyası

### 4.1. Product Yaradın
Polar dashboard-da yeni product yaradın və product ID-ni əldə edin.

### 4.2. Product ID-ni Yeniləyin
`src/layouts/BlogLayout.astro` faylında product ID-ni yeniləyin:

```astro
href={`/api/polar/checkout?products=YOUR_PRODUCT_ID&metadata[author_id]=...`}
```

## 5. İş Axını

### 5.1. İstifadəçi Dəstək Olmaq İstəyir
1. İstifadəçi "Dəstək ol" düyməsinə klikləyir
2. Əgər login olmayıbsa → `/login` səhifəsinə yönləndirilir
3. Əgər login olubsa → Polar checkout səhifəsinə yönləndirilir

### 5.2. Polar Checkout
1. İstifadəçi ödəniş məlumatlarını daxil edir
2. Ödəniş uğurlu olur
3. Polar webhook göndərir → `/api/polar/webhook`

### 5.3. Webhook İşləmə
1. Webhook checkout məlumatlarını qəbul edir
2. `metadata.author_id`-dən author UUID-ni alır
3. `customer_email`-dən supporter UUID-ni tapır
4. `support_me` cədvəlinə qeyd əlavə edir
5. `polar_customer_id`-ni users cədvəlinə yazır

## 6. Məlumat Strukturu

### 6.1. Support Me Cədvəli
```sql
{
  id: uuid,
  supporter_id: uuid,         -- Dəstək edən istifadəçi (users.id)
  author_id: uuid,            -- Dəstək alan yazıçı (users.id)
  amount: decimal,            -- Məbləğ
  currency: varchar,          -- Valyuta (USD, EUR, və s.)
  polar_checkout_id: varchar, -- Polar checkout ID
  polar_customer_id: varchar, -- Polar customer ID
  status: varchar,            -- pending, completed, failed
  metadata: jsonb,            -- Əlavə məlumatlar
  created_at: timestamp,
  updated_at: timestamp
}
```

### 6.2. Checkout URL Parametrləri
```
/api/polar/checkout?
  products=PRODUCT_ID&
  metadata[author_id]=AUTHOR_UUID
```

- `products`: Polar product ID
- `metadata[author_id]`: Dəstək alan yazıçının UUID-si (users.id)

**Qeyd**: İstifadəçinin email-i Polar tərəfindən avtomatik olaraq `customer_email` kimi göndərilir.

## 7. Polar-da Metadata Görünməsi

Polar-da checkout zamanı göndərilən məlumatlar:
- `customer_email`: İstifadəçinin email-i (avtomatik)
- `metadata.author_id`: Dəstək alan yazıçının UUID-si

Bu məlumatlar Polar dashboard-da hər checkout üçün görünəcək və webhook-da əlçatan olacaq.

## 8. Test Etmək

### 8.1. Local Test
```bash
# Dev server-i işə salın
bun run dev

# Başqa terminal-da ngrok-u işə salın
ngrok http 4321

# Polar webhook URL-ni yeniləyin
```

### 8.2. Test Checkout
1. Login olun
2. Bir yazıya daxil olun
3. "Dəstək ol" düyməsinə klikləyin
4. Test card ilə ödəniş edin:
   - Card: 4242 4242 4242 4242
   - Expiry: Gələcək tarix
   - CVC: İstənilən 3 rəqəm

### 8.3. Webhook Yoxlama
```bash
# Supabase-də support_me cədvəlini yoxlayın
SELECT * FROM support_me ORDER BY created_at DESC LIMIT 10;
```

## 9. Troubleshooting

### 9.1. Webhook İşləmir
- Polar dashboard-da webhook URL-ni yoxlayın
- Webhook logs-a baxın
- Server logs-a baxın: `console.log` çıxışları

### 9.2. Support Qeydi Yaranmır
- `metadata[author_id]` düzgün göndərilir?
- İstifadəçi verilənlər bazasında var (email ilə)?
- Webhook-da error var?
- Supabase logs-da xəta var?

### 9.3. Login Redirect İşləmir
- Cookie-lər düzgün qurulub?
- `/login` səhifəsi mövcuddur?

## 10. Production Deployment

### 10.1. Environment Variables
Production `.env` faylında:
```env
POLAR_ACCESS_TOKEN=polar_live_...
POLAR_SUCCESS_URL=https://the99.az/notes/
```

### 10.2. Webhook URL
Production webhook URL:
```
https://the99.az/api/polar/webhook
```

### 10.3. SSL Certificate
HTTPS tələb olunur (Polar webhook üçün).

## 11. Təhlükəsizlik

- ✅ RLS (Row Level Security) aktivdir
- ✅ Yalnız login olmuş istifadəçilər dəstək edə bilər
- ✅ Webhook POST request-ləri qəbul edir
- ✅ Supabase Admin client istifadə olunur (webhook üçün)
- ⚠️ Webhook signature verification əlavə edilməlidir (production üçün)

## 12. Gələcək Təkmilləşdirmələr

- [ ] Webhook signature verification
- [ ] Email bildirişləri (dəstək alındıqda)
- [ ] Dəstək statistikaları səhifəsi
- [ ] Dəstək edənlərin siyahısı
- [ ] Recurring support (aylıq dəstək)
