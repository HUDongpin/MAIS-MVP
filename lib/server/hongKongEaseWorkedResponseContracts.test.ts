import assert from "node:assert/strict";
import test from "node:test";
import {
  isHongKongEaseWorkedResponseContractKind,
  matchesHongKongEaseWorkedResponseContract,
  type HongKongEaseWorkedResponseContract
} from "./hongKongEaseWorkedResponseContracts";

const remediationFixtures = [
  {
    "issueKey": "33-worked-perimeter",
    "contractSpec": {
      "kind": "worked-perimeter",
      "params": {
        "shape": "square",
        "inputs": {
          "side": 9
        },
        "expectedValue": 36,
        "expectedUnit": "cm",
        "acceptedFormulaAsts": [
          "4*side",
          "side*4",
          "side+side+side+side"
        ],
        "requireFormula": true,
        "requireSubstitutionOfAllInputs": true,
        "requireCorrectEvaluation": true,
        "requireUnit": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "P = 4 × 9 = 36 cm",
        "expected": "accept",
        "rationale": "Canonical formula, substitution, result, and unit."
      },
      {
        "input": "P=9+9+9+9=36 cm",
        "expected": "accept",
        "rationale": "Equivalent perimeter working with all source dimensions."
      }
    ],
    "negativeProbes": [
      {
        "input": "36",
        "expected": "reject",
        "rationale": "Bare result omits formula, substitution, and unit."
      },
      {
        "input": "36 cm",
        "expected": "reject",
        "rationale": "Final quantity still omits the requested method evidence."
      },
      {
        "input": "P=9×9=81 cm",
        "expected": "reject",
        "rationale": "Uses the area formula instead of the perimeter formula."
      }
    ]
  },
  {
    "issueKey": "45-worked-perimeter",
    "contractSpec": {
      "kind": "worked-perimeter",
      "params": {
        "shape": "rectangle",
        "inputs": {
          "length": 25,
          "width": 18
        },
        "expectedValue": 86,
        "expectedUnit": "m",
        "acceptedFormulaAsts": [
          "2*(length+width)",
          "2*length+2*width",
          "length+width+length+width"
        ],
        "requireFormula": true,
        "requireSubstitutionOfAllInputs": true,
        "requireCorrectEvaluation": true,
        "requireUnit": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "P = 2 × (25 + 18) = 86 m",
        "expected": "accept",
        "rationale": "Canonical formula, substitution, result, and unit."
      },
      {
        "input": "P=25+18+25+18=86 m",
        "expected": "accept",
        "rationale": "Equivalent perimeter working with all source dimensions."
      }
    ],
    "negativeProbes": [
      {
        "input": "86",
        "expected": "reject",
        "rationale": "Bare result omits formula, substitution, and unit."
      },
      {
        "input": "86 m",
        "expected": "reject",
        "rationale": "Final quantity still omits the requested method evidence."
      },
      {
        "input": "P=25×18=450 m",
        "expected": "reject",
        "rationale": "Uses the area formula instead of the perimeter formula."
      }
    ]
  },
  {
    "issueKey": "386-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          18,
          24
        ],
        "mode": "hcf-only",
        "expectedOutputs": {
          "hcf": 6
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": null,
        "terminalCondition": "pairwise-coprime",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：18,24 ÷2→9,12 ÷3→3,4；H.C.F.=2×3=6",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "18,24 ÷3→6,8 ÷2→3,4；H.C.F.=3×2=6",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "6",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：18,24 ÷2→999；H.C.F.=2×3=6",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "387-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          36,
          90
        ],
        "mode": "hcf-only",
        "expectedOutputs": {
          "hcf": 18
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": null,
        "terminalCondition": "pairwise-coprime",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：36,90 ÷2→18,45 ÷3→6,15 ÷3→2,5；H.C.F.=2×3×3=18",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "36,90 ÷3→12,30 ÷3→4,10 ÷2→2,5；H.C.F.=3×3×2=18",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "18",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：36,90 ÷2→999；H.C.F.=2×3×3=18",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "388-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          420,
          560
        ],
        "mode": "hcf-only",
        "expectedOutputs": {
          "hcf": 140
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": null,
        "terminalCondition": "pairwise-coprime",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：420,560 ÷2→210,280 ÷2→105,140 ÷5→21,28 ÷7→3,4；H.C.F.=2×2×5×7=140",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "420,560 ÷7→60,80 ÷5→12,16 ÷2→6,8 ÷2→3,4；H.C.F.=7×5×2×2=140",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "140",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：420,560 ÷2→999；H.C.F.=2×2×5×7=140",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "389-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          56,
          84
        ],
        "mode": "hcf-only",
        "expectedOutputs": {
          "hcf": 28
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": null,
        "terminalCondition": "pairwise-coprime",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": {
          "kind": "unordered-integer-set",
          "label": "common-factors",
          "expected": [
            1,
            2,
            4,
            7,
            14,
            28
          ],
          "requireComplete": true,
          "rejectExtras": true
        }
      }
    },
    "positiveProbes": [
      {
        "input": "短除：56,84 ÷2→28,42 ÷2→14,21 ÷7→2,3；H.C.F.=2×2×7=28；共同因數=1,2,4,7,14,28",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "56,84 ÷7→8,12 ÷2→4,6 ÷2→2,3；H.C.F.=7×2×2=28；共同因數=28,14,7,4,2,1",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "(a) 28 (b) 1,2,4,7,14,28",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：56,84 ÷2→999；H.C.F.=2×2×7=28；共同因數=1,2,4,7,14,28",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      },
      {
        "input": "56,84 ÷2→28,42 ÷2→14,21 ÷7→2,3；H.C.F.=2×2×7=28",
        "expected": "reject",
        "rationale": "Multipart task is incomplete because the required extra set is missing."
      }
    ]
  },
  {
    "issueKey": "396-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          24,
          42
        ],
        "mode": "lcm-only",
        "expectedOutputs": {
          "lcm": 168
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": null,
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：24,42 ÷2→12,21 ÷2→6,21 ÷2→3,21 ÷3→1,7 ÷7→1,1；L.C.M.=2×2×2×3×7=168",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "24,42 ÷3→8,14 ÷2→4,7 ÷2→2,7 ÷2→1,7 ÷7→1,1；L.C.M.=3×2×2×2×7=168",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "168",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：24,42 ÷2→999；L.C.M.=2×2×2×3×7=168",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "397-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          72,
          90
        ],
        "mode": "lcm-only",
        "expectedOutputs": {
          "lcm": 360
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": null,
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：72,90 ÷2→36,45 ÷2→18,45 ÷2→9,45 ÷3→3,15 ÷3→1,5 ÷5→1,1；L.C.M.=2×2×2×3×3×5=360",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "72,90 ÷5→72,18 ÷3→24,6 ÷3→8,2 ÷2→4,1 ÷2→2,1 ÷2→1,1；L.C.M.=5×3×3×2×2×2=360",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "360",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：72,90 ÷2→999；L.C.M.=2×2×2×3×3×5=360",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "398-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          180,
          450
        ],
        "mode": "lcm-only",
        "expectedOutputs": {
          "lcm": 900
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": null,
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：180,450 ÷2→90,225 ÷2→45,225 ÷3→15,75 ÷3→5,25 ÷5→1,5 ÷5→1,1；L.C.M.=2×2×3×3×5×5=900",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "180,450 ÷5→36,90 ÷5→36,18 ÷3→12,6 ÷3→4,2 ÷2→2,1 ÷2→1,1；L.C.M.=5×5×3×3×2×2=900",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "900",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：180,450 ÷2→999；L.C.M.=2×2×3×3×5×5=900",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "399-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          54,
          72
        ],
        "mode": "lcm-only",
        "expectedOutputs": {
          "lcm": 216
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": null,
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": {
          "kind": "unordered-integer-set",
          "label": "three-digit-common-multiples",
          "expected": [
            216,
            432,
            648,
            864
          ],
          "requireComplete": true,
          "rejectExtras": true
        }
      }
    },
    "positiveProbes": [
      {
        "input": "短除：54,72 ÷2→27,36 ÷2→27,18 ÷2→27,9 ÷3→9,3 ÷3→3,1 ÷3→1,1；L.C.M.=2×2×2×3×3×3=216；三位公倍數=216,432,648,864",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "54,72 ÷3→18,24 ÷3→6,8 ÷3→2,8 ÷2→1,4 ÷2→1,2 ÷2→1,1；L.C.M.=3×3×3×2×2×2=216；三位公倍數=216,432,648,864",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "(a) 216 (b) 216,432,648,864",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：54,72 ÷2→999；L.C.M.=2×2×2×3×3×3=216；三位公倍數=216,432,648,864",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      },
      {
        "input": "54,72 ÷2→27,36 ÷2→27,18 ÷2→27,9 ÷3→9,3 ÷3→3,1 ÷3→1,1；L.C.M.=216",
        "expected": "reject",
        "rationale": "Multipart task is incomplete because the required extra set is missing."
      }
    ]
  },
  {
    "issueKey": "694-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          36,
          60,
          84
        ],
        "mode": "hcf-and-lcm",
        "expectedOutputs": {
          "hcf": 12,
          "lcm": 1260
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：36,60,84 ÷2→18,30,42 ÷2→9,15,21 ÷3→3,5,7 ÷3→1,5,7 ÷5→1,1,7 ÷7→1,1,1；H.C.F.=2×2×3=12；L.C.M.=2×2×3×3×5×7=1260",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "36,60,84 ÷3→12,20,28 ÷2→6,10,14 ÷2→3,5,7 ÷3→1,5,7 ÷5→1,1,7 ÷7→1,1,1；H.C.F.=3×2×2=12；L.C.M.=3×2×2×3×5×7=1260",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "12;1260",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：36,60,84 ÷2→999；H.C.F.=2×2×3=12；L.C.M.=2×2×3×3×5×7=1260",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "696-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          15,
          25,
          35
        ],
        "mode": "hcf-and-lcm",
        "expectedOutputs": {
          "hcf": 5,
          "lcm": 525
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：15,25,35 ÷5→3,5,7 ÷3→1,5,7 ÷5→1,1,7 ÷7→1,1,1；H.C.F.=5；L.C.M.=5×3×5×7=525",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "15,25,35 ÷5→3,5,7 ÷7→3,5,1 ÷5→3,1,1 ÷3→1,1,1；H.C.F.=5；L.C.M.=5×7×5×3=525",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "5;525",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：15,25,35 ÷5→999；H.C.F.=5；L.C.M.=5×3×5×7=525",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "698-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          24,
          36,
          60
        ],
        "mode": "hcf-and-lcm",
        "expectedOutputs": {
          "hcf": 12,
          "lcm": 360
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：24,36,60 ÷2→12,18,30 ÷2→6,9,15 ÷3→2,3,5 ÷2→1,3,5 ÷3→1,1,5 ÷5→1,1,1；H.C.F.=2×2×3=12；L.C.M.=2×2×3×2×3×5=360",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "24,36,60 ÷3→8,12,20 ÷2→4,6,10 ÷2→2,3,5 ÷2→1,3,5 ÷3→1,1,5 ÷5→1,1,1；H.C.F.=3×2×2=12；L.C.M.=3×2×2×2×3×5=360",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "12;360",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：24,36,60 ÷2→999；H.C.F.=2×2×3=12；L.C.M.=2×2×3×2×3×5=360",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "700-worked-short-division",
    "contractSpec": {
      "kind": "worked-short-division",
      "params": {
        "inputs": [
          20,
          30,
          50
        ],
        "mode": "hcf-and-lcm",
        "expectedOutputs": {
          "hcf": 10,
          "lcm": 300
        },
        "requirePrimeDivisors": true,
        "validateEveryLadderTransition": true,
        "carryNondivisibleValuesUnchanged": true,
        "hcfRule": "product of ladder divisors that divide every current value",
        "lcmRule": "product of all ladder divisors",
        "terminalCondition": "all-ones",
        "allowValidDivisorOrder": "any",
        "requireExplicitProductAndFinalValue": true,
        "rejectBareResult": true,
        "extraPart": null
      }
    },
    "positiveProbes": [
      {
        "input": "短除：20,30,50 ÷2→10,15,25 ÷5→2,3,5 ÷2→1,3,5 ÷3→1,1,5 ÷5→1,1,1；H.C.F.=2×5=10；L.C.M.=2×5×2×3×5=300",
        "expected": "accept",
        "rationale": "Canonical valid short-division ladder and required output(s)."
      },
      {
        "input": "20,30,50 ÷5→4,6,10 ÷2→2,3,5 ÷2→1,3,5 ÷3→1,1,5 ÷5→1,1,1；H.C.F.=5×2=10；L.C.M.=5×2×2×3×5=300",
        "expected": "accept",
        "rationale": "A different valid divisor order reaches the same verified output(s)."
      }
    ],
    "negativeProbes": [
      {
        "input": "10;300",
        "expected": "reject",
        "rationale": "Correct final value(s) without the required short-division evidence."
      },
      {
        "input": "短除：20,30,50 ÷2→999；H.C.F.=2×5=10；L.C.M.=2×5×2×3×5=300",
        "expected": "reject",
        "rationale": "Corrupted quotient transition must fail even if a final answer remains present."
      }
    ]
  },
  {
    "issueKey": "393-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          100,
          120
        ],
        "expectedPrimeFactorizations": {
          "100": "2^2×5^2",
          "120": "2^3×3×5"
        },
        "expectedOutputs": {
          "hcf": 20
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": false,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "100=2^2×5^2；120=2^3×3×5；H.C.F.=2^2×5=20",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "100=5^2×2^2；120=5×3×2^3；H.C.F.=5×2^2=20",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "20",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "120=2^3×3×5；H.C.F.=2^2×5=20",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "100=4×5^2；120=2^3×3×5；H.C.F.=2^2×5=20",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  },
  {
    "issueKey": "394-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          75,
          270
        ],
        "expectedPrimeFactorizations": {
          "75": "3×5^2",
          "270": "2×3^3×5"
        },
        "expectedOutputs": {
          "hcf": 15
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": false,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "75=3×5^2；270=2×3^3×5；H.C.F.=3×5=15",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "75=5^2×3；270=5×3^3×2；H.C.F.=5×3=15",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "15",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "270=2×3^3×5；H.C.F.=3×5=15",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "75=3×4；270=2×3^3×5；H.C.F.=3×5=15",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  },
  {
    "issueKey": "395-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          108,
          300
        ],
        "expectedPrimeFactorizations": {
          "108": "2^2×3^3",
          "300": "2^2×3×5^2"
        },
        "expectedOutputs": {
          "hcf": 12
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": false,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "108=2^2×3^3；300=2^2×3×5^2；H.C.F.=2^2×3=12",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "108=3^3×2^2；300=5^2×3×2^2；H.C.F.=3×2^2=12",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "12",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "300=2^2×3×5^2；H.C.F.=2^2×3=12",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "108=4×3^3；300=2^2×3×5^2；H.C.F.=2^2×3=12",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  },
  {
    "issueKey": "695-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          18,
          30
        ],
        "expectedPrimeFactorizations": {
          "18": "2×3^2",
          "30": "2×3×5"
        },
        "expectedOutputs": {
          "hcf": 6,
          "lcm": 90
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": true,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "18=2×3^2；30=2×3×5；H.C.F.=2×3=6；L.C.M.=2×3^2×5=90",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "18=3^2×2；30=5×3×2；H.C.F.=3×2=6；L.C.M.=5×3^2×2=90",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "6;90",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "30=2×3×5；H.C.F.=2×3=6；L.C.M.=2×3^2×5=90",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "18=2×4；30=2×3×5；H.C.F.=2×3=6；L.C.M.=2×3^2×5=90",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  },
  {
    "issueKey": "697-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          42,
          56
        ],
        "expectedPrimeFactorizations": {
          "42": "2×3×7",
          "56": "2^3×7"
        },
        "expectedOutputs": {
          "hcf": 14,
          "lcm": 168
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": true,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "42=2×3×7；56=2^3×7；H.C.F.=2×7=14；L.C.M.=2^3×3×7=168",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "42=7×3×2；56=7×2^3；H.C.F.=7×2=14；L.C.M.=7×3×2^3=168",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "14;168",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "56=2^3×7；H.C.F.=2×7=14；L.C.M.=2^3×3×7=168",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "42=2×3×7；56=4×7；H.C.F.=2×7=14；L.C.M.=2^3×3×7=168",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  },
  {
    "issueKey": "699-worked-prime-factorization",
    "contractSpec": {
      "kind": "worked-prime-factorization",
      "params": {
        "inputs": [
          16,
          64
        ],
        "expectedPrimeFactorizations": {
          "16": "2^4",
          "64": "2^6"
        },
        "expectedOutputs": {
          "hcf": 16,
          "lcm": 64
        },
        "requireEveryInputFactorization": true,
        "requirePrimeBasesOnly": true,
        "allowFactorOrder": "any",
        "allowRepeatedOrExponentForm": true,
        "requireHcfMinExponentSelection": true,
        "requireLcmMaxExponentSelection": true,
        "requireExplicitFactorProductAndFinalValue": true,
        "rejectBareResult": true
      }
    },
    "positiveProbes": [
      {
        "input": "16=2^4；64=2^6；H.C.F.=2^4=16；L.C.M.=2^6=64",
        "expected": "accept",
        "rationale": "Canonical complete input factorizations and derived output product(s)."
      },
      {
        "input": "16=2×2×2×2；64=2×2×2×2×2×2；H.C.F.=2^4=16；L.C.M.=2^6=64",
        "expected": "accept",
        "rationale": "Equivalent prime-factor order or repeated-factor notation with all required evidence."
      }
    ],
    "negativeProbes": [
      {
        "input": "16;64",
        "expected": "reject",
        "rationale": "Correct final result(s) without prime-factorization evidence."
      },
      {
        "input": "64=2^6；H.C.F.=2^4=16；L.C.M.=2^6=64",
        "expected": "reject",
        "rationale": "At least one source integer factorization is missing."
      },
      {
        "input": "16=4；64=2^6；H.C.F.=2^4=16；L.C.M.=2^6=64",
        "expected": "reject",
        "rationale": "Composite base or corrupted prime factorization must fail."
      }
    ]
  }
] as const;

for (const fixture of remediationFixtures) {
  test(`${fixture.issueKey}: accepts every frozen positive probe`, () => {
    const contract = fixture.contractSpec as HongKongEaseWorkedResponseContract;
    for (const probe of fixture.positiveProbes) {
      assert.equal(
        matchesHongKongEaseWorkedResponseContract(contract, probe.input),
        true,
        `expected accept: ${probe.input} — ${probe.rationale}`
      );
    }
  });

  test(`${fixture.issueKey}: rejects every frozen negative probe without fallback`, () => {
    const contract = fixture.contractSpec as HongKongEaseWorkedResponseContract;
    for (const probe of fixture.negativeProbes) {
      assert.equal(
        matchesHongKongEaseWorkedResponseContract(contract, probe.input),
        false,
        `expected reject: ${probe.input} — ${probe.rationale}`
      );
    }
  });
}

test("exposes only the three worked response contract kinds", () => {
  assert.equal(isHongKongEaseWorkedResponseContractKind("worked-short-division"), true);
  assert.equal(isHongKongEaseWorkedResponseContractKind("worked-prime-factorization"), true);
  assert.equal(isHongKongEaseWorkedResponseContractKind("worked-perimeter"), true);
  assert.equal(isHongKongEaseWorkedResponseContractKind("generic-equivalence"), false);
  assert.equal(isHongKongEaseWorkedResponseContractKind("worked-short-division-extra"), false);
});

test("never treats an unsupported contract as generic equivalence", () => {
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      { kind: "generic-equivalence", params: {} } as unknown as HongKongEaseWorkedResponseContract,
      "6"
    ),
    false
  );
});

test("short division rejects a composite one-step shortcut", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "386-worked-short-division")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(contract, "短除：18,24 ÷6→3,4；H.C.F.=6"),
    false
  );
});

