const TIMEOUT_MS = 30000; // 30 secondes timeout
const MAX_OUTPUT_LENGTH = 4000; // Limiter output pour éviter freeze

/**
 * Génère des user stories via l'API Claude avec streaming SSE.
 * @param {string} brief - Le brief métier (10–2000 caractères)
 * @param {(chunk: string) => void} onChunk - Appelé à chaque fragment de texte reçu
 * @param {(message: string) => void} onError - Appelé en cas d'erreur (validation, réseau, timeout)
 * @returns {Promise<void>} Se résout quand le stream est terminé ou interrompu
 */
export async function generateStories(brief, onChunk, onError) {
  // Validation du brief
  if (!brief || brief.trim().length === 0) {
    onError('Veuillez entrer un brief métier.');
    return;
  }

  if (brief.trim().length < 10) {
    onError('Le brief doit contenir au moins 10 caractères.');
    return;
  }

  if (brief.trim().length > 2000) {
    onError('Le brief ne peut pas dépasser 2000 caractères.');
    return;
  }

  let charCount = 0;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Appelle le backend qui va streamer la réponse
    const response = await fetch('/api/generate-stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brief }),
      signal: controller.signal
    });

    // Vérifier les erreurs HTTP
    if (!response.ok) {
      clearTimeout(timeoutId);
      try {
        const errorData = await response.json();
        const errorMessage = errorData?.error || `Erreur (${response.status})`;
        onError(errorMessage);
      } catch {
        onError(`Erreur: ${response.status}`);
      }
      return;
    }

    // Lire le streaming SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Garder la dernière ligne incomplète
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6); // Retirer "data: "

        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const text = parsed.text;

          if (text) {
            charCount += text.length;

            // Limiter la sortie pour éviter les freezes
            if (charCount > MAX_OUTPUT_LENGTH) {
              onError('La réponse est trop longue. Essayez un brief plus court.');
              return;
            }

            onChunk(text);
          }
        } catch (e) {
          // Ignorer les lignes JSON malformées
        }
      }
    }

    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      onError('Requête timeout (30s). Le serveur met trop de temps.');
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      onError('Erreur réseau. Vérifiez votre connexion.');
    } else {
      onError(`Erreur : ${error.message}`);
    }
  }
}