// google.js - separate Google Ads conversions per event
// Put your GA/Ads base gtag snippet in <head> (recommended) on every page.

// --- CONFIG: set your full send_to strings here ---
var CONVERSIONS = {
  form:    "AW-17523822825/FORM_LABEL",      // replace FORM_LABEL
  phone:   "AW-17523822825/PHONE_LABEL",     // replace PHONE_LABEL
  whatsapp:"AW-17523822825/WHATSAPP_LABEL",  // replace WHATSAPP_LABEL
  email:   "AW-17523822825/EMAIL_LABEL",     // replace EMAIL_LABEL
  insta:   "AW-17523822825/INSTA_LABEL"      // replace INSTA_LABEL
};

// --- helper to fire conversion with safe fallback navigation ---
function fireConversion(send_to, eventLabel, navigateUrl) {
  // if gtag not available, fallback to direct navigation
  if (typeof gtag !== "function") {
    if (navigateUrl) window.location = navigateUrl;
    return;
  }

  var called = false;
  var callback = function() {
    if (called) return;
    called = true;
    if (typeof navigateUrl !== "undefined" && navigateUrl !== null) {
      window.location = navigateUrl;
    }
  };

  // ensure callback runs even if gtag doesn't call it in 1s
  var safeTimeout = setTimeout(callback, 1000);

  gtag("event", "conversion", {
    send_to: send_to,
    event_category: "engagement",
    event_label: eventLabel,
    event_callback: function() {
      clearTimeout(safeTimeout);
      callback();
    }
  });
}

// --- DOM ready listeners ---
document.addEventListener("DOMContentLoaded", function () {

  // 1) Lead form submit button (non-navigation form — modify as needed)
  var submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", function (e) {
      // If this actually submits a form and you want the form to submit:
      // - Prevent default, fire conversion and then submit in callback.
      // - If you want immediate submit (non-blocking), don't preventDefault.
      // Here we assume immediate tracking + allow normal submission:
      try { fireConversion(CONVERSIONS.form, "Lead Form Submit"); } catch (err) {}
      // allow form to continue
    });
  }

  // 2) Generic tracked links
  var trackedLinks = document.querySelectorAll(
    'a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="instagram.com"]'
  );

  trackedLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      var aria = link.getAttribute("aria-label") || "";
      var label = aria || href;

      // Determine conversion type by href
      if (/^tel:/i.test(href)) {
        // Phone link — allow click but fire conversion
        // Not preventing default because tel: opens phone app
        fireConversion(CONVERSIONS.phone, "Phone Click: " + label);
      } else if (/wa\.me|whatsapp\.com/i.test(href)) {
        fireConversion(CONVERSIONS.whatsapp, "WhatsApp Click: " + label, href);
        // we DO NOT prevent default so WhatsApp opens normally; callback will attempt navigation as well if needed
      } else if (/^mailto:/i.test(href)) {
        fireConversion(CONVERSIONS.email, "Email Click: " + label);
      } else if (/instagram\.com/i.test(href)) {
        // external nav to instagram - allow default but still fire conversion with navigation fallback
        fireConversion(CONVERSIONS.insta, "Instagram Click: " + label, href);
      } else {
        // fallback generic
        fireConversion(CONVERSIONS.form, "Other Link Click: " + label, href);
      }
      // do not call preventDefault() — we want default navigation/behavior to happen quickly for users
    }, {passive: true});
  });

  // 3) Extra: track phone link inside list items (if they are not anchor tags above)
  var phoneTextLinks = document.querySelectorAll('li a[href^="tel:"]');
  phoneTextLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      fireConversion(CONVERSIONS.phone, "Phone Click (list): " + (link.getAttribute("aria-label") || link.href));
    }, {passive: true});
  });

});
