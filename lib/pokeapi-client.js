class PokeApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function fetchJson(url) {
  const configured = Number(process.env.POKEAPI_TIMEOUT_MS || 10000);
  const timeout = Number.isInteger(configured) && configured > 0 ? configured : 10000;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (response.status === 404) throw new PokeApiError('Pokémon no encontrado', 404);
    if (!response.ok) throw new PokeApiError('Error al conectar con PokeAPI', 502);
    return await response.json();
  } catch (error) {
    if (error instanceof PokeApiError) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new PokeApiError('PokeAPI excedió el tiempo de espera', 504);
    }
    throw new PokeApiError('PokeAPI no está disponible o devolvió una respuesta inválida', 502);
  }
}
module.exports = { fetchJson, PokeApiError };
