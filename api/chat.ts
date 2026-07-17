import { GoogleGenAI } from "@google/genai";

// Lazy-initialization helper for Gemini AI client to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "" || apiKey.startsWith("YOUR_")) {
      throw new Error("GEMINI_API_KEY environment variable is not defined or is set to a placeholder.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel serverless environment
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // Graceful fallback helper
  const sendFallbackResponse = (reason: string) => {
    const fallbackReplies = [
      "Welcome to BrightMinds Academy! We specialize in premium academic tutoring, spoken English, exam prep, and digital skills. How can I help your child succeed today?",
      "Our courses cater to grades 1 to 12 as well as pre-university students. We also offer interactive computer classes and IELTS coaching. Would you like to check out our curriculum?",
      "We maintain a personalized learning atmosphere with expert coaching. You can book a free demo class using the button on our page!",
      "Thanks for your question! BrightMinds offers high-quality mentoring that builds lifelong academic confidence. Please let me know if you would like info on any specific subject."
    ];
    const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    res.status(200).json({
      text: `[Offline Demo Mode] ${randomReply}\n\n*(Note: BrightBot is currently running offline. Please verify that your GEMINI_API_KEY is configured correctly in Vercel's Environment Variables. Status: ${reason})*`
    });
  };

  try {
    const { message, history } = req.body || {};

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Attempt to get the Gemini AI client
    let ai;
    try {
      ai = getAiClient();
    } catch (err: any) {
      console.warn("Gemini API key is missing or placeholder. Using high-quality offline fallback.");
      sendFallbackResponse("GEMINI_API_KEY is not defined or is set to a placeholder.");
      return;
    }

    // Build chat contents from history and current message
    const formattedContents: any[] = [];
    
    if (Array.isArray(history)) {
      history.forEach((turn: any) => {
        if (turn.role === "user" || turn.role === "model") {
          formattedContents.push({
            role: turn.role,
            parts: [{ text: turn.text || "" }]
          });
        }
      });
    }

    // Add current user message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const modelsToTry = ["gemini-3.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting Gemini API call with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: `You are "BrightBot", the friendly, expert AI admissions counselor and student support chatbot for BrightMinds Academy (formerly LearnKid).
Your goal is to guide students and parents, answer their questions about the academy, suggest courses, explain the curriculum, and invite them to schedule a free demo class.

About BrightMinds Academy:
- Mission: Empowering local children and pre-university students with custom academic diagnostics, small interactive classrooms, and expert coaching that makes active discovery highly engaging.
- Coaching Programs: Tailored programs across School Subjects, Test Prep, Digital Skills, and Spoken English.
- Grade Categories:
  1. Primary (Grades 1-5): Solidifies foundational conceptual mastery.
  2. Middle (Grades 6-8): Develops critical analysis and intermediate problem-solving.
  3. Secondary (Grades 9-10): Focuses on board exam readiness and high performance.
  4. Higher Secondary (Grades 11-12): Thorough physics, chemistry, mathematics coaching.
  5. Pre-University: Advanced college prep and exam training.
  6. Language & Digital: Computer classes, coding foundation, IELTS prep, and spoken English.
- Popular Courses:
  - Advanced Mathematics: Analytical thinking, school curriculum support, and mental arithmetic.
  - Science Explorers: Hands-on physics, chemistry, and biology learning.
  - Coding & Technology: Interactive game development, scratch, web development, and digital literacy.
  - Creative English & Spoken English: Public speaking, spelling, grammar, creative writing, and spoken fluency.
- How We Teach (The Process):
  1. Diagnostic Evaluation: Personalized session to identify learning gaps and styles.
  2. Concept Blueprint: Custom milestones sheet aligned to the student's unique needs.
  3. Interactive Classrooms: Engaging 1-on-1 and small group focus.
  4. Weekly Performance Sync: Direct dashboard reports and tutor reviews.
- Location: BrightMinds Academy Main Hub (local students can visit in person, online coaching is also available).
- Contact Admissions: admissions@brightmindsacademy.com

Conversational Guidelines:
- Keep answers professional, warm, engaging, and brief (2-3 sentences per point maximum) to ensure readability in a chat widget.
- Use bullet points if listing multiple courses or benefits.
- Always be encouraging, friendly, and helpful.
- End key interactions by politely suggesting booking a free demo class using our demo booking form on the website.`
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break; // Successfully got a response, break out of the loop
        } else {
          throw new Error(`Empty response received from ${modelName}`);
        }
      } catch (err: any) {
        console.warn(`Failed with model ${modelName}:`, err.message || err);
        lastError = err;
      }
    }

    if (responseText) {
      res.status(200).json({ text: responseText });
    } else {
      console.error("All Gemini models failed. Using offline fallback.");
      sendFallbackResponse(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
    }
  } catch (error: any) {
    console.error("General handler error:", error);
    sendFallbackResponse(`Internal handler error: ${error.message || error}`);
  }
}
