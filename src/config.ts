// ══════════════════════════════════════════════════════════════
//  SALON CONFIG — 所有客製內容集中在此，不需修改其他 tsx 檔案
// ══════════════════════════════════════════════════════════════

export const SALON_CONFIG = {
  // ── 基本資訊 ──────────────────────────────────────────────
  name: "ATELIER · A",
  tagline: "THE ART OF HAIR CRAFT",
  subTagline: "每位設計師都是藝術家。我們為您打造專屬於這個季節的造型，從風格諮詢到日常維護，全程陪伴。",
  location: "台北市大安區忠孝東路四段 123 號",
  phone: "02-1234-5678",
  instagram: "@ateliersalon",
  hours: "週一至週日 10:00–20:00",
  mapUrl: "https://maps.google.com",

  // ── 設計師 ─────────────────────────────────────────────────
  // photo: 放在 /public/photos/ 目錄下，填寫路徑即可
  // 若尚未備妥照片，可暫時使用 picsum 網址：
  //   "https://picsum.photos/seed/{任意字}/600/900"
  designers: [
    {
      id: "aria",
      name: "ARIA",
      title: "首席造型師",
      quote: "每一刀都是一次對話。",
      photo: "/photos/aria.jpg",
    },
    {
      id: "kai",
      name: "KAI",
      title: "染燙師",
      quote: "色彩是情緒的延伸。",
      photo: "/photos/kai.jpg",
    },
    {
      id: "zen",
      name: "ZEN",
      title: "造型師",
      quote: "細節決定一切。",
      photo: "/photos/zen.jpg",
    },
  ],

  // ── 服務項目 ───────────────────────────────────────────────
  services: [
    {
      id: "haircut",
      tag: "01 · Haircut",
      name: "經典剪裁",
      desc: "洗剪吹 · 燙直 · 結構式剪裁",
      duration: "60–120 分鐘",
      items: [
        { name: "洗剪吹", price: "NT$ 800+" },
        { name: "乾剪", price: "NT$ 600+" },
        { name: "燙直", price: "NT$ 3,500+" },
        { name: "結構燙", price: "NT$ 4,500+" },
      ],
    },
    {
      id: "color",
      tag: "02 · Color",
      name: "職人染燙",
      desc: "單色染 · 挑染 · 漸層",
      duration: "120–180 分鐘",
      items: [
        { name: "全頭單色染", price: "NT$ 2,500+" },
        { name: "Balayage 挑染", price: "NT$ 4,500+" },
        { name: "漸層色", price: "NT$ 5,500+" },
        { name: "護色護髮", price: "NT$ 1,200+" },
      ],
    },
    {
      id: "treatment",
      tag: "03 · Treatment",
      name: "頭皮理療",
      desc: "深層護理 · 頭皮 SPA · 修護療程",
      duration: "60–90 分鐘",
      items: [
        { name: "深層護髮", price: "NT$ 1,500+" },
        { name: "頭皮 SPA", price: "NT$ 2,000+" },
        { name: "角蛋白修護", price: "NT$ 3,000+" },
        { name: "頭皮健診", price: "NT$ 800+" },
      ],
    },
  ],

  // ── 作品集 ─────────────────────────────────────────────────
  // 替換成實際照片路徑後，將 src 改為 "/photos/portfolio-1.jpg" 等
  portfolio: [
    { src: "https://picsum.photos/seed/hair-p1/600/900", label: "Sleek Black", tall: true },
    { src: "https://picsum.photos/seed/hair-p2/900/500", label: "Balayage Blonde", wide: true },
    { src: "https://picsum.photos/seed/hair-p3/500/500", label: "Textured Waves" },
    { src: "https://picsum.photos/seed/hair-p4/500/500", label: "Copper Tones" },
  ],

  // ── 頁腳 ───────────────────────────────────────────────────
  footerNote: "Powered by Pickub Studio",
};

// ── 時段設定 ──────────────────────────────────────────────────
export const TIME_SLOTS = [
  "10:00", "11:00", "13:00", "14:00",
  "15:30", "17:00", "18:30",
];
