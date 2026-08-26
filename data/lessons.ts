import type { LearningAnalyticsEventSource, LessonBlockType, LocalizedText } from "@/types";
import type { VisualizationModuleId } from "@/data/visualizationLabs";
import { mainlandBnuHighLessonSeeds } from "./mainlandBnuHighLessons";
import { mainlandBnuJuniorLessonSeeds } from "./mainlandBnuJuniorLessons";
import { mainlandBnuPrimaryLessonSeeds } from "./mainlandBnuPrimaryLessons";
import { mainlandHjbHighLessonSeeds } from "./mainlandHjbHighLessons";
import { mainlandHjbJuniorLessonSeeds } from "./mainlandHjbJuniorLessons";
import { mainlandHjbPrimaryLessonSeeds } from "./mainlandHjbPrimaryLessons";
import { mainlandPepHighLessonSeeds } from "./mainlandPepHighLessons";
import { mainlandPepJuniorLessonSeeds } from "./mainlandPepJuniorLessons";
import { mainlandPepPrimaryLessonSeeds } from "./mainlandPepPrimaryLessons";
import { usArkansasMiddleSchoolLessonSeeds } from "./usArkansasMiddleSchoolLessons";
import { usCaliforniaLessonSeeds } from "./usCaliforniaLessons";
import { usFloridaMiddleSchoolLessonSeeds } from "./usFloridaMiddleSchoolLessons";

const math = (expression: string) => `\\(${expression}\\)`;

type ProductionLessonBlockType = Exclude<LessonBlockType, "practice">;

export type ProductionLessonBlock = {
  idSuffix: string;
  type: ProductionLessonBlockType;
  title: LocalizedText;
  content?: LocalizedText;
  items?: LocalizedText[];
  visualizationConfig?: {
    moduleId: VisualizationModuleId;
    source: LearningAnalyticsEventSource;
    topicId: string;
  };
  /** For "interactive-lesson" blocks: the ported CCSS textbook lesson that renders as the block body. */
  interactiveLessonConfig?: {
    ccssLessonSlug: string;
    topicId: string;
    standardIds: string[];
  };
};

export type ProductionLessonSeed = {
  topicId: string;
  productionReady: boolean;
  title: LocalizedText;
  description: LocalizedText;
  estimatedMinutes?: number;
  practiceQuestionIds?: string[];
  blocks: ProductionLessonBlock[];
};

type LessonDraft = {
  topicId: string;
  title: LocalizedText;
  description: LocalizedText;
  estimatedMinutes?: number;
  concept: {
    title: LocalizedText;
    content: LocalizedText;
  };
  workedExample: {
    title?: LocalizedText;
    content: LocalizedText;
  };
  checklist: {
    title: LocalizedText;
    items: LocalizedText[];
  };
  visualization?: {
    title: LocalizedText;
    content: LocalizedText;
    moduleId: VisualizationModuleId;
    source: LearningAnalyticsEventSource;
    topicId?: string;
  };
  extension: {
    title?: LocalizedText;
    items: LocalizedText[];
  };
};

const workedExampleTitle = { en: "Worked example", zh: "例題" } satisfies LocalizedText;
const extensionTitle = { en: "Extension", zh: "延伸" } satisfies LocalizedText;

function lesson(draft: LessonDraft): ProductionLessonSeed {
  const blocks: ProductionLessonBlock[] = [
    {
      idSuffix: "concept",
      type: "concept",
      title: draft.concept.title,
      content: draft.concept.content
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: draft.workedExample.title ?? workedExampleTitle,
      content: draft.workedExample.content
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: draft.checklist.title,
      items: draft.checklist.items
    }
  ];

  if (draft.visualization) {
    blocks.push({
      idSuffix: "visualization",
      type: "visualization",
      title: draft.visualization.title,
      content: draft.visualization.content,
      visualizationConfig: {
        moduleId: draft.visualization.moduleId,
        source: draft.visualization.source,
        topicId: draft.visualization.topicId ?? draft.topicId
      }
    });
  }

  blocks.push({
    idSuffix: "extension",
    type: "extension",
    title: draft.extension.title ?? extensionTitle,
    items: draft.extension.items
  });

  return {
    topicId: draft.topicId,
    productionReady: true,
    title: draft.title,
    description: draft.description,
    estimatedMinutes: draft.estimatedMinutes,
    blocks
  };
}

