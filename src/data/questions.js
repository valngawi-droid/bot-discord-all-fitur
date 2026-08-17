// Bank soal game (Bahasa Indonesia)

const TEBAK_KATA = [
  "KOMPUTER", "DISCORD", "INDONESIA", "PEMBARUAN", "KEMERDEKAAN",
  "PELAYANAN", "PELANGGAN", "ADMINISTRATOR", "PTERODACTYL", "SERVER",
  "PROGRAMMER", "KEYBOARD", "MONITOR", "JARINGAN", "KEAMANAN",
  "MATEMATIKA", "PERPUSTAKAAN", "KREATIVITAS", "PETUALANGAN", "PERSAHABATAN",
  "TEKNOLOGI", "INFORMASI", "KOMUNIKASI", "PENDIDIKAN", "KESEHATAN",
];

const HANGMAN_WORDS = [
  { word: "GUNDAM", hint: "Robot raksasa Jepang" },
  { word: "BATIK", hint: "Kain tradisional Indonesia" },
  { word: "KOMODO", hint: "Hewan purba dari Nusa Tenggara" },
  { word: "GARUDA", hint: "Lambang negara Indonesia" },
  { word: "RENDER", hint: "Proses membuat gambar 3D" },
  { word: "BOTOL", hint: "Wadah minuman" },
  { word: "SAWAH", hint: "Tempat menanam padi" },
  { word: "PESAWAT", hint: "Kendaraan terbang" },
  { word: "RAHASIA", hint: "Tidak boleh diketahui orang" },
  { word: "LAYANGAN", hint: "Mainan yang diterbangkan" },
  { word: "PEPAYA", hint: "Buah oranye berbiji hitam" },
  { word: "KUCING", hint: "Hewan peliharaan yang mengeong" },
  { word: "SEPATU", hint: "Alas kaki" },
  { word: "GUNUNG", hint: "Daratan yang menjulang tinggi" },
  { word: "PISANG", hint: "Buah kuning memanjang" },
];

const CAKLONTONG = [
  { q: "Kenapa sepeda tidak bisa berdiri sendiri?", a: ["capek", "karena capek", "kecapean"], hint: "Karena... (lelah)" },
  { q: "Apa yang lebih kecil dari semut?", a: ["anak semut", "bayi semut"], hint: "Keturunannya" },
  { q: "Binatang apa yang paling suci?", a: ["kucing", "kucing suci", "suci kucing"], hint: "Hewan yang sering di rumah" },
  { q: "Apa bahasa Inggrisnya kuda nil?", a: ["kuda nill", "kudanill", "kuda nil"], hint: "Jangan diterjemahkan" },
  { q: "Kalau ada ayam di atas pohon, mana yang lebih dulu jatuh?", a: ["daun", "daunnya", "daun kering"], hint: "Bukan ayamnya" },
  { q: "Apa yang selalu di depan kamu tapi tidak bisa dilihat?", a: ["masa depan", "depan", "masa depanmu"], hint: "Waktu yang belum terjadi" },
  { q: "Kenapa ban bocor disebut gembos?", a: ["karena kempes", "kempes", "ban kempes"], hint: "Isinya habis" },
  { q: "Buah apa yang paling sabar?", a: ["buah hati", "hati"], hint: "Bukan dimakan, tapi dirasakan" },
  { q: "Apa yang punya gigi tapi tidak bisa menggigit?", a: ["sikat", "sikat gigi", "sisir"], hint: "Alat mandi" },
  { q: "Kenapa lampu merah berhenti?", a: ["karena lampu hijau yang jalan", "hijau yang jalan", "bukan tugasnya"], hint: "Bukan dia yang maju" },
  { q: "Apa yang naik tapi tidak pernah turun?", a: ["umur", "usia"], hint: "Setiap tahun bertambah" },
  { q: "Huruf apa yang paling kedinginan?", a: ["b", "huruf b"], hint: "Karena... (beku? bukan) diapit A dan C... hmm: 'B' karena di tengah AC" },
  { q: "Apa yang bisa dipecahkan tapi tidak pernah jatuh?", a: ["janji", "rahasia", "tekateki", "teka-teki"], hint: "Bisa juga rahasia" },
  { q: "Mobil apa yang bikin capek?", a: ["mobil mogok", "mogok"], hint: "Harus didorong" },
  { q: "Kenapa ikan tidak pernah tenggelam?", a: ["karena ada di air", "bisa berenang", "karena berenang"], hint: "Habitatnya" },
  { q: "Apa yang ada di tengah-tengah laut?", a: ["huruf u", "u"], hint: "Lihat ejaannya: l-a-U-t" },
  { q: "Kalau dikali tetap sama, kalau dibagi tetap sama. Apa itu?", a: ["nol", "0", "angka nol"], hint: "Angka kosong" },
  { q: "Siapa yang selalu dihukum tanpa bersalah?", a: ["bola", "bola voli", "bola sepak"], hint: "Sering dipukul di lapangan" },
  { q: "Apa yang menjadi lebih basah semakin mengering?", a: ["handuk", "lap", "tisu"], hint: "Alat setelah mandi" },
  { q: "Kaki berapa yang dimiliki semut?", a: ["enam", "6", "enam kaki"], hint: "Serangga" },
];

