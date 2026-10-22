/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const MockReact = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      MockReact.createElement(View, null, children),
    SafeAreaView: ({children, style}: {children: React.ReactNode; style: object}) =>
      MockReact.createElement(View, {style}, children),
  };
});

jest.mock('@measuresh/react-native', () => ({
  Measure: {
    init: jest.fn().mockResolvedValue(undefined),
    trackScreenView: jest.fn().mockResolvedValue(undefined),
    startSpan: jest.fn(() => {
      const span = {
        setAttribute: jest.fn(),
        setCheckpoint: jest.fn(),
        setStatus: jest.fn(),
        end: jest.fn(),
      };
      span.setStatus.mockReturnValue(span);
      return span;
    }),
  },
  MeasureConfig: jest.fn(),
  SpanStatus: {Ok: 1, Error: 2},
}));

test('opens a fetched product and returns to the catalog', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      products: [{
        id: 1,
        title: 'Essence Mascara Lash Princess',
        description: 'A mascara with a volumizing effect.',
        category: 'beauty',
        price: 9.99,
        rating: 4.94,
        stock: 5,
        brand: 'Essence',
        thumbnail: 'https://example.com/mascara.png',
        images: ['https://example.com/mascara.png'],
      }],
    }),
  });
  globalThis.fetch = fetchMock as typeof fetch;
  let view!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    view = ReactTestRenderer.create(<App />);
  });

  const list = view.root.findAll(node =>
    Array.isArray(node.props.data) && typeof node.props.renderItem === 'function')[0];
  expect(list).toBeDefined();
  const firstItem = list.props.data[0];
  expect(firstItem.title).toBe('Essence Mascara Lash Princess');
  let row!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    row = ReactTestRenderer.create(list.props.renderItem({item: firstItem}));
  });
  const firstOpen = row.root.findByProps({
    accessibilityLabel: 'Open product 1: Essence Mascara Lash Princess',
  });
  expect(firstOpen).toBeDefined();
  await ReactTestRenderer.act(async () => {
    firstOpen.props.onPress();
  });

  expect(view.root.findAllByType(Text).some(node => node.props.children === 'Essence Mascara Lash Princess')).toBe(true);
  const back = view.root.findByProps({accessibilityLabel: 'Back to catalog'});
  await ReactTestRenderer.act(async () => {
    back.props.onPress();
  });
  const returnedList = view.root.findAll(node => Array.isArray(node.props.data))[0];
  expect(returnedList.props.data[0].title).toBe('Essence Mascara Lash Princess');
  expect(fetchMock).toHaveBeenCalledWith(
    'https://dummyjson.com/products?limit=0',
    expect.objectContaining({signal: expect.anything()}),
  );
  await ReactTestRenderer.act(async () => {
    row.unmount();
    view.unmount();
  });
});
