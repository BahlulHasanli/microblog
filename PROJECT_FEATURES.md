# Microblog Layihəsinin Xüsusiyyətləri və Modulları (Features List)

Bu sənəd layihənin mövcud arxitekturasını, istifadə olunan texnologiyaları və aktiv modulları əhatə edir. Bu sənəd agentlər (məs. Jules) tərəfindən layihənin strukturunu anlamaq, gündəlik tapşırıqlar (tasks) yaratmaq və idarə etmək üçün istifadə oluna bilər.

## 🛠 Texnologiya Steki (Tech Stack)
- **Əsas Framework:** Astro (v5.18.0) - Sürətli və SEO üçün optimallaşdırılmış saytların yığılması üçün.
- **UI Kitabxanaları:** Svelte (v5.38.7), React (v18)
- **Stilizasiya:** Tailwind CSS v4, Lucide Icons, Radix UI.
- **Datanın İdarəolunması:** Supabase (PostgreSQL DB və SSR Authentication).
- **Zəngin Mətn Redaktoru (Rich Text):** Tiptap əsaslı xüsusi redaktor.
- **Media İdarəetməsi:** BunnyCDN (CDN və Fayl yükləmə), Şəkil optimizasiyası (Blurhash/Thumbhash, WebAssembly əsaslı optimizasiya).
- **Yerləşdirmə (Deployment):** Cloudflare Pages (və ya Cloudflare Workers).
- **Digər Alətlər:** Nanostores (state idarəetməsi), date-fns.

---

## 🏗 Əsas Modullar və Xüsusiyyətlər (Core Features)

### 1. İstifadəçi Təsdiqlənməsi və İdarəetməsi (Auth & User Management)
- **Qeydiyyat & Giriş:** Supabase daxiletmələri vasitəsilə Email & Şifrə ilə giriş imkanı (SSR dəstəkli auth token idarəetməsi ilə).
- **Profil İdarəetməsi:** İstifadəçinin öz profili (`[username]`), avatarlar, istifadəçi bio və s.
- **Şifrəni Sıfırlama:** Şifrənin bərpası prosesi.
- **Rollara Əsaslanan İcazələr Sistemi (RBAC):** Admin, Moderator və sıravi İstifadəçi səviyyələri. Rollar və xüsusi icazələr (Permission Matrix) məlumatlar bazasından tənzimlənir.

### 2. İdarəetmə Paneli (Admin & Moderator Dashboard)
Admin paneli (`/admin`) Svelte komponentləri vasitəsilə qurulub və bir neçə tabyüklü idarəetmə məqsədi güdür:
- **Statistika Paneli:** Gözləyən/təsdiqlənmiş məqalələr, yeni istifadəçilər, şərhlər və paylaşım (mikro-post) məlumatlarının xülasəsi.
- **İstifadəçilər:** İstifadəçi aktivliyinin idarəsi (silmə, rol dəyişmə və bloklama imkanı).
- **Rollar & İcazələr:** Detallı platforma icazələrinin (CRUD icazələri) idarə olunması.
- **Bölmələr (Categories):** İç-içə (hierarchical) bölmələrin əlavə olunması və idarə edilməsi.
- **Sistem Parametrləri:** Ümumi nizamlamalar (SettingsTab)

### 3. Məzmun Yaradılması nizamı (Blog / Posts)
- **Zəngin Mətn Redaktoru (TipTap):** Mətnin formatlanması, youtube, şəkil, qalereya, siyahı və cədvəllərin inteqrasiyası.
- **Məqalənin İdarə Olunması:** Yaradılma, redaktə etmə, silmə, təsdiqlənmə (pending/published statusları). Audio postların dəstəklənməsi.
- **Bölmələr (Categories):** Hər məqalə bölmələrə (kateqoriya və alt-kateqoriyalar) ləpir verilə bilər.
- **Baxış və Reaksiyalar:** Məqalələr üçün unikal baxış sayğacı və istifadəçi reaksiyaları. 

