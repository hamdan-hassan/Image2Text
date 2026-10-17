/**
 * AdMob configuration.
 *
 * Development builds (__DEV__) always use Google's official test ad units so
 * clicks never violate AdMob policy. Release builds use the real units below.
 *
 * App IDs (note the `~`) are injected natively via the
 * `react-native-google-mobile-ads` config plugin in app.json.
 */
export const ADMOB_APP_IDS = {
  android: 'ca-app-pub-4478899815710413~5329519231',
  ios: 'ca-app-pub-4478899815710413~5329519231',
};

const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};
const PRODUCTION_AD_UNITS = {
  homeTopBanner: 'ca-app-pub-4478899815710413/1358848632',
  homeBottomBanner: 'ca-app-pub-4478899815710413/6227667936',
  interstitial: 'ca-app-pub-4478899815710413/1514590825',
};

export const AD_UNIT_IDS = __DEV__
  ? {
      homeTopBanner: TEST_AD_UNITS.banner,
      homeBottomBanner: TEST_AD_UNITS.banner,
      interstitial: TEST_AD_UNITS.interstitial,
    }
  : PRODUCTION_AD_UNITS;

/** Minimum time between two interstitial impressions. */
export const INTERSTITIAL_MIN_INTERVAL_MS = 3 * 60 * 1000;
