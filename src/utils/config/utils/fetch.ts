import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

const DEFAULT_TIMEOUT = 30 * 1000;

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );
}

/**
 * The replacement for the axios service.
 * It mimics the old service's behavior using obsidian.requestUrl.
 */
async function service(config: RequestUrlParam & { timeout?: number }) {
  const { timeout = DEFAULT_TIMEOUT, ...requestParams } = config;

  // Note: The original request interceptor for multipart/form-data is now implicitly
  // handled by `requestUrl` when the `body` is a `FormData` instance.

  try {
    const responsePromise = requestUrl(requestParams);

    // Race the request against a timeout promise
    const response = await Promise.race([
      responsePromise,
      timeoutPromise(timeout),
    ]) as RequestUrlResponse;

    // The original response interceptor did `res.data ? res.data : Promise.reject(res)`
    // This is equivalent to checking for a successful status and returning the JSON body.
    if (response.status >= 200 && response.status < 300) {
      // response.json is already a parsed object
      return response.json;
    } else {
      // If status is not OK, reject the promise with the response object for inspection.
      return Promise.reject(response);
    }
  } catch (error) {
    // This will catch network errors or the timeout
    console.error('MPEasy fetch error:', error);
    return Promise.reject(error);
  }
}

export default service;