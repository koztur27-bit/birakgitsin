// Build-time flag.
// false = developer build (Ekran Haritası, Durum, test/güncelleme araçları açık)
// true  = user/Play build (müşteriye temiz deneyim, geliştirici araçları gizli)
// CI bu dosyayı iki derleme arasında değiştirerek dev ve user APK üretir.
export const IS_USER_RELEASE = false;
