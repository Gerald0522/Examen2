import { ErrorApi } from './errores';
import { obtenerToken, olvidarSesion } from '@/composables/useAuth';
import router from '@/router';

const BASE_URL = import.meta.env.VITE_API_URL;
const TIEMPO_MAXIMO_MS = 10_000;

export interface OpcionesApi {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

export async function api<T = unknown>(
  ruta: string,
  opciones: OpcionesApi = {}
): Promise<T> {

  const { method = 'GET', body, params } = opciones;

  // 1. Construir URL y agregar parámetros válidos.
  const url = new URL(BASE_URL + ruta);

  if (params) {
    for (const [clave, valor] of Object.entries(params)) {
      if (valor !== undefined && valor !== '') {
        url.searchParams.set(clave, String(valor));
      }
    }
  }

  // 2. Encabezado para recibir JSON.
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  // 3. Agregar token si existe.
  const token = obtenerToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 4. Preparar el cuerpo JSON.
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // 5. Establecer tiempo máximo de espera.
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIEMPO_MAXIMO_MS);

  let response: Response;
  let cuerpo: any = null;

  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined,
      signal: controller.signal
    });

    if (response.status !== 204) {
      const texto = await response.text();

      if (texto) {
        try {
          cuerpo = JSON.parse(texto);
        } catch {
          cuerpo = { mensaje: texto };
        }
      }
    }

  } catch {
    throw new ErrorApi(0, {
      mensaje: 'No fue posible conectar con la API.'
    });

  } finally {
    clearTimeout(timeout);
  }

  // 6. Respuesta sin contenido.
  if (response.status === 204) {
    return null as T;
  }

  // 7. Manejar errores HTTP.
  if (!response.ok) {

    if (response.status === 401 && ruta !== '/login') {
      await olvidarSesion();
      await router.replace('/login');
    }

    throw new ErrorApi(response.status, cuerpo);
  }

  // 8. Devolver la respuesta JSON.
  return cuerpo as T;
}