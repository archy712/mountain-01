"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 카카오맵 SDK 통합 컴포넌트 (Task 028, Phase 5).
 *
 * - SDK 지연 로딩: `autoload=false` 스크립트를 **런타임에 1회만** 주입하고
 *   `kakao.maps.load` 콜백 이후에 지도를 생성한다(중복 로드 방지 모듈 스코프 캐시).
 * - 생명주기: `useEffect` 로 지도·마커를 만들고 언마운트 시 마커를 정리(`setMap(null)`)한다.
 * - **폴백(결정 001 접근성·복원력)**: 앱 키 미설정(`appKey` 없음) 또는 스크립트 로드 실패
 *   시 정적 좌표 텍스트 + 카카오맵 외부 링크를 노출해, 지도가 없어도 위치를 확인·이동할 수
 *   있게 한다. 지도 로드가 LCP 를 저해하지 않도록 셸(부모)이 먼저 렌더된 뒤 클라이언트에서
 *   비동기로 붙는다.
 *
 * 앱 키는 서버 컴포넌트가 `publicEnv.kakaoMapKey`(NEXT_PUBLIC)로 읽어 prop 으로 주입한다.
 * 등산로 폴리라인 오버레이는 Task 029 에서 이 컴포넌트를 확장해 얹는다.
 */

// 모듈 스코프 SDK 로더 캐시 — 여러 KakaoMap 인스턴스가 스크립트를 한 번만 로드하도록 공유한다.
let sdkPromise: Promise<void> | null = null;

function loadKakaoSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  // 이미 로드됨(캐시된 스크립트/다른 인스턴스가 로드 완료)
  if (window.kakao?.maps) {
    return Promise.resolve();
  }
  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    // autoload=false → 로드 후 kakao.maps.load 콜백에서만 객체 접근 안전
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => {
      // 스크립트 태그는 붙었지만 SDK 초기화가 실패할 수도 있어 방어적으로 확인한다.
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => resolve());
      } else {
        sdkPromise = null;
        reject(new Error("Kakao Maps SDK 초기화 실패"));
      }
    };
    script.onerror = () => {
      // 재시도 가능하도록 캐시를 비운다(다음 마운트에서 다시 로드 시도).
      sdkPromise = null;
      reject(new Error("Kakao Maps SDK 로드 실패"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type LoadStatus = "loading" | "ready" | "error";

/**
 * 지도가 준비된 뒤 자식(오버레이)에게 제공되는 핸들. 카카오맵은 명령형 API 라
 * 자식 오버레이(`TrailOverlay` 등)가 이 핸들로 지도 인스턴스에 폴리라인을 그린다.
 */
export interface KakaoMapHandle {
  kakao: typeof kakao;
  map: kakao.maps.Map;
}

const KakaoMapContext = createContext<KakaoMapHandle | null>(null);

/** 자식 오버레이에서 지도 핸들을 구독한다. 지도 준비 전에는 null. */
export function useKakaoMapHandle(): KakaoMapHandle | null {
  return useContext(KakaoMapContext);
}

export interface KakaoMapProps {
  /** 산 위도(WGS84) */
  lat: number;
  /** 산 경도(WGS84) */
  lng: number;
  /** 산 이름 — 접근성 라벨·폴백 외부 링크 텍스트에 사용 */
  name: string;
  /** 확대 레벨(작을수록 확대, 기본 6) */
  level?: number;
  /** NEXT_PUBLIC_KAKAO_MAP_KEY. 미설정이면 폴백을 렌더한다. */
  appKey?: string;
  /** 높이 등 박스 크기를 지정하는 클래스(예: "h-[220px]", "min-h-[70dvh]") */
  className?: string;
  /** 지도 준비 후 렌더할 오버레이(예: `<TrailOverlay />`). 컨텍스트로 지도 핸들을 받는다. */
  children?: ReactNode;
}

export function KakaoMap({
  lat,
  lng,
  name,
  level = 6,
  appKey,
  className,
  children,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [handle, setHandle] = useState<KakaoMapHandle | null>(null);

  useEffect(() => {
    if (!appKey) return;
    let cancelled = false;
    let marker: kakao.maps.Marker | null = null;

    // 초기 상태가 "loading" 이라 별도 동기 리셋 없이 로드를 시작한다(각 산은 별도
    // 라우트 → 네비게이션 시 컴포넌트가 리마운트되어 상태도 초기화된다).
    loadKakaoSdk(appKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          const { kakao } = window;
          const center = new kakao.maps.LatLng(lat, lng);
          const map = new kakao.maps.Map(containerRef.current, { center, level });
          marker = new kakao.maps.Marker({ position: center, map, title: name });
          setStatus("ready");
          setHandle({ kakao, map }); // 자식 오버레이에 지도 핸들 공개
        } catch {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (marker) marker.setMap(null);
      setHandle(null); // 언마운트/재실행 시 오버레이가 옛 지도에 그리지 않도록 정리
    };
  }, [appKey, lat, lng, level, name]);

  // 앱 키 미설정 또는 로드/초기화 실패 → 정적 좌표 + 외부 지도 링크 폴백
  if (!appKey || status === "error") {
    const href = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <MapPin className="size-6" aria-hidden="true" />
        <p>지도를 표시할 수 없어요.</p>
        <p className="text-xs">
          위치: 위도 {lat.toFixed(4)}, 경도 {lng.toFixed(4)}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          카카오맵에서 열기
        </a>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        role="application"
        aria-label={`${name} 지도`}
        className="absolute inset-0"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
          지도를 불러오는 중…
        </div>
      )}
      {handle && <KakaoMapContext.Provider value={handle}>{children}</KakaoMapContext.Provider>}
    </div>
  );
}
