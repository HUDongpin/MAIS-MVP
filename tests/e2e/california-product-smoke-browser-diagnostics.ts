export type FailedBrowserRequestSnapshot = {
  failureText: string | null;
  isNavigationRequest: boolean;
  method: string;
  pageUrl: string;
  requestHeaders: Readonly<Record<string, string>>;
  requestUrl: string;
  resourceType: string;
  responseContentType: string | null;
  responseStatus: number | null;
  studentLessonHref: string | null;
  visualizationDirectoryHref: string | null;
};

export type BrowserConsoleMessageSnapshot = {
  locationUrl: string;
  messageType: string;
  pageUrl: string;
  reactThreeFiberVersion: string | null;
  text: string;
  threeVersion: string | null;
};

const EXPECTED_REACT_THREE_FIBER_CLOCK_WARNING =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";
const PINNED_REACT_THREE_FIBER_VERSION = "9.6.1";
const PINNED_THREE_VERSION = "0.184.0";
const NEXT_RUNTIME_CHUNK_PATH = /^\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js$/;

function normalizedHeaders(headers: Readonly<Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
}

export function isExpectedPinnedReactThreeFiberClockDeprecation(
  snapshot: BrowserConsoleMessageSnapshot
) {
  if (
    snapshot.messageType !== "warning" ||
    snapshot.text !== EXPECTED_REACT_THREE_FIBER_CLOCK_WARNING ||
    snapshot.reactThreeFiberVersion !== PINNED_REACT_THREE_FIBER_VERSION ||
    snapshot.threeVersion !== PINNED_THREE_VERSION
  ) {
    return false;
  }

  let pageUrl: URL;
  let locationUrl: URL;
  try {
    pageUrl = new URL(snapshot.pageUrl);
    locationUrl = new URL(snapshot.locationUrl);
  } catch {
    return false;
  }

  return Boolean(
    pageUrl.origin === locationUrl.origin &&
    NEXT_RUNTIME_CHUNK_PATH.test(locationUrl.pathname)
  );
}

export function isExpectedCanceledCaliforniaProductRscPrefetch(
  snapshot: FailedBrowserRequestSnapshot
) {
  if (
    snapshot.failureText !== "net::ERR_ABORTED" ||
    snapshot.isNavigationRequest ||
    snapshot.method !== "GET" ||
    snapshot.resourceType !== "fetch" ||
    snapshot.responseStatus !== 200 ||
    snapshot.responseContentType?.split(";", 1)[0]?.trim().toLowerCase() !== "text/x-component"
  ) {
    return false;
  }

  let pageUrl: URL;
  let requestUrl: URL;
  try {
    pageUrl = new URL(snapshot.pageUrl);
    requestUrl = new URL(snapshot.requestUrl);
  } catch {
    return false;
  }

  const activeLabId = pageUrl.searchParams.get("lab");
  const expectedLessonPaths = new Set<string>();
  if (activeLabId) expectedLessonPaths.add(`/student/lessons/${encodeURIComponent(activeLabId)}`);
  if (snapshot.studentLessonHref) {
    try {
      const studentLessonUrl = new URL(snapshot.studentLessonHref, pageUrl);
      if (
        studentLessonUrl.origin === pageUrl.origin &&
        studentLessonUrl.pathname.startsWith("/student/lessons/us-ca-math-")
      ) {
        expectedLessonPaths.add(studentLessonUrl.pathname);
      }
    } catch {
      return false;
    }
  }
  let hasExactRenderedVisualizationDirectoryHref = false;
  if (snapshot.visualizationDirectoryHref) {
    try {
      const directoryUrl = new URL(snapshot.visualizationDirectoryHref, pageUrl);
      hasExactRenderedVisualizationDirectoryHref =
        directoryUrl.origin === pageUrl.origin &&
        directoryUrl.pathname === "/student/tools/visualizations" &&
        directoryUrl.search === "" &&
        directoryUrl.hash === "";
    } catch {
      return false;
    }
  }
  const headers = normalizedHeaders(snapshot.requestHeaders);
  const isCaliforniaVisualizationDirectoryPath =
    pageUrl.pathname === "/student/tools/visualizations";
  const isCaliforniaVisualizationDirectPath =
    /^\/student\/tools\/visualizations\/us-ca-math-[A-Za-z0-9-]+$/.test(pageUrl.pathname);
  const isExpectedLessonPrefetch = expectedLessonPaths.has(requestUrl.pathname);
  const isExpectedVisualizationDirectoryPrefetch =
    isCaliforniaVisualizationDirectPath &&
    hasExactRenderedVisualizationDirectoryHref &&
    requestUrl.pathname === "/student/tools/visualizations" &&
    requestUrl.searchParams.size === 1;

  return Boolean(
    pageUrl.origin === requestUrl.origin &&
    (isCaliforniaVisualizationDirectoryPath || isCaliforniaVisualizationDirectPath) &&
    (isExpectedLessonPrefetch || isExpectedVisualizationDirectoryPrefetch) &&
    requestUrl.searchParams.has("_rsc") &&
    headers.rsc === "1" &&
    headers["next-url"] === pageUrl.pathname &&
    headers["sec-fetch-dest"] === "empty" &&
    headers["sec-fetch-mode"] === "cors"
  );
}
