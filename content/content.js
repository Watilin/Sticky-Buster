"use strict";

const HIGHLIGHT_THROTTLE_DELAY    = 80; // ms
const MOVE_TOOLTIP_THROTTLE_DELAY = 25; // ms

const TOOLTIP_OFFSET_X = -32; // px
const TOOLTIP_OFFSET_Y = +18; // px

let timers = {
  highlight: NaN,
  moveTooltip: NaN,
};

// picker //////////////////////////////////////////////////////////////

let picker = {
  $overlay: null,
  $tooltip: null,
  isActive: false,

  tooltipDimensions: { width: NaN, height: NaN },

  activate: function () {
    if (picker.isActive) return;

    if (!picker.$overlay) {
      picker.$overlay = document.createElement("div");
      picker.$overlay.id = "sticky-buster-overlay";

      picker.$tooltip = document.createElement("span");
      picker.$tooltip.append("Select a sticky element… (right-click or ESC to abort)");
      picker.$tooltip.id = "sticky-buster-tooltip";
    }

    document.documentElement.append(picker.$overlay, picker.$tooltip);
    picker.isActive = true;
  },

  deactivate: function () {
    if (!picker.isActive) return;

    picker.$overlay.remove();
    picker.$tooltip.remove();

    picker.isActive = false;
  },

  moveTooltip: function (event) {
    if (!picker.isActive) return;

    if (!picker.tooltipDimensions.width) {
      let rect = picker.$tooltip.getBoundingClientRect();
      picker.tooltipDimensions.width = rect.width;
      picker.tooltipDimensions.height = rect.height;
    }

    // no need to take scrolling into account because position: fixed
    picker.$tooltip.style.left = Math.max(0, Math.min(
      event.clientX + TOOLTIP_OFFSET_X,
      window.innerWidth - picker.tooltipDimensions.width
    )) + "px";
    picker.$tooltip.style.top = Math.max(0, Math.min(
      event.clientY + TOOLTIP_OFFSET_Y,
      window.innerHeight - picker.tooltipDimensions.height
    )) + "px";
  },

  highlightOnHover: function (event) {
    if (!picker.isActive) return;

    var $sticky = lookupStickyParent(event.target);
    if ($sticky) {
      let rect = $sticky.getBoundingClientRect();
      picker.$overlay.style.top    = rect.top    + "px";
      picker.$overlay.style.left   = rect.left   + "px";
      picker.$overlay.style.width  = rect.width  + "px";
      picker.$overlay.style.height = rect.height + "px";
      picker.$overlay.style.display = "block";
    }
    else {
      picker.$overlay.style.display = "none";
    }
  },
};

// events //////////////////////////////////////////////////////////////

document.addEventListener("mousemove", function (event) {
  clearTimeout(timers.highlight);
  timers.highlight = setTimeout(() => {
    picker.highlightOnHover(event);
  }, HIGHLIGHT_THROTTLE_DELAY);

  clearTimeout(timers.moveTooltip);
  timers.moveTooltip = setTimeout(() => {
    picker.moveTooltip(event);
  }, MOVE_TOOLTIP_THROTTLE_DELAY);
});

document.addEventListener("click", function (event) {
  // delays for some time to ensure it wasn’t a right click
  // TODO find a better way
  // TODO (maybe?) handle Command+Click on Mac
  // TODO (maybe??) touch events
  setTimeout(async () => {
    if (picker.isActive) {
      let $sticky = lookupStickyParent(event.target);
      if (!$sticky) {
        alert("No sticky element found, please retry.");
      }
      else {
        let selector = getCSSSelector($sticky);
        if (!selector) {
          alert("Couldn’t determine a CSS selector (TODO)");
        }
        else {
          let sync = browser.storage.sync;

          let data = await sync.get(location.hostname);
          if (!(location.hostname in data)) {
            data[location.hostname] = [];
          }
          let selectorsArray = data[location.hostname];
          if (selectorsArray.indexOf(selector) < 0) {
            selectorsArray.push(selector);
          }
          else {
            console.log("selector already registered-- this should not happen.");
          }

          try {
            await sync.set(data);
            $sticky.style.position = "static";
            alert("The targeted element has been successfully registered.");
          }
          catch (error) {
            console.error(error);
            alert("Couldn’t use storage to register the element.\n" +
              "Details in the console");
          }
        }
      }
      picker.deactivate();
    }
  }, 100);
});

document.addEventListener("contextmenu", function (event) {
  if (picker.isActive) {
    event.preventDefault();
    picker.deactivate();
  }
});

document.addEventListener("keyup", function (event) {
  if (picker.isActive && "Escape" === event.key) {
    event.preventDefault();
    picker.deactivate();
  }
});

document.addEventListener("blur", function (event) {
  picker.deactivate();
});

// helper functions ////////////////////////////////////////////////////

function isSticky($element) {
  var cStyle = getComputedStyle($element);
  if ("sticky" === cStyle.position || "fixed" === cStyle.position) {
    return true;
  }
  return false;
}

function lookupStickyParent($element) {
  while ($element && !isSticky($element)) {
    $element = $element.parentElement;
  }
  return $element; // may be null
}

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

// storage management //////////////////////////////////////////////////

function clearData() {
  browser.storage.sync.clear()
    .catch((error) => {
      console.error(error);
      alert("Stored data could not be cleared.\nDetails in the console.");
    });
}

// removing already registered stickies ////////////////////////////////

// this will run on DOMContentLoaded
// or upon installing/updating the extension
(async function () {
  let sync = browser.storage.sync;

  let data = await sync.get(location.hostname);
  if (location.hostname in data) {
    for (let selector of data[location.hostname]) {
      console.log(`${location.hostname}: ${selector}`);

      let $element = document.querySelector(selector);
      if (!$element) {
        console.warn(`element ${selector} not found`);
      }
      else {
        $element.style.position = "static";
      }
    }
  }
}());

// messaging ///////////////////////////////////////////////////////////

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // needs to stringify because console fails to log cross-context objects
  console.log("content script received message:", JSON.stringify(message));

  if (!("action" in message)) {
    console.warn("message contains no action");
  }
  else {
    switch (message.action) {

      case ACTION_PICK: {
        picker.activate();
        break;
      }

      case ACTION_CLEAR_DATA: {
        clearData();
        break;
      }

      default: {
        console.warn("Unknown action");
        break;
      }

    }
  }

  sendResponse({ action: ACTION_CLOSE_POPUP });
});
