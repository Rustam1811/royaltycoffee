import { Plugin } from 'vite';

export function apiRoutesPlugin(): Plugin {
  return {
    name: 'api-routes-disabled',
    // No-op: we rely on Vite devServer proxy now
  } as Plugin;
}
