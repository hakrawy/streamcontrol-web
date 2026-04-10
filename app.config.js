const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const baseUrl =
  process.env.EXPO_BASE_URL ??
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}` : '');

module.exports = {
  expo: {
    name: 'StreamControl Web',
    slug: 'streamcontrol-web',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/logo.png',
    scheme: 'streamcontrolweb',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      name: 'StreamControl Web',
      shortName: 'StreamControl',
      favicon: './assets/images/logo.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/logo.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
      ...(baseUrl ? { baseUrl } : {}),
    },
  },
};
