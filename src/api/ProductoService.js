const BASE_URL = import.meta.env.VITE_API_URL;

export async function getAll() {
  const res = await fetch(BASE_URL + "/all");
  if (!res.ok) {
    throw new Error("Error al obtener productos");
  }
  return res.json();
}
export async function test() {
  const res = await fetch(BASE_URL + "/test");
  if (!res.ok) {
    throw new Error("Error al obtener productos");
  }
  console.log(res);
  
  return res;
}
export async function getById(id) {
  const res = await fetch(BASE_URL + `/${id}`);
  if (!res.ok) {
    throw new Error("Error al encontrar id " + id);
  }
  return res.json();
}
export async function create(product) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    throw new Error("Error al crear producto");
  }
  return await res.json();
}
export async function destroy(id) {
  const res = await fetch(BASE_URL + `/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("No se pudo eliminar archivo");
  }
}
export async function update(id, product) {
  const res = await fetch(BASE_URL + `/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  return res;
}

export async function getByCode(code) {
  try {
    const res = await fetch(BASE_URL + `/codigo/${code}`);
    if (res.status === 404) {
      return []; // 👈 Siempre retornar array vacío si no hay resultados
    }

    if (!res.ok) {
      throw new Error("Error inesperado al buscar producto");
    }

    const data = await res.json();
    // 💡 IMPORTANTE: Si el backend devuelve un objeto (un solo resultado) lo metemos en un array.
    // Si ya es un array, lo dejamos como está.
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    console.error("Error en getByCode:", err);
    return []; // En caso de error, retornamos array vacío para no romper el front
  }
}
