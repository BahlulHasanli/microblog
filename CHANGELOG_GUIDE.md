# Changelog Sistemi

## Avtomatik Changelog Yaratma

Hər build zamanı Git commit-lərdən avtomatik changelog yaranır və istifadəçilərə modal ilə göstərilir.

## Commit Format

Commit mesajlarınızı bu formatda yazın ki, düzgün kateqoriyaya düşsün:

### Yeni Xüsusiyyətlər (Feature)

```
feat: RSS feed əlavə edildi
yeni: Changelog modal sistemi
əlavə: Supabase inteqrasiyası
```

### Təkmilləşdirmələr (Improvement)

```
improve: Performans optimallaşdırması
təkmil: UI/UX yenilikləri
refactor: Kod strukturu yeniləndi
update: Paketlər yeniləndi
```

### Düzəlişlər (Fix)

```
fix: Avatar yükləmə problemi həll edildi
düzəliş: RSS feed xətası düzəldildi
bug: Login problemi həll olundu
```

## Necə İşləyir

1. **Commit yazın** - Normal Git commit yazın
2. **Versiya artırın** - `package.json`-da versiya nömrəsini artırın
3. **Build edin** - `bun run build` və ya Cloudflare deploy
4. **Avtomatik yaranır** - Changelog avtomatik yaranır və istifadəçilərə göstərilir

## Manual Changelog Yaratma

Əgər build etmədən changelog yaratmaq istəyirsinizsə:

```bash
bun run changelog
```

## Nümunə Workflow

```bash
# 1. Dəyişikliklər edin və commit yazın
git add .
git commit -m "feat: Yeni xüsusiyyət əlavə edildi"

# 2. Versiya artırın
# package.json-da version: "1.0.0" -> "1.1.0"

# 3. Build edin (changelog avtomatik yaranacaq)
bun run build

# 4. Deploy edin
git push
```

## Qeydlər

- Changelog yalnız son 10 versiya saxlayır
- Son tag-dən bəri olan commit-lər istifadə olunur
- Əgər tag yoxdursa, son 20 commit götürülür
- Modal hər istifadəçiyə hər versiya üçün yalnız bir dəfə göstərilir
