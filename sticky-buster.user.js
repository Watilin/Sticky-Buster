// ==UserScript==
// @name          Sticky Buster
// @namespace     fr.kergoz-panic.watilin
// @description   A Tool to help removing sticky or fixed elements.
// @version       1.0.0
//
// @author        Watilin
// @license       MIT license
// @copyright     (c) 2018 Matilin Torre
//
// @downloadURL   https://raw.githubusercontent.com/Watilin/Sticky-Buster/userscript/sticky-buster.user.js
// @updateURL     https://raw.githubusercontent.com/Watilin/Sticky-Buster/userscript/sticky-buster.meta.js
//
// @include       /^https?:\/\//
// @nocompat
//
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// ==/UserScript==

"use strict";

console.log("%cscript start", "color: magenta");

const VALUE_KEY = "json";

// A. Remove banners for already registered cases //////////////////////

let json;
try {
  json = JSON.parse(GM_getValue(VALUE_KEY, "{}"));
}
catch (err) {
  console.error("JSON error", err);
}

if (json) {
  /* data structure:
  {
     "example.com": [ "css selector", ... ]
  }
  */
  if (location.hostname in json) {
    for (let selector of json[location.hostname]) {
      document.querySelector(selector).style.position = "static";
    }
  }
}

console.log(json);

// B. Creates the tool for registering new cases ///////////////////////

let $overlay = document.createElement("div");
let $tooltip = document.createElement("span");
let isToolActive = false;

{
  let $style = document.createElement("style");
  let generateRandomString = () => Math.random().toString(36).substr(2);

  let overlayId = "overlay_" + generateRandomString();
  while (document.querySelector(`#${overlayId}`)) {
    overlayId += generateRandomString();
  }

  let tooltipId = "tooltip_" + generateRandomString();
  while (document.querySelector(`#${tooltipId}`)) {
    tooltipId += generateRandomString();
  }

  $style.textContent = `
    #${overlayId} {
      position: fixed;
      z-index: 999999999;
      outline: 4px solid rgba(255, 128, 0, 0.75);
      outline-offset: -2px;
      background: rgba(255, 128, 0, 0.15);
      pointer-events: none;
      display: none;
    }
    #${tooltipId} {
      position: absolute;
      z-index: 999999999;
      font: 0.8rem/1.2rem sans-serif;
      text-align: center;
      padding: 1px 2px;
      background: white;
      color: #333;
      border: solid thin #666;
      display: none;
    }
  `;

  $overlay.id = overlayId;
  $tooltip.id = tooltipId;

  document.head.append($style);
}
document.body.append($overlay);
document.body.append($tooltip);
$tooltip.textContent = "Select a sticky element… (right-click to abort)";

function getCSSSelector($element) {
  var selector = "";
  var checkUniqueness =
    (sel) => document.querySelectorAll(sel).length === 1;

  // 1. try id
  if ($element.id) {
    selector += `#${$element.id}`;
  }

  // 2. try className
  if (!selector || !checkUniqueness(selector)) {
    for (let className of $element.classList) {
      selector += `.${className}`;
    }
  }

  // 3. try tagName
  if (!selector || !checkUniqueness(selector)) {
    selector = `${$element.tagName.toLowerCase()}${selector}`;
  }

  // 4.a. try closest parent with an id
  // at this point, selector is guaranteed to be non empty
  // (at least a tagName)
  if (!checkUniqueness(selector)) {
    let $parent = $element.parentElement;
    while ($parent && !$parent.id) {
      $parent = $parent.parentElement;
    }
    if ($parent) {
      selector = `#${$parent.id} ${selector}`;
    }
    // 4.b. try closest parent with a className, refined by least number of matches
    else {
      let minMatches = Number.POSITIVE_INFINITY;
      let bestParentSelector = "";

      $parent = $element.parentElement;
      while ($parent) {
        let classSelector = "";
        for (let className of $parent.classList) {
          classSelector += `.${className}`;
        }

        if (classSelector) {
          let currentMatches = document.querySelectorAll(classSelector).length;
          if (currentMatches < minMatches) {
            minMatches = currentMatches;
            bestParentSelector = classSelector;
          }
        }

        $parent = $parent.parentElement;
      }

      if (bestParentSelector) {
        selector = `${bestParentSelector} ${selector}`;
      }
    }
  }

  // 5. too complex, give up
  if (!checkUniqueness(selector)) {
    selector = null;
  }

  return selector;
}

document.addEventListener("click", function (event) {
  if (isToolActive) {
    event.preventDefault();
    $tooltip.style.display = "none";

    let $element = event.target;
    let hasFoundSticky = false;
    while ($element && !hasFoundSticky) {
      let cStyle = getComputedStyle($element);
      if ("sticky" === cStyle.position ||
          "fixed" === cStyle.position) {
        hasFoundSticky = true;
      }
      else {
        $element = $element.parentElement;
      }
    }

    if (!$element) {
      alert("Counldn’t find any sticky element, please try elsewhere.");
    }
    else {
      console.log("TODO");
      console.log($element);

      let rect = $element.getBoundingClientRect();
      $overlay.style.display = "block";
      $overlay.style.top    = rect.top    + "px";
      $overlay.style.left   = rect.left   + "px";
      $overlay.style.width  = rect.width  + "px";
      $overlay.style.height = rect.height + "px";
      $element.insertAdjacentElement("afterend", $overlay);

      let selector = getCSSSelector($element);
      console.log("CSS selector:", selector);

      if (selector) {
        if (!json) {
          alert("Problem with stored data!");
        }
        else {
          if (!(location.hostname in json)) {
            json[location.hostname] = [];
          }
          let selectorsArray = json[location.hostname];
          if (selectorsArray.indexOf(selector) < 0) {
            selectorsArray.push(selector);
          }
          GM_setValue(VALUE_KEY, JSON.stringify(json));
          alert("The targeted element has been successfully registered.");
        }
      }

      $element.style.position = "static";
      $overlay.remove();
    }
    isToolActive = false;
  }
});

document.addEventListener("mousemove", function (event) {
  if (isToolActive) {
    if (!$tooltip.dataset.width) {
      $tooltip.dataset.width = $tooltip.getBoundingClientRect().width;
    }
    $tooltip.style.left = (event.clientX - Math.ceil($tooltip.dataset.width / 2)) + "px";
    $tooltip.style.top  = (event.clientY + 4) + "px";
  }
});

document.addEventListener("contextmenu", function (event) {
  if (isToolActive) {
    event.preventDefault();
    $tooltip.style.display = "none";
    isToolActive = false;
  }
});

if (GM_registerMenuCommand) {
  GM_registerMenuCommand("Fix sticky…", function () {
    if (!isToolActive) {
      isToolActive = true;
      $tooltip.style.display = "block";
    }
  }, "s");
}

console.log("%cscript end", "color: magenta");
