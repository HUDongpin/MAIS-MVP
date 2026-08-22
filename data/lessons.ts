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
  practiceQuestionIds?: string[];
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

const hongKongFallbackVisualizationByTopicId: Partial<Record<string, NonNullable<LessonDraft["visualization"]>>> = {
  "p1-measurement-time": {
    title: { en: "Measure equal units and read the clock", zh: "數相等長度單位並讀鐘面" },
    content: {
      en: "Count equal length units, then switch to an analogue clock to compare whole-hour and half-hour states.",
      zh: "數出相等的長度單位，然後切換到指針鐘，比較整點和半小時狀態。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  "p2-money-time": {
    title: { en: "Model Hong Kong change and time", zh: "建立香港找續和時間模型" },
    content: {
      en: "Adjust an HK-dollar price and payment to see non-negative change, then read whole-hour and half-hour clock states.",
      zh: "調整港幣價錢和付款金額，觀察非負找續，再讀出整點和半小時鐘面。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  "p3-multiplication-division": {
    title: { en: "Keep one total across groups, arrays, and sharing", zh: "在分組、陣列和平均分中保持同一總數" },
    content: {
      en: "Use the same total to connect equal groups, a rectangular array, multiplication, and equal sharing.",
      zh: "以同一總數連繫等量分組、長方形陣列、乘法和平均分。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  "p3-measurement": {
    title: { en: "Convert within one metric quantity", zh: "在同一公制量內換算" },
    content: {
      en: "Choose length, mass, or capacity and preserve the physical quantity while converting between appropriate metric units.",
      zh: "選擇長度、重量或容量，在合適的公制單位之間換算時保持同一物理量。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  "p4-large-numbers": {
    title: { en: "Build factor pairs, H.C.F., and L.C.M.", zh: "建立因數組、最大公因數與最小公倍數" },
    content: {
      en: "Switch between complete factor-pair lists and positive-multiple tracks for two positive integers. Show a = dq + r, identify a factor only when r = 0, then mark the H.C.F. and least positive common multiple.",
      zh: "在兩個正整數的完整因數組與正倍數軌道之間切換。顯示 a＝dq＋r；只有 r＝0 時才把 d 判定為因數，再標示最大公因數和最小正公倍數。"
    },
    moduleId: "configured-visualization-lab",
    source: "coordinate-plane"
  },
  "p5-rates": {
    title: { en: "Use one-unit reasoning for price", zh: "用歸一法求單價" },
    content: {
      en: "Divide a total price by an equal item count, preserve the exact fraction, and label any decimal approximation.",
      zh: "把總價除以相等物件數，保留精確分數，並標明任何小數近似值。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "p6-ratio-proportion": {
    title: { en: "Link fair-share means and broken-line data", zh: "連繫平均分配與折線數據" },
    content: {
      en: "Edit an ordered dataset and keep its total, count, mean, value table, plotted points, axes, scale, and units synchronized. Join only consecutive time or continuous-data points; do not treat extrapolation as observed fact.",
      zh: "編輯一組有序數據，並同步總和、數據個數、平均數、數值表、標繪點、坐標軸、刻度和單位。只連接相鄰的時間或連續數據點，不把延伸線段當作已觀察事實。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "p6-pre-secondary-problem-solving": {
    title: { en: "Carry one problem through four checks", zh: "以四步完成並檢查同一題" },
    content: {
      en: "Carry one budget problem through represent, plan, solve, and inverse-check states. Keep every quantity and unit visible, and make the final state show either a non-negative amount remaining (including exactly zero) or a positive overspend.",
      zh: "把同一預算題依次經過表示、規劃、解答和逆向檢查，保持所有數量和單位可見，並在最後狀態顯示非負餘款（包括恰好為零）或正數超支。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "algebra-basics": {
    title: { en: "Keep a symbolic equation balanced", zh: "保持符號方程兩邊平衡" },
    content: {
      en: "Apply the same inverse operation to both sides of x + a = b, isolate x, and verify by substitution.",
      zh: "在 x + a = b 兩邊進行相同逆運算，分離 x，再以代入驗證。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  ratios: {
    title: { en: "Preserve a ratio while scaling", zh: "縮放時保持比不變" },
    content: {
      en: "Scale both parts with the same multiplier and connect the equivalent ratio to its one-unit value.",
      zh: "以同一倍數縮放兩項，並把等值比連繫到一單位的值。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "statistics-s1": {
    title: { en: "Adjust a symmetric distribution's centre and spread", zh: "調整對稱分佈的中心和離散程度" },
    content: {
      en: "Change one displayed symmetric distribution and explain only how its adjustable centre and spread respond; the model does not expose raw observations for mean or range calculations.",
      zh: "改變同一個顯示中的對稱分佈，只解釋可調中心和離散程度如何回應；此模型沒有提供可供計算平均數或全距的原始觀察值。"
    },
    moduleId: "configured-visualization-lab",
    source: "calculus-stats"
  },
  "linear-equations": {
    title: { en: "Solve ax + b = c (a ≠ 0) by equal operations", zh: "以等量運算解 ax + b = c（a ≠ 0）" },
    content: {
      en: "For a ≠ 0, undo addition and multiplication with equal operations on both sides, isolate x, and check the original equation.",
      zh: "在 a ≠ 0 的條件下，在方程兩邊作相同運算以消去加法和乘法，分離 x，再檢查原方程。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  polynomials: {
    title: { en: "Expand and factorise with exact area pieces", zh: "以精確面積塊展開和因式分解" },
    content: {
      en: "Bind (x + p)(x + q) to four exact area pieces and switch between expansion and factorisation.",
      zh: "把 (x + p)(x + q) 連繫到四個精確面積塊，並在展開和因式分解之間切換。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "trigonometry-basics": {
    title: { en: "Relabel a right triangle from the reference angle", zh: "按參考角重新標示直角三角形" },
    content: {
      en: "Resize one right triangle, choose either acute reference angle, and keep opposite, adjacent, hypotenuse, and SOH-CAH-TOA synchronized.",
      zh: "調整同一直角三角形的大小，選擇任一銳角作參考，並同步對邊、鄰邊、斜邊和 SOH-CAH-TOA。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  circles: {
    title: { en: "Verify circle lines, arcs, and angle invariants", zh: "驗證圓內直線、弧和角的不變關係" },
    content: {
      en: "Inspect one real circle with its centre, radius, chord and matching arc. Verify that the tangent is perpendicular to the radius at the contact point and that the angle at the centre is twice the angle at the circumference standing on the same arc.",
      zh: "檢視同一個真實圓的圓心、半徑、弦和所對的弧；驗證切線與接觸點半徑互相垂直，並驗證一弧所對的圓心角是該弧所對的圓周角的兩倍。"
    },
    moduleId: "configured-visualization-lab",
    source: "geometry"
  },
  "more-algebra": {
    title: { en: "Keep algebraic restrictions visible", zh: "保持代數限制條件可見" },
    content: {
      en: "Compare index laws, signed identity pieces, and rational cancellation while retaining every excluded value.",
      zh: "比較指數律、帶符號恆等式面積塊和有理式約簡，同時保留所有不容許值。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  },
  "data-handling": {
    title: { en: "Adjust a symmetric distribution's centre and spread", zh: "調整對稱分佈的中心和離散程度" },
    content: {
      en: "Adjust the centre and spread of the displayed symmetric distribution. Treat it as a model only: the lab does not supply raw data for median, skew, clusters, outliers, or claim validation.",
      zh: "調整顯示中的對稱分佈之中心和離散程度。只把它視為模型：實驗室沒有提供可供中位數、偏態、聚集、離群值或主張驗證使用的原始數據。"
    },
    moduleId: "configured-visualization-lab",
    source: "calculus-stats"
  },
  "probability-s5": {
    title: { en: "Update conditional probability without replacement", zh: "更新不放回條件概率" },
    content: {
      en: "Enumerate equally likely individual-object outcomes. Use unordered pairs only for order-independent two-object events; for conditional events, update ordered branches after the first object is not replaced. If outcomes are not equally likely, use probability weights rather than raw counts.",
      zh: "列出等可能的個別物件結果。只有當兩物件事件與次序無關時才使用無序配對；處理條件事件時，第一件物件不放回後須更新有次序的分支。若結果不等可能，使用概率權重而非直接計數。"
    },
    moduleId: "configured-visualization-lab",
    source: "probability"
  },
  "exam-revision": {
    title: { en: "Make revision priority and timing explainable", zh: "令溫習優先次序和時間分配可解釋" },
    content: {
      en: "Use mastery gaps, recent errors, marks, and minutes per mark to explain a revision order and time budget.",
      zh: "運用掌握差距、近期錯誤、分數和每 1 分題目所需分鐘，解釋溫習次序和時間預算。"
    },
    moduleId: "configured-visualization-lab",
    source: "calculus-stats"
  },
  "mixed-problem-solving": {
    title: { en: "Connect every known fact to one checked solution", zh: "把每項已知連到同一個已檢查解答" },
    content: {
      en: "Choose a representation, use every known quantity, calculate with units, and verify the result by an inverse check.",
      zh: "選擇表示方式、使用每個已知量、連同單位計算，再以逆向檢查驗證結果。"
    },
    moduleId: "configured-visualization-lab",
    source: "function-model"
  }
};

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
    }
  ];

  const visualization = draft.visualization ?? hongKongFallbackVisualizationByTopicId[draft.topicId];
  if (visualization) {
    blocks.push({
      idSuffix: "visualization",
      type: "visualization",
      title: visualization.title,
      content: visualization.content,
      visualizationConfig: {
        moduleId: visualization.moduleId,
        source: visualization.source,
        topicId: visualization.topicId ?? draft.topicId
      }
    });
  }

  blocks.push({
    idSuffix: "extension",
    type: "extension",
    title: draft.extension.title ?? extensionTitle,
    items: draft.extension.items
  });

  blocks.push({
    idSuffix: "checklist",
    type: "checklist",
    title: draft.checklist.title,
    items: draft.checklist.items
  });

  return {
    topicId: draft.topicId,
    productionReady: true,
    title: draft.title,
    description: draft.description,
    estimatedMinutes: draft.estimatedMinutes,
    practiceQuestionIds: draft.practiceQuestionIds,
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
      title: { en: "Live number-bond model", zh: "即時數的組合模型" },
      content: {
        en: "Use the counter grid to split a whole into two visible parts, then read the number sentence that changes with the model.",
        zh: "使用粒子格把整體分成兩個可見部分，然後讀出隨模型改變的算式。"
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
        en: "Use one 0-to-20 number line: addition moves forward, subtraction moves backward, and a zero step leaves the point unchanged.",
        zh: "使用同一條 0 至 20 數線：加法向前移、減法向後移，而零步移動會停留在原位。"
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
      title: { en: "Find the repeating unit", zh: "找出重複單位" },
      content: {
        en: "Choose an AB, ABC, or AAB pattern, reveal its terms, identify the shortest repeating unit, and use that unit to predict the next shape.",
        zh: "選擇 AB、ABC 或 AAB 規律，逐項顯示圖形，找出最短重複單位，並用該單位預測下一個圖形。"
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
    title: { en: "Measurement and Time: Length, Whole Hours, Half Hours", zh: "度量與時間：長度、整點、半小時" },
    description: {
      en: "Compare lengths with equal units, then read whole-hour and half-hour times from an analogue clock.",
      zh: "以相等單位比較長度，並從指針鐘讀出整點和半小時時間。"
    },
    estimatedMinutes: 20,
    concept: {
      title: { en: "Equal units and two clock states", zh: "相等單位和兩種鐘面狀態" },
      content: {
        en: "A fair length comparison uses equal-sized units placed end to end without gaps. At a whole hour the minute hand points to 12; at a half hour it points to 6 and the hour hand sits halfway to the next hour.",
        zh: "公平比較長度時，要把大小相同的單位首尾相接，中間不能留空。整點時分針指向 12；半小時時分針指向 6，時針位於兩個鐘點數字之間。"
      }
    },
    workedExample: {
      content: {
        en: `A strip covers ${math("7")} equal cubes and another covers ${math("5")}, so the first strip is ${math("2")} cube-units longer. If the minute hand points to ${math("6")} and the hour hand is halfway between ${math("3")} and ${math("4")}, the time is half past 3.`,
        zh: `一條紙帶覆蓋 ${math("7")} 個相等小方塊，另一條覆蓋 ${math("5")} 個，所以第一條長 ${math("2")} 個方塊單位。若分針指向 ${math("6")}，時針在 ${math("3")} 和 ${math("4")} 中間，時間是 3 時半。`
      }
    },
    checklist: {
      title: { en: "Measure and time checklist", zh: "度量與時間清單" },
      items: [
        { en: "Use equal-sized length units with no gaps or overlaps.", zh: "使用大小相同的長度單位，不留空隙也不重疊。" },
        { en: "For a whole hour, check that the minute hand points to 12.", zh: "讀整點時，檢查分針是否指向 12。" },
        { en: "For a half hour, check that the minute hand points to 6.", zh: "讀半小時時，檢查分針是否指向 6。" }
      ]
    },
    extension: {
      items: [
        { en: "Order three classroom objects from shortest to longest.", zh: "把三件課室物件由最短排至最長。" },
        { en: "Draw one whole-hour time and one half-hour time for someone to read.", zh: "畫出一個整點和一個半小時鐘面，請別人讀出。" }
      ]
    }
  }),
  lesson({
    topicId: "p2-place-value",
    title: { en: "Place Value to 1000: Hundreds, Tens, Ones", zh: "一千以內的位值：百、十、個" },
    description: {
      en: "Read, write, order, decompose, and regroup whole numbers from 0 to 1000.",
      zh: "讀寫、排序、分拆和重組 0 至 1000 的整數。"
    },
    estimatedMinutes: 22,
    concept: {
      title: { en: "Digits get value from position", zh: "數字由位置取得數值" },
      content: {
        en: "Numbers from 0 to 999 use hundreds, tens, and ones. Ten hundreds regroup as one thousand, so 1000 is the next place-value state.",
        zh: "0 至 999 的數由百、十和個組成。10 個百可重組為 1 個千，因此 1000 是下一個位值狀態。"
      }
    },
    workedExample: {
      content: {
        en: `${math("482")} has ${math("4")} hundreds, ${math("8")} tens, and ${math("2")} ones, so ${math("482 = 400 + 80 + 2")}. Ten hundreds make ${math("1000")}.`,
        zh: `${math("482")} 有 ${math("4")} 個百、${math("8")} 個十和 ${math("2")} 個一，所以 ${math("482 = 400 + 80 + 2")}。10 個百組成 ${math("1000")}。`
      }
    },
    checklist: {
      title: { en: "Place value checklist", zh: "位值清單" },
      items: [
        { en: "Read from the highest displayed place to the ones place; in 1000, the highest place is the thousands place.", zh: "由顯示中的最高位讀到個位；在 1000 中，最高位是千位。" },
        { en: "Write expanded form before comparing close numbers.", zh: "比較接近的數前先寫分拆式。" },
        { en: "Use zero to hold an empty place.", zh: "用 0 保留沒有數值的位置。" }
      ]
    },
    visualization: {
      title: { en: "Build and regroup numbers to 1000", zh: "建立並重組 1000 以內的數" },
      content: {
        en: "Build a number with hundreds, tens, and ones, make the regrouping from ten hundreds to one thousand visible, and compare two values place by place.",
        zh: "用百、十和個建立數，清楚顯示 10 個百重組為 1 個千，並逐位比較兩個數。"
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
      title: { en: "Relate rows and columns to the total", zh: "把行和列連繫到總數" },
      content: {
        en: "Change the row and column counts and verify that rows multiplied by columns gives the total number of objects.",
        zh: "改變行數和列數，驗證行數乘列數等於物件總數。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Find two different arrays that both show 12 objects.", zh: "找出兩個不同陣列，同樣表示 12 件物件。" },
        { en: "Explain why 3 × 4 and 4 × 3 have the same total.", zh: "解釋為何 3 × 4 和 4 × 3 的總數相同。" }
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
        en: "Money answers need HK$ or cents. Half past means the minute hand points to 6, which is 30 minutes after the hour.",
        zh: "金錢答案要寫港元或仙。半小時表示分針指向 6，即整點後 30 分鐘。"
      }
    },
    workedExample: {
      content: {
        en: `If a snack costs HK$8 and you pay HK$10, the change is HK$2. Half an hour after ${math("4:00")} is ${math("4:30")}.`,
        zh: `若小食售港幣 8 元，付港幣 10 元，找續是港幣 2 元。${math("4:00")} 後半小時是 ${math("4:30")}。`
      }
    },
    checklist: {
      title: { en: "Money and time checklist", zh: "金錢與時間清單" },
      items: [
        { en: "Write HK$ or cents with money answers.", zh: "金錢答案要寫港元或仙。" },
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
    title: { en: "Metres and Pictograms: Estimate, Measure, Count", zh: "米與象形圖：估計、量度、點算" },
    description: {
      en: "Estimate and measure suitable lengths in metres, connect 1 m with 100 cm, and read one-to-one pictograms.",
      zh: "以米估計和量度合適的長度，連繫 1 米與 100 厘米，並閱讀一對一象形圖。"
    },
    estimatedMinutes: 24,
    concept: {
      title: { en: "One metre and one icon per object", zh: "一米與每件物件一個圖示" },
      content: {
        en: "One metre is 100 centimetres. Use an arm span or pace only to estimate a room-scale length, then measure it with a metre ruler, measuring tape, or trundle wheel as appropriate. In a one-to-one pictogram, one icon represents one object.",
        zh: "1 米等於 100 厘米。先用臂展或步距估計較長的長度，再按情境使用米尺、捲尺或滾輪量距器量度。在一對一象形圖中，每個圖示代表一件物件。"
      }
    },
    workedExample: {
      content: {
        en: `A table is ${math("110")} cm long, which can also be recorded as ${math("1")} m ${math("10")} cm because ${math(String.raw`1\text{ m}=100\text{ cm}`)}. In a pictogram whose key is "● = one fruit", six apple icons and four banana icons show ${math("6+4=10")} fruits.`,
        zh: `桌子長 ${math("110")} 厘米，也可記作 ${math("1")} 米 ${math("10")} 厘米，因為 ${math(String.raw`1\text{ 米}=100\text{ 厘米}`)}。在圖例為「●＝一個水果」的象形圖中，六個蘋果圖示和四個香蕉圖示表示 ${math("6+4=10")} 個水果。`
      }
    },
    checklist: {
      title: { en: "Length and pictogram checklist", zh: "長度與象形圖清單" },
      items: [
        { en: "Estimate first, choose a suitable measuring tool, and write m or cm with the result.", zh: "先估計，再選擇合適量度工具，並在結果寫上米或厘米。" },
        { en: "Read the pictogram key before counting each category and its total.", zh: "點算各類及其總數前，先閱讀象形圖圖例。" },
        { en: "Compare whether the answer is longer, shorter, more, or fewer.", zh: "比較答案是較長、較短、較多還是較少。" }
      ]
    },
    visualization: {
      title: { en: "Compare metre lengths and count one-to-one pictures", zh: "比較以米量度的長度並點算一對一圖示" },
      content: {
        en: "Use 1 m = 100 cm to compare measured lengths without decimal notation, then read a one-to-one pictogram with an explicit key in which one icon represents one object and count each category and total.",
        zh: "運用 1 米＝100 厘米比較量度所得的長度而不使用小數記法，再閱讀每個圖示代表一件物件且有明確圖例的一對一象形圖，並點算各類圖示及總數。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Estimate and then measure three room-scale lengths; record each with a suitable m or cm unit.", zh: "先估計再量度三個較長的長度，並以合適的米或厘米單位記錄。" },
        { en: "Make a one-to-one pictogram with the key 'one icon = one object', label its categories and totals, and write one comparison sentence.", zh: "製作圖例為「一個圖示＝一件物件」的一對一象形圖，標示類別和總數，並寫一句比較句子。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-multiplication-division",
    title: { en: "Multiplication and Division: Written Work, Sharing, Grouping", zh: "乘法與除法：直式、平均分、分組" },
    description: {
      en: "Multiply a multi-digit number by one digit and interpret division as sharing or grouping, including a remainder.",
      zh: "計算多位數乘一位數，並把除法理解為平均分或分組，包括有餘數的情況。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Place value and two meanings of division", zh: "位值與除法的兩種意思" },
      content: {
        en: "When multiplying by one digit, multiply each place value and regroup when needed. Division can find how many are in each equal share or how many equal groups can be made; a remainder is what cannot form another full group.",
        zh: "多位數乘一位數時，要逐個位值相乘，並在需要時進位。除法可求每份有多少，或可組成多少組；餘數是未能再組成完整一組的數量。"
      }
    },
    workedExample: {
      content: {
        en: `${math("124 \\times 3 = 372")}: multiply ones, tens, then hundreds, regrouping as needed. If ${math("38")} counters are put into groups of ${math("6")}, then ${math("38 \\div 6 = 6 \\text{ remainder } 2")}; six full groups use ${math("36")} counters and ${math("2")} remain.`,
        zh: `${math("124 \\times 3 = 372")}：依次把個位、十位和百位乘以 3，並在需要時進位。若把 ${math("38")} 粒珠每 ${math("6")} 粒分一組，則 ${math("38 \\div 6 = 6 \\text{ 餘 } 2")}；六組共用 ${math("36")} 粒，剩下 ${math("2")} 粒。`
      }
    },
    checklist: {
      title: { en: "Multiplication and division checklist", zh: "乘除法清單" },
      items: [
        { en: "Keep each partial product in its correct place-value column.", zh: "把每個部分積寫在正確的位值欄。" },
        { en: "Decide whether division asks for the group size or the number of groups.", zh: "判斷除法要求每組數量還是組數。" },
        { en: "Check that any remainder is smaller than the divisor.", zh: "檢查餘數是否小於除數。" }
      ]
    },
    extension: {
      items: [
        { en: "Create one sharing story and one grouping story for the same division calculation.", zh: "為同一道除法創作一個平均分故事和一個分組故事。" },
        { en: "Explain how multiplication can check a quotient and remainder.", zh: "解釋如何用乘法檢查商和餘數。" }
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
        zh: `例如 ${math("\\frac{1}{4}")} 表示四等份中的一份。等值分數把同一整體分成不同數目的等份，所表示的數量相同。`
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
      title: { en: "Rename one fraction with twice as many equal parts", zh: "把同一分數改寫為兩倍等份" },
      content: {
        en: "Choose one fraction and verify only its exact ×2 equivalent name on the same whole; the model does not compare arbitrary non-equivalent fractions.",
        zh: "在同一個整體中選擇一個分數，只驗證把分子和分母同乘 2 的等值名稱；此模型不比較任意非等值分數。"
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
    title: { en: "Measurement and Bar Charts: Units, Scales, Context", zh: "度量與棒形圖：單位、刻度、情境" },
    description: {
      en: "Choose suitable units, solve length, mass, and capacity questions, and read a single-series bar chart from its scale.",
      zh: "選擇合適單位，解決長度、重量和容量題，並按刻度閱讀單系列棒形圖。"
    },
    estimatedMinutes: 26,
    concept: {
      title: { en: "Units give numbers meaning", zh: "單位令數字有意義" },
      content: {
        en: "A measurement answer is incomplete without a unit. Small objects often use centimetres or grams; larger quantities use metres, kilograms, or litres. On a bar chart, read the title, labels, and scale before reading a bar's value.",
        zh: "度量答案沒有單位便不完整。小物件常用厘米或克，較大的量則用米、公斤或升。閱讀棒形圖時，先看標題、標籤和刻度，才讀出棒的數值。"
      }
    },
    workedExample: {
      content: {
        en: `${math("1")} L is ${math("1000")} mL. If a bottle holds ${math("750")} mL, it holds less than ${math("1")} L because ${math("750<1000")}. On a single-series bar chart marked in steps of ${math("2")} kg, a bar ending at ${math("6")} represents ${math("6")} kg.`,
        zh: `${math("1")} 升等於 ${math("1000")} 毫升。若水樽容量是 ${math("750")} 毫升，便少於 ${math("1")} 升，因為 ${math("750<1000")}。在每格為 ${math("2")} 公斤的單系列棒形圖中，棒頂到達 ${math("6")} 表示 ${math("6")} 公斤。`
      }
    },
    checklist: {
      title: { en: "Measurement checklist", zh: "度量清單" },
      items: [
        { en: "Choose a unit that fits the object.", zh: "選擇適合物件大小的單位。" },
        { en: "Convert before comparing different units.", zh: "比較不同單位前先換算。" },
        { en: "Read the bar-chart scale before reading a bar height.", zh: "讀取棒的高度前先看棒形圖刻度。" },
        { en: "Keep the unit in the final sentence.", zh: "在最後答案保留單位。" }
      ]
    },
    extension: {
      items: [
        { en: "Choose one measurement type (for example, length), four comparable objects, and one common unit for all four measurements.", zh: "選擇一種度量類型（例如長度）、四件可比較的物件，並以同一單位量度全部四件物件。" },
        { en: "Measure that same property for all four objects, then draw a single-series bar chart with complete axis labels, a stated scale, and the common unit.", zh: "量度四件物件的同一性質，再繪畫一幅有完整坐標軸標籤、清楚標明刻度和共用單位的單系列棒形圖。" }
      ]
    }
  }),
  lesson({
    topicId: "p3-geometry-patterns",
    title: { en: "Quadrilaterals and Triangles: Recognise and Describe", zh: "四邊形與三角形：辨認與描述" },
    description: {
      en: "Recognise concrete quadrilaterals and triangles by their sides, vertices, and marked equal or parallel sides.",
      zh: "按邊、頂點，以及已標示的相等邊或平行邊，辨認具體四邊形與三角形。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "Count sides and read property marks", zh: "數邊並閱讀性質記號" },
      content: {
        en: "A triangle is a closed plane figure with three straight sides and three vertices. A quadrilateral has four straight sides and four vertices. Matching tick marks show equal sides, while matching arrow marks show parallel sides; use only the properties actually shown.",
        zh: "三角形是有三條直邊和三個頂點的封閉平面圖形；四邊形有四條直邊和四個頂點。相同短線記號表示邊長相等，相同箭嘴記號表示邊互相平行；分類時只使用圖中已顯示的性質。"
      }
    },
    workedExample: {
      content: {
        en: "A closed figure has four straight sides. Its opposite sides carry two matching pairs of arrow marks, so both pairs of opposite sides are parallel. Therefore it is a parallelogram, which is also a quadrilateral. A triangle with three matching side marks is an equilateral triangle.",
        zh: "一個封閉圖形有四條直邊，而兩組對邊分別有相同箭嘴記號，所以兩組對邊都互相平行；因此它是平行四邊形，也屬於四邊形。若三角形的三條邊都有相同短線記號，便是等邊三角形。"
      }
    },
    checklist: {
      title: { en: "Shape recognition checklist", zh: "圖形辨認清單" },
      items: [
        { en: "Check that the figure is closed and count its straight sides and vertices.", zh: "檢查圖形是否封閉，並數清楚直邊和頂點。" },
        { en: "Read matching marks for equal or parallel sides.", zh: "閱讀表示相等邊或平行邊的相同記號。" },
        { en: "Name the shape using only properties that are visible or stated.", zh: "只按可見或已說明的性質為圖形命名。" }
      ]
    },
    visualization: {
      title: { en: "Sort quadrilaterals and triangles by visible properties", zh: "按可見性質分類四邊形與三角形" },
      content: {
        en: "Inspect concrete closed figures, count three or four sides and vertices, and use visible equal-side or parallel-side marks to recognise a triangle or quadrilateral and its stated subtype.",
        zh: "檢視具體封閉圖形，數出三條或四條邊及其頂點，再按可見的等邊或平行邊記號辨認三角形、四邊形及已說明的子類。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw two different quadrilaterals and mark any equal or parallel sides.", zh: "畫出兩個不同四邊形，並標示任何相等邊或平行邊。" },
        { en: "Measure or directly compare the side lengths of three triangular objects, then classify each triangle from those measured side-length relationships.", zh: "量度或直接比較三件三角形物件的邊長，再按量得的邊長關係為每個三角形分類。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-large-numbers",
    title: { en: "Multiples, Factors, H.C.F. and L.C.M.", zh: "倍數、因數、最大公因數與最小公倍數" },
    description: {
      en: "Use exact division, factor pairs, and multiple lists to classify positive integers and find common factors or multiples.",
      zh: "運用整除、因數組和倍數表為正整數分類，並找出公因數或公倍數。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "Factors divide exactly; multiples come from multiplication", zh: "因數可整除；倍數由乘法產生" },
      content: {
        en: "For positive integers, d is a factor of n exactly when n = dq + r has remainder r = 0. Positive multiples of n are n, 2n, 3n, and so on. The H.C.F. is the greatest common factor; the L.C.M. is the least positive common multiple. The number 1 is neither prime nor composite.",
        zh: "對正整數而言，若 n＝dq＋r 的餘數 r＝0，d 才是 n 的因數。n 的正倍數是 n、2n、3n 等。最大公因數是最大的公因數；最小公倍數是最小的正公倍數。1 既不是質數，也不是合成數。"
      }
    },
    workedExample: {
      content: {
        en: `${math("18=1\\times18=2\\times9=3\\times6")}, so the complete positive factor list is ${math("1,2,3,6,9,18")}. The common factors of ${math("12")} and ${math("18")} are ${math("1,2,3,6")}, hence their H.C.F. is ${math("6")}. Their first common positive multiple is ${math("36")}, so their L.C.M. is ${math("36")}.`,
        zh: `${math("18=1\\times18=2\\times9=3\\times6")}，所以完整正因數表是 ${math("1,2,3,6,9,18")}。${math("12")} 和 ${math("18")} 的公因數是 ${math("1,2,3,6")}，最大公因數是 ${math("6")}；兩數第一個相同的正倍數是 ${math("36")}，所以最小公倍數是 ${math("36")}。`
      }
    },
    checklist: {
      title: { en: "Multiples and factors checklist", zh: "倍數與因數清單" },
      items: [
        { en: "Check a proposed factor by dividing and verifying remainder 0.", zh: "用除法檢查候選因數，並驗證餘數為 0。" },
        { en: "List factor pairs without missing or repeating a pair.", zh: "列出因數組，不遺漏也不重複。" },
        { en: "Choose the greatest common factor or the least positive common multiple as asked.", zh: "按題意選出最大的公因數或最小的正公倍數。" }
      ]
    },
    extension: {
      items: [
        { en: "Find all positive factors of 24 and classify 23 and 24 as prime or composite.", zh: "找出 24 的所有正因數，並把 23 和 24 分為質數或合成數。" },
        { en: "Use lists to find the H.C.F. and L.C.M. of another pair of positive integers.", zh: "用列表求另一對正整數的最大公因數和最小公倍數。" }
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
        en: "The first digit after the decimal point counts tenths, and the second digit counts hundredths. Adding a trailing zero to the right of the final decimal digit does not change the value.",
        zh: "小數點後第一位表示十分位，第二位表示百分位。在小數部分最右方添上 0 不會改變數值。"
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
      title: { en: "Place decimals on a number line", zh: "把小數放在數線上" },
      content: {
        en: "Move one value from 0.00 to 2.00 in steps of 0.01 on a number line and connect its position to ones, tenths, and hundredths.",
        zh: "在數線上以 0.01 為一步移動 0.00 至 2.00 的數值，並把位置連繫到個位、十分位和百分位。"
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
    title: { en: "Quadrilateral Families and Shape Composition", zh: "四邊形類別與圖形拼砌" },
    description: {
      en: "Relate squares, rectangles, rhombuses, and parallelograms, then dissect and form concrete plane shapes.",
      zh: "連繫正方形、長方形、菱形和平行四邊形，再分割和拼砌具體平面圖形。"
    },
    estimatedMinutes: 28,
    concept: {
      title: { en: "A shape can belong to more than one family", zh: "一個圖形可屬於多個類別" },
      content: {
        en: "A rhombus has four equal sides and both pairs of opposite sides parallel. Every square is both a rectangle and a rhombus; every square, rectangle, and rhombus is a parallelogram. The reverse statements are not automatically true. Shapes can also be cut into smaller polygons and rearranged.",
        zh: "菱形有四條等邊，而且兩組對邊互相平行。每個正方形都是長方形和菱形；正方形、長方形和菱形都屬於平行四邊形。這些敘述的逆敘述不一定成立。圖形也可分割成較小多邊形再重新拼砌。"
      }
    },
    workedExample: {
      content: {
        en: "A square has four equal sides and also satisfies every rectangle property, so it belongs to both families. Joining opposite vertices of a rectangle divides it into two right triangles; joining opposite vertices of a square gives two isosceles right triangles.",
        zh: "正方形有四條等邊，也符合長方形的全部性質，所以同時屬於兩個類別。連接長方形的一組相對頂點，可把它分成兩個直角三角形；連接正方形的一組相對頂點，則得到兩個等腰直角三角形。"
      }
    },
    checklist: {
      title: { en: "Quadrilateral and composition checklist", zh: "四邊形與拼砌清單" },
      items: [
        { en: "Check equal sides, parallel opposite sides, and right angles before naming a quadrilateral family.", zh: "命名四邊形類別前，先檢查等邊、互相平行的對邊和直角。" },
        { en: "Use a one-way family statement only in the direction proved by the properties.", zh: "只按性質已證明的方向使用單向包含敘述。" },
        { en: "When dissecting or forming a shape, account for every piece without overlap or gaps.", zh: "分割或拼砌圖形時，要使用全部圖塊，不重疊也不留空隙。" }
      ]
    },
    visualization: {
      title: { en: "Relate quadrilateral families and rearrange pieces", zh: "連繫四邊形類別並重排圖塊" },
      content: {
        en: "Switch between a family-relations model and a dissect-and-form model. Verify the square, rectangle, rhombus, and parallelogram inclusions from visible equal-side, parallel-side, and right-angle marks, then form a rectangle from two congruent right trapeziums.",
        zh: "在類別關係模型和分割拼砌模型之間切換。由可見的等邊、平行邊和直角記號驗證正方形、長方形、菱形和平行四邊形的包含關係，再用兩個全等直角梯形拼成長方形。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw a family map showing where a square belongs, and give one counterexample to a false converse.", zh: "畫出正方形所屬類別圖，並以一個反例否定錯誤逆敘述。" },
        { en: "Cut two matching paper right trapeziums and arrange them into a rectangle without overlap or gaps.", zh: "剪出兩個相同的紙直角梯形，並在不重疊、不留空隙下拼成長方形。" }
      ]
    }
  }),
  lesson({
    topicId: "p4-perimeter-area",
    title: { en: "Perimeter and Area: Boundary and Surface", zh: "周界與面積：邊界與表面" },
    description: {
      en: "Find perimeter and area for rectangles and suitable rectilinear composite shapes.",
      zh: "求長方形及合適直線組合圖形的周界與面積。"
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
        { en: "Where appropriate, split a rectilinear composite shape into non-overlapping rectangles.", zh: "在合適情況下，把直線組合圖形分拆為互不重疊的長方形。" }
      ]
    },
    visualization: {
      title: { en: "Compare boundary length and covered area", zh: "比較邊界長度與覆蓋面積" },
      content: {
        en: "Change one rectangle's length and width and keep its boundary length and covered square units visible together.",
        zh: "改變同一個長方形的長和闊，並同時顯示其邊界總長度和所覆蓋的平方單位。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Draw two different rectangles with area 24 square units.", zh: "畫出兩個面積為 24 平方單位的不同長方形。" },
        { en: "Draw a rectilinear composite shape and describe one valid split into non-overlapping rectangles.", zh: "畫一個直線組合圖形，並描述一種把它分拆成互不重疊長方形的方法。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-fractions-operations",
    title: { en: "Fraction Operations: Unlike Denominators, Up to Three Terms", zh: "分數運算：異分母、最多三項" },
    description: {
      en: "Rename, add, or subtract two or three fractions with unlike denominators, then simplify the result.",
      zh: "把兩項或三項異分母分數改寫為同分母後加減，並約簡答案。"
    },
    estimatedMinutes: 34,
    concept: {
      title: { en: "Rename unlike parts before operating", zh: "運算前先把異分母改寫" },
      content: {
        en: "For unlike denominators, use the least common denominator to rename every fraction as equal-sized parts. Then add or subtract the numerators and simplify only after the full calculation.",
        zh: "處理異分母時，先用最小公分母把每個分數改寫成相同大小的份，再加減分子，並在完成整個算式後約簡。"
      }
    },
    workedExample: {
      content: {
        en: `${math("\\frac{1}{2}+\\frac{1}{3}-\\frac{1}{6}=\\frac{3}{6}+\\frac{2}{6}-\\frac{1}{6}=\\frac{4}{6}=\\frac{2}{3}")}. The least common denominator ${math("6")} makes all three terms comparable.`,
        zh: `${math("\\frac{1}{2}+\\frac{1}{3}-\\frac{1}{6}=\\frac{3}{6}+\\frac{2}{6}-\\frac{1}{6}=\\frac{4}{6}=\\frac{2}{3}")}。最小公分母 ${math("6")} 令三項都可比較。`
      }
    },
    checklist: {
      title: { en: "Fraction operations checklist", zh: "分數運算清單" },
      items: [
        { en: "Find a common denominator for every term.", zh: "為每一項找出公分母。" },
        { en: "Rename each numerator without changing the fraction's value.", zh: "改寫每個分子時保持分數值不變。" },
        { en: "Simplify the complete final fraction.", zh: "把完整的最終分數約至最簡。" }
      ]
    },
    visualization: {
      title: { en: "Rename two or three fraction bars", zh: "改寫兩項或三項分數條" },
      content: {
        en: "Add or subtract two or three proper fractions with unlike denominators, visibly rename them over the least common denominator, then simplify.",
        zh: "加減兩項或三項異分母真分數，把它們清楚改寫為以最小公分母作分母，再約簡。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Create a three-term unlike-denominator calculation whose answer is one whole.", zh: "創作一道答案為一整體的三項異分母算式。" },
        { en: "Explain why adding denominators would change the size of the parts.", zh: "解釋為何把分母直接相加會改變每份的大小。" }
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
      title: { en: "Build a cuboid in layers", zh: "按層建立長方體" },
      content: {
        en: "Use the geometry canvas to discuss unit cubes, layers, cuboids, and cubic units.",
        zh: "用幾何畫布討論小立方體、分層、長方體和立方單位。"
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
    title: { en: "Unitary Method for Unit Price", zh: "歸一法求單價" },
    description: {
      en: "Use one-unit reasoning to compare prices for equal items, keeping exact values before any approximation.",
      zh: "運用歸一法比較等量物件的價錢，並在近似前保留精確值。"
    },
    estimatedMinutes: 32,
    concept: {
      title: { en: "Find the price of one item first", zh: "先求一件物件的價錢" },
      content: {
        en: "Divide the total price by the equal item count to find the unit price. When the same unit price applies, multiply that one-item value to price another quantity of the same item; keep an exact fraction when the decimal does not terminate.",
        zh: "把總價除以相等物件數求單價。在單價不變時，再把一件的價錢乘以同一物件的目標件數；若小數不能除盡，先保留精確分數。"
      }
    },
    workedExample: {
      content: {
        en: `If ${math("3")} notebooks cost HK$${math("20")}, one notebook costs exactly HK$${math("\\frac{20}{3}")}, approximately HK$${math("6.67")}. Five notebooks therefore cost exactly HK$${math("\\frac{100}{3}")}, approximately HK$${math("33.33")}.`,
        zh: `若 ${math("3")} 本筆記簿售港幣 ${math("20")} 元，每本的精確單價是港幣 ${math("\\frac{20}{3}")} 元，約為港幣 ${math("6.67")} 元；${math("5")} 本的精確價錢是港幣 ${math("\\frac{100}{3}")} 元，約為港幣 ${math("33.33")} 元。`
      }
    },
    checklist: {
      title: { en: "Unit-price checklist", zh: "單價清單" },
      items: [
        { en: "Divide total price by the item count.", zh: "把總價除以物件數。" },
        { en: "Label the result as a price per one item.", zh: "把結果標示為每一件的價錢。" },
        { en: "Keep the exact fraction and label any decimal as an approximation.", zh: "保留精確分數，並把任何小數標明為近似值。" }
      ]
    },
    extension: {
      items: [
        { en: "Compare two offers for the same item and unit by unit price.", zh: "用單價比較同一物件及同一單位的兩個優惠。" },
        { en: "Create a unit-price comparison whose exact fractional answer has a non-terminating decimal expansion.", zh: "創作一道單價比較題，使其精確答案為分數，而化成小數時不能除盡。" }
      ]
    }
  }),
  lesson({
    topicId: "p5-charts-averages",
    title: { en: "Compound Bar Charts: Compare Two Series", zh: "複合棒形圖：比較兩組數據" },
    description: {
      en: "Read and compare two series category by category on one compound bar chart and one shared scale.",
      zh: "在同一刻度的複合棒形圖上，逐類閱讀和比較兩組數據。"
    },
    estimatedMinutes: 30,
    concept: {
      title: { en: "One category, two bars, one scale", zh: "每類兩支棒，共用同一刻度" },
      content: {
        en: "A compound bar chart places two related series beside each category. Use the legend to identify each bar and the shared vertical scale to compare their values fairly.",
        zh: "複合棒形圖在每個類別旁並列兩組相關數據。先用圖例辨認每支棒，再用共用縱軸刻度作公平比較。"
      }
    },
    workedExample: {
      content: {
        en: `For category B, Series 1 has ${math("14")} and Series 2 has ${math("9")}. Their difference is ${math("14-9=5")}. This comparison uses the two bars for category B, not bars from different categories.`,
        zh: `在類別 B，第一組數據是 ${math("14")}，第二組是 ${math("9")}，相差 ${math("14-9=5")}。比較時要使用同一類別 B 的兩支棒，不可混用其他類別。`
      }
    },
    checklist: {
      title: { en: "Data checklist", zh: "數據清單" },
      items: [
        { en: "Read the title, legend, category, and shared scale.", zh: "閱讀標題、圖例、類別和共用刻度。" },
        { en: "Compare bars from the same category.", zh: "比較同一類別內的棒。" },
        { en: "State the two values and the difference in context.", zh: "在情境中說出兩個數值和差。" }
      ]
    },
    visualization: {
      title: { en: "Adjust two series on one compound bar chart", zh: "在同一複合棒形圖調整兩組數據" },
      content: {
        en: "Select a category, change both series, and explain their difference using the visible legend and shared scale.",
        zh: "選擇一個類別、改變兩組數據，並利用可見圖例和共用刻度解釋差異。"
      },
      moduleId: "configured-visualization-lab",
      source: "probability"
    },
    extension: {
      items: [
        { en: "Design a two-series chart where each series leads in different categories.", zh: "設計一幅兩組數據在不同類別各有領先的複合棒形圖。" },
        { en: "Explain why both series must use the same scale.", zh: "解釋為何兩組數據必須使用同一刻度。" }
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
        en: `${math("25\\%")} means ${math("25")} out of ${math("100")}, which is ${math("0.25")} or ${math("\\frac{1}{4}")}. Identify the base whole for each percentage; a percentage increase or decrease is calculated from the stated original amount.`,
        zh: `${math("25\\%")} 表示 ${math("100")} 份中的 ${math("25")} 份，即 ${math("0.25")} 或 ${math("\\frac{1}{4}")}。每個百分數都要辨認其基準整體；百分數增減以題目指定的原數為基準計算。`
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
      title: { en: "Keep four percentage forms synchronized", zh: "同步四種百分數表示" },
      content: {
        en: "Change p and keep p%, p/100, its decimal form, and exactly p shaded cells in one fixed 100-cell grid synchronized.",
        zh: "改變 p，並同步顯示 p%、p/100、相應小數，以及固定百格圖中正好 p 個已塗色方格。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Increase 80 by 25% and find the new amount.", zh: "把 80 增加 25%，求新的數量。" },
        { en: "Decrease 80 by 10% and explain why the new amount is less than 80.", zh: "把 80 減少 10%，並解釋為何新數量少於 80。" }
      ]
    }
  }),
  lesson({
    topicId: "p6-ratio-proportion",
    title: { en: "Averages and Broken-Line Graphs", zh: "平均數與折線圖" },
    description: {
      en: "Interpret the mean as a fair share and read ordered time or continuous data from one or two broken-line graphs.",
      zh: "把平均數理解為平均分配，並從一條或兩條折線圖閱讀有序的時間或連續數據。"
    },
    estimatedMinutes: 36,
    concept: {
      title: { en: "Mean shares a total; line graphs preserve order", zh: "平均數平分總和；折線圖保留次序" },
      content: {
        en: "The mean equals total divided by the number of data values; it is the equal share each value would have if the total were redistributed. A broken-line graph joins consecutive points from ordered time or continuous data. Its axes, scale, and units must be stated, and a line beyond observed points is not automatically a fact.",
        zh: "平均數等於數據總和除以數據個數；若把總和平分，每項都會得到平均數。折線圖把按時間或連續量排列的相鄰數據點連起來，必須標明坐標軸、刻度和單位；觀察點以外的延伸線段不會自動成為事實。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("4,6,8,10")}, the total is ${math("28")} and the count is ${math("4")}, so the mean is ${math("28\\div4=7")}. If these values are daily temperatures, plot them above Day 1 to Day 4 and join only consecutive days.`,
        zh: `數據 ${math("4,6,8,10")} 的總和是 ${math("28")}，數據個數是 ${math("4")}，所以平均數是 ${math("28\\div4=7")}。若它們是每日氣溫，便把各點標在第 1 至第 4 天上方，並只連接相鄰日子的數據點。`
      }
    },
    checklist: {
      title: { en: "Mean and broken-line graph checklist", zh: "平均數與折線圖清單" },
      items: [
        { en: "Add every data value once, then divide the total by the count.", zh: "每個數據只加一次，再把總和除以數據個數。" },
        { en: "Label both axes, the scale, and units before reading plotted values.", zh: "讀取標繪數值前先標明兩軸、刻度和單位。" },
        { en: "Join only consecutive ordered points and do not claim unobserved values.", zh: "只連接按序相鄰的點，不把未觀察數值說成事實。" }
      ]
    },
    extension: {
      items: [
        { en: "Change one value in a dataset and explain how its total and mean change.", zh: "改變數據集中的一個數值，並解釋總和與平均數如何改變。" },
        { en: "Measure the same quantity at five consecutive time points and draw a broken-line graph with complete axis labels, a stated scale, and units.", zh: "在連續五個時間點量度同一個量，並繪畫一幅有完整坐標軸標籤、清楚標明刻度和單位的折線圖。" }
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
      title: { en: "Synchronize a straight journey graph", zh: "同步直線路程圖" },
      content: {
        en: "Change speed or time and keep distance = speed × time, the value table, and a straight distance–time journey line through the origin synchronized; interpret the line's gradient as speed.",
        zh: "改變速率或時間，並同步顯示「距離＝速率×時間」、數值表和通過原點的直線距離—時間路程線；把直線斜率解讀為速率。"
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
        { en: "Underline known facts and the target.", zh: "在已知資料及題目所求之下畫線。" },
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
        en: "Positive numbers are to the right of zero and negative numbers are to the left. A signed operand controls direction: adding a positive moves right, adding a negative moves left, and subtraction reverses the direction of the number being subtracted.",
        zh: "正數在零的右方，負數在零的左方。帶符號的運算數決定方向：加正數向右、加負數向左，而減去一個數就是向該數的相反方向移動。"
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
        { en: "Read the operation and the operand sign separately before choosing a direction.", zh: "選擇方向前，分開閱讀運算符號和運算數的正負號。" },
        { en: "Check whether the final point is left or right of zero.", zh: "檢查終點在零的左方還是右方。" }
      ]
    },
    visualization: {
      title: { en: "Test signed moves on an integer number line", zh: "在整數數線測試帶符號移動" },
      content: {
        en: "Choose a positive or negative starting value and a signed operand. Show addition or subtraction on one signed number line and verify cases such as −3 + 8, 3 + (−5), and 3 − (−5).",
        zh: "選擇正或負的起始值和帶符號運算數，在同一條帶符號數線上顯示加法或減法，並驗證例如 −3＋8、3＋（−5）和 3−（−5）的情況。"
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
        en: "A variable represents a number that may change or be unknown. Like terms can be combined when they have the same variable part. In an equation, the equals sign states that both sides have the same value, so every solving operation must be applied to both sides.",
        zh: "變量代表可能改變或未知的數。同類項有相同變量部分，因此可以合併。在方程中，等號表示兩邊數值相同，所以解題時每個運算都必須同時施加於兩邊。"
      }
    },
    workedExample: {
      content: {
        en: `${math("3x + 2x")} has like terms, so ${math("3x + 2x = 5x")}. For ${math("x + 4 = 9")}, subtract ${math("4")} from both sides: ${math("x + 4 - 4 = 9 - 4")}, hence ${math("x = 5")}. Substitution checks that ${math("5 + 4 = 9")}.`,
        zh: `${math("3x + 2x")} 是同類項，所以 ${math("3x + 2x = 5x")}。對 ${math("x + 4 = 9")}，兩邊同減 ${math("4")}：${math("x + 4 - 4 = 9 - 4")}，因此 ${math("x = 5")}。代入可檢查 ${math("5 + 4 = 9")}。`
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
        en: `A straight angle is ${math("180^\\circ")}, a reflex angle is greater than ${math("180^\\circ")} but less than ${math("360^\\circ")}, and a complete angle is ${math("360^\\circ")}. Angles on a straight line add to ${math("180^\\circ")}, angles around a point add to ${math("360^\\circ")}, and the three interior angles of a triangle add to ${math("180^\\circ")}.`,
        zh: `平角是 ${math("180^\\circ")}，反角大於 ${math("180^\\circ")} 但小於 ${math("360^\\circ")}；周角是 ${math("360^\\circ")}。一直線上的角和為 ${math("180^\\circ")}、一點周圍的角和為 ${math("360^\\circ")}、三角形內角和為 ${math("180^\\circ")}。`
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
      title: { en: "Drag a triangle and watch the angle sum", zh: "拖曳三角形並觀察內角和" },
      content: {
        en: "Move the vertices and compare individual angle sizes with the fixed triangle angle sum.",
        zh: "移動頂點，比較個別角度大小與固定的三角形內角和。"
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
        en: `In a part-to-part sharing context, a ratio such as ${math("2:3")} describes ${math("5")} equal parts in total. The actual size of one part depends on the context, so the same sharing ratio can describe money, length, time, or quantity.`,
        zh: `在按部分與部分分配的情境中，例如 ${math("2:3")} 表示總共有 ${math("5")} 份相等的部分。每份的實際大小由情境決定，所以同一個分配比可描述金錢、長度、時間或數量。`
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
        en: "A chart organizes data so patterns are visible. The mean summarizes a typical value. The median is the middle value after the data are ordered; with an even number of values, use the mean of the two middle values. The spread shows whether the values are close together or varied.",
        zh: "圖表整理數據，令規律更容易看見。平均數概括典型數值。中位數是把數據排序後的中間值；若數據個數為偶數，取中間兩數的平均數。分散程度顯示數值是否接近或差異大。"
      }
    },
    workedExample: {
      content: {
        en: `For ${math("4, 7, 10")}, the mean is ${math("\\frac{4 + 7 + 10}{3} = 7")}. For ${math("2, 9, 5")}, order the values as ${math("2, 5, 9")}; the median is ${math("5")}. The values are spread around their centre, so a measure of centre should be interpreted with the range.`,
        zh: `對 ${math("4, 7, 10")} 而言，平均數是 ${math("\\frac{4 + 7 + 10}{3} = 7")}。對 ${math("2, 9, 5")} 而言，先排序為 ${math("2, 5, 9")}；中位數是 ${math("5")}。數值分散在中心附近，所以集中趨勢的量度應與全距一起解讀。`
      }
    },
    checklist: {
      title: { en: "Statistics checklist", zh: "統計清單" },
      items: [
        { en: "Read chart titles, labels, and scale first.", zh: "先閱讀圖表標題、標籤和刻度。" },
        { en: "Add all values before finding the mean.", zh: "求平均數前先加總所有數值。" },
        { en: "Sort the data before finding the median.", zh: "求中位數前先排序。" },
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
        en: `The horizontal ${math("x")}-axis and vertical ${math("y")}-axis meet at the origin ${math("(0,0)")}. A point ${math("(x, y)")} is found by moving horizontally from the origin first, then vertically. The signs of ${math("x")} and ${math("y")} determine the quadrant.`,
        zh: `水平 ${math("x")} 軸和垂直 ${math("y")} 軸在原點 ${math("(0,0)")} 相交。點 ${math("(x, y)")} 由原點先水平移動，再垂直移動定位；${math("x")} 和 ${math("y")} 的正負決定象限。`
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
      title: { en: "Plot and connect points", zh: "標示並連接點" },
      content: {
        en: "Plot, label, and connect at least three signed points. Then apply either a pure translation or a pure reflection, showing the axes, origin, and any coincident original-and-image state explicitly.",
        zh: "標示、命名並連接至少三個帶正負號的點，然後只進行純平移或純反射，並清楚顯示坐標軸、原點，以及原像與影像重合的狀態。"
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
    title: { en: "Transformations: Translation, Reflection, and Rotation", zh: "變換：平移、反射與旋轉" },
    description: {
      en: "Connect translation, reflection, and rotation to exact coordinate rules; explore enlargement about the origin only as enrichment.",
      zh: "把平移、反射和旋轉連繫到精確坐標規則；以原點放大只作延伸學習。"
    },
    estimatedMinutes: 40,
    concept: {
      title: { en: "Transformation rules", zh: "變換規則" },
      content: {
        en: "A transformation sends each original point to one image point. A translation adds the same vector, a reflection maps points across a stated mirror line and fixes every point on that line, and a rotation turns points through a stated angle about a stated centre. These core mappings preserve lengths and angles.",
        zh: "變換會把每個原像點對應到一個影像點。平移加入同一向量；反射以指定鏡線為對稱軸映射各點（鏡線上的點保持不變）；旋轉則以指定中心轉過指定角度。這些核心變換都保持長度和角度。"
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
      title: { en: "Test transformations on a coordinate plane", zh: "在坐標平面測試變換" },
      content: {
        en: "Apply a pure translation, reflection in x = k, or a clockwise or anticlockwise rotation of 90°, 180°, or 270° about the origin. Use the explicitly labelled Enrichment mode only for enlargement about the origin.",
        zh: "進行純平移、關於 x＝k 的反射，或以原點為中心順時針或逆時針旋轉 90°、180° 或 270°；只有明確標示為「延伸學習」的模式才進行以原點放大。"
      },
      moduleId: "configured-visualization-lab",
      source: "coordinate-plane"
    },
    extension: {
      items: [
        { en: "Combine a translation and reflection, then describe the final image.", zh: "結合一次平移和一次反射，並描述最終影像。" },
        { en: "Enrichment: enlarge a shape about the origin and explain how one scale factor changes every distance from the origin.", zh: "延伸學習：以原點放大圖形，解釋同一比例因子如何改變每個點到原點的距離。" }
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
      title: { en: "Run repeated dice trials", zh: "進行重複擲骰試驗" },
      content: {
        en: "Roll the seeded six-sided die once or 20 times, retain cumulative counts for all six faces beyond 20 trials, compare theoretical and experimental P(even), and use Reset to start a new run explicitly.",
        zh: "把帶種子的六面骰擲 1 次或 20 次，在超過 20 次後仍累積六個面的次數，比較偶數的理論概率與實驗概率，並明確使用「重設」開始新一輪試驗。"
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
    title: { en: "Polynomials: Expand, Factorise, Recognise Structure", zh: "多項式：展開、因式分解、辨識結構" },
    description: {
      en: "Factorise, expand, and recognise algebraic structure in polynomial expressions.",
      zh: "在多項式中進行因式分解、展開並辨識代數結構。"
    },
    estimatedMinutes: 42,
    concept: {
      title: { en: "Structure guides the method", zh: "結構決定方法" },
      content: {
        en: "Expanding removes brackets by multiplying each term. Factorising reverses the process by identifying common factors or products that create the expression.",
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
        { en: "Check factorisation by expanding back.", zh: "用重新展開檢查因式分解。" }
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
    topicId: "identities-square-patterns",
    title: { en: "Algebraic Identities: Exact Square Area Models", zh: "代數恆等式：精確平方面積模型" },
    description: {
      en: "Prove square identities with exact area pieces, then use them to expand and factorise expressions.",
      zh: "以精確面積塊證明平方恆等式，再用它們展開和因式分解代數式。"
    },
    estimatedMinutes: 42,
    concept: {
      title: { en: "An identity is true for every allowed value", zh: "恆等式對每個容許值都成立" },
      content: {
        en: `${math("(a+b)^2 \\equiv a^2+2ab+b^2")}, ${math("(a-b)^2 \\equiv a^2-2ab+b^2")}, and ${math("a^2-b^2 \\equiv (a-b)(a+b)")} are identities for all real ${math("a,b")}. The symbol ${math("\\equiv")} says the two expressions have the same value for every real choice, not just one example. Area diagrams represent these identities only when the displayed side lengths are non-negative.`,
        zh: `${math("(a+b)^2 \\equiv a^2+2ab+b^2")}、${math("(a-b)^2 \\equiv a^2-2ab+b^2")} 和 ${math("a^2-b^2 \\equiv (a-b)(a+b)")} 對所有實數 ${math("a,b")} 都是恆等式。符號 ${math("\\equiv")} 表示兩邊對每組實數都有相同數值，而不只是一個例子；面積圖只在所顯示的邊長非負時表示這些恆等式。`
      }
    },
    workedExample: {
      content: {
        en: `For ${math("a,b\\ge0")}, a square of side ${math("a+b")} splits into areas ${math("a^2")}, ${math("ab")}, ${math("ab")}, and ${math("b^2")}. Therefore ${math("(a+b)^2 \\equiv a^2+2ab+b^2")}. For ${math("a>b\\ge0")}, removing a ${math("b \\times b")} square from an ${math("a \\times a")} square and rearranging the remainder gives ${math("a^2-b^2 \\equiv (a-b)(a+b)")}.`,
        zh: `當 ${math("a,b\\ge0")}，邊長為 ${math("a+b")} 的正方形可分成面積 ${math("a^2")}、${math("ab")}、${math("ab")} 和 ${math("b^2")}；因此 ${math("(a+b)^2 \\equiv a^2+2ab+b^2")}。當 ${math("a>b\\ge0")} 時，從 ${math("a \\times a")} 正方形移去 ${math("b \\times b")} 正方形並重排餘下部分，便得 ${math("a^2-b^2 \\equiv (a-b)(a+b)")}。`
      }
    },
    checklist: {
      title: { en: "Identity checklist", zh: "恆等式清單" },
      items: [
        { en: "Match every algebraic term to an exact area piece.", zh: "把每個代數項配對到精確面積塊。" },
        { en: "Use middle term +2ab for a square of a sum and −2ab for a square of a difference.", zh: "和的平方使用中間項 +2ab；差的平方使用中間項 −2ab。" },
        { en: "Use the identity sign only for a relationship true for every allowed value.", zh: "只有對每個容許值都成立的關係才使用恆等號。" }
      ]
    },
    visualization: {
      title: { en: "Rearrange the exact identity pieces", zh: "重排精確恆等式面積塊" },
      content: {
        en: `Switch between the ${math("(a+b)^2 \\equiv a^2+2ab+b^2")} and ${math("a^2-b^2 \\equiv (a-b)(a+b)")} area models, keep ${math("a,b\\ge0")} and ${math("a>b")} for the difference model, and use the exact pieces to verify the displayed cases. The algebraic identities themselves hold for all real ${math("a")} and ${math("b")}.`,
        zh: `在 ${math("(a+b)^2 \\equiv a^2+2ab+b^2")} 和 ${math("a^2-b^2 \\equiv (a-b)(a+b)")} 面積模型之間切換；保持 ${math("a,b\\ge0")}，且平方差模型中 ${math("a>b")}，並用精確面積塊驗證所顯示的情況。代數恆等式本身對所有實數 ${math("a")}、${math("b")} 都成立。`
      },
      moduleId: "configured-visualization-lab",
      source: "function-model"
    },
    extension: {
      items: [
        { en: "Use an identity to calculate 99 squared without long multiplication.", zh: "不用長乘法，運用恆等式計算 99 的平方。" },
        { en: "Explain why checking one numerical substitution does not prove an identity.", zh: "解釋為何只代入一組數值不能證明恆等式。" }
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
        en: `A quadratic function can be written as ${math("y = ax^2 + bx + c")}, where ${math("a \\ne 0")}. The sign of ${math("a")} controls whether the parabola opens upward or downward. The vertex is the turning point, and the axis of symmetry is ${math(String.raw`x = -\frac{b}{2a}`)}.`,
        zh: `二次函數可寫成 ${math("y = ax^2 + bx + c")}，其中 ${math("a \\ne 0")}。${math("a")} 的正負決定拋物線向上或向下開口。頂點是轉向點，對稱軸是 ${math(String.raw`x = -\frac{b}{2a}`)}。`
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
      title: { en: "Change parameters and explain the motion", zh: "改變參數並解釋圖像變化" },
      content: {
        en: `Adjust independent ${math("a")}, ${math("b")}, and ${math("c")} with ${math("a\\ne0")}, then track the correct opening, vertex, axis of symmetry, ${math("y")}-intercept, discriminant, and visible real roots or no-real-root state.`,
        zh: `獨立調整 ${math("a")}、${math("b")} 和 ${math("c")}，並保持 ${math("a\\ne0")}；同步觀察正確開口、頂點、對稱軸、${math("y")} 截距、判別式，以及可見實根或沒有實根的狀態。`
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
        en: `For an acute reference angle ${math(String.raw`\theta`)} in a right triangle, the hypotenuse is opposite the right angle. The opposite side is across from ${math(String.raw`\theta`)}, and the adjacent side is the non-hypotenuse side next to ${math(String.raw`\theta`)}. Then ${math(String.raw`\sin\theta=\frac{\text{opposite}}{\text{hypotenuse}}`)}, ${math(String.raw`\cos\theta=\frac{\text{adjacent}}{\text{hypotenuse}}`)}, and ${math(String.raw`\tan\theta=\frac{\text{opposite}}{\text{adjacent}}`)}.`,
        zh: `在直角三角形中，以銳參考角 ${math(String.raw`\theta`)} 為準：斜邊是直角對面的邊，對邊是角 ${math(String.raw`\theta`)} 對面的邊；鄰邊是與角 ${math(String.raw`\theta`)} 相鄰而又不是斜邊的那一邊。因此 ${math(String.raw`\sin\theta=\frac{\text{對邊}}{\text{斜邊}}`)}、${math(String.raw`\cos\theta=\frac{\text{鄰邊}}{\text{斜邊}}`)}、${math(String.raw`\tan\theta=\frac{\text{對邊}}{\text{鄰邊}}`)}。`
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
    topicId: "arc-length-sector-area",
    title: { en: "Arc Length and Sector Area: Fractions of a Full Circle", zh: "弧長與扇形面積：整圓的一部分" },
    description: {
      en: "Use an angle at the centre as a fraction of 360 degrees to find an arc length or a sector area, in exact and approximate form.",
      zh: "把圓心角看成 360 度的一部分，求弧長或扇形面積，並寫出精確值和近似值。"
    },
    estimatedMinutes: 44,
    concept: {
      title: { en: "A sector is the same fraction of its circle", zh: "扇形佔整圓的相同比例" },
      content: {
        en: `For radius ${math("r")} and angle at the centre ${math(String.raw`0<\theta\leq360^\circ`)}, arc length is ${math(String.raw`s=\frac{\theta}{360^\circ}\cdot2\pi r`)} and sector area is ${math(String.raw`A=\frac{\theta}{360^\circ}\cdot\pi r^2`)}. Arc length uses length units; sector area uses square units. At ${math(String.raw`\theta=360^\circ`)}, the formulas give the full circumference and full circle area.`,
        zh: `半徑為 ${math("r")}、圓心角為 ${math(String.raw`0<\theta\leq360^\circ`)} 時，弧長是 ${math(String.raw`s=\frac{\theta}{360^\circ}\cdot2\pi r`)}，扇形面積是 ${math(String.raw`A=\frac{\theta}{360^\circ}\cdot\pi r^2`)}。弧長使用長度單位，扇形面積使用平方單位。當 ${math(String.raw`\theta=360^\circ`)}，兩式分別得到整圓周長和整圓面積。`
      }
    },
    workedExample: {
      content: {
        en: `For ${math(String.raw`r=6\text{ cm}`)} and ${math(String.raw`\theta=120^\circ`)}, ${math(String.raw`s=\frac{120}{360}\cdot2\pi(6)=4\pi\text{ cm}\approx12.57\text{ cm}`)}. The sector area is ${math(String.raw`A=\frac{120}{360}\cdot\pi(6)^2=12\pi\text{ cm}^2\approx37.70\text{ cm}^2`)}.`,
        zh: `當 ${math(String.raw`r=6\text{ cm}`)}、${math(String.raw`\theta=120^\circ`)}，${math(String.raw`s=\frac{120}{360}\cdot2\pi(6)=4\pi\text{ cm}\approx12.57\text{ cm}`)}。扇形面積是 ${math(String.raw`A=\frac{120}{360}\cdot\pi(6)^2=12\pi\text{ cm}^2\approx37.70\text{ cm}^2`)}。`
      }
    },
    checklist: {
      title: { en: "Arc and sector checklist", zh: "弧與扇形清單" },
      items: [
        { en: "Identify the radius and angle at the centre before choosing a formula.", zh: "選公式前先辨認半徑和圓心角。" },
        { en: "Keep the exact answer in terms of π before giving a labelled approximation.", zh: "先保留含 π 的精確答案，再給出已標明的近似值。" },
        { en: "Use length units for an arc and square units for a sector area.", zh: "弧長使用長度單位，扇形面積使用平方單位。" }
      ]
    },
    visualization: {
      title: { en: "Preserve the full-circle fraction", zh: "保持整圓比例" },
      content: {
        en: "Change the radius and angle at the centre, compare exact π forms with approximations, and verify the full-circle state at 360 degrees.",
        zh: "改變半徑和圓心角，比較含 π 的精確值與近似值，並驗證 360 度的整圓狀態。"
      },
      moduleId: "configured-visualization-lab",
      source: "geometry"
    },
    extension: {
      items: [
        { en: "Explain why doubling the radius doubles arc length but makes sector area four times as large for the same angle.", zh: "解釋為何角度相同時，半徑加倍會令弧長加倍，但扇形面積變為四倍。" },
        { en: "Create two different sectors with the same arc length and justify your choices.", zh: "設計兩個弧長相同但不同的扇形，並說明理由。" }
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
        en: `If an angle at the centre standing on an arc is ${math("100^\\circ")}, the angle at the circumference standing on the same arc is half of it: ${math("50^\\circ")}.`,
        zh: `若一弧所對的圓心角是 ${math("100^\\circ")}，則該弧所對的圓周角是它的一半，即 ${math("50^\\circ")}。`
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
        en: "A function assigns one output to each allowed input. The domain records which inputs are allowed; for example, a denominator cannot be zero. A formula, table, graph, or mapping diagram can show the same function from different viewpoints.",
        zh: "函數會為每個容許輸入指定一個輸出。定義域記錄哪些輸入可用，例如分母不能為零。公式、數表、圖像和映射圖都可從不同角度表示同一函數。"
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
        { en: "State any excluded input before evaluating the rule.", zh: "代入規則前先寫出任何不容許輸入。" },
        { en: "Substitute brackets carefully.", zh: "小心處理代入時的括號。" },
        { en: "Compare the graph shape and visible domain with the formula family.", zh: "把圖像形狀和可見定義域與公式類型比較。" }
      ]
    },
    visualization: {
      title: { en: "Link one function across four representations", zh: "以四種表示連繫同一函數" },
      content: {
        en: "Choose a linear, quadratic, exponential, or logarithmic rule, then use the same allowed input to drive the input-output machine, value table, highlighted point, and graph.",
        zh: "選擇線性、二次、指數或對數規則，再用同一個容許輸入同步驅動輸入輸出機、數值表、已標示點和圖像。"
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
      title: { en: "Derive three results from the same two points", zh: "由同一組兩點導出三個結果" },
      content: {
        en: "Use the same two signed points to derive gradient, distance, and midpoint. When the two x-coordinates are equal, show the gradient as undefined rather than as a number.",
        zh: "使用同一組兩個帶正負號的點求斜率、距離和中點；當兩點的 x 坐標相同時，把斜率顯示為未定義，而不是一個數值。"
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
        en: "When multiplying or dividing powers with the same nonzero base, the corresponding index laws combine their exponents. Rational expressions can be simplified by factorising, cancelling common factors, and noting restrictions on denominators.",
        zh: "同一非零底數的冪相乘或相除時，可用相應指數律合併指數。有理式可透過因式分解、約去公因式和留意分母限制來化簡。"
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
        { en: "Factorise before cancelling rational expressions.", zh: "約去有理式前先因式分解。" },
        { en: "State denominator restrictions.", zh: "寫出分母限制。" },
        { en: "For products or quotients of powers, combine indices only when the bases match; retain all domain restrictions.", zh: "處理冪的乘積或商時，只在底數相同下合併指數，並保留所有定義域限制。" }
      ]
    },
    extension: {
      items: [
        { en: "Create a simplification where cancelling before factorising would be wrong.", zh: "創作一道若未因式分解就約去會出錯的化簡題。" },
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
        zh: "中位數、平均數、全距和聚集情況描述分佈的不同面向。若主張使用合適摘要並承認變異，便更有說服力。"
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
        en: `Polynomial models often turn or curve with powers of ${math("x")}. For ${math(String.raw`y=Ab^x`)} with ${math("A\\ne0")}, ${math("b>0")}, and ${math("b\\ne1")}, equal increases in ${math("x")} multiply nonzero outputs by a constant ratio. A logarithm ${math(String.raw`y=\log_b x`)} requires ${math("b>0")}, ${math("b\\ne1")}, and ${math("x>0")}; its domain explains why the graph has no point at or left of ${math("x=0")}.`,
        zh: `多項式模型常因 ${math("x")} 的冪次而轉向或彎曲。對 ${math(String.raw`y=Ab^x`)}，若 ${math("A\\ne0")}、${math("b>0")} 且 ${math("b\\ne1")}，${math("x")} 每增加相同幅度時，非零輸出值會乘以固定比率。對數 ${math(String.raw`y=\log_b x`)} 要求 ${math("b>0")}、${math("b\\ne1")} 和 ${math("x>0")}；這個定義域解釋圖像為何在 ${math("x=0")} 及其左方沒有點。`
      }
    },
    workedExample: {
      content: {
        en: "For nonzero data values sampled at equally spaced x-values, a nearly constant successive-output ratio makes an exponential model a plausible first candidate, subject to checking the context and residuals.",
        zh: "若在等距 x 值取樣所得的數據均非零，而相鄰輸出值比率接近固定，指數模型可作為初步候選，但仍須檢查情境和殘差。"
      }
    },
    checklist: {
      title: { en: "Model comparison checklist", zh: "模型比較清單" },
      items: [
        { en: "Compare differences and ratios in a table.", zh: "比較數表中的差和比。" },
        { en: "Check the logarithm base and input-domain restrictions.", zh: "檢查對數的底和輸入定義域限制。" },
        { en: "Match the graph shape before solving parameters.", zh: "求參數前先配對圖像形狀。" },
        { en: "Check long-term behaviour for large x.", zh: "檢查 x 很大時的長遠行為。" }
      ]
    },
    visualization: {
      title: { en: "Inspect the selected model on its displayed scale", zh: "在顯示刻度上檢視所選模型" },
      content: {
        en: "Adjust and interpret only the selected curve. This lab does not currently provide a controlled cross-family comparison.",
        zh: "只調整並解讀所選曲線。此實驗室目前不提供受控的跨函數類型比較。"
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
    title: { en: "Trigonometry: Graphs and Transformations", zh: "三角學：圖像與變換" },
    description: {
      en: "Interpret and transform sine and cosine graphs for senior secondary trigonometry questions.",
      zh: "為高中三角學題目解讀和變換正弦與餘弦圖像。"
    },
    estimatedMinutes: 55,
    concept: {
      title: { en: "Trig graphs repeat with structure", zh: "三角圖像按結構重複" },
      content: {
        en: "Sine and cosine graphs repeat periodically. Amplitude changes height, period changes horizontal repeat length, and phase shift moves the wave left or right.",
        zh: "正弦和餘弦圖像會週期性重複。振幅改變高度，週期改變水平重複長度，相位移則令波形左右移動。"
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
        { en: "Identify amplitude, period, and phase shift from the equation.", zh: "由方程辨認振幅、週期和相位移。" },
        { en: "Connect each parameter change to the corresponding graph transformation.", zh: "把每個參數改變連繫到相應的圖像變換。" }
      ]
    },
    visualization: {
      title: { en: "Transform sine and cosine waves independently", zh: "獨立變換正弦與餘弦波" },
      content: {
        en: "For either a sine or cosine graph, adjust amplitude, period, and signed phase shift independently and connect each parameter to its visible graph transformation.",
        zh: "對正弦或餘弦圖像，分別獨立調整振幅、週期和帶正負號的相位移，並把每個參數連繫到可見的圖像變換。"
      },
      moduleId: "configured-visualization-lab",
      source: "trig-wave"
    },
    extension: {
      items: [
        { en: "Create two sine equations with the same period but different amplitudes.", zh: "建立兩條週期相同但振幅不同的正弦方程。" },
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
        en: `Conditional probability is ${math(String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}`)} when ${math(String.raw`P(B)>0`)}. Counting favourable outcomes over possible outcomes is valid only when the elementary outcomes in the conditioned sample space are equally likely; otherwise use their probability weights.`,
        zh: `當 ${math(String.raw`P(B)>0`)}，條件概率為 ${math(String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}`)}。只有在條件樣本空間內各基本結果等可能時，才可用有利結果數除以可能結果數；否則要使用各結果的概率權重。`
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
        { en: "Use favourable count over possible count only for equally likely elementary outcomes; otherwise combine branch or outcome weights.", zh: "只有基本結果等可能時才用有利結果數除以可能結果數；否則要合併分支或結果的概率權重。" }
      ]
    },
    extension: {
      items: [
        { en: "Create a two-stage probability tree, label every branch probability, and distinguish individual objects when their probabilities differ.", zh: "建立兩階段概率樹，標示每條分支的概率；若個別物件的概率不同，要分開表示。" },
        { en: "Explain how extra information can increase or decrease a probability.", zh: "解釋額外資料如何令概率增加或減少。" }
      ]
    }
  }),
  lesson({
    topicId: "differentiation-intro",
    title: {
      en: "HKDSE Extended Part (M1/M2): Differentiation Intro",
      zh: "香港中學文憑延伸部分（M1／M2）：微分入門"
    },
    description: {
      en: "Optional HKDSE Extended Part content for M1 and M2 learners: read the derivative as a tangent gradient and instantaneous rate of change.",
      zh: "供 M1 和 M2 學生選修的香港中學文憑延伸部分內容：把導數理解為切線斜率和瞬時變化率。"
    },
    estimatedMinutes: 60,
    concept: {
      title: { en: "Derivative as local gradient", zh: "導數作為局部斜率" },
      content: {
        en: `The derivative ${math("f'(x)")} gives the gradient of the curve at a single ${math("x")}-value when the relevant limit exists. It is the limit of secant gradients as the second point approaches the first; the tangent gradient is not obtained by merely declaring the two points equal.`,
        zh: `若相應極限存在，導數 ${math("f'(x)")} 給出曲線在某一個 ${math("x")} 值的斜率。它是第二點趨近第一點時割線斜率的極限；不能只把兩點直接當作相同便得到切線斜率。`
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
        en: "Use the calculus lab to move the tangent point and compare the curve with its local linear model.",
        zh: "使用微積分實驗室移動切線點，比較曲線和局部線性模型。"
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
    title: {
      en: "HKDSE Extended Part (M1/M2): Calculus and Turning Points",
      zh: "香港中學文憑延伸部分（M1／M2）：微積分與轉向點"
    },
    description: {
      en: "Optional HKDSE Extended Part content for M1 and M2 learners: use derivative signs and tangent gradients to reason about graphs.",
      zh: "供 M1 和 M2 學生選修的香港中學文憑延伸部分內容：運用導數符號和切線斜率推理圖像。"
    },
    estimatedMinutes: 65,
    concept: {
      title: { en: "Derivative signs", zh: "導數符號" },
      content: {
        en: `When ${math("f'(x)")} is positive, the graph is increasing. When ${math("f'(x)")} is negative, the graph is decreasing. A change from positive to negative suggests a local maximum, while negative to positive suggests a local minimum.`,
        zh: `當 ${math("f'(x)")} 為正，圖像上升；當 ${math("f'(x)")} 為負，圖像下降。由正變負通常表示局部極大值，由負變正通常表示局部極小值。`
      }
    },
    workedExample: {
      content: {
        en: `If ${math("f'(x)")} changes from positive to negative at ${math("x = 2")}, the graph rises before ${math("x = 2")} and falls after ${math("x = 2")}, so ${math("x = 2")} may be a local maximum.`,
        zh: `若 ${math("f'(x)")} 在 ${math("x = 2")} 由正變負，圖像在 ${math("x = 2")} 前上升、之後下降，所以 ${math("x = 2")} 可能是局部極大值。`
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
      title: { en: "Explore tangent gradients", zh: "探索切線斜率" },
      content: {
        en: "Use the calculus lab to see how tangent gradients change across a curve.",
        zh: "使用微積分實驗室觀察切線斜率如何沿曲線改變。"
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
    title: {
      en: "HKDSE Extended Part (M1): Normal Distribution and Z-Scores",
      zh: "香港中學文憑延伸部分（M1）：正態分佈與標準分（z 分數）"
    },
    description: {
      en: "Optional HKDSE Extended Part M1 content: standardize values with z-scores and interpret their position in a normal distribution.",
      zh: "供 M1 學生選修的香港中學文憑延伸部分內容：利用標準分（z 分數）把數值標準化，並解讀其在正態分佈中的位置。"
    },
    estimatedMinutes: 55,
    concept: {
      title: { en: "Standardizing a value", zh: "標準化數值" },
      content: {
        en: `For a positive standard deviation, a ${math("z")}-score measures how many standard deviations a value is from the mean. Positive ${math("z")}-values are above the mean, negative ${math("z")}-values are below the mean, and ${math("z = 0")} is exactly at the mean.`,
        zh: `當標準差大於 0，標準分（${math("z")} 分數）量度某數值距離平均數多少個標準差。正 ${math("z")} 值高於平均數，負 ${math("z")} 值低於平均數，${math("z = 0")} 則正好在平均數。`
      }
    },
    workedExample: {
      content: {
        en: `If the mean is ${math("50")}, the standard deviation is ${math("10")}, and ${math("x = 70")}, then ${math(String.raw`z = \frac{70 - 50}{10} = 2`)}.`,
        zh: `若平均數為 ${math("50")}，標準差為 ${math("10")}，且 ${math("x = 70")}，則 ${math(String.raw`z = \frac{70 - 50}{10} = 2`)}。`
      }
    },
    checklist: {
      title: { en: "Normal distribution checklist", zh: "正態分佈清單" },
      items: [
        { en: "Identify the mean and verify that the standard deviation is positive.", zh: "辨認平均數，並驗證標準差大於 0。" },
        { en: `Substitute into ${math(String.raw`z = \frac{x - \text{mean}}{\text{standard deviation}}`)}.`, zh: `代入 ${math(String.raw`z = \frac{x - \text{平均數}}{\text{標準差}}`)}。` },
        { en: "Interpret the sign and size of z.", zh: "解讀 z 的正負和大小。" }
      ]
    },
    visualization: {
      title: { en: "Standardize and locate the observed value", zh: "標準化並定位觀察值" },
      content: {
        en: "Change the mean, standard deviation, or observed value x; compute z=(x−mean)/sd, locate x on the displayed distribution, and show an explicit off-scale state when its location lies outside the plotted range.",
        zh: "改變平均數、標準差或觀察值 x；計算 z＝（x−平均數）／標準差，在顯示分佈上定位 x，並在其位置超出繪圖範圍時明確顯示「超出刻度」狀態。"
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
        zh: `若一部分佔 ${math("10")} 分，應用 ${math("15")} 分鐘完成，平均每 1 分題目需時 ${math("15 \\div 10 = 1.5")} 分鐘。${math("4")} 分題約需 ${math("6")} 分鐘。`
      }
    },
    checklist: {
      title: { en: "Revision checklist", zh: "溫習清單" },
      items: [
        { en: "Choose topics from actual mistakes, not feelings alone.", zh: "根據真實錯題選課題，不只憑感覺。" },
        { en: "Practise both topic drills and mixed questions.", zh: "同時練習專題題和混合題。" },
        { en: "Track minutes per mark during timed work.", zh: "限時練習時記錄每 1 分題目所需分鐘。" }
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
        en: `A cyclist travels at ${math(String.raw`v=12\text{ km/h}`)} for ${math(String.raw`t=1.5\text{ h}`)}. A labelled diagram, a time-distance table, the equation ${math("d=vt")}, and a straight journey graph must all use those same values. Therefore ${math(String.raw`d=12\times1.5=18\text{ km}`)}. The inverse check ${math(String.raw`18\div1.5=12\text{ km/h}`)} recovers the given rate.`,
        zh: `單車以 ${math(String.raw`v=12\text{ km/h}`)} 行駛 ${math(String.raw`t=1.5\text{ h}`)}。已標示的圖、時間—路程表、方程 ${math("d=vt")} 和直線路程圖都必須使用同一組數值。因此 ${math(String.raw`d=12\times1.5=18\text{ km}`)}。逆向檢查 ${math(String.raw`18\div1.5=12\text{ km/h}`)} 得回已知速率。`
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
