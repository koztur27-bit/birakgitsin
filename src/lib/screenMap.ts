export type ScreenMapItem = {
  code: string;
  name: string;
  desc: string;
  indent?: boolean;
};

export const SCREEN_MAP: ScreenMapItem[] = [
  { code: '1', name: 'Ana Sayfa · Üst çubuk', desc: 'Marka, PRO rozeti ve paylaş butonu' },
  { code: '2', name: 'Ana Sayfa · Sigarasız süre', desc: 'Odak kartı: sigarasız süre, kurtarılan sigara ve biriken para' },
  { code: '3', name: 'Ana Sayfa · Hızlı destek', desc: 'Kriz Geldi (SOS) ve Bırakma Koçu kısayolları' },
  { code: '4', name: 'Ana Sayfa · Bugün & hedef', desc: 'Bugün içtiklerin, bugünkü hedefin, içilen sayı ve 1 Dal İçtim' },
  { code: '5', name: 'Kriz sekmesi', desc: 'Nefes, sayaç, topraklama, baloncuk oyunu ve tetikleyici/şiddet kaydı' },
  { code: '6', name: 'Sayaç sekmesi', desc: 'Dayanma sayacı: süre seçimi, başlat/duraklat/sıfırla ve alarm' },
  { code: '7', name: 'İstatistik · Hedef & simülatör', desc: 'Tasarruf hedefi ve gelecek birikim simülatörü' },
  { code: '8', name: 'İstatistik · Rapor & analiz', desc: 'Haftalık koç raporu, takvim, rozetler, madalyalar ve tetikleyici analizi' },
  { code: '9', name: 'Sağlık sekmesi', desc: 'Sıradaki sağlık kazancı ve iyileşme kartları' },
  { code: '10', name: 'Ayarlar sekmesi', desc: 'Hızlı araçlar (Harita/Durum/Güncelle/Yenile) ve uygulama ayarları' },
];