test("short division rejects carrying a value that the divisor should divide", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "396-worked-short-division")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "短除：24,42 ÷2→12,42 ÷2→6,21 ÷2→3,21 ÷3→1,7 ÷7→1,1；L.C.M.=168"
    ),
    false
  );
});

test("worked perimeter rejects a coincidental expression that omits the source dimension", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "33-worked-perimeter")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(matchesHongKongEaseWorkedResponseContract(contract, "P=6×6=36 cm"), false);
});

test("short division requires both a composite prime product and its final numeric value", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "386-worked-short-division")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "短除：18,24 ÷2→9,12 ÷3→3,4；H.C.F.=2×3"
    ),
    false
  );
});

test("prime factorization requires both a composite prime product and its final numeric value", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "393-worked-prime-factorization")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "100=2^2×5^2；120=2^3×3×5；H.C.F.=2^2×5"
    ),
    false
  );
});

test("short division rejects an unrequested result part", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "386-worked-short-division")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "短除：18,24 ÷2→9,12 ÷3→3,4；H.C.F.=2×3=6；L.C.M.=2×2×2×3×3=72"
    ),
    false
  );
});

test("prime factorization rejects an unrequested result part", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "393-worked-prime-factorization")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "100=2^2×5^2；120=2^3×3×5；H.C.F.=2^2×5=20；L.C.M.=2^3×3×5^2=600"
    ),
    false
  );
});

