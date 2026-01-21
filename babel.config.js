module.exports = function(api) {
  api.cache(true);
  const nativewindBabel = require("nativewind/babel");
  const allPlugins = nativewindBabel().plugins;
  
  // Filter out react-native-worklets/plugin if not installed
  const plugins = allPlugins.filter((plugin) => {
    if (typeof plugin === 'string' && plugin === 'react-native-worklets/plugin') {
      try {
        require.resolve('react-native-worklets/plugin');
        return true;
      } catch (e) {
        return false; // Filter out if not installed
      }
    }
    return true;
  });
  
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }]
    ],
    plugins,
  };
};
