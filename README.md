# Velora Studio — bağımsız yönetim sitesi

Bu klasör, mağazadan ayrı bir URL/hosting hedefi olarak dağıtılacak bağımsız yönetim arayüzüdür. Ürün kataloğu, sipariş durumları ve yorum onayı aynı Supabase veritabanıyla çalışır. E-posta/şifre girişi ile sonrasında veritabanındaki `profiles.role = 'admin'` rolü doğrulanır.

## Kurulum

1. Mağazanın `schema.sql` dosyasını aynı Supabase projesindeki SQL Editor'da çalıştırın.
2. `supabase-config.js` dosyası oluşturup bu dosyadaki boş URL ve anahtar alanlarını doldurun. (Örnek biçim `supabase-config.example.js` içinde.) `service_role` anahtarını tarayıcıya koymayın.
3. Önce `account.html` üzerinden yönetici hesabı oluşturun; e-posta doğrulamasını yapın.
4. Supabase SQL Editor'da yalnızca hesabınıza admin rolü verin: `update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID';`
5. Bu klasörü mağaza sitesinden bağımsız biçimde bir statik hosting hedefine yükleyin. Üretim alan adı hosting sağlayıcısında seçilir; yönetim sitesini herkese açık kayıttan ayırın ve yalnızca yetkili hesabınıza admin rolü verin.

## Yerel önizleme

```sh
cd /Users/besir/velora-admin
ruby -run -e httpd . -p 8766 -b 127.0.0.1
```

`http://127.0.0.1:8766/` adresi yönetim panelidir. Supabase yapılandırılana kadar panel bağlantı uyarısı gösterir ve veri/oturum uydurmaz.
