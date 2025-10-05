// AI Tavsiyeleri - Birden fazla ücretsiz seçenek
// Seçenekler:
// 1. Hugging Face (En Kolay) - https://huggingface.co/settings/tokens
// 2. Groq (En Hızlı) - https://console.groq.com/keys
// 3. Cohere (İyi Türkçe) - https://dashboard.cohere.com/api-keys

// HANGİ AI KULLANILACAK? ('huggingface', 'groq', 'cohere' veya 'gemini')
const AI_PROVIDER = "groq"; // BURADAN DEĞİŞTİRİN

// API Keys
const HUGGINGFACE_API_KEY = ""; // https://huggingface.co/settings/tokens
const GROQ_API_KEY = "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"; // https://console.groq.com/keys
const COHERE_API_KEY = ""; // https://dashboard.cohere.com/api-keys
const GEMINI_API_KEY = "GEMINI_KEY_REMOVED";

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
