export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, mode, language } = req.body;
  if (!text || !mode) return res.status(400).json({ error: 'Missing text or mode' });

  const modePrompts = {
    explain: "Explain this document in plain, simple language. Break it down into clear points a non-expert can understand.",
    summarize: "Summarize this document in 3-5 bullet points. Be concise and use plain language.",
    rights: "Based on this document, clearly list what rights the person has and what they are entitled to.",
    risks: "Identify and explain the key risks, obligations, or things the person should be careful about in this document.",
    eli5: "Explain this document as if you're talking to a 12-year-old. Use very simple words, short sentences, and relatable examples."
  };

  const langNote = language && language !== 'english' ? ` Respond in ${language}.` : '';
  const prompt = `${modePrompts[mode]}${langNote}\n\nHere is the document:\n\n${text}\n\n---\nAfter your explanation, on a new line write exactly:\nREADABILITY_SCORE: [a number 1-10 for how complex the original was]\nCOMPLEXITY_WORDS: [count of jargon/complex words you simplified]\nKEY_POINTS: [number of key points covered]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Legible, a helpful assistant that explains complex documents in plain language. You are clear, friendly, and accurate.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const full = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ result: full });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
