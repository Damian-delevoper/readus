const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Exclude react-native-pdf from web builds
if (!config.resolver) {
  config.resolver = {};
}

// Add resolver to exclude react-native-pdf on web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude react-native-pdf on web
  if (platform === 'web' && (moduleName === 'react-native-pdf' || moduleName.includes('react-native-pdf'))) {
    return {
      type: 'empty',
    };
  }
  
  // Use default resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
