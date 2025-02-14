export const useRequestId = (req, context) => context.requestId = crypto.randomUUID();
