import mobileAds, { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, INTERSTITIAL_MIN_INTERVAL_MS } from '../../constants/ads';
import { logger } from '../../utils/logger';

let initialized = false;

/** Initializes the Mobile Ads SDK. Safe to call offline — failures are non-fatal. */
export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await mobileAds().initialize();
  } catch (error) {
    logger.warn('LOG', `ads initialize failed: ${String(error)}`);
  }
}

interface InterstitialEvents {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: unknown) => void;
}

class InterstitialManager {
  private ad: InterstitialAd | null = null;
  private loaded = false;
  private lastShownAt = 0;
  private events: InterstitialEvents = {};

  configure(events: InterstitialEvents): void {
    this.events = events;
  }

  /** Preloads an interstitial so it is ready when needed. */
  load(): void {
    if (this.ad) return;
    this.ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });
    this.ad.addAdEventListener(AdEventType.LOADED, () => {
      this.loaded = true;
      this.events.onAdLoaded?.();
    });
    this.ad.addAdEventListener(AdEventType.ERROR, (error) => {
      this.loaded = false;
      this.events.onAdFailedToLoad?.(error);
      logger.warn('LOG', `interstitial failed to load: ${String(error)}`);
    });
    this.ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.reset();
      this.load();
    });
    this.ad.load();
  }

  /**
   * Shows the interstitial if it is loaded and enough time has passed since
   * the previous impression; otherwise silently skips.
   */
  maybeShow(): void {
    if (!this.loaded || !this.ad) return;
    if (Date.now() - this.lastShownAt < INTERSTITIAL_MIN_INTERVAL_MS) return;
    this.lastShownAt = Date.now();
    this.loaded = false;
    this.ad.show().catch((error) => logger.warn('LOG', `interstitial show failed: ${String(error)}`));
  }

  reset(): void {
    this.ad = null;
    this.loaded = false;
  }
}

export const interstitialManager = new InterstitialManager();

export function preloadAds(): void {
  void initAds().then(() => interstitialManager.load());
}

