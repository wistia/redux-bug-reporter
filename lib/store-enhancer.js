'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.middlewareData = exports.finishPlayback = exports.initializePlayback = exports.overloadStore = exports.playbackFlag = exports.overloadStoreActionType = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lodash = require('lodash.clonedeep');

var _lodash2 = _interopRequireDefault(_lodash);

var _isClientRender = require('./is-client-render');

var _isClientRender2 = _interopRequireDefault(_isClientRender);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var overloadStoreActionType = exports.overloadStoreActionType = 'REDUX_BUG_REPORTER_OVERLOAD_STORE';
var initializePlaybackActionType = 'REDUX_BUG_REPORTER_INITIALIZE_PLAYBACK';
var finishPlaybackActionType = 'REDUX_BUG_REPORTER_FINISH_PLAYBACK';

var playbackFlag = exports.playbackFlag = 'REDUX_BUG_REPORTER_PLAYBACK';

var overloadStore = exports.overloadStore = function overloadStore(payload) {
  return {
    type: overloadStoreActionType,
    payload: payload
  };
};

var initializePlayback = exports.initializePlayback = function initializePlayback() {
  return {
    type: initializePlaybackActionType
  };
};

var finishPlayback = exports.finishPlayback = function finishPlayback(payload) {
  return {
    type: finishPlaybackActionType
  };
};

var storeEnhancer = function storeEnhancer(createStore) {
  return function (originalReducer, initialState, enhancer) {
    var playbackEnabled = false;
    // Handle the overloading in the reducer here
    var reducer = function reducer(state) {
      var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (action.type === overloadStoreActionType) {
        console.warn('Overriding the store. You should only be doing this if you are using the bug reporter');
        return action.payload;
      } else if (action.type === initializePlaybackActionType) {
        // starting playback
        playbackEnabled = true;
        return state;
      } else if (action.type === finishPlaybackActionType) {
        // stopping playback
        playbackEnabled = false;
        return state;
      }

      // Log the action
      if ((0, _isClientRender2.default)() && !playbackEnabled) {
        var actions = middlewareData.getActions();
        // If this is the first action, log the initial state
        if (actions.length === 0) {
          middlewareData.setBugReporterInitialState(state);
        }

        // Potentially redact any sensitive data in the action payload
        if (action.meta && action.meta.redactFromBugReporter) {
          var redactedAction = (0, _lodash2.default)(action);
          var meta = redactedAction.meta;
          if (meta.redactFromBugReporterFn) {
            redactedAction = meta.redactFromBugReporterFn(redactedAction);

            // clean up the redaction flags
            delete redactedAction.meta.redactFromBugReporter;
            delete redactedAction.meta.redactFromBugReporterFn;
          } else {
            // if there's no redactFromBugReporterFn, remove everything except the event type
            redactedAction = { type: redactedAction.type };
          }
          middlewareData.addAction(redactedAction);
        } else {
          middlewareData.addAction(action);
        }
      }

      // Remove the playback flag from the payload
      if (action[playbackFlag]) {
        delete action[playbackFlag];
      }

      return originalReducer.apply(undefined, arguments);
    };
    var store = createStore(reducer, initialState, enhancer);
    var origDispatch = store.dispatch;
    middlewareData.clearActions();
    middlewareData.setBugReporterInitialState({});

    // wrap around dispatch disable all non-playback actions during playback
    var dispatch = function dispatch(action) {
      // Allow overload and finishPlayback actions
      if (action && action.type && (action.type === overloadStoreActionType || action.type === finishPlaybackActionType)) {
        return origDispatch.apply(undefined, arguments);
      }
      if (playbackEnabled && !action[playbackFlag]) {
        // ignore the action
        return;
      }
      return origDispatch.apply(undefined, arguments);
    };

    return _extends({}, store, {
      dispatch: dispatch
    });
  };
};

var middlewareData = exports.middlewareData = {
  actions: [],
  bugReporterInitialState: {},
  addAction: function addAction(action) {
    this.actions.push(action);
  },
  clearActions: function clearActions() {
    this.actions = [];
  },
  getActions: function getActions() {
    return this.actions;
  },
  setBugReporterInitialState: function setBugReporterInitialState(state) {
    this.bugReporterInitialState = state;
  },
  getBugReporterInitialState: function getBugReporterInitialState() {
    return this.bugReporterInitialState;
  }
};

exports.default = storeEnhancer;