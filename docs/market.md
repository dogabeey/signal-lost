# Market altyapısı

Oyun başlarken `initializeGameMarket` mevcut save slotunun Cash,
Chronoshard, Aetherium ve artifact kayıtlarına bağlanır. `getGameMarket()` üzerinden
gelecekteki UI veya başka oyun modülleri erişebilir. Satın alma miktarları oyun içi
kazanç bonuslarından etkilenmez. Market UI üç etkin Aetherium test paketi içerir:
100 Aetherium → 100 Chronoshard, 200 → 250, 300 → 400. Diğer örnek ürünler
`enabled: false`; gerçek para ürünleri henüz açık değildir. Currency, Artifacts
ve Special kategorileri SVG ikonlarıyla gösterilir. Artifacts/Special şimdilik
boştur. 1 Aetherium/Chronoshard referans fiyatına göre indirim rozetleri %20 ve
%25'tir; bunlar ek miktar yüzdesi değil, birim fiyat indirimidir.

```js
import { getGameMarket } from './src/market/game_market.js'

const market = getGameMarket()
market.listCategories()
market.listProducts({ categoryId: 'currency' })
market.quote('chronoshards-100', { paymentId: 'aetherium', quantity: 3 })
await market.purchase('chronoshards-100', {
  paymentId: 'aetherium', quantity: 3, requestId: crypto.randomUUID(),
})
// Ağ/uygulama hatasında aynı isteği tekrar denemek için aynı requestId kullanılır.
const unsubscribe = market.subscribe((event) => console.log(event.type))
unsubscribe()
```

Yeni ürünü `src/market/catalog.js` içinde etkinleştirin. `quantity` paket sayısıdır;
`rewards[].amount` bir paketin içeriğidir. Bir ürün birden fazla ödül ve alternatif
ödeme içerebilir. `maxQuantity` tek işlem sınırı, `purchaseLimit` save slotundaki
toplam sınırdır. Kalıcı entitlement sahipliği cihazdaki slotlar arasında ortaktır.
Tekil artifact zaten varsa işlem reddedilir; repeatable artifact stack kazanır.
`remove-ads` otomatik interstitial reklamları engeller; oyuncunun seçtiği ödüllü
reklamları engellemez. Bu hak sonradan satın alınırsa sıradaki otomatik reklam da
gösterilmez.

Yeni kategori/ürün için katalog kaydı yeterlidir. Yeni currency için repository'nin
`currencyKeys` eşlemesine kayıt eklenir. Özel ödüller `createMarket` içindeki
`rewardHandlers` üzerinden `validate(state, reward, quantity)` ve
`apply(state, reward, quantity)` sağlar. Bunlar senkron olmalı; yalnızca verilen
state'i değiştirmeli, dış dünyaya yan etki yapmamalıdır. `registerRewardHandler`
mevcut handler'ı değiştirebilir. Yeni ödeme adaptörü
`registerPaymentProvider(id, { purchase(quote) })` ile bağlanır. Adaptör checkout'u
başlatır; para alındığını varsayıp ödül vermez. `fulfillVerifiedGrant` güvenilir
sunucu cevabı için kullanılan iç teslim API'sidir; tarayıcıda herkese açık olması
bir güvenlik sınırı değildir.

## Kayıt ve hata davranışı

Wallet satın alımları tüm ödülleri, sahipliği ve bakiyeyi önce kontrol eder; sonra
ödemeyi, ödülleri ve işlem kaydını write-ahead journal ile kaydeder. Eksik yazım,
oyun save'i yüklenmeden önce mutlak değerler kullanılarak tamamlanır. Aynı işlem
kimliği ikinci kez ödül vermez. Web Locks mevcutsa market işlemleri sekmeler
arasında, her durumda aynı servis içinde sırayla işlenir. Aynı save'i iki sekmede
eşzamanlı oynatmak desteklenmez; oyun kazanımları genel olarak localStorage
kullanır. Journal yazımından sonra kayıt hatası alınırsa oyun yeniden yüklenerek
recovery tamamlanmalı; yeni işlemler disk hatasını gizlemez.

İşlem defteri ve reklam hakkı game save slotu anahtarlarından ayrı tutulur. Slot
değiştirmek ödenmiş fişi tekrar harcatmaz. Wallet/paid teslim kaydı kalıcıdır;
defter normal oyun resetleri sırasında silinmemelidir. Cihazdan tüm uygulama
verisini silmek yerel oyun ilerlemesini de siler.

## Android gerçek para bağlantısı

