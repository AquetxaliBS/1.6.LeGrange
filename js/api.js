// js/api.js
const API_URL = "https://699520f4b081bc23e9c212ce.mockapi.io/api/v1/ganado_IoT";

/**
 * Postea un evento/registro a MockAPI.
 * data: objeto libre con campos que quieras guardar.
 * Retorna la respuesta JSON si ok, o lanza error.
 */
async function postEvent(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const text = await res.text().catch(()=>"");
      throw new Error(`MockAPI no respondió OK: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (err) {
    // relanza para que el llamador pueda manejar la UI
    throw err;
  }
}
