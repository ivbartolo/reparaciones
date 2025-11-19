import { GoogleGenAI } from "@google/genai";

const AI_PROMPT = "Extract the vehicle license plate number from this image. Return ONLY the alphanumeric text. Remove spaces or hyphens. Return 'UNKNOWN' if no plate is clearly visible.";

// Variables are injected via vite.config.ts define option
declare const process: {
  env: {
    API_KEY?: string;
    GEMINI_API_KEY?: string;
  };
};

export const extractLicensePlate = async (base64Image: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("API Key check:", {
      API_KEY: process.env.API_KEY ? `Present (length: ${process.env.API_KEY.length})` : 'Missing',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `Present (length: ${process.env.GEMINI_API_KEY.length})` : 'Missing'
    });
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("API Key missing or invalid");
      return "NO_API_KEY";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Extract strictly the base64 data if it has the prefix
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      },
      {
        text: AI_PROMPT
      }
    ]);

    const text = response.response.text()?.trim().toUpperCase() || "";
    return text.replace(/[^A-Z0-9]/g, '');
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};