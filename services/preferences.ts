import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppPreferences {
  language: string;
  subtitleLanguage: string;
  subtitleSize: string;
  videoQuality: string;
  autoplayNextEpisode: boolean;
  autoplayTrailers: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  marketingNotifications: boolean;
  downloadOverWifiOnly: boolean;
  smartDownloads: boolean;
}

const STORAGE_KEY = 'streamcontrol.preferences';

export const defaultPreferences: AppPreferences = {
  language: 'English',
  subtitleLanguage: 'Arabic',
  subtitleSize: 'Medium',
  videoQuality: 'Auto',
  autoplayNextEpisode: true,
  autoplayTrailers: false,
  pushNotifications: true,
  emailNotifications: true,
  marketingNotifications: false,
  downloadOverWifiOnly: true,
  smartDownloads: false,
};

export async function getPreferences() {
  try {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!rawValue) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(rawValue) } as AppPreferences;
  } catch {
    return defaultPreferences;
  }
}

export async function updatePreferences(nextValues: Partial<AppPreferences>) {
  const current = await getPreferences();
  const updated = { ...current, ...nextValues };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function resetPreferences() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return defaultPreferences;
}
