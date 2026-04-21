import { useEffect } from "react";
import { useCookieConsent } from "@/context/CookieContext";

const PIXEL_ID = "899809176222944";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

function loadPixel() {
  if (window.fbq) return;

  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
}

export default function MetaPixel() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent === "all") loadPixel();
  }, [consent]);

  return null;
}
