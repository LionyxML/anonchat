/* eslint-disable  @typescript-eslint/no-explicit-any */

const implNewStore = (createState: any) => {
  let state: any;

  const setState = (partial: any) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;

    if (!Object.is(nextState, state)) {
      state = Object.assign({}, state, nextState);
    }
  };

  const getState = () => state;

  const api = { setState, getState };

  state = createState(setState, getState, api) as any;

  return api as any;
};

export const createStore = <T>(createState: () => T) =>
  createState ? implNewStore(createState) : implNewStore;
