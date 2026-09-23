const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Get / Set the Gemini API key from localStorage
 */
export function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}
export function setApiKey(key) {
  localStorage.setItem('gemini_api_key', key.trim());
}

/**
 * Get / Set the Groq API key from localStorage
 */
export function getGroqApiKey() {
  return localStorage.getItem('groq_api_key') || '';
}
export function setGroqApiKey(key) {
  localStorage.setItem('groq_api_key', key.trim());
}

/**
 * Get / Set active AI provider ('gemini' | 'groq')
 */
export function getAiProvider() {
  return localStorage.getItem('ai_provider') || 'gemini';
}
export function setAiProvider(provider) {
  localStorage.setItem('ai_provider', provider);
}

/**
 * Build the prompt for the Gemini/Groq API based on question type, count and difficulty.
 */
function buildPrompt(text, type, count, difficulty, sectionTitle) {
  const typeInstructions = {
    MCQ: `Generate ${count} Multiple Choice Questions (MCQ). Each question must have exactly 4 options labeled a, b, c, d. One option should be the correct answer.
Return JSON array where each item has: "text" (the question), "options" (array of 4 strings), and "answer" (the correct option letter: "a", "b", "c", or "d").`,

    FIB: `Generate ${count} Fill in the Blank questions. Replace one key word or phrase with "_______" (7 underscores).
Return JSON array where each item has: "text" (the sentence with the blank), and "answer" (the exact missing word/phrase).`,

    TF: `Generate ${count} True or False statements. Mix true and false statements roughly equally.
Return JSON array where each item has: "text" (the statement), and "answer" ("True" or "False").`,

    SA: `Generate ${count} Short Answer questions that can be answered in 2-3 sentences.
Return JSON array where each item has: "text" (the question), and "answer" (a concise 2-3 sentence ideal answer).`,

    LA: `Generate ${count} Long Answer / Essay questions that require detailed explanations.
Return JSON array where each item has: "text" (the question), and "answer" (a detailed model answer outline or key points/rubrics).`,

    MATCH: `Generate ${count} Match the Following pairs. Column A contains the item to match, and Column B contains the correct matching item.
Return JSON array where each item has: "text" (empty string ""), "columnA" (left column item, e.g. "1. Mitochondria"), "columnB" (right column correct item, e.g. "a. Powerhouse"). The pairs should be aligned correctly (we will shuffle them in the UI).`,

    DRAW: `Generate ${count} Draw and Label diagram questions related to the content.
Return JSON array where each item has: "text" (the instruction, e.g. "Draw a labeled diagram of a plant cell"), and "answer" (brief list of key labels and parts that must be marked).`,

    SOLVE: `Generate ${count} Solve/Calculate numerical or step-by-step problems based on the content.
Return JSON array where each item has: "text" (the problem statement), and "answer" (the step-by-step solution and final answer).`
  };

  const instruction = typeInstructions[type] || typeInstructions['SA'];

  // If user gave a custom section title, include it so the AI adapts the question style
  const sectionContext = sectionTitle
    ? `\nSECTION TITLE (provided by user): "${sectionTitle}"
Generate questions that match this section title style. For example, if the title says "Match the Following", generate matching-pair questions; if it says "Define the following terms", generate definition-style questions; if it says "Answer in one word", generate very short single-word answer questions. Adapt the question format to fit the section title.\n`
    : '';

  return `You are an expert exam question paper generator for school students.

CONTENT TO BASE QUESTIONS ON:
"""
${text.substring(0, 8000)}
"""

TASK:
${instruction}
${sectionContext}
RULES:
- Difficulty level: ${difficulty}
- Questions must be directly based on the content provided above
- Questions should test understanding, not just recall
- Use clear, grammatically correct language
- For ${difficulty} difficulty: ${difficulty === 'Easy' ? 'focus on basic recall and simple understanding' : difficulty === 'Hard' ? 'test critical thinking, application, and analysis' : 'test comprehension and moderate application'}
- Include accurate answers for each question generated
- Do NOT include question numbers
- Return ONLY a valid JSON array or object, no markdown formatting, no code blocks, no extra text`;
}

