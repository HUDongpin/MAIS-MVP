import type { ForumClassSpace, ForumThread } from "@/lib/forum";

export const forumClassSpaces = [
  {
    classId: "class-s3a-2026",
    name: {
      en: "S3A Mathematics",
      zh: "中三 A 數學班",
      zhHans: "初三 A 数学班"
    },
    grade: "S3",
    teacherName: "HK Teacher Chan",
    memberCount: 1
  },
  {
    classId: "class-mainland-s4-2026",
    name: {
      en: "Mainland S4 Mathematics",
      zh: "內地高一數學班",
      zhHans: "内地高一数学班"
    },
    grade: "S4",
    teacherName: "Teacher Scott",
    memberCount: 1
  }
] satisfies ForumClassSpace[];

export const forumSeedThreads = [
  {
    classId: "class-s3a-2026",
    threadId: "thread-factorising-common-factor",
    title: {
      en: "How do I spot the common factor before expanding?",
      zh: "展開前怎樣先看出公因式？",
      zhHans: "展开前怎样先看出公因式？"
    },
    body: {
      en: "In the practice set I keep expanding first, then I realise both terms had 3x. Is there a faster check?",
      zh: "練習時我常常先展開，之後才發現兩項都有 3x。可否有更快的檢查方法？",
      zhHans: "练习时我常常先展开，之后才发现两项都有 3x。有没有更快的检查方法？"
    },
    author: {
      id: "student-iris",
      name: "Iris",
      role: "student",
      accent: "cyan"
    },
    role: "student",
    mode: "async",
    kind: "question",
    subject: {
      en: "Algebra",
      zh: "代數",
      zhHans: "代数"
    },
    tags: [
      { en: "factorising", zh: "因式分解", zhHans: "因式分解" },
      { en: "common factor", zh: "公因式", zhHans: "公因式" }
    ],
    replies: [
      {
        replyId: "reply-factorising-teacher",
        body: {
          en: "Scan coefficients first, then scan letters. If both terms share a number and the same letter, pause before expanding.",
          zh: "先掃描係數，再掃描字母。若兩項有共同數字和相同字母，就先停一停，不要急著展開。",
          zhHans: "先扫描系数，再扫描字母。若两项有共同数字和相同字母，就先停一停，不要急着展开。"
        },
        author: {
          id: "teacher-ms-chan",
          name: "HK Teacher Chan",
          role: "teacher",
          accent: "indigo"
        },
        role: "teacher",
        createdAt: "2026-06-07T01:36:00.000Z",
        helpfulCount: 4,
        isTeacherAnswer: true
      },
      {
        replyId: "reply-factorising-peer",
        body: {
          en: "I underline the repeated part first. It helped me stop expanding automatically.",
          zh: "我會先把重複部分畫線，這樣比較不會自動展開。",
          zhHans: "我会先把重复部分画线，这样比较不会自动展开。"
        },
        author: {
          id: "student-ken",
          name: "Ken",
          role: "student",
          accent: "emerald"
        },
        role: "student",
        createdAt: "2026-06-07T01:42:00.000Z",
        helpfulCount: 2,
        isTeacherAnswer: false
      }
    ],
    pinned: false,
    locked: false,
    resolved: true,
    meTooCount: 6,
    createdAt: "2026-06-07T01:20:00.000Z",
    updatedAt: "2026-06-07T01:42:00.000Z"
  },
  {
    classId: "class-s3a-2026",
    threadId: "thread-live-simultaneous-equations",
    title: {
      en: "Live check: which equation should we eliminate first?",
      zh: "即時討論：應先消去哪條方程？",
      zhHans: "即时讨论：应先消去哪条方程？"
    },
    body: {
      en: "During today's mini lesson, share the first elimination move you would try and why.",
      zh: "今日小課堂中，請分享你第一步會嘗試的消元方法，並說明原因。",
      zhHans: "今天小课堂中，请分享你第一步会尝试的消元方法，并说明原因。"
    },
    author: {
      id: "teacher-ms-chan",
      name: "HK Teacher Chan",
      role: "teacher",
      accent: "indigo"
    },
    role: "teacher",
    mode: "live",
    kind: "teacher-note",
    subject: {
      en: "Simultaneous equations",
      zh: "聯立方程",
      zhHans: "二元一次方程组"
    },
    tags: [
      { en: "live", zh: "即時", zhHans: "即时" },
      { en: "elimination", zh: "消元", zhHans: "消元" }
    ],
    replies: [],
    pinned: true,
    locked: false,
    resolved: false,
    meTooCount: 0,
    createdAt: "2026-06-07T02:05:00.000Z",
    updatedAt: "2026-06-07T02:14:00.000Z",
    live: {
      sessionId: "live-simultaneous-equations",
      active: true,
      prompt: {
        en: "For 2x + y = 9 and x - y = 3, what is your first move?",
        zh: "對於 2x + y = 9 和 x - y = 3，你第一步會做甚麼？",
        zhHans: "对于 2x + y = 9 和 x - y = 3，你第一步会做什么？"
      },
      pulses: [
        {
          pulseId: "pulse-add-equations",
          body: {
            en: "I would add the equations because +y and -y cancel directly.",
            zh: "我會把兩條方程相加，因為 +y 和 -y 會直接抵消。",
            zhHans: "我会把两条方程相加，因为 +y 和 -y 会直接抵消。"
          },
          author: {
            id: "student-maya",
            name: "Maya",
            role: "student",
            accent: "rose"
          },
          role: "student",
          createdAt: "2026-06-07T02:08:00.000Z"
        },
        {
          pulseId: "pulse-teacher-nudge",
          body: {
            en: "Good. Name the variable that disappears, then solve the one-variable equation.",
            zh: "很好。先說出哪個變量會消失，再解一元方程。",
            zhHans: "很好。先说出哪个变量会消失，再解一元方程。"
          },
          author: {
            id: "teacher-ms-chan",
            name: "HK Teacher Chan",
            role: "teacher",
            accent: "indigo"
          },
          role: "teacher",
          createdAt: "2026-06-07T02:10:00.000Z"
        }
      ]
    }
  },
  {
    classId: "class-s3a-2026",
    threadId: "thread-teacher-norms",
    title: {
      en: "Class discussion norms for math explanations",
      zh: "數學解釋的班級討論守則",
      zhHans: "数学解释的班级讨论守则"
    },
    body: {
      en: "Explain the step, not only the answer. If you disagree, point to the line where the reasoning changes.",
      zh: "請解釋步驟，不只寫答案。若不同意，請指出推理在哪一行開始不同。",
      zhHans: "请解释步骤，不只写答案。若不同意，请指出推理在哪一行开始不同。"
    },
    author: {
      id: "teacher-ms-chan",
      name: "HK Teacher Chan",
      role: "teacher",
      accent: "indigo"
    },
    role: "teacher",
    mode: "async",
    kind: "teacher-note",
    subject: {
      en: "Classroom culture",
      zh: "課堂文化",
      zhHans: "课堂文化"
    },
    tags: [
      { en: "teacher pinned", zh: "教師置頂", zhHans: "教师置顶" },
      { en: "explain reasoning", zh: "說明推理", zhHans: "说明推理" }
    ],
    replies: [],
    pinned: true,
    locked: false,
    resolved: false,
    meTooCount: 0,
    createdAt: "2026-06-07T00:30:00.000Z",
    updatedAt: "2026-06-07T00:30:00.000Z"
  },
  {
    classId: "class-mainland-s4-2026",
    threadId: "thread-mainland-function-notation",
    title: {
      en: "When should I write f(x) instead of y?",
      zh: "甚麼時候應寫 f(x) 而不是 y？",
      zhHans: "什么时候应写 f(x) 而不是 y？"
    },
    body: {
      en: "I know both can describe the output, but I am not sure when the function notation is clearer.",
      zh: "我知道兩者都可表示輸出，但不確定甚麼時候用函數記號會更清楚。",
      zhHans: "我知道两者都可表示输出，但不确定什么时候用函数记号会更清楚。"
    },
    author: {
      id: "student-ludwig-mainland",
      name: "Ludwig",
      role: "student",
      accent: "amber"
    },
    role: "student",
    mode: "async",
    kind: "question",
    subject: {
      en: "Function notation",
      zh: "函數記號",
      zhHans: "函数记号"
    },
    tags: [
      { en: "function", zh: "函數", zhHans: "函数" },
      { en: "notation", zh: "記號", zhHans: "记号" }
    ],
    replies: [],
    pinned: false,
    locked: false,
    resolved: false,
    meTooCount: 3,
    createdAt: "2026-06-07T02:22:00.000Z",
    updatedAt: "2026-06-07T02:22:00.000Z"
  }
] satisfies ForumThread[];
