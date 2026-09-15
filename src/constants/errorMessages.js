// Kullanıcıya gösterilen hata mesajları — TEK kaynak.
//
// Kural: Bu dosyadaki metinler son kullanıcı içindir. HTTP kodu, env değişken adı,
// sağlayıcı adı (Gemini/Groq/Supabase), stack trace veya geliştirici talimatı
// ASLA buraya yazılmaz; bu tür teknik ayrıntılar yalnızca console.warn/error'a gider
// (bkz. src/services/errors/normalizeError.js).
//
// Ton: sakin, paniğe sevk etmeyen, ne yapılacağını söyleyen.

export const ERROR_CODES = {
  // Ağ / sunucu
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',

  // Kimlik doğrulama
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_CONFIRMED: 'AUTH_EMAIL_NOT_CONFIRMED',
  AUTH_ALREADY_REGISTERED: 'AUTH_ALREADY_REGISTERED',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  AUTH_INVALID_EMAIL: 'AUTH_INVALID_EMAIL',
  AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
  AUTH_SESSION_REQUIRED: 'AUTH_SESSION_REQUIRED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  ACCOUNT_DELETE_FAILED: 'ACCOUNT_DELETE_FAILED',

  // Veritabanı
  DB_DUPLICATE: 'DB_DUPLICATE',
  DB_DUPLICATE_DATE: 'DB_DUPLICATE_DATE',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_PERMISSION: 'DB_PERMISSION',
  DB_ERROR: 'DB_ERROR',

  // Yapay zeka
  AI_CONSENT_REQUIRED: 'AI_CONSENT_REQUIRED',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
  AI_PARSE_FAILED: 'AI_PARSE_FAILED',
  AI_CONTENT_BLOCKED: 'AI_CONTENT_BLOCKED',
  AI_IMAGE_INVALID: 'AI_IMAGE_INVALID',
  AI_FOOD_NOT_FOUND: 'AI_FOOD_NOT_FOUND',
  AI_DAILY_LIMIT: 'AI_DAILY_LIMIT',

  // Satın alma
  IAP_CANCELLED: 'IAP_CANCELLED',
  IAP_UNAVAILABLE: 'IAP_UNAVAILABLE',
  IAP_FAILED: 'IAP_FAILED',
  IAP_RESTORE_EMPTY: 'IAP_RESTORE_EMPTY',

  // Cihaz / izin
  PERMISSION_CAMERA: 'PERMISSION_CAMERA',
  PERMISSION_GALLERY: 'PERMISSION_GALLERY',

  // Genel
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Her kod için: kullanıcıya gösterilecek başlık + mesaj, toast türü ve
 * "tekrar dene" anlamlı mı bilgisi.
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_OFFLINE]: {
    title: 'İnternet bağlantısı yok',
    message: 'Şu anda çevrimdışısınız. Bağlantınızı kontrol edip tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.SERVER_UNAVAILABLE]: {
    title: 'Sunucuya ulaşılamıyor',
    message: 'Şu anda sunucularımıza ulaşılamıyor. Bağlantınızı kontrol edip biraz sonra tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },
  [ERROR_CODES.TIMEOUT]: {
    title: 'Bağlantı zaman aşımı',
    message: 'İşlem beklenenden uzun sürdü. Lütfen tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },

  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: {
    title: 'Giriş yapılamadı',
    message: 'E-posta veya şifre hatalı.',
    severity: 'error',
    retryable: false,
  },
  [ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED]: {
    title: 'E-posta doğrulanmadı',
    message: 'Gelen kutunuzdaki doğrulama bağlantısına tıklayıp tekrar giriş yapın.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AUTH_ALREADY_REGISTERED]: {
    title: 'Hesap zaten var',
    message: 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AUTH_WEAK_PASSWORD]: {
    title: 'Şifre çok zayıf',
    message: 'Şifreniz en az 6 karakter olmalı.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AUTH_INVALID_EMAIL]: {
    title: 'Geçersiz e-posta',
    message: 'Lütfen geçerli bir e-posta adresi girin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AUTH_RATE_LIMIT]: {
    title: 'Çok fazla deneme',
    message: 'Kısa sürede çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.AUTH_SESSION_REQUIRED]: {
    title: 'Giriş gerekli',
    message: 'Bu işlem için giriş yapmanız gerekiyor.',
    severity: 'info',
    retryable: false,
  },
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    title: 'Oturum süresi doldu',
    message: 'Güvenliğiniz için oturumunuz kapatıldı. Lütfen tekrar giriş yapın.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.ACCOUNT_DELETE_FAILED]: {
    title: 'Hesap silinemedi',
    message: 'Hesabınız şu anda silinemedi. Lütfen daha sonra tekrar deneyin; sorun sürerse bize ulaşın.',
    severity: 'error',
    retryable: true,
  },

  [ERROR_CODES.DB_DUPLICATE]: {
    title: 'Zaten kayıtlı',
    message: 'Bu kayıt zaten mevcut.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.DB_DUPLICATE_DATE]: {
    title: 'Bu tarih dolu',
    message: 'Bu tarih için zaten bir kayıt var. Farklı bir tarih seçin veya mevcut kaydı düzenleyin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.DB_NOT_FOUND]: {
    title: 'Kayıt bulunamadı',
    message: 'Aradığınız kayıt bulunamadı. Silinmiş olabilir.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.DB_PERMISSION]: {
    title: 'Yetki yok',
    message: 'Bu işlem için yetkiniz yok. Lütfen tekrar giriş yapmayı deneyin.',
    severity: 'error',
    retryable: false,
  },
  [ERROR_CODES.DB_ERROR]: {
    title: 'Kaydedilemedi',
    message: 'Verileriniz şu anda kaydedilemedi. Lütfen tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },

  [ERROR_CODES.AI_CONSENT_REQUIRED]: {
    title: 'Onay gerekli',
    message: 'Yapay zeka özellikleri için veri paylaşımı onayı gerekiyor.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AI_NOT_CONFIGURED]: {
    title: 'Yapay zeka kullanılamıyor',
    message: 'Yapay zeka asistanı şu anda kullanılamıyor. Daha sonra tekrar deneyin.',
    severity: 'error',
    retryable: false,
  },
  [ERROR_CODES.AI_RATE_LIMIT]: {
    title: 'Asistan çok yoğun',
    message: 'Yapay zeka asistanı şu an çok yoğun. Birkaç dakika sonra tekrar deneyebilirsiniz.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.AI_TIMEOUT]: {
    title: 'Yanıt gecikti',
    message: 'Yapay zeka yanıtı beklenenden uzun sürdü. Lütfen tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.AI_UNAVAILABLE]: {
    title: 'Asistan geçici olarak kapalı',
    message: 'Yapay zeka asistanına şu anda ulaşılamıyor. Biraz sonra tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },
  [ERROR_CODES.AI_EMPTY_RESPONSE]: {
    title: 'Yanıt alınamadı',
    message: 'Asistan bu kez yanıt üretemedi. Lütfen tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.AI_PARSE_FAILED]: {
    title: 'Sonuç okunamadı',
    message: 'Analiz sonucu işlenemedi. Lütfen tekrar deneyin.',
    severity: 'warning',
    retryable: true,
  },
  [ERROR_CODES.AI_CONTENT_BLOCKED]: {
    title: 'Analiz yapılamadı',
    message: 'Bu içerik analiz edilemedi. Farklı bir fotoğraf veya ifade deneyin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AI_IMAGE_INVALID]: {
    title: 'Fotoğraf okunamadı',
    message: 'Fotoğraf işlenemedi. Lütfen daha net bir fotoğraf seçin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AI_FOOD_NOT_FOUND]: {
    title: 'Besin bulunamadı',
    message: 'Bu besin için değer bulunamadı. Adını farklı yazmayı deneyin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.AI_DAILY_LIMIT]: {
    title: 'Günlük hak doldu',
    message: 'Bugünkü analiz hakkınızı kullandınız. Yarın tekrar deneyebilirsiniz.',
    severity: 'warning',
    retryable: false,
  },

  [ERROR_CODES.IAP_CANCELLED]: {
    title: 'İptal edildi',
    message: 'Satın alma iptal edildi.',
    severity: 'info',
    retryable: false,
  },
  [ERROR_CODES.IAP_UNAVAILABLE]: {
    title: 'Mağaza kullanılamıyor',
    message: 'Uygulama mağazasına şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },
  [ERROR_CODES.IAP_FAILED]: {
    title: 'Satın alma tamamlanamadı',
    message: 'Satın alma tamamlanamadı. Ödeme bilgilerinizi kontrol edip tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },
  [ERROR_CODES.IAP_RESTORE_EMPTY]: {
    title: 'Abonelik bulunamadı',
    message: 'Bu hesapla ilişkili aktif bir abonelik bulunamadı.',
    severity: 'info',
    retryable: false,
  },

  [ERROR_CODES.PERMISSION_CAMERA]: {
    title: 'Kamera izni gerekli',
    message: 'Fotoğraf çekmek için Ayarlar’dan kamera iznini açın.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.PERMISSION_GALLERY]: {
    title: 'Galeri izni gerekli',
    message: 'Fotoğraf seçmek için Ayarlar’dan galeri iznini açın.',
    severity: 'warning',
    retryable: false,
  },

  [ERROR_CODES.VALIDATION]: {
    title: 'Eksik bilgi',
    message: 'Lütfen girdiğiniz bilgileri kontrol edin.',
    severity: 'warning',
    retryable: false,
  },
  [ERROR_CODES.UNKNOWN]: {
    title: 'Bir şeyler ters gitti',
    message: 'Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.',
    severity: 'error',
    retryable: true,
  },
};

/** Kod için mesaj tanımı; bilinmeyen kod → UNKNOWN */
export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN];
}
