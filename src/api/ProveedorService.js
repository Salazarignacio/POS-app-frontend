const BASE_URL_PROV = import.meta.env.VITE_API_URL_PROV;

export async function getAllProv() {
  const res = await fetch(BASE_URL_PROV + "/all");
  console.log(BASE_URL_PROV);

  if (!res.ok) {
    throw new Error("Error al obtener productos");
  }
  return res.json();
}

export async function getByIdProv(id) {
  const res = await fetch(BASE_URL_PROV + `/${id}`);
  if (!res.ok) {
    throw new Error("Error al encontrar id " + id);
  }
  return res.json();
}

export async function create(prov) {
  const res = await fetch(BASE_URL_PROV, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prov),
  });
  if (!res.ok) {
    throw new Error("Error al crear proveedor");
  }
  return await res.json();
}

export async function destroy(id) {
  const res = await fetch(BASE_URL_PROV + `/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("No se pudo eliminar archivo");
  }
}
export async function update(id, product) {
  const res = await fetch(BASE_URL_PROV + `/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  return res;
}
