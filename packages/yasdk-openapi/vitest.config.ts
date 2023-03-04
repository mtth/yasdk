import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: '../../out/coverage/yasdk-openapi',
    },
  },
});
