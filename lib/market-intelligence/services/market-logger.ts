export const marketLogger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[market-intelligence] ${message}`, meta ?? "");
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[market-intelligence] ${message}`, meta ?? "");
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[market-intelligence] ${message}`, meta ?? "");
  },
};
