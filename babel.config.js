module.exports = function(api) {
  api.cache(true);
  
  // Manually configure plugins to avoid NativeWind's automatic worklets inclusion
  // NativeWind's babel helper includes worklets which causes config reading issues
  const plugins = [
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "automatic",
        importSource: "react-native-css-interop"
      }
    ],
    "react-native-reanimated/plugin" // Must be last
  ];
  
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }]
    ],
    plugins,
  };
};
