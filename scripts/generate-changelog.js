import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.json-dan versiya oxu
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"),
);
const currentVersion = packageJson.version;

// Changelog faylının yolu
const changelogPath = path.join(__dirname, "../src/data/changelog.json");

// Mövcud changelog-u oxu
let changelog = [];
try {
  changelog = JSON.parse(fs.readFileSync(changelogPath, "utf8"));
} catch (error) {
  console.log("Changelog faylı tapılmadı, yeni yaradılır...");
}

// Əgər bu versiya artıq varsa, yenilə
const existingVersionIndex = changelog.findIndex(
  (entry) => entry.version === currentVersion,
);

// Son tag-dən bəri olan commit-ləri al
let commits = [];
try {
  const lastTag = execSync(
    'git describe --tags --abbrev=0 2>/dev/null || echo ""',
  )
    .toString()
    .trim();

  const gitCommand = lastTag
    ? `git log ${lastTag}..HEAD --pretty=format:"%s|||%b|||%ad" --date=short`
    : 'git log --pretty=format:"%s|||%b|||%ad" --date=short -20';

  const gitLog = execSync(gitCommand).toString().trim();

  if (gitLog) {
    commits = gitLog.split("\n").map((line) => {
      const [subject, body, date] = line.split("|||");
      return { subject: subject.trim(), body: body.trim(), date: date.trim() };
    });
  }
} catch (error) {
  console.error("Git log oxunarkən xəta:", error.message);
}

// Commit-ləri kateqoriyalara ayır
const changes = [];
const featureKeywords = ["feat", "feature", "yeni", "əlavə", "add"];
const improvementKeywords = [
  "improve",
  "təkmil",
  "refactor",
  "update",
  "yenilə",
];
const fixKeywords = ["fix", "düzəliş", "bug", "xəta"];

commits.forEach((commit) => {
  const lowerSubject = commit.subject.toLowerCase();
  let type = null;

  // Yalnız açar sözləri olan commit-ləri əlavə et
  if (featureKeywords.some((kw) => lowerSubject.includes(kw))) {
    type = "feature";
  } else if (fixKeywords.some((kw) => lowerSubject.includes(kw))) {
    type = "fix";
  } else if (improvementKeywords.some((kw) => lowerSubject.includes(kw))) {
    type = "improvement";
  }

  // Əgər tip tapılmayıbsa, bu commit-i atlayırıq
  if (!type) {
    return;
  }

  // Commit mesajından conventional commit prefix-i sil
  let text = commit.subject
    .replace(
      /^(feat|fix|docs|style|refactor|test|chore|perf|improve|yeni|əlavə|düzəliş|təkmil)(\(.+?\))?:\s*/i,
      "",
    )
    .trim();

  // İlk hərfi böyük et
  text = text.charAt(0).toUpperCase() + text.slice(1);

  changes.push({ type, text });
});

// Əgər commit yoxdursa, placeholder əlavə et
if (changes.length === 0) {
  changes.push({
    type: "improvement",
    text: "Performans və stabillik təkmilləşdirmələri",
  });
}

// Yeni changelog entry
const newEntry = {
  version: currentVersion,
  date: new Date().toISOString().split("T")[0],
  title: `Versiya ${currentVersion}`,
  changes: changes,
};

// Changelog-u yenilə
if (existingVersionIndex >= 0) {
  changelog[existingVersionIndex] = newEntry;
  console.log(`✓ Versiya ${currentVersion} yeniləndi`);
} else {
  changelog.unshift(newEntry); // Əvvələ əlavə et
  console.log(`✓ Versiya ${currentVersion} əlavə edildi`);
}

// Yalnız son 10 versiyanı saxla
changelog = changelog.slice(0, 10);

// Faylı yaz
fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
console.log(`✓ Changelog faylı yaradıldı: ${changes.length} dəyişiklik`);
