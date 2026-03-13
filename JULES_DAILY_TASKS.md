# Jules üçün Gündəlik Tapşırıqlar (Daily Tasks for Jules)

Bu sənəd Layihənin Xüsusiyyətlər Siyahısına (Features List) əsaslanaraq Agent (Jules) tərəfindən idarəolunacaq, kodlanacaq və Github Issues olaraq açıla biləcək gündəlik tapşırıq planıdır.

Hər tapşırıq (task) mövcud arxitekturaya (Astro, Svelte, Tailwind v4, Supabase) uyğunlaşdırılıb və məntiqi olaraq kiçik PR-lara bölünməyə hazırdır.

---

## 📅 Həftə 1: Əsas Modulların Təkmilləşdirilməsi və Performans

### Gün 1: İstifadəçi İdarəetməsi və Təhlükəsizlik
- **Mövzu:** İstifadəçi güvənliyinin və təcrübəsinin artırılması.
- **Tapşırıqlar (Tasks):**
  1. [ ] Supabase Auth üzərindən istifadəçilər qeydiyyatdan keçdikdən sonra "Email Təsdiqi" (Email Verification) məntiqinin aktivləşdirilməsi.
  2. [ ] İstifadəçilər arası "Bloklama" (Block User) xüsusiyyətinin yaradılması (Timeline və Şərhlərdə bloklanan istifadəçinin gizlədilməsi).
  3. [ ] Profil səhifəsində istifadəçi tərəfindən şifrə dəyişmə interfeysinin yazılması.

### Gün 2: Bildirişlər Sistemi (Notification Center)
- **Mövzu:** İstifadəçi aktivliyini artırmaq üçün in-app bildirişlər.
- **Tapşırıqlar:**
  1. [ ] `notifications` table-ın yaradılması (Supabase Migration: user_id, type (like, comment, mention), read_status).
  2. [ ] Headers/Naviqasiya panelində bildiriş (🔔) ikonunun və drop-down komponentinin (Svelte) əlavə edilməsi.
  3. [ ] Paylaşım və ya Məqaləyə şərh yazıldıqda müəllifə bildiriş yaradan API tetikleyicisinin (Trigger/Webhook) yazılması.

### Gün 3: Axtarış və Kəşf (Search & Discovery)
- **Mövzu:** Platformadaxili qlobal axtarış funksiyası.
- **Tapşırıqlar:**
  1. [ ] Navbar üçün qlobal axtarış inputunun (Search Component) hazırlanması.
  2. [ ] API endpoint-nin yazılması: İstifadəçi adlarına (Users), Məqalə başlıqlarına (Posts) və Paylaşımlara (Shares) görə ortaq axtarış.
  3. [ ] Axtarış nəticəsi səhifəsinin (`/search?q=...`) Astro/Svelte ilə dizayn edilib inteqrasiyası.

### Gün 4: Real-time (Canlı) Yenilənmələr
- **Mövzu:** Sosial media hissiyyatının artırılması.
- **Tapşırıqlar:**
  1. [ ] Supabase Realtime konfiqurasiyasının aktivləşdirilməsi (Shares və Comments table-ları üçün).
  2. [ ] `InfinitePostList.svelte` komponentində yeni paylaşım gəldikdə "Yeni paylaşımları gör" (Show new posts) bildirişinin göstərilməsi.
  3. [ ] Şərhlər bölməsində (@ShareDetail və Post details) başqası şərh yazarkən səhifəni yeniləmədən anında görünməsi.

### Gün 5: Məzmun Redaktoru Təkmilləşdirmələri (TipTap & Zəngin Mətn)
- **Mövzu:** Məqalə yazarlarının işini asanlaşdırmaq.
- **Tapşırıqlar:**
  1. [ ] Məqalə (Post) yazarkən avtomatik yaddaşlama (Auto-save draft) funksiyasının (Local Storage və ya DB vasitəsilə) əlavə edilməsi.
  2. [ ] Redaktor daxilində `@username` yazdıqda istifadəçini işarələmə (Mentions) extension-nun TipTap-a inteqrasiyası.
  3. [ ] Oxuma vaxtının (Estimated Read Time) hesablanıb məqalə başlığında göstərilməsi.

### Gün 6: KrossWordle Oyun İnkişafı
- **Mövzu:** Oyunun daha interaktiv və sosial edilməsi.
- **Tapşırıqlar:**
  1. [ ] KrossWordle nəticəsini ("Mən bu gün KrossWordle-u 5 cəhdə tapdım!") birbaşa Timeline-da Paylaşım (Share) olaraq yayımlamaq düyməsinin əlavə edilməsi.
  2. [ ] İstifadəçilər üçün gündəlik "Streak" (ardıcıl oynama sayı) məntiqinin DB-yə əlavə edilməsi.
  3. [ ] Oyunda çətinlik çəkənlər üçün "İpucu" (Hint) sisteminin yaradılması (Oyun başına maks. 1 hərf açma).

### Gün 7: Performans, Şəkillər və İzləmə (Optimization)
- **Mövzu:** Saytın sürətləndirilməsi və reklamların inkişafı.
- **Tapşırıqlar:**
  1. [ ] Astro SSR performansı üçün tez-tez girilən səhifələrin (məs. /about, /adv) keşlənmə (Cache-Control headers) nizamlamaları.
  2. [ ] Sponsor Bannerlərinin klik statistikasının Admin Paneldə qrafik (Chart) olaraq (məsələn: Chart.js və ya Recharts ilə) göstərilməsi.
  3. [ ] Şəkil yüklənənədək Skeleton loader-lərin Timeline-da optimizasiyası (mövcud Blurhash ilə paralel sıx optimizasiya).

