import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/react-vite",
  async viteFinal(config) {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../src"),
        "@app": path.resolve(__dirname, "../src/app"),
        "@pages": path.resolve(__dirname, "../src/pages"),
        "@widgets": path.resolve(__dirname, "../src/widgets"),
        "@features": path.resolve(__dirname, "../src/features"),
        "@entities": path.resolve(__dirname, "../src/entities"),
        "@shared": path.resolve(__dirname, "../src/shared"),
      };
    }
    return config;
  },
};
export default config;