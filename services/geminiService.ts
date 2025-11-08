import { GoogleGenAI } from "@google/genai";

// En Vite, todas las variables disponibles en el cliente deben exponerse con el prefijo VITE_.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "VITE_GEMINI_API_KEY no está definida. Añádela a tu fichero de variables de entorno."
  );
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Extracts license plate text from a base64 encoded image using Gemini.
 * @param base64Image The base64 encoded image string (without the data: prefix).
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns The extracted text as a string.
 */
export const extractLicensePlateText = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                "Extrae el texto de la matrícula de esta imagen. Devuelve únicamente el texto de la matrícula, sin ninguna explicación adicional. Si no puedes identificar una matrícula, responde con 'N/A'.",
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text.trim();
    return text;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("No se pudo analizar la imagen de la matrícula. Inténtalo de nuevo.");
  }
};
