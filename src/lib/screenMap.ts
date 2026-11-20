export type ScreenMapItem = {
  code: string;
  name: string;
  desc: string;
  indent?: boolean;
};

export const SCREEN_MAP: ScreenMapItem[] = [
  { code: '1', name: 'Ana Sayfa · Üst çubuk', desc: 'Marka, PRO rozeti ve paylaş butonu' },
  { code: '2', name: 'Ana Sayfa · Bugün içtiklerin', desc: 'Orijinal büyük mavi kart: bugün içtiklerin, hedef, içilen sayı, ilerleme ve +1/Geri al' },
  { code: '3', name: 'Ana Sayfa · Hızlı erişim', desc: 'Kriz Geldi (SOS), Bırakma Koçu ve 1 Dal İçtim (kaçamak) butonları' },
  { code: '4', name: 'Sayaç sekmesi · Dayanma sayacı', desc: 'Süre seçimi, başlat/duraklat/sıfırla ve alarm' },
  { code: '5', name: 'Kriz sekmesi', desc: 'Nefes, sayaç, topraklama, baloncuk oyunu ve tetikleyici/şiddet kaydı' },
  { code: '6', name: 'Ana Sayfa · (yedek)', desc: 'Bu sürümde ana sayfa kartları 1-2-3 olarak düzenlendi' },
  { code: '7', name: 'İstatistik · Hedef & simülatör', desc: 'Tasarruf hedefi ve gelecek birikim simülatörü' },
  { code: '8', name: 'İstatistik · Rapor & analiz', desc: 'Haftalık koç raporu, takvim, rozetler, madalyalar ve tetikleyici analizi' },
  { code: '9', name: 'Sağlık sekmesi', desc: 'Sıradaki sağlık kazancı ve iyileşme kartları' },
  { code: '10', name: 'Ayarlar sekmesi', desc: 'Hızlı araçlar (Harita/Durum/Güncelle/Yenile) ve uygulama ayarları' },
];
