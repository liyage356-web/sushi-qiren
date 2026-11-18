(() => {
  "use strict";

  // 每个场景单独控制裁切中心、文字落位和局部柔光。
  // textPosition: left / right / center / bottom。
  window.GOU_BU_LI_SCENE_LAYOUTS = Object.freeze({
    street: {
      sceneId: "tianjin-street-market",
      backgroundImage:
        "gou-bu-li/assets/tianjin-street-goubuli-gathering.png",
      backgroundPosition: "58% 50%",
      textPosition: "left",
      textWidth: "clamp(330px, 33vw, 470px)",
      textAlign: "left",
      textColor: "#2f2a22",
      textOverlay:
        "radial-gradient(ellipse at 30% 42%, rgba(249,242,227,0.92) 0%, rgba(249,242,227,0.78) 44%, rgba(249,242,227,0.34) 68%, transparent 87%)",
      sceneWash:
        "linear-gradient(90deg, rgba(248,240,224,0.28), transparent 38%, rgba(37,31,23,0.08))",
      mobile: {
        backgroundPosition: "59% 46%",
        textPosition: "bottom",
        textWidth: "calc(100% - 18px)",
        textAlign: "left",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, rgba(249,242,228,0.7) 0%, rgba(249,242,228,0.72) 18%, rgba(249,242,228,0.54) 38%, rgba(249,242,228,0.9) 65%, rgba(249,242,228,0.97) 100%)",
        sceneWash:
          "linear-gradient(180deg, rgba(44,37,28,0.03), rgba(44,37,28,0.23))",
      },
    },
    shopIntro: {
      sceneId: "riverside-baozi-stall",
      backgroundImage:
        "gou-bu-li/assets/jiangpan-baozi-shop-morning.png",
      backgroundPosition: "62% 48%",
      textPosition: "left",
      textWidth: "clamp(330px, 33vw, 470px)",
      textAlign: "left",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 28% 45%, rgba(249,242,227,0.91) 0%, rgba(249,242,227,0.74) 45%, rgba(249,242,227,0.3) 70%, transparent 88%)",
      sceneWash:
        "linear-gradient(90deg, rgba(247,239,220,0.24), transparent 43%, rgba(43,35,25,0.08))",
      mobile: {
        backgroundPosition: "66% 44%",
        textPosition: "bottom",
        textWidth: "calc(100% - 18px)",
        textAlign: "left",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, transparent 0%, rgba(249,242,228,0.44) 26%, rgba(249,242,228,0.91) 64%, rgba(249,242,228,0.98) 100%)",
        sceneWash:
          "linear-gradient(180deg, rgba(40,33,25,0.02), rgba(40,33,25,0.24))",
      },
    },
    shopMain: {
      sceneId: "busy-baozi-shop",
      backgroundImage:
        "gou-bu-li/assets/busy-morning-bao-shop.png",
      backgroundPosition: "54% 44%",
      textPosition: "left",
      textWidth: "clamp(330px, 33vw, 470px)",
      textAlign: "left",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 26% 43%, rgba(249,242,227,0.93) 0%, rgba(249,242,227,0.8) 43%, rgba(249,242,227,0.35) 70%, transparent 88%)",
      sceneWash:
        "linear-gradient(90deg, rgba(247,239,220,0.2), transparent 43%, rgba(43,35,25,0.07))",
      mobile: {
        backgroundPosition: "58% 40%",
        textPosition: "bottom",
        textWidth: "calc(100% - 18px)",
        textAlign: "left",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, transparent 0%, rgba(249,242,228,0.5) 25%, rgba(249,242,228,0.94) 64%, rgba(249,242,228,0.99) 100%)",
        sceneWash:
          "linear-gradient(180deg, rgba(40,33,25,0.02), rgba(40,33,25,0.28))",
      },
    },
    craft: {
      sceneId: "busy-baozi-shop-craft",
      backgroundImage:
        "gou-bu-li/assets/warm-busy-bao-shop.png",
      backgroundPosition: "56% 42%",
      textPosition: "center",
      textWidth: "min(820px, 76vw)",
      textAlign: "center",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 50% 35%, rgba(249,242,227,0.88) 0%, rgba(249,242,227,0.64) 52%, transparent 82%)",
      sceneWash:
        "linear-gradient(180deg, rgba(248,240,224,0.66), rgba(248,240,224,0.38) 46%, rgba(43,35,25,0.2))",
      mobile: {
        backgroundPosition: "58% 36%",
        textPosition: "center",
        textWidth: "calc(100% - 24px)",
        textAlign: "center",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, rgba(249,242,228,0.9), rgba(249,242,228,0.84) 55%, rgba(249,242,228,0.94))",
        sceneWash:
          "linear-gradient(180deg, rgba(248,240,224,0.6), rgba(46,37,27,0.18))",
      },
    },
    market: {
      sceneId: "busy-baozi-shop-market",
      backgroundImage:
        "gou-bu-li/assets/busy-morning-bao-shop.png",
      backgroundPosition: "62% 45%",
      textPosition: "center",
      textWidth: "min(820px, 76vw)",
      textAlign: "center",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 50% 28%, rgba(249,242,227,0.92) 0%, rgba(249,242,227,0.66) 54%, transparent 86%)",
      sceneWash:
        "linear-gradient(180deg, rgba(248,240,224,0.72), rgba(248,240,224,0.24) 52%, rgba(43,35,25,0.26))",
      mobile: {
        backgroundPosition: "64% 38%",
        textPosition: "center",
        textWidth: "calc(100% - 24px)",
        textAlign: "center",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, rgba(249,242,228,0.94), rgba(249,242,228,0.76) 54%, rgba(249,242,228,0.9))",
        sceneWash:
          "linear-gradient(180deg, rgba(248,240,224,0.62), rgba(46,37,27,0.16))",
      },
    },
    name: {
      sceneId: "busy-baozi-shop-name",
      backgroundImage:
        "gou-bu-li/assets/busy-morning-bao-shop.png",
      backgroundPosition: "48% 43%",
      textPosition: "left",
      textWidth: "min(430px, 33vw)",
      textAlign: "left",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 30% 42%, rgba(249,242,227,0.93) 0%, rgba(249,242,227,0.7) 48%, transparent 85%)",
      sceneWash:
        "linear-gradient(90deg, rgba(249,242,227,0.72), rgba(249,242,227,0.3) 50%, rgba(43,35,25,0.15))",
      mobile: {
        backgroundPosition: "55% 34%",
        textPosition: "center",
        textWidth: "calc(100% - 24px)",
        textAlign: "left",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, rgba(249,242,228,0.94), rgba(249,242,228,0.82) 58%, rgba(249,242,228,0.93))",
        sceneWash:
          "linear-gradient(180deg, rgba(248,240,224,0.64), rgba(46,37,27,0.16))",
      },
    },
    fame: {
      sceneId: "fame-out-of-tianjin",
      backgroundImage: "gou-bu-li/assets/bao-shop-busy.webp",
      backgroundPosition: "58% 42%",
      textPosition: "left",
      textWidth: "min(560px, 46vw)",
      textAlign: "left",
      textColor: "#f4ecdc",
      textOverlay:
        "linear-gradient(90deg, rgba(31,35,30,0.72), rgba(31,35,30,0.34) 58%, transparent 92%)",
      sceneWash:
        "linear-gradient(90deg, rgba(31,35,30,0.62), rgba(31,35,30,0.12) 62%, transparent)",
      mobile: {
        backgroundPosition: "54% center",
        textPosition: "bottom",
        textWidth: "calc(100% - 28px)",
        textAlign: "left",
        textColor: "#f8efe0",
        textOverlay:
          "linear-gradient(180deg, rgba(31,35,30,0.16), rgba(31,35,30,0.72) 72%, rgba(31,35,30,0.88))",
        sceneWash:
          "linear-gradient(180deg, rgba(31,35,30,0.2), rgba(31,35,30,0.46))",
      },
    },
    reflection: {
      sceneId: "tianjin-street-reflection",
      backgroundImage:
        "gou-bu-li/assets/tianjin-street-goubuli-gathering.png",
      backgroundPosition: "55% 48%",
      textPosition: "center",
      textWidth: "min(760px, 62vw)",
      textAlign: "left",
      textColor: "#2d2921",
      textOverlay:
        "radial-gradient(ellipse at 50% 50%, rgba(249,242,228,0.94) 0%, rgba(249,242,228,0.86) 58%, rgba(249,242,228,0.35) 86%, transparent 100%)",
      sceneWash:
        "linear-gradient(180deg, rgba(32,31,26,0.2), rgba(32,31,26,0.36))",
      mobile: {
        backgroundPosition: "55% 42%",
        textPosition: "center",
        textWidth: "calc(100% - 18px)",
        textAlign: "left",
        textColor: "#29261f",
        textOverlay:
          "linear-gradient(180deg, rgba(249,242,228,0.94), rgba(249,242,228,0.9) 70%, rgba(249,242,228,0.96))",
        sceneWash:
          "linear-gradient(180deg, rgba(32,31,26,0.18), rgba(32,31,26,0.3))",
      },
    },
  });
})();
