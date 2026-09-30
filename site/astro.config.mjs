import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://aarsla.github.io/comfyui-tutorials/
export default defineConfig({
  site: 'https://aarsla.github.io',
  base: '/comfyui-tutorials',
  trailingSlash: 'always',
});
