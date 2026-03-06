import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "mnt5ov",
  e2e: {
    supportFile: false,
    allowCypressEnv: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:8081',
  },
});