/**
 * Parse the Gemini/Groq response to extract the JSON content.
 */
function parseResponseText(responseText) {
  let cleaned = responseText.trim();

  // Remove markdown code block wrappers if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    return parsed;
  } catch {
    const matchArr = cleaned.match(/\[[\s\S]*\]/);
    if (matchArr) {
      try {
        return JSON.parse(matchArr[0]);
      } catch {
        // do nothing
      }
    }
    const matchObj = cleaned.match(/\{[\s\S]*\}/);
    if (matchObj) {
      try {
        return JSON.parse(matchObj[0]);
      } catch {
        // do nothing
      }
    }
    return null;
  }
}

/**
 * Low-level call to provider API to generate questions
 */
async function callProviderApi(provider, text, type, count, difficulty, sectionTitle) {
  const prompt = buildPrompt(text, type, count, difficulty, sectionTitle);
  let rawQuestions;

  if (provider === 'groq') {
    const apiKey = getGroqApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      }
      throw new Error(`Groq API Error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const candidateText = data?.choices?.[0]?.message?.content;
    if (!candidateText) throw new Error('Empty response from Groq API');
    rawQuestions = parseResponseText(candidateText);
  } else {
    // Gemini
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 400 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      }
      throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Empty response from Gemini API');
    rawQuestions = parseResponseText(candidateText);
  }

  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error('Could not parse questions from AI response');
  }

  return rawQuestions.map((q, i) => ({
    id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
    text: q.text || q.question || '',
    options: q.options || undefined,
    columnA: q.columnA || undefined,
    columnB: q.columnB || undefined,
    answer: q.answer || '',
  }));
}

/**
 * Generate questions using either Google Gemini or Groq API.
 * Features automatic provider failover: if one provider key is exhausted, it automatically attempts the other configured provider.
 */
export async function generateQuestionsWithAI(text, type, count, difficulty = 'Medium', sectionTitle = '') {
  const primaryProvider = getAiProvider();
  const secondaryProvider = primaryProvider === 'gemini' ? 'groq' : 'gemini';

  try {
    return await callProviderApi(primaryProvider, text, type, count, difficulty, sectionTitle);
  } catch (primaryError) {
    console.warn(`Primary Provider (${primaryProvider}) failed: ${primaryError.message}. Trying failover...`);

    const secondaryKey = secondaryProvider === 'gemini' ? getApiKey() : getGroqApiKey();
    if (secondaryKey) {
      try {
        return await callProviderApi(secondaryProvider, text, type, count, difficulty, sectionTitle);
      } catch (secondaryError) {
        console.error(`Failover Provider (${secondaryProvider}) also failed: ${secondaryError.message}`);
        throw secondaryError;
      }
    }
    throw primaryError;
  }
}

/**
 * Low-level call to syllabus analysis API
 */
async function callSyllabusApi(provider, text, grade, subject) {
  const prompt = `You are an expert curriculum assistant.
Analyze the following learning material/syllabus text for a Grade ${grade} ${subject} course.

TEXT CONTENT:
"""
${text.substring(0, 10000)}
"""

TASK:
1. Identify and extract a list of 3 to 6 major topics/chapters.
2. For each topic, extract 4 to 8 key bullet points summarizing the essential concepts that students need to know (Key Points / Study Guide).
3. Estimate the general difficulty level of each topic (Easy, Medium, or Hard) based on Grade ${grade} standards.

Return ONLY a valid JSON object matching this structure:
{
  "topics": [
    {
      "id": "unique-topic-id",
      "name": "Name of the Topic/Chapter",
      "difficulty": "Easy|Medium|Hard",
      "keyPoints": [
        "First key educational concept or fact...",
        "Second key concept...",
        "Third key concept..."
      ]
    }
  ]
}

Ensure the output is valid JSON. Do NOT include markdown formatting or code blocks.`;

  let contentText;

  if (provider === 'groq') {
    const apiKey = getGroqApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      }
      throw new Error(`Groq API Error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    contentText = data?.choices?.[0]?.message?.content;
  } else {
    // Gemini
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 400 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      }
      throw new Error(`Gemini API Error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  if (!contentText) throw new Error('Empty response from AI API');

  const parsed = parseResponseText(contentText);
  if (!parsed || !parsed.topics || !Array.isArray(parsed.topics)) {
    throw new Error('Could not parse syllabus analysis response as JSON');
  }

  return parsed;
}

/**
 * Analyze syllabus/learning material to extract topics, key points, and difficulty levels.
 * Features automatic provider failover.
 */
export async function analyzeSyllabus(text, grade, subject) {
  const primaryProvider = getAiProvider();
  const secondaryProvider = primaryProvider === 'gemini' ? 'groq' : 'gemini';

  try {
    return await callSyllabusApi(primaryProvider, text, grade, subject);
  } catch (primaryError) {
    console.warn(`Primary Provider (${primaryProvider}) failed: ${primaryError.message}. Trying failover...`);

    const secondaryKey = secondaryProvider === 'gemini' ? getApiKey() : getGroqApiKey();
    if (secondaryKey) {
      try {
        return await callSyllabusApi(secondaryProvider, text, grade, subject);
      } catch (secondaryError) {
        console.error(`Failover Provider (${secondaryProvider}) also failed: ${secondaryError.message}`);
        throw secondaryError;
      }
    }
    throw primaryError;
  }
}

/**
 * Local fallback syllabus analysis when no API key is present.
 */
export function analyzeSyllabusLocally(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 20);

  const topics = paragraphs.slice(0, 5).map((para, idx) => {
    const sentences = para.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 5);
    const name = sentences[0] ? sentences[0].substring(0, 60) : `Topic ${idx + 1}`;
    const keyPoints = sentences.slice(1, 6).map(s => s + '.');
    return {
      id: `topic-local-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      difficulty: idx % 3 === 0 ? 'Easy' : idx % 3 === 1 ? 'Medium' : 'Hard',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Important concepts discussed in the syllabus.']
    };
  });

  return { topics };
}

