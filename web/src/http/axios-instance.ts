import Axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Where the API lives. Defaults to production so a plain `pnpm dev` (or a
 * preview build) needs no setup; point `VITE_API_URL` at `http://localhost:8080`
 * in `web/.env.local` to run the app against a local API. See `.env.example`.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'https://api-cloudcertify.snowye.dev';

/**
 * The single axios instance every generated endpoint goes through (orval
 * mutator, see orval.config.ts). Owning the instance is what makes the base
 * URL swappable — the generated client no longer hardcodes it — and it keeps
 * our interceptors (Authorization, Accept-Language) off the global axios
 * default, so they cannot leak into unrelated third-party axios usage.
 */
export const apiClient = Axios.create({ baseURL: API_BASE_URL });

/**
 * orval mutator. Resolves to the full `AxiosResponse` on purpose: callers read
 * `res.data`, and the react-query hooks stay typed the way the app already
 * uses them.
 *
 * @example const res = await postQuizQuizIdStart(1, { email }); res.data.submissionId;
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => apiClient({ ...config, ...options });

/** Error type the generated react-query hooks surface. */
export type ErrorType<Error> = AxiosError<Error>;

/** Request body type the generated client passes to the mutator. */
export type BodyType<BodyData> = BodyData;
