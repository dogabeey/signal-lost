# Günlük görevler

Günlük takvim Europe/Istanbul (UTC+03) kullanır. Her gece 00:00'da 3 rastgele görev
eklenir. İlk girişte de 3 görev verilir. Tamamlanmış ama Claim yapılmamış görevler
dahil kapasite 9'dur; yer yoksa yeni görevler atlanır. Örneğin 8 görev varsa sadece
1 görev eklenir. Görevler gün veya hafta değişince silinmez. Çevrimdışı geçen
günler tekrar girişte işlenir, ancak kapasite hiçbir zaman aşılmaz. Dolu halde
atlanmış bir günün görevleri sonradan yer açılınca verilmez.

Hedefler standart hücre, Chronoshard kristali ve Aetherium kristali toplamak veya
aktif oyun süresidir. Görev eklenmeden önceki hareketler geriye dönük sayılmaz.
Sandbox ilerleme kazandırmaz; reklam ödülü veya market alımı kristal toplama
görevini ilerletmez. Hücre görevleri gerçek alınan hücre sayısını takip eder,
ödül çarpanlarını saymaz. Aynı tür görevler aynı toplama olayıyla ilerleyebilir.

Her görev Claim edildiğinde 5 Aetherium ve `5 + 3 × (maksimum tier − 1)`
Chronoshard verir: Tier 1'de 5, Tier 5'te 17, Tier 9'da 29. Maksimum tier,
oyuncunun açtığı en yüksek tier'dır; ödül Claim anında hesaplanır. Dark Core gibi
oyun içi kazanç bonusları görev veya kutu ödüllerine uygulanmaz. Claim görevi
kaldırır ve yeni günlük görevler için yer açar.

Haftalık dönem pazartesi 00:00'da sıfırlanır. Hedefi tamamlanan her görev haftalık
sayaca bir kez eklenir; Claim yapmayı beklemek haftayı değiştirmez. 15 tamamlamada
kutu açılabilir ve tam 100 Aetherium + 100 Chronoshard verir. Kutu haftada bir kez
açılır. Önceki haftada tamamlanmış görevlerin sonradan Claim edilmesi yeni haftanın
sayacını artırmaz. Açılmamış haftalık kutu yeni dönem başladığında sıfırlanır.

Sağ üstteki görev butonunun kırmızı rozeti, yeni veya tamamlanmış görevlerin
birleşim sayısını gösterir; aynı görev iki kez sayılmaz. Ekran açılınca yeni
işaretleri temizlenir. Tamamlanan görevler Claim edilene kadar bildirimde kalır.
Görev ekranı aktif oyunu duraklatır ve kapanınca önceki duraklama durumuna döner.

Debug konsolu (`"` tuşu):

- `trigger_misison`: yeni gün tetiklemesi gibi en fazla 3 rastgele görev ekler;
  9 sınırına uyar. Yazım kolaylığı için `trigger_mission` da kabul edilir.
- `complete_random_mission`: bitmemiş rastgele bir görevi tamamlar; ödülü otomatik
  vermez, Claim butonunu açar ve haftalık sayaca ekler.

Kayıt save slotuna özeldir; Steam cloud'un slot anahtarlarına dahildir. Görev
Claim'i ve kutu hakkı, currency teslimiyle birlikte write-ahead journal üzerinden
kaydedilir. Eksik yazım yeniden girişte tamamlanır; aynı Claim ikinci ödül vermez.
Saat geriye alınırsa işlenmiş gün ve hafta tekrar verilmez. Takvim yerel cihaz
saatini kullanır. `clear_save all` görev kaydını da sıfırlar.

`src/daily_missions.js` görev şablonlarını, hedefleri ve takvim/ödül mantığını;
`src/daily_missions_ui.js` ekranı içerir. `npm run test:missions` takvim, kapasite,
haftalık hedef, bildirim, ödül ve kayıt kesintisini doğrular. Üretim preview adresi
`http://127.0.0.1:4174/` açıkken `npm run test:missions:ui` yalıtılmış Edge testini
çalıştırır (`MARKET_TEST_URL` ile farklı adres seçilebilir).
