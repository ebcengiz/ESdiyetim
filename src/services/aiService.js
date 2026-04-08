// AI Servis Orchestrator
// Provider implementasyonları: src/services/ai/providers.js
// HANGİ AI KULLANILACAK? ('huggingface', 'groq', 'cohere' veya 'gemini')

import { callProvider, callGroqVision, callGeminiVision, GROQ_API_KEY, GEMINI_API_KEY } from './ai/providers';

const AI_PROVIDER = 'groq'; // BURADAN DEĞİŞTİRİN

const call = (prompt) => callProvider(AI_PROVIDER, prompt);

// ─── Prompt Builder'lar ───────────────────────────────────────────────────────

function buildGoalPrompt({ title, currentWeight, targetWeight, startDate, targetDate }) {
  const diffDays = Math.ceil(Math.abs(new Date(targetDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const weightDiff = currentWeight && targetWeight ? Math.abs(currentWeight - targetWeight) : null;
  const weightGoal = currentWeight && targetWeight
    ? (currentWeight > targetWeight ? 'kilo vermek' : 'kilo almak')
    : 'hedefe ulaşmak';
  return `Bir kişi şu diyet hedefini belirledi:
- Hedef: ${title}
${currentWeight ? `- Mevcut Kilo: ${currentWeight} kg` : ''}
- Hedef Kilo: ${targetWeight} kg
${weightDiff ? `- Hedeflenen Değişim: ${weightDiff.toFixed(1)} kg ${weightGoal}` : ''}
- Süre: ${diffDays} gün (${Math.ceil(diffDays / 7)} hafta)

Lütfen bu kişiye:
1. Hedefinin gerçekçi olup olmadığı hakkında kısa bir değerlendirme yap
2. Günlük veya haftalık ne kadar kilo değişimi hedeflemesi gerektiğini söyle
3. 3-4 pratik ve uygulanabilir tavsiye ver
4. Motivasyon için kısa bir mesaj ekle

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 300 kelime kullan.`;
}

function buildWeightTrackingPrompt({ weights, stats }) {
  let trend = 'stabil';
  if (stats.totalChange > 1) trend = 'artış';
  else if (stats.totalChange < -1) trend = 'azalış';
  const recentWeights = weights.slice(0, Math.min(3, weights.length));
  const recentChanges = recentWeights.slice(0, -1).map((w, i) =>
    (w.weight - recentWeights[i + 1].weight).toFixed(1)
  );
  return `Bir kişinin kilo takip bilgileri:
- Mevcut Kilo: ${stats.latest} kg
- Başlangıç Kilosu: ${stats.oldest} kg
- Toplam Değişim: ${stats.totalChange.toFixed(1)} kg
- Ortalama Kilo: ${stats.average} kg
- Kayıt Sayısı: ${weights.length}
- Trend: ${trend}
${recentChanges.length > 0 ? `- Son Değişimler: ${recentChanges.join(' kg, ')} kg` : ''}

Lütfen bu kişiye:
1. Kilo takip süreci hakkında kısa bir değerlendirme yap
2. Trend analizi yap (ilerleme durumu nasıl?)
3. 4-5 pratik tavsiye ver (beslenme, egzersiz, motivasyon)
4. Devam etmesi gereken olumlu davranışları vurgula

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 300 kelime kullan.`;
}

function buildBMIPrompt({ bmi, category, height, weight, age, gender }) {
  return `Bir kişinin vücut kitle indeksi (VKİ) bilgileri:
- VKİ: ${bmi}
- Kategori: ${category}
- Boy: ${height} cm
- Kilo: ${weight} kg
- Yaş: ${age}
- Cinsiyet: ${gender === 'male' ? 'Erkek' : 'Kadın'}

Lütfen bu kişiye:
1. VKİ değeri hakkında kısa bir değerlendirme yap
2. Sağlık durumu açısından ne anlama geldiğini açıkla
3. 4-5 pratik ve uygulanabilir beslenme ve yaşam tarzı tavsiyesi ver
4. Hedef kilo aralığı öner (varsa)

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 250 kelime kullan.`;
}

function buildBMIBulletsPrompt({ bmi, category, height, weight, age, gender }) {
  const gLabel = gender === 'male' || gender === 'Erkek' ? 'Erkek' : 'Kadın';
  return `Sen bir beslenme ve yaşam tarzı asistanısın (genel bilgi, tıbbi teşhis değil).

Kişi: VKİ ${bmi}, kategori: ${category}. Boy ${height} cm, kilo ${weight} kg, yaş ${age}, cinsiyet: ${gLabel}.

Tam olarak 5 kısa öneri yaz. Kurallar:
- Her öneri ayrı satırda olsun; satır başında numara, tire veya madde işareti KULLANMA.
- Her satır en fazla 100 karakter, Türkçe, pratik ve güvenli genel öneri.
- Başka giriş veya özet yazma; sadece 5 satır.`;
}

function buildHealthTipPrompt(category) {
  const categoryInfo = {
    genel: 'genel sağlık ve yaşam tarzı',
    beslenme: 'sağlıklı beslenme ve diyet',
    egzersiz: 'egzersiz ve fiziksel aktivite',
    motivasyon: 'motivasyon ve zihinsel sağlık',
  };
  return `${categoryInfo[category] || 'sağlıklı yaşam'} konusunda kısa, pratik ve uygulanabilir bir tavsiye ver.

Tavsiye şunları içermeli:
1. Bir başlık (kısa ve çarpıcı)
2. Açıklama (2-3 cümle)
3. Pratik bir öneri veya ipucu

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 150 kelime kullan.`;
}

function buildDietPlanPrompt({ stats, recentPlans }) {
  const recentMeals = recentPlans.slice(0, 7).map((plan) => {
    const meals = [];
    if (plan.breakfast) meals.push(`Kahvaltı: ${plan.breakfast}`);
    if (plan.lunch) meals.push(`Öğle: ${plan.lunch}`);
    if (plan.dinner) meals.push(`Akşam: ${plan.dinner}`);
    if (plan.total_calories) meals.push(`Kalori: ${plan.total_calories} kcal`);
    return `[Tarih: ${new Date(plan.date).toLocaleDateString('tr-TR')}] -> ${meals.join(', ')}`;
  }).filter(Boolean).join('\n');

  return `Bir kullanıcının genel diyet ve öğün takip bilgileri:
- Toplam Eklenen Plan Sayısı: ${stats.totalPlans}
- Ortalama Kalori Alımı: ${stats.avgCalories > 0 ? `${stats.avgCalories} kcal` : 'Belirtilmemiş'}
- Son 30 Gün: ${stats.monthlyPlans} adet plan girişi
${recentMeals ? `\nKullanıcının sisteme girdiği son öğün detayları:\n${recentMeals}` : ''}

Lütfen bu kullanıcıya:
1. Son girdiği öğünlerin besin değerleri ve dengesi üzerinden genel bir analiz yap.
2. Ortalama kalori alımı ve plan düzenliliğini değerlendir.
3. 3-4 pratik beslenme tavsiyesi ver.
4. Motivasyonunu artıracak samimi bir kapanış yap.

Cevabını Türkçe, diyetisyen gibi yaz. Maksimum 350 kelime kullan.`;
}

// ─── Fallback verileri ────────────────────────────────────────────────────────

const FALLBACK_HEALTH_TIPS = {
  genel: `💡 Günlük Sağlık İpucu\n\nSu içmeyi unutmayın! Günde en az 2-3 litre su içmek metabolizmanızı hızlandırır, cildinizi güzelleştirir ve enerji seviyenizi yüksek tutar.\n\n✨ İpucu: Her sabah kalktığınızda bir bardak ılık su içerek güne başlayın.`,
  beslenme: `🥗 Beslenme Tavsiyesi\n\nTabak metodunu uygulayın! Tabağınızın yarısı sebze, çeyreği protein, çeyreği de karmaşık karbonhidratlardan oluşsun.\n\n✨ İpucu: Her öğünde farklı renkte sebzeler tüketmeye çalışın.`,
  egzersiz: `💪 Egzersiz Önerisi\n\nKüçük adımlarla başlayın! Günde sadece 10 dakikalık yürüyüş bile fark yaratır.\n\n✨ İpucu: Merdiven kullanmayı tercih edin, kısa mesafelerde yürüyün.`,
  motivasyon: `🌟 Motivasyon Desteği\n\nKüçük başarılarınızı kutlayın! Her adım önemlidir.\n\n✨ İpucu: Her gün bir başarınızı yazın, bu pozitif bir bakış açısı geliştirir.`,
};

const FALLBACK_BMI_ADVICE = {
  Zayıf: `🏥 VKİ Analizi\n\nVKİ değeriniz normal aralığın altında. Sağlıklı kilo almak için profesyonel destek alabilirsiniz.\n\n📝 Tavsiyeler:\n• Günlük kalori alımınızı artırın\n• Protein açısından zengin besinler tüketin\n• Sağlıklı yağlar ekleyin\n• Günde 5-6 öğün şeklinde beslenin`,
  Normal: `✅ VKİ Analizi\n\nHarika! Sağlıklı bir kilo aralığındasınız. Bu dengeyi korumak önemli.\n\n📝 Tavsiyeler:\n• Dengeli beslenmeye devam edin\n• Haftada 150 dakika egzersiz yapın\n• Bol su için\n• Yeterli uyuyun (7-8 saat)`,
  'Fazla Kilolu': `⚠️ VKİ Analizi\n\nVKİ değeriniz normalin üzerinde.\n\n📝 Tavsiyeler:\n• Günlük kalori alımınızı kontrol edin\n• Haftada en az 4-5 gün egzersiz yapın\n• Şekerli içeceklerden kaçının\n• Sebze ve meyve tüketiminizi artırın`,
  Obez: `🏥 VKİ Analizi\n\nVKİ değeriniz obezite kategorisinde. Profesyonel destek almanızı öneririz.\n\n📝 Tavsiyeler:\n• Bir diyetisyen ve doktor ile çalışın\n• Düzenli egzersiz programı başlatın\n• İşlenmiş gıdalardan uzak durun\n• Porsiyon kontrolü yapın`,
};

const FALLBACK_BMI_BULLETS = {
  Zayıf: ['Kalori alımınızı kontrollü şekilde artırmayı düşünün', 'Protein ve sağlıklı yağ kaynaklarına yer verin', 'Haftada birkaç gün kuvvet antrenmanı planlayın', 'Öğün atlamadan düzenli beslenmeye özen gösterin', 'Hızlı kilo alımından kaçının; sürece doktorla bakın'],
  Normal: ['Dengeli tabak modeli ve çeşitli besinlerle devam edin', 'Haftada en az 150 dakika orta tempolu hareket hedefleyin', 'Günde yeterli su ve düzenli uyku düzenine dikkat edin', 'İşlenmiş gıda ve aşırı şeker tüketimini sınırlayın', 'Kilonuzu arada ölçerek koruma hedefinizi gözden geçirin'],
  'Fazla Kilolu': ['Günlük enerji dengenizi yumuşak ve sürdürülebilir tutun', 'Porsiyon ve öğün zamanlamasına dikkat edin', 'Yürüyüş veya yüzme gibi düzenli kardiyo ekleyin', 'Şekerli içecekleri azaltıp lifli besinlere ağırlık verin', 'Haftalık küçük hedeflerle ilerleyin; acele etmeyin'],
  Obez: ['Sağlık profesyoneliyle kişisel plan oluşturmayı değerlendirin', 'Günlük hareketi kademeli olarak artırmayı hedefleyin', 'İşlenmiş ve yüksek enerjili atıştırmalıkları azaltın', 'Uyku ve stres yönetimine özen gösterin', 'Küçük sürdürülebilir adımlarla uzun vadeli düşünün'],
};

// ─── Ana servis nesnesi ───────────────────────────────────────────────────────

export const aiService = {
  async getGoalAdvice(goalData) {
    try {
      const advice = await call(buildGoalPrompt(goalData));
      return { success: true, advice, provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 AI hedef tavsiyesi hatası:', error.message);
      return { success: false, advice: this.getFallbackAdvice(goalData), error: error.message, usingFallback: true };
    }
  },

  async getHealthTip(category = 'genel') {
    try {
      const advice = await call(buildHealthTipPrompt(category));
      return { success: true, advice, category, provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 Sağlık tavsiyesi hatası:', error.message);
      return { success: false, advice: FALLBACK_HEALTH_TIPS[category] || FALLBACK_HEALTH_TIPS.genel, error: error.message, usingFallback: true };
    }
  },

  async getBMIAdvice(bmiData) {
    try {
      const advice = await call(buildBMIPrompt(bmiData));
      return { success: true, advice, provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 VKİ tavsiyesi hatası:', error.message);
      return { success: false, advice: FALLBACK_BMI_ADVICE[bmiData.category] || FALLBACK_BMI_ADVICE.Normal, error: error.message, usingFallback: true };
    }
  },

  async getBMIBulletRecommendations(bmiData) {
    try {
      const raw = await call(buildBMIBulletsPrompt(bmiData));
      const bullets = this.parseBMIBulletLines(raw);
      if (bullets.length < 3) return { success: false, bullets: FALLBACK_BMI_BULLETS[bmiData.category] || FALLBACK_BMI_BULLETS.Normal, usingFallback: true, provider: AI_PROVIDER };
      return { success: true, bullets: bullets.slice(0, 5), provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 VKİ madde önerileri hatası:', error.message);
      return { success: false, bullets: FALLBACK_BMI_BULLETS[bmiData.category] || FALLBACK_BMI_BULLETS.Normal, usingFallback: true, error: error.message };
    }
  },

  async getWeightTrackingAdvice(weightData) {
    try {
      const advice = await call(buildWeightTrackingPrompt(weightData));
      return { success: true, advice, provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 Kilo takip tavsiyesi hatası:', error.message);
      return { success: false, advice: this.getFallbackWeightTrackingAdvice(weightData), error: error.message, usingFallback: true };
    }
  },

  async getDietPlanAdvice(dietData) {
    try {
      const advice = await call(buildDietPlanPrompt(dietData));
      return { success: true, advice, provider: AI_PROVIDER };
    } catch (error) {
      console.error('💥 Diyet planı tavsiyesi hatası:', error.message);
      return { success: false, advice: this.getFallbackDietPlanAdvice(dietData), error: error.message, usingFallback: true };
    }
  },

  async getMealCaloriesFromImage({ base64, mimeType = 'image/jpeg' }) {
    if (!base64 || typeof base64 !== 'string') throw new Error('Görsel verisi bulunamadı.');
    const cleanMime = mimeType?.includes('/') ? mimeType : 'image/jpeg';
    const cleanB64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const dataUrl = `data:${cleanMime};base64,${cleanB64}`;
    const prompt = `Bu fotoğraftaki yemeği veya yemekleri incele. Tıbbi teşhis değil; sadece genel tahmindir.

Yanıtını SADECE geçerli bir JSON nesnesi olarak ver, başka metin veya markdown kullanma. Şema:
{
  "mealName": "kısa Türkçe öğün adı",
  "estimatedCalories": sayı,
  "confidence": "düşük" | "orta" | "yüksek",
  "items": [ { "name": "madde adı Türkçe", "estimatedKcal": sayı } ],
  "notes": "tek cümle Türkçe uyarı veya ipucu"
}

Kurallar: items en fazla 8 eleman; emin değilsen confidence düşük yap.`;

    let groqError = null;
    if (GROQ_API_KEY) {
      try { return await callGroqVision(dataUrl, prompt); } catch (e) { groqError = e; console.warn('Groq vision (kalori):', e?.message || e); }
    }
    if (GEMINI_API_KEY) return await callGeminiVision(cleanMime, cleanB64, prompt);
    if (groqError) throw groqError instanceof Error ? groqError : new Error(String(groqError));
    throw new Error('Görsel analiz için .env içinde en az biri gerekli: EXPO_PUBLIC_GROQ_API_KEY veya EXPO_PUBLIC_GEMINI_API_KEY.');
  },

  // ─── Deprecated provider wrappers (geriye uyumluluk) ──────────────────────
  async getHuggingFaceAdvice(prompt) { const { callHuggingFace } = await import('./ai/providers'); return callHuggingFace(prompt); },
  async getGroqAdvice(prompt) { const { callGroq } = await import('./ai/providers'); return callGroq(prompt); },
  async getCohereAdvice(prompt) { const { callCohere } = await import('./ai/providers'); return callCohere(prompt); },
  async getGeminiAdvice(prompt) { const { callGemini } = await import('./ai/providers'); return callGemini(prompt); },

  // ─── Yardımcı & fallback fonksiyonlar ─────────────────────────────────────
  parseBMIBulletLines(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\n+/).map((l) => l.replace(/^[\s]*[•\-\*‣▪]\s*/, '').replace(/^\d+[\).]\s*/, '').trim()).filter((l) => l.length > 4);
    const seen = new Set();
    const out = [];
    for (const l of lines) {
      const key = l.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(l);
      if (out.length >= 5) break;
    }
    return out;
  },

  getFallbackBMIBullets(category) {
    return FALLBACK_BMI_BULLETS[category] || FALLBACK_BMI_BULLETS.Normal;
  },

  getFallbackBMIAdvice(bmiData) {
    return FALLBACK_BMI_ADVICE[bmiData.category] || FALLBACK_BMI_ADVICE.Normal;
  },

  getFallbackHealthTip(category) {
    return FALLBACK_HEALTH_TIPS[category] || FALLBACK_HEALTH_TIPS.genel;
  },

  getFallbackWeightTrackingAdvice({ stats }) {
    const { totalChange, latest } = stats;
    if (totalChange < -2)
      return `📊 Kilo Takip Analizi\n\n🎉 Harika İlerleme!\n\nToplam ${Math.abs(totalChange).toFixed(1)} kg verdiniz.\n\n📝 Tavsiyeler:\n• Devam edin!\n• Protein alımınızı yüksek tutun\n• Haftada en az 3 gün egzersiz yapın\n• Tempoyu koruyun, acele etmeyin`;
    if (totalChange > 2)
      return `📊 Kilo Takip Analizi\n\n📈 Kilo Artışı\n\nToplam ${totalChange.toFixed(1)} kg aldınız.\n\n📝 Tavsiyeler:\n• Hedeflerinizi gözden geçirin\n• Günlük kalori alımını kontrol edin\n• Düzenli egzersiz rutini oluşturun`;
    return `📊 Kilo Takip Analizi\n\n⚖️ Kilonuz Stabil (${latest} kg)\n\n📝 Tavsiyeler:\n• Dengeli beslenmeye devam edin\n• Egzersiz rutininizi sürdürün\n• Küçük değişiklikler deneyin`;
  },

  getFallbackDietPlanAdvice({ stats }) {
    if (stats.totalPlans === 0) return `🍽️ Diyet Planı\n\nHenüz plan yok. Başlamak için harika bir zaman!\n\n💡 Tavsiyeler:\n• Her gün için basit bir plan oluşturun\n• Öğün atlamayın\n• Kalori hedeflerinizi belirleyin`;
    if (stats.monthlyPlans < 7) return `🍽️ Diyet Planı\n\nSon 30 günde ${stats.monthlyPlans} plan girdiniz. Daha düzenli olabilirsiniz.\n\n📝 Tavsiyeler:\n• Her gün plan yapmaya çalışın\n• Akşamları ertesi günü planlayın`;
    return `🍽️ Diyet Planı\n\n✅ Harika Takip! ${stats.monthlyPlans} plan oluşturdunuz.\n\n📝 Tavsiyeler:\n• Makro besin dengesi: 40% karb, 30% protein, 30% yağ\n• Renkli sebzeler tüketin\n• Su tüketiminizi artırın (2-3L/gün)`;
  },

  getFallbackAdvice({ currentWeight, targetWeight, startDate, targetDate }) {
    if (!currentWeight || !targetWeight)
      return `🎯 Harika bir hedef belirlediniz!\n\n📝 Tavsiyeler:\n• Günlük kalori alımınızı takip edin\n• Düzenli egzersiz yapın\n• Bol su için\n\n💪 Azim ve düzenlilik başarının anahtarıdır!`;
    const diffDays = Math.ceil(Math.abs(new Date(targetDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeklyTarget = (weightDiff / (diffDays / 7)).toFixed(1);
    const isWeightLoss = currentWeight > targetWeight;
    let advice = `🎯 Hedef: ${weightDiff.toFixed(1)} kg ${isWeightLoss ? 'vermek' : 'almak'} (${weeklyTarget} kg/hafta)\n\n📝 Tavsiyeler:\n`;
    if (isWeightLoss) advice += `• Kalori açığı oluşturun (300-500 kcal)\n• Protein ağırlıklı beslenin\n• Kardiyo + direnç egzersizleri`;
    else advice += `• Kalori fazlası oluşturun (300-500 kcal)\n• Protein ağırlıklı, yüksek kalorili besinler\n• Ağırlık antrenmanlarına odaklanın`;
    advice += `\n• Bol su için (2-3L/gün)\n• Düzenli uyuyun (7-8 saat)`;
    return advice;
  },
};
