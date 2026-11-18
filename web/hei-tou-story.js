const heiTouOriginalSource =
  window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["hei-tou"];

const heiTouYardScenes = Object.freeze({
  follow: {
    src: "images/hei-tou/follow/shang-home-gate.png",
    alt: "商家院门紧闭，黑头独自坐在槐树下等待",
  },
  acceptedOpen: {
    src: "images/hei-tou/yard/shang-opens-gate.png",
    alt: "商大爷推开院门，黑头仍坐在门外等待",
  },
  acceptedWelcome: {
    src: "images/hei-tou/yard/shang-welcomes-hei-tou.png",
    alt: "商大爷站在院门旁，向黑头伸出手",
  },
  guard: {
    src: "images/hei-tou/courtyard/scene-guard.png",
    alt: "修缮中的商家院落，工匠与孩子在忙碌，黑头守在东屋前",
  },
  accident: {
    src: "images/hei-tou/courtyard/scene-accident.png",
    alt: "鞭炮惊响后，孩子跌坐在地，院中众人围拢查看",
  },
  conflict: {
    src: "images/hei-tou/courtyard/scene-conflict.png",
    alt: "商大爷手持木棍与受惊的黑头对峙，院中工匠仍在四周",
  },
  leave: {
    src: "images/hei-tou/courtyard/scene-departure.png",
    alt: "黑头转身奔出院门，商大爷站在院中",
  },
});

