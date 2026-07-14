/**
 * Sends the voice transcript to the Python backend which uses the Gemini AI model.
 * Returns a promise that resolves to the parsed JSON command.
 */
export const processTranscript = async (transcript, language = 'en-US') => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${API_BASE}/process-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript,
        language
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to process command with backend API');
    }

    return await response.json();
  } catch (error) {
    console.error('NLP Service Error:', error);
    return {
      intent: 'UNKNOWN',
      message: `Error: ${error.message}`
    };
  }
};
