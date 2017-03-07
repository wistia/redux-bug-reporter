'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UnconnectedBugReporter = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _redux = require('redux');

var _reactRedux = require('react-redux');

var _lodash = require('lodash.isequal');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.isfunction');

var _lodash4 = _interopRequireDefault(_lodash3);

var _storeEnhancer = require('./store-enhancer');

var _isClientRender = require('./is-client-render');

var _isClientRender2 = _interopRequireDefault(_isClientRender);

var _utils = require('./utils');

var _default = require('./integrations/default');

var _default2 = _interopRequireDefault(_default);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// require('es6-promise').polyfill()


var getActions = function getActions() {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage({ type: 'getActions' }, function (_ref) {
      var payload = _ref.payload;

      resolve(payload);
    });
  });
};

var getInitialState = function getInitialState() {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage({ type: 'getInitialState' }, function (_ref2) {
      var payload = _ref2.payload;

      resolve(payload);
    });
  });
};

var getBackgroundData = function getBackgroundData() {
  return Promise.all([getActions(), getInitialState()]);
};

// On the server, UnconnectedBugReporter is a placeholder component
var UnconnectedBugReporter = function UnconnectedBugReporter() {
  return _react2.default.createElement('span', null);
};

if ((0, _isClientRender2.default)()) {
  exports.UnconnectedBugReporter = UnconnectedBugReporter = _react2.default.createClass({
    displayName: 'Bug Reporter',

    propTypes: {
      // passed in from parent
      submit: _react2.default.PropTypes.oneOfType([_react2.default.PropTypes.func, _react2.default.PropTypes.string]).isRequired,
      projectName: _react2.default.PropTypes.string.isRequired,
      redactStoreState: _react2.default.PropTypes.func,
      name: _react2.default.PropTypes.string,
      meta: _react2.default.PropTypes.any,
      customEncode: _react2.default.PropTypes.func,
      customDecode: _react2.default.PropTypes.func,
      // Passed in by redux-bug-reporter
      dispatch: _react2.default.PropTypes.func.isRequired,
      storeState: _react2.default.PropTypes.any.isRequired,
      overloadStore: _react2.default.PropTypes.func.isRequired,
      initializePlayback: _react2.default.PropTypes.func.isRequired,
      finishPlayback: _react2.default.PropTypes.func.isRequired
    },

    getInitialState: function getInitialState() {
      return {
        expanded: false,
        mounted: false,
        loading: false,
        bugFiled: false,
        reporter: this.props.name || '',
        description: '',
        screenshotURL: '',
        notes: '',
        error: '',
        bugURL: ''
      };
    },

    shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
      // Do not bother rerendering every props change.
      // Rerender only needs to occur on state change
      if (this.state !== nextState) {
        return true;
      }
      return false;
    },

    componentDidMount: function componentDidMount() {
      this.setState({ mounted: true });
      (0, _utils.listenToErrors)();
      // Global function to play back a bug
      window.bugReporterPlayback = this.bugReporterPlayback;
    },

    toggleExpanded: function toggleExpanded() {
      this.setState({ expanded: !this.state.expanded });
    },

    bugReporterPlayback: function bugReporterPlayback(actions, initialState, finalState) {
      var _this = this;

      var delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
      var _props = this.props,
          dispatch = _props.dispatch,
          overloadStore = _props.overloadStore,
          customDecode = _props.customDecode;

      if (delay === -1) {
        // Do not playback, just jump to the final state
        overloadStore(finalState);
        return;
      }

      this.props.initializePlayback();
      if (customDecode) {
        initialState = customDecode(initialState);
        finalState = customDecode(finalState);
      }
      overloadStore(initialState);

      var performNextAction = function performNextAction() {
        var action = actions[0];

        // Let store know this is a playback action
        action[_storeEnhancer.playbackFlag] = true;

        dispatch(action);
        actions.splice(0, 1);
        if (actions.length > 0) {
          setTimeout(performNextAction, delay);
        } else {
          _this.props.finishPlayback();
          var storeState = _this.props.storeState;
          var keys = Object.keys(storeState);
          keys.forEach(function (key) {
            if (!(0, _lodash2.default)(storeState[key], finalState[key]) &&
            // In case reducer is an immutableJS object, call toJSON on it.
            !(storeState[key].toJSON && finalState[key].toJSON && (0, _lodash2.default)(storeState[key].toJSON(), finalState[key].toJSON()))) {
              console.log('The following reducer does not strictly equal the bug report final state: ' + key + '. I\'ll print them both out so you can see the differences.');
              console.log(key + ' current state:', storeState[key], '\n' + key + ' bug report state:', finalState[key]);
            }
          });
          console.log('Playback complete!');
        }
      };

      performNextAction();
    },

    submit: function submit(e) {
      var _this2 = this;

      e.preventDefault();
      var _props2 = this.props,
          submit = _props2.submit,
          projectName = _props2.projectName,
          storeState = _props2.storeState,
          redactStoreState = _props2.redactStoreState,
          meta = _props2.meta,
          customEncode = _props2.customEncode;
      var _state = this.state,
          reporter = _state.reporter,
          description = _state.description,
          screenshotURL = _state.screenshotURL,
          notes = _state.notes;

      this.setState({ loading: true });

      var state = storeState;
      // let initialState = middlewareData.getBugReporterInitialState()
      var promise = void 0;
      if (redactStoreState) {
        initialState = redactStoreState(initialState);
        state = redactStoreState(state);
      }

      if (customEncode) {
        state = customEncode(state);
        initialState = customEncode(initialState);
      }

      getBackgroundData().then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            actions = _ref4[0],
            initialState = _ref4[1];

        var newBug = {
          projectName: projectName,
          state: state,
          initialState: initialState,
          actions: actions,
          consoleErrors: _utils.errorData.getErrors(),
          reporter: reporter,
          description: description,
          screenshotURL: screenshotURL,
          notes: notes,
          meta: meta,
          useragent: window.navigator.userAgent,
          windowDimensions: [window.innerWidth, window.innerHeight],
          windowLocation: window.location.href
        };

        // if submit is a function, call it instead of fetching
        // and attach to the promise returned
        if ((0, _lodash4.default)(submit)) {
          promise = submit(newBug);
        } else {
          var submitFn = (0, _default2.default)({ url: submit });
          promise = submitFn(newBug);
        }

        promise.then(function () {
          var json = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          var bugURL = json.bugURL;

          _this2.setState({ loading: false, bugFiled: true, bugURL: bugURL, expanded: true });
        }).catch(function (error) {
          console.error('Error filing bug', error);
          _this2.setState({ loading: false, bugFiled: true, error: error, expanded: true });
        });
      });
    },

    dismiss: function dismiss(e) {
      e.preventDefault();
      this.setState({ bugFiled: false, expanded: false, bugURL: '' });
    },

    handleChange: function handleChange(field) {
      var _this3 = this;

      return function (e) {
        _this3.setState(_defineProperty({}, field, e.target.value));
      };
    },

    render: function render() {
      var _state2 = this.state,
          reporter = _state2.reporter,
          description = _state2.description,
          screenshotURL = _state2.screenshotURL,
          notes = _state2.notes,
          mounted = _state2.mounted,
          loading = _state2.loading,
          bugFiled = _state2.bugFiled,
          error = _state2.error,
          expanded = _state2.expanded,
          bugURL = _state2.bugURL;

      if (!mounted) {
        return false;
      }
      if (loading) {
        return loadingLayout;
      }

      if (bugFiled) {
        return _react2.default.createElement(
          'div',
          { className: 'Redux-Bug-Reporter' },
          _react2.default.createElement(
            'div',
            { className: 'Redux-Bug-Reporter__form Redux-Bug-Reporter__form--' + (error ? 'fail' : 'success') },
            error ? _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'div',
                null,
                'Oops, something went wrong!'
              ),
              _react2.default.createElement(
                'div',
                null,
                'Please try again later'
              )
            ) : _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'div',
                null,
                'Your bug has been filed successfully!'
              ),
              bugURL && _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(
                  'a',
                  { target: '_blank', href: bugURL },
                  'Here is a link to it!'
                )
              )
            )
          ),
          _react2.default.createElement(
            'div',
            { className: 'Redux-Bug-Reporter__show-hide-container' },
            _react2.default.createElement('button', { className: 'Redux-Bug-Reporter__show-hide-button Redux-Bug-Reporter__show-hide-button--' + (error ? 'expanded' : 'collapsed'), onClick: this.dismiss })
          )
        );
      }

      return _react2.default.createElement(
        'div',
        { className: 'Redux-Bug-Reporter' },
        expanded && _react2.default.createElement(
          'div',
          { className: 'Redux-Bug-Reporter__form' },
          _react2.default.createElement(
            'form',
            { onSubmit: this.submit },
            _react2.default.createElement('input', { className: 'Redux-Bug-Reporter__form-input Redux-Bug-Reporter__form-input--reporter', onChange: this.handleChange('reporter'), value: reporter, placeholder: 'Name' }),
            _react2.default.createElement('input', { className: 'Redux-Bug-Reporter__form-input Redux-Bug-Reporter__form-input--description', onChange: this.handleChange('description'), value: description, placeholder: 'Description' }),
            _react2.default.createElement('input', { className: 'Redux-Bug-Reporter__form-input Redux-Bug-Reporter__form-input--screenshotURL', onChange: this.handleChange('screenshotURL'), value: screenshotURL, placeholder: 'Screenshot URL' }),
            _react2.default.createElement('textarea', { className: 'Redux-Bug-Reporter__form-input Redux-Bug-Reporter__form-input--notes', onChange: this.handleChange('notes'), value: notes, placeholder: 'Notes' }),
            _react2.default.createElement(
              'button',
              { className: 'Redux-Bug-Reporter__submit-button', type: 'submit' },
              'File Bug'
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'Redux-Bug-Reporter__show-hide-container' },
          _react2.default.createElement('button', { className: 'Redux-Bug-Reporter__show-hide-button Redux-Bug-Reporter__show-hide-button--' + (this.state.expanded ? 'expanded' : 'collapsed'), onClick: this.toggleExpanded })
        )
      );
    }
  });
}

var loadingLayout = _react2.default.createElement(
  'div',
  { className: 'Redux-Bug-Reporter' },
  _react2.default.createElement(
    'div',
    { className: 'Redux-Bug-Reporter__loading-container' },
    _react2.default.createElement('span', { className: 'Redux-Bug-Reporter__loading' })
  )
);

var mapStateToProps = function mapStateToProps(store) {
  return {
    storeState: store
  };
};

var mapDispatchToProps = function mapDispatchToProps(dispatch) {
  var boundActions = (0, _redux.bindActionCreators)({ overloadStore: _storeEnhancer.overloadStore, initializePlayback: _storeEnhancer.initializePlayback, finishPlayback: _storeEnhancer.finishPlayback }, dispatch);
  return _extends({
    dispatch: dispatch
  }, boundActions);
};

var ConnectedBugReporter = (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(UnconnectedBugReporter);

exports.UnconnectedBugReporter = UnconnectedBugReporter;
exports.default = ConnectedBugReporter;