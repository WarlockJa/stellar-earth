
import { GoogleGenAI, Type } from "@google/genai";
import { LocationInsight } from "../types";

const API_KEY = process.env.API_KEY;

export async function getLocationInsight(lat: number, lng: number): Promise<LocationInsight | null> {
  if (!API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide information about the location at latitude ${lat.toFixed(4)} and longitude ${lng.toFixed(4)}. If it is in the ocean, mention the ocean name. If it is land, mention the country and region.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the city, country, or geographical feature." },
            description: { type: Type.STRING, description: "A brief summary of this location." },
            funFact: { type: Type.STRING, description: "An interesting fact about this specific area." },
          },
          required: ["name", "description", "funFact"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      ...result,
      coordinates: { lat, lng }
    };
  } catch (error) {
    console.error("Error fetching location insight:", error);
    return null;
  }
}

export async function searchLocation(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  if (!API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the approximate latitude and longitude coordinates for the query: "${query}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            name: { type: Type.STRING }
          },
          required: ["lat", "lng", "name"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error searching location:", error);
    return null;
  }
}
