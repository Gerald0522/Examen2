import { computed, ref } from 'vue';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Device } from '@capacitor/device';
import { api } from '@/services/api';

export interface Usuario {
  id: number;
  nombre: string;
}

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

// Estado compartido por toda la aplicación.
const token = ref<string | null>(null);
const usuario = ref<Usuario | null>(null);
let tokenCargado = false;

// Obtener el token para las solicitudes HTTP.
export const obtenerToken = () => token.value;

// Eliminar la sesión de la memoria y almacenamiento seguro.
export async function olvidarSesion() {
  token.value = null;
  usuario.value = null;

  await Promise.allSettled([
    SecureStorage.remove(CLAVE_TOKEN),
    SecureStorage.remove(CLAVE_USUARIO)
  ]);
}

export function useAuth() {

  const estaAutenticado = computed(() => token.value !== null);

  // M2: Iniciar sesión.
  async function login(email: string, password: string) {

    const dispositivo = await Device.getInfo();

    const device_name =
      `${dispositivo.platform} ${dispositivo.model}`.slice(0, 60);

    const respuesta = await api<{
      token: string;
      usuario: Usuario;
    }>('/login', {
      method: 'POST',
      body: {
        email,
        password,
        device_name
      }
    });

    // Guardar la sesión en almacenamiento seguro.
    await SecureStorage.set(CLAVE_TOKEN, respuesta.token);
    await SecureStorage.set(
      CLAVE_USUARIO,
      JSON.stringify(respuesta.usuario)
    );

    // Actualizar el estado de la aplicación.
    token.value = respuesta.token;
    usuario.value = respuesta.usuario;
    tokenCargado = true;
  }

  // M2: Recuperar la sesión guardada.
  async function cargarToken() {

    if (tokenCargado) {
      return;
    }

    tokenCargado = true;

    try {

      const tokenGuardado =
        await SecureStorage.get(CLAVE_TOKEN);

      const usuarioGuardado =
        await SecureStorage.get(CLAVE_USUARIO);

      if (
        typeof tokenGuardado === 'string' &&
        typeof usuarioGuardado === 'string'
      ) {
        token.value = tokenGuardado;
        usuario.value = JSON.parse(usuarioGuardado) as Usuario;
      } else {
        await olvidarSesion();
      }

    } catch {
      await olvidarSesion();
    }
  }

  // M2: Cerrar sesión.
  async function cerrarSesion() {

    try {

      await api('/logout', {
        method: 'POST'
      });

    } catch (error) {

      console.warn('No se pudo revocar el token:', error);

    } finally {

      await olvidarSesion();

    }
  }

  return {
    usuario,
    estaAutenticado,
    login,
    cargarToken,
    cerrarSesion
  };
}