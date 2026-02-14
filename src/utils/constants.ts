import { Level, PowerType, PowerState } from "../models/types";

export const GRID_SIZE = 7;
export const ALPHABET = "ABCÇDEƏFGĞHXİIJKQLMNOÖPRSŞTUÜVYZ".split("");

export const INITIAL_POWERS: PowerState[] = [
  {
    type: PowerType.MiddleLetter,
    uses: 2,
    icon: "🎯",
    label: "Orta Hərf",
    description: "Sözün ortasını açar.",
  },
  {
    type: PowerType.SwapReveal,
    uses: 10,
    icon: "✨",
    label: "İpucu",
    description: "Təsadüfi bir hərf açar.",
  },
  {
    type: PowerType.Bomb,
    uses: 1,
    icon: "💣",
    label: "Bomba",
    description: "Təsadüfi sahə açar.",
  },
];

/*
  Grid koordinat sistemi:
  x = sütun (soldan sağa, 0-dan başlayır)
  y = sətir (yuxarıdan aşağı, 0-dan başlayır)

  H = Horizontal (sağa doğru)
  V = Vertical (aşağı doğru)

  7x7 grid (0-6 arası koordinatlar):

     0 1 2 3 4 5 6
  0  . . . . . . .
  1  . . . . . . .
  2  . . . . . . .
  3  . . . . . . .
  4  . . . . . . .
  5  . . . . . . .
  6  . . . . . . .
*/

