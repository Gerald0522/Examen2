import type { CapacitorConfig } from '@capacitor/cli';

// M8: Identidad personalizada de la aplicación.
const config: CapacitorConfig = {
  appId: 'cr.ac.ucr.if0009.c5f778',
  appName: 'Préstamos Gutiérrez',
  webDir: 'dist',
  android: {
    // Solo para el examen: la API local corre en http://10.0.2.2.
    // La excepción de texto en claro está acotada en res/xml/network_security_config.xml
    allowMixedContent: true,
  },
};

export default config;