test("LCM-only prime factorization neither requires nor accepts an HCF part", () => {
  const contract: HongKongEaseWorkedResponseContract = {
    kind: "worked-prime-factorization",
    params: {
      inputs: [40, 48],
      expectedOutputs: { lcm: 240 },
      requireEveryInputFactorization: true,
      requirePrimeBasesOnly: true,
      requireLcmMaxExponentSelection: true,
      requireExplicitFactorProductAndFinalValue: true,
      rejectBareResult: true
    }
  };

  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "40=2^3×5；48=2^4×3；L.C.M.=2^4×3×5=240"
    ),
    true
  );
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "40=2^3×5；48=2^4×3；H.C.F.=2^3=8；L.C.M.=2^4×3×5=240"
    ),
    false
  );
});

test("complete prime decompositions may use a labelled final LCM value when the contract explicitly permits it", () => {
  const contract: HongKongEaseWorkedResponseContract = {
    kind: "worked-prime-factorization",
    params: {
      inputs: [30, 42],
      expectedPrimeFactorizations: { "30": "2×3×5", "42": "2×3×7" },
      expectedOutputs: { lcm: 210 },
      requireEveryInputFactorization: true,
      requirePrimeBasesOnly: true,
      requireLcmMaxExponentSelection: true,
      allowLabelledFinalValueAfterCompleteDecompositions: true,
      requireExplicitFactorProductAndFinalValue: false,
      rejectBareResult: true
    }
  };

  assert.equal(
    matchesHongKongEaseWorkedResponseContract(contract, "30=2×3×5；42=2×3×7；L.C.M.=210"),
    true
  );
  assert.equal(matchesHongKongEaseWorkedResponseContract(contract, "L.C.M.=210"), false);
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "30=2×3×5；42=2×3×7；H.C.F.=2×3=6；L.C.M.=210"
    ),
    false
  );
});

