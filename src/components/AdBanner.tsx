import React, { useState } from 'react';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../constants/ads';

interface AdBannerProps {
  placement: 'homeTopBanner' | 'homeBottomBanner';
}

/**
 * Anchored adaptive banner. Collapses to nothing when the ad fails to load
 * (e.g. offline), so the UI is never blocked by advertising.
 */
export function AdBanner({ placement }: AdBannerProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <BannerAd
      unitId={AD_UNIT_IDS[placement]}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
      onAdFailedToLoad={() => setFailed(true)}
    />
  );
}
