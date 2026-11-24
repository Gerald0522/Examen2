<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Equipos</ion-title>

        <ion-buttons slot="end">
          <ion-button
            router-link="/tabs/equipos/nuevo"
            aria-label="Nuevo equipo"
          >
            <ion-icon slot="icon-only" :icon="add" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar>
        <ion-searchbar
          v-model="q"
          :debounce="400"
          placeholder="Buscar por código o nombre"
          @ion-input="buscar"
        />
      </ion-toolbar>

      <!-- YA IMPLEMENTADO: depende de useConexion() [M7] -->
      <ion-toolbar v-if="!conectado" color="warning">
        <ion-title size="small">
          Sin conexión: los datos pueden estar desactualizados
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <!-- M4: Actualizar listado -->
      <ion-refresher slot="fixed" @ion-refresh="refrescar">
        <ion-refresher-content />
      </ion-refresher>

      <!-- M4: Skeleton durante la primera carga -->
      <ion-list v-if="cargando && equipos.length === 0">
        <ion-item v-for="n in 5" :key="n">
          <ion-label>
            <h2>
              <ion-skeleton-text
                animated
                style="width: 80%"
              />
            </h2>

            <p>
              <ion-skeleton-text
                animated
                style="width: 50%"
              />
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- M4: Mensaje de error -->
      <div v-else-if="error" class="estado-vacio">
        <ion-icon :icon="cloudOfflineOutline" />

        <p>{{ error }}</p>

        <ion-button @click="reiniciarListado">
          Reintentar
        </ion-button>
      </div>

      <!-- M4: Estado vacío -->
      <div
        v-else-if="!cargando && equipos.length === 0"
        class="estado-vacio"
      >
        <ion-icon :icon="searchOutline" />

        <p>No se encontraron equipos.</p>
      </div>

      <!-- M4 y M6: Listado y eliminación de equipos -->
      <ion-list v-else>
        <ion-item-sliding
          v-for="equipo in equipos"
          :key="equipo.id"
        >
          <ion-item
            :router-link="`/tabs/equipos/${equipo.id}/editar`"
            detail
          >
            <ion-label>
              <h2>{{ equipo.nombre }}</h2>

              <p>
                {{ equipo.codigo }} · {{ equipo.categoria.nombre }}
              </p>
            </ion-label>

            <ion-badge
              slot="end"
              :color="colorEstado[equipo.estado]"
            >
              {{ equipo.estado }}
            </ion-badge>
          </ion-item>

          <!-- M6: Opción deslizable para eliminar -->
          <ion-item-options side="end">
            <ion-item-option
              color="danger"
              @click="confirmarEliminacion(equipo, $event)"
            >
              <ion-icon slot="start" :icon="trashOutline" />
              Eliminar
            </ion-item-option>
          </ion-item-options>

        </ion-item-sliding>
      </ion-list>

      <!-- M4: Paginación -->
      <ion-infinite-scroll
        :key="claveInfinite"
        :disabled="!hayMas || !!error"
        @ion-infinite="cargarMas"
      >
        <ion-infinite-scroll-content
          loading-spinner="bubbles"
          loading-text="Cargando más equipos..."
        />
      </ion-infinite-scroll>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonLabel,
  IonSkeletonText,
  IonBadge,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  alertController,
  onIonViewWillEnter
} from '@ionic/vue';

import type {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent
} from '@ionic/vue';

import {
  add,
  cloudOfflineOutline,
  searchOutline,
  trashOutline
} from 'ionicons/icons';

import {
  listar,
  eliminar,
  type Equipo,
  type Estado
} from '@/services/equipos';

import { ErrorApi } from '@/services/errores';
import { mostrarToast } from '@/services/avisos';
import { useConexion, vibrar } from '@/composables/useConexion';

const colorEstado: Record<Estado, string> = {
  disponible: 'success',
  prestado: 'warning',
  mantenimiento: 'medium'
};

const { conectado } = useConexion();

const equipos = ref<Equipo[]>([]);
const pagina = ref(0);
const ultimaPagina = ref(1);
const q = ref('');
const cargando = ref(false);
const error = ref('');
const claveInfinite = ref(0);

