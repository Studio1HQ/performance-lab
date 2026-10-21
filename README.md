## PerformanceLab: Android benchmark companion

This React Native 0.81.5 app supports the Studio1 [Android performance article](../../article/draft.md). It shows a fixed 300-item catalog (258 items in stock), a detail view selected with local state, and a favorite toggle. The list uses `FlatList`; this is not a React Navigation or network-load benchmark.

The app records Measure `Catalog` and `Item Detail` screen views and custom `catalog_to_detail` and `favorite_update` spans after JavaScript SDK initialization. Matching `PERFLAB` logcat events give the [device runner](../../benchmarks/android/run_trials.py) a local duration for every interaction. `catalog_to_detail` measures the Open handler through a callback after detail layout; `favorite_update` measures the toggle handler through a callback after the update. Neither marker proves visible pixels or a usable screen.

### Android setup and variants

Follow the [Android setup guide](../README.md) for the Git-ignored Measure credentials, native integration, A/B/C Release build commands, and installation. The app uses the same dependency set, data, Hermes setting, and Measure configuration for all three variants. The Android runner checks the installed APK hash, Release mode, and runtime architecture before recording.

The supplied dashboard screenshot confirms that Android sessions arrived. It does not yet show receipt of the named spans or connect a dashboard trace to a build variant. The article's results come from the [raw Android trials](../../benchmarks/android/README.md).

### Local checks

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

React Native 0.81 is used to retain the Legacy Architecture switch for this historical comparison. React Native 0.82 and later run only the New Architecture. [React Native's version boundary](https://reactnative.dev/blog/2025/10/08/react-native-0.82).
