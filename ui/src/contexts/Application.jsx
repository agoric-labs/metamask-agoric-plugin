import React, { createContext, useContext, useReducer, useEffect } from 'react';

import { walletGetPurses, createWeb3Socket } from '../utils/metamask-connect';
import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  serverConnected,
  serverDisconnected,
  deactivateConnection,
  changeAmount,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';

import { CONTRACT_ID } from '../utils/constants';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());
  const {
    active,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    freeVariable,
  } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      console.log('handling message', message)
      if (type === 'walletUpdatePurses') {
        console.log('deploying purse update')
        dispatch(updatePurses(JSON.parse(data)));
      }
    }

    console.log('activating websocket')
    const listeners = {
      onConnect() {
        dispatch(serverConnected());
        walletGetPurses()
        .then(messageHandler)
      },
      onDisconnect() {
        dispatch(serverDisconnected());
        dispatch(deactivateConnection());
        dispatch(resetState());
      },
      onMessage(message) {
        messageHandler(message);
      },
    }
    activateWebSocket(listeners)
    createWeb3Socket(listeners)
  }, [active]);

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      if (type === 'autoswapPrice') {
        dispatch(changeAmount(data, 1 - freeVariable));
      }
    }

    if (inputPurse && outputPurse && freeVariable === 0 && inputAmount > 0) {
      doFetch({
        type: 'autoswapGetPrice',
        data: {
          instanceId: CONTRACT_ID,
          extent0: inputAmount,
          assayId0: inputPurse.assayId,
          assayId1: outputPurse.assayId,
        },
      }).then(messageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch({
        type: 'autoswapGetPrice',
        data: {
          instanceId: CONTRACT_ID,
          extent0: outputAmount,
          assayId0: outputPurse.assayId,
          assayId1: inputPurse.assayId,
        },
      }).then(messageHandler);
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount, freeVariable]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
