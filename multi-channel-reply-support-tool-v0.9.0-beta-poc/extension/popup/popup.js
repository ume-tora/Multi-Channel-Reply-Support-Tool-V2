const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/SettingsForm.js","assets/react-vendor.js","assets/shared-core.js","assets/shared-errors.js"])))=>i.map(i=>d[i]);
import { r as reactExports, j as jsxRuntimeExports, c as clientExports } from "../assets/react-vendor.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p$1) => Promise.resolve(p$1).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const SettingsForm = reactExports.lazy(() => __vitePreload(() => import("../assets/SettingsForm.js"), true ? __vite__mapDeps([0,1,2,3]) : void 0).then((module) => ({ default: module.SettingsForm })));
const Popup = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    width: "384px",
    minHeight: "fit-content",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      background: "linear-gradient(to right, #4F46E5, #7C3AED)",
      color: "white",
      padding: "16px 24px"
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "24px" }, children: "🤖" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: "18px", fontWeight: "600", margin: "0" }, children: "Multi Channel Reply" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#C7D2FE", fontSize: "14px", margin: "4px 0 0 0" }, children: "AI-Powered Reply Assistant" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      padding: "16px 24px 0 24px",
      flex: "1",
      minHeight: "fit-content"
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        animation: "spin 1s linear infinite",
        borderRadius: "50%",
        height: "24px",
        width: "24px",
        borderBottom: "2px solid #4F46E5"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: "8px", color: "#6B7280" }, children: "設定を読み込み中..." })
    ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsForm, {}) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      borderTop: "1px solid #E5E7EB",
      backgroundColor: "#F9FAFB",
      padding: "12px 24px",
      textAlign: "center",
      marginTop: "12px",
      flexShrink: 0
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: {
      fontSize: "12px",
      color: "#6B7280",
      margin: "0"
    }, children: "Version 0.1.0 | Made with ❤️ for productivity" }) })
  ] });
};
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}
const root = clientExports.createRoot(container);
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(Popup, {}));
