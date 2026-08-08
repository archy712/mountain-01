/**
 * 카카오맵 JS SDK(v3) 최소 타입 선언 (Task 028).
 *
 * SDK 는 `//dapi.kakao.com/v2/maps/sdk.js?appkey=…&autoload=false` 스크립트를 통해
 * 런타임에 `window.kakao` 전역으로 주입된다(npm 패키지가 아님). 여기서는 이 프로젝트가
 * 실제로 사용하는 API 표면(지도 생성·마커·비동기 로더)만 선언해 `any` 없이 타입 안전하게
 * 다룬다. 폴리라인 등 Task 029 에서 쓰는 타입은 그 시점에 확장한다.
 */
declare global {
  namespace kakao.maps {
    /** 위경도 좌표 */
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    interface MapOptions {
      /** 지도 중심 좌표 */
      center: LatLng;
      /** 확대 레벨(작을수록 확대) */
      level?: number;
    }

    /** 지도 인스턴스 */
    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      /** 컨테이너 크기 변경 후 재배치 */
      relayout(): void;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
    }

    /** 마커 오버레이 */
    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
    }

    interface PolylineOptions {
      /** 선을 구성하는 좌표 배열 */
      path: LatLng[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      /** solid | shortdash | dot 등 */
      strokeStyle?: string;
      /** 겹친 폴리라인의 그리기 순서(클수록 위) */
      zIndex?: number;
    }

    /** 폴리라인 오버레이 (등산로 경로, Task 029) */
    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
      /** 선 스타일을 동적으로 갱신(재생성 없이 색/두께/투명도 변경) */
      setOptions(options: Partial<PolylineOptions>): void;
      /** 겹친 폴리라인의 그리기 순서 설정(선택 강조 시 위로 올림) */
      setZIndex(zIndex: number): void;
      getPath(): LatLng[];
    }

    interface CustomOverlayOptions {
      position: LatLng;
      /** 오버레이 내용(HTML 문자열 또는 DOM 엘리먼트) */
      content: string | HTMLElement;
      map?: Map;
      /** 가로 기준 위치(0~1, 기본 0.5) */
      xAnchor?: number;
      /** 세로 기준 위치(0~1) */
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    }

    /** 커스텀 오버레이 (선택된 탐방로 이름 라벨 등) */
    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLng): void;
    }

    /** 지도/오버레이 이벤트 콜백에 전달되는 마우스 이벤트 */
    interface MouseEvent {
      latLng: LatLng;
    }

    namespace event {
      function addListener(
        target: object,
        type: string,
        handler: (mouseEvent: MouseEvent) => void,
      ): void;
      function removeListener(
        target: object,
        type: string,
        handler: (mouseEvent: MouseEvent) => void,
      ): void;
    }

    /**
     * `autoload=false` 로 스크립트를 비동기 로드했을 때, SDK 로드 완료 후
     * 콜백을 실행한다. 이 콜백 안에서만 `kakao.maps.*` 객체 접근이 안전하다.
     */
    function load(callback: () => void): void;
  }

  interface Window {
    kakao: typeof kakao;
  }
}

export {};
