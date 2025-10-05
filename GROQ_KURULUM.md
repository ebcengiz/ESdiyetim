# GROQ AI KURULUM KILAVUZU

## ADIM 1: API Key Alın

1. https://console.groq.com/keys adresine gidin
2. "Sign Up" ile kayıt olun (Google ile giriş önerilir)
3. "Create API Key" butonuna tıklayın
4. İsim verin: "ESdiyet"
5. "Submit" → API Key'i KOPYALAYIN (gsk_ ile başlar)

## ADIM 2: API Key'i Projeye Ekleyin

1. src/services/aiService.js dosyasını açın
2. 8. satırı bulun ve değiştirin:
   ```javascript
   const AI_PROVIDER = "groq";
   ```
3. 12. satırı bulun ve API key'inizi yapıştırın:
   ```javascript
   const GROQ_API_KEY = "gsk_buraya_api_key_yapıştırın";
   ```

## ADIM 3: Kaydet ve Test Et

1. Dosyayı kaydedin (Cmd/Ctrl + S)
2. Terminalde uygulamayı yeniden başlatın:
   ```bash
   npx expo start
   ```
3. Uygulamada Hedefler → Hedef ekle → AI Tavsiye Al

## Beklenen Sonuç

✅ Konsolda: "🤖 AI tavsiyesi isteniyor (groq)..."
✅ 1-2 saniye içinde AI tavsiyesi gelecek
✅ Tavsiye modal ekranında gösterilecek

## Sorun mu var?

Konsolda hata görürseniz:
- API key doğru kopyalandı mı kontrol edin
- "" içinde olmalı
- Başında/sonunda boşluk olmamalı

Örnek doğru format:
```javascript
const GROQ_API_KEY = "gsk_abc123xyz789...";
```
