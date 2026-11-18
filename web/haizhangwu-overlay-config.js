(() => {
  "use strict";

  window.HAIZHANGWU_OVERLAY_CONFIG = Object.freeze({
    background: Object.freeze({ width: 1672, height: 941 }),
    figure: Object.freeze({
      src: "assets/ni-ren-zhang/sea-zhang-wu-insitu-overlay.png",
      width: 1672,
      height: 941,
      alphaBounds: Object.freeze({
        left: 436,
        top: 153,
        right: 978,
        bottom: 941,
      }),
    }),
    transform: Object.freeze({
      left: 0,
      top: 0,
      scale: 1,
      opacity: 1,
    }),
    keypoints: Object.freeze([
      Object.freeze({ id: "hat", label: "帽顶", x: 550, y: 175 }),
      Object.freeze({ id: "eye", label: "眼睛", x: 608, y: 233 }),
      Object.freeze({ id: "fan", label: "折扇", x: 659, y: 374 }),
      Object.freeze({ id: "leftShoulder", label: "左肩", x: 470, y: 423 }),
      Object.freeze({ id: "rightShoulder", label: "右肩", x: 832, y: 426 }),
      Object.freeze({ id: "waist", label: "腰部", x: 691, y: 611 }),
      Object.freeze({ id: "hem", label: "下摆", x: 697, y: 821 }),
      Object.freeze({ id: "leftShoe", label: "左鞋", x: 612, y: 927 }),
      Object.freeze({ id: "rightShoe", label: "右鞋", x: 824, y: 920 }),
    ]),
  });
})();
