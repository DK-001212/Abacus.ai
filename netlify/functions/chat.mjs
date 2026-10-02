const TASK_INSTRUCTIONS = {
  summarize: 'Summarize the content clearly and concisely for a business audience.',
  explain: 'Explain the idea in plain language with a helpful structure and examples when useful.',
  ideas: 'Generate multiple practical ideas, ranked by impact and feasibility.',
  analyze: 'Analyze the content for patterns, opportunities, risks, and recommendations.',
  code: 'Provide a concise, correct code example when relevant and explain it briefly.',
  content: 'Draft polished marketing or educational content that is engaging and clear.',
  answer: 'Answer directly and accurately using the user request as the primary source of truth.'
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Request body must be valid JSON.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const prompt = String(body?.prompt || '').trim();
  const task = String(body?.task || 'answer').trim().toLowerCase();

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'A prompt is required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY in the Netlify site environment variables.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const instruction = TASK_INSTRUCTIONS[task] || TASK_INSTRUCTIONS.answer;

  try {
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `You are a helpful AI assistant for an AI SaaS marketing website. ${instruction} Keep responses clear, practical, and concise. Do not claim affiliations or partnerships unless explicitly stated in the prompt.` }]
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      const message = data?.error?.message || 'Gemini request failed.';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: aiResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const answer = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();

    if (!answer) {
      return new Response(
        JSON.stringify({ error: 'The AI provider returned an empty response.' }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ answer, task, prompt }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Unexpected server error while contacting Gemini.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