Dijital oyun ürünleri Google Play Billing üzerinden satılır. Google Pay doğrudan
checkout eklemek yerine Play'in desteklediği ödeme yöntemleri kullanılır:
[Google Billing rehberi](https://developer.android.com/google/play/billing/integrate).
`capacitor-plugin-cdv-purchase` Android native bridge'i ve `google-auth-library`
sunucu doğrulama/kimlik kütüphanesi kuruldu. Native bridge sözleşmesi kurulu
13.18.0 sürümüne göre uygulandı. Play Billing'de her çağrı tek paket/SKU başlatır;
farklı paket büyüklükleri ayrı SKU olarak tanımlanır. Google tarafından döndürülen
çoklu miktar sunucuda ayrıca desteklenir; miktara istemci karar vermez.

```js
import { configureGooglePlayPurchases } from './src/market/game_market.js'

const play = await configureGooglePlayPurchases({
  backendUrl: 'https://market.example.com',
  getAuthToken: async () => accountSession.getFreshGoogleIdToken(),
  onEvent: (event) => { /* processing / pending / fulfilled / error */ },
})
await play.getPrices() // Google Play'in yerel para birimi ve fiyat metadata'sı
await getGameMarket().purchase('aetherium-pack', { paymentId: 'google-play' })
await play.restorePurchases()
```

`accountSession` bir kullanım örneğidir: oyunda henüz hesap/giriş sistemi yoktur.
Gelecekteki giriş modülü Google ID token sağlamalıdır. Servis kurulumunda önce
hesap doğrulanır; satın alıma hesabın SHA-256 kimliği aktarılır. Android dışındaki
platformlarda bu adaptör açık bir `PLATFORM_UNSUPPORTED` hatası verir. Steam veya
başka bir ödeme sağlayıcısı ayrı adaptör olarak eklenebilir.

`purchase()` sonucu `processing`, ödülün teslim edildiği anlamına gelmez. Native
`purchasesUpdated`/`setPurchases` olayları receipt'i sunucuya gönderir. Pending
ödemelere ödül verilmez. Ödeme iptalini/native hataları çağrı reddi ile, sunucu
doğrulama hatalarını `onEvent` ile işleyin. Ağ hatasında native purchase bitirilmez;
sonraki restore aynı receipt'i yeniden işleyebilir. Backend durable ödül kaydından
sonra consume/acknowledge yapar; bu işlem yarım kalırsa yeniden denenir. İstemci
Google onayını veya `orderId`'yi tek başına ödeme kanıtı olarak kabul etmez.

## Doğrulama servisi

Node 24 üzerinde `npm run market:server` ile çalışır. HTTPS reverse proxy arkasında
127.0.0.1:8787 dinler. Yapılandırma eksikse başlamaz.

| Sunucu environment değişkeni | İçerik |
| --- | --- |
| `MARKET_GOOGLE_CLIENT_ID` | Girişte kullanılan Google OAuth istemcisinin audience değeri |
| `MARKET_ANDROID_PACKAGE` | `com.solaris.asteroidbelt` |
| `MARKET_DATABASE_PATH` | Kalıcı diskte SQLite dosyasının mutlak yolu |
| `MARKET_ALLOWED_ORIGINS` | Virgülle ayrılmış izinli origin'ler, Android için `https://localhost` |
| `MARKET_PORT` | Varsayılan `8787` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Play Developer API yetkili sunucu service account dosyası; ADC/workload identity de kullanılabilir |

Anahtarlar sunucu ortamında kalır; `VITE_` değişkenlerine veya Android uygulamasına
eklenmez. `/session`, `/verify` ve `/grants` Google ID token ile kimlik doğrular.
Token sahibi, paket/SKU, PURCHASED durumu ve Google'ın quantity alanı kontrol
edilir. SQLite unique purchase token kaydı farklı hesaplara tekrar teslimi önler.
Catalog ödülleri sunucudan seçilir; istemciden ödül/fiyat kabul edilmez. SQLite
dosyası kalıcı ve yedekli olmalıdır; yatay ölçeklemede aynı `get/putOnce/list/
markFinalized` arayüzünü unique constraint sağlayan ortak veritabanıyla değiştirin.
Güvenlik yaklaşımı:
[Google purchase verification](https://developer.android.com/google/play/billing/security).

Gerçek para satışını açmak için Play Console SKU'ları, lisans test cihazı, hesap
girişi, HTTPS sunucu, service account izinleri ve kalıcı database gerekir. Bunlar
bu repository'de tanımlı harici kaynaklar değildir; canlı ödeme yapılmadı.

Bu servis **receipt doğrulama ve durable satın alma defteri** sağlar. Oyun ekonomisi
halen cihazdaki save'e bağlıdır; yerel bakiyeler manipülasyona karşı sunucu
otoritesi taşımaz. Yeni cihazda restore, satın alınmış paketleri yeni save'e
yeniden kurabilir; harcanmış satın alma bakiyesini cihazlar arasında birleştirmez.
Tam hesap ekonomisi gerekiyorsa bakiyeleri, harcamaları ve sahipliği sunucuya
taşıyın. İade/chargeback sonrası hak geri alma ve tüketilen bakiyenin düzeltilmesi
için Play RTDN/Voided Purchases uzlaştırması ayrıca kurulmalıdır; bu sürüm bu
servisleri içermez. Bu nedenle örnek gerçek para ürünleri kapalıdır. Catalog'daki
bir ürünü kapatmak önceden ödenmiş ürünü teslim etmeyi engellemez.

## Kontroller

`npm run test:market`: üç currency, toplu alım, sınırlar, idempotency, eşzamanlı
işlem, journal recovery, artifact/hak teslimi, Google pending/canceled/account
kontrolü, acknowledge/consume ve doğrulama başarısızlığı testleri.
`npm run build`: üretim web paketi. `npx cap sync android`: native bridge kaydı.
Play lisans testi gerçek Android cihazda, Console ürünleri oluşturulduktan sonra
yapılmalıdır. Üretim preview sunucusu açıkken `npm run test:market:ui`, yalıtılmış
Edge oturumunda masaüstü/mobil görünümü, sekmeleri, üç satın alımı, yetersiz bakiye
durumunu, navigasyonu ve kayıt kalıcılığını doğrular. Varsayılan adres
`http://127.0.0.1:4174/`; `MARKET_TEST_URL` ile değiştirilebilir.
