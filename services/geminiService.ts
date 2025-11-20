const AI_PROMPT =
  "Extract the vehicle license plate number from this image. Return ONLY the alphanumeric text. Remove spaces or hyphens. Return 'UNKNOWN' if no plate is clearly visible.";

// Variables are injected via vite.config.ts define option
declare const process: {
  env: {
    API_KEY?: string;
    GEMINI_API_KEY?: string;
  };
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

export const extractLicensePlate = async (base64Image: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("API Key missing or invalid");
      return "NO_API_KEY";
    }

    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const maxRetries = 3;
    let attempt = 0;
    let lastError: any;

    while (attempt < maxRetries) {
      attempt += 1;
      try {
        const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Data,
                    },
                  },
                  {
                    text: AI_PROMPT,
                  },
                ],
              },
            ],
          }),
        });

        if (response.status === 429 && attempt < maxRetries) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10);
          const waitMs = retryAfter > 0 ? retryAfter * 1000 : attempt * 2000;
          console.warn(`Gemini API 429 (attempt ${attempt}/${maxRetries}). Retrying in ${waitMs}ms...`);
          await wait(waitMs);
          continue;
        }

        if (!response.ok) {
          const errorData: GeminiResponse = await response.json().catch(() => ({}));
          console.error("Gemini API Error:", response.status, errorData);
          throw new Error(errorData?.error?.message || `Gemini API error: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || "";
        return text.replace(/[^A-Z0-9]/g, "");
      } catch (err) {
        lastError = err;
        if (attempt >= maxRetries) {
          throw err;
        }
        console.warn(`Gemini OCR attempt ${attempt} failed. Retrying...`, err);
        await wait(attempt * 2000);
      }
    }

    throw lastError || new Error("Gemini OCR failed after retries.");
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};