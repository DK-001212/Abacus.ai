const TASK_INSTRUCTIONS = {
  summarize: 'Summarize the content clearly and concisely for a business audience.',
  explain: 'Explain the idea in plain language with examples when useful.',
  ideas: 'Generate practical ideas, ordered by impact and feasibility.',
  analyze: 'Analyze the content for patterns, opportunities, risks, and recommendations.',
  code: 'Provide correct code and briefly explain it.',
  content: 'Create polished, engaging marketing or educational content.',
  answer: 'Answer the request directly and accurately.'
};

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const prompt = String(request.body?.prompt || '').trim();
  const task = String(request.body?.task || 'answer').trim().toLowerCase();

  if (!prompt) {
    return response.status(400).json({ error: 'A prompt is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel.' });
  }

  const instruction = TASK_INSTRUCTIONS[task] || TASK_INSTRUCTIONS.answer;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are a helpful AI assistant. ${instruction} Keep the response clear and practical. Never claim an affiliation unless explicitly stated.`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      const message = data?.error?.message || 'Gemini request failed.';
      return response.status(geminiResponse.status).json({ error: message });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!answer) {
      return response.status(502).json({ error: 'Gemini returned an empty response.' });
    }

    return response.status(200).json({ answer, task, prompt });
  } catch (error) {
    return response.status(500).json({ error: 'Unexpected server error while contacting Gemini.' });
  }
};