/**
 * Local fallback generator (used when no API key is set).
 * Kept as a safety net but produces lower quality questions.
 */
export function generateQuestionsFromText(text, type, count) {
  const sentences = text
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const allWords = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4);

  const generated = [];

  for (let i = 0; i < count; i++) {
    const sentence = sentences.length > 0
      ? sentences[i % sentences.length]
      : (text.length > 30 ? text.substring(0, 30) + '...' : text);

    const words = sentence.split(/\s+/).filter(w => w.length > 3);
    const fallbackWord = words.length > 0 ? words[Math.floor(words.length / 2)] : 'Concept';

    const getDistractor = (offset) => {
      if (allWords.length > offset) return allWords[(i + offset) % allWords.length];
      return `Option ${offset}`;
    };

    if (type === 'MCQ') {
      generated.push({
        id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: sentence,
        options: [fallbackWord, getDistractor(1), getDistractor(2), getDistractor(3)],
        answer: 'a'
      });
    } else if (type === 'FIB') {
      let qText;
      if (words.length > 1) {
        const regex = new RegExp(`\\b${fallbackWord}\\b`, 'i');
        qText = sentence.replace(regex, '_______');
      } else {
        qText = `The term _______ is mentioned in the text.`;
      }
      generated.push({
        id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: qText,
        answer: fallbackWord
      });
    } else if (type === 'TF') {
      let qText = sentence;
      let ans = 'True';
      if (i % 2 !== 0 && qText.length > 10) {
        qText = qText.includes(' is ') ? qText.replace(' is ', ' is not ') : `It is false that: ${qText}`;
        ans = 'False';
      }
      generated.push({
        id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: qText,
        answer: ans
      });
    } else if (type === 'MATCH') {
      generated.push({
        id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: '',
        columnA: `${i + 1}. ${fallbackWord.replace(/[^a-zA-Z]/g, '')}`,
        columnB: `${String.fromCharCode(97 + i)}. ${getDistractor(i + 1)}`,
        answer: `${String.fromCharCode(97 + i)}`
      });
    } else {
      generated.push({
        id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        text: sentence,
        answer: `Ideal answer based on context: ${sentence}`
      });
    }
  }

  return generated;
}
