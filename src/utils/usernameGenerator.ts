// Random Username Generator (X.com tarzında)
class UsernameGenerator {
  private adjectives: string[];
  private nouns: string[];
  private prefixes: string[];
  private usedUsernames: Set<string>;

  constructor() {
    // Sifətlər
    this.adjectives = [
      "clever",
      "swift",
      "bright",
      "bold",
      "calm",
      "cool",
      "epic",
      "fast",
      "free",
      "fun",
      "gold",
      "happy",
      "kind",
      "lucky",
      "nice",
      "pure",
      "quick",
      "real",
      "safe",
      "smart",
      "true",
      "wise",
      "wild",
      "zen",
      "ace",
      "alpha",
      "cyber",
      "dark",
      "elite",
      "fire",
      "ghost",
      "hero",
      "ice",
      "iron",
      "jet",
      "king",
      "light",
      "mega",
      "neo",
      "nova",
      "omega",
      "pixel",
      "quantum",
      "royal",
      "sonic",
      "turbo",
      "ultra",
      "vibe",
    ];

    // İsim/obyektlər
    this.nouns = [
      "user",
      "player",
      "gamer",
      "coder",
      "ninja",
      "wolf",
      "eagle",
      "lion",
      "tiger",
      "bear",
      "shark",
      "dragon",
      "phoenix",
      "warrior",
      "hunter",
      "legend",
      "master",
      "chief",
      "boss",
      "pro",
      "ace",
      "star",
      "hero",
      "knight",
      "wizard",
      "shadow",
      "ghost",
      "spark",
      "flame",
      "storm",
      "wave",
      "bolt",
      "blade",
      "arrow",
      "sword",
      "shield",
      "crown",
      "gem",
      "coin",
      "key",
      "moon",
      "sun",
      "sky",
      "wind",
      "fire",
      "water",
      "earth",
      "stone",
    ];

    // Qısa prefikslər
    this.prefixes = [
      "x",
      "i",
      "the",
      "my",
      "mr",
      "ms",
      "dr",
      "pro",
      "real",
      "official",
    ];

    // İstifadə edilmiş usernamelər (simulasiya)
    this.usedUsernames = new Set();
  }

  // Təsadüfi element seç
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Təsadüfi rəqəm əlavə et
  getRandomNumbers(length = 3) {
    let numbers = "";
    for (let i = 0; i < length; i++) {
      numbers += Math.floor(Math.random() * 10);
    }
    return numbers;
  }

  // Pattern 1: sifət + isim + rəqəm
  generatePattern1() {
    const adj = this.getRandomElement(this.adjectives);
    const noun = this.getRandomElement(this.nouns);
    const numbers = this.getRandomNumbers(Math.floor(Math.random() * 3) + 1);

    return `${adj}${noun}${numbers}`;
  }

  // Pattern 2: prefiks + isim + rəqəm
  generatePattern2() {
    const prefix = this.getRandomElement(this.prefixes);
    const noun = this.getRandomElement(this.nouns);
    const numbers = this.getRandomNumbers(Math.floor(Math.random() * 4) + 2);

    return `${prefix}${noun}${numbers}`;
  }

  // Pattern 3: isim + rəqəmlər
  generatePattern3() {
    const noun = this.getRandomElement(this.nouns);
    const numbers = this.getRandomNumbers(Math.floor(Math.random() * 4) + 2);

    return `${noun}${numbers}`;
  }

  // Pattern 4: sifət + rəqəmlər
  generatePattern4() {
    const adj = this.getRandomElement(this.adjectives);
    const numbers = this.getRandomNumbers(Math.floor(Math.random() * 4) + 3);

    return `${adj}${numbers}`;
  }

  // Pattern 5: karışıq hərflər + rəqəmlər
  generatePattern5() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let username = "";
    const letterCount = Math.floor(Math.random() * 4) + 3; // 3-6 hərf

    for (let i = 0; i < letterCount; i++) {
      username += chars[Math.floor(Math.random() * chars.length)];
    }

    username += this.getRandomNumbers(Math.floor(Math.random() * 3) + 2);
    return username;
  }

  // Ad əsaslı username (istəkli)
  generateFromName(fullName) {
    if (!fullName) return this.generateRandom();

    const names = fullName.toLowerCase().trim().split(/\s+/);
    const firstName = names[0] || "";
    const lastName = names[1] || "";

    const patterns = [
      // Ad + soyadın ilk hərfi + rəqəm
      `${firstName}${lastName.charAt(0)}${this.getRandomNumbers(2)}`,
      // Adın ilk hərfi + soyad + rəqəm
      `${firstName.charAt(0)}${lastName}${this.getRandomNumbers(2)}`,
      // Ad + rəqəm
      `${firstName}${this.getRandomNumbers(3)}`,
      // Soyadın bir hissəsi + rəqəm
      `${lastName.substring(0, 4)}${this.getRandomNumbers(3)}`,
    ];

    return this.getRandomElement(patterns).toLowerCase();
  }

  // Əsas random generator
  generateRandom() {
    const patterns = [
      this.generatePattern1.bind(this),
      this.generatePattern2.bind(this),
      this.generatePattern3.bind(this),
      this.generatePattern4.bind(this),
      this.generatePattern5.bind(this),
    ];

    const selectedPattern = this.getRandomElement(patterns);
    return selectedPattern();
  }

  // Username mövcudluğunu yoxla (simulasiya)
  isUsernameAvailable(username) {
    // Gerçək tətbiqdə bu API çağırışı olardı
    return !this.usedUsernames.has(username.toLowerCase());
  }

  // Unikal username yarat
  generateUniqueUsername(fullName = null, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      let username;

      if (fullName && i < 3) {
        // İlk 3 cəhd ad əsaslı
        username = this.generateFromName(fullName);
      } else {
        // Digər cəhdlər random
        username = this.generateRandom();
      }

      // Uzunluq məhdudiyyəti (4-15 hərf)
      if (username.length < 4) {
        username += this.getRandomNumbers(2);
      }
      if (username.length > 15) {
        username = username.substring(0, 15);
      }

      if (this.isUsernameAvailable(username)) {
        this.usedUsernames.add(username.toLowerCase());
        return {
          username: username,
          isAvailable: true,
          attempts: i + 1,
        };
      }
    }

    // Əgər heç biri tapılmasa, zorla unikal yarat
    const fallback = `user${Date.now().toString().slice(-6)}`;
    return {
      username: fallback,
      isAvailable: true,
      attempts: maxAttempts,
      isFallback: true,
    };
  }

  // Çoxlu variant yarat
  generateSuggestions(fullName = null, count = 5) {
    const suggestions = [];

    for (let i = 0; i < count; i++) {
      const result = this.generateUniqueUsername(fullName);
      suggestions.push(result.username);
    }

    return suggestions;
  }
}

export default UsernameGenerator;
