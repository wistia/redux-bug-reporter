'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.listenToErrors = exports.errorData = undefined;

var _isClientRender = require('./is-client-render');

var _isClientRender2 = _interopRequireDefault(_isClientRender);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errorData = exports.errorData = {
  errors: [],
  addError: function addError(error) {
    this.errors.push(error);
  },
  clearErrors: function clearErrors() {
    this.errors = [];
  },
  getErrors: function getErrors() {
    return this.errors;
  }
};

var listenToErrors = exports.listenToErrors = function listenToErrors() {
  if ((0, _isClientRender2.default)()) {
    listenToConsoleError();
    listenToOnError();
  }
};
var listenToConsoleError = function listenToConsoleError() {
  var origError = window.console.error;
  if (!origError.bugReporterOverrideComplete) {
    window.console.error = function () {
      var metadata;
      var args = Array.prototype.slice.apply(arguments);
      if (args && args[0] && args[0].stack) {
        metadata = {
          errorMsg: args[0].name + ': ' + args[0].message,
          stackTrace: args[0].stack
        };
      } else {
        metadata = {
          errorMsg: args && args[0]
        };
      }
      errorData.addError(metadata);
      origError.apply(this, args);
    };
    window.console.error.bugReporterOverrideComplete = true;
  }
};

var listenToOnError = function listenToOnError() {
  var origWindowError = window.onerror;
  if (!origWindowError || !origWindowError.bugReporterOverrideComplete) {
    window.onerror = function (errorMsg, url, lineNumber, columnNumber, errorObj) {
      var metadata = {
        errorMsg: errorMsg,
        stackTrace: errorObj && errorObj.stack
      };
      errorData.addError(metadata);
      origWindowError && origWindowError.apply(window, arguments);
    };
    window.onerror.bugReporterOverrideComplete = true;
  }
};