const hayMas = computed(
  () => pagina.value < ultimaPagina.value
);

// Identificador para descartar respuestas antiguas.
let solicitudActual = 0;

// M4: Cargar equipos.
async function cargar(reiniciar = false) {

  if (!reiniciar && (cargando.value || !hayMas.value)) {
    return;
  }

  const solicitud = ++solicitudActual;

  cargando.value = true;
  error.value = '';

  if (reiniciar) {
    equipos.value = [];
    pagina.value = 0;
    ultimaPagina.value = 1;
  }

  const siguientePagina = reiniciar
    ? 1
    : pagina.value + 1;

  try {

    const respuesta = await listar(
      siguientePagina,
      q.value
    );

    if (solicitud !== solicitudActual) {
      return;
    }

    if (reiniciar) {
      equipos.value = respuesta.data;
    } else {
      equipos.value.push(...respuesta.data);
    }

    pagina.value = respuesta.meta.current_page;
    ultimaPagina.value = respuesta.meta.last_page;

  } catch (e) {

    if (solicitud !== solicitudActual) {
      return;
    }

    if (e instanceof ErrorApi) {

      if (e.status !== 401) {
        error.value = e.message;
      }

    } else {

      error.value = 'No se pudieron cargar los equipos.';

    }

  } finally {

    if (solicitud === solicitudActual) {
      cargando.value = false;
    }

  }
}

// M4: Reiniciar listado y componente infinite scroll.
async function reiniciarListado() {
  await cargar(true);
  await nextTick();
  claveInfinite.value++;
}

// M4: Recargar cada vez que se vuelve a la página.
onIonViewWillEnter(async () => {
  await reiniciarListado();
});

// M4: Buscar equipos desde la primera página.
async function buscar() {
  await reiniciarListado();
}

// M4: Actualizar deslizando hacia abajo.
async function refrescar(evento: RefresherCustomEvent) {

  try {

    await reiniciarListado();

  } finally {

    await evento.target.complete();

  }
}

// M4: Cargar la siguiente página.
async function cargarMas(evento: InfiniteScrollCustomEvent) {

  try {

    await cargar(false);

  } finally {

    await evento.target.complete();

  }
}

// M6: Confirmar y eliminar un equipo.
async function confirmarEliminacion(
  equipo: Equipo,
  evento: Event
) {

  // Cerrar el elemento deslizable.
  const sliding = (evento.target as HTMLElement)
    .closest('ion-item-sliding');

  await sliding?.close();

  // Mostrar alerta de confirmación.
  const alerta = await alertController.create({
    header: 'Eliminar equipo',
    message: `¿Desea eliminar el equipo ${equipo.nombre}?`,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Eliminar',
        role: 'destructive'
      }
    ]
  });

  await alerta.present();

  const { role } = await alerta.onDidDismiss();

  // Si cancela, no se realiza ninguna eliminación.
  if (role !== 'destructive') {
    return;
  }

  try {

    // Solicitud DELETE a la API.
    await eliminar(equipo.id);

    // HTTP 204: eliminar únicamente de la lista local.
    equipos.value = equipos.value.filter(
      item => item.id !== equipo.id
    );

    // Vibración correspondiente al M7.
    try {
      await vibrar();
    } catch {
      // Un fallo de vibración no afecta la eliminación.
    }

    await mostrarToast(
      'Equipo eliminado correctamente.',
      'success'
    );

  } catch (e) {

    if (e instanceof ErrorApi) {

      // HTTP 409: conservar el equipo y mostrar
      // el mensaje real de la API.
      if (e.status === 409) {

        await mostrarToast(
          e.message,
          'warning'
        );

      // HTTP 404: retirar el equipo porque ya no existe.
      } else if (e.status === 404) {

        equipos.value = equipos.value.filter(
          item => item.id !== equipo.id
        );

        await mostrarToast(
          'El equipo ya no existe.',
          'warning'
        );

      // Otros errores, excepto 401.
      } else if (e.status !== 401) {

        await mostrarToast(
          e.message,
          'danger'
        );

      }

    } else {

      await mostrarToast(
        'No se pudo eliminar el equipo.',
        'danger'
      );

    }

  }
}
</script>