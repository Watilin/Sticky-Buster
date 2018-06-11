"use strict";

function logDetails(aValue) {
  var valueType = typeof aValue;
  switch (valueType) {

    case "string":
    case "number":
    case "boolean":
    case "undefined":
    case "symbol":
    case "function": {
      console.log(valueType, aValue);
      break;
    }

    case "object": {
      if (null === aValue) {
        console.log("null");
      }
      else if (aValue.constructor) {
        switch (aValue.constructor.name) {

          case "String":
          case "Number":
          case "Boolean":
          case "Function": {
            let unwrappedValue = aValue.valueOf();
            console.log(typeof unwrappedValue, unwrappedValue);
            break;
          }

          case "Promise": {
            console.log("promise (value/reason somewhere below…)");
            aValue
              .then ((x)     => { logDetails(x);     })
              .catch((error) => { logDetails(error); });
            break;
          }

          case "Error": {
            console.log(`error: ${aValue.message}, ${aValue.fileName}:${aValue.lineNumber}`);
            break;
          }

          case "Array": {
            console.log(`array (${aValue.length} items)`);
            if (aValue.length < 10) {
              for (let item of aValue) {
                console.log(item);
              }
            }
            else {
              console.log("too many items…");
            }
            break;
          }

          case "Object": {
            console.log("plain object");
            let entries = Object.entries(aValue);
            if (entries.length < 10) {
              for (let [ key, subValue ] of entries) {
                console.log(`${key}: ${subValue}`);
              }
            }
            else {
              console.log("too many entries…");
            }
            break;
          }

          default: {
            console.warn(`constructor ${aValue.constructor} not handled`);
            break;
          }

        }
      }
      break;
    }

    default: {
      console.warn(`type ${valueType} not handled`);
      break;
    }

  }
}
