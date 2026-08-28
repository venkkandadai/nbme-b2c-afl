import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "https://nbme-b2c-afl-1.onrender.com",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------------------------------------------------
// STRUCTURED OUTPUT SCHEMA
// ------------------------------------------------------------

const questionSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          domain: {
            type: "string",
          },
          topic: {
            type: "string",
          },
          stem: {
            type: "string",
          },
          choices: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  enum: ["A", "B", "C", "D", "E"],
                },
                text: {
                  type: "string",
                },
              },
              required: ["id", "text"],
              additionalProperties: false,
            },
          },
          correctAnswer: {
            type: "string",
            enum: ["A", "B", "C", "D", "E"],
          },
          explanation: {
            type: "string",
          },
          learningObjective: {
            type: "string",
          },
        },

        required: [
          "id",
          "domain",
          "topic",
          "stem",
          "choices",
          "correctAnswer",
          "explanation",
          "learningObjective",
        ],

        additionalProperties: false,
      },
    },
  },

  required: ["questions"],
  additionalProperties: false,
};

// ------------------------------------------------------------
// GENERATE PRACTICE QUESTIONS
// ------------------------------------------------------------

app.post("/api/generate-practice", async (req, res) => {
  try {
    const {
      domain = "Cardiovascular System",
      questionCount = 5,
      mode = "Tutor",
      learnerLevel = "clinical medical student",
      reason = "relatively lower recent performance",
      focusTopics = [],
    } = req.body;

    // Limit prototype sessions to 1-20 questions.
    const safeCount = Math.min(
      Math.max(Number(questionCount) || 5, 1),
      20
    );

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",

      reasoning: {
        effort: "low",
      },

      instructions: `
You create synthetic formative medical education practice questions
for a product prototype.

These are NOT NBME examination items and must never be represented
as actual NBME questions.

Create clinically plausible single-best-answer multiple-choice
questions.

Requirements:

- Intended for a ${learnerLevel}.
- Domain: ${domain}.
- Purpose: formative remediation.
- Use exactly five answer choices labeled A through E.
- Exactly one answer must be correct.
- Avoid trick questions.
- Avoid ambiguous wording.
- Do not claim to reproduce NBME item-development standards.
- Do not mention the learner's identity.
- Vary topics within the requested domain.
- Include a concise educational explanation.
- Include a clear learning objective.
- Do not use copyrighted or recalled examination questions.
- Generate original synthetic educational content.
- Return only data matching the supplied schema.
      `.trim(),

      input: `
Generate ${safeCount} original synthetic practice questions.

Context:

Domain: ${domain}

Reason for recommendation:
${reason}

Practice mode:
${mode}

Recommended content emphasis:
${focusTopics.length > 0
  ? focusTopics.join(", ")
  : "Broad coverage of the domain"}

Distribute the questions across these focus topics when possible.
Do not restrict every question to exactly the same concept.

The recommendation has already been determined by governed
application logic.

Do not reinterpret, diagnose, or predict the learner's performance.
`.trim(),

      text: {
        format: {
          type: "json_schema",
          name: "practice_question_set",
          strict: true,
          schema: questionSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);

    res.json(parsed);
  } catch (error) {
    console.error("Question generation error:", error);

    res.status(500).json({
      error: "Failed to generate practice questions",
    });
  }
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Practice API running on port ${PORT}`);
});