### 4. Mikrobloqinq və Sosial Axın (Shares / Timeline)
- Twitter/X bənzəri qısa məzmun paylaşımları sistemi.
- **Axın (Timeline):** Sonsuz yüklənmə (Infinite Scroll, `InfinitePostList.svelte` əsaslı).
- Ümumi Paylaşımların ('Shares') yaradılması, şərhlər və bəyənmələr qatının dəstəklənməsi.
- Qalereya kompotenti ilə birgə Blurhash xüsusiyyəti (Şəkillər yüklənənədək bulanıq görüntü).

### 5. Şərhlər Sistemi (Comments System)
- Həm məqalələr (Posts), həm də qısa paylaşımlar (Shares) üçün ikipilləli şərhlər (Əsas şərh və ona cavab - threading).
- Şərhlərin bəyənilməsi.
- Admin portalından şərhlərin moderasiyası qabiliyyəti.

### 6. İnteraktiv və Oyunlaşdırma: KrossWordle
- Məxsusi KrossWordle oyun inteqrasiyası.
- Hər gün üçün fərqli söz ehtiyatı (Levels).
- İstifadəçi oyun sessiyaları (Sessions) və nəticələri.
- Liderlər lövhəsi (Leaderboards).
- Admin Paneli içərisindən (KrossWordleTab) səviyyələrin generasiyası və idarəedilməsi.

### 7. Reklam və Sponsorluqlar (Ads & Sponsorship)
- Bannerlərin qeydiyyatı sistemi (Sponsor banners tab).
- Aktiv və passiv bannerlərin sistemdən seçilməsi.
- Kliklərin İzlənməsi (Track Clicks API) və statistikanın yığılması.
- `Adv.astro` kimi reklam bölmələri.

### 8. Multimedia & Fayl Yükləmə
- **Custom BunnyCDN İnteqrasiyası:** Mediya fayllarının yüklənməsi, xüsusi optimizasiyası və buludda(CDN) saxlanılaraq serve edilməsi. Video və audio elementləri idarə edən Svelte komponentləri (`VideoPlayer`, `MediaPlayer`).
- Şəkillərin ölçüsünün kiçildilməsi funksiyaları (`browser-image-compression`, `wasm-image-optimization`).

### 9. Digər xüsusiyyətlər və Modullar
- **SEO & SEO İdarəetmə:** Astro-SEO dəstəyi ilə meta tagların dinamik renderi. Sitemap, RSS generasiyası.
- **Vacancy / Əlaqə formaları:** İstifadəçi müraciətlərini idarə edən sistem. (Resend API ilə emaillərin göndərilməsi ehtimalı).

---

## 🤖 AI Agent (Jules) üçün İş Məntiqi və İstiqamətlər

Əziz Jules, yuxarıdakı xüsusiyyətlər siyahısı layihənin arxitekturasını özündə cəmləyir. Layihədə kod inkişaf etdirərkən aşağıdakı məntiqə əsaslanaraq işini planlamalısan:

**Gündəlik Taskların Forması (Tapşırıq İdarəetməsi üçün):**
1. Məntiqi olaraq böyük işləri əlçatan PR (Pull Request) ölçüsündə kiçik hissələrə bölmək.
2. Yeni bir feature (məs. *Sponsor detallarının təkmilləşdirilməsi*) əlavə olunanda ardıcıllıq bu cür olmalıdır:
   - Supabase SQL Miqrasiyasının yoxlanması & tətbiqi (əgər DB dəyişikliyi tələb olunursa `migrations` papkasında).
   - API Endpoint yaradılması (həm read, həm write, i.e. `api/admin/...`).
   - Svelte/React/Astro komponentinin təməl kodunun yazılması.
   - İcazə (Permission) matrisinə uyğunlaşdırma və Admin/Front-end panele interfeysin yığılması.
3. PR-larda Svelte-in state management-i ($state, $derived) prinsiplərinə uyğunlaşma.
4. Tailwind V4 sisteminə görə, class add-larında lazımsız config istifadəsindən çəkinmək (@theme global.css istifadə etmək).
5. Mövcud layihədəki faylların adət və arxitekturunu davam etdirərək modulyarlıq qorunmalıdır. Eyni kodların təkrar yazılması yerinə mövcud UI Primitive-lərindən (tiptap-ui-primitive folder vs.) istifadəni mütləq şəkildə dəyərləndirin.
