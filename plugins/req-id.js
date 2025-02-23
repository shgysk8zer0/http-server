export const useRequestId = (req, context) => context.requestId = crypto.randomUUID();
export default useRequestId;
