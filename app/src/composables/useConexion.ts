import { ref, onMounted, onUnmounted } from 'vue';

import { Network } from '@capacitor/network';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { Capacitor } from '@capacitor/core';

import type { PluginListenerHandle } from '@capacitor/core';

// M7: Detectar el estado de conexión.
export function useConexion() {

  const conectado = ref(true);
  const tipo = ref('unknown');

  let handle: PluginListenerHandle | undefined;
  let desmontado = false;

  onMounted(async () => {

    // Obtener el estado inicial de la conexión.
    const estado = await Network.getStatus();

    if (desmontado) {
      return;
    }

    conectado.value = estado.connected;
    tipo.value = estado.connectionType;

    // Escuchar los cambios de conexión.
    handle = await Network.addListener(
      'networkStatusChange',
      (estado) => {

        conectado.value = estado.connected;
        tipo.value = estado.connectionType;

      }
    );

    // Evitar dejar un listener activo si la página
    // se destruye mientras se registra.
    if (desmontado) {
      await handle.remove();
      handle = undefined;
    }

  });

  // Liberar el listener al destruir la página.
  onUnmounted(async () => {

    desmontado = true;

    if (handle) {
      await handle.remove();
      handle = undefined;
    }

  });

  return { conectado, tipo };
}

// M7: Vibración breve de confirmación.
export async function vibrar() {

  // No ejecutar vibraciones en el navegador.
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await Haptics.impact({
    style: ImpactStyle.Light
  });

}