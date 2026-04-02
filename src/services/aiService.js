// AI Tavsiyeleri - Birden fazla ücretsiz seçenek
// Seçenekler:
// 1. Hugging Face (En Kolay) - https://huggingface.co/settings/tokens
// 2. Groq (En Hızlı) - https://console.groq.com/keys
// 3. Cohere (İyi Türkçe) - https://dashboard.cohere.com/api-keys

// HANGİ AI KULLANILACAK? ('huggingface', 'groq', 'cohere' veya 'gemini')
const AI_PROVIDER = "groq"; // BURADAN DEĞİŞTİRİN

// API Keys - .env dosyasından okunur (.env git'e dahil edilmez!)
const HUGGINGFACE_API_KEY = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || ""; // https://huggingface.co/settings/tokens
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || ""; // https://console.groq.com/keys
const COHERE_API_KEY = process.env.EXPO_PUBLIC_COHERE_API_KEY || ""; // https://dashboard.cohere.com/api-keys
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

export const aiService = {
  // Hedef için AI tavsiyesi al
  async getGoalAdvice(goalData) {
    try {
      const { title, currentWeight, targetWeight, startDate, targetDate } =
        goalData;

      // Gün sayısını hesapla
      const start = new Date(startDate);
      const target = new Date(targetDate);
      const diffTime = Math.abs(target - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Kilo farkını hesapla
      const weightDiff =
        currentWeight && targetWeight
          ? Math.abs(currentWeight - targetWeight)
          : null;

      const weightGoal =
        currentWeight && targetWeight
          ? currentWeight > targetWeight
            ? "kilo vermek"
            : "kilo almak"
          : "hedefe ulaşmak";

      // Prompt oluştur
      const prompt = `Bir kişi şu diyet hedefini belirledi:
- Hedef: ${title}
${currentWeight ? `- Mevcut Kilo: ${currentWeight} kg` : ""}
- Hedef Kilo: ${targetWeight} kg
${
  weightDiff
    ? `- Hedeflenen Değişim: ${weightDiff.toFixed(1)} kg ${weightGoal}`
    : ""
}
- Süre: ${diffDays} gün (${Math.ceil(diffDays / 7)} hafta)

Lütfen bu kişiye:
1. Hedefinin gerçekçi olup olmadığı hakkında kısa bir değerlendirme yap
2. Günlük veya haftalık ne kadar kilo değişimi hedeflemesi gerektiğini söyle
3. 3-4 pratik ve uygulanabilir tavsiye ver
4. Motivasyon için kısa bir mesaj ekle

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 300 kelime kullan.`;

      console.log(`🤖 AI tavsiyesi isteniyor (${AI_PROVIDER})...`);

      // Provider'a göre API çağrısı yap
      let advice = "";

      switch (AI_PROVIDER) {
        case "huggingface":
          advice = await aiService.getHuggingFaceAdvice(prompt);
          break;
        case "groq":
          advice = await aiService.getGroqAdvice(prompt);
          break;
        case "cohere":
          advice = await aiService.getCohereAdvice(prompt);
          break;
        case "gemini":
          advice = await aiService.getGeminiAdvice(prompt);
          break;
        default:
          throw new Error(`Geçersiz AI provider: ${AI_PROVIDER}`);
      }

      console.log("✅ AI yanıt alındı");
      return {
        success: true,
        advice: advice,
        provider: AI_PROVIDER,
      };
    } catch (error) {
      console.error("💥 AI tavsiye hatası:", error.message);

      // Fallback: API çalışmazsa varsayılan tavsiyeler
      return {
        success: false,
        advice: aiService.getFallbackAdvice(goalData),
        error: error.message,
        usingFallback: true,
      };
    }
  },

  // Hugging Face API
  async getHuggingFaceAdvice(prompt) {
    if (!HUGGINGFACE_API_KEY) {
      throw new Error("Hugging Face API key tanımlı değil");
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Hugging Face Error:", error);
      throw new Error(`Hugging Face API hatası (${response.status})`);
    }

    const data = await response.json();

    if (data[0]?.generated_text) {
      return data[0].generated_text;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error("Yanıt alınamadı");
    }
  },

  // Groq API (Çok hızlı!)
  async getGroqAdvice(prompt) {
    if (!GROQ_API_KEY) {
      throw new Error("Groq API key tanımlı değil");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "Sen bir diyet ve sağlık danışmanısın. Türkçe, samimi ve cesaretlendirici bir dille tavsiye veriyorsun.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 512,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Groq Error:", error);
      throw new Error(`Groq API hatası (${response.status})`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error("Yanıt alınamadı");
    }
  },

  // Cohere API
  async getCohereAdvice(prompt) {
    if (!COHERE_API_KEY) {
      throw new Error("Cohere API key tanımlı değil");
    }

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command",
        prompt: prompt,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Cohere Error:", error);
      throw new Error(`Cohere API hatası (${response.status})`);
    }

    const data = await response.json();

    if (data.generations && data.generations[0]?.text) {
      return data.generations[0].text;
    } else {
      throw new Error("Yanıt alınamadı");
    }
  },

  // Gemini API (Eski)
  async getGeminiAdvice(prompt) {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key tanımlı değil");
    }

    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini Error:", errorText);
      throw new Error(`Gemini API hatası (${response.status})`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Yanıt alınamadı");
    }
  },

  // Sağlık Tavsiyesi Al
  async getHealthTip(category = 'genel') {
    try {
      const categoryInfo = {
        genel: 'genel sağlık ve yaşam tarzı',
        beslenme: 'sağlıklı beslenme ve diyet',
        egzersiz: 'egzersiz ve fiziksel aktivite',
        motivasyon: 'motivasyon ve zihinsel sağlık'
      };

      const prompt = `${categoryInfo[category] || 'sağlıklı yaşam'} konusunda kısa, pratik ve uygulanabilir bir tavsiye ver.

Tavsiye şunları içermeli:
1. Bir başlık (kısa ve çarpıcı)
2. Açıklama (2-3 cümle)
3. Pratik bir öneri veya ipucu

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 150 kelime kullan.`;

      console.log(`🤖 Sağlık tavsiyesi isteniyor (${AI_PROVIDER}, ${category})...`);

      let advice = "";

      switch (AI_PROVIDER) {
        case "huggingface":
          advice = await this.getHuggingFaceAdvice(prompt);
          break;
        case "groq":
          advice = await this.getGroqAdvice(prompt);
          break;
        case "cohere":
          advice = await this.getCohereAdvice(prompt);
          break;
        case "gemini":
          advice = await this.getGeminiAdvice(prompt);
          break;
        default:
          throw new Error(`Geçersiz AI provider: ${AI_PROVIDER}`);
      }

      console.log("✅ Sağlık tavsiyesi alındı");
      return {
        success: true,
        advice: advice,
        category: category,
        provider: AI_PROVIDER,
      };
    } catch (error) {
      console.error("💥 Sağlık tavsiyesi hatası:", error.message);

      return {
        success: false,
        advice: this.getFallbackHealthTip(category),
        error: error.message,
        usingFallback: true,
      };
    }
  },

  // API çalışmazsa varsayılan sağlık tavsiyeleri
  getFallbackHealthTip(category) {
    const tips = {
      genel: `💡 Günlük Sağlık İpucu

Su içmeyi unutmayın! Günde en az 2-3 litre su içmek metabolizmanızı hızlandırır, cildinizi güzelleştirir ve enerji seviyenizi yüksek tutar.

✨ İpucu: Her sabah kalktığınızda bir bardak ılık su içerek güne başlayın.`,

      beslenme: `🥗 Beslenme Tavsiyesi

Tabak metodunu uygulayın! Tabağınızın yarısı sebze, çeyreği protein, çeyreği de karmaşık karbonhidratlardan oluşsun. Bu dengeli beslenmenin anahtarıdır.

✨ İpucu: Her öğünde farklı renkte sebzeler tüketmeye çalışın - her renk farklı besin değeri sunar.`,

      egzersiz: `💪 Egzersiz Önerisi

Küçük adımlarla başlayın! Günde sadece 10 dakikalık yürüyüş bile fark yaratır. Önemli olan düzenli olmak, uzun süreler değil.

✨ İpucu: Merdiven kullanmayı tercih edin, kısa mesafelerde yürüyün ve hareketi hayatınızın bir parçası yapın.`,

      motivasyon: `🌟 Motivasyon Desteği

Küçük başarılarınızı kutlayın! Her adım önemlidir. Kendinize karşı nazik olun ve ilerlemenizi not alın. Mükemmel olmak zorunda değilsiniz.

✨ İpucu: Her gün bir başarınızı yazın, bu pozitif bir bakış açısı geliştirir.`
    };

    return tips[category] || tips.genel;
  },

  // VKİ Tavsiyesi Al
  async getBMIAdvice(bmiData) {
    try {
      const { bmi, category, height, weight, age, gender } = bmiData;

      const prompt = `Bir kişinin vücut kitle indeksi (VKİ) bilgileri:
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

      console.log(`🤖 VKİ tavsiyesi isteniyor (${AI_PROVIDER})...`);

      let advice = "";

      switch (AI_PROVIDER) {
        case "huggingface":
          advice = await this.getHuggingFaceAdvice(prompt);
          break;
        case "groq":
          advice = await this.getGroqAdvice(prompt);
          break;
        case "cohere":
          advice = await this.getCohereAdvice(prompt);
          break;
        case "gemini":
          advice = await this.getGeminiAdvice(prompt);
          break;
        default:
          throw new Error(`Geçersiz AI provider: ${AI_PROVIDER}`);
      }

      console.log("✅ VKİ tavsiyesi alındı");
      return {
        success: true,
        advice: advice,
        provider: AI_PROVIDER,
      };
    } catch (error) {
      console.error("💥 VKİ tavsiyesi hatası:", error.message);

      return {
        success: false,
        advice: this.getFallbackBMIAdvice(bmiData),
        error: error.message,
        usingFallback: true,
      };
    }
  },

  // API çalışmazsa varsayılan VKİ tavsiyeleri
  getFallbackBMIAdvice(bmiData) {
    const { category, bmi } = bmiData;

    const adviceMap = {
      'Zayıf': `🏥 VKİ Analizi: ${bmi}

VKİ değeriniz normal aralığın altında. Sağlıklı kilo almak için profesyonel destek alabilirsiniz.

📝 Tavsiyeler:
• Günlük kalori alımınızı artırın (yavaş ve kontrollü)
• Protein açısından zengin besinler tüketin (tavuk, balık, yumurta, baklagiller)
• Sağlıklı yağlar ekleyin (fındık, ceviz, avokado, zeytinyağı)
• Günde 5-6 öğün şeklinde beslenin
• Kuvvet antrenmanı yaparak kas kütlenizi artırın
• Düzenli kan tahlilleri yaptırın

💪 Hedef: Normal VKİ aralığına (18.5-24.9) ulaşmayı hedefleyin. Bir diyetisyenle çalışmanız faydalı olabilir.`,

      'Normal': `✅ VKİ Analizi: ${bmi}

Harika! Sağlıklı bir kilo aralığındasınız. Bu dengeyi korumak önemli.

📝 Tavsiyeler:
• Dengeli ve çeşitli beslenmeye devam edin
• Haftada 150 dakika orta yoğunlukta egzersiz yapın
• Bol su için (günde 2-3 litre)
• Yeterli ve kaliteli uyuyun (7-8 saat)
• Stres yönetimi teknikleri uygulayın
• Düzenli sağlık kontrollerine gidin

💚 Hedef: Mevcut sağlıklı kilonuzu koruyun. Düzenli egzersiz ve dengeli beslenme alışkanlıklarınızı sürdürün.`,

      'Fazla Kilolu': `⚠️ VKİ Analizi: ${bmi}

VKİ değeriniz normalin üzerinde. Sağlıklı kilo verme planı yapabilirsiniz.

📝 Tavsiyeler:
• Günlük kalori alımınızı kontrol edin (aşırıya kaçmadan azaltın)
• Porsiyon kontrolüne dikkat edin
• Haftada en az 4-5 gün egzersiz yapın (kardiyo + kuvvet)
• Şekerli içecek ve atıştırmalıklardan kaçının
• Sebze ve meyve tüketiminizi artırın
• Su içmeyi ihmal etmeyin

🎯 Hedef: Haftada 0.5-1 kg vererek normal VKİ aralığına (18.5-24.9) ulaşmayı hedefleyin.`,

      'Obez': `🏥 VKİ Analizi: ${bmi}

VKİ değeriniz obezite kategorisinde. Profesyonel destek almanızı öneririz.

📝 Tavsiyeler:
• Bir diyetisyen ve doktor ile çalışın
• Günlük kalori açığı oluşturun (sağlıklı şekilde)
• Düzenli egzersiz programı başlatın (yavaş başlayın, artırın)
• İşlenmiş gıdalardan tamamen uzak durun
• Porsiyon kontrolü yapın
• Stres yönetimi ve uyku düzeninize önem verin
• Düzenli kan değerlerinizi takip edin

🎯 Hedef: Haftada 0.5-1 kg vererek kademeli olarak sağlıklı kiloya ulaşın. Sabırlı olun, bu bir maraton!`
    };

    return adviceMap[category] || adviceMap['Normal'];
  },

  // Kilo Takip Tavsiyesi Al
  async getWeightTrackingAdvice(weightData) {
    try {
      const { weights, stats } = weightData;

      // Trend analizi
      let trend = 'stabil';
      if (stats.totalChange > 1) trend = 'artış';
      else if (stats.totalChange < -1) trend = 'azalış';

      // Son 3 kaydı analiz et (varsa)
      const recentWeights = weights.slice(0, Math.min(3, weights.length));
      const recentChanges = recentWeights.slice(0, -1).map((w, i) =>
        (w.weight - recentWeights[i + 1].weight).toFixed(1)
      );

      const prompt = `Bir kişinin kilo takip bilgileri:
- Mevcut Kilo: ${stats.latest} kg
- Başlangıç Kilosi: ${stats.oldest} kg
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

      console.log(`🤖 Kilo takip tavsiyesi isteniyor (${AI_PROVIDER})...`);

      let advice = "";

      switch (AI_PROVIDER) {
        case "huggingface":
          advice = await this.getHuggingFaceAdvice(prompt);
          break;
        case "groq":
          advice = await this.getGroqAdvice(prompt);
          break;
        case "cohere":
          advice = await this.getCohereAdvice(prompt);
          break;
        case "gemini":
          advice = await this.getGeminiAdvice(prompt);
          break;
        default:
          throw new Error(`Geçersiz AI provider: ${AI_PROVIDER}`);
      }

      console.log("✅ Kilo takip tavsiyesi alındı");
      return {
        success: true,
        advice: advice,
        provider: AI_PROVIDER,
      };
    } catch (error) {
      console.error("💥 Kilo takip tavsiyesi hatası:", error.message);

      return {
        success: false,
        advice: this.getFallbackWeightTrackingAdvice(weightData),
        error: error.message,
        usingFallback: true,
      };
    }
  },

  // API çalışmazsa varsayılan kilo takip tavsiyeleri
  getFallbackWeightTrackingAdvice(weightData) {
    const { stats } = weightData;
    const { totalChange, latest, average } = stats;

    let advice = `📊 Kilo Takip Analizi\n\n`;

    if (totalChange < -2) {
      advice += `🎉 Harika İlerleme!\n\nToplam ${Math.abs(totalChange).toFixed(1)} kg verdiniz. Bu gerçekten harika bir başarı!\n\n`;
      advice += `📝 Tavsiyeler:\n`;
      advice += `• Devam edin! Yaptığınız şey işe yarıyor\n`;
      advice += `• Protein alımınızı yüksek tutun (kas kaybını önler)\n`;
      advice += `• Haftada en az 3 gün egzersiz yapın\n`;
      advice += `• Kendinizi ödüllendirin (yemek dışı şeylerle)\n`;
      advice += `• Bu tempoyu koruyun, acele etmeyin\n\n`;
      advice += `💪 Unutmayın: Düzenli takip, başarının anahtarıdır!`;
    } else if (totalChange > 2) {
      advice += `📈 Kilo Artışı Tespit Edildi\n\nToplam ${totalChange.toFixed(1)} kg aldınız. Eğer hedefiniz buysa tebrikler!\n\n`;
      advice += `📝 Tavsiyeler:\n`;
      advice += `• Hedeflerinizi gözden geçirin\n`;
      advice += `• Günlük kalori alımınızı kontrol edin\n`;
      advice += `• Porsiyon kontrolüne dikkat edin\n`;
      advice += `• Düzenli egzersiz rutini oluşturun\n`;
      advice += `• Su tüketiminizi artırın\n\n`;
      advice += `💪 Çözüm: Küçük değişiklikler büyük fark yaratır. Yavaş ve kararlı adımlar atın.`;
    } else {
      advice += `⚖️ Kilonuz Stabil\n\nMevcut kilonuzu koruyorsunuz (${latest} kg). Bu da bir başarı!\n\n`;
      advice += `📝 Tavsiyeler:\n`;
      advice += `• Dengeli beslenmenize devam edin\n`;
      advice += `• Egzersiz rutininizi sürdürün\n`;
      advice += `• Eğer hedefleriniz varsa, planınızı gözden geçirin\n`;
      advice += `• Metabolizmanızı hareketli tutun\n`;
      advice += `• Küçük değişiklikler deneyin (egzersiz artışı, diyet ayarı)\n\n`;
      advice += `💪 Hedef: Bir sonraki adımı planlayın. Nereye gitmek istiyorsunuz?`;
    }

    return advice;
  },

  // Diyet Planı Tavsiyesi Al
  async getDietPlanAdvice(dietData) {
    try {
      const { stats, recentPlans } = dietData;

      // Son planları özetle
      const recentMeals = recentPlans.slice(0, 3).map(plan => {
        const meals = [];
        if (plan.breakfast) meals.push('Kahvaltı');
        if (plan.lunch) meals.push('Öğle');
        if (plan.dinner) meals.push('Akşam');
        return meals.join(', ');
      }).filter(m => m).join(' | ');

      const prompt = `Bir kişinin diyet planı bilgileri:
- Toplam Plan Sayısı: ${stats.totalPlans}
- Ortalama Kalori: ${stats.avgCalories > 0 ? `${stats.avgCalories} kcal` : 'Belirtilmemiş'}
- Son 30 Gün: ${stats.monthlyPlans} plan
${recentMeals ? `- Son Öğünler: ${recentMeals}` : ''}

Lütfen bu kişiye:
1. Diyet planı takibi hakkında kısa bir değerlendirme yap
2. Beslenme düzeninin kalitesi hakkında yorum yap
3. 4-5 pratik beslenme tavsiyesi ver
4. Diyet planı oluştururken dikkat edilmesi gerekenler
5. Motivasyon artırıcı bir mesaj ekle

Cevabını Türkçe, samimi ve cesaretlendirici bir dille yaz. Maksimum 300 kelime kullan.`;

      console.log(`🤖 Diyet planı tavsiyesi isteniyor (${AI_PROVIDER})...`);

      let advice = "";

      switch (AI_PROVIDER) {
        case "huggingface":
          advice = await this.getHuggingFaceAdvice(prompt);
          break;
        case "groq":
          advice = await this.getGroqAdvice(prompt);
          break;
        case "cohere":
          advice = await this.getCohereAdvice(prompt);
          break;
        case "gemini":
          advice = await this.getGeminiAdvice(prompt);
          break;
        default:
          throw new Error(`Geçersiz AI provider: ${AI_PROVIDER}`);
      }

      console.log("✅ Diyet planı tavsiyesi alındı");
      return {
        success: true,
        advice: advice,
        provider: AI_PROVIDER,
      };
    } catch (error) {
      console.error("💥 Diyet planı tavsiyesi hatası:", error.message);

      return {
        success: false,
        advice: this.getFallbackDietPlanAdvice(dietData),
        error: error.message,
        usingFallback: true,
      };
    }
  },

  // API çalışmazsa varsayılan diyet planı tavsiyeleri
  getFallbackDietPlanAdvice(dietData) {
    const { stats } = dietData;

    let advice = `🍽️ Diyet Planı Analizi\n\n`;

    if (stats.totalPlans === 0) {
      advice += `📝 Henüz Plan Yok\n\nDiyet planı oluşturmaya başlamadınız. Başlamak için harika bir zaman!\n\n`;
      advice += `💡 Başlangıç Tavsiyeleri:\n`;
      advice += `• Her gün için basit bir plan oluşturun\n`;
      advice += `• Öğün atlamayın - günde 3 ana öğün + 2-3 ara öğün\n`;
      advice += `• Kalori hedeflerinizi belirleyin\n`;
      advice += `• Çeşitli ve dengeli beslenmeye özen gösterin\n`;
      advice += `• Her öğünde protein kaynağı bulundurun\n\n`;
      advice += `💪 Başarı İpucu: Küçük adımlarla başlayın, tutarlı olun!`;
    } else if (stats.monthlyPlans < 7) {
      advice += `📊 Düzensiz Takip\n\nSon 30 günde sadece ${stats.monthlyPlans} plan girdiniz. Daha düzenli olabilirsiniz.\n\n`;
      advice += `📝 Düzenlilik Tavsiyeleri:\n`;
      advice += `• Her gün için plan yapmaya çalışın\n`;
      advice += `• Akşamları ertesi günü planlayın\n`;
      advice += `• Haftalık plan yapmayı deneyin\n`;
      advice += `• Planlama alışkanlığı edinin - hatırlatıcı kurun\n`;
      advice += `• Basit tutun - karmaşık planlar yapmayın\n\n`;
      advice += `💪 Başarı: Düzenli plan, başarılı diyet demektir!`;
    } else {
      advice += `✅ Harika Takip!\n\nSon 30 günde ${stats.monthlyPlans} plan oluşturdunuz. Süper!\n\n`;

      if (stats.avgCalories > 0) {
        advice += `Ortalama kalori alımınız: ${stats.avgCalories} kcal\n\n`;

        if (stats.avgCalories < 1200) {
          advice += `⚠️ Dikkat: Çok düşük kalori - metabolizma yavaşlayabilir\n`;
        } else if (stats.avgCalories > 2500) {
          advice += `⚠️ Dikkat: Yüksek kalori - hedeflerinizi gözden geçirin\n`;
        }
      }

      advice += `\n📝 İleri Seviye Tavsiyeler:\n`;
      advice += `• Makro besin dengesi: 40% karb, 30% protein, 30% yağ\n`;
      advice += `• Renkli sebze ve meyveleri çeşitlendirin\n`;
      advice += `• İşlenmiş gıdalardan kaçının\n`;
      advice += `• Öğün zamanlamasına dikkat edin\n`;
      advice += `• Su tüketiminizi artırın (2-3L/gün)\n\n`;
      advice += `💪 Devam Edin: Yaptığınız şey harika! Tutarlılığınızı sürdürün.`;
    }

    return advice;
  },

  // API çalışmazsa varsayılan tavsiyeler
  getFallbackAdvice(goalData) {
    const { currentWeight, targetWeight, startDate, targetDate } = goalData;

    if (!currentWeight || !targetWeight) {
      return `🎯 Harika bir hedef belirlediniz!

📝 Tavsiyeler:
• Günlük kalori alımınızı takip edin
• Düzenli egzersiz yapın (haftada 3-4 gün)
• Bol su için (günde 2-3 litre)
• Yeterli uyuyun (7-8 saat)

💪 Unutmayın: Azim ve düzenlilik başarının anahtarıdır!`;
    }

    const start = new Date(startDate);
    const target = new Date(targetDate);
    const diffTime = Math.abs(target - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeklyTarget = (weightDiff / (diffDays / 7)).toFixed(1);
    const isWeightLoss = currentWeight > targetWeight;

    let advice = `🎯 Hedef Analizi:\n`;
    advice += `${isWeightLoss ? "📉" : "📈"} ${weightDiff.toFixed(1)} kg ${
      isWeightLoss ? "vermek" : "almak"
    } istiyorsunuz.\n`;
    advice += `⏱️ Haftalık hedef: ${weeklyTarget} kg\n\n`;

    // Sağlıklı hedef kontrolü (haftada 0.5-1 kg sağlıklı kabul edilir)
    if (isWeightLoss && parseFloat(weeklyTarget) > 1) {
      advice += `⚠️ Haftalık ${weeklyTarget} kg vermek biraz agresif olabilir. Sağlıklı kilo kaybı haftada 0.5-1 kg arasındadır.\n\n`;
    }

    advice += `📝 Tavsiyeler:\n`;
    if (isWeightLoss) {
      advice += `• Kalori açığı oluşturun (günlük 300-500 kalori)\n`;
      advice += `• Protein ağırlıklı beslenin\n`;
      advice += `• Kardiyo + direnç egzersizleri yapın\n`;
    } else {
      advice += `• Kalori fazlası oluşturun (günlük 300-500 kalori)\n`;
      advice += `• Protein ağırlıklı, yüksek kalorili besinler tüketin\n`;
      advice += `• Ağırlık antrenmanlarına odaklanın\n`;
    }
    advice += `• Bol su için (2-3 litre/gün)\n`;
    advice += `• Düzenli uyuyun (7-8 saat)\n\n`;
    advice += `💪 Başarılar! Düzenli olarak ilerlemenizi takip edin.`;

    return advice;
  },
};
