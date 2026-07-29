/**
 * @deprecated Use engine/anomaly-detection.ts and config/detection-rules.ts
 */
export { ANOMALY_DETECTION_RULES as DEFAULT_DETECTION_RULES } from "@/lib/market-intelligence/config/detection-rules";
export {
  detectAnomalies,
  anomalyToMarketEvent,
} from "@/lib/market-intelligence/engine/anomaly-detection";
