export async function fetchJsonArray<T>(input: RequestInfo | URL): Promise<T[]> {
  const response = await fetch(input);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Expected an array response");
  }

  return payload as T[];
}