// 7x7 grid üçün düzgün koordinatlarla səviyyələr
// Hər səviyyədə 3-4 söz, düzgün kəsişmələrlə
export const LEVELS: Level[] = [
  {
    // Level 1
    // ALMA (H): A(0,0) L(1,0) M(2,0) A(3,0)
    // ANA (V): A(0,0) N(0,1) A(0,2) - A ilə ALMA kəsişir (0,0)
    // AT (V): A(3,0) T(3,1) - A ilə ALMA kəsişir (3,0)
    id: 1,
    words: [
      {
        id: "1",
        word: "ALMA",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Qırmızı meyvə",
      },
      { id: "2", word: "ANA", x: 0, y: 0, direction: "V", clue: "Valideyn" },
      { id: "3", word: "AT", x: 3, y: 0, direction: "V", clue: "Heyvan" },
    ],
  },
  {
    // Level 2
    // DƏRS (H): D(0,0) Ə(1,0) R(2,0) S(3,0)
    // DAD (V): D(0,0) A(0,1) D(0,2) - D ilə DƏRS kəsişir (0,0)
    // SU (V): S(3,0) U(3,1) - S ilə DƏRS kəsişir (3,0)
    id: 2,
    words: [
      {
        id: "1",
        word: "DƏRS",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Məktəbdə keçirik",
      },
      { id: "2", word: "DAD", x: 0, y: 0, direction: "V", clue: "Ləzzət" },
      { id: "3", word: "SU", x: 3, y: 0, direction: "V", clue: "İçirik" },
    ],
  },
  {
    // Level 3
    // BULUD (H): B(0,0) U(1,0) L(2,0) U(3,0) D(4,0)
    // BAŞ (V): B(0,0) A(0,1) Ş(0,2) - B ilə BULUD kəsişir (0,0)
    // DAŞ (V): D(4,0) A(4,1) Ş(4,2) - D ilə BULUD kəsişir (4,0)
    id: 3,
    words: [
      {
        id: "1",
        word: "BULUD",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Səmadakı ağ kütlə",
      },
      {
        id: "2",
        word: "BAŞ",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Bədən hissəsi",
      },
      {
        id: "3",
        word: "DAŞ",
        x: 4,
        y: 0,
        direction: "V",
        clue: "Bərk material",
      },
    ],
  },
  {
    // Level 4
    // QƏLƏM (H): Q(0,0) Ə(1,0) L(2,0) Ə(3,0) M(4,0)
    // QAR (V): Q(0,0) A(0,1) R(0,2) - Q ilə QƏLƏM kəsişir (0,0)
    // MİL (V): M(4,0) İ(4,1) L(4,2) - M ilə QƏLƏM kəsişir (4,0)
    id: 4,
    words: [
      {
        id: "1",
        word: "QƏLƏM",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Yazmaq üçün alət",
      },
      { id: "2", word: "QAR", x: 0, y: 0, direction: "V", clue: "Ağ yağıntı" },
      { id: "3", word: "MİL", x: 4, y: 0, direction: "V", clue: "Ölçü vahidi" },
    ],
  },
  {
    // Level 5
    // GÜNƏŞ (H): G(0,0) Ü(1,0) N(2,0) Ə(3,0) Ş(4,0)
    // GÖZ (V): G(0,0) Ö(0,1) Z(0,2) - G ilə GÜNƏŞ kəsişir
    // ŞƏR (V): Ş(4,0) Ə(4,1) R(4,2) - Ş ilə GÜNƏŞ kəsişir
    id: 5,
    words: [
      {
        id: "1",
        word: "GÜNƏŞ",
        x: 0,
        y: 0,
        direction: "H",
        clue: "İşıq mənbəyi",
      },
      { id: "2", word: "GÖZ", x: 0, y: 0, direction: "V", clue: "Görürük" },
      { id: "3", word: "ŞƏR", x: 4, y: 0, direction: "V", clue: "Pislik" },
    ],
  },
  {
    // Level 6
    // ARABA (H): A(0,0) R(1,0) A(2,0) B(3,0) A(4,0)
    // AĞAC (V): A(0,0) Ğ(0,1) A(0,2) C(0,3) - A ilə ARABA kəsişir
    // BAĞ (V): B(3,0) A(3,1) Ğ(3,2) - B ilə ARABA kəsişir
    id: 6,
    words: [
      {
        id: "1",
        word: "ARABA",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Nəqliyyat vasitəsi",
      },
      {
        id: "2",
        word: "AĞAC",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Meyvə verən bitki",
      },
      { id: "3", word: "BAĞ", x: 3, y: 0, direction: "V", clue: "Meyvə bağı" },
    ],
  },
  {
    // Level 7
    // DƏFTƏR (H): D(0,0) Ə(1,0) F(2,0) T(3,0) Ə(4,0) R(5,0)
    // DƏNİZ (V): D(0,0) Ə(0,1) N(0,2) İ(0,3) Z(0,4) - D ilə DƏFTƏR kəsişir
    // RƏF (V): R(5,0) Ə(5,1) F(5,2) - R ilə DƏFTƏR kəsişir
    id: 7,
    words: [
      {
        id: "1",
        word: "DƏFTƏR",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Qeyd aparmaq üçün",
      },
      {
        id: "2",
        word: "DƏNİZ",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Mavi su kütləsi",
      },
      {
        id: "3",
        word: "RƏF",
        x: 5,
        y: 0,
        direction: "V",
        clue: "Kitab qoyuruq",
      },
    ],
  },
  {
    // Level 8
    // KİTAB (H): K(0,0) İ(1,0) T(2,0) A(3,0) B(4,0)
    // KÖK (V): K(0,0) Ö(0,1) K(0,2) - K ilə KİTAB kəsişir
    // BAL (V): B(4,0) A(4,1) L(4,2) - B ilə KİTAB kəsişir
    id: 8,
    words: [
      {
        id: "1",
        word: "KİTAB",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Oxumaq üçün",
      },
      {
        id: "2",
        word: "KÖK",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Bitki hissəsi",
      },
      { id: "3", word: "BAL", x: 4, y: 0, direction: "V", clue: "Şirin maddə" },
    ],
  },
  {
    // Level 9
    // MƏKTƏB (H): M(0,0) Ə(1,0) K(2,0) T(3,0) Ə(4,0) B(5,0)
    // MAL (V): M(0,0) A(0,1) L(0,2) - M ilə MƏKTƏB kəsişir
    // BAL (V): B(5,0) A(5,1) L(5,2) - B ilə MƏKTƏB kəsişir
    id: 9,
    words: [
      {
        id: "1",
        word: "MƏKTƏB",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Təhsil müəssisəsi",
      },
      { id: "2", word: "MAL", x: 0, y: 0, direction: "V", clue: "Əşya" },
      { id: "3", word: "BAL", x: 5, y: 0, direction: "V", clue: "Şirin maddə" },
    ],
  },
  {
    // Level 10
    // HƏYAT (H): H(0,0) Ə(1,0) Y(2,0) A(3,0) T(4,0)
    // HAL (V): H(0,0) A(0,1) L(0,2) - H ilə HƏYAT kəsişir
    // TAC (V): T(4,0) A(4,1) C(4,2) - T ilə HƏYAT kəsişir
    id: 10,
    words: [
      {
        id: "1",
        word: "HƏYAT",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Yaşamaq prosesi",
      },
      { id: "2", word: "HAL", x: 0, y: 0, direction: "V", clue: "Vəziyyət" },
      {
        id: "3",
        word: "TAC",
        x: 4,
        y: 0,
        direction: "V",
        clue: "Şahın başlığı",
      },
    ],
  },
  {
    // Level 11
    // SAAT (H): S(0,0) A(1,0) A(2,0) T(3,0)
    // SAZ (V): S(0,0) A(0,1) Z(0,2) - S ilə SAAT kəsişir
    // AT (V): A(2,0) T(2,1) - A ilə SAAT kəsişir
    // TAR (V): T(3,0) A(3,1) R(3,2) - T ilə SAAT kəsişir
    id: 11,
    words: [
      {
        id: "1",
        word: "SAAT",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Vaxtı göstərir",
      },
      {
        id: "2",
        word: "SAZ",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Musiqi aləti",
      },
      { id: "3", word: "TAR", x: 3, y: 0, direction: "V", clue: "Simli alət" },
      { id: "4", word: "AT", x: 2, y: 0, direction: "V", clue: "Heyvan" },
    ],
  },
  {
    // Level 12
    // YUXU (H): Y(0,0) U(1,0) X(2,0) U(3,0)
    // YAZ (V): Y(0,0) A(0,1) Z(0,2) - Y ilə YUXU kəsişir
    // UX (V): U(1,0) X(1,1) - U ilə YUXU kəsişir
    // UCA (V): U(3,0) C(3,1) A(3,2) - U ilə YUXU kəsişir
    id: 12,
    words: [
      {
        id: "1",
        word: "YUXU",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Gecə istirahət",
      },
      { id: "2", word: "YAZ", x: 0, y: 0, direction: "V", clue: "İsti fəsil" },
      { id: "3", word: "UCA", x: 3, y: 0, direction: "V", clue: "Hündür" },
      { id: "4", word: "UN", x: 1, y: 0, direction: "V", clue: "Taxıl tozu" },
    ],
  },
  {
    // Level 13
    // QAYIQ (H): Q(0,0) A(1,0) Y(2,0) I(3,0) Q(4,0)
    // QAR (V): Q(0,0) A(0,1) R(0,2) - Q ilə QAYIQ kəsişir
    // AY (V): A(1,0) Y(1,1) - A ilə QAYIQ kəsişir
    // QIŞ (V): Q(4,0) I(4,1) Ş(4,2) - Q ilə QAYIQ kəsişir
    id: 13,
    words: [
      { id: "1", word: "QAYIQ", x: 0, y: 0, direction: "H", clue: "Suda üzür" },
      { id: "2", word: "QAR", x: 0, y: 0, direction: "V", clue: "Ağ yağıntı" },
      { id: "3", word: "QIŞ", x: 4, y: 0, direction: "V", clue: "Soyuq fəsil" },
      { id: "4", word: "AY", x: 1, y: 0, direction: "V", clue: "Gecə işığı" },
    ],
  },
  {
    // Level 14
    // NAXIŞ (H): N(0,0) A(1,0) X(2,0) I(3,0) Ş(4,0)
    // NAR (V): N(0,0) A(0,1) R(0,2) - N ilə NAXIŞ kəsişir
    // AX (V): A(1,0) X(1,1) - A ilə NAXIŞ kəsişir
    // ŞAL (V): Ş(4,0) A(4,1) L(4,2) - Ş ilə NAXIŞ kəsişir
    id: 14,
    words: [
      {
        id: "1",
        word: "NAXIŞ",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Bəzək nümunəsi",
      },
      {
        id: "2",
        word: "NAR",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Qırmızı meyvə",
      },
      {
        id: "3",
        word: "ŞAL",
        x: 4,
        y: 0,
        direction: "V",
        clue: "Boyun örtüyü",
      },
      { id: "4", word: "AX", x: 1, y: 0, direction: "V", clue: "Su axır" },
    ],
  },
  {
    // Level 15
    // ÇINAR (H): Ç(0,0) I(1,0) N(2,0) A(3,0) R(4,0)
    // ÇAY (V): Ç(0,0) A(0,1) Y(0,2) - Ç ilə ÇINAR kəsişir
    // İN (V): I(1,0) N(1,1) - I ilə ÇINAR kəsişir
    // RAD (V): R(4,0) A(4,1) D(4,2) - R ilə ÇINAR kəsişir
    id: 15,
    words: [
      {
        id: "1",
        word: "ÇİNAR",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Böyük ağac",
      },
      { id: "2", word: "ÇAY", x: 0, y: 0, direction: "V", clue: "İçki" },
      { id: "3", word: "RAD", x: 4, y: 0, direction: "V", clue: "Ölçü vahidi" },
    ],
  },
  {
    // Level 16
    // XÖRƏK (H): X(0,0) Ö(1,0) R(2,0) Ə(3,0) K(4,0)
    // XAL (V): X(0,0) A(0,1) L(0,2) - X ilə XÖRƏK kəsişir
    // KÜL (V): K(4,0) Ü(4,1) L(4,2) - K ilə XÖRƏK kəsişir
    id: 16,
    words: [
      { id: "1", word: "XÖRƏK", x: 0, y: 0, direction: "H", clue: "Yemək" },
      { id: "2", word: "XAL", x: 0, y: 0, direction: "V", clue: "Nöqtə" },
      {
        id: "3",
        word: "KÜL",
        x: 4,
        y: 0,
        direction: "V",
        clue: "Yanmış qalıq",
      },
    ],
  },
  {
    // Level 17
    // SARAY (H): S(0,0) A(1,0) R(2,0) A(3,0) Y(4,0)
    // SAÇ (V): S(0,0) A(0,1) Ç(0,2) - S ilə SARAY kəsişir
    // AR (V): A(1,0) R(1,1) - A ilə SARAY kəsişir
    // YAĞ (V): Y(4,0) A(4,1) Ğ(4,2) - Y ilə SARAY kəsişir
    id: 17,
    words: [
      {
        id: "1",
        word: "SARAY",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Şahların evi",
      },
      { id: "2", word: "SAÇ", x: 0, y: 0, direction: "V", clue: "Başda bitir" },
      { id: "3", word: "YAĞ", x: 4, y: 0, direction: "V", clue: "Yağlı maddə" },
    ],
  },
  {
    // Level 18
    // DOST (V): D(0,0) O(0,1) S(0,2) T(0,3)
    // DOSTLUQ (H): D(0,0) O(1,0) S(2,0) T(3,0) L(4,0) U(5,0) Q(6,0) - D ilə DOST kəsişir
    // OS (V): O(1,0) S(1,1) - O ilə DOSTLUQ kəsişir
    // QUL (V): Q(6,0) U(6,1) L(6,2) - Q ilə DOSTLUQ kəsişir
    id: 18,
    words: [
      { id: "1", word: "DOST", x: 0, y: 0, direction: "V", clue: "Yaxın adam" },
      {
        id: "2",
        word: "DOSTLUQ",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Yaxın münasibət",
      },
      { id: "3", word: "QUL", x: 6, y: 0, direction: "V", clue: "Kölə" },
    ],
  },
  {
    // Level 19
    // ULDUZ (H): U(0,0) L(1,0) D(2,0) U(3,0) Z(4,0)
    // UN (V): U(0,0) N(0,1) - U ilə ULDUZ kəsişir
    // ZƏR (V): Z(4,0) Ə(4,1) R(4,2) - Z ilə ULDUZ kəsişir
    id: 19,
    words: [
      {
        id: "1",
        word: "ULDUZ",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Gecə parlayır",
      },
      { id: "2", word: "UN", x: 0, y: 0, direction: "V", clue: "Taxıl tozu" },
      { id: "3", word: "ZƏR", x: 4, y: 0, direction: "V", clue: "Qızıl" },
    ],
  },
  {
    // Level 20
    // HAVA (H): H(0,0) A(1,0) V(2,0) A(3,0)
    // HAL (V): H(0,0) A(0,1) L(0,2) - H ilə HAVA kəsişir
    // AV (V): A(1,0) V(1,1) - A ilə HAVA kəsişir
    // VAR (V): V(2,0) A(2,1) R(2,2) - V ilə HAVA kəsişir
    id: 20,
    words: [
      {
        id: "1",
        word: "HAVA",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Nəfəs alırıq",
      },
      { id: "2", word: "HAL", x: 0, y: 0, direction: "V", clue: "Vəziyyət" },
      { id: "3", word: "VAR", x: 2, y: 0, direction: "V", clue: "Mövcuddur" },
    ],
  },
  {
    // Level 21
    // DAĞLAR (H): D(0,0) A(1,0) Ğ(2,0) L(3,0) A(4,0) R(5,0)
    // DAŞ (V): D(0,0) A(0,1) Ş(0,2) - D ilə DAĞLAR kəsişir
    // AĞ (V): A(1,0) Ğ(1,1) - A ilə DAĞLAR kəsişir
    // RAH (V): R(5,0) A(5,1) H(5,2) - R ilə DAĞLAR kəsişir
    id: 21,
    words: [
      {
        id: "1",
        word: "DAĞLAR",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Yüksək yerlər",
      },
      {
        id: "2",
        word: "DAŞ",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Bərk material",
      },
      { id: "3", word: "RAH", x: 5, y: 0, direction: "V", clue: "Yol" },
    ],
  },
  {
    // Level 22
    // MUSIQI (H): M(0,0) U(1,0) S(2,0) I(3,0) Q(4,0) I(5,0)
    // MİS (V): M(0,0) İ(0,1) S(0,2) - M ilə MUSIQI kəsişir
    // US (V): U(1,0) S(1,1) - U ilə MUSIQI kəsişir
    // QIZ (V): Q(4,0) I(4,1) Z(4,2) - Q ilə MUSIQI kəsişir
    id: 22,
    words: [
      {
        id: "1",
        word: "MUSİQİ",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Səs sənəti",
      },
      { id: "2", word: "MİS", x: 0, y: 0, direction: "V", clue: "Metal" },
      { id: "3", word: "QIZ", x: 4, y: 0, direction: "V", clue: "Övlad" },
    ],
  },
  {
    // Level 23
    // SEVGİ (H): S(0,0) E(1,0) V(2,0) G(3,0) İ(4,0)
    // SƏS (V): S(0,0) Ə(0,1) S(0,2) - S ilə SEVGİ kəsişir
    // EV (V): E(1,0) V(1,1) - E ilə SEVGİ kəsişir
    // İŞ (V): İ(4,0) Ş(4,1) - İ ilə SEVGİ kəsişir
    id: 23,
    words: [
      { id: "1", word: "SEVGİ", x: 0, y: 0, direction: "H", clue: "Məhəbbət" },
      { id: "2", word: "SƏS", x: 0, y: 0, direction: "V", clue: "Eşidirik" },
      { id: "3", word: "İŞ", x: 4, y: 0, direction: "V", clue: "Əmək" },
    ],
  },
  {
    // Level 24
    id: 24,
    words: [
      {
        id: "1",
        word: "BAYRAM",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Şənlik günü",
      },
      {
        id: "2",
        word: "BAŞ",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Bədən hissəsi",
      },
      { id: "3", word: "MİL", x: 5, y: 0, direction: "V", clue: "Ölçü vahidi" },
    ],
  },
  {
    // Level 25
    // ŞEİR (H): Ş(0,0) E(1,0) İ(2,0) R(3,0)
    // ŞƏR (V): Ş(0,0) Ə(0,1) R(0,2) - Ş ilə ŞEİR kəsişir
    // Eİ (V): E(1,0) İ(1,1) - E ilə ŞEİR kəsişir
    // RAZ (V): R(3,0) A(3,1) Z(3,2) - R ilə ŞEİR kəsişir
    id: 25,
    words: [
      {
        id: "1",
        word: "ŞEİR",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Qafiyəli mətn",
      },
      { id: "2", word: "ŞƏR", x: 0, y: 0, direction: "V", clue: "Pislik" },
      { id: "3", word: "RAZ", x: 3, y: 0, direction: "V", clue: "Sirr" },
    ],
  },
  {
    // Level 26
    // NAĞIL (H): N(0,0) A(1,0) Ğ(2,0) I(3,0) L(4,0)
    // NƏM (V): N(0,0) Ə(0,1) M(0,2) - N ilə NAĞIL kəsişir
    // AĞ (V): A(1,0) Ğ(1,1) - A ilə NAĞIL kəsişir
    // LAL (V): L(4,0) A(4,1) L(4,2) - L ilə NAĞIL kəsişir
    id: 26,
    words: [
      {
        id: "1",
        word: "NAĞIL",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Uşaq hekayəsi",
      },
      { id: "2", word: "NƏM", x: 0, y: 0, direction: "V", clue: "Rütubət" },
      {
        id: "3",
        word: "LAL",
        x: 4,
        y: 0,
        direction: "V",
        clue: "Danışa bilməyən",
      },
    ],
  },
  {
    // Level 27
    // MAHNI (H): M(0,0) A(1,0) H(2,0) N(3,0) İ(4,0)
    // MAL (V): M(0,0) A(0,1) L(0,2) - M ilə MAHNI kəsişir
    // AH (V): A(1,0) H(1,1) - A ilə MAHNI kəsişir
    // NİL (V): N(3,0) İ(3,1) L(3,2) - N ilə MAHNI kəsişir
    id: 27,
    words: [
      { id: "1", word: "MAHNI", x: 0, y: 0, direction: "H", clue: "Oxuyuruq" },
      { id: "2", word: "MAL", x: 0, y: 0, direction: "V", clue: "Əşya" },
      { id: "3", word: "NİL", x: 3, y: 0, direction: "V", clue: "Çay adı" },
    ],
  },
  {
    // Level 28
    // RƏQS (H): R(0,0) Ə(1,0) Q(2,0) S(3,0)
    // RƏF (V): R(0,0) Ə(0,1) F(0,2) - R ilə RƏQS kəsişir
    // ƏQ (V): Ə(1,0) Q(1,1) - Ə ilə RƏQS kəsişir
    // SU (V): S(3,0) U(3,1) - S ilə RƏQS kəsişir
    id: 28,
    words: [
      { id: "1", word: "RƏQS", x: 0, y: 0, direction: "H", clue: "Oynayırıq" },
      {
        id: "2",
        word: "RƏF",
        x: 0,
        y: 0,
        direction: "V",
        clue: "Kitab qoyuruq",
      },
      { id: "3", word: "SU", x: 3, y: 0, direction: "V", clue: "İçirik" },
    ],
  },
  {
    // Level 29
    // ÇÖRƏK (H): Ç(0,0) Ö(1,0) R(2,0) Ə(3,0) K(4,0)
    // ÇƏN (V): Ç(0,0) Ə(0,1) N(0,2) - Ç ilə ÇÖRƏK kəsişir
    // ÖR (V): Ö(1,0) R(1,1) - Ö ilə ÇÖRƏK kəsişir
    // KƏL (V): K(4,0) Ə(4,1) L(4,2) - K ilə ÇÖRƏK kəsişir
    id: 29,
    words: [
      { id: "1", word: "ÇÖRƏK", x: 0, y: 0, direction: "H", clue: "Əsas qida" },
      { id: "2", word: "ÇƏN", x: 0, y: 0, direction: "V", clue: "Duman" },
      { id: "3", word: "KƏL", x: 4, y: 0, direction: "V", clue: "Keçəl" },
    ],
  },
  {
    // Level 30
    // PALTAR (H): P(0,0) A(1,0) L(2,0) T(3,0) A(4,0) R(5,0)
    // PAL (V): P(0,0) A(0,1) L(0,2) - P ilə PALTAR kəsişir
    // AL (V): A(1,0) L(1,1) - A ilə PALTAR kəsişir
    // RAD (V): R(5,0) A(5,1) D(5,2) - R ilə PALTAR kəsişir
    id: 30,
    words: [
      {
        id: "1",
        word: "PALTAR",
        x: 0,
        y: 0,
        direction: "H",
        clue: "Geyinirik",
      },
      { id: "2", word: "PAL", x: 0, y: 0, direction: "V", clue: "Hissə" },
      { id: "3", word: "RAD", x: 5, y: 0, direction: "V", clue: "Ölçü vahidi" },
    ],
  },
];

// Epoch-based günlük səviyyə sistemi
export const EPOCH_DATE = new Date("2025-01-21").getTime(); // Başlanğıc tarixi

export const getDailyLevelIndex = () => {
  const today = new Date().setHours(0, 0, 0, 0);
  const daysSinceEpoch = Math.floor(
    (today - EPOCH_DATE) / (1000 * 60 * 60 * 24),
  );
  return daysSinceEpoch % LEVELS.length;
};

export const getTodayDateKey = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD formatı
};

// Ayın son gününə 1 gün qaldığını yoxla (son gün = oyun dayanır)
export const isMonthEndPause = () => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  
  // Son günə 1 gün qalmış və ya son gündə dayanır
  return currentDay >= lastDayOfMonth;
};
