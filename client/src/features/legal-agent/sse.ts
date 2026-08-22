// Minimal SSE frame reader for a POST-based event stream (native
// EventSource only supports GET, so the streaming chat endpoint is
// consumed via fetch() + a manual ReadableStream reader instead).
export async function* readSseEvents(response: Response): AsyncGenerator<any> {
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? ""; // keep any incomplete trailing frame for the next chunk

        for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;

            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
                yield JSON.parse(jsonStr);
            } catch {
                // Malformed frame — skip rather than crash the whole stream.
            }
        }
    }
}
