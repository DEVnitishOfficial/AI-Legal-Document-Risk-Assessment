import OpenAI from "openai";
import { env } from "../../config/env";

const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

export const analyzeDocument = async (text: string) => {
    //Limit text (it's important to avoid token limits and high costs)
    const trimmedText = text.slice(0, 4000);

    const prompt = `
You are a legal assistant AI.

Analyze the following legal document and return:

1. Summary (simple English)
2. Important Clauses
3. Risk Level (Low, Medium, High)
4. Risky Clauses Explanation

Return response strictly in JSON format:

{
  "summary": "...",
  "clauses": ["..."],
  "riskLevel": "Low/Medium/High",
  "risks": ["..."]
}

Document:
${trimmedText}
`;

    const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        response_format: { type: "json_object" },
    });

    const output = response.choices[0].message.content;

    try {
        const cleanOutput = output
            ?.replace(/```json/g, "")
            ?.replace(/```/g, "")
            ?.trim();

        return JSON.parse(cleanOutput || "{}");
    } catch (error) {
        console.error("Failed to parse AI response:", output);
        throw new Error("Invalid AI response format");
    }
};