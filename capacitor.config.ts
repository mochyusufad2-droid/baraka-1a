// Capacitor Android configuration for BARAKA ADVENTURE
const config = {
  appId: 'com.baraka.adventure',
  appName: 'BARAKA ADVENTURE',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    Geolocation: {
      // Configuration for high accuracy and background battery optimization
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000,
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0b192c',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