window.HEI_TOU_STORY = {
  title: "黑头",
  author: "冯骥才",
  source: {
    status: heiTouOriginalSource ? "verified" : "pending",
    statusLabel: heiTouOriginalSource ? "原文已逐段导入" : "原文待核对录入",
    edition: heiTouOriginalSource?.edition || "",
    note: heiTouOriginalSource
      ? "文字逐段取自用户提供的《俗世奇人》Word 原文；篇名单独作为标题显示，正文保留原有段落、标点和天津话。"
      : "当前原型不内置未经核对的原文，也不使用改写内容代替原文。请在 canonicalText 中录入已授权、已核对的原著段落。",
  },
  canonicalText:
    heiTouOriginalSource?.paragraphs.map((paragraph) => ({
      paragraphId: paragraph.paragraphId,
      sceneIds: paragraph.sceneIds,
      text: paragraph.content,
      sourceVerified: paragraph.sourceVerified,
    })) || [],
  sceneCopy: {
    street: {
      eyebrow: "第一幕 · 北大关",
      title: "热闹街上，先看见一个小小的黑影",
      lead:
        "米铺的幌子在风里轻晃，挑担的人从河埠头走过。黑头不在画面中央，只贴着街角，像一小片没有扫净的影子。",
      prompt: "先看看货箱、鱼铺和街角；若发现了它，就点那团黑影。",
      feeding: {
        eyebrow: "投食 · 两次尝试",
        prompt: "把鱼头拖到黑头身边，或先点鱼头再点投放区。",
        selected: "鱼头已拿起，点击黑头身边的投放区。",
        missed: "还没送到黑头身边，再试一次。",
        blocked: "一只野狗突然挡在面前，黑头退后了。再试一次。",
        complete: "它仍没能靠近食物",
        unlocked: "下一章已解锁，可以跟着黑头去鱼铺。",
        lockedNext: "完成两次投食",
      },
      objectOrder: ["cargo", "fishshop", "alley"],
      objectNotes: {
        cargo: {
          label: "货箱",
          note: "木箱和竹筐沿墙根挤成一处。箱角沾着河泥，绳结却收拾得利落，像是刚从船上卸下来的货。",
          clue: "北大关临河，街边的货箱、竹筐与挑担，都带着码头气。",
        },
        fishshop: {
          label: "鱼铺",
          note: "鱼铺门前湿漉漉的，腥气顺着风散开。对一条饿狗来说，这里比热闹的人声更容易找到。",
          clue: "鱼铺留下气味；一只鱼头，可能比一整条街的喧闹更让它在意。",
        },
        alley: {
          label: "街角",
          note: "街巷在这里折了一下。人群继续向前走，墙根却留出一小块安静的阴影。",
          clue: "越是热闹的地方，越容易藏住一个不愿贴近人群的小身影。",
        },
      },
      appearance: {
        eyebrow: "黑头 · 人物初见",
        title: "它没有叫，只是警醒地看着",
        excerptTitle: "原文外貌描写",
        // 只放经出版版本核对后的原文，不要用改写或概要冒充摘引。
        excerpts: [],
        visualNote:
          "黑白斑驳，头脸乌黑，身上的卷毛乱蓬蓬地竖着。身子瘦，站在风里时，并不显得凶，只显得防备。",
        sourceNote:
          "当前显示依据人物图所作的外貌转述；原文摘句尚未核对录入，页面不会把转述冒充原著。",
        tags: ["黑白斑驳", "头脸乌黑", "卷毛蓬乱"],
        nextLabel: "跟着它去鱼铺",
      },
      clues: {
        eyebrow: "街景札记",
        title: "你发现了什么",
        empty: "还没有细看街边。货箱、鱼铺与街角都藏着一句话。",
        dogFound: "已在街角找到黑头。它不是街景的点缀，而是这段故事真正的入口。",
      },
    },
    fish: {
      eyebrow: "第二幕 · 隆昌海货店",
      title: "一只鱼头，三次靠近",
      note: "互动场景 · 情节氛围转译",
      body:
        "商大爷从海货摊上拿起一只鱼头，俯身递给门口的黑头。头一回还隔着戒心，第二回它不再退远，第三回吃饱后终于摇了尾巴。",
      prompt: "把摊位上的鱼头拖到黑头嘴边；也可以直接点鱼头。",
      introResponse: "鱼头搁在海货摊边，黑头压低身子，耳朵还竖着。",
      missed: "鱼头还没递到嘴边。松开后它会回到摊上，再试一次。",
      prompts: [
        "鱼头还在摊上。拖到黑头嘴边，或直接点鱼头。",
        "第二次投喂。黑头还在试探，再靠近一些。",
        "最后一次。看它吃饱后会不会摇尾巴。",
        "三次投喂完成。黑头已经认得商大爷。",
      ],
      responses: [
        "黑头先退半步，喉咙里低低一响；见商大爷不动，才低头咬了几口。",
        "这回它只略略一顿，便凑近鱼头，咬得稳了，没有再退远。",
        "第三次，黑头吃净鱼头，抬起脸望着商大爷，尾巴一下一下摇起来。",
      ],
      phaseLabels: [
        ["退半步 · 还在防着", "低头 · 小口试探", "尾巴压着 · 仍不放心"],
        ["略退半步 · 已少些戒心", "低头 · 咬得更稳", "尾巴轻动 · 开始认得人"],
        ["不再躲远 · 只顿了顿", "低头 · 吃得安稳", "亲近 · 尾巴摇起来"],
      ],
      progressLabels: ["退半步", "咬几口", "摇尾巴"],
      complete: "三次投喂完成 · 从警惕到熟悉",
      credit: "场景：复古海货店街景 · 人物：商大爷与黑头 · 食物：墨韵鱼头",
    },
    courtyard: {
      eyebrow: "院落 · 关系变化",
      title: "一道院门，几段距离",
      note: "场景说明 · 设计转译",
      body:
        "院门与人物位置承担气氛提示。进入“守护”后，可以点击房梁上的红绸，看一段上梁惊变的交互转译；这些画面不替原文叙述因果。",
      interaction: {
        prompt: "点击红绸，见证上梁。",
        triggered: "鞭炮乍响，黑头猛地朝院子中央冲去……",
        accident: "人群惊乱，一个孩子跌坐在地。",
        conflict: "人声和犬吠撞在一起，商大爷抄起了木棍。",
        gazePrompt: "看看黑头。",
        gazeContinue: "继续",
        gazeParagraphId: "hei-tou-p19",
        gazeFallback:
          "黑头没有再躲，也没有出声，只把目光停在商大爷脸上。",
        gazeLeave: "黑头站了一会儿，转身离开了院子。",
        departureCaption: "院门开着，黑头没有回头。",
        departureContinue: "继续故事",
        departureRestart: "重新体验",
      },
      states: {
        follow: {
          label: "跟随",
          caption: "院门外，它跟着人，没有走远。",
          door: "院门闭合",
          images: [heiTouYardScenes.follow],
        },
        accepted: {
          label: "接纳",
          caption: "门开了，人与它之间的距离变了。",
          door: "院门打开",
          autoAdvanceMs: 3200,
          images: [
            heiTouYardScenes.acceptedOpen,
            heiTouYardScenes.acceptedWelcome,
          ],
        },
        guard: {
          label: "守护",
          caption: "红绸挂上房梁，众人都等着上梁的吉时。",
          door: "上梁在即",
          images: [heiTouYardScenes.guard],
        },
        accident: {
          label: "惊变",
          caption: "鞭炮乍响，惊乱顺着院子一下散开。",
          door: "现场惊乱",
          images: [heiTouYardScenes.accident],
        },
        conflict: {
          label: "冲突",
          caption: "人声、犬吠撞在一起，商大爷举起了棍子。",
          door: "人犬对峙",
          images: [heiTouYardScenes.conflict],
        },
        leave: {
          label: "离开",
          caption: "黑头转身，夺门而去。",
          door: "夺门而去",
          images: [heiTouYardScenes.leave],
        },
      },
    },
    guardian: {
      eyebrow: "守护与惊变 · 三重视角",
      title: "院里的人，各有各的慌张",
      note: "原创交互提示 · 场景设计转译",
      body:
        "同一个修缮中的院落，黑头、孩子与商大爷留意到的东西并不相同。选择一个视点，画面会柔和地移向那个人正在注意的地方。",
      scene: heiTouYardScenes.guard,
      storySteps: [
        {
          stageLabel: "第二幕 · 惊扰孩子",
          title: "黑头惹了祸，而且是大祸",
          body:
            "黑头没见过场面，如临大敌，浑身的毛全竖起来。鞭炮响起，黑头以为出了事，突然腾身蹿跃出来，孩子们一见这黑头花身、张牙舞爪、凶神恶煞般的怪物，吓得转身就跑。一个邻居家的男孩儿被挤倒，脑袋撞上石头门墩，开了口子冒出血来。",
          scene: {
            src: "images/hei-tou/guardian/scene-trouble.png",
            alt: "鞭炮惊响，黑头突然从院中蹿出，孩子们惊慌四散奔逃",
          },
        },
        {
          stageLabel: "第三幕 · 责打黑头",
          title: "黑头惹了祸，而且是大祸",
          body:
            "商大爷是讲礼讲面的人，自己缺理，人家话不好听，也得受着。一边叫家里人陪着孩子去瞧大夫，一边回到院里安顿受了惊扰的修房的人。这时，扭头一眼瞧见黑头，心火冒起，拾起一根竿子两步过去，给黑头狠狠一竿子，骂道：“畜生就是畜生，我一辈子和人好礼好面，你把我面子丢尽了！” 黑头挨了重重一击，本能地蹿起，龇牙大叫一声，那样子真凶。商大爷正在火头上，并不怕它，朝它怒吼：“干嘛！你还敢咬我？”",
          scene: heiTouYardScenes.conflict,
        },
        {
          stageLabel: "第四幕 · 负气离去",
          title: "黑头惹了祸，而且是大祸",
          body:
            "黑头站那儿没动，两眼直对商大爷看着，忽然转身夺门而去，一溜烟儿就跑没了。商大爷把竿子一扔说：“滚吧，打今儿别再回来，原本不就是条丧家犬吗？”",
          scene: heiTouYardScenes.leave,
        },
      ],
      views: {
        blackhead: {
          label: "黑头视角",
          shortLabel: "黑头",
          prompt: "陌生的脚步越来越近……",
          note: "东屋前，黑头守住自己的位置，也留意着院中来来往往的人。",
        },
        child: {
          label: "孩子视角",
          shortLabel: "孩子",
          prompt: "院子里那只大狗，正盯着这边……",
          note: "孩子躲在人群边上，既好奇，又不敢真正靠近那只蓬松的大狗。",
        },
        shopkeeper: {
          label: "商大爷视角",
          shortLabel: "商大爷",
          prompt: "院里人多，得留神些……",
          note: "梁木、工匠和孩子挤在一处，院中越热闹，越需要有人留意场面。",
        },
      },
    },
    ending: {
      eyebrow: "第六幕 · 尾声",
      prompt: "轻触画面，继续故事",
      stages: [
        {
          background: "images/hei-tou/epilogue/hei-tou-returns.png",
          alt: "修缮中的商家院落，工匠正在铺瓦，黑头忽然出现在敞开的院门口",
          objectPosition: "54% 54%",
          mobileObjectPosition: "84% 54%",
          title: "尾声",
          description:
            "又过两天，西边的房顶已经铺好苇耙，开始上泥铺瓦。院门敞着，黑头忽然出现在门口。这时候，商大爷去隆昌上班了，工人都盯着手里的活，谁也没注意到它。",
          showActions: false,
        },
        {
          background: "images/hei-tou/epilogue/hei-tou-in-mud.png",
          alt: "黑头猛地扑进院中那堆稀泥，只剩后腿和尾巴露在外边",
          objectPosition: "46% 58%",
          mobileObjectPosition: "20% 60%",
          title: "尾声",
          description:
            "黑头两眼扫一下院子，看见中间有一堆和好的稀泥，突然它腿一使劲，朝那堆稀泥猛冲过去，“噗”地一头扎进泥里，用劲过猛，只剩下后腿和尾巴留在外边。这一切没人瞧见。",
          showActions: false,
        },
        {
          background: "images/hei-tou/epilogue/hei-tou-found.png",
          alt: "收工时工匠从泥里拉出已经断气的黑头，商大爷站在一旁",
          objectPosition: "52% 51%",
          mobileObjectPosition: "67% 53%",
          title: "尾声",
          description:
            "待商大爷下晌回来，工人收工时，有人发现这泥里毛糊糊的东西是嘛呢，拉出来一看，大惊失色，原来是黑头，早断了气，身子都有点发硬了。它怎么死在这儿，嘛时候死的，是邻居那家弄死后塞在这儿的吗？",
          showActions: false,
        },
        {
          background: "images/hei-tou/epilogue/hei-tou-found.png",
          alt: "泥泞工地上的众人沉默望着死去的黑头，商大爷道出它的归宿",
          objectPosition: "52% 51%",
          mobileObjectPosition: "67% 53%",
          title: "面子，归属",
          description:
            "大伙猜了半天说了半天，谁也说不清楚。半天没说话的商大爷的一句话，把这事说明白了：“我明白它，它比我还要面子，它这是自我了结。”随后又感慨地说，“唉，死还是要死在自己家里。”",
          showActions: true,
        },
      ],
    },
    reflection: {
      eyebrow: "读后笺 · 情绪出口",
      title: "你愿意记住哪一个词？",
      lead:
        "选择可以多选，也可以不选。感想只保存在当前浏览器，不会公开，也不会影响阅读。",
    },
  },
  reflectionOptions: ["情分", "尊严", "归属", "信任", "体面", "沉默"],
};
