type LoginRedirectUrlInput = {
  pathname: string;
  requestUrl: string | URL;
  search?: string;
};

export function buildLoginRedirectUrl({
  pathname,
  requestUrl,
  search = ""
}: LoginRedirectUrlInput) {
  const loginUrl = new URL(requestUrl.toString());
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return loginUrl;
}
