import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "st.monologue.app",
  appName: "Monologue",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
