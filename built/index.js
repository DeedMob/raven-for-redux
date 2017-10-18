"use strict";

var identity = function identity(x) {
  return x;
};
var getUndefined = function getUndefined() {};
var filter = function filter() {
  return true;
};
function createRavenMiddleware(Raven) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // TODO: Validate options.
  var _options$breadcrumbDa = options.breadcrumbDataFromAction,
      breadcrumbDataFromAction = _options$breadcrumbDa === undefined ? getUndefined : _options$breadcrumbDa,
      _options$actionTransf = options.actionTransformer,
      actionTransformer = _options$actionTransf === undefined ? identity : _options$actionTransf,
      _options$stateTransfo = options.stateTransformer,
      stateTransformer = _options$stateTransfo === undefined ? identity : _options$stateTransfo,
      _options$breadcrumbCa = options.breadcrumbCategory,
      breadcrumbCategory = _options$breadcrumbCa === undefined ? "redux-action" : _options$breadcrumbCa,
      _options$filterBreadc = options.filterBreadcrumbActions,
      filterBreadcrumbActions = _options$filterBreadc === undefined ? filter : _options$filterBreadc;


  return function (store) {
    var lastAction = void 0;

    Raven.setDataCallback(function (data, original) {
      data.extra.lastAction = actionTransformer(lastAction);
      var state = stateTransformer(store.getState());
      // split because of Sentry's 512 bytes per extra item.
      // see https://docs.sentry.io/learn/quotas/#attributes-limits
      // Contraint: Max 100 top level keys in state, state must be an object.
      for (var stateAttr in state) {
        if (state.hasOwnProperty(stateAttr)) data.extra['state.' + stateAttr] = state[stateAttr];
      }
      return original ? original(data) : data;
    });

    return function (next) {
      return function (action) {
        // Log the action taken to Raven so that we have narrative context in our
        // error report.
        if (filterBreadcrumbActions(action)) {
          Raven.captureBreadcrumb({
            category: breadcrumbCategory,
            message: action.type,
            data: breadcrumbDataFromAction(action)
          });
        }

        lastAction = action;
        return next(action);
      };
    };
  };
}

module.exports = createRavenMiddleware;