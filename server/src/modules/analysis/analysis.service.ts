import OpenAI from "openai";
import { env } from "../../config/env";

const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const DOCUMENT_TYPES = [
    "Rental Agreement",
    "Employment Contract",
    "NDA",
    "Loan Agreement",
    "Privacy Policy",
    "Terms of Service",
    "Business Contract",
    "Other",
];

const SEVERITIES = ["Low", "Medium", "High"];
const RISK_CATEGORIES = ["Financial", "Termination", "Liability", "Privacy", "Other"];

export const analyzeDocument = async (text: string) => {
    //Limit text (it's important to avoid token limits and high costs)
    const trimmedText = text.slice(0, 4000);

    const prompt = `
You are a legal assistant AI that helps non-lawyers understand legal documents.

Analyze the following legal document and return a JSON object with exactly these fields:

{
  "title": "A short descriptive title for this document (e.g. 'Rental Agreement - 123 Main St'), under 60 characters",
  "documentType": "One of: ${DOCUMENT_TYPES.join(", ")}",
  "summary": "A concise summary in simple, non-legal English",
  "clauses": ["Important clause 1", "Important clause 2"],
  "riskLevel": "Low, Medium, or High - the OVERALL risk level of this document",
  "riskItems": [
    {
      "clause": "The specific clause or term that is risky",
      "severity": "Low, Medium, or High",
      "category": "One of: ${RISK_CATEGORIES.join(", ")}",
      "explanation": "Plain-English explanation of why this is risky and what it means for the person signing/agreeing"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting, no extra commentary.

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

    let parsed: any;
    try {
        const cleanOutput = output
            ?.replace(/```json/g, "")
            ?.replace(/```/g, "")
            ?.trim();

        parsed = JSON.parse(cleanOutput || "{}");
    } catch (error) {
        console.error("Failed to parse AI response:", output);
        throw new Error("Invalid AI response format");
    }

    // Normalize/validate the AI's output so malformed or drifted responses
    // can't crash downstream DB writes or UI rendering.
    return {
        title:
            typeof parsed.title === "string" && parsed.title.trim()
                ? parsed.title.trim().slice(0, 120)
                : null,
        documentType: DOCUMENT_TYPES.includes(parsed.documentType)
            ? parsed.documentType
            : "Other",
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        clauses: Array.isArray(parsed.clauses)
            ? parsed.clauses.filter((c: unknown) => typeof c === "string")
            : [],
        riskLevel: SEVERITIES.includes(parsed.riskLevel) ? parsed.riskLevel : "Medium",
        riskItems: Array.isArray(parsed.riskItems)
            ? parsed.riskItems
                  .filter(
                      (r: any) =>
                          r && typeof r.clause === "string" && typeof r.explanation === "string"
                  )
                  .map((r: any) => ({
                      clause: r.clause,
                      severity: SEVERITIES.includes(r.severity) ? r.severity : "Medium",
                      category: RISK_CATEGORIES.includes(r.category) ? r.category : "Other",
                      explanation: r.explanation,
                  }))
            : [],
    };
};
