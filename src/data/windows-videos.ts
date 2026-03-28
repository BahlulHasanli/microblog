/** Pəncərələr (/windows) və ana səhifə video bölməsi üçün ortaq siyahı */
export type WindowsVideo = {
  id: number;
  videoUrl: string;
  title: string;
  authorName: string;
  authorAvatar: string;
  thumbnail: string;
  duration: string;
  /** Kart üstündə göstərilən bölmə / mövzu sətri */
  category: string;
};

const bunnyStream =
  "https://vz-300fcde7-b36.b-cdn.net/68d06fac-3f7d-4f9f-8e8c-e9b07c172567/playlist.m3u8";

export const windowsVideos: WindowsVideo[] = [
  {
    id: 1,
    videoUrl: bunnyStream,
    category: "Oyun",
    title: "Remedy, Alan Wake 2 oyunundan gözlənilən gəliri qazana bildi?",
    authorName: "Kənan Məmmədov",
    authorAvatar: "/squad/bahlulhasanli.png",
    thumbnail: "https://4kwallpapers.com/images/walls/thumbs_3t/17092.jpeg",
    duration: "3:15",
  },
  {
    id: 2,
    videoUrl: bunnyStream,
    category: "Cəmiyyət, Siyasət",
    title: "Trump Ukrayna müharibəsini sonlandırır?",
    authorName: "Rəşad Abbasov",
    authorAvatar: "/squad/eljaneyvazli.png",
    thumbnail:
      "https://media.newyorker.com/photos/67af68068ef1ba9f2e525c53/16:10/w_1920,c_limit/Remnick-Romero3.jpg",
    duration: "3:24",
  },
  {
    id: 3,
    videoUrl: bunnyStream,
    category: "İdman",
    title: "The Tragedy and Farce of Luka Dončić's Trade",
    authorName: "Kənan Məmmədov",
    authorAvatar: "/squad/bahlulhasanli.png",
    thumbnail:
      "https://media.newyorker.com/photos/67afc90c8ef1ba9f2e5261f2/master/w_1920,c_limit/Thomas-Donc%CC%8Cic%CC%81.jpg",
    duration: "3:15",
  },
  {
    id: 4,
    videoUrl: bunnyStream,
    category: "Mədəniyyət",
    title: "Yeni mövsüm: serial və filmlərdə nə izləyək?",
    authorName: "Elcan Eyvazlı",
    authorAvatar: "/squad/eljaneyvazli.png",
    thumbnail:
      "https://vz-300fcde7-b36.b-cdn.net/68d06fac-3f7d-4f9f-8e8c-e9b07c172567/thumbnail.jpg",
    duration: "2:04",
  },
];
