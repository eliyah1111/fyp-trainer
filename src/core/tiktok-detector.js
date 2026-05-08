export async function detectLoginState(page) {
  const cookies = await page.context().cookies("https://www.tiktok.com/").catch(() => []);
  const cookieNames = cookies.map((cookie) => cookie.name);
  const hasSessionCookie = cookieNames.some((name) =>
    /^(sessionid|sid_guard|uid_tt|sid_tt|passport_csrf_token)$/i.test(name)
  );

  const domSignals = await page
    .evaluate(() => {
      const text = document.body?.innerText || "";
      const visibleButtons = [...document.querySelectorAll("button, a")]
        .map((element) => element.textContent?.trim())
        .filter(Boolean)
        .slice(0, 80);
      return {
        url: location.href,
        title: document.title,
        hasProfileControl: Boolean(
          document.querySelector('[data-e2e*="profile"], [data-e2e="nav-profile"], a[href="/upload"]')
        ),
        hasLoginText: /\b(Log in|Sign up|Continue with|Use phone|email|username)\b/i.test(text),
        visibleButtons
      };
    })
    .catch((error) => ({
      url: page.url(),
      title: "",
      hasProfileControl: false,
      hasLoginText: false,
      visibleButtons: [],
      error: error.message
    }));

  const loginRoute = /\/login|\/signup/i.test(domSignals.url || page.url());
  const loggedIn = hasSessionCookie && !loginRoute;
  const confidence = loggedIn ? (domSignals.hasProfileControl ? "high" : "medium") : "medium";

  return {
    loggedIn,
    confidence,
    requiresManualLogin: !loggedIn,
    signals: {
      hasSessionCookie,
      loginRoute,
      hasProfileControl: domSignals.hasProfileControl,
      hasLoginText: domSignals.hasLoginText,
      url: domSignals.url || page.url(),
      title: domSignals.title,
      cookieSignals: cookieNames.filter((name) => /session|sid|uid|csrf/i.test(name))
    }
  };
}

export function summarizeLoginState(state) {
  if (state.loggedIn) {
    return `Logged in (${state.confidence} confidence).`;
  }
  return "Manual login required before a live training session can run.";
}
