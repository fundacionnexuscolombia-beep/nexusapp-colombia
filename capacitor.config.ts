import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fundacionnexus.app',
  appName: 'NexusApp',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0d121b",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#7f13ec",
    },
  },
  android: {
    // Helps Android 15 edge-to-edge to avoid overlapping web content over the navigation bar
    // @ts-ignore
    adjustMarginsForEdgeToEdge: 'auto'
  }
};

export default config;