const BENDERA = [
  { flag: "🇮🇩", answers: ["indonesia", "republik indonesia", "ri", "nkri"] },
  { flag: "🇯🇵", answers: ["jepang", "japan", "nippon", "nihons"] },
  { flag: "🇰🇷", answers: ["korea selatan", "south korea", "korea", "korsel"] },
  { flag: "🇰🇵", answers: ["korea utara", "north korea", "korut"] },
  { flag: "🇺🇸", answers: ["amerika", "amerika serikat", "usa", "united states", "as"] },
  { flag: "🇬🇧", answers: ["inggris", "united kingdom", "uk", "britain", "inggris raya"] },
  { flag: "🇫🇷", answers: ["perancis", "france", "prancis"] },
  { flag: "🇩🇪", answers: ["jerman", "germany", "deutschland"] },
  { flag: "🇮🇹", answers: ["italia", "italy"] },
  { flag: "🇪🇸", answers: ["spanyol", "spain", "espana", "españa"] },
  { flag: "🇧🇷", answers: ["brasil", "brazil"] },
  { flag: "🇦🇷", answers: ["argentina"] },
  { flag: "🇦🇺", answers: ["australia"] },
  { flag: "🇨🇦", answers: ["kanada", "canada"] },
  { flag: "🇮🇳", answers: ["india"] },
  { flag: "🇨🇳", answers: ["cina", "china", "tiongkok", "republik rakyat tiongkok"] },
  { flag: "🇷🇺", answers: ["rusia", "russia"] },
  { flag: "🇸🇦", answers: ["arab saudi", "saudi arabia", "saudi"] },
  { flag: "🇹🇷", answers: ["turki", "turkey"] },
  { flag: "🇹🇭", answers: ["thailand", "thai", "siam"] },
  { flag: "🇻🇳", answers: ["vietnam", "viet nam"] },
  { flag: "🇲🇾", answers: ["malaysia"] },
  { flag: "🇸🇬", answers: ["singapura", "singapore"] },
  { flag: "🇵🇭", answers: ["filipina", "philippines", "pilipina"] },
  { flag: "🇳🇱", answers: ["belanda", "netherlands", "holland"] },
  { flag: "🇪🇬", answers: ["mesir", "egypt"] },
  { flag: "🇿🇦", answers: ["afrika selatan", "south africa"] },
  { flag: "🇲🇽", answers: ["meksiko", "mexico"] },
  { flag: "🇵🇹", answers: ["portugal"] },
  { flag: "🇬🇷", answers: ["yunani", "greece"] },
];

const SIAPA_AKU = [
  {
    clues: ["Aku presiden pertama Indonesia.", "Aku proklamator kemerdekaan.", "Namaku sering jadi nama bandara."],
    answers: ["soekarno", "sukarno", "bung karno", "ir soekarno"],
  },
  {
    clues: ["Aku pahlawan wanita dari Aceh.", "Aku memimpin perang gerilya.", "Namaku jadi nama kapal perang."],
    answers: ["cut nyak dien", "cut nyak dhien", "tjoet nja dhien"],
  },
  {
    clues: ["Aku platform chat yang kamu pakai sekarang.", "Logoku berwarna blurple.", "Aku punya slash command."],
    answers: ["discord"],
  },
  {
    clues: ["Aku panel open-source untuk game server.", "Telurku disebut egg.", "Bot ini bisa auto-buat akunku."],
    answers: ["pterodactyl", "ptero", "pterodactyl panel"],
  },
  {
    clues: ["Aku pulau terpadat di Indonesia.", "Ibukota pernah ada di sini.", "Ada candi Borobudur di dekatku."],
    answers: ["jawa", "pulau jawa", "java"],
  },
  {
    clues: ["Aku buah berduri.", "Bauku kuat, rasaku legit.", "Orang luar negeri sering takut sama aku."],
    answers: ["durian"],
  },
  {
    clues: ["Aku hewan komodo.", "Aku hanya ada di Indonesia.", "Aku kadal raksasa."],
    answers: ["komodo", "biawak komodo", "varanus komodoensis"],
  },
  {
    clues: ["Aku search engine paling populer.", "Logoku berwarna-warni.", "Namaku jadi kata kerja."],
    answers: ["google"],
  },
  {
    clues: ["Aku Super Mario.", "Aku tukang ledeng.", "Aku dari kerajaan jamur."],
    answers: ["mario", "super mario"],
  },
  {
    clues: ["Aku mata uang Indonesia.", "Aku disingkat Rp.", "Aku bukan dollar."],
    answers: ["rupiah", "rupee indonesia", "idr"],
  },
];

module.exports = {
  TEBAK_KATA,
  HANGMAN_WORDS,
  CAKLONTONG,
  BENDERA,
  SIAPA_AKU,
};
