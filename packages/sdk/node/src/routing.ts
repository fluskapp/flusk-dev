export interface RouteOptions {
  ruleId: string;
  prompt: string;
  tokenCount: number;
  originalModel: string;
}

export interface RouteResult {
  selectedModel: string;
  reason: string;
  complexity: string;
  expectedQuality: number;
}

/**
 * Ask Flusk server which model to use for a given prompt
 */
export async function route(
  baseUrl: string,
  apiKey: string,
  options: RouteOptions
): Promise<RouteResult> {
  const response = await fetch(`${baseUrl}/api/v1/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Routing failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<RouteResult>;
}
