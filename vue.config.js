module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        productName: "AmongUS-ModHandler",
        appId: "com.fe8works.aumh",
        win: {
          icon: "./icon.ico",
          target: ["zip", "nsis"],
        },
      },
    },
  },
};