test("HCF short division may stop when the residuals have overall GCD 1", () => {
  const contract: HongKongEaseWorkedResponseContract = {
    kind: "worked-short-division",
    params: {
      inputs: [28, 42, 56],
      mode: "hcf-only",
      expectedOutputs: { hcf: 14 },
      requirePrimeDivisors: true,
      validateEveryLadderTransition: true,
      carryNondivisibleValuesUnchanged: true,
      terminalCondition: "overall-gcd-one",
      requireExplicitProductAndFinalValue: true,
      rejectBareResult: true
    }
  };

  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "短除：28,42,56 ÷2→14,21,28 ÷7→2,3,4；H.C.F.=2×7=14"
    ),
    true,
    "2,3,4 have overall GCD 1 even though 2 and 4 are not pairwise coprime"
  );
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      contract,
      "短除：28,42,56 ÷2→14,21,28；H.C.F.=2=2"
    ),
    false,
    "14,21,28 still have a common factor 7"
  );
});

test("worked perimeter rejects unrelated equality-chain padding", () => {
  const contract = remediationFixtures.find((fixture) => fixture.issueKey === "33-worked-perimeter")!
    .contractSpec as HongKongEaseWorkedResponseContract;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(contract, "P=4×9=6×6=36 cm"),
    false
  );
});

test("malformed worked contract metadata fails closed", () => {
  const shortDivision = remediationFixtures.find((fixture) => fixture.issueKey === "694-worked-short-division")!;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      {
        ...shortDivision.contractSpec,
        params: { ...shortDivision.contractSpec.params, mode: "unknown-mode" }
      },
      shortDivision.positiveProbes[0].input
    ),
    false
  );

  const perimeter = remediationFixtures.find((fixture) => fixture.issueKey === "33-worked-perimeter")!;
  assert.equal(
    matchesHongKongEaseWorkedResponseContract(
      {
        ...perimeter.contractSpec,
        params: { ...perimeter.contractSpec.params, shape: "circle" }
      },
      perimeter.positiveProbes[0].input
    ),
    false
  );
});
