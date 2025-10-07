import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FaceBoundingBox } from '../types';

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      // This error will be shown to the user if the API key is not configured in the environment.
      throw new Error("Configuration Error: The `API_KEY` is missing. For deployments on services like Vercel, please set the `API_KEY` in your project's Environment Variables settings to enable AI features.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

function base64ToGenerativePart(data: string, mimeType: string) {
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

export async function applyGenerativeImageEffect(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string | null> {
    const aiClient = getAiClient();
    const imagePart = base64ToGenerativePart(base64ImageData, mimeType);
    const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                imagePart,
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const candidate = response?.candidates?.[0];
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    }
    return null;
}

export async function detectFace(
  base64ImageData: string,
  mimeType: string
): Promise<FaceBoundingBox | null> {
  try {
    const aiClient = getAiClient();
    const imagePart = base64ToGenerativePart(base64ImageData, mimeType);
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          imagePart,
          {
            text: "Analyze this image to detect the most prominent human face. The bounding box should tightly enclose the face, from the bottom of the chin to just above the hairline, and from ear to ear. The origin (0,0) is the top-left corner of the image. Respond ONLY with a JSON object containing the bounding box. The coordinates and dimensions must be ratios from 0.0 to 1.0 of the image's total width and height. If no clear human face is found, return an empty JSON object `{}`.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER, description: "The x-coordinate of the top-left corner as a ratio (0.0 to 1.0)." },
            y: { type: Type.NUMBER, description: "The y-coordinate of the top-left corner as a ratio (0.0 to 1.0)." },
            width: { type: Type.NUMBER, description: "The width as a ratio (0.0 to 1.0)." },
            height: { type: Type.NUMBER, description: "The height as a ratio (0.0 to 1.0)." },
          },
        },
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) return null;

    const data = JSON.parse(jsonString);
    
    // If any key is missing, we assume no face was found. This handles the `{}` case.
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number' || typeof data.width !== 'number' || typeof data.height !== 'number') {
      console.log("Model did not return a complete face bounding box.");
      return null;
    }
    
    const box: FaceBoundingBox = {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    };

    // Validate that the returned values are within the expected 0.0-1.0 range and make sense.
    if (box.x >= 0 && box.x <= 1 &&
        box.y >= 0 && box.y <= 1 &&
        box.width > 0.01 && box.width <= 1 &&
        box.height > 0.01 && box.height <= 1 &&
        (box.x + box.width) <= 1.05 && 
        (box.y + box.height) <= 1.05) {
        return box;
    } else {
      console.warn("Face detection returned out-of-bounds or invalid data:", box);
      return null;
    }
  } catch (error) {
    console.error("Error in detectFace service:", error);
    if (error instanceof Error) {
        if (error.message.includes("`API_KEY` is missing")) {
            throw error;
        }
        if (/API key|permission|denied|invalid/i.test(error.message)) {
            throw new Error("Face detection failed. The provided API key may be invalid, expired, or restricted.");
        }
        if (error instanceof SyntaxError || error.message.includes("invalid response")) {
            throw new Error("Face detection failed: The AI model returned an invalid response. Please try again.");
        }
    }
    
    throw new Error("Face detection failed. The AI service may be unavailable or the image could not be processed.");
  }
}