---

## 🚀 Həftə 2: Yeni Xüsusiyyətlər və İcazələr

### Gün 8: Ziyarətçi Metrikaları və Analitika
- **Mövzu:** İstifadəçilərə və Adminlərə analiz vermək.
- **Tapşırıqlar:**
  1. [ ] `post_views` (məqalə baxışları) data cədvəlinin istifadəçi əsaslı (unique user) məntiqiylə sayılması.
  2. [ ] Admin panelin Statistika pəncərəsində "Ən çox oxunan postlar" və "Ən aktiv istifadəçilər" cədvəlinin yığılması.
  3. [ ] İstifadəçinin öz profilində "Mənim postlarımın ümumi baxış sayı" metrikasının nümayişi.

### Gün 9: Media və Video Oynadıcı Təkmilləşdirməsi
- **Mövzu:** Zəngin media hissiyyatı.
- **Tapşırıqlar:**
  1. [ ] Paylaşımlara (Shares) eyni anda birdən çox şəkil (Multi-image upload) dəstəyinin verilməsi (Qalereya komponentinin uyğunlaşdırılması).
  2. [ ] `VideoPlayer.svelte` (və MediaPlayer) daxilində PiP (Picture-in-Picture) rejiminin qoşulması.
  3. [ ] Timeline-da videoların səssiz, lakin scroll zamanı avto-play (Auto-play on scroll) olunması imkanı.

### Gün 10: Xüsusi Kolleksiyalar və Saxlanılanlar (Bookmarks)
- **Mövzu:** Məzmunun istifadəçi tərəfindən saxlanması.
- **Tapşırıqlar:**
  1. [ ] `bookmarks` table-ın yaradılması (user_id, item_id, item_type='post'|'share').
  2. [ ] Hər postun/paylaşımın yanında "Saxla" (Bookmark) ikonunun funksional edilməsi.
  3. [ ] İstifadəçi profilidə `/saved` tab-ı və saxlanılan məzmunların göstərilməsi üçün komponentin yığılması.

### Gün 11: Admin bulk (kütləvi) əməliyyatları
- **Mövzu:** Admin/Moderator işinin yüngülləşdirilməsi.
- **Tapşırıqlar:**
  1. [ ] Admin Paneldə Məqalələr tabında bir neçə məqaləni seçib eyni anda silmə / təsdiqləmə (Bulk actions).
  2. [ ] Şərhlərin idarə panelində "Spam kimi işarələ" funksionalı.
  3. [ ] Qeydiyyatdan keçmiş istifadəçi listini (UsersTab) CSV faylı olaraq export (yükləmə) imkanı.

### Gün 12: Mesajlaşma Sistemi (DMs) V1
- **Mövzu:** İstifadəçilərarası şəxsi əlaqə.
- **Tapşırıqlar:**
  1. [ ] `messages` table-ı: id, sender_id, receiver_id, content, is_read, created_at.
  2. [ ] İstifadəçinin profilində "Mesaj Göndər" (Send Message) düyməsinin vizual olaraq əlavəsi.
  3. [ ] /messages səhifəsində Sol paneldə söhbətlər (Chats), sağ paneldə mesajlaşma qutusunun Svelte ilə yığılması.

### Gün 13: UI/UX və Mikro-animasiyalar
- **Mövzu:** Veb app-in daha premium və canlı hiss etdirməsi.
- **Tapşırıqlar:**
  1. [ ] Hover edəndə düymələrdə, şəkillərdə rəvan böyümə/rəng dəyişmə kimi Tailwind v4 transition/animation-ların qüvvətləndirilməsi.
  2. [ ] Səhifə keçidlərində (Astro View Transitions) fərdiləşdirilmiş "Fade" və ya "Slide" animasiyasının tətbiqi.
  3. [ ] Dark Mode (Tünd mövzu) zamanı bəzi komponentlərin rəng kontrastının (Accessibility) re-faktorinqi.

### Gün 14: Testlər və Optimallaşdırma 
- **Mövzu:** Layihənin kod sabitliyi.
- **Tapşırıqlar:**
  1. [ ] GitHub Actions (və ya başqa bir CI) üçün `.github/workflows/ci.yml` yaradılması (Build və Linter yoxlanışı).
  2. [ ] Əsas kritik yolların (Giriş, Paylaşım etmə, Məqalə yazma) Playwright (və ya oxşar tool) ilə E2E testlərinin yazılması.
  3. [ ] Lazımsız və ya təkrar olunan kodların (Dead code elimination) tapılıb silinməsi.

---

## 🛠 Jules üçün Tövsiyələr (Agent Instructions)
- Bu tapşırıqları birbaşa GitHub Issue olaraq aça bilərsən.
- Hər issue-nu açarkən mərhələli inkişaf planı (`Steps to implement`) bölməsini daxil et.
- Tapşırıqlar bir-biri ilə inteqrasiyalıdır; DB miqrasiyasını həll etmədən API-yə və ya UI-a keçmə.
- Kod yazarkən mütləq olaraq `PROJECT_FEATURES.md`-də vurğulanan texnologiya arxitekturasına sadiq qal.
