function buildMalAuthorizationUrl_() {
  const state = Utilities.getUuid();
  const verifier = generateCodeVerifier_();
  CacheService.getScriptCache().put("mal_oauth:" + state, verifier, 600);
  return { authorizeUrl: CONFIG.MAL_AUTH_BASE + "/authorize?response_type=code" +
    "&client_id=" + encodeURIComponent(getRequiredSetting_("MAL_CLIENT_ID")) +
    "&redirect_uri=" + encodeURIComponent(getRequiredSetting_("MAL_REDIRECT_URI")) +
    "&state=" + encodeURIComponent(state) + "&code_challenge=" + encodeURIComponent(verifier) + "&code_challenge_method=plain" };
}

function completeMalAuthorization_(code, state) {
  if (!state || !/^[a-zA-Z0-9-]{20,80}$/.test(state)) throw new Error("Authorization state is missing or invalid. Start the connection again.");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Authorization is busy. Please try again.");
  try {
    const cache = CacheService.getScriptCache();
    const verifier = cache.get("mal_oauth:" + state);
    if (!verifier) throw new Error("Authorization link expired or was already used. Start the connection again.");
    exchangeAuthorizationCode_(code, verifier);
    cache.remove("mal_oauth:" + state);
  } finally { lock.releaseLock(); }
}

function exchangeAuthorizationCode_(code, codeVerifier) {
  const token = requestMalToken_({ grant_type: "authorization_code", code: code, code_verifier: codeVerifier,
    redirect_uri: getRequiredSetting_("MAL_REDIRECT_URI") });
  saveMalTokens_(token);
  // An account change must not reuse another account's cached library.
  PropertiesService.getScriptProperties().setProperty("MAL_CACHE_GENERATION", Utilities.getUuid());
}

function requestMalToken_(payload) {
  payload.client_id = getRequiredSetting_("MAL_CLIENT_ID");
  payload.client_secret = getRequiredSetting_("MAL_CLIENT_SECRET");
  const response = UrlFetchApp.fetch(CONFIG.MAL_AUTH_BASE + "/token", { method: "post", muteHttpExceptions: true, payload: payload });
  if (response.getResponseCode() !== 200) {
    // Never log tokens, client secrets, or a raw OAuth response.
    throw new Error("MyAnimeList authorization could not be renewed (" + response.getResponseCode() + "). Reconnect your account.");
  }
  let token;
  try { token = JSON.parse(response.getContentText()); }
  catch (error) { throw new Error("MyAnimeList returned an unreadable authorization response. Please try again."); }
  if (!token.access_token) throw new Error("MyAnimeList returned an incomplete authorization response. Reconnect your account.");
  return token;
}

function saveMalTokens_(token) {
  const properties = PropertiesService.getScriptProperties();
  const values = { MAL_ACCESS_TOKEN: token.access_token,
    MAL_TOKEN_EXPIRES_AT: String(Date.now() + Math.max(0, Number(token.expires_in) || 0) * 1000) };
  if (token.refresh_token) values.MAL_REFRESH_TOKEN = token.refresh_token;
  // false is essential: true deletes the client configuration and calendar ID.
  properties.setProperties(values, false);
}

function getValidMalAccessToken_() {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty("MAL_ACCESS_TOKEN");
  const expires = Number(properties.getProperty("MAL_TOKEN_EXPIRES_AT"));
  if (token && (!expires || expires > Date.now() + 60000)) return token;
  return refreshMalAccessToken_(token);
}

function refreshMalAccessToken_(rejectedToken) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Account connection is busy. Please try again shortly.");
  try {
    const properties = PropertiesService.getScriptProperties();
    const current = properties.getProperty("MAL_ACCESS_TOKEN");
    // Another request may have already replaced the expired token.
    if (current && current !== rejectedToken) return current;
    const refreshToken = properties.getProperty("MAL_REFRESH_TOKEN");
    if (!refreshToken) throw new Error("MyAnimeList authorization has expired. Reconnect your account.");
    const response = requestMalToken_({ grant_type: "refresh_token", refresh_token: refreshToken });
    saveMalTokens_(response);
    return response.access_token;
  } finally { lock.releaseLock(); }
}

function fetchMalJson_(url) {
  // A server-provided paging URL must never send the bearer token to another host.
  if (String(url).indexOf(CONFIG.MAL_API_BASE + "/") !== 0) throw new Error("Unexpected MyAnimeList paging URL.");
  let token = getValidMalAccessToken_();
  function send() { return UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true, headers: { Authorization: "Bearer " + token } }); }
  let response = send();
  if (response.getResponseCode() === 401) { token = refreshMalAccessToken_(token); response = send(); }
  if (response.getResponseCode() === 401) throw new Error("MyAnimeList authorization has expired. Reconnect your account.");
  if (response.getResponseCode() !== 200) throw new Error("MyAnimeList request failed (" + response.getResponseCode() + "). Please try again later.");
  return JSON.parse(response.getContentText());
}

function generateCodeVerifier_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""); }

/** Run from the editor to check/renew the saved connection without calendar writes. */
function checkMalConnection() {
  const result = fetchMalJson_(CONFIG.MAL_API_BASE + "/users/@me/animelist?limit=1&fields=list_status");
  if (!Array.isArray(result.data)) throw new Error("Unexpected MAL response.");
  console.log("MyAnimeList connection is working. No calendar events were changed.");
}
