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

  const apiKey = process.env.LIQUID_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Liquid API key is not configured. Add LIQUID_API_KEY in the Netlify site environment variables.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const instruction = TASK_INSTRUCTIONS[task] || TASK_INSTRUCTIONS.answer;

  try {
    const baseUrl = (process.env.LIQUID_API_BASE_URL || 'https://api.liquid.ai/v1').replace(/\/+$/, '');
    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.LIQUID_MODEL || 'LFM2.5-1.2B-Instruct',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for an AI SaaS marketing website. ${instruction} Keep responses clear, practical, and concise. Do not claim affiliations or partnerships unless explicitly stated in the prompt.`
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      const message = data?.error?.message || 'Liquid API request failed.';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: aiResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();

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
      JSON.stringify({ error: 'Unexpected server error while contacting Liquid AI.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
