const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function generateStories(brief, onChunk) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      stream: true,
      messages: [
        {
          role: 'user',
          content: `Tu es un Product Owner expert.
À partir de ce brief métier, génère 3 user stories avec :
- Format : "En tant que... Je veux... Afin de..."
- 2 critères d'acceptation par story
- Complexité : S, M ou L
- 2 scénarios Gherkin par story (Étant donné / Quand / Alors)

Sépare chaque user story par ---

Brief : ${brief}`
        }
      ]
    })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

    for (const line of lines) {
      const data = line.replace('data: ', '')
      if (data === '[DONE]') break
      try {
        const parsed = JSON.parse(data)
        const text = parsed.delta?.text
        if (text) onChunk(text)
      } catch {
        // ligne incomplète, on ignore
      }
    }
  }
}