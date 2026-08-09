import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudSun,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";

import type { PrecipitationType, SkyCondition } from "@/lib/types";

/**
 * 날씨 아이콘 매핑 (Task 034). 날씨 카드·시간대별·일자별 예보가 공유한다.
 * 색상 단독이 아닌 아이콘+텍스트 병기 원칙을 유지하기 위한 표준 글리프 집합.
 */
export const SKY_ICON: Record<SkyCondition, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
};

export const PTY_ICON: Record<PrecipitationType, LucideIcon> = {
  none: Sun,
  rain: CloudRain,
  shower: CloudRain,
  "rain-snow": CloudSnow,
  "drizzle-snow": CloudSnow,
  drizzle: CloudDrizzle,
  snow: Snowflake,
  "snow-flurry": Snowflake,
};

/** 강수형태가 있으면 강수 아이콘을, 없으면 하늘상태 아이콘을 대표로 고른다. */
export function weatherGlyph(sky: SkyCondition, pty: PrecipitationType): LucideIcon {
  return pty !== "none" ? PTY_ICON[pty] : SKY_ICON[sky];
}
