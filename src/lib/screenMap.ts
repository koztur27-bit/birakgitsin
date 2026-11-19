export type ScreenMapItem = {
  code: string;
  name: string;
  desc: string;
  indent?: boolean;
};

export const SCREEN_MAP: ScreenMapItem[] = [
  { code: '1', name: 'Üst çubuk', desc: 'Başlık, tarih, gün rozeti, Harita / Durum / Güncelle butonları' },
  { code: '2', name: 'Yenileme butonu', desc: '“Sayfayı yenile” — uygulamayı tazeler' },
  { code: '3', name: 'Yeşil kart', desc: 'Günün ana durum kartı' },
  { code: '3a', name: 'Bugün içtiklerin kutusu', desc: 'Her sigaranın simgesi + içildiği saat', indent: true },
  { code: '3b', name: 'Bugünkü hedefin', desc: 'Günlük hedef sayısı', indent: true },
  { code: '3c', name: 'Bugün içtiğin', desc: 'Büyük sayaç (içilen sigara)', indent: true },
  { code: '3d', name: 'İlerleme çubuğu', desc: 'Sarı dolum çubuğu', indent: true },
  { code: '3e', name: 'Durum yazısı', desc: '“Kalan hakkın …” açıklaması', indent: true },
  { code: '3f', name: 'Butonlar', desc: '“+1 Sigara içtim” ve “Geri al”', indent: true },
  { code: '4', name: 'Dayanma sayacı', desc: 'Kronometre kartı (Başlat / Duraklat / Sıfırla)' },
  { code: '5', name: 'Para kartları', desc: '“Bugün kazandın” ve “Toplam kazandın”' },
  { code: '6', name: 'İzinli pencereler', desc: 'Varsa izinli saat aralıkları listesi' },
  { code: '7', name: 'Hedefe sadık kaldığın gün', desc: 'Üst üste tutturulan gün (seri)' },
  { code: '8', name: 'Sıradaki sağlık kazancı', desc: 'Bir sonraki sağlık kilometre taşı ve kalan süre' },
  { code: '9', name: 'Alt sekme çubuğu', desc: 'Ana Sayfa / Kriz / Sayaç / İstatistik / Sağlık / Ayarlar' },
  {
    code: '10',
    name: 'Kriz Geldi (SOS)',
    desc: '60 saniyelik animasyonlu nefes egzersizi ve tetikleyici seçimi',
  },
  {
    code: '11',
    name: 'Tasarruf Hedefi',
    desc: 'Biriken parayla alınacak ürün ve canlı ilerleme çubuğu',
  },
  {
    code: '12',
    name: 'Sağlık Durumum sekmesi',
    desc: 'Nabız, karbonmonoksit, tat/koku ve akciğer iyileşme yüzdeleri',
  },
];
