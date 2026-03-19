import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

export async function initLLM(onStatus) {
  try {
    onStatus('Initializing AI...');

    const selectedModel = "SmolLM2-135M-Instruct-q0f16-MLC";

    // We'll create the engine using a web worker
    // The worker script will need to be correctly bundled or served
    const engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL('./llm-worker.js', import.meta.url), { type: 'module' }),
      selectedModel,
      {
        initProgressCallback: (report) => {
          onStatus(`Loading: ${Math.round(report.progress * 100)}%`);
        }
      }
    );

    onStatus('AI Ready');

    return {
      chat: {
        completions: {
          create: async (options) => {
            const userPrompt = options.messages[options.messages.length - 1].content;

            const systemPrompt = `You are a professional presentation assistant.
Return ONLY a JSON object with the following structure:
{
  "title": "A concise title for the slide",
  "points": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
}
Keep the content professional and relevant to the user's brief.`;

            const fullMessages = [
              { role: 'system', content: systemPrompt },
              ...options.messages
            ];

            console.log('[WebLLM] Executing chat.completions.create for SmolLM2. Payload:', fullMessages);
            const response = await engine.chat.completions.create({
              messages: fullMessages,
              max_tokens: 200,
              temperature: 0.7
            });
            console.log('[WebLLM] Execution completed.', response);

            return response;
          }
        }
      }
    };
  } catch (e) {
    console.error('LLM Initialization Error:', e);
    onStatus('Offline AI Unavailable');
    throw e;
  }
}
