/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Button, Text} from 'react-native';
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

test('opens the same catalog item and returns to the list', async () => {
  let view!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    view = ReactTestRenderer.create(<App />);
  });

  const list = view.root.findAll(node =>
    Array.isArray(node.props.data) && typeof node.props.renderItem === 'function')[0];
  expect(list).toBeDefined();
  const firstItem = list.props.data[0];
  expect(firstItem.name).toBe('Item 001');
  let row!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    row = ReactTestRenderer.create(list.props.renderItem({item: firstItem}));
  });
  const firstOpen = row.root.findAllByType(Button).find(node => node.props.title === 'Open');
  expect(firstOpen).toBeDefined();
  await ReactTestRenderer.act(async () => {
    firstOpen?.props.onPress();
  });

  expect(view.root.findAllByType(Text).some(node => node.props.children === 'Item 001')).toBe(true);
  const back = view.root.findByProps({title: 'Back to catalog'});
  await ReactTestRenderer.act(async () => {
    back.props.onPress();
  });
  expect(view.root.findAllByType(Button).some(node => node.props.title === 'Open')).toBe(true);
  await ReactTestRenderer.act(async () => {
    row.unmount();
    view.unmount();
  });
});
