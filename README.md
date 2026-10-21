## PerformanceLab

This React Native 0.81.5 app shows a fixed 300-item catalog (258 items in stock), a detail view selected with local state, and a favorite toggle. The list uses `FlatList`.

The app records Measure `Catalog` and `Item Detail` screen views and custom `catalog_to_detail` and `favorite_update` spans after JavaScript SDK initialization. Matching `PERFLAB` logcat events give a local duration for every Android interaction. `catalog_to_detail` measures the Open handler through a callback after detail layout; `favorite_update` measures the toggle handler through a callback after the update. Neither marker proves visible pixels or a usable screen.

### Setup

Install the React Native development prerequisites, then run `npm ci` in this directory.

For Android Measure collection, copy `.env.example` to `.env` and set `MEASURE_API_KEY`. For iOS, copy `ios/Measure.local.xcconfig.example` to `ios/Measure.local.xcconfig` and set `MEASURE_API_KEY`. Both credential files are Git-ignored.

Run `npm run android` for Android. On macOS, run `bundle install`, `bundle exec pod install --project-directory=ios`, then `npm run ios` for iOS.

### Local checks

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

React Native 0.81 retains the Legacy Architecture switch for comparison. React Native 0.82 and later run only the New Architecture. [React Native's version boundary](https://reactnative.dev/blog/2025/10/08/react-native-0.82).
