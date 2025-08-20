"use client";
import axios, {AxiosRequestConfig} from "axios";
import { getCookie } from "cookies-next";

export const axiosInstance = axios.create({
  timeout: 30 * 60 * 1000,
});
axiosInstance.defaults.withCredentials = true;

axiosInstance.interceptors.request.use(function (config) {
  const token = getCookie("Authorization");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.withCredentials = true;
  return config;
});

interface FetchSSEOptions {
  method?: string;
  params?: Record<string, string>;
  body?: Record<string, any> | string;
  headers?: Record<string, string>;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  timeout?: number; // milliseconds
  onDone?: () => void;
  onPercentage?: (percentage: number) => void;
}

const controllers: Record<string, AbortController> = {};
const buffers: Record<string, any[]> = {};

export const http = {
  get: function get<Response = unknown>(url: string, config?: AxiosRequestConfig) {
    return axiosInstance.get<Response>(url, config).then((res) => res?.data);
  },
  GET: function get<Response = unknown>(url: string, config?: AxiosRequestConfig) {
    return axiosInstance.get<Response>(url, config);
  },
  post: function post<Request = unknown, Response = unknown>(
    url: string,
    data?: Request,
    config?: AxiosRequestConfig,
  ) {
    return axiosInstance.post<Response>(url, data, config).then((res) => res?.data);
  },
  POST: function post<Request = unknown, Response = unknown>(
      url: string,
      data?: Request,
      config?: AxiosRequestConfig,
  ) {
    return axiosInstance.post<Response>(url, data, config);
  },
  postFile: function postFile<Response = unknown>(
    url: string,
    fileData: FormData
  ) {
    return axiosInstance
      .post<Response>(url, fileData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res?.data);
  },
  del: function del<Response = unknown>(url: string) {
    return axiosInstance.delete<Response>(url).then((res) => res?.data);
  },
  put: function put<Request = unknown, Response = unknown>(
    url: string,
    data?: Request,
    config?: AxiosRequestConfig,
  ) {
    return axiosInstance.put<Response>(url, data, config).then((res) => res?.data);
  },
  patch: function patch<Request = unknown, Response = unknown>(
    url: string,
    data?: Request
  ) {
    return axiosInstance.patch<Response>(url, data).then((res) => res?.data);
  },
  fetchSSE: async (url: string, options: FetchSSEOptions): Promise<void> => {
    const {
      method = 'GET',
      params,
      body,
      headers = {},
      onMessage,
      onDone,
      onPercentage,
    } = options;
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      finalUrl = `${url}?${searchParams.toString()}`;
    }

    const reqKey = finalUrl;

    if (controllers[reqKey]) {
      controllers[reqKey].abort();
    }
    buffers[reqKey] = [];

    const token = await getCookie("Authorization");
    const defaultHeaders: HeadersInit = { 'Accept': 'text/event-stream' };
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;
    if (body && method !== 'GET' && !(body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    const finalHeaders = { ...defaultHeaders, ...headers };

    const controller = new AbortController();
    controllers[reqKey] = controller;

    const fetchOptions: RequestInit = {
      method,
      headers: finalHeaders,
      cache: 'no-store' as RequestCache,
      signal: controller.signal,
    };
    if (body && method !== 'GET') {
      fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(finalUrl, fetchOptions);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('Response body is not available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const chunkBuffer: Record<string, string[]> = {};

      const processEvent = (eventData: string) => {
        const lines = eventData.split('\n');
        let data = '', eventName = '', eventId = '';
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('id:')) eventId = line.slice(3).trim();
          else if (line.startsWith('data:')) {
            if (data.length > 0) data += '\n';
            data += line.slice(5);
          }
        }
        if (!data) return;

        let parsed: any;
        try { parsed = JSON.parse(data); }
        catch { parsed = data; }

        switch (eventName) {
          case 'chunk': {
            if (!eventId) return;
            const base = eventId.split('_part_')[0];
            chunkBuffer[base] = chunkBuffer[base] || [];
            chunkBuffer[base].push(data);
            break;
          }
          case 'chunk-end': {
            if (!eventId) return;
            const base = eventId.replace('_end', '');
            const full = (chunkBuffer[base] || []).join('');
            delete chunkBuffer[base];
            let finalData: any;
            try { finalData = JSON.parse(full); } catch { finalData = full; }
            buffers[reqKey].push(finalData);
            onMessage?.(finalData);
            break;
          }
          case 'percentage':
            if (onPercentage) onPercentage(Number(data));
            break;
          default: {
            buffers[reqKey].push(parsed);
            onMessage?.(parsed);
            break;
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) processEvent(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          processEvent(block);
        }
      }

      if (typeof onDone === 'function') onDone();

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Fetch SSE Error:', error);
      throw error;
    } finally {
      if (controllers[reqKey] === controller) {
        delete controllers[reqKey];
      }
    }
  }
};
