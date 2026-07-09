import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

const FinRagPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#faf6e9',
      100: '#f2e8c2',
      200: '#e9d998',
      300: '#dfc86d',
      400: '#d6b94b',
      500: '#c9a227',
      600: '#b8901f',
      700: '#a17a19',
      800: '#7d5f14',
      900: '#5a440e',
      950: '#3a2b09',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff',
          50: '#e8ecf3',
          100: '#c7d0e0',
          200: '#a3b1c9',
          300: '#7c8dab',
          400: '#5b6d8c',
          500: '#0b1526',
          600: '#0a1220',
          700: '#080f1a',
          800: '#060b16',
          900: '#040810',
          950: '#02050a',
        },
        primary: {
          color: '#d6b94b',
          contrastColor: '#060b16',
          hoverColor: '#e8cd7a',
          activeColor: '#c9a227',
        },
        highlight: {
          background: 'rgba(214, 185, 75, 0.16)',
          focusBackground: 'rgba(214, 185, 75, 0.24)',
          color: '#f2e8c2',
          focusColor: '#f2e8c2',
        },
        formField: {
          background: '#0f1e35',
          borderColor: '#233a5c',
          color: '#eef1f6',
          placeholderColor: '#7c8dab',
        },
        content: {
          background: '#0b1526',
          borderColor: '#1c2f4d',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    providePrimeNG({
      theme: {
        preset: FinRagPreset,
        options: {
          darkModeSelector: '.finrag-dark',
          cssLayer: {
            name: 'primeng',
            order: 'reset, primeng',
          },
        },
      },
    }),
  ],
};
