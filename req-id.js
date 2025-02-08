export const useRequestId = req => req.headers.set('X-Request-ID', crypto.randomUUID());
