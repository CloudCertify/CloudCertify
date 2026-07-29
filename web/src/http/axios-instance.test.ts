import { afterEach, describe, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, apiClient, customInstance } from "./axios-instance";

const realAdapter = apiClient.defaults.adapter;

/** Answers every request locally, recording the config axios would have sent. */
function captureRequests(): InternalAxiosRequestConfig[] {
  const sent: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    sent.push(config);
    return {
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as AxiosResponse;
  };
  return sent;
}

afterEach(() => {
  apiClient.defaults.adapter = realAdapter;
});

describe("api axios instance", () => {
  it("sends generated calls to the configured base URL", async () => {
    const sent = captureRequests();

    await customInstance({ url: "/quiz", method: "GET" });

    expect(sent[0].baseURL).toBe(API_BASE_URL);
    expect(sent[0].url).toBe("/quiz");
  });

  it("resolves the full response, so callers keep reading res.data", async () => {
    captureRequests();

    const res = await customInstance<{ ok: boolean }>({
      url: "/quiz",
      method: "GET",
    });

    expect(res.data).toEqual({ ok: true });
  });

  it("lets per-call options override the request config", async () => {
    const sent = captureRequests();

    await customInstance({ url: "/quiz", method: "GET" }, { timeout: 1234 });

    expect(sent[0].timeout).toBe(1234);
  });
});
