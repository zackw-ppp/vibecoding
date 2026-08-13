import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mise.recipes',
  appName: 'Mise',
  webDir: 'dist',
  server: {
    iosScheme: 'mise',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
    },
  },
}

export default config
