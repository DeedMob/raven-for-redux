const identity = x => x;
const getUndefined = () => {};
const filter = () => true;
function createRavenMiddleware(Raven, options = {}) {
  // TODO: Validate options.
  const {
    breadcrumbDataFromAction = getUndefined,
    actionTransformer = identity,
    stateTransformer = identity,
    breadcrumbCategory = "redux-action",
    filterBreadcrumbActions = filter
  } = options;

  return store => {
    let lastAction;

    Raven.setDataCallback((data, original) => {
      data.extra.lastAction = actionTransformer(lastAction);
      const state = stateTransformer(store.getState());
      // split because of Sentry's 512 bytes per extra item.
      // see https://docs.sentry.io/learn/quotas/#attributes-limits
      // Contraint: Max 100 top level keys in state, state must be an object.
      for(var stateAttr in state){
        if(state.hasOwnProperty(stateAttr)
           data.extra[stateAttr] = state[stateAttr];
      }
      return original ? original(data) : data;
    });

    return next => action => {
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
}

module.exports = createRavenMiddleware;
