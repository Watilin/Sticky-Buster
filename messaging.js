"use strict";

// These constants are used by both popup and content scripts for messaging.
// We do not use Symbol because symbols cannot be serialized into messages.

const ACTION_PICK        = "ACTION_PICK";
const ACTION_CLOSE_POPUP = "ACTION_CLOSE_POPUP";
const ACTION_CLEAR_DATA  = "ACTION_CLEAR_DATA";
const ACTION_TEST        = "ACTION_TEST";
