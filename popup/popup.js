"use strict";

let $buttonPick  = document.querySelector("#button-pick");
let $buttonClear = document.querySelector("#button-clear");
//let $buttonTest  = document.querySelector("#button-test");

async function sendAction(aAction) {
  var tabs = await browser.tabs
    .query({ active: true, currentWindow: true });

  var response = await browser.tabs
    .sendMessage(tabs[0].id, { action: aAction });

  console.log("popup received response:", response);
  if (response.action && ACTION_CLOSE_POPUP === response.action) {
    window.close();
  }
}

$buttonPick.addEventListener("click", () => {
  sendAction(ACTION_PICK);
});

$buttonClear.addEventListener("click", () => {
  sendAction(ACTION_CLEAR_DATA);
});

//$buttonTest.addEventListener("click", () => {
//  // ... nothing to test for now :)
//});