const hongKongProductionLessonSeeds: ProductionLessonSeed[] = [
  lesson({
    topicId: "p1-counting-number-bonds",
    title: { en: "Counting and Number Bonds: Make Numbers to 20", zh: "數數與數的組合：建立 20 以內的數" },
    description: {
      en: "Count carefully, compare groups, and split numbers into pairs that make the same total.",
      zh: "仔細數數、比較數量，並把數分拆成能組成相同總數的配對。"
    },
    estimatedMinutes: 18,
    concept: {
      title: { en: "Counting is matching", zh: "數數就是一一配對" },
      content: {
        en: "Each object should be counted once. A number bond shows two parts and one whole, such as 7 and 3 making 10.",
        zh: "每件物件只應數一次。數的組合表示兩個部分和一個整體，例如 7 和 3 組成 10。"
      }
    },
    workedExample: {
      content: {
        en: `If there are ${math("7")} counters and we want ${math("10")}, count on: ${math("8, 9, 10")}. We need ${math("3")} more, so ${math("7 + 3 = 10")}.`,
        zh: `若已有 ${math("7")} 粒珠，要湊成 ${math("10")}，可接着數：${math("8, 9, 10")}。還需要 ${math("3")} 粒，所以 ${math("7 + 3 = 10")}。`
      }
    },
    checklist: {
      title: { en: "Number bond checklist", zh: "數的組合清單" },
      items: [
        { en: "Touch or point to each object once.", zh: "每件物件只點算一次。" },
        { en: "Name the two parts and the whole.", zh: "說出兩個部分和整體。" },
        { en: "Check by counting all objects again.", zh: "重新數全部物件作檢查。" }
      ]
    },
    visualization: {
      title: { en: "Split a total on the number line", zh: "在數線上分拆總數" },
      content: {
        en: "Set the two ends on the number line and read the jump between them, so the whole and its parts stay visible together.",
        zh: "在數線上設定兩端，讀出兩端之間的跳距，讓整體和部分同時可見。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane",
      topicId: "p1-counting-number-bonds"
    },
    extension: {
      items: [
        { en: "Find all pairs that make 10, then all pairs that make 20.", zh: "找出所有組成 10 的配對，再找出所有組成 20 的配對。" },
        { en: "Explain how knowing 7 + 3 helps with 17 + 3.", zh: "解釋知道 7 + 3 如何幫助計算 17 + 3。" }
      ]
    }
  }),
  lesson({
    topicId: "p1-addition-subtraction",
    title: { en: "Addition and Subtraction: Steps on a Number Line", zh: "加法與減法：數線上的步伐" },
    description: {
      en: "Use pictures, ten frames, and number-line steps to add, subtract, and check simple answers.",
      zh: "利用圖像、十格架和數線步伐進行加減，並檢查簡單答案。"
    },
    estimatedMinutes: 20,
    concept: {
      title: { en: "Add forward, subtract backward", zh: "加是向前，減是向後" },
      content: {
        en: "Addition joins groups or moves forward on a number line. Subtraction takes away or moves backward from the starting number.",
        zh: "加法可表示合併數量或在數線上向前走。減法可表示取走數量或由起點向後走。"
      }
    },
    workedExample: {
      content: {
        en: `To find ${math("6 + 8")}, make ten first: ${math("6 + 4 = 10")}. There are ${math("4")} left from the ${math("8")}, so ${math("10 + 4 = 14")}.`,
        zh: `計算 ${math("6 + 8")} 時先湊十：${math("6 + 4 = 10")}。${math("8")} 還剩 ${math("4")}，所以 ${math("10 + 4 = 14")}。`
      }
    },
    checklist: {
      title: { en: "Addition and subtraction checklist", zh: "加減清單" },
      items: [
        { en: "Decide whether the story joins or takes away.", zh: "判斷題目是合併還是取走。" },
        { en: "Use ten as a friendly stopping point.", zh: "把 10 作為容易處理的停靠點。" },
        { en: "Check subtraction by adding back.", zh: "用加回去的方法檢查減法。" }
      ]
    },
    visualization: {
      title: { en: "Walk the number line", zh: "在數線上行走" },
      content: {
        en: "Move the start and the step along the marked number line, and say each jump forward or backward as an addition or subtraction.",
        zh: "在有刻度的數線上移動起點和步長，把每次向前或向後的跳動說成加法或減法。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Make two different addition stories with the same answer.", zh: "創作兩道答案相同但情境不同的加法題。" },
        { en: "Show how one subtraction fact gives a related addition fact.", zh: "展示一道減法算式如何對應一道加法算式。" }
      ]
    }
  }),
  lesson({
    topicId: "p1-shapes-patterns",
    title: { en: "Shapes and Patterns: Name, Sort, Repeat", zh: "圖形與規律：命名、分類、重複" },
    description: {
      en: "Recognize simple shapes by sides and corners, then use repeating patterns to predict what comes next.",
      zh: "按邊和角辨認簡單圖形，再用重複規律預測下一項。"
    },
    estimatedMinutes: 18,
    concept: {
      title: { en: "Shape clues", zh: "圖形線索" },
      content: {
        en: "A shape can be described by its sides, corners, and whether its sides are straight or curved. A pattern repeats when the same order appears again and again.",
        zh: "圖形可按邊、角，以及邊是直線還是曲線來描述。當同一順序不斷出現，就形成重複規律。"
      }
    },
    workedExample: {
      content: {
        en: "A triangle has 3 straight sides and 3 corners. In the pattern circle, square, circle, square, the next shape is circle because the pair repeats.",
        zh: "三角形有 3 條直邊和 3 個角。規律「圓形、正方形、圓形、正方形」的下一項是圓形，因為這一對圖形正在重複。"
      }
    },
    checklist: {
      title: { en: "Shape checklist", zh: "圖形清單" },
      items: [
        { en: "Count sides and corners carefully.", zh: "仔細數邊和角。" },
        { en: "Say the repeating unit aloud.", zh: "說出正在重複的一組。" },
        { en: "Check the next item fits the same order.", zh: "檢查下一項是否符合相同順序。" }
      ]
    },
    visualization: {
      title: { en: "Name a shape by its sides and corners", zh: "用邊和角命名圖形" },
      content: {
        en: "Choose how many sides the shape has and how big it is, then count its sides and corners to name it.",
        zh: "選擇圖形的邊數和大小，再數一數它的邊和角，然後說出名稱。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Sort classroom objects by shape and explain the rule.", zh: "按形狀分類課室物件，並解釋分類規則。" },
        { en: "Create a repeating pattern with three shapes and ask a classmate for the next item.", zh: "用三種圖形建立重複規律，請同學說出下一項。" }
      ]
    }
  }),
  lesson({
    topicId: "p1-measurement-time",
    title: { en: "Measurement and Time: Compare, Order, Read", zh: "度量與時間：比較、排序、讀時" },
    description: {
      en: "Compare length, mass, and capacity, then read simple o'clock times from an analogue clock.",
      zh: "比較長度、重量和容量，並從指針鐘讀出簡單整點時間。"
    },
    estimatedMinutes: 20,
    concept: {
      title: { en: "Choose the quantity", zh: "選擇要比較的量" },
      content: {
        en: "Length tells how long, mass tells how heavy, and capacity tells how much a container can hold. For o'clock times, the minute hand points to 12.",
        zh: "長度表示有多長，重量表示有多重，容量表示容器可盛載多少。整點時，分針會指向 12。"
      }
    },
    workedExample: {
      content: {
        en: `A classroom door is longer than a pencil, so it is the better choice for a long object. If the hour hand points to ${math("3")} and the minute hand points to ${math("12")}, the time is 3 o'clock.`,
        zh: `課室門比鉛筆長，所以較適合作為長物件的例子。若時針指向 ${math("3")}、分針指向 ${math("12")}，時間是 3 時。`
      }
    },
    checklist: {
      title: { en: "Measure and time checklist", zh: "度量與時間清單" },
      items: [
        { en: "Decide whether the question asks about length, mass, capacity, or time.", zh: "判斷題目問長度、重量、容量還是時間。" },
        { en: "Use comparison words such as longer, heavier, or holds more.", zh: "使用較長、較重、盛載較多等比較詞語。" },
        { en: "For o'clock, check that the minute hand points to 12.", zh: "讀整點時，檢查分針是否指向 12。" }
      ]
    },
    extension: {
      items: [
        { en: "Order three classroom objects from shortest to longest.", zh: "把三件課室物件由最短排至最長。" },
        { en: "Draw two o'clock times and ask someone to read them.", zh: "畫出兩個整點時間，請別人讀出。" }
      ]
    }
  }),
  lesson({
    topicId: "p2-place-value",
    title: { en: "Place Value to 1000: Hundreds, Tens, Ones", zh: "一千以內的位值：百、十、個" },
    description: {
      en: "Read, write, compare, and decompose three-digit numbers by place value.",
      zh: "按位值讀寫、比較和分拆三位數。"
    },
    estimatedMinutes: 22,
    concept: {
      title: { en: "Digits get value from position", zh: "數字由位置取得數值" },
      content: {
        en: "In a three-digit number, the left digit counts hundreds, the middle digit counts tens, and the right digit counts ones.",
        zh: "三位數中，左邊數字表示百，中間數字表示十，右邊數字表示個。"
      }
    },
    workedExample: {
      content: {
        en: `${math("482")} has ${math("4")} hundreds, ${math("8")} tens, and ${math("2")} ones, so ${math("482 = 400 + 80 + 2")}.`,
        zh: `${math("482")} 有 ${math("4")} 個百、${math("8")} 個十和 ${math("2")} 個一，所以 ${math("482 = 400 + 80 + 2")}。`
      }
    },
    checklist: {
      title: { en: "Place value checklist", zh: "位值清單" },
      items: [
        { en: "Read digits from hundreds to ones.", zh: "由百位讀到個位。" },
        { en: "Write expanded form before comparing close numbers.", zh: "比較接近的數前先寫分拆式。" },
        { en: "Use zero to hold an empty place.", zh: "用 0 保留沒有數值的位置。" }
      ]
    },
    visualization: {
      title: { en: "Build a three-digit number", zh: "建立三位數" },
      content: {
        en: "Set the hundreds and tens on one dial and the ones on the other, then read the flats, rods and units against the number they make.",
        zh: "用一個滑桿設定百位和十位，另一個設定個位，再對照百格板、十條和單位方塊讀出所組成的數。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Create the largest and smallest three-digit numbers from the same three digits.", zh: "用相同三個數字建立最大和最小的三位數。" },
        { en: "Explain why 507 needs a zero in the tens place.", zh: "解釋為何 507 的十位需要 0。" }
      ]
    }
  }),
  lesson({
    topicId: "p2-multiplication-foundations",
    title: { en: "Multiplication Foundations: Groups and Arrays", zh: "乘法基礎：等量組與陣列" },
    description: {
      en: "Connect repeated addition, equal groups, arrays, and early multiplication facts.",
      zh: "連繫重複加法、等量組、陣列和初階乘法事實。"
    },
    estimatedMinutes: 24,
    concept: {
      title: { en: "Multiplication counts equal groups", zh: "乘法數等量組" },
      content: {
        en: "A multiplication fact tells how many equal groups there are and how many objects are in each group. Arrays show the same idea with rows and columns.",
        zh: "乘法算式表示有多少個等量組，以及每組有多少件物件。陣列用行和列表示相同概念。"
      }
    },
    workedExample: {
      content: {
        en: `${math("3 \\times 4")} means ${math("3")} groups of ${math("4")}. Count ${math("4 + 4 + 4 = 12")}, so ${math("3 \\times 4 = 12")}.`,
        zh: `${math("3 \\times 4")} 表示 ${math("3")} 組，每組 ${math("4")} 個。數出 ${math("4 + 4 + 4 = 12")}，所以 ${math("3 \\times 4 = 12")}。`
      }
    },
    checklist: {
      title: { en: "Multiplication checklist", zh: "乘法清單" },
      items: [
        { en: "Check that the groups are equal.", zh: "檢查每組數量是否相同。" },
        { en: "Say rows and columns for an array.", zh: "描述陣列的行和列。" },
        { en: "Use repeated addition to check a new fact.", zh: "用重複加法檢查新的乘法事實。" }
      ]
    },
    visualization: {
      title: { en: "Arrange an array", zh: "排列陣列" },
      content: {
        en: "Set the rows and the columns, then read the array as repeated addition and as a multiplication fact.",
        zh: "設定行數和列數，再把陣列讀成重複加法和乘法算式。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Find two different arrays that both show 12 objects.", zh: "找出兩個不同陣列，同樣表示 12 件物件。" },
        { en: "Explain why 3 x 4 and 4 x 3 have the same total.", zh: "解釋為何 3 x 4 和 4 x 3 的總數相同。" }
      ]
    }
  }),
  lesson({
    topicId: "p2-money-time",
    title: { en: "Money and Time: Pay, Change, Half Hours", zh: "金錢與時間：付款、找續、半小時" },
    description: {
      en: "Solve simple Hong Kong money questions and read o'clock or half-hour times.",
      zh: "解決簡單香港貨幣題，並讀出整點或半小時時間。"
    },
    estimatedMinutes: 24,
    concept: {
      title: { en: "Money and time are labelled numbers", zh: "金錢與時間都是帶標籤的數" },
      content: {
        en: "Money answers need dollars or cents. Half past means the minute hand points to 6, which is 30 minutes after the hour.",
        zh: "金錢答案要寫元或角。半小時表示分針指向 6，即整點後 30 分鐘。"
      }
    },
    workedExample: {
      content: {
        en: `If a snack costs HK$${math("8")} and you pay HK$${math("10")}, the change is HK$${math("2")}. Half an hour after ${math("4:00")} is ${math("4:30")}.`,
        zh: `若小食售港幣 ${math("$8")}，付港幣 ${math("$10")}，找續是港幣 ${math("$2")}。${math("4:00")} 後半小時是 ${math("4:30")}。`
      }
    },
    checklist: {
      title: { en: "Money and time checklist", zh: "金錢與時間清單" },
      items: [
        { en: "Write HK$ or cents with money answers.", zh: "金錢答案要寫港幣或角。" },
        { en: "Use subtraction for change.", zh: "找續使用減法。" },
        { en: "For half past, look for the minute hand at 6.", zh: "讀半小時時，留意分針是否指向 6。" }
      ]
    },
    extension: {
      items: [
        { en: "Plan two ways to pay exactly HK$15 using coins or notes.", zh: "設計兩種剛好支付港幣 15 元的方法。" },
        { en: "Make a mini timetable using o'clock and half-hour times.", zh: "用整點和半小時時間製作小時間表。" }
      ]
    }
  }),
  lesson({
    topicId: "p2-length-data",
    title: { en: "Length and Data: Measure, Read, Compare", zh: "長度與數據：量度、閱讀、比較" },
    description: {
      en: "Use centimetres for short lengths and read simple charts by counting each category.",
      zh: "用厘米量度較短長度，並透過數每一類閱讀簡單圖表。"
    },
    estimatedMinutes: 24,
    concept: {
      title: { en: "Length and chart counts", zh: "長度與圖表數量" },
      content: {
        en: "Centimetres are useful for classroom objects such as pencils and ribbons. In a pictograph or bar chart, each mark represents a count, so totals come from adding categories.",
        zh: "厘米適合量度鉛筆、絲帶等課室物件。在象形圖或棒形圖中，每個標記代表一個數量，總數可由各類相加得出。"
      }
    },
    workedExample: {
      content: {
        en: `A ribbon is ${math("18")} cm long and ${math("5")} cm is cut off. The remaining length is ${math("18 - 5 = 13")} cm. If a chart has ${math("6")} apples and ${math("4")} bananas, the total is ${math("10")} fruits.`,
        zh: `絲帶長 ${math("18")} 厘米，剪去 ${math("5")} 厘米，剩下 ${math("18 - 5 = 13")} 厘米。若圖表有 ${math("6")} 個蘋果和 ${math("4")} 隻香蕉，總數是 ${math("10")} 個水果。`
      }
    },
    checklist: {
      title: { en: "Measure and data checklist", zh: "度量與數據清單" },
      items: [
        { en: "Write the unit after the answer.", zh: "答案後寫上單位。" },
        { en: "Read the chart labels before adding.", zh: "相加前先閱讀圖表標籤。" },
        { en: "Compare whether the answer is longer, shorter, more, or fewer.", zh: "比較答案是較長、較短、較多還是較少。" }
      ]
    },
    visualization: {
      title: { en: "Compare two lengths on a ruler", zh: "用直尺比較兩個長度" },
      content: {
        en: "Set the length of each object in centimetres and read the difference between them straight off the scale.",
        zh: "以厘米設定兩件物件的長度，並直接從刻度讀出兩者的差。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Measure three classroom objects and display the results as a mini bar chart.", zh: "量度三件課室物件，並用小棒形圖展示結果。" },
        { en: "Write one comparison sentence from your chart.", zh: "根據圖表寫一句比較句子。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-multiplication-division",
    title: { en: "Multiplication and Division: Facts and Sharing", zh: "乘法與除法：乘數表與平均分" },
    description: {
      en: "Use times tables, equal groups, and sharing to solve number problems.",
      zh: "使用乘數表、等量分組和平均分解決數題。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Division reverses multiplication", zh: "除法是乘法的反向" },
      content: {
        en: "Multiplication combines equal groups. Division finds either the size of each group or the number of equal groups.",
        zh: "乘法合併等量組。除法可找出每組的大小，或找出可分成多少個等量組。"
      }
    },
    workedExample: {
      content: {
        en: `${math("7 \\times 6 = 42")}, so ${math("42 \\div 6 = 7")} and ${math("42 \\div 7 = 6")}. The three facts describe the same equal-group relationship.`,
        zh: `${math("7 \\times 6 = 42")}，所以 ${math("42 \\div 6 = 7")} 和 ${math("42 \\div 7 = 6")}。三個算式描述同一個等量組關係。`
      }
    },
    checklist: {
      title: { en: "Times table checklist", zh: "乘數表清單" },
      items: [
        { en: "Identify the equal group size.", zh: "找出每組相同的數量。" },
        { en: "Use a known multiplication fact before dividing.", zh: "除法前先想相關乘法事實。" },
        { en: "Check whether the answer means groups or items in each group.", zh: "檢查答案表示組數還是每組數量。" }
      ]
    },
    extension: {
      items: [
        { en: "Write a fact family for 8, 5, and 40.", zh: "用 8、5 和 40 寫出算式家族。" },
        { en: "Create a sharing story where the answer is the number of groups.", zh: "創作一道答案表示組數的平均分題。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-fractions-intro",
    title: { en: "Fractions Intro: Equal Parts and Equivalent Names", zh: "分數入門：等份與等值名稱" },
    description: {
      en: "Represent halves, thirds, quarters, and simple equivalent fractions with diagrams.",
      zh: "用圖像表示二分之一、三分之一、四分之一和簡單等值分數。"
    },
    estimatedMinutes: 26,
    concept: {
      title: { en: "Fractions need equal parts", zh: "分數需要等份" },
      content: {
        en: `A fraction such as ${math("\\frac{1}{4}")} means one out of four equal parts. Equivalent fractions name the same amount using different-sized parts.`,
        zh: `例如 ${math("\\frac{1}{4}")} 表示四等份中的一份。等值分數用不同大小的份數表示相同數量。`
      }
    },
    workedExample: {
      content: {
        en: `If one half is split into two equal smaller pieces, it becomes ${math("\\frac{2}{4}")}. Therefore ${math("\\frac{1}{2} = \\frac{2}{4}")}.`,
        zh: `若把一半再平均分成兩小份，便成為 ${math("\\frac{2}{4}")}。因此 ${math("\\frac{1}{2} = \\frac{2}{4}")}。`
      }
    },
    checklist: {
      title: { en: "Fraction checklist", zh: "分數清單" },
      items: [
        { en: "Check that all parts are equal.", zh: "檢查所有部分是否等大。" },
        { en: "Use the denominator to count total equal parts.", zh: "用分母數全部等份。" },
        { en: "Use the numerator to count selected parts.", zh: "用分子數已選部分。" }
      ]
    },
    visualization: {
      title: { en: "Compare fraction bars", zh: "比較分數條" },
      content: {
        en: "Set the denominator to cut the bar into equal parts and the numerator to shade them, then compare the bar with an equivalent fraction.",
        zh: "用分母把長條分成相等份數，用分子塗色，再把該分數與等值分數比較。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw two different pictures for one half.", zh: "為二分之一畫出兩個不同圖像。" },
        { en: "Find another fraction that is equivalent to two quarters.", zh: "找出另一個與四分之二等值的分數。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-measurement",
    title: { en: "Measurement: Units, Conversion, Context", zh: "度量：單位、換算、情境" },
    description: {
      en: "Choose suitable units and solve length, mass, and capacity questions.",
      zh: "選擇合適單位，解決長度、重量和容量題。"
    },
    estimatedMinutes: 26,
    concept: {
      title: { en: "Units give numbers meaning", zh: "單位令數字有意義" },
      content: {
        en: "A measurement answer is incomplete without a unit. Small objects often use centimetres or grams; larger quantities use metres, kilograms, or litres.",
        zh: "度量答案沒有單位便不完整。小物件常用厘米或克，較大的量則用米、千克或公升。"
      }
    },
    workedExample: {
      content: {
        en: `${math("1")} L is ${math("1000")} mL. If a bottle holds ${math("750")} mL, it holds less than ${math("1")} L because ${math("750 < 1000")}.`,
        zh: `${math("1")} 公升等於 ${math("1000")} 毫升。若水樽容量是 ${math("750")} 毫升，便少於 ${math("1")} 公升，因為 ${math("750 < 1000")}。`
      }
    },
    checklist: {
      title: { en: "Measurement checklist", zh: "度量清單" },
      items: [
        { en: "Choose a unit that fits the object.", zh: "選擇適合物件大小的單位。" },
        { en: "Convert before comparing different units.", zh: "比較不同單位前先換算。" },
        { en: "Keep the unit in the final sentence.", zh: "在最後答案保留單位。" }
      ]
    },
    extension: {
      items: [
        { en: "List one object measured in centimetres, metres, grams, kilograms, millilitres, and litres.", zh: "分別列出一件適合用厘米、米、克、千克、毫升和公升量度的物件。" },
        { en: "Create a conversion question where the larger unit is easier to read.", zh: "創作一道用較大單位會較易閱讀的換算題。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-geometry-patterns",
    title: { en: "Geometry and Patterns: Right Angles and Rules", zh: "幾何與規律：直角與規則" },
    description: {
      en: "Use right angles, symmetry, and number patterns to explain what stays the same and what changes.",
      zh: "運用直角、對稱和數字規律，解釋甚麼保持不變、甚麼正在改變。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Right angles and growing patterns", zh: "直角與增長規律" },
      content: {
        en: `A right angle is ${math("90^\\circ")}. A growing pattern uses the same change each step, such as adding ${math("3")} each time.`,
        zh: `直角是 ${math("90^\\circ")}。增長規律每一步有相同變化，例如每次加 ${math("3")}。`
      }
    },
    workedExample: {
      content: {
        en: `In ${math("3, 6, 9, 12")}, the change is ${math("+3")}, so the next number is ${math("15")}. For angles, compare with ${math("90^\\circ")} to decide whether an angle is right, acute, or obtuse.`,
        zh: `在 ${math("3, 6, 9, 12")} 中，變化是 ${math("+3")}，所以下一個數是 ${math("15")}。判斷角時，可與 ${math("90^\\circ")} 比較，分辨直角、銳角或鈍角。`
      }
    },
    checklist: {
      title: { en: "Geometry pattern checklist", zh: "幾何規律清單" },
      items: [
        { en: `Compare angles with ${math("90^\\circ")}.`, zh: `把角與 ${math("90^\\circ")} 比較。` },
        { en: "Find the change from one step to the next.", zh: "找出每一步到下一步的變化。" },
        { en: "Use the same rule for the next term.", zh: "用相同規則求下一項。" }
      ]
    },
    visualization: {
      title: { en: "Compare two angles", zh: "比較兩個角" },
      content: {
        en: "Set each angle in fifteen-degree steps and compare their sizes, their difference and their sum.",
        zh: "以十五度為一步設定兩個角，比較它們的大小、差和和。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Create a growing pattern and explain the rule in words.", zh: "建立一個增長規律，並用文字解釋規則。" },
        { en: "Find symmetry in a classroom object and describe the line of symmetry.", zh: "在課室物件中找出對稱，並描述對稱軸。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-large-numbers",
    title: { en: "Large Numbers: Read, Round, Compare", zh: "大數：讀寫、取近似值、比較" },
    description: {
      en: "Use place value to read, round, compare, and calculate with larger whole numbers.",
      zh: "運用位值讀寫、取近似值、比較和計算較大的整數。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Large numbers still use place value", zh: "大數仍然依靠位值" },
      content: {
        en: "Each digit has a value based on its place. Rounding replaces a number with a nearby friendly number that is easier to estimate.",
        zh: "每個數字的數值由位置決定。取近似值會把數改寫為附近較易估算的數。"
      }
    },
    workedExample: {
      content: {
        en: `To round ${math("3,684")} to the nearest hundred, check the tens digit ${math("8")}. Since ${math("8 \\ge 5")}, round up to ${math("3,700")}.`,
        zh: `把 ${math("3,684")} 取近似至百位時，檢查十位數字 ${math("8")}。因為 ${math("8 \\ge 5")}，所以進上為 ${math("3,700")}。`
      }
    },
    checklist: {
      title: { en: "Large number checklist", zh: "大數清單" },
      items: [
        { en: "Mark the place being asked for.", zh: "標示題目要求的位置。" },
        { en: "Look one place to the right when rounding.", zh: "取近似值時看右邊一位。" },
        { en: "Compare from the highest place first.", zh: "比較時先由最高位開始。" }
      ]
    },
    extension: {
      items: [
        { en: "Find two numbers that both round to 3,700 to the nearest hundred.", zh: "找出兩個取近似至百位後都是 3,700 的數。" },
        { en: "Explain when an exact number is better than a rounded number.", zh: "解釋甚麼時候準確數比近似數更合適。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-decimals",
    title: { en: "Decimals: Tenths, Hundredths, Money", zh: "小數：十分位、百分位、金錢" },
    description: {
      en: "Compare tenths and hundredths and connect decimals to money and measures.",
      zh: "比較十分位和百分位，並連繫小數、金錢和度量。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Decimals extend place value", zh: "小數延伸位值" },
      content: {
        en: "The first digit after the decimal point counts tenths, and the second digit counts hundredths. Adding a zero at the end does not change the value.",
        zh: "小數點後第一位表示十分位，第二位表示百分位。在小數末尾加 0 不會改變數值。"
      }
    },
    workedExample: {
      content: {
        en: `${math("0.6 = 0.60")}. Since ${math("0.60 > 0.56")}, ${math("0.6")} is greater than ${math("0.56")}. Also, ${math("2.3 + 1.4 = 3.7")}.`,
        zh: `${math("0.6 = 0.60")}。因為 ${math("0.60 > 0.56")}，所以 ${math("0.6")} 大於 ${math("0.56")}。另外，${math("2.3 + 1.4 = 3.7")}。`
      }
    },
    checklist: {
      title: { en: "Decimal checklist", zh: "小數清單" },
      items: [
        { en: "Line up decimal points before adding.", zh: "加法前把小數點對齊。" },
        { en: "Use trailing zeros to compare fairly.", zh: "用末尾 0 幫助公平比較。" },
        { en: "Explain tenths and hundredths using place value.", zh: "用位值解釋十分位和百分位。" }
      ]
    },
    visualization: {
      title: { en: "Read positions on a number line", zh: "讀出數線上的位置" },
      content: {
        en: "Set the ends of the number line and read each labelled whole-number position, then say which of two positions is larger.",
        zh: "設定數線兩端，讀出每個標示的整數位置，再說出兩個位置中哪一個較大。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Create a Hong Kong money example that uses two decimal places.", zh: "創作一道使用兩位小數的香港金錢例子。" },
        { en: "Find a decimal between 0.6 and 0.7 and explain why it fits.", zh: "找出一個介乎 0.6 和 0.7 之間的小數，並解釋原因。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-angles",
    title: { en: "Angles: Classify and Calculate", zh: "角：分類與計算" },
    description: {
      en: "Classify acute, right, obtuse, and straight angles, then use straight-line angle sums.",
      zh: "分類銳角、直角、鈍角和平角，並使用一直線角和。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Angle types", zh: "角的種類" },
      content: {
        en: `An acute angle is less than ${math("90^\\circ")}, a right angle is ${math("90^\\circ")}, an obtuse angle is between ${math("90^\\circ")} and ${math("180^\\circ")}, and a straight angle is ${math("180^\\circ")}.`,
        zh: `銳角小於 ${math("90^\\circ")}，直角是 ${math("90^\\circ")}，鈍角介乎 ${math("90^\\circ")} 和 ${math("180^\\circ")} 之間，平角是 ${math("180^\\circ")}。`
      }
    },
    workedExample: {
      content: {
        en: `If one angle on a straight line is ${math("75^\\circ")}, the other angle is ${math("180 - 75 = 105^\\circ")}. Since ${math("105^\\circ")} is greater than ${math("90^\\circ")}, it is obtuse.`,
        zh: `若一直線上一個角是 ${math("75^\\circ")}，另一個角是 ${math("180 - 75 = 105^\\circ")}。因為 ${math("105^\\circ")} 大於 ${math("90^\\circ")}，所以是鈍角。`
      }
    },
    checklist: {
      title: { en: "Angle checklist", zh: "角度清單" },
      items: [
        { en: "Estimate the type before calculating.", zh: "計算前先估計角的種類。" },
        { en: `Use ${math("180^\\circ")} for angles on a straight line.`, zh: `一直線上的角使用 ${math("180^\\circ")}。` },
        { en: "Check whether the final angle type matches its size.", zh: "檢查最終角的種類是否符合大小。" }
      ]
    },
    visualization: {
      title: { en: "Compare angle sizes", zh: "比較角的大小" },
      content: {
        en: "Set each angle in fifteen-degree steps, name it as acute, right or obtuse, and check whether the pair is complementary or supplementary.",
        zh: "以十五度為一步設定每個角，判斷它是銳角、直角還是鈍角，並檢查兩角是否互餘或互補。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw one acute, one right, one obtuse, and one straight angle.", zh: "畫出一個銳角、一個直角、一個鈍角和一個平角。" },
        { en: "Create a straight-line angle question with a missing value.", zh: "創作一道一直線上有未知角的題目。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-perimeter-area",
    title: { en: "Perimeter and Area: Boundary and Surface", zh: "周界與面積：邊界與表面" },
    description: {
      en: "Find perimeter and area for rectangles and composite shapes.",
      zh: "求長方形及組合圖形的周界與面積。"
    },
    estimatedMinutes: 32,
    concept: {
      title: { en: "Perimeter goes around, area covers inside", zh: "周界繞外圍，面積覆蓋內部" },
      content: {
        en: "Perimeter is the total length around a shape. Area counts square units covering the inside of a flat shape.",
        zh: "周界是圖形外圍的總長度。面積則數出覆蓋平面圖形內部的平方單位。"
      }
    },
    workedExample: {
      content: {
        en: `A rectangle with length ${math("8")} cm and width ${math("3")} cm has perimeter ${math("2(8 + 3) = 22")} cm. A ${math("5")} cm by ${math("4")} cm rectangle has area ${math("20")} cm${math("^2")}.`,
        zh: `長 ${math("8")} 厘米、闊 ${math("3")} 厘米的長方形周界是 ${math("2(8 + 3) = 22")} 厘米。${math("5")} 厘米乘 ${math("4")} 厘米的長方形面積是 ${math("20")} 平方厘米。`
      }
    },
    checklist: {
      title: { en: "Perimeter and area checklist", zh: "周界與面積清單" },
      items: [
        { en: "Decide whether the question asks around or inside.", zh: "判斷題目問外圍還是內部。" },
        { en: "Use length units for perimeter and square units for area.", zh: "周界用長度單位，面積用平方單位。" },
        { en: "Split composite shapes into rectangles.", zh: "把組合圖形分拆為長方形。" }
      ]
    },
    visualization: {
      title: { en: "Build a rectangle from unit squares", zh: "用單位正方形砌長方形" },
      content: {
        en: "Set the rows and the columns, count the squares for the area, and count the squares around the edge for the perimeter.",
        zh: "設定行數和列數，數方格得出面積，數邊上的方格得出周界。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw two different rectangles with area 24 square units.", zh: "畫出兩個面積為 24 平方單位的不同長方形。" },
        { en: "Find a composite shape around you and describe how to split it.", zh: "在身邊找一個組合圖形，並描述可如何分拆。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-fractions-operations",
    title: { en: "Fraction Operations: Common Denominators and Simplifying", zh: "分數運算：同分母與約簡" },
    description: {
      en: "Add, subtract, compare, and simplify fractions in familiar contexts.",
      zh: "在熟悉情境中加減、比較和約簡分數。"
    },
    estimatedMinutes: 34,
    concept: {
      title: { en: "Operate on equal-sized parts", zh: "在相同大小的份上運算" },
      content: {
        en: "Fractions can be added or subtracted directly when the denominators match. Simplifying keeps the same value with smaller numerator and denominator.",
        zh: "當分母相同時，分數可直接加減。約簡會用較小的分子和分母保留相同數值。"
      }
    },
    workedExample: {
      content: {
        en: `${math("\\frac{1}{4} + \\frac{2}{4} = \\frac{3}{4}")}. Also, ${math("\\frac{6}{8}")} simplifies to ${math("\\frac{3}{4}")} by dividing numerator and denominator by ${math("2")}.`,
        zh: `${math("\\frac{1}{4} + \\frac{2}{4} = \\frac{3}{4}")}。另外，${math("\\frac{6}{8}")} 的分子和分母同除以 ${math("2")}，可約簡為 ${math("\\frac{3}{4}")}。`
      }
    },
    checklist: {
      title: { en: "Fraction operations checklist", zh: "分數運算清單" },
      items: [
        { en: "Check denominators before adding or subtracting.", zh: "加減前檢查分母。" },
        { en: "Keep the denominator when parts are the same size.", zh: "份的大小相同時保留分母。" },
        { en: "Simplify when numerator and denominator share a factor.", zh: "分子和分母有共同因數時約簡。" }
      ]
    },
    visualization: {
      title: { en: "Compare fractions with bars", zh: "用分數條比較分數" },
      content: {
        en: "Set a denominator and numerator, then use the equivalent bar to see the same amount written with different numbers.",
        zh: "設定分母和分子，再用等值分數條觀察同一份量如何用不同的數表示。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Find two fractions equivalent to three quarters.", zh: "找出兩個與四分之三等值的分數。" },
        { en: "Create a recipe question that needs fraction addition.", zh: "創作一道需要分數加法的食譜題。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-volume",
    title: { en: "Volume: Cubes, Layers, Cuboids", zh: "體積：小立方體、分層、長方體" },
    description: {
      en: "Build volume from cubes and calculate cuboids.",
      zh: "由小立方體理解體積，並計算長方體體積。"
    },
    estimatedMinutes: 32,
    concept: {
      title: { en: "Volume counts cubic units", zh: "體積數立方單位" },
      content: {
        en: "Volume measures the space inside a solid. A cuboid can be counted by layers: length times width gives one layer, then multiply by height.",
        zh: "體積量度立體內部的空間。長方體可按分層計算：長乘闊是一層，再乘高。"
      }
    },
    workedExample: {
      content: {
        en: `A cuboid ${math("4")} cm long, ${math("3")} cm wide, and ${math("2")} cm high has volume ${math("4 \\times 3 \\times 2 = 24")} cm${math("^3")}.`,
        zh: `一個長 ${math("4")} 厘米、闊 ${math("3")} 厘米、高 ${math("2")} 厘米的長方體，體積是 ${math("4 \\times 3 \\times 2 = 24")} 立方厘米。`
      }
    },
    checklist: {
      title: { en: "Volume checklist", zh: "體積清單" },
      items: [
        { en: "Identify length, width, and height.", zh: "辨認長、闊和高。" },
        { en: "Use cubic units for volume.", zh: "體積使用立方單位。" },
        { en: "Check whether the answer counts cubes or surface squares.", zh: "檢查答案是數立方體還是表面方格。" }
      ]
    },
    visualization: {
      title: { en: "Count unit squares in a rectangle", zh: "數長方形中的單位方格" },
      content: {
        en: "Set the rows and the columns and count the unit squares. This is the base layer of a cuboid — stack it in your head to reach volume.",
        zh: "設定行數和列數並數出單位方格。這是長方體的底層，在腦海中把它層層疊起便得出體積。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Find two cuboids with volume 24 cubic units but different dimensions.", zh: "找出兩個體積為 24 立方單位但尺寸不同的長方體。" },
        { en: "Explain why area units are not enough for volume.", zh: "解釋為何面積單位不足以表示體積。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-rates",
    title: { en: "Rates: Compare Per One Unit", zh: "率：按每一單位比較" },
    description: {
      en: "Compare unit prices, speeds, and other rate situations.",
      zh: "比較單價、速度和其他率的情境。"
    },
    estimatedMinutes: 32,
    concept: {
      title: { en: "A rate links two units", zh: "率連繫兩種單位" },
      content: {
        en: "A rate compares one quantity with another, such as dollars per pen or kilometres per hour. Unit rates make comparisons fair.",
        zh: "率比較兩個量，例如每支筆多少元或每小時多少公里。單位率令比較更公平。"
      }
    },
    workedExample: {
      content: {
        en: "If 4 pens cost HK$ 20, the unit price is HK$ 20÷4=5 per pen. If a bike travels 60 km in 2 hours, its speed is 30 km/h.",
        zh: `若 ${math("4")} 支筆售港幣 ${math("20")} 元，單價是每支港幣 ${math("20 \\div 4 = 5")} 元。若單車 ${math("2")} 小時行 ${math("60")} 公里，速率是每小時 ${math("30")} 公里。`
      }
    },
    checklist: {
      title: { en: "Rate checklist", zh: "率清單" },
      items: [
        { en: "Name both units being compared.", zh: "說出正在比較的兩種單位。" },
        { en: "Divide to find the amount per one unit.", zh: "用除法求每一單位的數量。" },
        { en: "Choose the smaller unit rate for better price and larger speed for faster travel.", zh: "價格比較時單價較低較划算，速率比較時數值較大較快。" }
      ]
    },
    extension: {
      items: [
        { en: "Compare two supermarket offers by unit price.", zh: "用單價比較兩個超市優惠。" },
        { en: "Create a rate question where the units must be converted first.", zh: "創作一道需要先換算單位的率題目。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-charts-averages",
    title: { en: "Charts and Averages: Read Data Carefully", zh: "圖表與平均數：仔細閱讀數據" },
    description: {
      en: "Add chart categories, calculate the mean, and explain what the result says about the data.",
      zh: "加總圖表類別、計算平均數，並解釋結果對數據的意義。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Mean as fair share", zh: "平均數作公平分配" },
      content: {
        en: "The mean is the fair-share value: add all values, then divide by how many values there are. A chart total comes from reading each category accurately.",
        zh: "平均數可理解為公平分配值：把所有數值相加，再除以數值個數。圖表總數則要準確閱讀每一類。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("6, 8, 10")}, the mean is ${math("(6 + 8 + 10) \\div 3 = 8")}. If a chart has ${math("12")} sunny days and ${math("8")} rainy days, it shows ${math("20")} days in total.`,
        zh: `對 ${math("6, 8, 10")} 而言，平均數是 ${math("(6 + 8 + 10) \\div 3 = 8")}。若圖表有 ${math("12")} 天晴天和 ${math("8")} 天雨天，共顯示 ${math("20")} 天。`
      }
    },
    checklist: {
      title: { en: "Data checklist", zh: "數據清單" },
      items: [
        { en: "Read the chart scale and labels.", zh: "閱讀圖表刻度和標籤。" },
        { en: "Add all values before dividing for the mean.", zh: "求平均數前先把所有數值相加。" },
        { en: "Explain the answer in the context of the data.", zh: "用數據情境解釋答案。" }
      ]
    },
    visualization: {
      title: { en: "Compare two totals", zh: "比較兩個總數" },
      content: {
        en: "Set each bar and read the difference between them. Use it to talk about which total is larger and by how much.",
        zh: "設定兩條長條並讀出兩者的差，用來討論哪個總數較大和大多少。"
      },
      moduleId: "configured-visualization-lab",
      source: "probability"
    },
    extension: {
      items: [
        { en: "Design a chart where the mean alone does not tell the full story.", zh: "設計一個只看平均數未能說明全部情況的圖表。" },
        { en: "Explain why one very large value can change the mean.", zh: "解釋為何一個很大的數值會改變平均數。" }
      ]
    }
  }),
  lesson({
    topicId: "p6-percentages",
    title: { en: "Percentages: Fractions, Decimals, Real Contexts", zh: "百分數：分數、小數、實際情境" },
    description: {
      en: "Convert between fractions, decimals, percentages, and everyday contexts.",
      zh: "在分數、小數、百分數和日常情境之間轉換。"
    },
    estimatedMinutes: 34,
    concept: {
      title: { en: "Percent means out of 100", zh: "百分數表示以 100 為整體" },
      content: {
        en: `${math("25\\%")} means ${math("25")} out of ${math("100")}, which is ${math("0.25")} or ${math("\\frac{1}{4}")}. Percentages are useful for discounts, scores, and comparisons.`,
        zh: `${math("25\\%")} 表示 ${math("100")} 份中的 ${math("25")} 份，即 ${math("0.25")} 或 ${math("\\frac{1}{4}")}。百分數常用於折扣、分數和比較。`
      }
    },
    workedExample: {
      content: {
        en: `${math("50\\%")} means half, so ${math("50\\%")} of ${math("80")} is ${math("40")}. Also, ${math("0.25 = 25\\%")}.`,
        zh: `${math("50\\%")} 表示一半，所以 ${math("80")} 的 ${math("50\\%")} 是 ${math("40")}。另外，${math("0.25 = 25\\%")}。`
      }
    },
    checklist: {
      title: { en: "Percentage checklist", zh: "百分數清單" },
      items: [
        { en: "Convert to a friendly fraction or decimal.", zh: "轉換成容易處理的分數或小數。" },
        { en: "Identify the whole before calculating a percentage.", zh: "計算百分數前先辨認整體。" },
        { en: "Check whether the answer is an amount or a percent.", zh: "檢查答案是數量還是百分數。" }
      ]
    },
    visualization: {
      title: { en: "Read a fraction as a percentage", zh: "把分數讀成百分數" },
      content: {
        en: "Set the denominator and numerator, then read the same amount as a fraction, an equivalent fraction, and a percentage of the whole bar.",
        zh: "設定分母和分子，再把同一份量讀成分數、等值分數，以及佔整條的百分數。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Compare a 20% discount with a fixed HK$30 discount for two prices.", zh: "用兩個價格比較八折和減港幣 30 元哪個較優惠。" },
        { en: "Explain why 100% increase means doubling.", zh: "解釋為何增加 100% 表示變成兩倍。" }
      ]
    }
  }),
  lesson({
    topicId: "p6-ratio-proportion",
    title: { en: "Ratio and Proportion: Scale and Share", zh: "比例與正反比：縮放與分配" },
    description: {
      en: "Scale quantities, share in a ratio, and reason proportionally.",
      zh: "按比例縮放、按比分配，並作比例推理。"
    },
    estimatedMinutes: 36,
    concept: {
      title: { en: "Ratio keeps relationships", zh: "比例保留關係" },
      content: {
        en: "A ratio compares parts. Equivalent ratios use the same multiplier, so the relationship stays the same even when the quantities grow or shrink.",
        zh: "比用來比較各部分。等值比使用相同倍數，即使數量增加或減少，關係仍保持不變。"
      }
    },
    workedExample: {
      content: {
        en: `Share ${math("30")} in the ratio ${math("2:3")}. There are ${math("5")} parts, so one part is ${math("30 \\div 5 = 6")}. The shares are ${math("12")} and ${math("18")}.`,
        zh: `把 ${math("30")} 按 ${math("2:3")} 分配。共有 ${math("5")} 份，每份是 ${math("30 \\div 5 = 6")}。兩份分別是 ${math("12")} 和 ${math("18")}。`
      }
    },
    checklist: {
      title: { en: "Ratio and proportion checklist", zh: "比例清單" },
      items: [
        { en: "Add ratio parts before sharing a total.", zh: "分配總量前先加總比的份數。" },
        { en: "Use the same multiplier for equivalent ratios.", zh: "等值比每項使用相同倍數。" },
        { en: "Keep units when the ratio comes from context.", zh: "情境題中的比要保留單位。" }
      ]
    },
    extension: {
      items: [
        { en: "Scale a recipe for twice as many people and explain the multiplier.", zh: "把食譜按兩倍人數縮放，並解釋倍數。" },
        { en: "Create one direct proportion and one inverse proportion situation.", zh: "創作一個正比和一個反比情境。" }
      ]
    }
  }),
  lesson({
    topicId: "p6-speed",
    title: { en: "Speed: Distance, Time, and Graphs", zh: "速率：距離、時間與圖像" },
    description: {
      en: "Connect speed to distance divided by time, then prepare for distance-time graph reading.",
      zh: "把速率連繫到距離除以時間，並準備閱讀距離時間圖。"
    },
    estimatedMinutes: 34,
    concept: {
      title: { en: "Speed links two quantities", zh: "速率連繫兩個量" },
      content: {
        en: `Speed tells how much distance is travelled in each unit of time. The basic relationship is ${math("\\text{speed} = \\text{distance} \\div \\text{time}")}.`,
        zh: `速率表示每單位時間行了多少距離。基本關係是 ${math("\\text{速率} = \\text{距離} \\div \\text{時間}")}。`
      }
    },
    workedExample: {
      content: {
        en: `A train travels ${math("90")} km in ${math("3")} hours, so its speed is ${math("90 \\div 3 = 30")} km/h. At ${math("5")} km/h for ${math("2")} hours, the distance is ${math("5 \\times 2 = 10")} km.`,
        zh: `火車 ${math("3")} 小時行 ${math("90")} 公里，速率是 ${math("90 \\div 3 = 30")} 公里每小時。若以每小時 ${math("5")} 公里行 ${math("2")} 小時，距離是 ${math("5 \\times 2 = 10")} 公里。`
      }
    },
    checklist: {
      title: { en: "Speed checklist", zh: "速率清單" },
      items: [
        { en: "Identify distance and time first.", zh: "先辨認距離和時間。" },
        { en: "Keep time units consistent.", zh: "時間單位要一致。" },
        { en: "Check whether the answer should be distance, time, or speed.", zh: "檢查答案應是距離、時間還是速率。" }
      ]
    },
    visualization: {
      title: { en: "Read a rate from an array", zh: "從陣列讀出比率" },
      content: {
        en: "Set the rows and the columns and read the total. Treat one side as time and the other as distance covered each unit, so the total is the distance travelled.",
        zh: "設定行數和列數並讀出總數。把一邊當作時間、另一邊當作每單位時間的路程，總數便是行走的距離。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Sketch a simple distance-time graph for walking, stopping, then walking again.", zh: "畫出先步行、停下、再步行的簡單距離時間圖。" },
        { en: "Explain why km/h and m/min cannot be compared before converting units.", zh: "解釋為何公里每小時和米每分鐘要先換算才可比較。" }
      ]
    }
  }),
  lesson({
    topicId: "p6-pre-secondary-problem-solving",
    title: { en: "Pre-secondary Problem Solving: Plan Multi-step Questions", zh: "升中解難：規劃多步驟題目" },
    description: {
      en: "Plan multi-step questions using diagrams, tables, and clear checking.",
      zh: "用圖、表和清晰檢查規劃多步驟題目。"
    },
    estimatedMinutes: 38,
    concept: {
      title: { en: "Solve by representing first", zh: "先表示，再解題" },
      content: {
        en: "Unfamiliar problems become easier when the known facts, target, and relationships are represented in a diagram, table, or equation.",
        zh: "陌生題若先用圖、表或算式表示已知資料、目標和關係，便更容易處理。"
      }
    },
    workedExample: {
      content: {
        en: `A floor has ${math("6 \\times 8 = 48")} tiles. If ${math("10")} are blue, then ${math("48 - 10 = 38")} are not blue. The first step was finding the hidden total.`,
        zh: `地面共有 ${math("6 \\times 8 = 48")} 塊磚。若其中 ${math("10")} 塊是藍色，則非藍色有 ${math("48 - 10 = 38")} 塊。第一步是找出隱藏總數。`
      }
    },
    checklist: {
      title: { en: "Problem-solving checklist", zh: "解難清單" },
      items: [
        { en: "Underline known facts and the target.", zh: "劃出已知資料和目標。" },
        { en: "Choose a diagram, table, or equation before calculating.", zh: "計算前先選擇圖、表或算式。" },
        { en: "Check whether every step answers part of the question.", zh: "檢查每一步是否回應題目的一部分。" }
      ]
    },
    extension: {
      items: [
        { en: "Rewrite a word problem as a table before solving it.", zh: "解題前先把文字題改寫成表格。" },
        { en: "Create a two-step problem where the first answer is not the final answer.", zh: "創作一道第一步答案不是最終答案的兩步題。" }
      ]
    }
  }),
  lesson({
    topicId: "integers",
    title: { en: "Integers: Direction, Zero, and Operations", zh: "整數：方向、零與運算" },
    description: {
      en: "Visualize negative numbers, operations, and movement on a number line.",
      zh: "透過數線視覺化負數、運算與移動。"
    },
    estimatedMinutes: 25,
    concept: {
      title: { en: "Signs show direction from zero", zh: "正負號表示相對於零的方向" },
      content: {
        en: "Positive numbers are to the right of zero and negative numbers are to the left. Adding moves right; subtracting can be seen as moving left.",
        zh: "正數在零的右方，負數在零的左方。加法可視為向右移，減法可視為向左移。"
      }
    },
    workedExample: {
      content: {
        en: `Starting at ${math("-3")} and adding ${math("8")} means move ${math("8")} steps right. The landing point is ${math("5")}, so ${math("-3 + 8 = 5")}.`,
        zh: `由 ${math("-3")} 開始加 ${math("8")}，即向右移 ${math("8")} 格，最後到達 ${math("5")}，所以 ${math("-3 + 8 = 5")}。`
      }
    },
    checklist: {
      title: { en: "Integer checklist", zh: "整數清單" },
      items: [
        { en: "Mark zero before locating the number.", zh: "定位數字前先標示零。" },
        { en: "Use right for adding positive values.", zh: "加正數時向右移。" },
        { en: "Check whether the final point is left or right of zero.", zh: "檢查終點在零的左方還是右方。" }
      ]
    },
    visualization: {
      title: { en: "Read positions on a number line", zh: "讀出數線上的位置" },
      content: {
        en: "Set the two ends of the line and read the marked positions and the gap between them, then order them from smallest to largest.",
        zh: "設定數線兩端，讀出標示的位置和兩者之間的距離，再由小至大排序。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Explain a temperature change from -2 degrees to 5 degrees.", zh: "解釋溫度由零下 2 度變為 5 度的變化。" },
        { en: "Create two different integer sums with answer -4.", zh: "創作兩道答案為 -4 的整數加法題。" }
      ]
    }
  }),
  lesson({
    topicId: "algebra-basics",
    title: { en: "Algebra Basics: Expressions and Simple Equations", zh: "代數基礎：代數式與簡單方程" },
    description: {
      en: "Translate patterns into expressions and solve simple equations.",
      zh: "把規律轉化為代數式，並解簡單方程。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Letters can stand for numbers", zh: "字母可代表數" },
      content: {
        en: "A variable represents a number that may change or be unknown. Like terms can be combined when they have the same variable part.",
        zh: "變量代表可能改變或未知的數。同類項有相同變量部分，因此可以合併。"
      }
    },
    workedExample: {
      content: {
        en: `${math("3x + 2x")} has like terms, so add the coefficients: ${math("3x + 2x = 5x")}. If ${math("x + 4 = 9")}, then ${math("x = 5")}.`,
        zh: `${math("3x + 2x")} 是同類項，所以把係數相加：${math("3x + 2x = 5x")}。若 ${math("x + 4 = 9")}，則 ${math("x = 5")}。`
      }
    },
    checklist: {
      title: { en: "Algebra checklist", zh: "代數清單" },
      items: [
        { en: "Identify what the variable represents.", zh: "辨認變量代表甚麼。" },
        { en: "Combine only like terms.", zh: "只合併同類項。" },
        { en: "Check an equation by substituting the answer.", zh: "用代入答案檢查方程。" }
      ]
    },
    extension: {
      items: [
        { en: "Write an expression for a pattern that grows by 3 each step.", zh: "為每步增加 3 的規律寫出代數式。" },
        { en: "Create a one-step equation from a Hong Kong transport fare context.", zh: "用香港交通費情境創作一道一步方程。" }
      ]
    }
  }),
  lesson({
    topicId: "angles",
    title: { en: "Angles: Lines, Triangles, and Missing Values", zh: "角：直線、三角形與未知角" },
    description: {
      en: "Use angle facts to move from a diagram to a short, justified calculation.",
      zh: "運用角的性質，把圖形資料轉化為有理據的簡短計算。"
    },
    estimatedMinutes: 35,
    concept: {
      title: { en: "Core angle facts", zh: "核心角度性質" },
      content: {
        en: `Angles on a straight line add to ${math("180^\\circ")}, angles around a point add to ${math("360^\\circ")}, and the three interior angles of a triangle add to ${math("180^\\circ")}. In a diagram, mark each fact beside the line or triangle that justifies it.`,
        zh: `一直線上的角和為 ${math("180^\\circ")}，一點周圍的角和為 ${math("360^\\circ")}，三角形內角和為 ${math("180^\\circ")}。在圖中應把每個性質標在相關直線或三角形旁。`
      }
    },
    workedExample: {
      content: {
        en: `If two angles on a straight line are ${math("65^\\circ")} and ${math("x^\\circ")}, then ${math("x = 180 - 65 = 115")}. The reason is the straight-line angle fact, not a visual guess from the drawing.`,
        zh: `若一直線上的兩個角為 ${math("65^\\circ")} 和 ${math("x^\\circ")}，則 ${math("x = 180 - 65 = 115")}。理由是一直線角和的性質，而不是憑圖估計。`
      }
    },
    checklist: {
      title: { en: "Angle reasoning checklist", zh: "角度推理清單" },
      items: [
        { en: "Circle the straight line, point, or triangle being used.", zh: "圈出使用中的直線、一點或三角形。" },
        { en: "Write the sum fact before calculating.", zh: "先寫出角和性質，再計算。" },
        { en: "Check whether the answer is acute, right, obtuse, or reflex.", zh: "檢查答案屬銳角、直角、鈍角還是反角。" }
      ]
    },
    visualization: {
      title: { en: "Compare and combine two angles", zh: "比較並合併兩個角" },
      content: {
        en: "Set each angle in fifteen-degree steps, then read their difference and their sum to test complementary and supplementary pairs.",
        zh: "以十五度為一步設定每個角，再讀出兩角的差和和，檢驗互餘和互補的關係。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Add one auxiliary line and name the new angle facts it creates.", zh: "加入一條輔助線，並說出新產生的角度性質。" },
        { en: "Explain why a neat-looking diagram can still be misleading.", zh: "解釋為何看似準確的圖形仍可能誤導。" }
      ]
    }
  }),
  lesson({
    topicId: "ratios",
    title: { en: "Ratios: Sharing, Scaling, and Unit Rates", zh: "比與率：分配、縮放與單位率" },
    description: {
      en: "Represent a ratio as parts, a multiplier, and a rate so context questions stay organized.",
      zh: "把比表示為份數、倍數和率，令應用題的資料更有條理。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Ratio as parts", zh: "以份數理解比" },
      content: {
        en: `A ratio such as ${math("2:3")} describes ${math("5")} equal parts in total. The actual size of one part depends on the context, so the same ratio can describe money, length, time, or quantity.`,
        zh: `例如 ${math("2:3")} 表示總共有 ${math("5")} 份相等的部分。每份的實際大小由情境決定，所以同一個比可描述金錢、長度、時間或數量。`
      }
    },
    workedExample: {
      content: {
        en: `Share ${math("60")} in the ratio ${math("2:3")}. There are ${math("5")} parts, so one part is ${math("60 / 5 = 12")}. The two shares are ${math("2 \\times 12 = 24")} and ${math("3 \\times 12 = 36")}.`,
        zh: `把 ${math("60")} 按 ${math("2:3")} 分配。總份數為 ${math("5")}，每份是 ${math("60 / 5 = 12")}。兩份分別是 ${math("2 \\times 12 = 24")} 和 ${math("3 \\times 12 = 36")}。`
      }
    },
    checklist: {
      title: { en: "Ratio checklist", zh: "比的清單" },
      items: [
        { en: "Add the parts before sharing a total.", zh: "分配總量前先加總份數。" },
        { en: "Keep units attached to the final answer.", zh: "在最終答案保留單位。" },
        { en: "Use the same multiplier on every part when scaling.", zh: "縮放時每一項都使用同一倍數。" }
      ]
    },
    extension: {
      items: [
        { en: `Compare ${math("2:3")} with ${math("4:6")} and explain why they are equivalent.`, zh: `比較 ${math("2:3")} 和 ${math("4:6")}，解釋它們為何等值。` },
        { en: "Create a unit-rate question from a Hong Kong transport or shopping context.", zh: "用香港交通或購物情境設計一道單位率題目。" }
      ]
    }
  }),
  lesson({
    topicId: "statistics-s1",
    title: { en: "Statistics: Charts, Averages, Variation", zh: "統計：圖表、平均數、變異" },
    description: {
      en: "Read charts, compare averages, and interpret how spread affects a data story.",
      zh: "閱讀圖表、比較平均數，並理解數據分散程度如何影響結論。"
    },
    estimatedMinutes: 32,
    concept: {
      title: { en: "Data needs context", zh: "數據需要情境" },
      content: {
        en: "A chart organizes data so patterns are visible. The mean summarizes a typical value, but the spread shows whether the values are close together or varied.",
        zh: "圖表整理數據，令規律更容易看見。平均數概括典型數值，而分散程度顯示數值是否接近或差異大。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("4, 7, 10")}, the mean is ${math("\\frac{4 + 7 + 10}{3} = 7")}. The values are spread around ${math("7")}, so the mean should be interpreted with the range.`,
        zh: `對 ${math("4, 7, 10")} 而言，平均數是 ${math("\\frac{4 + 7 + 10}{3} = 7")}。數值分散在 ${math("7")} 附近，所以平均數應與範圍一起解讀。`
      }
    },
    checklist: {
      title: { en: "Statistics checklist", zh: "統計清單" },
      items: [
        { en: "Read chart titles, labels, and scale first.", zh: "先閱讀圖表標題、標籤和刻度。" },
        { en: "Add all values before finding the mean.", zh: "求平均數前先加總所有數值。" },
        { en: "Compare spread before making a claim.", zh: "作結論前先比較分散程度。" }
      ]
    },
    extension: {
      items: [
        { en: "Create two data sets with the same mean but different spread.", zh: "建立兩組平均數相同但分散程度不同的數據。" },
        { en: "Explain one misleading chart scale.", zh: "解釋一個可能誤導讀者的圖表刻度。" }
      ]
    }
  }),
  lesson({
    topicId: "linear-equations",
    title: { en: "Linear Equations: Balance and Inverse Steps", zh: "一次方程：平衡與逆運算" },
    description: {
      en: "Solve equations by preserving balance and checking the solution.",
      zh: "保持等式平衡來解方程，並檢查答案。"
    },
    estimatedMinutes: 35,
    concept: {
      title: { en: "An equation stays balanced", zh: "方程要保持平衡" },
      content: {
        en: "The two sides of an equation are equal. Whatever operation is done to one side must also be done to the other side.",
        zh: "方程兩邊相等。對一邊做的運算，也必須對另一邊做相同運算。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("2x + 5 = 13")}, subtract ${math("5")} from both sides to get ${math("2x = 8")}. Divide by ${math("2")}, so ${math("x = 4")}.`,
        zh: `對於 ${math("2x + 5 = 13")}，兩邊同減 ${math("5")} 得 ${math("2x = 8")}。再除以 ${math("2")}，所以 ${math("x = 4")}。`
      }
    },
    checklist: {
      title: { en: "Equation checklist", zh: "方程清單" },
      items: [
        { en: "Undo addition or subtraction before multiplication or division when appropriate.", zh: "按需要先處理加減，再處理乘除。" },
        { en: "Do the same operation to both sides.", zh: "兩邊做相同運算。" },
        { en: "Substitute the answer to check the original equation.", zh: "把答案代回原方程檢查。" }
      ]
    },
    extension: {
      items: [
        { en: "Create an equation whose answer is x = -2.", zh: "創作一道答案為 x = -2 的方程。" },
        { en: "Explain why dividing only one side breaks the balance.", zh: "解釋為何只除一邊會破壞平衡。" }
      ]
    }
  }),
  lesson({
    topicId: "coordinates",
    title: { en: "Coordinates: Points, Quadrants, Lines", zh: "坐標：點、象限、直線" },
    description: {
      en: "Plot points, read quadrants, and connect coordinate movement to simple lines.",
      zh: "標示點、閱讀象限，並把坐標移動連繫到簡單直線。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Coordinates give an address", zh: "坐標是位置地址" },
      content: {
        en: `A point ${math("(x, y)")} is found by moving horizontally first, then vertically. The signs of ${math("x")} and ${math("y")} determine the quadrant.`,
        zh: `點 ${math("(x, y)")} 先按水平位置，再按垂直位置定位。${math("x")} 和 ${math("y")} 的正負決定象限。`
      }
    },
    workedExample: {
      content: {
        en: `${math("(3, -2)")} has positive ${math("x")} and negative ${math("y")}, so it lies in Quadrant IV. Point ${math("(-3, 2)")} is ${math("3")} units left and ${math("2")} units up.`,
        zh: `${math("(3, -2)")} 的 ${math("x")} 為正、${math("y")} 為負，所以位於第四象限。點 ${math("(-3, 2)")} 在左方 ${math("3")} 格、上方 ${math("2")} 格。`
      }
    },
    checklist: {
      title: { en: "Coordinate checklist", zh: "坐標清單" },
      items: [
        { en: "Read x before y.", zh: "先讀 x，再讀 y。" },
        { en: "Use signs to choose the quadrant.", zh: "用正負號判斷象限。" },
        { en: "Check horizontal and vertical movement separately.", zh: "分開檢查水平和垂直移動。" }
      ]
    },
    visualization: {
      title: { en: "Plot a point and move a figure", zh: "標示點並移動圖形" },
      content: {
        en: "Enter a point by its coordinates, then translate the triangle and compare each vertex with its image.",
        zh: "以坐標輸入一點，再平移三角形，並比較每個頂點和它的像。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Draw a triangle from three coordinate points and name its vertices.", zh: "用三個坐標點畫三角形，並命名頂點。" },
        { en: "Find a point in each quadrant with the same distance from the origin horizontally and vertically.", zh: "在每個象限找一個水平和垂直距離相同的點。" }
      ]
    }
  }),
  lesson({
    topicId: "transformations",
    title: { en: "Transformations: Move Shapes with Rules", zh: "變換：用規則移動圖形" },
    description: {
      en: "Connect translation, reflection, rotation, and enlargement to coordinate rules.",
      zh: "把平移、反射、旋轉和放大連繫到坐標規則。"
    },
    estimatedMinutes: 40,
    concept: {
      title: { en: "Transformation rules", zh: "變換規則" },
      content: {
        en: "A transformation sends each original point to an image point. Translation adds the same vector, reflection changes position across a mirror line, rotation turns around a centre, and enlargement scales distances from a centre.",
        zh: "變換會把每個原像點對應到影像點。平移加入同一向量，反射使點跨過鏡線，旋轉圍繞中心轉動，放大則按中心縮放距離。"
      }
    },
    workedExample: {
      content: {
        en: `Reflect ${math("(3, -2)")} in the ${math("y")}-axis. The ${math("y")}-coordinate stays ${math("-2")} and the ${math("x")}-coordinate changes sign, so the image is ${math("(-3, -2)")}.`,
        zh: `把 ${math("(3, -2)")} 關於 ${math("y")} 軸反射。${math("y")} 坐標保持 ${math("-2")}，${math("x")} 坐標改變符號，所以影像是 ${math("(-3, -2)")}。`
      }
    },
    checklist: {
      title: { en: "Transformation checklist", zh: "變換清單" },
      items: [
        { en: "Label original and image points clearly.", zh: "清楚標示原像點和影像點。" },
        { en: "State the mirror line, vector, centre, or scale factor.", zh: "寫出鏡線、向量、中心或比例因子。" },
        { en: "Check one point with coordinates after drawing.", zh: "作圖後用一個點的坐標檢查。" }
      ]
    },
    visualization: {
      title: { en: "Translate, reflect, and dilate", zh: "平移、反射與放縮" },
      content: {
        en: "Switch between the three transformations and compare each vertex with its image. Points on the mirror line stay put, and so does the centre of a dilation.",
        zh: "在三種變換之間切換，比較每個頂點和它的像。鏡像線上的點不會移動，放縮的中心亦然。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Combine a translation and reflection, then describe the final image.", zh: "結合一次平移和一次反射，並描述最終影像。" },
        { en: "Explain which transformations preserve size and which can change it.", zh: "解釋哪些變換保持大小，哪些可能改變大小。" }
      ]
    }
  }),
  lesson({
    topicId: "probability-s2",
    title: { en: "Probability: Theory and Simulation", zh: "概率：理論與模擬" },
    description: {
      en: "Compare expected probability with experimental results from repeated trials.",
      zh: "比較理論概率與重複試驗所得的實驗結果。"
    },
    estimatedMinutes: 34,
    concept: {
      title: { en: "Theoretical and experimental probability", zh: "理論概率與實驗概率" },
      content: {
        en: "Theoretical probability uses equally likely outcomes before an experiment. Experimental probability uses collected results after trials. With more trials, the experimental result often gets closer to the theoretical value.",
        zh: "理論概率在試驗前根據等可能結果計算；實驗概率則在試驗後根據收集到的結果計算。試驗次數越多，實驗結果通常越接近理論值。"
      }
    },
    workedExample: {
      content: {
        en: `A fair die has ${math("6")} outcomes. The even outcomes are ${math("2, 4, 6")}, so ${math(String.raw`P(\text{even}) = \frac{3}{6} = \frac{1}{2}`)}.`,
        zh: `公平骰子有 ${math("6")} 個結果。偶數結果為 ${math("2, 4, 6")}，所以 ${math(String.raw`P(\text{偶數}) = \frac{3}{6} = \frac{1}{2}`)}。`
      }
    },
    checklist: {
      title: { en: "Probability checklist", zh: "概率清單" },
      items: [
        { en: "List the sample space.", zh: "列出樣本空間。" },
        { en: "Count favourable outcomes.", zh: "數出有利結果。" },
        { en: "Compare the fraction with simulation data.", zh: "把分數與模擬數據比較。" }
      ]
    },
    visualization: {
      title: { en: "Record outcomes and read the probability", zh: "記錄結果並讀出概率" },
      content: {
        en: "Set how many successes and how many failures were recorded, then read P(success) as a fraction of all trials, and as a decimal and a percentage.",
        zh: "設定記錄到的成功和失敗次數，再把 P(成功) 讀成佔全部試驗的分數，以及小數和百分數。"
      },
      moduleId: "configured-visualization-lab",
      source: "probability"
    },
    extension: {
      items: [
        { en: "Predict how 100 die rolls should compare with 10 die rolls.", zh: "預測擲骰 100 次與 10 次的結果應如何比較。" },
        { en: "Design an unfair spinner and explain how its probabilities change.", zh: "設計一個不公平轉盤，並解釋概率如何改變。" }
      ]
    }
  }),
  lesson({
    topicId: "polynomials",
    title: { en: "Polynomials: Expand, Factor, Recognize Structure", zh: "多項式：展開、因式分解、辨識結構" },
    description: {
      en: "Factor, expand, and recognize algebraic structure in polynomial expressions.",
      zh: "在多項式中進行因式分解、展開並辨識代數結構。"
    },
    estimatedMinutes: 42,
    concept: {
      title: { en: "Structure guides the method", zh: "結構決定方法" },
      content: {
        en: "Expanding removes brackets by multiplying each term. Factoring reverses the process by identifying common factors or products that create the expression.",
        zh: "展開是逐項相乘以去括號。因式分解則是反向過程，要找出公因式或能產生該式的乘積。"
      }
    },
    workedExample: {
      content: {
        en: `${math("(x + 2)(x + 3) = x^2 + 2x + 3x + 6 = x^2 + 5x + 6")}. The middle coefficient ${math("5")} comes from adding ${math("2")} and ${math("3")}.`,
        zh: `${math("(x + 2)(x + 3) = x^2 + 2x + 3x + 6 = x^2 + 5x + 6")}。中間項係數 ${math("5")} 來自 ${math("2")} 和 ${math("3")} 相加。`
      }
    },
    checklist: {
      title: { en: "Polynomial checklist", zh: "多項式清單" },
      items: [
        { en: "Look for a common factor first.", zh: "先尋找公因式。" },
        { en: "Multiply every term when expanding brackets.", zh: "展開括號時每一項都要相乘。" },
        { en: "Check factoring by expanding back.", zh: "用重新展開檢查因式分解。" }
      ]
    },
    extension: {
      items: [
        { en: "Find two different products that expand to expressions with four terms before collecting like terms.", zh: "找出兩個展開後合併同類項前有四項的乘積。" },
        { en: "Explain how polynomial structure prepares for quadratic graphs.", zh: "解釋多項式結構如何為二次圖像作準備。" }
      ]
    }
  }),
  lesson({
    topicId: "quadratic-patterns",
    title: { en: "Quadratic Functions: Shape, Vertex, and Intercepts", zh: "二次函數：形狀、頂點與截距" },
    description: {
      en: "Connect tables, graphs, vertex form, symmetry, and intercepts using a live function explorer.",
      zh: "透過即時函數圖像工具，連繫數表、圖像、頂點式、對稱和截距。"
    },
    estimatedMinutes: 45,
    concept: {
      title: { en: "How coefficients shape a parabola", zh: "係數如何改變拋物線" },
      content: {
        en: `A quadratic function can be written as ${math("y = ax^2 + bx + c")}. The sign of ${math("a")} controls whether the parabola opens upward or downward. The vertex is the turning point, and the axis of symmetry is ${math(String.raw`x = -\frac{b}{2a}`)}.`,
        zh: `二次函數可寫成 ${math("y = ax^2 + bx + c")}。${math("a")} 的正負決定拋物線向上或向下開口。頂點是轉折點，對稱軸是 ${math(String.raw`x = -\frac{b}{2a}`)}。`
      }
    },
    workedExample: {
      content: {
        en: `For ${math("y = x^2 - 4x + 3")}, the axis of symmetry is ${math(String.raw`x = -\frac{-4}{2\cdot1} = 2`)}. Substitute ${math("x = 2")}: ${math("y = 4 - 8 + 3 = -1")}. The vertex is ${math("(2, -1)")}, and the roots ${math("1")} and ${math("3")} are symmetric around ${math("x=2")}.`,
        zh: `對於 ${math("y = x^2 - 4x + 3")}，對稱軸是 ${math(String.raw`x = -\frac{-4}{2\cdot1} = 2`)}。代入 ${math("x = 2")}：${math("y = 4 - 8 + 3 = -1")}。頂點是 ${math("(2, -1)")}，根 ${math("1")} 和 ${math("3")} 以 ${math("x=2")} 為中心對稱。`
      }
    },
    checklist: {
      title: { en: "Quadratic graph checklist", zh: "二次圖像清單" },
      items: [
        { en: `Identify ${math("a")}, ${math("b")}, and ${math("c")}.`, zh: `辨認 ${math("a")}、${math("b")} 和 ${math("c")}。` },
        { en: "Predict the opening direction before plotting.", zh: "繪圖前先預測開口方向。" },
        { en: "Find the vertex and use symmetry to check roots.", zh: "找出頂點，並用對稱檢查根。" }
      ]
    },
    visualization: {
      title: { en: "Change a and c on a parabola", zh: "改變拋物線的 a 和 c" },
      content: {
        en: "Adjust the coefficient a and the constant c in y = ax² + c, and describe how the width, direction and intercepts change. The axis of symmetry stays on the y-axis.",
        zh: "調整 y = ax² + c 中的係數 a 和常數 c，描述闊度、開口方向和截距如何改變。對稱軸固定在 y 軸上。"
      },
      moduleId: "configured-visualization-lab",
      source: "function-graph"
    },
    extension: {
      items: [
        { en: "Create two quadratics with the same roots but different opening widths.", zh: "建立兩個根相同但開口寬度不同的二次函數。" },
        { en: "Explain how the graph changes when every output is increased by 3.", zh: "解釋每個輸出值增加 3 時圖像如何改變。" }
      ]
    }
  }),
  lesson({
    topicId: "trigonometry-basics",
    title: { en: "Trigonometry Basics: Sine, Cosine, and Tangent", zh: "三角比基礎：正弦、餘弦與正切" },
    description: {
      en: "Build SOH-CAH-TOA from a labelled right triangle before calculating sides or angles.",
      zh: "先由已標示的直角三角形建立 SOH-CAH-TOA，再計算邊或角。"
    },
    estimatedMinutes: 48,
    concept: {
      title: { en: "Label sides before choosing a ratio", zh: "選三角比前先標示三邊" },
      content: {
        en: `For an angle ${math(String.raw`\theta`)} in a right triangle, the hypotenuse is opposite the right angle. The opposite side is across from ${math(String.raw`\theta`)}, and the adjacent side touches ${math(String.raw`\theta`)}. Then ${math(String.raw`\sin\theta=\frac{\text{opposite}}{\text{hypotenuse}}`)}, ${math(String.raw`\cos\theta=\frac{\text{adjacent}}{\text{hypotenuse}}`)}, and ${math(String.raw`\tan\theta=\frac{\text{opposite}}{\text{adjacent}}`)}.`,
        zh: `在直角三角形中，斜邊是直角對面的邊。對邊是角 ${math(String.raw`\theta`)} 對面的邊，鄰邊則貼着角 ${math(String.raw`\theta`)}。因此 ${math(String.raw`\sin\theta=\frac{\text{對邊}}{\text{斜邊}}`)}、${math(String.raw`\cos\theta=\frac{\text{鄰邊}}{\text{斜邊}}`)}、${math(String.raw`\tan\theta=\frac{\text{對邊}}{\text{鄰邊}}`)}。`
      }
    },
    workedExample: {
      content: {
        en: `If the opposite side is ${math("3")} and the hypotenuse is ${math("5")}, use sine because it connects opposite and hypotenuse: ${math(String.raw`\sin\theta=\frac{3}{5}`)}. If the adjacent side is ${math("4")}, then ${math(String.raw`\cos\theta=\frac{4}{5}`)} and ${math(String.raw`\tan\theta=\frac{3}{4}`)}.`,
        zh: `若對邊為 ${math("3")}、斜邊為 ${math("5")}，應使用連繫對邊和斜邊的正弦：${math(String.raw`\sin\theta=\frac{3}{5}`)}。若鄰邊為 ${math("4")}，則 ${math(String.raw`\cos\theta=\frac{4}{5}`)}、${math(String.raw`\tan\theta=\frac{3}{4}`)}。`
      }
    },
    checklist: {
      title: { en: "Trigonometry checklist", zh: "三角比清單" },
      items: [
        { en: "Mark the angle being used.", zh: "標示正在使用的角。" },
        { en: "Label opposite, adjacent, and hypotenuse from that angle.", zh: "由該角出發標示對邊、鄰邊和斜邊。" },
        { en: "Choose SOH, CAH, or TOA only after labelling.", zh: "標示後才選 SOH、CAH 或 TOA。" }
      ]
    },
    extension: {
      items: [
        { en: "Explain why the opposite and adjacent sides swap when the reference angle changes.", zh: "解釋為何參考角改變時，對邊和鄰邊會互換。" },
        { en: "Create a real height or distance problem that uses one trigonometric ratio.", zh: "設計一道使用一個三角比的實際高度或距離題。" }
      ]
    }
  }),
  lesson({
    topicId: "circles",
    title: { en: "Circles: Chords, Tangents, Arcs, Angles", zh: "圓：弦、切線、弧與角" },
    description: {
      en: "Investigate circle vocabulary and angle relationships around arcs, chords, and tangents.",
      zh: "探究圓的詞彙，以及弧、弦和切線附近的角度關係。"
    },
    estimatedMinutes: 44,
    concept: {
      title: { en: "Circle facts connect lines and arcs", zh: "圓的性質連繫線和弧" },
      content: {
        en: "A radius joins the centre to the circle. A tangent touches the circle at one point, and angle theorems use relationships between arcs, chords, and points on the circumference.",
        zh: "半徑連接圓心和圓周。切線只在一點接觸圓，而圓的角度定理會運用弧、弦和圓周上點的關係。"
      }
    },
    workedExample: {
      content: {
        en: `If an angle at the centre standing on an arc is ${math("100^\\circ")}, the angle at the circumference on the same arc is half of it: ${math("50^\\circ")}.`,
        zh: `若同弧所對的圓心角是 ${math("100^\\circ")}，則同弧所對的圓周角是它的一半，即 ${math("50^\\circ")}。`
      }
    },
    checklist: {
      title: { en: "Circle theorem checklist", zh: "圓定理清單" },
      items: [
        { en: "Name the chord, tangent, centre, or arc involved.", zh: "說出涉及的弦、切線、圓心或弧。" },
        { en: "Match the diagram to a known circle theorem.", zh: "把圖形配對到已知圓定理。" },
        { en: "Check whether the angle is at the centre or circumference.", zh: "檢查角是在圓心還是在圓周。" }
      ]
    },
    extension: {
      items: [
        { en: "Draw a circle diagram where two different theorems are needed.", zh: "畫出一個需要使用兩個不同圓定理的圖形。" },
        { en: "Explain how a tangent differs from a chord.", zh: "解釋切線和弦有何不同。" }
      ]
    }
  }),
  lesson({
    topicId: "functions",
    title: { en: "Functions: Inputs, Outputs, and Model Shape", zh: "函數：輸入、輸出與模型形狀" },
    description: {
      en: "Read a function as a rule, a table, and a graph so model choice becomes visible.",
      zh: "從規則、數表和圖像理解函數，令模型選擇變得可見。"
    },
    estimatedMinutes: 45,
    concept: {
      title: { en: "Function as a rule", zh: "函數作為規則" },
      content: {
        en: "A function assigns one output to each allowed input. A formula, table, graph, or mapping diagram can show the same function from different viewpoints.",
        zh: "函數會為每個可接受的輸入指定一個輸出。公式、數表、圖像和映射圖都可從不同角度表示同一函數。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("f(x) = 2x - 1")}, ${math("f(4)")} means substitute ${math("x = 4")}. Therefore ${math("f(4) = 2(4) - 1 = 7")}.`,
        zh: `對於 ${math("f(x) = 2x - 1")}，${math("f(4)")} 表示代入 ${math("x = 4")}。因此 ${math("f(4) = 2(4) - 1 = 7")}。`
      }
    },
    checklist: {
      title: { en: "Function checklist", zh: "函數清單" },
      items: [
        { en: "Identify the input variable and output variable.", zh: "辨認輸入變量和輸出變量。" },
        { en: "Substitute brackets carefully.", zh: "小心處理代入時的括號。" },
        { en: "Compare the graph shape with the formula family.", zh: "把圖像形狀與公式類型比較。" }
      ]
    },
    visualization: {
      title: { en: "Read a graph as an input-output rule", zh: "把圖像讀成輸入輸出規則" },
      content: {
        en: "Adjust y = ax² + c and trace how each input is sent to exactly one output, which is what makes the rule a function.",
        zh: "調整 y = ax² + c，追蹤每個輸入如何對應唯一一個輸出，這正是規則成為函數的條件。"
      },
      moduleId: "configured-visualization-lab",
      source: "function-graph"
    },
    extension: {
      items: [
        { en: "Represent one function as a formula, table, and graph.", zh: "用公式、數表和圖像表示同一函數。" },
        { en: "Explain why a relation with two outputs for one input is not a function.", zh: "解釋為何一個輸入有兩個輸出的關係不是函數。" }
      ]
    }
  }),
  lesson({
    topicId: "coordinate-geometry",
    title: { en: "Coordinate Geometry: Gradient, Distance, and Midpoint", zh: "坐標幾何：斜率、距離與中點" },
    description: {
      en: "Turn geometric information into coordinate calculations and verify the result on a graph.",
      zh: "把幾何資料轉化為坐標計算，並在圖像上驗證結果。"
    },
    estimatedMinutes: 50,
    concept: {
      title: { en: "Geometry from coordinates", zh: "由坐標建立幾何" },
      content: {
        en: "Gradient measures steepness, distance measures segment length, and midpoint gives the centre of a segment. These formulas come from horizontal and vertical changes between two points.",
        zh: "斜率量度陡斜程度，距離量度線段長度，中點則給出線段中心。這些公式都來自兩點之間的水平和垂直變化。"
      }
    },
    workedExample: {
      content: {
        en: `For points ${math("(1, 2)")} and ${math("(3, 8)")}, the gradient is ${math(String.raw`\frac{8 - 2}{3 - 1} = \frac{6}{2} = 3`)}.`,
        zh: `對於點 ${math("(1, 2)")} 和 ${math("(3, 8)")}，斜率為 ${math(String.raw`\frac{8 - 2}{3 - 1} = \frac{6}{2} = 3`)}。`
      }
    },
    checklist: {
      title: { en: "Coordinate geometry checklist", zh: "坐標幾何清單" },
      items: [
        { en: "Write x-change and y-change before the formula.", zh: "使用公式前先寫出 x 變化和 y 變化。" },
        { en: "Check signs when subtracting coordinates.", zh: "相減坐標時檢查正負號。" },
        { en: "Sketch a quick graph to confirm the result is reasonable.", zh: "快速畫圖確認答案合理。" }
      ]
    },
    visualization: {
      title: { en: "Compare a figure with its image", zh: "比較圖形和它的像" },
      content: {
        en: "Enter a point by its coordinates, apply a translation, reflection or dilation, and compare the coordinates of each vertex before and after.",
        zh: "以坐標輸入一點，施加平移、反射或放縮，再比較每個頂點變換前後的坐標。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Find a segment whose midpoint is (1, 1) using two different endpoint pairs.", zh: "用兩組不同端點找出中點為 (1, 1) 的線段。" },
        { en: "Explain why a negative gradient slopes downward from left to right.", zh: "解釋為何負斜率由左至右向下傾斜。" }
      ]
    }
  }),
  lesson({
    topicId: "more-algebra",
    title: { en: "More Algebra: Identities, Indices, Rational Expressions", zh: "進階代數：恆等式、指數與有理式" },
    description: {
      en: "Manipulate identities, indices, and rational expressions with controlled algebraic steps.",
      zh: "以有條理的代數步驟處理恆等式、指數與有理式。"
    },
    estimatedMinutes: 48,
    concept: {
      title: { en: "Algebraic form carries conditions", zh: "代數形式包含條件" },
      content: {
        en: "Index laws work when bases match. Rational expressions can be simplified by factoring, cancelling common factors, and noting restrictions on denominators.",
        zh: "指數律在底數相同時使用。有理式可透過因式分解、約去公因式和留意分母限制來化簡。"
      }
    },
    workedExample: {
      content: {
        en: `${math("x^3 / x = x^2")} for ${math("x \\ne 0")} because powers with the same base subtract indices when divided.`,
        zh: `當 ${math("x \\ne 0")}，${math("x^3 / x = x^2")}，因為同底冪相除時指數相減。`
      }
    },
    checklist: {
      title: { en: "Advanced algebra checklist", zh: "進階代數清單" },
      items: [
        { en: "Factor before cancelling rational expressions.", zh: "約去有理式前先因式分解。" },
        { en: "State denominator restrictions.", zh: "寫出分母限制。" },
        { en: "Use index laws only with matching bases.", zh: "只在底數相同時使用指數律。" }
      ]
    },
    extension: {
      items: [
        { en: "Create a simplification where cancelling before factoring would be wrong.", zh: "創作一道若未因式分解就約去會出錯的化簡題。" },
        { en: "Explain the difference between an equation and an identity.", zh: "解釋方程和恆等式有何不同。" }
      ]
    }
  }),
  lesson({
    topicId: "data-handling",
    title: { en: "Data Handling: Distributions and Claims", zh: "數據處理：分佈與主張" },
    description: {
      en: "Interpret distributions and evaluate data claims using summaries and context.",
      zh: "運用摘要和情境詮釋分佈，並評估數據主張。"
    },
    estimatedMinutes: 36,
    concept: {
      title: { en: "A distribution is a shape of data", zh: "分佈是數據的形狀" },
      content: {
        en: "Median, mean, range, and clusters describe different parts of a distribution. A claim is stronger when it uses the right summary and acknowledges variation.",
        zh: "中位數、平均數、範圍和聚集情況描述分佈的不同面向。若主張使用合適摘要並承認變異，便更有說服力。"
      }
    },
    workedExample: {
      content: {
        en: `Order ${math("3, 8, 4, 9, 6")} as ${math("3, 4, 6, 8, 9")}. The median is ${math("6")} because it is the middle value.`,
        zh: `把 ${math("3, 8, 4, 9, 6")} 排序為 ${math("3, 4, 6, 8, 9")}。中位數是 ${math("6")}，因為它位於中間。`
      }
    },
    checklist: {
      title: { en: "Data handling checklist", zh: "數據處理清單" },
      items: [
        { en: "Sort data before finding the median.", zh: "求中位數前先排序。" },
        { en: "Compare mean and median for skewed data.", zh: "偏斜數據要比較平均數和中位數。" },
        { en: "Ask whether the sample supports the claim.", zh: "思考樣本是否支持主張。" }
      ]
    },
    extension: {
      items: [
        { en: "Find a real chart and write one claim that is supported and one that is not.", zh: "找一個真實圖表，寫出一個有支持和一個沒有支持的主張。" },
        { en: "Create a data set where the mean is affected by one extreme value.", zh: "建立一組平均數受一個極端值影響的數據。" }
      ]
    }
  }),
  lesson({
    topicId: "advanced-functions",
    title: { en: "Advanced Functions: Compare Growth Models", zh: "進階函數：比較增長模型" },
    description: {
      en: "Distinguish polynomial, exponential, and logarithmic behaviour using graph shape and rate of change.",
      zh: "利用圖像形狀和變化率分辨多項式、指數和對數行為。"
    },
    estimatedMinutes: 52,
    concept: {
      title: { en: "Three senior model families", zh: "三類高中模型" },
      content: {
        en: "Polynomial models often turn or curve with powers of x. Exponential models multiply by a constant factor over equal input intervals. Logarithmic models grow quickly at first and then flatten.",
        zh: "多項式模型常因 x 的冪次而轉折或彎曲；指數模型在相同輸入間隔中按固定倍數變化；對數模型初段增長快，之後逐漸變平。"
      }
    },
    workedExample: {
      content: {
        en: "If equal increases in x produce output ratios that are nearly constant, an exponential model is a better first candidate than a linear model.",
        zh: "若 x 每增加相同幅度時，輸出值的比率接近固定，指數模型通常比線性模型更適合作為初步選擇。"
      }
    },
    checklist: {
      title: { en: "Model comparison checklist", zh: "模型比較清單" },
      items: [
        { en: "Compare differences and ratios in a table.", zh: "比較數表中的差和比。" },
        { en: "Match the graph shape before solving parameters.", zh: "求參數前先配對圖像形狀。" },
        { en: "Check long-term behaviour for large x.", zh: "檢查 x 很大時的長遠行為。" }
      ]
    },
    visualization: {
      title: { en: "Compare curve families", zh: "比較函數族" },
      content: {
        en: "Adjust the model and compare how each family bends as x grows, so you can tell polynomial growth from exponential growth by shape.",
        zh: "調整模型，比較各函數族在 x 增大時的彎曲情況，從形狀分辨多項式增長與指數增長。"
      },
      moduleId: "configured-visualization-lab",
      source: "function-model"
    },
    extension: {
      items: [
        { en: "Find a context where an exponential model eventually overtakes a polynomial model.", zh: "找出一個指數模型最終超越多項式模型的情境。" },
        { en: "Describe a graph where logarithmic growth would be plausible.", zh: "描述一個適合用對數增長表示的圖像情境。" }
      ]
    }
  }),
  lesson({
    topicId: "trigonometry-s5",
    title: { en: "Trigonometry: Identities, Graphs, Transformations", zh: "三角學：恆等式、圖像與變換" },
    description: {
      en: "Transform identities and graphs for senior secondary trigonometry questions.",
      zh: "為高中三角學題目轉化恆等式與三角圖像。"
    },
    estimatedMinutes: 55,
    concept: {
      title: { en: "Trig graphs repeat with structure", zh: "三角圖像按結構重複" },
      content: {
        en: "Sine and cosine graphs repeat periodically. Amplitude changes height, period changes horizontal repeat length, and phase shift moves the wave left or right.",
        zh: "正弦和餘弦圖像會週期性重複。振幅改變高度，周期改變水平重複長度，相位移則令波形左右移動。"
      }
    },
    workedExample: {
      content: {
        en: `For an acute angle, ${math(String.raw`\sin 30^\circ = \frac{1}{2}`)}, so if ${math(String.raw`\sin\theta = \frac{1}{2}`)} and ${math(String.raw`\theta`)} is acute, then ${math(String.raw`\theta = 30^\circ`)}.`,
        zh: `對銳角而言，${math(String.raw`\sin 30^\circ = \frac{1}{2}`)}，所以若 ${math(String.raw`\sin\theta = \frac{1}{2}`)} 且 ${math(String.raw`\theta`)} 是銳角，則 ${math(String.raw`\theta = 30^\circ`)}。`
      }
    },
    checklist: {
      title: { en: "Senior trigonometry checklist", zh: "高中三角學清單" },
      items: [
        { en: "Mark the required angle domain.", zh: "標示所需角度範圍。" },
        { en: "Identify amplitude, period, and phase shift from the equation.", zh: "由方程辨認振幅、周期和相位移。" },
        { en: "Check whether identities or graph transformations are more efficient.", zh: "判斷使用恆等式還是圖像變換較有效。" }
      ]
    },
    visualization: {
      title: { en: "Adjust amplitude and phase", zh: "調整振幅和相位" },
      content: {
        en: "Set the amplitude A and the angle θ in y = A sin(x + θ), and match the height of the rotating radius with the height of the wave.",
        zh: "設定 y = A sin(x + θ) 中的振幅 A 和角 θ，並把旋轉半徑的高度與波形的高度對應起來。"
      },
      moduleId: "configured-visualization-lab",
      source: "trig-wave"
    },
    extension: {
      items: [
        { en: "Create two sine equations with the same period but different amplitudes.", zh: "建立兩條周期相同但振幅不同的正弦方程。" },
        { en: "Explain why a graph can show more than one solution in a given interval.", zh: "解釋為何圖像在指定區間內可能有多於一個解。" }
      ]
    }
  }),
  lesson({
    topicId: "probability-s5",
    title: { en: "Probability: Counting and Conditional Reasoning", zh: "概率：計數與條件推理" },
    description: {
      en: "Build counting strategies and conditional probability intuition for senior questions.",
      zh: "建立計數策略和條件概率直覺，處理高中題目。"
    },
    estimatedMinutes: 45,
    concept: {
      title: { en: "Count the right sample space", zh: "數出正確樣本空間" },
      content: {
        en: "Probability depends on what outcomes are possible after the given information is known. Conditional probability updates the sample space before counting favourable outcomes.",
        zh: "概率取決於已知資料後仍可能出現的結果。條件概率要先更新樣本空間，再數有利結果。"
      }
    },
    workedExample: {
      content: {
        en: `A fair die has even outcomes ${math("2, 4, 6")}, so ${math(String.raw`P(\text{even})=\frac{3}{6}=\frac{1}{2}`)}. If we already know the result is greater than ${math("3")}, the sample space becomes ${math("4,5,6")}.`,
        zh: `公平骰子的偶數結果為 ${math("2, 4, 6")}，所以 ${math(String.raw`P(\text{偶數})=\frac{3}{6}=\frac{1}{2}`)}。若已知結果大於 ${math("3")}，樣本空間便變成 ${math("4,5,6")}。`
      }
    },
    checklist: {
      title: { en: "Conditional probability checklist", zh: "條件概率清單" },
      items: [
        { en: "List the sample space after applying conditions.", zh: "套用條件後才列出樣本空間。" },
        { en: "Use systematic counting for multi-step choices.", zh: "多步選擇使用有系統計數。" },
        { en: "Write probability as favourable outcomes over possible outcomes.", zh: "把概率寫成有利結果除以可能結果。" }
      ]
    },
    extension: {
      items: [
        { en: "Create a two-stage probability tree and label each branch.", zh: "建立一個兩階段概率樹，並標示每條分支。" },
        { en: "Explain how extra information can increase or decrease a probability.", zh: "解釋額外資料如何令概率增加或減少。" }
      ]
    }
  }),
  lesson({
    topicId: "differentiation-intro",
    title: { en: "Differentiation Intro: Tangents and Rates", zh: "微分入門：切線與變化率" },
    description: {
      en: "Read the derivative as the gradient of a tangent and as an instantaneous rate of change.",
      zh: "把導數理解為切線斜率和瞬時變化率。"
    },
    estimatedMinutes: 60,
    concept: {
      title: { en: "Derivative as local gradient", zh: "導數作為局部斜率" },
      content: {
        en: `The derivative ${math("f'(x)")} gives the gradient of the curve at a single ${math("x")}-value. It is found by shrinking the interval used for an average gradient until the secant becomes a tangent.`,
        zh: `導數 ${math("f'(x)")} 給出曲線在某一個 ${math("x")} 值的斜率。它可理解為把平均斜率的區間不斷縮小，直到割線變成切線。`
      }
    },
    workedExample: {
      content: {
        en: `For ${math("y = x^2")}, the power rule gives ${math(String.raw`\frac{dy}{dx} = 2x`)}. At ${math("x = 3")}, the tangent gradient is ${math("2(3) = 6")}.`,
        zh: `對於 ${math("y = x^2")}，冪法則給出 ${math(String.raw`\frac{dy}{dx} = 2x`)}。當 ${math("x = 3")}，切線斜率為 ${math("2(3) = 6")}。`
      }
    },
    checklist: {
      title: { en: "Differentiation checklist", zh: "微分清單" },
      items: [
        { en: `Differentiate before substituting the ${math("x")}-value.`, zh: `先求導，再代入 ${math("x")} 值。` },
        { en: "Interpret positive, zero, or negative gradient.", zh: "解讀正、零或負斜率。" },
        { en: "Use units when the derivative is a rate.", zh: "當導數代表速率時保留單位。" }
      ]
    },
    visualization: {
      title: { en: "Move the tangent point", zh: "移動切線點" },
      content: {
        en: "Move the probe along the curve and read the gradient of the tangent there, then compare it with the average rate over a nearby interval.",
        zh: "沿曲線移動探針，讀出該處切線的斜率，再與鄰近區間的平均變化率比較。"
      },
      moduleId: "configured-visualization-lab",
      source: "calculus-stats"
    },
    extension: {
      items: [
        { en: "Find where a quadratic has zero gradient and connect it to the vertex.", zh: "找出二次函數斜率為零的位置，並連繫到頂點。" },
        { en: "Describe a real situation where the derivative is a rate.", zh: "描述一個導數代表速率的真實情境。" }
      ]
    }
  }),
  lesson({
    topicId: "calculus",
    title: { en: "Calculus: Turning Points and Local Behaviour", zh: "微積分：轉折點與局部行為" },
    description: {
      en: "Use derivative signs and tangent gradients to reason about senior exam graphs.",
      zh: "運用導數符號和切線斜率推理高中考試圖像。"
    },
    estimatedMinutes: 65,
    concept: {
      title: { en: "Derivative signs", zh: "導數符號" },
      content: {
        en: `When ${math("f'(x)")} is positive, the graph is increasing. When ${math("f'(x)")} is negative, the graph is decreasing. A change from positive to negative suggests a local maximum, while negative to positive suggests a local minimum.`,
        zh: `當 ${math("f'(x)")} 為正，圖像上升；當 ${math("f'(x)")} 為負，圖像下降。由正變負通常表示局部最大值，由負變正通常表示局部最小值。`
      }
    },
    workedExample: {
      content: {
        en: `If ${math("f'(x)")} changes from positive to negative at ${math("x = 2")}, the graph rises before ${math("x = 2")} and falls after ${math("x = 2")}, so ${math("x = 2")} may be a local maximum.`,
        zh: `若 ${math("f'(x)")} 在 ${math("x = 2")} 由正變負，圖像在 ${math("x = 2")} 前上升、之後下降，所以 ${math("x = 2")} 可能是局部最大值。`
      }
    },
    checklist: {
      title: { en: "Calculus graph checklist", zh: "微積分圖像清單" },
      items: [
        { en: "Mark intervals where f'(x) is positive or negative.", zh: "標示 f'(x) 為正或負的區間。" },
        { en: "Use sign changes to classify stationary points.", zh: "利用符號變化分類駐點。" },
        { en: "Connect the algebra result to the graph shape.", zh: "把代數結果連繫到圖像形狀。" }
      ]
    },
    visualization: {
      title: { en: "Compare gradient and accumulated area", zh: "比較斜率與累積面積" },
      content: {
        en: "Move the probe to read the gradient of the tangent, and watch the area accumulated under the curve from x = −3 grow as the probe moves right.",
        zh: "移動探針讀出切線斜率，並觀察由 x = −3 起在曲線下累積的面積如何隨探針右移而增加。"
      },
      moduleId: "configured-visualization-lab",
      source: "calculus-stats"
    },
    extension: {
      items: [
        { en: "Sketch a derivative sign chart for a curve with one maximum and one minimum.", zh: "為一條有一個極大值和一個極小值的曲線畫導數符號表。" },
        { en: "Explain why a stationary point is not always a maximum or minimum.", zh: "解釋為何駐點不一定是最大值或最小值。" }
      ]
    }
  }),
  lesson({
    topicId: "statistics-s6",
    title: { en: "Statistics: Normal Distribution and Z-Scores", zh: "統計：常態分佈與 z 分數" },
    description: {
      en: "Standardize values with z-scores and interpret their position in a normal distribution.",
      zh: "利用 z 分數把數值標準化，並解讀其在常態分佈中的位置。"
    },
    estimatedMinutes: 55,
    concept: {
      title: { en: "Standardizing a value", zh: "標準化數值" },
      content: {
        en: `A ${math("z")}-score measures how many standard deviations a value is from the mean. Positive ${math("z")}-values are above the mean, negative ${math("z")}-values are below the mean, and ${math("z = 0")} is exactly at the mean.`,
        zh: `${math("z")} 分數量度某數值距離平均數多少個標準差。正 ${math("z")} 值高於平均數，負 ${math("z")} 值低於平均數，${math("z = 0")} 則正好在平均數。`
      }
    },
    workedExample: {
      content: {
        en: `If the mean is ${math("50")}, the standard deviation is ${math("10")}, and ${math("x = 70")}, then ${math(String.raw`z = \frac{70 - 50}{10} = 2`)}.`,
        zh: `若平均數為 ${math("50")}，標準差為 ${math("10")}，且 ${math("x = 70")}，則 ${math(String.raw`z = \frac{70 - 50}{10} = 2`)}。`
      }
    },
    checklist: {
      title: { en: "Normal distribution checklist", zh: "常態分佈清單" },
      items: [
        { en: "Identify the mean and standard deviation.", zh: "辨認平均數和標準差。" },
        { en: `Substitute into ${math(String.raw`z = \frac{x - \text{mean}}{\text{standard deviation}}`)}.`, zh: `代入 ${math(String.raw`z = \frac{x - \text{平均數}}{\text{標準差}}`)}。` },
        { en: "Interpret the sign and size of z.", zh: "解讀 z 的正負和大小。" }
      ]
    },
    visualization: {
      title: { en: "Read gradient and area on a curve", zh: "讀出曲線的斜率與面積" },
      content: {
        en: "Move the probe along the curve to read the tangent gradient and the accumulated area. This lab models rate and area, not the normal distribution — use it for the calculus half of the topic.",
        zh: "沿曲線移動探針，讀出切線斜率和累積面積。此實驗模擬變化率與面積，而非常態分布，請用於本課題的微積分部分。"
      },
      moduleId: "configured-visualization-lab",
      source: "probability"
    },
    extension: {
      items: [
        { en: "Compare two z-scores and decide which value is more unusual.", zh: "比較兩個 z 分數，判斷哪個數值較不尋常。" },
        { en: "Explain why changing the standard deviation changes the z-score.", zh: "解釋為何改變標準差會改變 z 分數。" }
      ]
    }
  }),
  lesson({
    topicId: "exam-revision",
    title: { en: "Exam Revision: Skill Gaps, Timing, Mixed Papers", zh: "考試溫習：能力差距、時間管理、混合試卷" },
    description: {
      en: "Plan revision by skill gaps, timing, and mixed paper practice.",
      zh: "按能力差距、時間管理和混合試卷規劃溫習。"
    },
    estimatedMinutes: 40,
    concept: {
      title: { en: "Revision needs evidence", zh: "溫習需要證據" },
      content: {
        en: "Effective revision uses recent mistakes, topic mastery, and time pressure to decide what to practise next. Mixed papers reveal whether skills can be selected without hints.",
        zh: "有效溫習會根據近期錯題、課題掌握度和時間壓力，決定下一步練習內容。混合試卷能顯示學生能否在沒有提示下選擇技巧。"
      }
    },
    workedExample: {
      content: {
        en: `If a section has ${math("10")} marks and should take ${math("15")} minutes, the pace is ${math("15 \\div 10 = 1.5")} minutes per mark. A ${math("4")}-mark question should take about ${math("6")} minutes.`,
        zh: `若一部分佔 ${math("10")} 分，應用 ${math("15")} 分鐘完成，速度是每分 ${math("15 \\div 10 = 1.5")} 分鐘。${math("4")} 分題約需 ${math("6")} 分鐘。`
      }
    },
    checklist: {
      title: { en: "Revision checklist", zh: "溫習清單" },
      items: [
        { en: "Choose topics from actual mistakes, not feelings alone.", zh: "根據真實錯題選課題，不只憑感覺。" },
        { en: "Practise both topic drills and mixed questions.", zh: "同時練習專題題和混合題。" },
        { en: "Track minutes per mark during timed work.", zh: "限時練習時記錄每分所用時間。" }
      ]
    },
    extension: {
      items: [
        { en: "Design a one-week revision timetable with one repair block and one mixed-paper block each day.", zh: "設計一星期溫習時間表，每天包括一段補弱和一段混合卷練習。" },
        { en: "Explain how you would decide whether to skip a difficult exam question temporarily.", zh: "解釋考試中如何決定是否暫時跳過難題。" }
      ]
    }
  }),
  lesson({
    topicId: "mixed-problem-solving",
    title: { en: "Mixed Problem Solving: Select, Connect, Check", zh: "綜合解難：選擇、連繫、檢查" },
    description: {
      en: "Select strategies for multi-step unfamiliar questions.",
      zh: "為多步驟陌生題選擇解題策略。"
    },
    estimatedMinutes: 60,
    concept: {
      title: { en: "Strategy comes before calculation", zh: "策略先於計算" },
      content: {
        en: "Mixed problems often hide which topic is being tested. A strong solution identifies known facts, the target, useful representations, and checkpoints before calculating.",
        zh: "綜合題常隱藏正在考核的課題。好的解法會先辨認已知資料、目標、有用表示和檢查點，再開始計算。"
      }
    },
    workedExample: {
      content: {
        en: "For a mixed problem, first list the given facts and the target. Then choose whether a diagram, algebraic equation, table, or graph connects them most directly.",
        zh: "處理綜合題時，先列出已知資料和目標，再選擇用圖、代數方程、表格或圖像最直接連繫它們。"
      }
    },
    checklist: {
      title: { en: "Mixed problem checklist", zh: "綜合題清單" },
      items: [
        { en: "Write the target in your own words.", zh: "用自己的文字寫出目標。" },
        { en: "Name the topic tools that might apply.", zh: "說出可能適用的課題工具。" },
        { en: "Check units, reasonableness, and whether the question has been fully answered.", zh: "檢查單位、合理性，以及是否完整回答題目。" }
      ]
    },
    extension: {
      items: [
        { en: "Solve the same problem using two representations and compare efficiency.", zh: "用兩種表示方法解同一題，並比較效率。" },
        { en: "Build a personal checklist of mistakes to avoid in unfamiliar questions.", zh: "建立一份處理陌生題時要避免的個人錯誤清單。" }
      ]
    }
  })
];

export const productionLessonSeeds: ProductionLessonSeed[] = [
  ...hongKongProductionLessonSeeds,
  ...mainlandPepPrimaryLessonSeeds,
  ...mainlandPepJuniorLessonSeeds,
  ...mainlandPepHighLessonSeeds,
  ...mainlandBnuHighLessonSeeds,
  ...mainlandBnuJuniorLessonSeeds,
  ...mainlandBnuPrimaryLessonSeeds,
  ...mainlandHjbPrimaryLessonSeeds,
  ...mainlandHjbJuniorLessonSeeds,
  ...mainlandHjbHighLessonSeeds,
  ...usArkansasMiddleSchoolLessonSeeds,
  ...usCaliforniaLessonSeeds,
  ...usFloridaMiddleSchoolLessonSeeds
];

export const liveProductionLessonSeeds = productionLessonSeeds.filter((lessonSeed) => lessonSeed.productionReady);

export const productionLessonByTopicId = new Map(
  liveProductionLessonSeeds.map((lessonSeed) => [lessonSeed.topicId, lessonSeed])
);
