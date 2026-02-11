import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SessionType, Difficulty, Question } from "../types";

// In a real app, this should be handled more securely, but per instructions, we use process.env.API_KEY
// The user is not prompted for it, it is assumed available.
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface GenerateParams {
  topic: string;
  count: number;
  type: SessionType;
  difficulty?: Difficulty;
  file?: {
    data: string;
    mimeType: string;
  };
  textContent?: string;
}

export const generateQuestions = async (params: GenerateParams): Promise<Question[]> => {
  const { topic, count, type, difficulty, file, textContent } = params;

  // gemini-3-flash-preview supports multimodal input for text generation
  const modelName = "gemini-3-flash-preview";

  const systemInstruction = `You are a specialized Quiz and Poll generator. 
  Create content that is engaging, accurate, and perfectly suited to the requested difficulty.
  If the type is POLL, questions should be opinion-based or preference-based with no single correct answer.
  If the type is QUIZ, questions must have strictly one correct answer.
  Return strictly JSON.`;

  let promptText = `Generate ${count} ${difficulty ? difficulty + ' ' : ''}${type.toLowerCase()} questions about "${topic}".`;
  
  if (file || textContent) {
    promptText = `Analyze the provided content carefully. Generate ${count} ${difficulty ? difficulty + ' ' : ''}${type.toLowerCase()} questions based EXCLUSIVELY on the content of the provided context.
    The user provided topic/context is: "${topic}". Use this as a title or general theme, but ensure all questions can be answered using the information in the provided document/text.`;
  }

  promptText += `
  For each question, provide 4 options.
  ${type === SessionType.QUIZ ? 'Indicate the index (0-3) of the correct answer.' : 'Set correctAnswerIndex to -1.'}
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The question text" },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "An array of 4 possible options"
        },
        correctAnswerIndex: { type: Type.INTEGER, description: "Index of correct option, or -1 for polls" }
      },
      required: ["text", "options", "correctAnswerIndex"]
    }
  };

  try {
    let parts: any[] = [];
    
    if (textContent) {
      parts.push({ text: textContent });
    } else if (file) {
      parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
    
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7,
        }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Transform to our internal type with IDs
    return rawData.map((q: any) => ({
      id: crypto.randomUUID(),
      text: q.text,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex
    }));

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
};

export const generateImageForQuestion = async (questionText: string): Promise<string> => {
  // Using gemini-2.5-flash-image for general image generation tasks
  const modelName = 'gemini-2.5-flash-image';
  const prompt = `Create a flat, modern, vector-style illustration suitable for a quiz app representing this question: "${questionText}". Do not include any text inside the image.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      // Note: responseMimeType is not supported for nano banana series models, so we omit it.
    });

    if (response.candidates && response.candidates.length > 0) {
        // Iterate through parts to find the image part
        const parts = response.candidates[0].content?.parts || [];
        for (const part of parts) {
             if (part.inlineData && part.inlineData.data) {
                 return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             }
        }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw new Error("Failed to generate image.");
  }
};