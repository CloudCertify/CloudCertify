import { defineConfig } from 'orval';

export default defineConfig({
  client: {
    input: './openapi.json',
    output: {
      mode: 'split',
      target: './src/http/generated/api.ts',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      // No baseUrl here on purpose: the base URL belongs to the custom axios
      // instance, so `VITE_API_URL` can point the app at a local API without
      // regenerating the client.
      override: {
        mutator: {
          path: './src/http/axios-instance.ts',
          name: 'customInstance'
        }
      }
    }
  }
});
