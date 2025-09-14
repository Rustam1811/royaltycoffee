// src/config/api.ts
const join = (...parts: string[]) =>
  parts
    .map((p, i) => (i === 0 ? p.replace(/\/+$/,'') : p.replace(/^\/+|\/+$/g,'')))
    .filter(Boolean)
    .join('/');

export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export const apiUrl = (path: string, qs?: QueryParams) => {
  const abs = /^https?:\/\//i.test(API_BASE);
  let url: string;
  
  if (abs) {
    // Absolute URL like http://localhost:3001
    url = join(API_BASE, path);
  } else {
    // Relative URL like /api
    url = '/' + join(API_BASE.replace(/^\/+/, ''), path);
  }
  
  if (!qs) return url;
  const usp = new URLSearchParams();
  Object.entries(qs).forEach(([k, v]) => {
    if (v !== undefined && v !== null) usp.append(k, String(v));
  });
  return usp.toString() ? `${url}?${usp.toString()}` : url;
};
