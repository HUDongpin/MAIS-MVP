import { createHash } from "node:crypto";

export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION =
  "hk-viz-dependent-transition-source-plans-v4";

const SEQUENCE_SCHEMA_VERSION = "hk-viz-dependent-transition-sequence.v8";
const LANGUAGES = Object.freeze(["en", "zh", "zh-Hans"]);
const THEMES = Object.freeze(["dark", "light"]);
const SOURCE_PLAN_KEYS = Object.freeze([
  "companionAuthority", "domainId", "labId", "modeId", "modePreparation", "planHash",
  "projectionMatrixHash", "schemaVersion", "sequenceId",
  "visibleMathProjectionTopologies",
]);
const COMPANION_AUTHORITY_KEYS = Object.freeze([
  "authorityHash", "geometryPolicy", "phases", "restoration",
]);
const GEOMETRY_POLICY_KEYS = Object.freeze([
  "minimumUserEpsilon", "pixelEpsilon", "policyHash", "version",
]);
const GEOMETRY_POLICY_VERSION =
  "hk-viz-dependent-transition-geometry-policy.v1";
const PHASE_AUTHORITY_KEYS = Object.freeze([
  "controls", "controlsHash", "phase", "publicStateHash",
  "rawSerializedPublicState", "resetCountSincePreviousPhase",
  "stateSignature", "stateSignatureHash", "visibleElementAuthorities",
  "visibleElementAuthoritiesHash",
]);
const RESTORATION_AUTHORITY_KEYS = Object.freeze([
  "controls", "controlsHash", "publicStateHash", "rawSerializedPublicState",
  "resetClickCount", "stateSignature", "stateSignatureHash",
  "visibleElementAuthorities", "visibleElementAuthoritiesHash",
]);
const CONTROL_KEYS = Object.freeze(["controlId", "descriptor", "value"]);
const DESCRIPTOR_KEYS = Object.freeze([
  "controlId", "enabled", "excludedValues", "maximum", "minimum", "step",
  "visibility", "domainId",
]);
const VISIBLE_AUTHORITY_KEYS = Object.freeze([
  "attributes", "learnerVisible", "paintedSubtree", "tagName", "textHash",
]);
const PAINTED_SUBTREE_KEYS = Object.freeze(["elementCount", "hash"]);
const MODE_PREPARATION_KEYS = Object.freeze(["groupId", "modeId"]);
const TOPOLOGY_KEYS = Object.freeze([
  "ancestryScaleSummaries", "ancestryScaleSummariesHash", "elementCounts",
  "elementCountsHash", "projectionCount", "projectionHashes",
  "projectionHashesHash", "topologyHash", "totalElementCount",
]);
const ANCESTRY_SCALE_SUMMARY_KEYS = Object.freeze([
  "chainCount", "contractCount", "entryCount", "hash", "policyVersion",
  "scaleWitnessCount",
]);
const ANCESTRY_SCALE_SUMMARY_POLICY_VERSION =
  "visible-math-aggregate-ancestry-scale-summary.v1";
const PROJECTION_SOURCES = Object.freeze([
  "canonical-visible-baseline", "phase:pre", "phase:clamp", "phase:expand",
  "post-sequence-restoration",
]);

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error("HK Visualization dependent-transition exact manifest canonical JSON number is invalid.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("HK Visualization dependent-transition exact manifest canonical JSON object is invalid.");
  }
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`
  ).join(",")}}`;
}

export function sha256HkVisualizationDependentTransitionManifestCanonical(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}


export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS = deepFreeze([
    {
      "companionAuthority": {
        "authorityHash": "567b71e5204ede3918eff58cf7ff321faaa02c28210013247611107bfd2bf0ea",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "total",
                "descriptor": {
                  "controlId": "total",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "number-bond-v1"
                },
                "value": 20
              },
              {
                "controlId": "knownPart",
                "descriptor": {
                  "controlId": "knownPart",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "number-bond-v1"
                },
                "value": 20
              }
            ],
            "controlsHash": "0fb49264e8f4effc9109d5dba30dc50a206c8fd2eedbc73b51030aecde269799",
            "phase": "pre",
            "publicStateHash": "5ffa2d343448ff2f1aa0acab6f08f856d9bfab7f6e189f265cb3c6bdf074814b",
            "rawSerializedPublicState": "{\"total\":20,\"knownPart\":20}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "total=20|knownPart=20",
            "stateSignatureHash": "4d80804bfb8528f01854a206778f0907c8c664c78bfd77526fa2f805f48e6486",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a34c41dfd8863b1a5a252d31b9c92ae726a998e70d48a0c35d43a62ae23fa54b"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "c9b112a5c305242c82849ae797078203b3d54243f78dce0c0bbcd134573c6848"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a34c41dfd8863b1a5a252d31b9c92ae726a998e70d48a0c35d43a62ae23fa54b"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "c9b112a5c305242c82849ae797078203b3d54243f78dce0c0bbcd134573c6848"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a34c41dfd8863b1a5a252d31b9c92ae726a998e70d48a0c35d43a62ae23fa54b"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "c9b112a5c305242c82849ae797078203b3d54243f78dce0c0bbcd134573c6848"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "cb80a3e86b9d6ebad04058ff072e9f85de0640c91481de36670d3726365b422a"
          },
          {
            "controls": [
              {
                "controlId": "total",
                "descriptor": {
                  "controlId": "total",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "number-bond-v1"
                },
                "value": 0
              },
              {
                "controlId": "knownPart",
                "descriptor": {
                  "controlId": "knownPart",
                  "enabled": false,
                  "excludedValues": [],
                  "maximum": 0,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "fixed",
                  "domainId": "number-bond-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "82b598d61ef0035355c34c0a7e41b55df318fc794698ef1c789a22548622444d",
            "phase": "clamp",
            "publicStateHash": "b8e5f737774e5a624f02c239952a080a592af0340315ba4cbd7eb2d99e93745f",
            "rawSerializedPublicState": "{\"total\":0,\"knownPart\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "total=0|knownPart=0",
            "stateSignatureHash": "c38d7536ce1df8d9f80e044e8c4868f6c7946278789b24c9bd94d078ab58a52f",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "e921c85c7fb49dedaae1310ee99ea017c552ca8f86adea881bfab3088b62f369"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "e921c85c7fb49dedaae1310ee99ea017c552ca8f86adea881bfab3088b62f369"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "e921c85c7fb49dedaae1310ee99ea017c552ca8f86adea881bfab3088b62f369"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "445ecf0705996e0ea785908114fb5d895450d600c0f5b4ca716ab5c12264a218"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "c6737b0453c0e125892fff1f49f0276211501a17a2df33c702844ae4164f6348"
          },
          {
            "controls": [
              {
                "controlId": "total",
                "descriptor": {
                  "controlId": "total",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "number-bond-v1"
                },
                "value": 20
              },
              {
                "controlId": "knownPart",
                "descriptor": {
                  "controlId": "knownPart",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "number-bond-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "1754851758bac021206fb0e1fa9be95cdc71963b52989baf3a01e50006b0f8bf",
            "phase": "expand",
            "publicStateHash": "559ff4fdee89f4e13376b6239f5db3318474d208db0e0ab63b832656fab655bc",
            "rawSerializedPublicState": "{\"total\":20,\"knownPart\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "total=20|knownPart=0",
            "stateSignatureHash": "699705586ebf28de960025a74490dbd51b52472abbca756d97f0132c4e39bc7e",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a8934939a0a817f349732b2582db2450762eee1267be66a5701c0c9c0c792edc"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "d832889f1f18ef538fa0caf8c1d8d1b27bc4fc838adfadcfc6fd7b04f76186dc"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a8934939a0a817f349732b2582db2450762eee1267be66a5701c0c9c0c792edc"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "d832889f1f18ef538fa0caf8c1d8d1b27bc4fc838adfadcfc6fd7b04f76186dc"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "counter-set"
                    ],
                    [
                      "data-viz-total",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 21,
                    "hash": "a8934939a0a817f349732b2582db2450762eee1267be66a5701c0c9c0c792edc"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "known-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ddfc5f7b2597888e645f02c736adcd28ec0a9702befefca3ed6421f75e046001"
                  },
                  "tagName": "g",
                  "textHash": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "missing-part-node"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "d832889f1f18ef538fa0caf8c1d8d1b27bc4fc838adfadcfc6fd7b04f76186dc"
                  },
                  "tagName": "g",
                  "textHash": "f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "0b0c02d9631235ceefaf1bd22b4c2a091f75ccb68d84f9d016d2981360fb0809"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "total",
              "descriptor": {
                "controlId": "total",
                "enabled": true,
                "excludedValues": [],
                "maximum": 20,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "number-bond-v1"
              },
              "value": 12
            },
            {
              "controlId": "knownPart",
              "descriptor": {
                "controlId": "knownPart",
                "enabled": true,
                "excludedValues": [],
                "maximum": 12,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "number-bond-v1"
              },
              "value": 7
            }
          ],
          "controlsHash": "8e06a83aeb61191438568ed73850daee538b87b8a0830e3f05265a58d405642d",
          "publicStateHash": "03ca82325773b8a89952f80ae621f7cf8e1a0fb2ede0b2bad38984ad6fb0402b",
          "rawSerializedPublicState": "{\"total\":12,\"knownPart\":7}",
          "resetClickCount": 1,
          "stateSignature": "total=12|knownPart=7",
          "stateSignatureHash": "be35e25e3fe1a64d456c1ce4e2b31a17efad64deb9fb9184381e3c454a98e1f5",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "counter-set"
                  ],
                  [
                    "data-viz-total",
                    "12"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 21,
                  "hash": "9efe0b2edf10fa1f53a0b59ebe6e84d91456b525d77ce4e91bab3a9271c16c87"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "known-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "52a729666c8531403482b1ca8f018ed81101216d16e1a1eaca78246916d345bb"
                },
                "tagName": "g",
                "textHash": "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "missing-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "084e994cf2c7c9dc8a6bb37f74a22fc3d6833b8e08db31b9aecb52967015e7d2"
                },
                "tagName": "g",
                "textHash": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "counter-set"
                  ],
                  [
                    "data-viz-total",
                    "12"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 21,
                  "hash": "9efe0b2edf10fa1f53a0b59ebe6e84d91456b525d77ce4e91bab3a9271c16c87"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "known-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "52a729666c8531403482b1ca8f018ed81101216d16e1a1eaca78246916d345bb"
                },
                "tagName": "g",
                "textHash": "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "missing-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "084e994cf2c7c9dc8a6bb37f74a22fc3d6833b8e08db31b9aecb52967015e7d2"
                },
                "tagName": "g",
                "textHash": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "counter-set"
                  ],
                  [
                    "data-viz-total",
                    "12"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 21,
                  "hash": "9efe0b2edf10fa1f53a0b59ebe6e84d91456b525d77ce4e91bab3a9271c16c87"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "known-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "52a729666c8531403482b1ca8f018ed81101216d16e1a1eaca78246916d345bb"
                },
                "tagName": "g",
                "textHash": "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "missing-part-node"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "084e994cf2c7c9dc8a6bb37f74a22fc3d6833b8e08db31b9aecb52967015e7d2"
                },
                "tagName": "g",
                "textHash": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "af05a74411659a5957582bef19ce9c6d8f3a4455215e97d6400e352bd3670459"
        }
      },
      "domainId": "number-bond-v1",
      "labId": "p1-counting-number-bonds",
      "modeId": "__default__",
      "modePreparation": [],
      "planHash": "b12d3245afe5e79b3e3426419aa719e767747999cabcb0e3a1c37af701258c0c",
      "projectionMatrixHash": "368807cf1624e0dc564973eac3fc51289053157cac07b884e2e284ca7444016a",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p1-number-bond-known-part",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "a962a58cc5e43bd77eb58d56911072e4d75c42fdb0cfdd99453d599ce5270664",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "a962a58cc5e43bd77eb58d56911072e4d75c42fdb0cfdd99453d599ce5270664",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "a962a58cc5e43bd77eb58d56911072e4d75c42fdb0cfdd99453d599ce5270664",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "a962a58cc5e43bd77eb58d56911072e4d75c42fdb0cfdd99453d599ce5270664",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "a962a58cc5e43bd77eb58d56911072e4d75c42fdb0cfdd99453d599ce5270664",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "02cacdfb640730bd1e1e93dde419882ad28997a463379ae86fd6e11c36964996",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "26e044114ad23322e98918c9a9f059d25b3dc44304e56e51745b637ab699ace2",
              "6e0a9ba085217d66f94bc8d79952b6207deff70d27d248a0a5aca640dfbb1649",
              "5c56610ac658608b7ba2c6693457cdd7d3d57b3a5c51dc4ed0c067e340aa6fc7",
              "1c265ab0cdb9de7afbdc8508bcc8fc8adaa35079a8145db620626f4bb7ff8289",
              "26e044114ad23322e98918c9a9f059d25b3dc44304e56e51745b637ab699ace2"
            ],
            "projectionHashesHash": "cbc73f8d551e37f08b5daed976c38ddc53fd4a418ccf3d35530809dd4e44b298",
            "topologyHash": "d0002c35efe4b8d031f1f0051aa893b0b7979dca7c03c0ca114308a3976a3e83",
            "totalElementCount": 175
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "b2a777340014d203ab10f256bccde5a8d26dab00bf6add63f6adc2aaeac8e2e6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "b2a777340014d203ab10f256bccde5a8d26dab00bf6add63f6adc2aaeac8e2e6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "b2a777340014d203ab10f256bccde5a8d26dab00bf6add63f6adc2aaeac8e2e6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "b2a777340014d203ab10f256bccde5a8d26dab00bf6add63f6adc2aaeac8e2e6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "b2a777340014d203ab10f256bccde5a8d26dab00bf6add63f6adc2aaeac8e2e6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "7c4a0b85bfbd74441d04f706325fe5dd27a89f0a2f1a7fd8ad347586ac236d0d",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "c8f658593baf0e793ccfc68ddadfb8db623702717517cbdb98abf814d00f9481",
              "a263ee3c1e6bcc90596949e3b0d8bb5e4e4851d6d634c33484fa981582fb24dc",
              "819145bc560eeda995c418a0171f0cbd08008c76cbea67ba6cd1288907f47216",
              "336371ce104baa095f88e940a8d52d34d815b83f9652ed8e0b34c85434a2478b",
              "c8f658593baf0e793ccfc68ddadfb8db623702717517cbdb98abf814d00f9481"
            ],
            "projectionHashesHash": "8b21e6ba795067b80367b22745d485c56f3bc4dec1f1a8d8c83c4864c32149e0",
            "topologyHash": "26b300cda0a45ab8b8dc4b34401a20daed4ad8976ceab35ac38d4f93d7a75c17",
            "totalElementCount": 175
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "f2e72ec42da702760ba4c0fe7a49466102a7a3bac06ec3db19bd2657b7f1dbec",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "f2e72ec42da702760ba4c0fe7a49466102a7a3bac06ec3db19bd2657b7f1dbec",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "f2e72ec42da702760ba4c0fe7a49466102a7a3bac06ec3db19bd2657b7f1dbec",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "f2e72ec42da702760ba4c0fe7a49466102a7a3bac06ec3db19bd2657b7f1dbec",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "f2e72ec42da702760ba4c0fe7a49466102a7a3bac06ec3db19bd2657b7f1dbec",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "bc16e0bf53cc1a7ad6b165088fe36a7f52842599c79317ef6a6c9de4d842d624",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "373d15d14a5f98e586cee79d9f11f44f58197ad5a7fb315f3d3b9b08be340766",
              "507acf53e6e8fb3648d3d9a4db967965d7e4d4a2007237d2f21d8f6a468c2ffa",
              "0087b8f4c0c3649e020da6802505a1057057f76eea9cb829148eeb0c65dfc112",
              "1783a431cbd3fbd160e9c65aca3634723fb77228646a3db357ef2fb2bd64d306",
              "373d15d14a5f98e586cee79d9f11f44f58197ad5a7fb315f3d3b9b08be340766"
            ],
            "projectionHashesHash": "c97604ba4663db8b0067cccc882a252956df4e36147085948bc44dca3ce79001",
            "topologyHash": "958db68391fe66cce226773a3fdd27db3a663b182cc30e26fce91c191e213810",
            "totalElementCount": 175
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "fa21a339f0d50dc0f32f70a63f4a4b5aa27e3895c804b011c4d190ef7cd6bbc6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "fa21a339f0d50dc0f32f70a63f4a4b5aa27e3895c804b011c4d190ef7cd6bbc6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "fa21a339f0d50dc0f32f70a63f4a4b5aa27e3895c804b011c4d190ef7cd6bbc6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "fa21a339f0d50dc0f32f70a63f4a4b5aa27e3895c804b011c4d190ef7cd6bbc6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "fa21a339f0d50dc0f32f70a63f4a4b5aa27e3895c804b011c4d190ef7cd6bbc6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "fc4c88bc4a76d6d1e3111022412c28aa96344035428679334ee0f14516bbd7c1",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "f123a1cdcc6cdf64fd75da280e9970fadfd5fa0a697fcaa2f3d964aa6e437c36",
              "ee56699bb45c0603092726739f57ddb07c106da57d9f59a608f6268bd7d0301f",
              "46aedb09b5a73523a2e8e16469aca199b2a81ec523a6e53e81e4a9fe2e2b4b07",
              "7d0a36fb6e97fab660e32d89d9b84be7ae2189c73ce93fd410c3b665320bb88c",
              "f123a1cdcc6cdf64fd75da280e9970fadfd5fa0a697fcaa2f3d964aa6e437c36"
            ],
            "projectionHashesHash": "a4fb1de778456d44b1ac1815d80ee208005abaa5cca5f4082395c99ca6026ee2",
            "topologyHash": "10b70375dee52e6061e0ba66874afa157d5b592a16aa1b10af0f8c6dcffa4cf2",
            "totalElementCount": 175
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "71d98d6d62db566b36d76faf4abbf48603ba129d90b3a70566b3baff7e90b157",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "71d98d6d62db566b36d76faf4abbf48603ba129d90b3a70566b3baff7e90b157",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "71d98d6d62db566b36d76faf4abbf48603ba129d90b3a70566b3baff7e90b157",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "71d98d6d62db566b36d76faf4abbf48603ba129d90b3a70566b3baff7e90b157",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 258,
                "hash": "71d98d6d62db566b36d76faf4abbf48603ba129d90b3a70566b3baff7e90b157",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "f443fb36b3bede36fcaae93eb87790a7dfdfc8b6d556dc1ff7438b1ae917e774",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "17599c094beb8337b44be65877117e840f01c81105b3f11dddb6354c2953baac",
              "6440c0e1515682b273c841b89e0ac89417b77b256ab990e14d437b2691db5479",
              "55d32c77e6e6617fa5050bb7937940f550ea22be262baa3c2e67fa64fb647dc2",
              "456be93b361f5ee4ecc0867bdcfa8f71b3e697e882d6598a644076d90bf48987",
              "17599c094beb8337b44be65877117e840f01c81105b3f11dddb6354c2953baac"
            ],
            "projectionHashesHash": "a558f1739cd77aec93f619932f58449237d213ec12f64be0a193c945a3e1822c",
            "topologyHash": "d4641ae1cce05249d0e49745e6941413412f82c4522d6f1493688ee92a1197a2",
            "totalElementCount": 175
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "3877edac7293a45db963a5bee6b458f68aaf9e7cf8f69446ded0bf689e745b0d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "3877edac7293a45db963a5bee6b458f68aaf9e7cf8f69446ded0bf689e745b0d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "3877edac7293a45db963a5bee6b458f68aaf9e7cf8f69446ded0bf689e745b0d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "3877edac7293a45db963a5bee6b458f68aaf9e7cf8f69446ded0bf689e745b0d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              },
              {
                "chainCount": 84,
                "contractCount": 6,
                "entryCount": 252,
                "hash": "3877edac7293a45db963a5bee6b458f68aaf9e7cf8f69446ded0bf689e745b0d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 18
              }
            ],
            "ancestryScaleSummariesHash": "2ff14700950ee161917e571b9514dd89a78c05a3240d5238efd403404c54fd8c",
            "elementCounts": [
              35,
              35,
              35,
              35,
              35
            ],
            "elementCountsHash": "abab9411243bb1ce702e9324bfa845492ab29ebb98abab881e3ef57bf1514bd6",
            "projectionCount": 5,
            "projectionHashes": [
              "7f687d6df86b61ea81eb2f621aa52834ba07f3feb29426467ddd43316d140b10",
              "380c988fe16084e0e16dc4ddfd185ff1d6554b66f642158263131fcb51e55499",
              "9ebc5bb01938336eef964ced0ed44525a63ed18c88f8bd6e730492e18d74f2c5",
              "008f295cc471810bac39ddc19294a0adfd2ff3db32912a9f8fa90369dc325b83",
              "7f687d6df86b61ea81eb2f621aa52834ba07f3feb29426467ddd43316d140b10"
            ],
            "projectionHashesHash": "cf8842aee2ec7e041311429ec712a51852c092b6d892e232a0e1371fe53c5319",
            "topologyHash": "1955db9966566e8261a4f3eb656e0e82451508e29bf1df47055d68d852577b25",
            "totalElementCount": 175
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "6039635db5abf413914bf3dc53dc35748d3478972544915ecc66432a0015858d",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 20
              }
            ],
            "controlsHash": "63733034c7390831f2f3d053b1cde6653e0564888b5c5f3b997cdfd1cec6c92a",
            "phase": "pre",
            "publicStateHash": "93eef8d3d009cc46da94c7b5b3ffcc2e4edc1fbf4ba1202636fa6d68771a4ce0",
            "rawSerializedPublicState": "{\"operation\":\"add\",\"start\":0,\"step\":20}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "start=0|step=20",
            "stateSignatureHash": "819f621f2d2ff2959e0789466bb3fab9fcaa6220b3a27fc5c104cae4d69a1167",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "d",
                      "M70 220 Q320 80 570 220"
                    ],
                    [
                      "data-viz-end",
                      "20"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "add"
                    ],
                    [
                      "data-viz-start",
                      "0"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ee804e944858faa2fe81ada1ffa730706067097aa9e4af00e99bf3dedd9a3756"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "d",
                      "M70 220 Q320 80 570 220"
                    ],
                    [
                      "data-viz-end",
                      "20"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "add"
                    ],
                    [
                      "data-viz-start",
                      "0"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ee804e944858faa2fe81ada1ffa730706067097aa9e4af00e99bf3dedd9a3756"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "d",
                      "M70 220 Q320 80 570 220"
                    ],
                    [
                      "data-viz-end",
                      "20"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "add"
                    ],
                    [
                      "data-viz-start",
                      "0"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ee804e944858faa2fe81ada1ffa730706067097aa9e4af00e99bf3dedd9a3756"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "b224c028a95f2b5f810287e46e066a68d45652b457d66ab08a2b93584df97f61"
          },
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 20
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": false,
                  "excludedValues": [],
                  "maximum": 0,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "fixed",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "5cded48d1d7089f84966fe3012f991a356d8929c632a7b16cc176d9e6d6198ca",
            "phase": "clamp",
            "publicStateHash": "ccde26c769fa83bf94fdd2ab1e5a93d22656b5edf5972fd7035680136d43ae24",
            "rawSerializedPublicState": "{\"operation\":\"add\",\"start\":20,\"step\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "start=20|step=0",
            "stateSignatureHash": "c7716e0ca5d5af1e8492f9257a2717ff4ad97728c2ff856cf3d657ac9927eff4",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "16a88088731a2e6eda3d92cd7923562f7fc261f54b67cf83f19359f0114dbe2c"
          },
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "7c4048536e92cc4668183c0698d6e221b08a033bb05c72ba86b56a68a4132280",
            "phase": "expand",
            "publicStateHash": "dd01460b1090ef87f173d186d23df9eb226c25456676eb9f96d7665b1958f7d5",
            "rawSerializedPublicState": "{\"operation\":\"add\",\"start\":0,\"step\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "start=0|step=0",
            "stateSignatureHash": "27d2418672ace4f8faf9af966eaf21aeef432a261c5994774322f22f061362a5",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "eaca3df68577617f9847468334febff3490c3593ff1ead93a2b2e30cd26efc7c"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "start",
              "descriptor": {
                "controlId": "start",
                "enabled": true,
                "excludedValues": [],
                "maximum": 20,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "bounded-step-v1"
              },
              "value": 6
            },
            {
              "controlId": "step",
              "descriptor": {
                "controlId": "step",
                "enabled": true,
                "excludedValues": [],
                "maximum": 14,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "bounded-step-v1"
              },
              "value": 5
            }
          ],
          "controlsHash": "b4eaf1ca931839d8104c2d116da79ed89ad5f6714b7dec57a0ed82b0e0b87c1a",
          "publicStateHash": "b6c17e622e1e73769262f059291de4671b8f182506e55da80ed8de393dc87a99",
          "rawSerializedPublicState": "{\"operation\":\"add\",\"start\":6,\"step\":5}",
          "resetClickCount": 1,
          "stateSignature": "start=6|step=5",
          "stateSignatureHash": "23be3f3de6b95502283ca20c8afcff0dfe981f8d64024d41a123c0f0ed2f800e",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "509202b34aa1cd0e80dca561488c3e13e5055e2eec2b63e6eb829e4413bcf89b"
        }
      },
      "domainId": "bounded-step-v1",
      "labId": "p1-addition-subtraction",
      "modeId": "add",
      "modePreparation": [
        {
          "groupId": "operation",
          "modeId": "add"
        }
      ],
      "planHash": "1f07174a62071dc22c85d6582cb0787dd44bae2fdd47a38bb0376a6cb5725dc3",
      "projectionMatrixHash": "7d499cfc70d9b14bc421dd8ba09a243ef8189b7e52a32b7a77ac82f6d6e86f02",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p1-add-step",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "f2b599bd27b6e5fe57de1f10a7a0780e2667ba83d22fa219b4fb282f3801d371",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "f2b599bd27b6e5fe57de1f10a7a0780e2667ba83d22fa219b4fb282f3801d371",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "c403c2de4c48246e17dc48de7dcdb086b129fae6c1113251472923373d0950ee",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "496ca1d03616cd3f110c1e008b50041082141970d88af6a9c80f2acdcbacd8e5",
              "ce5bf61227994daed81ae9c91e5f6735b763733a196991d6e2b9e443f9e09163",
              "50c7b9c4106170a53100cd9ca3a5993e13f7113402256c4bfa35365ec3b93517",
              "2e196453e9462902c08f72131cb8c539d5772ae08786090501289178664d81fb",
              "496ca1d03616cd3f110c1e008b50041082141970d88af6a9c80f2acdcbacd8e5"
            ],
            "projectionHashesHash": "a2aa67b32d62665cc65f2132a27c4466d3d0830d5b40a79c8dd753b50b78a127",
            "topologyHash": "31bae508caac78a7a3c9edfc194038c32148eefe13e86e3c6a140c397169d7d3",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "c38e3d7faf050a2c9ebded0e29580f59e65b22eff6b0307b0628af680ac629b9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "c38e3d7faf050a2c9ebded0e29580f59e65b22eff6b0307b0628af680ac629b9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "f4228b4856d73e03edc9bc2814522b22de83152fc87418e522b72d413e79d1e8",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "35e17e97881a403e3af957c83f754a8f68dfad7a4d717698731e2a4cd72b9181",
              "42d1dbf11e87d81e9f233433dafeec2e26ca022a789c6daa99c366cf4574507e",
              "75f85d5713e8011c1a58e8dfddda09f162888da4f0f0ea0711b31ab3682af94e",
              "956ed0eb96188c7b4704d70d5a107a630016708a1c09a60ccb6ff0b5e33db49d",
              "35e17e97881a403e3af957c83f754a8f68dfad7a4d717698731e2a4cd72b9181"
            ],
            "projectionHashesHash": "547312a386f24f93a7e49ff3081731bfaa858bc38380ffef103fcd7590df9e69",
            "topologyHash": "34345b5c80c68b44a5761c3eab08ed269a02eeeebd92574b1fef0f694e5bb88c",
            "totalElementCount": 14
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "6c7eb96437d61d2d60480c0ae08c44257455a91e951050384e0770a71688a05f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "6c7eb96437d61d2d60480c0ae08c44257455a91e951050384e0770a71688a05f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "20b47d3f056e366fe72abdcd6103c5e69b6d89428427ee2cdbb836628c210ef8",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "dc8dbb93bf2cd449fb3aec252f97938be2ae7c15c0a760fa4cfe155b7b702415",
              "1ea53bddf35620c2024acde42464d2b293da39effc13f9e297b9b6b161aae9a8",
              "28a62bdb77f42896e4f9e6455bd4456f5870c4b03842c25f6e3b29b602bc454b",
              "7e0b0e5a670812b14070e62c9478185814d1839df52f152c651bc665dfecd21a",
              "dc8dbb93bf2cd449fb3aec252f97938be2ae7c15c0a760fa4cfe155b7b702415"
            ],
            "projectionHashesHash": "5c2834ced971d502600269e6089d83e2a837689d2d98b557bb43011d5400eb76",
            "topologyHash": "cd0e633e1c37cf11ac6a370dbfd0cee7d2cbbe93e0c7bcbbdf3dd52b8460de02",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "f70af86f05a9c4bdad7d95cc0b68a4b050be63e4cd0923b3807b1dbf0bafb187",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "f70af86f05a9c4bdad7d95cc0b68a4b050be63e4cd0923b3807b1dbf0bafb187",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "9d3f8086396bd83289c529a9654654693f420466011a8bd2252fe4538c875932",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "90bdb3d0a1789f05461bcd4a76f4fb1bd1705ccbe96cc5244b10141799b481fe",
              "1611db2c0364dad4f52c7a3d66b0073898b3001b2ff57c98f765388ee36f0dd8",
              "70a5058802ae30d37bd1b051799ec83217ffd60fa423cb3fd023ba5833c82f2c",
              "60c090137236853563d989c4fe229d2401dd7b85a2df16538db8342057bc1391",
              "90bdb3d0a1789f05461bcd4a76f4fb1bd1705ccbe96cc5244b10141799b481fe"
            ],
            "projectionHashesHash": "4ebb6477a5b5110003e65e76d0215ea65fd5b605f6350fd827cd7061c97f99c0",
            "topologyHash": "b5eb11d5ffa5553ec266d95952b558296d4109697d0959963cd384d6d2ddf44d",
            "totalElementCount": 14
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "157784884bc7f689c4de4b6743206eb8c8961efebadeb0436a8283560176379b",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "157784884bc7f689c4de4b6743206eb8c8961efebadeb0436a8283560176379b",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "bc61f0d57fecbac92459428447bcc51927552cd79a9310baf7cdfb1da6c626d4",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "68035f3d04c3004c978fc31dd416619d7db8fa41fbc1d83dd10ffe7b9983588e",
              "807e9ef17741631221076e8f54416a2b4af30e0e657e5320abe74cf7e20cf73d",
              "6a628f755638fd81f64b91a52d8337dc03d446f3c1fb83499c3c70dac3f4e27d",
              "112926bc556b45a1252d1e324db9301b6c638fce37b5e0bf98e1dda2ee4cb962",
              "68035f3d04c3004c978fc31dd416619d7db8fa41fbc1d83dd10ffe7b9983588e"
            ],
            "projectionHashesHash": "28f03ced5b5bafe593cbf6ea23981974a3768b8f3ff6dfe387e84fabfa405dfd",
            "topologyHash": "0f2dca17ceeabb99a35ca26a93e390ceabd366076369a874f55906d26ce9996c",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "cb44599412136ee4b48d4295e3a2e9b0031c73709f64e9aa2302ae7ddfcf4acd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "cb44599412136ee4b48d4295e3a2e9b0031c73709f64e9aa2302ae7ddfcf4acd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "ef1c174e1de66cc5ab4249fa131c104ebdcfb11f6a90facf5af4523f439d01b7",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "08615d466e500677549ce1b6b95d94312563b83b52d28512380547208e001cc9",
            "projectionCount": 5,
            "projectionHashes": [
              "da46a75f8c32a633b081572deb5f60d93f16e976a5efa8097b69c72a142f3c34",
              "2f1558ed3140b6fe211076d74113db1fef1e8790c19f0c39944ee27eefad78bf",
              "84d9ed4c0a7d5b11547a198b24941aaba7082e059b3f18a285ba625e189737e1",
              "efd8e98b04c892db89de2dc2b1b2944419eb2becdfaeba2853579d363da225ae",
              "da46a75f8c32a633b081572deb5f60d93f16e976a5efa8097b69c72a142f3c34"
            ],
            "projectionHashesHash": "50665ad27f3edca832ae431b6f08f6f4c990c6d84acdae1aba2fbc10ca041624",
            "topologyHash": "db3fd6998c7ffd3ab7bbf130fd6a04d052bd5a302d1e3f6a6354cbc391378a0a",
            "totalElementCount": 14
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "1a268bfcaa9bb6741dc3b80aacec81f8cdb0c79cdc9e768498d7f70e67937f47",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 20
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 20
              }
            ],
            "controlsHash": "ac0b92a7957cfdc0c6686d94ef11c445f9745831fc19dfbe65279aedc24003b8",
            "phase": "pre",
            "publicStateHash": "8b5c0550a0c01379c86cb5ae3741a99c73e40777a0464020059676f76a183ce4",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"start\":20,\"step\":20}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "start=20|step=20",
            "stateSignatureHash": "21ee4dce36dfd4f27b41f49af1dda7247d1a4fb90db066f2d297c92cc7006ebc",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "d",
                      "M570 220 Q320 80 70 220"
                    ],
                    [
                      "data-viz-end",
                      "0"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "subtract"
                    ],
                    [
                      "data-viz-start",
                      "20"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "0048adb42c56c8dfadda586a1bb306fc4fd8ee31e269399e17de2c80258d2d16"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "d",
                      "M570 220 Q320 80 70 220"
                    ],
                    [
                      "data-viz-end",
                      "0"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "subtract"
                    ],
                    [
                      "data-viz-start",
                      "20"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "0048adb42c56c8dfadda586a1bb306fc4fd8ee31e269399e17de2c80258d2d16"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "d",
                      "M570 220 Q320 80 70 220"
                    ],
                    [
                      "data-viz-end",
                      "0"
                    ],
                    [
                      "data-viz-name",
                      "directed-jump"
                    ],
                    [
                      "data-viz-operation",
                      "subtract"
                    ],
                    [
                      "data-viz-start",
                      "20"
                    ],
                    [
                      "data-viz-step",
                      "20"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "0048adb42c56c8dfadda586a1bb306fc4fd8ee31e269399e17de2c80258d2d16"
                  },
                  "tagName": "path",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "91ed285798da4cbc7b155b9f8fa17077b25fac5e9b096bcbc69398d3deb96aa3"
          },
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": false,
                  "excludedValues": [],
                  "maximum": 0,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "fixed",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "c05bb69be552b25beebcdcf27f87ff7074a606d0efdfc5c426354f35da1f934a",
            "phase": "clamp",
            "publicStateHash": "9959f9745e4cb8818d04e9da6cc41a0b367057901dd084d2d1d5ed243b656a90",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"start\":0,\"step\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "start=0|step=0",
            "stateSignatureHash": "7d9b1e4376f4572b145ec5b0d4bfd226e66e6480959277880143fc6c6d92197a",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "cx",
                      "70"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "0"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "8fa3ea96d43b036dff0ad18fbb32ed4e6876ad159e0f256422212bfacb5e2004"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "0f76bf85332f9885e93e5d9d32b5d9a21349e3dfef728b86d6d497d2391b886c"
          },
          {
            "controls": [
              {
                "controlId": "start",
                "descriptor": {
                  "controlId": "start",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 20
              },
              {
                "controlId": "step",
                "descriptor": {
                  "controlId": "step",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 20,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "bounded-step-v1"
                },
                "value": 0
              }
            ],
            "controlsHash": "d5263fcf7fc6500c6742cbf626b7c80f95d1d9f9726e216a7fc0e3a2639f85ee",
            "phase": "expand",
            "publicStateHash": "53d36598f8d82a67fdc61efa9dd616358b5688ba3068f7e4456db745b20fb87f",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"start\":20,\"step\":0}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "start=20|step=0",
            "stateSignatureHash": "586907cbb9e8612070868ae2dcbfdd0bd866ee33d29b7a713094cdc1c35791b1",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "cx",
                      "570"
                    ],
                    [
                      "cy",
                      "245"
                    ],
                    [
                      "data-viz-name",
                      "stationary-point"
                    ],
                    [
                      "data-viz-value",
                      "20"
                    ],
                    [
                      "r",
                      "15"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "df911560ad824a53921a1a751f703ca9e59844ff8acb1d10c832b0d2fc040ce4"
                  },
                  "tagName": "circle",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "5fbd679a722c7ae537129ef78651a7cc6a7fa1e041a932753630bec9687bac15"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "start",
              "descriptor": {
                "controlId": "start",
                "enabled": true,
                "excludedValues": [],
                "maximum": 20,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "bounded-step-v1"
              },
              "value": 6
            },
            {
              "controlId": "step",
              "descriptor": {
                "controlId": "step",
                "enabled": true,
                "excludedValues": [],
                "maximum": 14,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "bounded-step-v1"
              },
              "value": 5
            }
          ],
          "controlsHash": "3c2fb84e7318b96555ca61679df47ba34b5157346798211a7393db2d2b3d84a2",
          "publicStateHash": "c4c010e9a378fdaba40490cc2c76a21bec9b2fd0936303c5373c797c6c1d8608",
          "rawSerializedPublicState": "{\"operation\":\"add\",\"start\":6,\"step\":5}",
          "resetClickCount": 1,
          "stateSignature": "start=6|step=5",
          "stateSignatureHash": "46b806723246d50b9507c4d8d2fcfb680acf286655897df72d08869c9e0e48c2",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "d",
                    "M220 220 Q282.5 110 345 220"
                  ],
                  [
                    "data-viz-end",
                    "11"
                  ],
                  [
                    "data-viz-name",
                    "directed-jump"
                  ],
                  [
                    "data-viz-operation",
                    "add"
                  ],
                  [
                    "data-viz-start",
                    "6"
                  ],
                  [
                    "data-viz-step",
                    "5"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "264ca3276d1aaaf544671c3cb5a1cffa53f7f440134a9ee7ae40c836c963846a"
                },
                "tagName": "path",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "de1460ae038fe239d4844e2a815466f71b4c1b4582835d2057d3d742593f547e"
        }
      },
      "domainId": "bounded-step-v1",
      "labId": "p1-addition-subtraction",
      "modeId": "subtract",
      "modePreparation": [
        {
          "groupId": "operation",
          "modeId": "subtract"
        }
      ],
      "planHash": "2ea5b297fcf9fbc9c64fd4b678f4df0e7c8f1e02c11e07760bc1972fa687e773",
      "projectionMatrixHash": "a03713d0de73713cfd615d28c2002bfbf8cf2e1823dff6f367cabacef95e9004",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p1-subtract-step",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "f2b599bd27b6e5fe57de1f10a7a0780e2667ba83d22fa219b4fb282f3801d371",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "f2b599bd27b6e5fe57de1f10a7a0780e2667ba83d22fa219b4fb282f3801d371",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "427b0d514a737ba841def434112e70ff75aa25fe9f220cfb34bdf543c264ee69",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "e0c7dbfa8ff2796623dc684fdb5b74436bfb8316086410c0f56a9d4607302d9d",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "496ca1d03616cd3f110c1e008b50041082141970d88af6a9c80f2acdcbacd8e5",
              "988c77ce1688200e1eadbc6e1991fd7574f3c74c8ba5ac8c746c72edc362e88f",
              "2e196453e9462902c08f72131cb8c539d5772ae08786090501289178664d81fb",
              "50c7b9c4106170a53100cd9ca3a5993e13f7113402256c4bfa35365ec3b93517",
              "496ca1d03616cd3f110c1e008b50041082141970d88af6a9c80f2acdcbacd8e5"
            ],
            "projectionHashesHash": "63918b14ca18ff08716a7febfc670a745d0f602eaa01f89e76eaa8f57887b1d8",
            "topologyHash": "6d4936b663dd789a6ae055f782fa7dea49f97d875ceae5872105ea745999e8a7",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "c38e3d7faf050a2c9ebded0e29580f59e65b22eff6b0307b0628af680ac629b9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "c38e3d7faf050a2c9ebded0e29580f59e65b22eff6b0307b0628af680ac629b9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "fe6b637436634210557c5f955237b45176b5f35bdc16c7c07a0e8c2be02168e0",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "0b99280f58995b0b189525db86bf1084c8cb890f35fdb948b9f96316841bc7e9",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "35e17e97881a403e3af957c83f754a8f68dfad7a4d717698731e2a4cd72b9181",
              "45fa10c6db89f1964649f641c779068fe0cd7ac306a21ca7e9c0c4528309b8e2",
              "956ed0eb96188c7b4704d70d5a107a630016708a1c09a60ccb6ff0b5e33db49d",
              "75f85d5713e8011c1a58e8dfddda09f162888da4f0f0ea0711b31ab3682af94e",
              "35e17e97881a403e3af957c83f754a8f68dfad7a4d717698731e2a4cd72b9181"
            ],
            "projectionHashesHash": "86dfbf21bf027ca5e7d53407c7a08f061aa4a2502a0d7494a5d3a5898c52e062",
            "topologyHash": "3a5fa0e09eef72807fef0e68803060c7d7f6bfa95e04cf4c7e47f9ea36334876",
            "totalElementCount": 14
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "6c7eb96437d61d2d60480c0ae08c44257455a91e951050384e0770a71688a05f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "6c7eb96437d61d2d60480c0ae08c44257455a91e951050384e0770a71688a05f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e9457eb9bb974e7e1827af7b0b1b017b32f09e681ccaaddd7ac0f4f47a1a9183",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "d645ecfad87abb8f19cabec0178a1ac9bb060830dcd0095b56c5345cec85b27b",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "dc8dbb93bf2cd449fb3aec252f97938be2ae7c15c0a760fa4cfe155b7b702415",
              "c9dc30ba630366ef566a75d000da76e1d8e4f0abb68ae9391344eafeca25dd71",
              "7e0b0e5a670812b14070e62c9478185814d1839df52f152c651bc665dfecd21a",
              "28a62bdb77f42896e4f9e6455bd4456f5870c4b03842c25f6e3b29b602bc454b",
              "dc8dbb93bf2cd449fb3aec252f97938be2ae7c15c0a760fa4cfe155b7b702415"
            ],
            "projectionHashesHash": "3f0bb50ce09ea9312d22125f0e29c4fe7cef4ad233bee327fc6de5f604bac25e",
            "topologyHash": "55a61129e7506b5edadfd092af7ce12e200951e11cc909b5a54f7c79de675fc7",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "f70af86f05a9c4bdad7d95cc0b68a4b050be63e4cd0923b3807b1dbf0bafb187",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "f70af86f05a9c4bdad7d95cc0b68a4b050be63e4cd0923b3807b1dbf0bafb187",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "0006b619ccebc8654111eee0656bd7afb6b82d96e53fea1b3f305b0cb6b29cdd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "1733b8fe1f81dfe8efba21757e74db506ea7a950ac50dae9e0e4d85b44be913b",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "90bdb3d0a1789f05461bcd4a76f4fb1bd1705ccbe96cc5244b10141799b481fe",
              "8d1a31a438037ecc65895044eb3a407194179ed336cf8876905e80efad1bcbe0",
              "60c090137236853563d989c4fe229d2401dd7b85a2df16538db8342057bc1391",
              "70a5058802ae30d37bd1b051799ec83217ffd60fa423cb3fd023ba5833c82f2c",
              "90bdb3d0a1789f05461bcd4a76f4fb1bd1705ccbe96cc5244b10141799b481fe"
            ],
            "projectionHashesHash": "36258fbdcb82d192e341c37d870da290ccfa7eb687d68133286ba7e2c4e96e3c",
            "topologyHash": "a761c03a363792adda360b3710f8bab56cfa6d3caf0ec829b334a2823da5e28e",
            "totalElementCount": 14
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "157784884bc7f689c4de4b6743206eb8c8961efebadeb0436a8283560176379b",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "157784884bc7f689c4de4b6743206eb8c8961efebadeb0436a8283560176379b",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "e6b996c1d81857381b0b77323259d450a06c8d2efffcc46677a2cd46bbbd1bea",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "e2c56846a7b39e0e957cf846a1ced4020502e81f48fd3a99e73b31f84bdcaa4b",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "68035f3d04c3004c978fc31dd416619d7db8fa41fbc1d83dd10ffe7b9983588e",
              "47814a10ef1d3f5a9030977b958d5f041ae6069f6bad396665fcd0364f9b9ac4",
              "112926bc556b45a1252d1e324db9301b6c638fce37b5e0bf98e1dda2ee4cb962",
              "6a628f755638fd81f64b91a52d8337dc03d446f3c1fb83499c3c70dac3f4e27d",
              "68035f3d04c3004c978fc31dd416619d7db8fa41fbc1d83dd10ffe7b9983588e"
            ],
            "projectionHashesHash": "ceaa0b11faa669cc25b7b8eebd3ec4b206bcd623c8747a941d73df44de29da54",
            "topologyHash": "0c662abb785f1eabda0c891108aa59d2700d64854896ae026ba2ae7fa6f0d5c6",
            "totalElementCount": 14
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "cb44599412136ee4b48d4295e3a2e9b0031c73709f64e9aa2302ae7ddfcf4acd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "cb44599412136ee4b48d4295e3a2e9b0031c73709f64e9aa2302ae7ddfcf4acd",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3d27b45c94a632fceb16cc9bdbb61306fe60a0f73faee705943cbbddac04ee00",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "941a814705b4e5d615536f4e62c8b8d5b7bc6bb7ebce2f8bd658d6f6086641c6",
            "elementCounts": [
              4,
              4,
              1,
              1,
              4
            ],
            "elementCountsHash": "7ee3319a4b3645f15589599c5df336884ba47079dcf284ee360cf005ad7cc532",
            "projectionCount": 5,
            "projectionHashes": [
              "da46a75f8c32a633b081572deb5f60d93f16e976a5efa8097b69c72a142f3c34",
              "cc0680a86d49d0de2403f905c00cbac8bc470ec24cf02dbce7a81d97e85c1830",
              "efd8e98b04c892db89de2dc2b1b2944419eb2becdfaeba2853579d363da225ae",
              "84d9ed4c0a7d5b11547a198b24941aaba7082e059b3f18a285ba625e189737e1",
              "da46a75f8c32a633b081572deb5f60d93f16e976a5efa8097b69c72a142f3c34"
            ],
            "projectionHashesHash": "824945f34c5e4fc7b73b04e27df92f319aa3b48591a9b1a59e4fa33d55eda541",
            "topologyHash": "2f92323ce597d4609379c4a84e8620fef04bdb949f2357e2d1d0b411f084b704",
            "totalElementCount": 14
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "1a841abaa6c175b3c6b0c0b1d7e532b50bfe9e95f82393a26ffabf3a0de1c1d0",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "price",
                "descriptor": {
                  "controlId": "price",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 99,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 1
              },
              {
                "controlId": "payment",
                "descriptor": {
                  "controlId": "payment",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 100,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "115accc468d79a0e01543a4ce1390423bc6025cf3362de186e6c62234861df4c",
            "phase": "pre",
            "publicStateHash": "d3ca5f8a2b9df7f4a914efcfe205adba649f52473d5ec90835ebf2bb96dcfa98",
            "rawSerializedPublicState": "{\"mode\":\"money\",\"price\":1,\"payment\":1,\"hour\":9,\"halfHour\":true}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "price=1|payment=1",
            "stateSignatureHash": "e74983ab69e7ebf0c8b8425343821c3e68a711a96508277a30fd5abaef94d280",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "2236434f7ca162bac739332b92efb8f4f7bac739e6e939779b23cd8a0076c7f7"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "d48294c4cbb34c79e6343cff09628af5961024a6c85c84004423d387e25af3b9"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "2236434f7ca162bac739332b92efb8f4f7bac739e6e939779b23cd8a0076c7f7"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "d48294c4cbb34c79e6343cff09628af5961024a6c85c84004423d387e25af3b9"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "2236434f7ca162bac739332b92efb8f4f7bac739e6e939779b23cd8a0076c7f7"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "d48294c4cbb34c79e6343cff09628af5961024a6c85c84004423d387e25af3b9"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "6d8e369a0a21a2b7116bc7cb33099c575e43c402da95730d636dd2017e9be0b0"
          },
          {
            "controls": [
              {
                "controlId": "price",
                "descriptor": {
                  "controlId": "price",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 99,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 99
              },
              {
                "controlId": "payment",
                "descriptor": {
                  "controlId": "payment",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 100,
                  "minimum": 99,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 99
              }
            ],
            "controlsHash": "cb08a9e8bd0182f0dba773ecbc534a733f9e8b04495212d17445dbc23ea55113",
            "phase": "clamp",
            "publicStateHash": "bc164a7a147d94d6e4d52c54e3d968dc5f9de3ccdb47772df0f278ab3d952f0c",
            "rawSerializedPublicState": "{\"mode\":\"money\",\"price\":99,\"payment\":99,\"hour\":9,\"halfHour\":true}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "price=99|payment=99",
            "stateSignatureHash": "63790ad553b69018a5160289cd547f0ebfa52a9dd368c4d16804d6ecb2e757c9",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ae84f7102122eeb744f6f782e55cc77766f8deef71d39df40487771995a4e793"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ae84f7102122eeb744f6f782e55cc77766f8deef71d39df40487771995a4e793"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "ae84f7102122eeb744f6f782e55cc77766f8deef71d39df40487771995a4e793"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "4abe34319dc7b756c0cb6872c713d576572c1b813c581b8a33a660af4e0a57b9"
          },
          {
            "controls": [
              {
                "controlId": "price",
                "descriptor": {
                  "controlId": "price",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 99,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 1
              },
              {
                "controlId": "payment",
                "descriptor": {
                  "controlId": "payment",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 100,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "payment-at-least-price-v1"
                },
                "value": 99
              }
            ],
            "controlsHash": "63d933b2df74970686cd1753f3c06a0a3229e4043900ad4f22f8671141405532",
            "phase": "expand",
            "publicStateHash": "29d8299be00f0c960b5d775b5f42cc9b95763027572c09e60064e40ca609e945",
            "rawSerializedPublicState": "{\"mode\":\"money\",\"price\":1,\"payment\":99,\"hour\":9,\"halfHour\":true}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "price=1|payment=99",
            "stateSignatureHash": "52cf5f035de29679b95f969f98c04a3c2226d456d4de9139ec3bfd4da6c51e2b",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "4.929292929292929"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "4960ac988ad703228e681decdf185123193b06507c2e192fc78da67e9b1abfbe"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "4.929292929292929"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "4960ac988ad703228e681decdf185123193b06507c2e192fc78da67e9b1abfbe"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "payment-bar"
                    ],
                    [
                      "data-viz-payment",
                      "99"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "488"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "6137992deb2f3eaeb2782bfed74070d709248e04c10a6fb7f62c65c78193c14d"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                },
                {
                  "attributes": [
                    [
                      "data-viz-name",
                      "price-segment"
                    ],
                    [
                      "data-viz-price",
                      "1"
                    ],
                    [
                      "height",
                      "70"
                    ],
                    [
                      "width",
                      "4.929292929292929"
                    ],
                    [
                      "x",
                      "76"
                    ],
                    [
                      "y",
                      "228"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 1,
                    "hash": "4960ac988ad703228e681decdf185123193b06507c2e192fc78da67e9b1abfbe"
                  },
                  "tagName": "rect",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "b7bd1e7915d95def800d632062fd7bb6fcd95e8a4c359b3d02c8b73405cf345c"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "price",
              "descriptor": {
                "controlId": "price",
                "enabled": true,
                "excludedValues": [],
                "maximum": 99,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "payment-at-least-price-v1"
              },
              "value": 32
            },
            {
              "controlId": "payment",
              "descriptor": {
                "controlId": "payment",
                "enabled": true,
                "excludedValues": [],
                "maximum": 100,
                "minimum": 32,
                "step": 1,
                "visibility": "range",
                "domainId": "payment-at-least-price-v1"
              },
              "value": 50
            }
          ],
          "controlsHash": "3fed1bf1c13aa0b91ad120915d7ee4c2f4459523e814c86638dfbb44b534c34b",
          "publicStateHash": "706e4eb31b6c21a8db4d1ffbd0e928eb3c87ad4f36c5a446aba1a616465483e9",
          "rawSerializedPublicState": "{\"mode\":\"money\",\"price\":32,\"payment\":50,\"hour\":9,\"halfHour\":true}",
          "resetClickCount": 1,
          "stateSignature": "price=32|payment=50",
          "stateSignatureHash": "be8754980d189d8fdecf47879c6e0756150260603068643db3c7c0205ac81f9e",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "payment-bar"
                  ],
                  [
                    "data-viz-payment",
                    "50"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "488"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "a80ab10e7f303d00a43785f69fb58b1bcabb87c3e15e2a9620afd929ffdd7e5b"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "price-segment"
                  ],
                  [
                    "data-viz-price",
                    "32"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "312.32"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "08bdbbd71b7f4ad392582043e10bf95317165326386a962a770303dfa99f8b6d"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "payment-bar"
                  ],
                  [
                    "data-viz-payment",
                    "50"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "488"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "a80ab10e7f303d00a43785f69fb58b1bcabb87c3e15e2a9620afd929ffdd7e5b"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "price-segment"
                  ],
                  [
                    "data-viz-price",
                    "32"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "312.32"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "08bdbbd71b7f4ad392582043e10bf95317165326386a962a770303dfa99f8b6d"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "payment-bar"
                  ],
                  [
                    "data-viz-payment",
                    "50"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "488"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "a80ab10e7f303d00a43785f69fb58b1bcabb87c3e15e2a9620afd929ffdd7e5b"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              },
              {
                "attributes": [
                  [
                    "data-viz-name",
                    "price-segment"
                  ],
                  [
                    "data-viz-price",
                    "32"
                  ],
                  [
                    "height",
                    "70"
                  ],
                  [
                    "width",
                    "312.32"
                  ],
                  [
                    "x",
                    "76"
                  ],
                  [
                    "y",
                    "228"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 1,
                  "hash": "08bdbbd71b7f4ad392582043e10bf95317165326386a962a770303dfa99f8b6d"
                },
                "tagName": "rect",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "86337d27f194619bdc6a11b323d8f6eab5bcd683fd1216ac84bf6eb85409ddf4"
        }
      },
      "domainId": "payment-at-least-price-v1",
      "labId": "p2-money-time",
      "modeId": "money",
      "modePreparation": [
        {
          "groupId": "model",
          "modeId": "money"
        }
      ],
      "planHash": "ddc4060cff1b4da5e3eb7ee7cf40f4f4bd24e34916ea557fd1c94ad235e2c98e",
      "projectionMatrixHash": "17fd537f5cb8bc47ce9676f436d179ceea3d8371abd57f91ee05622b3015c065",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p2-payment-at-least-price",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "ff69b15c73512896dd0975fb4bb4029a92c3a6d2fc36fe9d7e6b2deb0e04a324",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "2e4d881b1da7e5fca1dfecbc7947b9077c0b6829d9ee19e325652af080ad1118",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "2e4d881b1da7e5fca1dfecbc7947b9077c0b6829d9ee19e325652af080ad1118",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "ff69b15c73512896dd0975fb4bb4029a92c3a6d2fc36fe9d7e6b2deb0e04a324",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "ff69b15c73512896dd0975fb4bb4029a92c3a6d2fc36fe9d7e6b2deb0e04a324",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "3ad2453d047b94d45fad5c82b082b25e5afc79365185a9a4f7df3e18ff180d89",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "090274c1e2cd91eaf817a75fa7de6f7d952c3016abfff1ce7713cadff628e144",
              "be0ff6f0e330d4f97634b73427c68ee94672f23c46e92f81cfe071ba322f2d7f",
              "9dbb5553641757f49e213f424e19fc3e778d5a146ffe815e52eefbbf8eecc38f",
              "6d1ecdaf2d1114a4a2af74a448a040e37f52843146ddc40327562defd0b05fc9",
              "090274c1e2cd91eaf817a75fa7de6f7d952c3016abfff1ce7713cadff628e144"
            ],
            "projectionHashesHash": "a76a4eb1890bd11b9e5ba053b376ac8f095e79cbd0d41006863d18cc497ad04b",
            "topologyHash": "f1574525979608c2187bf42ca88611106f3fcd71dd132fcb05af2fbc6da709cd",
            "totalElementCount": 28
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "7e7570eed6f09c8e3d5bdb34f3606aeb707c972a65e1990e4611f466c9891143",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "c7f4407800e9cb341e07812c1eac53ef649700c765364b4905d802ce928e560d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "c7f4407800e9cb341e07812c1eac53ef649700c765364b4905d802ce928e560d",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "7e7570eed6f09c8e3d5bdb34f3606aeb707c972a65e1990e4611f466c9891143",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "7e7570eed6f09c8e3d5bdb34f3606aeb707c972a65e1990e4611f466c9891143",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "45a0c1e0b10634186a81835cea21cf08dce46257ad251aa3647b04b4c4149293",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "9ccb9234d0df57f9a09f7b0790279aa421f479a0335fc5b0e1098b938e0e5239",
              "809adab8c8dff16ea32bca8661750f2c4d52ec005a4861c9b7765fa172799af1",
              "35a5f3f7b13f25d2dfd85d569d2623ba1ab3f6ac3c62c8d20c172878c53b2cc8",
              "4ddd1c07fa184ba58db33436757b8bf49ed13d669226b812bdb9fde26aab6274",
              "9ccb9234d0df57f9a09f7b0790279aa421f479a0335fc5b0e1098b938e0e5239"
            ],
            "projectionHashesHash": "65ec25379c122a10470d4ae077bc6c8101aa62f60be0cc1baa3356bb94b6164e",
            "topologyHash": "0312641384fe2906dd56dffb4b2161bf4f3cb168832c3a4da32f1de7baa5f1a7",
            "totalElementCount": 28
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "92b3c1810b953c6c11b94209fd420a099b0031f683cf5937af52531aaf296692",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "7c1bca9f21af405f9c8a7598738aebcb04b6c4245e11babd97986c9a58f8affa",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "7c1bca9f21af405f9c8a7598738aebcb04b6c4245e11babd97986c9a58f8affa",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "92b3c1810b953c6c11b94209fd420a099b0031f683cf5937af52531aaf296692",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "92b3c1810b953c6c11b94209fd420a099b0031f683cf5937af52531aaf296692",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "e1b0deee5a8cf5755d2a658cbe26ba6e858738174c03d42ab0f077a073a90b1e",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "20a3e752e75773a7f150ae5b89adec15a5701a0981af62a95ac81539a85f4db9",
              "d396fae500b629c03ee1d3333b38fd3c331dd70e31751124c55755e33d6c30c9",
              "c1003476c432e0b5fa9728c37ebfbfc6a6343a3f49c9be3b2db8078f894248df",
              "5377286a209dfd6da4e91568c2b85dedaeaa207b7273954a1b593a4a06ea6257",
              "20a3e752e75773a7f150ae5b89adec15a5701a0981af62a95ac81539a85f4db9"
            ],
            "projectionHashesHash": "a7e7c89c0b86306abb27c46cc48e2670213f80cb135f0f05704b75cacca5387d",
            "topologyHash": "c6eb9f303e46688c6986aaebac71e65a63a9277d289ae43804a82fe426750434",
            "totalElementCount": 28
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "b46f796166b9c1f89a79cd7c8613f4231ab1e2726943ccb5ffbc2d9864783dae",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "e21b4928c830be4bb887ba22efcf1668c81df06c2d0cef58f2a21ce22476c542",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "e21b4928c830be4bb887ba22efcf1668c81df06c2d0cef58f2a21ce22476c542",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "b46f796166b9c1f89a79cd7c8613f4231ab1e2726943ccb5ffbc2d9864783dae",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "b46f796166b9c1f89a79cd7c8613f4231ab1e2726943ccb5ffbc2d9864783dae",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "30e877d5ef2f7d17b1fe39736bb7f43b39087403ae3c12f4eb52cf13d86f55e2",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "55f7aa03ccca696dc025f02d8d65b58d0164ef817bb56252a548c6909f7e41af",
              "3047a0b552b07afc397001f3ffdea55437d18cf7f477bd7fbe36811ed3071d7d",
              "1bf0ef153452467cd178f87d92146b2e4497cc651ae9932d5c081aa0ea54b289",
              "734e9ff88874e3c2cb2e4c31961e88f1d33e02b9133023c537d059c4f9fac79a",
              "55f7aa03ccca696dc025f02d8d65b58d0164ef817bb56252a548c6909f7e41af"
            ],
            "projectionHashesHash": "11f95b719c5b8693f1eb8c6c035a20565245c8eb226f1a7660d5c9c95f2a1772",
            "topologyHash": "090b6c1cd33a9c2294cd943e719522ff14b8911f3a1e4f7a0d56aecd9624e1fe",
            "totalElementCount": 28
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "05e92cb03a08fb097e5469441f5a1fe19acbbacbed08b1e938db0dd3a348fb33",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "ca251feadcce29670c4cb5914eb64d18cd48c875b697436a147f5b7de1655fa4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 86,
                "hash": "ca251feadcce29670c4cb5914eb64d18cd48c875b697436a147f5b7de1655fa4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "05e92cb03a08fb097e5469441f5a1fe19acbbacbed08b1e938db0dd3a348fb33",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "05e92cb03a08fb097e5469441f5a1fe19acbbacbed08b1e938db0dd3a348fb33",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "8621559cccd8e944dbd293c8507f5f45e0d08e4bfa3e2a4a1083831ea13292ea",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "d9c5631dc37be496c300b10c5ecfe374a05d41ea370a9fcd7597c42c2751c29c",
              "cd651886c9c81c8c1a17cd90cc1fd8eb192429de3c332a9a90c4c9ec36483c2b",
              "510d5744ef13e404ee3d21b7482e40cc79d38db1bd00567ec973c58496f3e2a7",
              "3d2e6115771c0b4af066a5d01313dbd40f8c241d2e69106b611d8dde2266bb2b",
              "d9c5631dc37be496c300b10c5ecfe374a05d41ea370a9fcd7597c42c2751c29c"
            ],
            "projectionHashesHash": "4a6741a0505acb2f6e3d2bd1d13b94b545dd0e18aa709517e1285349ea7c8a55",
            "topologyHash": "5c521d8d98fbd678bbe72a691eaf9d840d95f80ebe71b29dc70faba7610d091b",
            "totalElementCount": 28
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "4a22db6d9e7af84af33263665460864ded19680df472f14aec6a86379294423a",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "8afa420479b25287a2a8f1bdaecf3ae94f19b0b71f30ddb638e740cdbe2ace80",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 28,
                "contractCount": 2,
                "entryCount": 84,
                "hash": "8afa420479b25287a2a8f1bdaecf3ae94f19b0b71f30ddb638e740cdbe2ace80",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 6
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "4a22db6d9e7af84af33263665460864ded19680df472f14aec6a86379294423a",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "4a22db6d9e7af84af33263665460864ded19680df472f14aec6a86379294423a",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "f6fa9f360c4302d990d42ad90b7a2e4d6136e183c876ce8f0d496e3c17bf725b",
            "elementCounts": [
              7,
              4,
              4,
              6,
              7
            ],
            "elementCountsHash": "684ae6097ec9ef3c0605d9c098ddda43343e83eb027ed47a99bb21c3a79ee371",
            "projectionCount": 5,
            "projectionHashes": [
              "3abb60934368f8f5e75e3f9a23b0ee990440865983f2a17ef37d96912b1f52b5",
              "16b46ced029520715bcf1ebcd76d8b04280bdb87742947096fae3c3906543742",
              "927e3638254d82b39b5405449685afdecfe43a81a975ea8c53a1f896ea87e2f2",
              "6738469f1d03e97ffdb7f1d4b1f255cb9c75d3aa45c3fa7f58c44c72db54105d",
              "3abb60934368f8f5e75e3f9a23b0ee990440865983f2a17ef37d96912b1f52b5"
            ],
            "projectionHashesHash": "94a6034567bde034744b7c51b5e1fe70967008694313bf4a18e1064e4c1751e1",
            "topologyHash": "66d2485226ca6c92e1e801e29e10090a5d497dba9a0849a3ae0dd770cf935653",
            "totalElementCount": 28
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "aff542794fea0c08cf107554c9f55e06ea86aaff7bb97d453c4088ed5ddac642",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "firstNumber",
                "descriptor": {
                  "controlId": "firstNumber",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 60,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 60
              },
              {
                "controlId": "candidateDivisor",
                "descriptor": {
                  "controlId": "candidateDivisor",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 60,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 60
              }
            ],
            "controlsHash": "45bb0ba153dc079134b1d6c0926409661b1a8baf61bce526b9300e2363257a74",
            "phase": "pre",
            "publicStateHash": "569af4ea8c4a54ee31d9b5c8f2c7993eebab4e04c01b6e189d338df376d9ca2b",
            "rawSerializedPublicState": "{\"mode\":\"factor-pairs\",\"firstNumber\":60,\"secondNumber\":18,\"candidateDivisor\":60}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "firstNumber=60|candidateDivisor=60",
            "stateSignatureHash": "a82789e35a5906e9152bd85c49228a2f8e5e44edae033a1df3ac76c9c27f0490",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "60"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "8632097adbb74ae2edc579fab53e3d586f112d471dcbd46a67c3a07164356491"
                  },
                  "tagName": "g",
                  "textHash": "e5a7c5e7181c51fe07f62659590fda49bc5b05d55f952ab804010df56b4a338c"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "60"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ba916a49cd70fb43630bd5ad401e818e2ea366800b538ac2f9c87366460020c7"
                  },
                  "tagName": "g",
                  "textHash": "05d63a4dfdbd345743971f4434034eb429010cd96bb6cf35c27846bc57e82392"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "60"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "543d03a8f8824d0c7ca97a5d1b517f27c7311a3e6ba0adffd612e8380dbe2fd5"
                  },
                  "tagName": "g",
                  "textHash": "714d844fb3fa2f636cc00cc35f2467e2ff899deb381fd68f48844aa7c3505a6f"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "c39bc3a056daf3dc23ca2657f15f091efbcb8aac9568956673a5eeca1c9ac5c2"
          },
          {
            "controls": [
              {
                "controlId": "firstNumber",
                "descriptor": {
                  "controlId": "firstNumber",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 60,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 1
              },
              {
                "controlId": "candidateDivisor",
                "descriptor": {
                  "controlId": "candidateDivisor",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "8bca9bcc92ffe5ea7af02a9e44a01aafda9f02bc796b2a8c9a273eb4cd21bbf8",
            "phase": "clamp",
            "publicStateHash": "ffd1ea57d4ae203dd6af65e838c158e31fc6ecfb957ed0417615bf3bfae76503",
            "rawSerializedPublicState": "{\"mode\":\"factor-pairs\",\"firstNumber\":1,\"secondNumber\":18,\"candidateDivisor\":1}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumber=1|candidateDivisor=1",
            "stateSignatureHash": "de554d2cf3270278fc18510f6ca789bf5bb6f290dfea084bff295fffb8d469b0",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "1"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "3aa744dc1e83be9cd7305a887238597e36a7b09ab51004aa065b382d734d6dbb"
                  },
                  "tagName": "g",
                  "textHash": "a326dd1697438a25c9d4672c7b86c0343f2ee415025275decad5eb9831ff4768"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "1"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "de6145d892f2320f75eea7429fe934f559abaa9c09feb9b7063d0c062f7a16c2"
                  },
                  "tagName": "g",
                  "textHash": "35842579e27ef8a0f572b1a25190191320316db88a761cd904b33f6650b22f2b"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "1"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "1"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "ecda4b8afd3fe935657bc6bed52fb979dd4fce17788709eec5ee675f200d1976"
                  },
                  "tagName": "g",
                  "textHash": "e97cdd08736a76eed58c58d844cca2d532e89639e8a994505e22b7a9a5e5799d"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "fe626b699417c028a7baa77b42c3609eda47673fee8c04768c7260bdb9461909"
          },
          {
            "controls": [
              {
                "controlId": "firstNumber",
                "descriptor": {
                  "controlId": "firstNumber",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 60,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 60
              },
              {
                "controlId": "candidateDivisor",
                "descriptor": {
                  "controlId": "candidateDivisor",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 60,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "divisor-within-number-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "a99446e117d3c716503f124ba6a80bd61f1157046ff5c0b0b847c28a7374c065",
            "phase": "expand",
            "publicStateHash": "edb7c6fdca9677a8623944a706a93d925eb05372b2f59adb19316b3ad38a25ca",
            "rawSerializedPublicState": "{\"mode\":\"factor-pairs\",\"firstNumber\":60,\"secondNumber\":18,\"candidateDivisor\":1}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumber=60|candidateDivisor=1",
            "stateSignatureHash": "257e9b37d7893c97109cc1cfe17b84a29ec90b7cb328448f043bf11e3532421a",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "60"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "83ef035fdc11164f7483522e127f1e215d08c30fad3dcdd39f557941a8ab3d3b"
                  },
                  "tagName": "g",
                  "textHash": "6e4405b103eae2686c9393d98ab41e4c6e5ca5f073d5af5def4cc19b8bdd578c"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "60"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "927224ab681c031628d17f44d4c4506a07ff2a4a9c0d96fa4f1dad4a4ab5d525"
                  },
                  "tagName": "g",
                  "textHash": "59ed7a5b56782d4a40863d971b6995d9442f2aa892f8290a246ab0ac25577b03"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-dividend",
                      "60"
                    ],
                    [
                      "data-viz-divisor",
                      "1"
                    ],
                    [
                      "data-viz-is-factor",
                      "true"
                    ],
                    [
                      "data-viz-name",
                      "remainder-test"
                    ],
                    [
                      "data-viz-quotient",
                      "60"
                    ],
                    [
                      "data-viz-remainder",
                      "0"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 3,
                    "hash": "f060c2db9ea39eda17d044d9749ad96fa603caf33a378fb4a9682c00abc36d25"
                  },
                  "tagName": "g",
                  "textHash": "5d1302ece58df0170387fb563961dcbc24258ccc505547d3e5c5f1a3df7aa9e8"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "16f2653b6894488cfa78f420f14299e87eafc401a484c274ce7306e421f10255"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "firstNumber",
              "descriptor": {
                "controlId": "firstNumber",
                "enabled": true,
                "excludedValues": [],
                "maximum": 60,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "divisor-within-number-v1"
              },
              "value": 24
            },
            {
              "controlId": "candidateDivisor",
              "descriptor": {
                "controlId": "candidateDivisor",
                "enabled": true,
                "excludedValues": [],
                "maximum": 24,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "divisor-within-number-v1"
              },
              "value": 6
            }
          ],
          "controlsHash": "3f35380cb57b2d0a82d7ff3d6819cbaf569d442f96589f18b993363bc94995ec",
          "publicStateHash": "9348b7739a78b7b9279641be13d8e8f243608e0fdcc1c1e1b68d39ed69f2a783",
          "rawSerializedPublicState": "{\"mode\":\"factor-pairs\",\"firstNumber\":24,\"secondNumber\":18,\"candidateDivisor\":6}",
          "resetClickCount": 1,
          "stateSignature": "firstNumber=24|candidateDivisor=6",
          "stateSignatureHash": "a99cd97c91f6bdcf1af6fa5df69a18aecd0b1bef819eaabcf7607bea44b0f582",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-dividend",
                    "24"
                  ],
                  [
                    "data-viz-divisor",
                    "6"
                  ],
                  [
                    "data-viz-is-factor",
                    "true"
                  ],
                  [
                    "data-viz-name",
                    "remainder-test"
                  ],
                  [
                    "data-viz-quotient",
                    "4"
                  ],
                  [
                    "data-viz-remainder",
                    "0"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "1d5aab684021bf2d46e65079cd2751d8ea9723e71cb1318effe9a929cc536dc0"
                },
                "tagName": "g",
                "textHash": "4194db89e7aa4e3245f517fba2edbfdf128b697993b184c23c8b9967ca0c34e1"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-dividend",
                    "24"
                  ],
                  [
                    "data-viz-divisor",
                    "6"
                  ],
                  [
                    "data-viz-is-factor",
                    "true"
                  ],
                  [
                    "data-viz-name",
                    "remainder-test"
                  ],
                  [
                    "data-viz-quotient",
                    "4"
                  ],
                  [
                    "data-viz-remainder",
                    "0"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "6d6cd6b9079a480d590bf4cb6ebf9bb4363138939293c59d5b3708ebfe13de29"
                },
                "tagName": "g",
                "textHash": "93324d0de72a65d704b1204f148a7d779f58e4709032b75db7cdbeaf77108872"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-dividend",
                    "24"
                  ],
                  [
                    "data-viz-divisor",
                    "6"
                  ],
                  [
                    "data-viz-is-factor",
                    "true"
                  ],
                  [
                    "data-viz-name",
                    "remainder-test"
                  ],
                  [
                    "data-viz-quotient",
                    "4"
                  ],
                  [
                    "data-viz-remainder",
                    "0"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 3,
                  "hash": "b2209fe77a6c0e2b3876e400f56e03cde873333af1588299e70acd8448a90e92"
                },
                "tagName": "g",
                "textHash": "fc80eef5609e32f4f77735aebacaa311cf6f8896036d72770cd513f061cc2916"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "e8b4c7d259f6df6d071702170573b42658cbd8bda0309013aada68a22b63c38c"
        }
      },
      "domainId": "divisor-within-number-v1",
      "labId": "p4-large-numbers",
      "modeId": "factor-pairs",
      "modePreparation": [
        {
          "groupId": "model",
          "modeId": "factor-pairs"
        }
      ],
      "planHash": "9daebc0fdeeeec65e28354b257e15f7fbfa095badf89d2851cb8b9cb726749f3",
      "projectionMatrixHash": "de8f2df23b43a0ab5e494537fd7564bd4dac2ba5d137ac1cfc9e2f1eab453bca",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p4-divisor-within-number",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c3e92eab7c25a23557429aa1385d6b550f9796a39edec3178202358f65593ca9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c3e92eab7c25a23557429aa1385d6b550f9796a39edec3178202358f65593ca9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c3e92eab7c25a23557429aa1385d6b550f9796a39edec3178202358f65593ca9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c3e92eab7c25a23557429aa1385d6b550f9796a39edec3178202358f65593ca9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c3e92eab7c25a23557429aa1385d6b550f9796a39edec3178202358f65593ca9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "e0d1ae7215d68db4b426da28ef3cb3fdc1495d41d2e969232bde17318e04eea7",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "f74f0af6e0f17dff076f6bd5a16e87ad69ef78cfeb2d217131de593f29a5d37a",
              "5201e1b11e60710c8bd3e3b9b941d2abaef6155b214d1ce4ee356cff2cd4fe34",
              "20ec927cdb724741129a49713659c979047d8bf568bc8cc386be7d3a1aed6bc4",
              "6858031feed5ac64f52d860ea3edb26bc18229afd16590b54a78a63fca9d4e92",
              "f74f0af6e0f17dff076f6bd5a16e87ad69ef78cfeb2d217131de593f29a5d37a"
            ],
            "projectionHashesHash": "07110f88aecd21c3e5c8697b36830e49331a7611b64dfeed34e17e4155d15cdf",
            "topologyHash": "69456fc4c564008bedb1333d14e78bfcff2c63c46a6d502c4035ba3e64e23440",
            "totalElementCount": 98
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "701b6a28fe0945e11d611c48c8815ae8928eefe2388015024d78febd1b3870b6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "701b6a28fe0945e11d611c48c8815ae8928eefe2388015024d78febd1b3870b6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "701b6a28fe0945e11d611c48c8815ae8928eefe2388015024d78febd1b3870b6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "701b6a28fe0945e11d611c48c8815ae8928eefe2388015024d78febd1b3870b6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "701b6a28fe0945e11d611c48c8815ae8928eefe2388015024d78febd1b3870b6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "8535a2239f91e730bfe46d6d2845b26ae039fc8712d90507a8bc934851633320",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "3f35b4d9b701cdd660a94bf8acfe2bb0e97c4f422153084608dfebc9b8af9d4d",
              "b7bb4eed9198bb05a94072cde8a4aefd3f1e10b899bb55c04e2f207084aea2a1",
              "4c03b814a2ece6badbaa8acaa4cda763081cb0c8dcd0038b014ce376cfd25f80",
              "5b5bdac232f1533c9a25eb6ea0a88fd1d0e8f1315be1d3108fa795254bdbf07a",
              "3f35b4d9b701cdd660a94bf8acfe2bb0e97c4f422153084608dfebc9b8af9d4d"
            ],
            "projectionHashesHash": "5afb1d989eb2fdd383da9a6d599b24288f8ffe549a0d15d23851cec0d0a266d0",
            "topologyHash": "bdaef8adcbfc8062818a39adf3b8349a84560342b0c058faffc8eccff41c0b72",
            "totalElementCount": 98
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "abf9868e35f48c7bc3a4f0107a8fd740b75fd74863fa9685dca62011b7e802f5",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "abf9868e35f48c7bc3a4f0107a8fd740b75fd74863fa9685dca62011b7e802f5",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "abf9868e35f48c7bc3a4f0107a8fd740b75fd74863fa9685dca62011b7e802f5",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "abf9868e35f48c7bc3a4f0107a8fd740b75fd74863fa9685dca62011b7e802f5",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "abf9868e35f48c7bc3a4f0107a8fd740b75fd74863fa9685dca62011b7e802f5",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "8d4e75dbde6dc20551abfb9d443a3346002a027718391be6528a45dfcf27105b",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "d4a1275ee4b9050bde5b7b6477f88594dffb89769255d1ea8127dfcc1c841c5d",
              "1b2daebe814b2568c30362048d54aed977f81681ebdbfb34e4e59901ee4dad3c",
              "af289b8994a799bbdae825a58a787e19d474a63460018d00c0df2b8cd8b76dce",
              "021c60b62e8b375b59c6ce8b9a614520bb154eb7fd36322b8dc30c93ffd2270e",
              "d4a1275ee4b9050bde5b7b6477f88594dffb89769255d1ea8127dfcc1c841c5d"
            ],
            "projectionHashesHash": "826a693d31187b3ac3ca914f5892ea2afd01c61157fd3663b1b5b6b9bbdd5bc9",
            "topologyHash": "4246e8ab11b6fd15bc3badfb37e5ba1d54c5c90dd153fd3c6c964ead86552cb7",
            "totalElementCount": 98
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "9082439d1df53add8ed5f9ee47e977e7c0fccdd38d4e812bfacc693b72bb1c51",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "9082439d1df53add8ed5f9ee47e977e7c0fccdd38d4e812bfacc693b72bb1c51",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "9082439d1df53add8ed5f9ee47e977e7c0fccdd38d4e812bfacc693b72bb1c51",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "9082439d1df53add8ed5f9ee47e977e7c0fccdd38d4e812bfacc693b72bb1c51",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "9082439d1df53add8ed5f9ee47e977e7c0fccdd38d4e812bfacc693b72bb1c51",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "72487d3242f54fadb8068f5c7e251b9d5ee731f05b5618dc6893a860b1f70da6",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "cd5cfeee0680366415389564f506fce17407ff9b87e548e8b8dc65a6f02c33b9",
              "9a113c727fa28f824dcff13b57797f33065cb2e1dc44c195bb0b2700bf5ee233",
              "890d7558ed60675f320b6db8dce5e15a28ac8f615c9b0727274b9305a7c5d599",
              "f9380e6320a902d1ba6498fe543e9f264b2ceb72e73bb3d992709b8a969996fb",
              "cd5cfeee0680366415389564f506fce17407ff9b87e548e8b8dc65a6f02c33b9"
            ],
            "projectionHashesHash": "5b8de53960e9c667537eeea8b5b1c2dbf26e2a9a77e514afb136b3af9d7a4eff",
            "topologyHash": "fc70c2d09013ed2ca3cf19a7f492998cd684333e04dbb9b1fe1eb10b4ae5c631",
            "totalElementCount": 98
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ac3aee1e58e823e1bd29324d343eac04653eb7b2474cc834495916499a35a055",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ac3aee1e58e823e1bd29324d343eac04653eb7b2474cc834495916499a35a055",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ac3aee1e58e823e1bd29324d343eac04653eb7b2474cc834495916499a35a055",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ac3aee1e58e823e1bd29324d343eac04653eb7b2474cc834495916499a35a055",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ac3aee1e58e823e1bd29324d343eac04653eb7b2474cc834495916499a35a055",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "170d82ea8d2137b1be875fa18fce75c3bc7363fa6d7a9b640f1a57dc9605c407",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "a0657e9e44ae70de6b5b74c359c39664ec6b859c937393fd42702a415afac06d",
              "be3625c5fbac8e7ef2ae9d15aef5ba4b7e54a77bd23a1a001772c3c4ae68a6e1",
              "35f39ad21148c7c9386b7953947aaa361cc48d00d0843f1ed8b0aecb9b1649e0",
              "b9c45f984a4e0e04a587e8669b5d2e79633c03e61991d0baf6074aa1763faeef",
              "a0657e9e44ae70de6b5b74c359c39664ec6b859c937393fd42702a415afac06d"
            ],
            "projectionHashesHash": "bbe508b7a93fea1683e8fba374749f696a1232c7e66064a731794b52414e662b",
            "topologyHash": "8c38be92a2178fe7cdf9e328d6727379629e86d3940543727cfe9ae9fc851eb3",
            "totalElementCount": 98
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "26da6c19bc60598016e0338bedfbad74a399d50a8c20f155a77e126d5fd1f116",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "26da6c19bc60598016e0338bedfbad74a399d50a8c20f155a77e126d5fd1f116",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "26da6c19bc60598016e0338bedfbad74a399d50a8c20f155a77e126d5fd1f116",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "26da6c19bc60598016e0338bedfbad74a399d50a8c20f155a77e126d5fd1f116",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "26da6c19bc60598016e0338bedfbad74a399d50a8c20f155a77e126d5fd1f116",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "9c9ece479445b134ed8ba8a0632b2ddc8515a24488faa750ee6351fef9e8d225",
            "elementCounts": [
              19,
              25,
              10,
              25,
              19
            ],
            "elementCountsHash": "13f6430539361a91c218bbb78951eca5c8d26146b5c2b7a01531a93c04745543",
            "projectionCount": 5,
            "projectionHashes": [
              "efe9d7bc66ed020b6824a2552c17517836bedcc3d564e25f019922f445828452",
              "6cdf7a98e6a2346b4622b3c45ba4c405ab823fe4b065a77b32502cf1fabe6768",
              "e0752bfa68850dc6b2659a2f8ee7d688b9b31bf7779418303bdcc31e02bf6b71",
              "a5113810c78ebf990cbd5849eee9ecdddf6664e127801b9d73a4b94887dd39f1",
              "efe9d7bc66ed020b6824a2552c17517836bedcc3d564e25f019922f445828452"
            ],
            "projectionHashesHash": "9ae77f35b3044d97676df31a7a12e6ff3771eac504a7b635bed7002bda1a0267",
            "topologyHash": "14a12781217987d303bf0bf63ef0086fdb50f9d8bd50c7f5195c3a902089b2d9",
            "totalElementCount": 98
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "ae2eee69979a04ebcea79d729a9fcfd956a82327563323d9fa4f826c2443a150",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 5
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "2133bd08846d994d5941db8adcc01bb9333b93adbaad654dd48d9e9a37ba44e5",
            "phase": "pre",
            "publicStateHash": "308292a39bafaa629a086db6fcdadd4afefabdafb5072eb18b1e1ce55b7e0473",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"5/6\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "firstNumerator=5|firstDenominator=6|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "5cce0ad4760003052279aa31d239ab2f09f5a4a254fd5574b92e30637432b9ff",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "84d90351674b8d3f352ed6ab3c091b5879cf375fe3083d8ec5c9305b3c61515f"
                  },
                  "tagName": "g",
                  "textHash": "b0ca0e6675144911967865232d77d177b229f1eb5c90762c9a346918b27c511d"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "84d90351674b8d3f352ed6ab3c091b5879cf375fe3083d8ec5c9305b3c61515f"
                  },
                  "tagName": "g",
                  "textHash": "b0ca0e6675144911967865232d77d177b229f1eb5c90762c9a346918b27c511d"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "84d90351674b8d3f352ed6ab3c091b5879cf375fe3083d8ec5c9305b3c61515f"
                  },
                  "tagName": "g",
                  "textHash": "b0ca0e6675144911967865232d77d177b229f1eb5c90762c9a346918b27c511d"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "3d9dd6e9b9f07f11985492dc1c8ebce6e76eb9b0b7752a37d718078720814983"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "88c74346403aecb955c36bf4f242cc1b133a12965eb92c658303673aeaea1465",
            "phase": "clamp",
            "publicStateHash": "0113299dd2e4cbf0cccb5981b96f8e22de9fef654e4aab4c719028a5b2b0d1e9",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "4e4e9c2b4e702026116a06ac3bc867ea44724ed0c6cff81ca655d4e80be62e4f",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "f6ed8470183eb8e269b79b87256ff28d6053b2ef5e4e6fe928d912e9fd2b2f2f"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "1be83706e4e297f04486029c9d62c63af67099beeaaac8fccee1a7fc6b9a266e",
            "phase": "expand",
            "publicStateHash": "2094f19c66360240dbaad24080b814cd5fdad8d1043cac8ff277f727568c3579",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/6\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=6|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "a7aaac3637514f8a73b99e62e94f73017d13115bf4b1b98f9b92ee478932210a",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "7eb02af80b5324abe2c71e10d9a2883ad1ab52e845b30c4c1112db3e1f71cfd1"
                  },
                  "tagName": "g",
                  "textHash": "c41c6bbd76b8d5da136d0f4af68a7e538e1b641ec12f6cef4a9f3f32e1b45401"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "7eb02af80b5324abe2c71e10d9a2883ad1ab52e845b30c4c1112db3e1f71cfd1"
                  },
                  "tagName": "g",
                  "textHash": "c41c6bbd76b8d5da136d0f4af68a7e538e1b641ec12f6cef4a9f3f32e1b45401"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "7eb02af80b5324abe2c71e10d9a2883ad1ab52e845b30c4c1112db3e1f71cfd1"
                  },
                  "tagName": "g",
                  "textHash": "c41c6bbd76b8d5da136d0f4af68a7e538e1b641ec12f6cef4a9f3f32e1b45401"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "4"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "2d2429c41de6b2ed8873c7e296769888bbf9df0d049d5f25377e5a610246a763"
                  },
                  "tagName": "g",
                  "textHash": "e26f876d4ad3abedc6742ffb3bfe7d3df7b3a0eec577c8097c6278eec833b7cf"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "89692fb0a4096f0c1915ead174ced98495c1b19198249eb0d2d89293ddbbc12d"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "firstNumerator",
              "descriptor": {
                "controlId": "firstNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 1,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "firstDenominator",
              "descriptor": {
                "controlId": "firstDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 2
            },
            {
              "controlId": "secondNumerator",
              "descriptor": {
                "controlId": "secondNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 2,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "secondDenominator",
              "descriptor": {
                "controlId": "secondDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 3
            },
            {
              "controlId": "thirdNumerator",
              "descriptor": {
                "controlId": "thirdNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 3,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "thirdDenominator",
              "descriptor": {
                "controlId": "thirdDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 4
            }
          ],
          "controlsHash": "7973050bc13471f259502b86ba5d8bcaed6f6ad6c5f4ac321e5829bedc6c7a56",
          "publicStateHash": "8983fed29103459622577ebc6cafc5fe532090b29f28cb6fd5358b948987ae25",
          "rawSerializedPublicState": "{\"operation\":\"add\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
          "resetClickCount": 1,
          "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
          "stateSignatureHash": "d0e2fce4c42316e487b1a11b49b610c29436c13649683386496150ece9177ef2",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "604d3e5ae8d08284f08d873f97e7679c90ab61d5a9666b01f5c9d68094ef333b"
        }
      },
      "domainId": "proper-fractions-v1",
      "labId": "p5-fractions-operations",
      "modeId": "three",
      "modePreparation": [
        {
          "groupId": "operation",
          "modeId": "subtract"
        },
        {
          "groupId": "term-count",
          "modeId": "three"
        }
      ],
      "planHash": "fa70f6ce7dd0a7bb14beee031d9945e8d19c87572b402508e4bc8422ce129bc8",
      "projectionMatrixHash": "5f8f55841de2f31f11f0e44a51d6ecd164b7ec53498e883170e29ead753b2bbf",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p5-first-proper-fraction",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "10bcaf580ba520d383a0ee6e62bba3779a14f02af733b6cc5db0b80309641b28",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed",
              "f68c058b221bdb725f54d7de97ec714572035d8b3780cc2e5a232664be9cdf90",
              "928135ed9fc6ab11e7154457df52427561adc89c7d46d8639047a025016e8534",
              "aab392055d216d88c54588206177f7c0171480342f1fa75088bfdc8ba0e37ee0",
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed"
            ],
            "projectionHashesHash": "b2e66b3dabed6c538d91ed21d40a983c32bcbe06c6deddf26c1627059dcb3360",
            "topologyHash": "410818c88f4e61baf593a47f39bf0097f722aac3035aeaa540f499462aa5933d",
            "totalElementCount": 360
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "931c62835c25adcb643bd05bf58ba76e7c29a52e2bab820efa9a74d797599d35",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a",
              "29bedd3ea1b61087f9d7ecea1492eb70f37bf5044408767f9047593b5e1fc646",
              "386ab8b680aea673247ffa64a5674e5d8ae8091f8f2d3c3f558cfc6e398a6c70",
              "0a01401606989a495945bbce82ac8d390cb0b1d729d20ebe89d90504615ca7b3",
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a"
            ],
            "projectionHashesHash": "1fc924decb7b4e58d4eb406510f7775730264de552e78b9a185695402d315517",
            "topologyHash": "391602ac5dca98075ae14c3c367764d124ca08834d633d1fdfb95dcad1b02384",
            "totalElementCount": 360
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "cb337712b3cae558e568216e15fa75e308418975afc4b794c1dc4527707be961",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491",
              "732d00d937438fcc62b3b2dc64c9d6ee2d8ebddc853e45c19720520a54d5e43e",
              "420231233948700fac683aab3fb59dd8bee4857e2c1cea767cac569a06d93bc9",
              "3ecf3e2f34ef8cbcb378866c652f428867a0d9e0f96b5d7369e90463564b4ac4",
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491"
            ],
            "projectionHashesHash": "aac15c3468fbf6cfbc21dcb70b1d5e9d901bfd543f3662b34dd479637dcbe9d0",
            "topologyHash": "2acd8743c0d429e87142ad341b1f0cfcdc349856960b1cda8ca5d11704104e48",
            "totalElementCount": 360
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "dceb155a0482ffc45d2b9ce5accb1f4c26868f116892e72e04dd5056bda71a17",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7",
              "94cfc6532c80aca7eb74dda7002f82fc25e28a96abe32d22d22926f701591e96",
              "d67fca2652718c0e8731e19f427f247d9dafd2f87e1f8c35f891237214a8ef96",
              "9e1198e8643133b51536dbe18c09d394562a37aa17957cebdc409650dcce4036",
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7"
            ],
            "projectionHashesHash": "3f430ebc3d3fa657e07eb6001b0cc3ce731e81f4f46eed77fb4df9d534b9e97f",
            "topologyHash": "dab1efbe414f8f1f50055f35f528b6aa02aa9cf5047dd172054db7ea6cdcf8e1",
            "totalElementCount": 360
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "38278aef51241909f836afebd69445504d0534898946e81236e8018dc9fec532",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e",
              "223b2bc8a5dabb7ad88e672a6e4d8b430992bf914eefd1525d3dcb6577cbef9a",
              "86b0f263c34e17fad5212ea40fe06d45c5b6e10f69bfc407c1b49e8863505cf5",
              "3b3ff3fb40ad5a057d71110c44e460ca179190f5a2b0ce231262c7b8870b7df8",
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e"
            ],
            "projectionHashesHash": "56eaff2fbf782bb8f5502b5522229ce6d1e1daee47bde4c408ae153fbdf99adb",
            "topologyHash": "adae5f3089e3e3c4963bb1bcfc5421e14e7be226cb5ad1c4dbb68a3cbc174ef6",
            "totalElementCount": 360
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "33b9e922a2fc5363a65b92fb617c5e075281ab55e85658ff71cec733e56056d0",
            "elementCounts": [
              72,
              72,
              72,
              72,
              72
            ],
            "elementCountsHash": "c5c1ae4f7d1cfa5c3911d4a7f6a12892db0d0ab28b560a03eed0020a1a3b4849",
            "projectionCount": 5,
            "projectionHashes": [
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada",
              "10f0f4e2dc783dcecfe48c6033496de9b43fe65f7ade8c3ad6108bbdced362ae",
              "618bf7cfe6b9a9c47795a62828e5fd727983ce78555537114dc894949c42aea0",
              "a40aa85cc90e2f2cd08c782f8dd244eb40f2b96d1224983ad072c017b27e28b8",
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada"
            ],
            "projectionHashesHash": "065677179fdfff00f8a91717682e7e7d8ad035173c34bbb386e8ee290d21c118",
            "topologyHash": "81af5c30b90b9abff6fc3fd4073693529f4db3286dc4eb8bbab4bfdfa55b7a52",
            "totalElementCount": 360
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "aff721822eeaf29ba30defb44b476f91b47308b364f02522544b68e298db1cb8",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 5
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "7d3885648f739165b2aea8f5c87e18964e32469e0d17bc61d6f38b802bef2e1e",
            "phase": "pre",
            "publicStateHash": "2a3367435c3200bbc330a66b47e59ac571e6564e47c9849e5ba74502f26c0a38",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"5/6\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=5|secondDenominator=6|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "9029050074da05ed80e5b21e27f0add22fc98a3fab91b57f5596aed974784a33",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "b140e3da3f1b2ee4db99a54790d1bd273b1f0b2f4f7021adf771bef3e991cba7"
                  },
                  "tagName": "g",
                  "textHash": "81563b8c2d41e183d9d589a946f090292340c05e3a80892de0df4d17c325fd67"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "b140e3da3f1b2ee4db99a54790d1bd273b1f0b2f4f7021adf771bef3e991cba7"
                  },
                  "tagName": "g",
                  "textHash": "81563b8c2d41e183d9d589a946f090292340c05e3a80892de0df4d17c325fd67"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "10"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "b140e3da3f1b2ee4db99a54790d1bd273b1f0b2f4f7021adf771bef3e991cba7"
                  },
                  "tagName": "g",
                  "textHash": "81563b8c2d41e183d9d589a946f090292340c05e3a80892de0df4d17c325fd67"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "733b3303ce313f5ba15840982f1dc0e3057682234c8f7a493ac4d8299114c20d"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "59c9f5859dce30a513b25be6f3631157981e3af5766a91b0064ae7e5028ec64d",
            "phase": "clamp",
            "publicStateHash": "1e1535c40ba0ac7281cb24630df91db544905bfb810e65ac6e6ff0da8839ee47",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/2\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=2|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "c01fc6ab49b1c56e921f74eac7cec948de86fcfdf572de4c8a19b24811e660ec",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "045d3e1fc86f4af1219e0d480fe42f80e2f6bcf64af818db7c4ef7bf87299077"
                  },
                  "tagName": "g",
                  "textHash": "31a679d67bafcfc75008e79d8136c3a9f7ca8cb5414fe5545722a7f11399eb6f"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "60cdc62b6dc7fcd745c23b62baa03fd0edff95df516b627fc653aeef92453fe3"
                  },
                  "tagName": "g",
                  "textHash": "48434767993244a651845bceb9d2a591ae4622e5eaa8e7a58fc5a5132eb48b4e"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "12c32a144bd4b7e0e6d90aff3b4c893f1d136225d0ed8147d35afc2fe72ba10f"
                  },
                  "tagName": "g",
                  "textHash": "5b1938f89f995e1087b21475797eb8a0f184961ee47eaaea53a8595d9f880aea"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "045d3e1fc86f4af1219e0d480fe42f80e2f6bcf64af818db7c4ef7bf87299077"
                  },
                  "tagName": "g",
                  "textHash": "31a679d67bafcfc75008e79d8136c3a9f7ca8cb5414fe5545722a7f11399eb6f"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "60cdc62b6dc7fcd745c23b62baa03fd0edff95df516b627fc653aeef92453fe3"
                  },
                  "tagName": "g",
                  "textHash": "48434767993244a651845bceb9d2a591ae4622e5eaa8e7a58fc5a5132eb48b4e"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "12c32a144bd4b7e0e6d90aff3b4c893f1d136225d0ed8147d35afc2fe72ba10f"
                  },
                  "tagName": "g",
                  "textHash": "5b1938f89f995e1087b21475797eb8a0f184961ee47eaaea53a8595d9f880aea"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "045d3e1fc86f4af1219e0d480fe42f80e2f6bcf64af818db7c4ef7bf87299077"
                  },
                  "tagName": "g",
                  "textHash": "31a679d67bafcfc75008e79d8136c3a9f7ca8cb5414fe5545722a7f11399eb6f"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "60cdc62b6dc7fcd745c23b62baa03fd0edff95df516b627fc653aeef92453fe3"
                  },
                  "tagName": "g",
                  "textHash": "48434767993244a651845bceb9d2a591ae4622e5eaa8e7a58fc5a5132eb48b4e"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "4"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 8,
                    "hash": "12c32a144bd4b7e0e6d90aff3b4c893f1d136225d0ed8147d35afc2fe72ba10f"
                  },
                  "tagName": "g",
                  "textHash": "5b1938f89f995e1087b21475797eb8a0f184961ee47eaaea53a8595d9f880aea"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "834060a721ff80feb02e2f72c80b1cca4fb50b5ebe9c34e3c88209404c236bc2"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 3,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "3df5e47e9063e54dcfdf2b175dadc5bcc57605fc3be15826ca2d23adf2c8aee1",
            "phase": "expand",
            "publicStateHash": "84e0752b26b09b483252ca3dcb100f0ba43845dc3fe0c930b6519bfef557ed37",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/6\",\"thirdFraction\":\"1/4\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=6|thirdNumerator=1|thirdDenominator=4",
            "stateSignatureHash": "0133fd46adbb1d3e3d690219c2c52bdd85e1de2e6c27d1e87948d937b30ad485",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "5d7b411b7c9b14a3aab75fb0583a1400ad337d4123c6de2576bbc30d05762d2f"
                  },
                  "tagName": "g",
                  "textHash": "8c1be11f8f66531b73a87adf8870ccc5c820fbb2491bb87117e23584e3766fd7"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "5d7b411b7c9b14a3aab75fb0583a1400ad337d4123c6de2576bbc30d05762d2f"
                  },
                  "tagName": "g",
                  "textHash": "8c1be11f8f66531b73a87adf8870ccc5c820fbb2491bb87117e23584e3766fd7"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "6"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 15,
                    "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                  },
                  "tagName": "g",
                  "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "5d7b411b7c9b14a3aab75fb0583a1400ad337d4123c6de2576bbc30d05762d2f"
                  },
                  "tagName": "g",
                  "textHash": "8c1be11f8f66531b73a87adf8870ccc5c820fbb2491bb87117e23584e3766fd7"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "12"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "4"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 16,
                    "hash": "8bb7e933196251e6d476400cf218d990145541ec7ea168118055322c1a7d174c"
                  },
                  "tagName": "g",
                  "textHash": "ba15ae5c262ea283ade7d39edccf60d62a2a767d5d56be020fc46bd510f17539"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "6970cbf7cf496a0ef4f8f4fd8ec2deaa1d9d7af7aa4f91f2e1f67051c566dec9"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "firstNumerator",
              "descriptor": {
                "controlId": "firstNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 1,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "firstDenominator",
              "descriptor": {
                "controlId": "firstDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 2
            },
            {
              "controlId": "secondNumerator",
              "descriptor": {
                "controlId": "secondNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 2,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "secondDenominator",
              "descriptor": {
                "controlId": "secondDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 3
            },
            {
              "controlId": "thirdNumerator",
              "descriptor": {
                "controlId": "thirdNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 3,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "thirdDenominator",
              "descriptor": {
                "controlId": "thirdDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 4
            }
          ],
          "controlsHash": "17bb97ae1286f825a88e4c2972e3fd8eb99ed7ca5ab7ef1bb4a0913bb992da01",
          "publicStateHash": "41d766f6110b539e20f6fa7f7359faafaa13bd4ad2e0d9d67609f3737560477b",
          "rawSerializedPublicState": "{\"operation\":\"add\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
          "resetClickCount": 1,
          "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
          "stateSignatureHash": "806f428c41155c069cc7cf78cf5c247ba8c2bc42bc9836d770ace53a4506c5cb",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "dcb4b85e2cc1fec0a5d82f7378fa06e47bee5a1062751aa01423dc173bc72e1c"
        }
      },
      "domainId": "proper-fractions-v1",
      "labId": "p5-fractions-operations",
      "modeId": "three",
      "modePreparation": [
        {
          "groupId": "operation",
          "modeId": "subtract"
        },
        {
          "groupId": "term-count",
          "modeId": "three"
        }
      ],
      "planHash": "928a266ad54c4e3a1c660633dea9ec85c946526bb2dfc4bc54c02ff75ffc78e1",
      "projectionMatrixHash": "9c7abb27bf5ea1a482af9cc09fa0d4a71a27345147f76850b0dfa3c33247f04e",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p5-second-proper-fraction",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "97485124f96d02b04ca82660f2ff51399312e130afa285742ec429169f62e7ac",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed",
              "b1c03ed009337e7beeb42e3e92ebee2dc3012b3762b40b6a52b60d634745ea30",
              "d7633b1cc6d0f7078fd70acebe676bd3899eec05d5926ad5144f239f50d599a1",
              "6881c0cf7b33552b1237ec8b52a58fb3a42e713647412028c1fdb53fe9277268",
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed"
            ],
            "projectionHashesHash": "3116f4dc4916a646444cd81a548733f94cebcb51e077528ec215389176306b2a",
            "topologyHash": "39bdbf76f87f3e7f9ec00e264381c1d4ee802e6e4a439055db4f8e43e38f540c",
            "totalElementCount": 336
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "85d3a975e4bc891091d7558ef776653b66dc9f274079f65bf932ad6d94ff9331",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a",
              "7ba7cd858f18fa82af0122bf473b877f9dd7b24da29256e706a3d03c2975cb93",
              "4f8f837bf31f2708eb2c45922386cf3206420f35524ce6d5259340034efe2e2b",
              "e85aad955207b715caae7b7a20a09fe3490e22a1a04b4cf0bfbbc4070721e53a",
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a"
            ],
            "projectionHashesHash": "1c45edf4298916109f5f7d7cad31adb92e3040f954ff9a4844bd18d8a1206591",
            "topologyHash": "5074aee50955bb7db2fab24d846edd7255ccc36332b0e3bbfd5535265484f781",
            "totalElementCount": 336
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "2b9835114f4c38d2997bb88bc334ec723da7d1f378af81ea0848ab944be55610",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491",
              "d3bd401edf1a369984aff8ee1110c1bf842df99d80415e847da7b31b313ae43c",
              "033499265c1bab2811dbf57df605ad6578427b237482f60c0bdf7deef2e01078",
              "576969007032f95d7a5d07d3020784c3740754b45e09748b1e885b189e0b18f2",
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491"
            ],
            "projectionHashesHash": "2a1cee3b61f9006f142a4049f15131d315dd12981ad9a506f69cedbd1f7f8f9e",
            "topologyHash": "c8491d42c19581d99ae3109d3c3a01841776963df51fbd178a26e358d08fbf97",
            "totalElementCount": 336
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "359f0a346956ff4688acaba36762e22a95acfab25f3790522b6198d0b9b8638a",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7",
              "dec0a06c6c9953da6df737e82aa2ec4eb8c8dc0cb55aace7407aee6c874538be",
              "77ea86493042ba7839531e46d7fa4cd310fd90dffdceb9a5d623988a505dc228",
              "b41bee9de9e5f732397667d30bad8dd4817de47d9d80c4102e288dc198a6660b",
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7"
            ],
            "projectionHashesHash": "dbde125fdbdf6ad1901c7fe0469a6f92200142257ac94040241fe1e228252a51",
            "topologyHash": "768f65bf28f33a4310ad7fa370badaac890e5f02b1d748ecd2342ecd1574dc3a",
            "totalElementCount": 336
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "97ab9e16863e31605d73bc3edddb71b2a32104232bbfb26189a797dac637742e",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e",
              "178d30def7bf2d6c2674fc807b867575d66dbcdd33e44ebafd7300599f77e9aa",
              "639bb2486f782730f499bfd9d36b27445c6a0616c54968f194e79bb4824ab107",
              "c37fad8bdad75b5bc9dff2079e6b69619a8de31f2905682efb896183a93a4a01",
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e"
            ],
            "projectionHashesHash": "84cc84f22352592612b6e5136726af7f9462e84868af64c3f2ef9d6b799eb826",
            "topologyHash": "4e46fae5d561ba4f1e14fefed6011772ffc8a40988be6ed0d0c9089281426e47",
            "totalElementCount": 336
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "93e55ba7f63ceacc1c728a373352af3772a45e20c3cb9bbd47edd9607ecaa580",
            "elementCounts": [
              72,
              72,
              48,
              72,
              72
            ],
            "elementCountsHash": "daf2cb65b18b64a4dd134af266536cc383b1f13391a18652d997b420194e8923",
            "projectionCount": 5,
            "projectionHashes": [
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada",
              "eb608fd02dbd4ac2ef88ac83fcbbb028e6426193fa0fc3448e3a5f9b7dd09a06",
              "36630a8838d74b1e74417b1d571884361c3b6bcb11fdc74ca36236bceb49feca",
              "ea6635b227c5088b890f57957bf4f9ebeadaa07d7272b4d8da6bb29e96c9b257",
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada"
            ],
            "projectionHashesHash": "e01ea66346d7aec41592f238728179ee4c455bfe1dfef01692840a2d99599bd0",
            "topologyHash": "5f6cbb982cd81ccbf82f43000bef281b82c47f57d50932fb41aebfd12c3e7634",
            "totalElementCount": 336
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "5f6c0b550198d27538fdd39497fc16158e36e575ce97083754cf0b7bb75ece98",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 5
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              }
            ],
            "controlsHash": "e10dbde5f6782113f9d2153f3c6939882235f87a4f130f398e48ae4c1c402ee2",
            "phase": "pre",
            "publicStateHash": "420708e858e3fc0fdf62adc1eeb17d70b44af52309e02ae437bf7bf350235518",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"5/6\"}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=5|thirdDenominator=6",
            "stateSignatureHash": "30f5166f2261d4ccf3a9f6945f05d940c2fe2bc695ce961871d8752196d63e77",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "5"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "8d8a9e87dbbb65fcde9ac000be7be636d94fdbbb096a60d722d4468e3147372a"
                  },
                  "tagName": "g",
                  "textHash": "8bd0b2cb9003f2c605fa35d0df1b9d70a68e32a2b0f6bc7167b425670ce53367"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "5"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "8d8a9e87dbbb65fcde9ac000be7be636d94fdbbb096a60d722d4468e3147372a"
                  },
                  "tagName": "g",
                  "textHash": "8bd0b2cb9003f2c605fa35d0df1b9d70a68e32a2b0f6bc7167b425670ce53367"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "5"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "5"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "8d8a9e87dbbb65fcde9ac000be7be636d94fdbbb096a60d722d4468e3147372a"
                  },
                  "tagName": "g",
                  "textHash": "8bd0b2cb9003f2c605fa35d0df1b9d70a68e32a2b0f6bc7167b425670ce53367"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "3e05dfd2b33756db984d41267b7827620f0c2210ffda0f90af8ba01049f7163b"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              }
            ],
            "controlsHash": "a6a8fd28b6dbf70764d89b9bb06672d9868496fc006316ae06405412aa0f055b",
            "phase": "clamp",
            "publicStateHash": "63db94dc548f0b55b0576feb3fad7b4e466e7bd89537fa35af9d4a29a9c4c057",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/2\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=2",
            "stateSignatureHash": "7211f4b7580edb4f2c6029bd6880d1846881d21dda9d317d6cf1ffa971159aad",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "9880cc837f411d1e0a912d3a016c6edce123d4bcc89fe04de3c29c96ff74615d"
                  },
                  "tagName": "g",
                  "textHash": "37fbddff6eb6980def24bd2deac19ff9b718753c5758e53eaa9ed4f5a5b10dfb"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "9880cc837f411d1e0a912d3a016c6edce123d4bcc89fe04de3c29c96ff74615d"
                  },
                  "tagName": "g",
                  "textHash": "37fbddff6eb6980def24bd2deac19ff9b718753c5758e53eaa9ed4f5a5b10dfb"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "9880cc837f411d1e0a912d3a016c6edce123d4bcc89fe04de3c29c96ff74615d"
                  },
                  "tagName": "g",
                  "textHash": "37fbddff6eb6980def24bd2deac19ff9b718753c5758e53eaa9ed4f5a5b10dfb"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "00daba5149287142c5db75d9be22f5467ee4beaf31526aa683cd2f80e71bc6be"
          },
          {
            "controls": [
              {
                "controlId": "firstNumerator",
                "descriptor": {
                  "controlId": "firstNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "firstDenominator",
                "descriptor": {
                  "controlId": "firstDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 2
              },
              {
                "controlId": "secondNumerator",
                "descriptor": {
                  "controlId": "secondNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 2,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "secondDenominator",
                "descriptor": {
                  "controlId": "secondDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 3
              },
              {
                "controlId": "thirdNumerator",
                "descriptor": {
                  "controlId": "thirdNumerator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 0,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 1
              },
              {
                "controlId": "thirdDenominator",
                "descriptor": {
                  "controlId": "thirdDenominator",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 6,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "proper-fractions-v1"
                },
                "value": 6
              }
            ],
            "controlsHash": "9199e02991239d01181d1f77aabad9a6b9acbda7cc7c944b2db13254da2d54e9",
            "phase": "expand",
            "publicStateHash": "fddb826ee513a3883b454a7a1295eb968c9dd11ad4eee1c7ca341c804f8707fd",
            "rawSerializedPublicState": "{\"operation\":\"subtract\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/6\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=6",
            "stateSignatureHash": "8ce31649a331e7e4150ed3857d4f009079431a3a4717afc6dab3932e966a5880",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "cc19673636e908e44ddbf1411386fbdf447696387a8bb6a7b4fc0cf685ec6ad1"
                  },
                  "tagName": "g",
                  "textHash": "41ad512ad62679e78782d0e2414cd00d055041f27a954733df5303c6ac67f774"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "cc19673636e908e44ddbf1411386fbdf447696387a8bb6a7b4fc0cf685ec6ad1"
                  },
                  "tagName": "g",
                  "textHash": "41ad512ad62679e78782d0e2414cd00d055041f27a954733df5303c6ac67f774"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "3"
                    ],
                    [
                      "data-viz-denominator",
                      "2"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 9,
                    "hash": "c568ae3bcf2cdb9ea93ffde63eb98ac89bdeee886654af0e2b91f97cf8e27e6f"
                  },
                  "tagName": "g",
                  "textHash": "832a3cbe38a93c1e762c4146c50f0be9461d7d9faf6c2c22c6cfc7b9454ec3be"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "2"
                    ],
                    [
                      "data-viz-denominator",
                      "3"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "535dfa862dac0cee94bcab13b2869918d3e02f45eea5f4e35568015b6ceff4c0"
                  },
                  "tagName": "g",
                  "textHash": "2af8ed8bcf79c1707c9fd3d1f4496b70854b89f152b3aee0a0ae1ab87fac3491"
                },
                {
                  "attributes": [
                    [
                      "data-viz-common-denominator",
                      "6"
                    ],
                    [
                      "data-viz-common-numerator",
                      "1"
                    ],
                    [
                      "data-viz-denominator",
                      "6"
                    ],
                    [
                      "data-viz-name",
                      "source-fraction-bar"
                    ],
                    [
                      "data-viz-numerator",
                      "1"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 10,
                    "hash": "cc19673636e908e44ddbf1411386fbdf447696387a8bb6a7b4fc0cf685ec6ad1"
                  },
                  "tagName": "g",
                  "textHash": "41ad512ad62679e78782d0e2414cd00d055041f27a954733df5303c6ac67f774"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "7d59cae1d898c38d3c883614cbb793c351095890b798515155e497e693c209d4"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "firstNumerator",
              "descriptor": {
                "controlId": "firstNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 1,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "firstDenominator",
              "descriptor": {
                "controlId": "firstDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 2
            },
            {
              "controlId": "secondNumerator",
              "descriptor": {
                "controlId": "secondNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 2,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "secondDenominator",
              "descriptor": {
                "controlId": "secondDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 3
            },
            {
              "controlId": "thirdNumerator",
              "descriptor": {
                "controlId": "thirdNumerator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 3,
                "minimum": 0,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 1
            },
            {
              "controlId": "thirdDenominator",
              "descriptor": {
                "controlId": "thirdDenominator",
                "enabled": true,
                "excludedValues": [],
                "maximum": 6,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "proper-fractions-v1"
              },
              "value": 4
            }
          ],
          "controlsHash": "7a1999f00625f651037eb50b5b7385d49c94edac111cb4112c63075aec27e95e",
          "publicStateHash": "9d3f7dfeefb870ceec3d856278b305e9a1d69d0a69924bb10597d4adc2232f53",
          "rawSerializedPublicState": "{\"operation\":\"add\",\"termCount\":\"three\",\"firstFraction\":\"1/2\",\"secondFraction\":\"1/3\",\"thirdFraction\":\"1/4\"}",
          "resetClickCount": 1,
          "stateSignature": "firstNumerator=1|firstDenominator=2|secondNumerator=1|secondDenominator=3|thirdNumerator=1|thirdDenominator=4",
          "stateSignatureHash": "be9a8a35bbd4614bb8bef7085c04115b8f7e790ad73672bd0facafaab1c1cf1e",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "6"
                  ],
                  [
                    "data-viz-denominator",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 15,
                  "hash": "fe8ef4a08b942f2a16edd290cfa54b999180e3731e4cb3b2898f286faba3ddca"
                },
                "tagName": "g",
                "textHash": "3cf8fcef44a167953ac9877e8616fefcc06e38c628a62aa3459dc0736ac0f717"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "4"
                  ],
                  [
                    "data-viz-denominator",
                    "3"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "eadf3248e7c2343eff9e2842e2ce30cc493522664483f0b14c01397cd9843b22"
                },
                "tagName": "g",
                "textHash": "9a321c3fc14aada2b1fd3510fec069cf5e858daef95133c163038523d78ab8e5"
              },
              {
                "attributes": [
                  [
                    "data-viz-common-denominator",
                    "12"
                  ],
                  [
                    "data-viz-common-numerator",
                    "3"
                  ],
                  [
                    "data-viz-denominator",
                    "4"
                  ],
                  [
                    "data-viz-name",
                    "source-fraction-bar"
                  ],
                  [
                    "data-viz-numerator",
                    "1"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 16,
                  "hash": "d8629926fe4421fb62b9ee18e2dfdf6f3326258df56a352bf44b85434c85ee76"
                },
                "tagName": "g",
                "textHash": "d4633b869f1cd0795fb0808fa8cf44588fbbb749a97f419f5970aafc9377c9c9"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "d34e72d07c9b545e75071ebb06bd65ca89b2d27cc20c144a8446210b2c109dcf"
        }
      },
      "domainId": "proper-fractions-v1",
      "labId": "p5-fractions-operations",
      "modeId": "three",
      "modePreparation": [
        {
          "groupId": "operation",
          "modeId": "subtract"
        },
        {
          "groupId": "term-count",
          "modeId": "three"
        }
      ],
      "planHash": "be10a24e1c0eb230b20089d971a24a73200fe59e60e74e681d7d1bf962e1ab8a",
      "projectionMatrixHash": "a5eacee94cc13cdd7b7de97b54fa147ccb00bf5920366d667e5247ebbdfcc6b9",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p5-third-proper-fraction",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "12cbb2465248d93bfbd79d03e89ac38d35ae2409e333a479a7788ac839403bd7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "1cc5ca154962e677de7c1e8d729ff7dc1514f5ea7d4cf279ec1518955a01b8de",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed",
              "e150c253ff2fb738b5abae25b003e6e52b2fa7bbff59cabe33645beb1cfe3baf",
              "141084a654a1587c8462fa9b775c53bda07fa88a9c8d223d520824c1fc806f7b",
              "8e3d556c52ecf6f5425c6970b748c99adeadfc3c1401963f9c8204cebaad1125",
              "2a9e607ca7c7173d73475e57e3e1f6202d2840f68ccf88aa47c9df82ff8d31ed"
            ],
            "projectionHashesHash": "5625129d583095040a5cc5f0df6e851e76916cb3142a3edf47165f66f56aeb67",
            "topologyHash": "8bb49d3702e4ea524de08ee7639472a6b84c3bf5ddabda1af6cb9f0f6f2c40be",
            "totalElementCount": 306
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "b765b572cfccf3e534351a8c475bebfe0be74f4e69a3e81613401da87ecd4c34",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "a7323ba1fd6015d0e94ef8aacd4e5cd628745bbd9c9e332674645e86c23d431a",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a",
              "b987dd81882c3016bc639d1479b8c7843487866db1196d3c0d632a3b4459dd99",
              "e282bdb31abf254abc51fa40047b55ff00d3d8842cd2cade8b4f293ecd5294b1",
              "bc96db98f0fcf45307a5d9ef4624a4da72c1392b0f80629978c29c1bef37fff0",
              "f4249fd7b851c14df319337a378d242bb62abd7fea476ef5fabd2de7365e605a"
            ],
            "projectionHashesHash": "c01096b57554817454bbcf461d63536ecff220416493e35bb4389572299470ea",
            "topologyHash": "030d93ad317fa3622789651b29cd47676c73206f97fb87d2c702e0651b4fdb83",
            "totalElementCount": 306
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "4feb62b1de57f065133e12d5149684919460aab3fd42f8a5dcc6aa74b3dd213c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "195834adc36ccd7781a46b5281adda3f45e8dcbc537288c75decf3462e3bba11",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491",
              "26cbc0aeda0ef2e5287161a93003412650a8a2f210af3e77c6055fbfaf20a78a",
              "a52d7fb95cb06d87a1d7a7e998362f8d179be058e007b73846db378ac50e75d2",
              "4a621ebf4700a9295928ef7a2abae426ce557a1fb261fd43cf611128e4f3bcb6",
              "5797f8111e84a35c0acf8d7d32f50b9dd2e6e5a4e1254fcbe21362713631d491"
            ],
            "projectionHashesHash": "62d7041f1ca0fa8b30e8ea29b8754c7d8551d515aac79820ea946b7de924c2b8",
            "topologyHash": "0d87d54f7eb8dfe5b33b71b6943c7bf7f4f3e5dbd30e61a751e592aff767fd1d",
            "totalElementCount": 306
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "3c3d1e6d77d766bb65d4d97385a4ea83585cab7c25386165dbd4dbb4e75b3452",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "bd14685fa4b3d61894a2d011680abee32175df0d52c972256898ce85754e8150",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7",
              "2df930fd94871be5265147509ae5a5aa9ee3f614edbb607415d650723e11d232",
              "9c505807833c21129bd8a9d0919133381a7505032c0105d5cf3487db7d1d2e9d",
              "6efac8176301144bb1aa982f28a2e47aff367d3baaccf827b179adf094e5440a",
              "a37ce8d17172a87672a55a9c359be0a000e079c1e786a02d5682135d278e2bb7"
            ],
            "projectionHashesHash": "20caedc4329561642da9b629c327b5b140166cf9538aaec17e0f0bd36dba284d",
            "topologyHash": "5ff10b0ec4b8660ce4a393aac0b33a2aee6c8e9e07809302ba62a5d66645d87b",
            "totalElementCount": 306
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 172,
                "hash": "228305d3f4e60cbe4ca208b0178b2c7db3e97cab84f4f245c733fbcc0b51ffad",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "eb73117c3d132e9fda4036a07e4aeeb2a280a58843f24e538581be2da911efe4",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e",
              "f322fa25673390b3d00132001f2755916e5b04e236cd7819ebc510d8c0c9ae89",
              "d91af7b52cc6c7dc9c7a64473722ed54f51d3a9c5c597f4d5b111fab83e6fa9b",
              "f25f2248fb767a793c6274fd945f819b4e500e45cc77ef3c6b8b166a6899e38b",
              "73ed66d8ae32a3867facdcd284c2131eb90198b7069b869419414812f67fa23e"
            ],
            "projectionHashesHash": "49cd389e4407a5baa217abf17e26e6d2de8cb845dc3b3efe07270058283bb266",
            "topologyHash": "c48a8ffc37a0b627e374644a0d7763f5fb628bdc982f885ec4cc2fd70a7eb399",
            "totalElementCount": 306
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              },
              {
                "chainCount": 56,
                "contractCount": 4,
                "entryCount": 168,
                "hash": "1e667e9b6a20d36248a9363be48d893d54770494dc83818ddde15a9e2ded8219",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 12
              }
            ],
            "ancestryScaleSummariesHash": "524c64afeaeec4f1bf52811d1368974a6bdfb0acddf7b4ae3a74e915601d8c99",
            "elementCounts": [
              72,
              54,
              54,
              54,
              72
            ],
            "elementCountsHash": "ea778ebd444ba0516b15824ae875e5579c16f96154ac6e70181f895e2dbad392",
            "projectionCount": 5,
            "projectionHashes": [
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada",
              "c336c89cc417eaf43f4cd352f6b969b13c37a82b001719ca43e246913c141964",
              "689bc632c28daef94bf5426c7f30115e4102dd3a81fd23871e6876e2867666ad",
              "2453f34e62791eeb001ed01eaea178caf3a9bb4eb850ae0d2a930b4cfecde517",
              "33f11a2dec302a6231bc3e4d494ee91a01c3a6835a5bc7d637f12b70920d1ada"
            ],
            "projectionHashesHash": "a5fda8c4300d29380c693f60413f6a6cd68a66eae24cccb1b5c3b86ff42cdea1",
            "topologyHash": "f2632d8fbda0c522ec4d2f74b17714690bc9a128d9f95bb658a67921e2e8c647",
            "totalElementCount": 306
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "6058002ffa8c0815c2a2cc4b1fd8b69442dcfaf69f55b76905f740a2ae1a64d2",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "length",
                "descriptor": {
                  "controlId": "length",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              },
              {
                "controlId": "width",
                "descriptor": {
                  "controlId": "width",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 3
              },
              {
                "controlId": "height",
                "descriptor": {
                  "controlId": "height",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              },
              {
                "controlId": "visibleLayers",
                "descriptor": {
                  "controlId": "visibleLayers",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              }
            ],
            "controlsHash": "092a0091ea1b193dee641d1df65422c4649cd710f519f90517ee352743d5cfba",
            "phase": "pre",
            "publicStateHash": "60d86edada407eadae8f7f5b001090c8636c824e6ed78ba96dba51c8155594bc",
            "rawSerializedPublicState": "{\"length\":4,\"width\":3,\"height\":4,\"visibleLayers\":4}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "length=4|width=3|height=4|visibleLayers=4",
            "stateSignatureHash": "0465e2125cac74517f67f891440f018415f6b727262c549be6ab5b9c64a0c4d1",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "4"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 241,
                    "hash": "58c635e73243505ed207ae7405f740c8a417812360f3e06fc8be887ec850910c"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "4"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 241,
                    "hash": "58c635e73243505ed207ae7405f740c8a417812360f3e06fc8be887ec850910c"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "4"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 241,
                    "hash": "58c635e73243505ed207ae7405f740c8a417812360f3e06fc8be887ec850910c"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "8e39afbb06aa4e4d421576b59a9a6a321ab3a3458d7b4110991c1598afa51638"
          },
          {
            "controls": [
              {
                "controlId": "length",
                "descriptor": {
                  "controlId": "length",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              },
              {
                "controlId": "width",
                "descriptor": {
                  "controlId": "width",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 3
              },
              {
                "controlId": "height",
                "descriptor": {
                  "controlId": "height",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 1
              },
              {
                "controlId": "visibleLayers",
                "descriptor": {
                  "controlId": "visibleLayers",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 1,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "92156e3ec81b5558561056c4fbcb29e67f3c028f11894e2faaf3536de8c10c40",
            "phase": "clamp",
            "publicStateHash": "88d0458759666665a122115f5917a5dc1c9ec126a7bb3491221a99958cce5f80",
            "rawSerializedPublicState": "{\"length\":4,\"width\":3,\"height\":1,\"visibleLayers\":1}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "length=4|width=3|height=1|visibleLayers=1",
            "stateSignatureHash": "e11ea3a3022866b7184688e3857793291f20f0c1a47a62ff541923d0b8dcc6e6",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "1"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "12"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "01ce1ea02d7ec5d55115d80df85ac6f9bfdeac4daf1dfcc3fd99bb6702c232fd"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "1"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "12"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "01ce1ea02d7ec5d55115d80df85ac6f9bfdeac4daf1dfcc3fd99bb6702c232fd"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "1"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "12"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "01ce1ea02d7ec5d55115d80df85ac6f9bfdeac4daf1dfcc3fd99bb6702c232fd"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "63f58ad5acc3af0a03f538f85a4dbf57fd9e8a6ffd764c53b5bb613b225e26f7"
          },
          {
            "controls": [
              {
                "controlId": "length",
                "descriptor": {
                  "controlId": "length",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 5,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              },
              {
                "controlId": "width",
                "descriptor": {
                  "controlId": "width",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 3
              },
              {
                "controlId": "height",
                "descriptor": {
                  "controlId": "height",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 4
              },
              {
                "controlId": "visibleLayers",
                "descriptor": {
                  "controlId": "visibleLayers",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 4,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "visible-layers-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "7948c46af4c82fa42e64496603d2e4c3458783c8fac73c0bf93206ff0ab69ca2",
            "phase": "expand",
            "publicStateHash": "5437d56393b236103a0bae35951da11c2d7e24b37fcd293ef5cbb1cca3186912",
            "rawSerializedPublicState": "{\"length\":4,\"width\":3,\"height\":4,\"visibleLayers\":1}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "length=4|width=3|height=4|visibleLayers=1",
            "stateSignatureHash": "384bedcfccd983b9f79b0d0f843235338820ad43d23128021fe6846947c68158",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "3b453d73895d9fbd3cf9c2fb879ee08f4bc5ba0cecbd94b4e9173b28b1905a23"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "3b453d73895d9fbd3cf9c2fb879ee08f4bc5ba0cecbd94b4e9173b28b1905a23"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-layer-size",
                      "12"
                    ],
                    [
                      "data-viz-name",
                      "layer-stack"
                    ],
                    [
                      "data-viz-total-layers",
                      "4"
                    ],
                    [
                      "data-viz-visible-layers",
                      "1"
                    ],
                    [
                      "data-viz-volume",
                      "48"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 61,
                    "hash": "3b453d73895d9fbd3cf9c2fb879ee08f4bc5ba0cecbd94b4e9173b28b1905a23"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "8b786144f74bd23182da25b106faa69ff523f3b86ee2323d2ee8dc3f73c0f8f3"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "length",
              "descriptor": {
                "controlId": "length",
                "enabled": true,
                "excludedValues": [],
                "maximum": 5,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "visible-layers-v1"
              },
              "value": 4
            },
            {
              "controlId": "width",
              "descriptor": {
                "controlId": "width",
                "enabled": true,
                "excludedValues": [],
                "maximum": 4,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "visible-layers-v1"
              },
              "value": 3
            },
            {
              "controlId": "height",
              "descriptor": {
                "controlId": "height",
                "enabled": true,
                "excludedValues": [],
                "maximum": 4,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "visible-layers-v1"
              },
              "value": 3
            },
            {
              "controlId": "visibleLayers",
              "descriptor": {
                "controlId": "visibleLayers",
                "enabled": true,
                "excludedValues": [],
                "maximum": 3,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "visible-layers-v1"
              },
              "value": 2
            }
          ],
          "controlsHash": "58f6eeb8fb3653533af256a3d0208393be2f1b11f987a68f8b65b5ac79acff4b",
          "publicStateHash": "41baa8730e77b2af522da719ba02c868e759213d74ffdb90adb29fa836e88c07",
          "rawSerializedPublicState": "{\"length\":4,\"width\":3,\"height\":3,\"visibleLayers\":2}",
          "resetClickCount": 1,
          "stateSignature": "length=4|width=3|height=3|visibleLayers=2",
          "stateSignatureHash": "778377f7a6a147d06a7785400006c5ed004839bda5f439a63e356be46cb555dd",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-layer-size",
                    "12"
                  ],
                  [
                    "data-viz-name",
                    "layer-stack"
                  ],
                  [
                    "data-viz-total-layers",
                    "3"
                  ],
                  [
                    "data-viz-visible-layers",
                    "2"
                  ],
                  [
                    "data-viz-volume",
                    "36"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 121,
                  "hash": "34736f83c5e4f65e41caa457504d82e6e2c9c3f21461dd59ad36d842b5ca067c"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-layer-size",
                    "12"
                  ],
                  [
                    "data-viz-name",
                    "layer-stack"
                  ],
                  [
                    "data-viz-total-layers",
                    "3"
                  ],
                  [
                    "data-viz-visible-layers",
                    "2"
                  ],
                  [
                    "data-viz-volume",
                    "36"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 121,
                  "hash": "34736f83c5e4f65e41caa457504d82e6e2c9c3f21461dd59ad36d842b5ca067c"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-layer-size",
                    "12"
                  ],
                  [
                    "data-viz-name",
                    "layer-stack"
                  ],
                  [
                    "data-viz-total-layers",
                    "3"
                  ],
                  [
                    "data-viz-visible-layers",
                    "2"
                  ],
                  [
                    "data-viz-volume",
                    "36"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 121,
                  "hash": "34736f83c5e4f65e41caa457504d82e6e2c9c3f21461dd59ad36d842b5ca067c"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "f80e243b68840fa188e699589e31d1ffe9b20e1c344a16af4128899862b5b1b8"
        }
      },
      "domainId": "visible-layers-v1",
      "labId": "p5-volume",
      "modeId": "__default__",
      "modePreparation": [],
      "planHash": "b8793eaf075866f29427ab50aaff81675481fb9c31561c822548e3d6763c6dc6",
      "projectionMatrixHash": "67fe8c2620418cb0a6ae5834a272806dfe5cc5338dea7690e813c7f08d03ff11",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "p5-visible-volume-layers",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "1206076f6e5767732f44433cba269ed984adf71c372dbda8c920f0f8afc6fd8c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "1206076f6e5767732f44433cba269ed984adf71c372dbda8c920f0f8afc6fd8c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "1206076f6e5767732f44433cba269ed984adf71c372dbda8c920f0f8afc6fd8c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "1206076f6e5767732f44433cba269ed984adf71c372dbda8c920f0f8afc6fd8c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "1206076f6e5767732f44433cba269ed984adf71c372dbda8c920f0f8afc6fd8c",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "aa0ff848174c489396efd366874e24f6e4e8859664031ffa47988c8ea930a33f",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "47b9765af64e955764fdfbe2926d68e6bd65002922299ee5b82e3e3c9364120c",
              "a48098d445b8622d3cba7f9682bc1813f3953bcfc0adbfc9eca5651e9ead9947",
              "a266164e6301af31e5b40a0ca85516bf888b163dc227835e19b417a25f1f3524",
              "a8650cd776f3fd20e68e18b33e68a211564eaa99cc5c6932cc9fe06087d8a7a8",
              "47b9765af64e955764fdfbe2926d68e6bd65002922299ee5b82e3e3c9364120c"
            ],
            "projectionHashesHash": "203c619b2f95575f9faa4e9339ef9f653e08fb81780c2ac791182a5152622a1e",
            "topologyHash": "0e0ee519685495141dcff2a18355341f631a667e8dfbc312d824be0747133e59",
            "totalElementCount": 645
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "e5c9cc8895484afd06e1fd3f328dab8efe124c1d93e15866813bd2b94cff03f9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "e5c9cc8895484afd06e1fd3f328dab8efe124c1d93e15866813bd2b94cff03f9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "e5c9cc8895484afd06e1fd3f328dab8efe124c1d93e15866813bd2b94cff03f9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "e5c9cc8895484afd06e1fd3f328dab8efe124c1d93e15866813bd2b94cff03f9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "e5c9cc8895484afd06e1fd3f328dab8efe124c1d93e15866813bd2b94cff03f9",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "368daa6225110c4c5f04e80d193e3c76f3b708fb090650840384c0408ed469ef",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "deaf4a5cdb3f44d7ef3bf4c1f9b778789df852b5a6936721865150b0992f0db2",
              "f2f5c5d45e649e9bc4336d7962e5dd54f21e40c0a66f627e84549f813a7839c2",
              "1558909160bee1a0bdd33f280254544e8db31500dbe35dfed6f5cf7acfda962e",
              "c922f9a73e9fec9ec1f1cd40703c20363145b1d71a51f56ec354f1af14727a22",
              "deaf4a5cdb3f44d7ef3bf4c1f9b778789df852b5a6936721865150b0992f0db2"
            ],
            "projectionHashesHash": "0228bba47ae93d551e8c45adbfcfe6465770c244ec48bf4e9537d0427b278602",
            "topologyHash": "966352cbd115b5261009bb0eb42ce820bac4f78ad1289fdf5aea24ee6c0bd617",
            "totalElementCount": 645
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "343731f18d0683b640ba0e94323129c7aaf32422c643b7904f8ff977c3b3e3c6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "343731f18d0683b640ba0e94323129c7aaf32422c643b7904f8ff977c3b3e3c6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "343731f18d0683b640ba0e94323129c7aaf32422c643b7904f8ff977c3b3e3c6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "343731f18d0683b640ba0e94323129c7aaf32422c643b7904f8ff977c3b3e3c6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "343731f18d0683b640ba0e94323129c7aaf32422c643b7904f8ff977c3b3e3c6",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "10916f7b63120cc5bc72def4c4c02684cf4b9477478512277db296c70313c3a6",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "3f9dfe237528a8c56f64828cd7a53a9c517f80971ce70dab92f3fdff1f0cee3a",
              "24469a4c5d432eb54c3eec5f6b742ea893386b714ae0f428feb2a389599652ba",
              "294723dffdfdc7f8fe29e89ce15986a0b44c275a6d3d307e9bc0ff184f1e8ed4",
              "caae4184ae36d6b7b2251212da095e0f0ba53998fdb0c94a010f9e83f07002d7",
              "3f9dfe237528a8c56f64828cd7a53a9c517f80971ce70dab92f3fdff1f0cee3a"
            ],
            "projectionHashesHash": "76eeaa982aa56ca2a61dbf73134ad92a870db369247c09309e6aa127618ad3e0",
            "topologyHash": "cf8bb4ef4dcbc8195734613b1d08cb24c348c8b81061661195c2b3c2f1c0c028",
            "totalElementCount": 645
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "6d3038ef9bdbd45ad463aae6cbc14e698a8a4a4f5be8b7e6b61d9fcd63f96c5f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "6d3038ef9bdbd45ad463aae6cbc14e698a8a4a4f5be8b7e6b61d9fcd63f96c5f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "6d3038ef9bdbd45ad463aae6cbc14e698a8a4a4f5be8b7e6b61d9fcd63f96c5f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "6d3038ef9bdbd45ad463aae6cbc14e698a8a4a4f5be8b7e6b61d9fcd63f96c5f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "6d3038ef9bdbd45ad463aae6cbc14e698a8a4a4f5be8b7e6b61d9fcd63f96c5f",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "ce76e63a611f84f53eaef6221b13366029a60d224b0593977e647d5f02d3e2c7",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "f126dc9dc764c682311136df3e98ba6819e830d88c86c0a6ea8af4c647261112",
              "45bf73880783120279f4e75ae849db2adae373a0971f4220e971f95d92419c74",
              "21d6723e3453f2e9cc3eb836d8226ead262929db77b91bef697de0caf9e8c792",
              "1f006b5ece5a5bb53115d9363df3478565fce8a5e2cd9607516f4fbf1b969df4",
              "f126dc9dc764c682311136df3e98ba6819e830d88c86c0a6ea8af4c647261112"
            ],
            "projectionHashesHash": "6292ad453a1c612ea7c8f7365641d11550befe1b31cbc7951cca7a541ef09f3d",
            "topologyHash": "92e5162dcc730159df6a555bc31443d17a2fcf0fd5c2ef9d5468b32d5acb120d",
            "totalElementCount": 645
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "d2bf19778de422be67071d4d200b1da11133c030edd2b8a5cf4c04595cf4c4ca",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "d2bf19778de422be67071d4d200b1da11133c030edd2b8a5cf4c04595cf4c4ca",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "d2bf19778de422be67071d4d200b1da11133c030edd2b8a5cf4c04595cf4c4ca",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "d2bf19778de422be67071d4d200b1da11133c030edd2b8a5cf4c04595cf4c4ca",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 129,
                "hash": "d2bf19778de422be67071d4d200b1da11133c030edd2b8a5cf4c04595cf4c4ca",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "0f99467956ef949d8ecc3c2fc20c621b8bbc4d70a7ec7ba245c9328cc66ca6f4",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "e69b6a7c4d717e3a1247930ea6b9f0d883fd1ded3efd85768f8b27f4898c43e4",
              "63827bbae34caaabf087b8225ffd0bc9a8e111b41096a41a01df703d6737095a",
              "c8ba61e029547afc612f6ca271d53b6c5233453bdffbe52b96ddc98486f1ba0c",
              "de4132ba5e9377b68d860f13cea0f43baa45439cd1f8fca9a3a37bdf2353ef58",
              "e69b6a7c4d717e3a1247930ea6b9f0d883fd1ded3efd85768f8b27f4898c43e4"
            ],
            "projectionHashesHash": "fbf987c7974995e086f6460907fb415ac31245fb2443049460f7d8e29f4a5509",
            "topologyHash": "a7409da84ff70166a847f1afdd67774d1193207315ea58274c45389b76832dc5",
            "totalElementCount": 645
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "66ecfa03df29185e85723c78531eb2886fd061c2e4dc0c9018dbd2cbc5b35005",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "66ecfa03df29185e85723c78531eb2886fd061c2e4dc0c9018dbd2cbc5b35005",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "66ecfa03df29185e85723c78531eb2886fd061c2e4dc0c9018dbd2cbc5b35005",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "66ecfa03df29185e85723c78531eb2886fd061c2e4dc0c9018dbd2cbc5b35005",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              },
              {
                "chainCount": 42,
                "contractCount": 3,
                "entryCount": 126,
                "hash": "66ecfa03df29185e85723c78531eb2886fd061c2e4dc0c9018dbd2cbc5b35005",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 9
              }
            ],
            "ancestryScaleSummariesHash": "0f2e433816f58050b3dbdae7091c28742a23b2e3ed83b42107b2481c71cf8d13",
            "elementCounts": [
              129,
              249,
              69,
              69,
              129
            ],
            "elementCountsHash": "f7343b5eab24a29f09d295a05152aa119db340f92577cee01d66c2dfdf6536d5",
            "projectionCount": 5,
            "projectionHashes": [
              "b1b4ec4bc2e0d2b549af00f115b67217a1c77d4726c1261c0d2c685568c09ec5",
              "8439dffbf51b3d645c5b26a1a1e0b2c7ecb1dec5b63d9dd64355e1950cf48709",
              "e8af87d4eb9a71ef8b45aa989d0dd2c6fca29d4ac5e2f096a5b3a34eb89750d2",
              "7de48b4b8791b8e0a3228ace07820b641cbc131ded1c54019998b10e6c4505d9",
              "b1b4ec4bc2e0d2b549af00f115b67217a1c77d4726c1261c0d2c685568c09ec5"
            ],
            "projectionHashesHash": "f1c8e8ae06c4e51f37877979dd9b1280d0fdab5ac39558d8e9cea2c5af2f9691",
            "topologyHash": "6b3efbbe1d180fe33ffba7c8d565e495b4973d13731848bd46ad4e494b92f24c",
            "totalElementCount": 645
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "75a306a214b0c62570afab6f7cd1273eca4e47de04c4366c6ab7e193c6ae6efb",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 10
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 9
              }
            ],
            "controlsHash": "af04129572066bf7d82b1575463240c787fd4d82875d2b8402e4c07d89110972",
            "phase": "pre",
            "publicStateHash": "d9ce5e5bc92d341a8a0d1a296f3d37d6b6c807a9e930425d6a739ba437ada9e2",
            "rawSerializedPublicState": "{\"a\":10,\"b\":9,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "a=10|b=9",
            "stateSignatureHash": "b00c4fcfd49b0c51c6bb59247cc5b853211842fea531afa5b824c45a5d6b4a6c",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "faf8ac6fcbdbac0a5a3b513485ebe38fbd10d2f7fb3e0842b39113d81e280243"
          },
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 2
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "84002cd6d6b0e08e22558efd6cc3462614e100aeded299b7138b2adf8cf7a32f",
            "phase": "clamp",
            "publicStateHash": "08fb596021c0ca3836f9562307fb7d1aa37670bf072778a724008d9cf2f09ca1",
            "rawSerializedPublicState": "{\"a\":2,\"b\":1,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "a=2|b=1",
            "stateSignatureHash": "d1c2282acac9d90defb576a768b01a24e0be44adb15e8bbdf88a2f1d2abf5f54",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "7db7d0d7209ce4db6b74b9d19232d2958bc34cc901297a0b7a2782fbf26e4b10"
          },
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 10
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "cd9d81c07b37b8d9b67d11b2adf479522feb382e379c832cf9f9449d997704d8",
            "phase": "expand",
            "publicStateHash": "f2bd0e0a5cbfd3fd4151932decbbeb65a7fc2ae324813ed71d24f33fb1210e1c",
            "rawSerializedPublicState": "{\"a\":10,\"b\":1,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "a=10|b=1",
            "stateSignatureHash": "ea1bfcba0fa9b8bdf0a59c4aad97eddf2a1982536109494115112f656f8be97b",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "abd7dc1d3fcc01e29c6f88ec7d07a4057fdf43882a50cc0686b720175c91c3bd"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "a",
              "descriptor": {
                "controlId": "a",
                "enabled": true,
                "excludedValues": [],
                "maximum": 10,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "identity-positive-a-gt-b-v1"
              },
              "value": 6
            },
            {
              "controlId": "b",
              "descriptor": {
                "controlId": "b",
                "enabled": true,
                "excludedValues": [],
                "maximum": 9,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "identity-positive-a-gt-b-v1"
              },
              "value": 2
            }
          ],
          "controlsHash": "54ee36d096a6f66672d468a415963fb1edf02dc89f62b725576969008916ec8a",
          "publicStateHash": "5412bd19dc110ec5d23a291ee478d36527045f5c67fdeb79f33fe3b5f9320561",
          "rawSerializedPublicState": "{\"a\":6,\"b\":2,\"activeMode\":\"square-sum\"}",
          "resetClickCount": 1,
          "stateSignature": "a=6|b=2",
          "stateSignatureHash": "61155217bee90f8ffc372f85075dfe129881e5232601d16e8ccdc5e9bd1ffeb7",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "c183d4080bd36de4282a813e895a0498c51433c536206cf67f8427cf9aed7b1e"
        }
      },
      "domainId": "identity-positive-a-gt-b-v1",
      "labId": "identities-square-patterns",
      "modeId": "square-sum",
      "modePreparation": [
        {
          "groupId": "model",
          "modeId": "square-sum"
        }
      ],
      "planHash": "b9bf7afec7d74c13f4ce123d44d72e04011543aff85de9071ac08fa2e68344dd",
      "projectionMatrixHash": "6f72cb7416c19e55c57e8d95c9d828ba745310c57edfa54be7b2c2437437cecd",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "s3-identity-a-projects-b",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "15cd83c949f0101e7d8b3f8558dd29144402e155484f00145179a4bd4b90826a",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "019b90261f3b540e3d440cb914f582586b447a68767f24f20d6ef65397b2a40a",
              "e1d6945d346e03e1314cfb88ad604ead371a04977f04c84e5718aa889893f234",
              "35134fe07b365f9880ea5d41ceee53fd148d38cb8c1622254a0325ff86098080",
              "4101d8a2b6b6b012c5f1cef72fce1489c8c759ef2f7c983f365bb579e40bedf8",
              "019b90261f3b540e3d440cb914f582586b447a68767f24f20d6ef65397b2a40a"
            ],
            "projectionHashesHash": "c783270c82df590c8b0b6b91f799374221d35cd32e348edbf97f4b59edb5d5a3",
            "topologyHash": "5097afa85edc78a8c56f17b1ded3051fe3d78ae141da2bd9aa2c6109a9de0f22",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "6d89e2a194c0b9712751fe38f960dd6a93c7f7ff484b08c7a57e7f1bc9dddadc",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "b843128622bcf5c15804370ef770e99af909b67dc74685e9bc40a06d89d82c1d",
              "316922fb08a6d3730cd19a0ff82016126d26482ddea73d3cf77f6a8256f24dd8",
              "a40d7c472b575eccd531ec98ffd663836ebe1e968db950fd21839fc035144b17",
              "f03bc7e890cf567cea941bdd6bb35a0f9c590c42291da28da843220678c7a46f",
              "b843128622bcf5c15804370ef770e99af909b67dc74685e9bc40a06d89d82c1d"
            ],
            "projectionHashesHash": "654f469e1819786a6f0eb83ba9819762f95708ace36015a1c278d8b42f9e484b",
            "topologyHash": "48a814bdabfb85973f5b68adf99710efdf0d414c158942ffc41c1e7a5ed02ed6",
            "totalElementCount": 35
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "cc3c4cf0cf7c07c741ad2c394b8934e8f8af671cf4c97e6b34438398442cf240",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "1881a64db4438fa4d91ab7e1f1167abe4e86cbbdd5b945629e55d8d23111240e",
              "681298da2072a46f6237bc6a5e8b6ce378330123cd29f883ff356ac3e4ece398",
              "82e4a1c85144de47cb725e39c29261a876db6ab6bde69c43e8a23170dca83bed",
              "f5ff830bfc6b33d1d5d2160a87cae5191df15d35e139712deef04eba0496853c",
              "1881a64db4438fa4d91ab7e1f1167abe4e86cbbdd5b945629e55d8d23111240e"
            ],
            "projectionHashesHash": "520b5a43f67de5ecf26e9b7f21e44770254588bf159fb48bad696aa4878a4145",
            "topologyHash": "cd0e254e573d934b1471cdd772e1d4f0f1670c2a9b28690a44130927aa41e82a",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "c48562b98c0af55fbadbe97f9736083344077e7bb26a0859ba6798a6d10c89e0",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "3498fbd5ad6da8cfad1010df00e3de921fe7cea2c4a8d3a71ebe1580e57d6cf8",
              "4fba74268b384777f79dd1a5109598e44aca95519b24d6b4901555d8b481fdf5",
              "aa6a9d3959b77bb59b4664b655467aca7e6568a3d54a7d60f48bce35dde936b1",
              "df848140ffe13b105429cd57b8a286172a44b2607c1a1e5d0a53c224685b7c6a",
              "3498fbd5ad6da8cfad1010df00e3de921fe7cea2c4a8d3a71ebe1580e57d6cf8"
            ],
            "projectionHashesHash": "be35ea29af1935b821c25a98aa21022254d9624637ab34c28f198086f9be977d",
            "topologyHash": "933c8f3117a9cbd5135cf1852427424f9d16636b0dac99e4e93745081b01adfb",
            "totalElementCount": 35
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "0b97972e88c73dc66424984211c88c1677a68d71e25ed1b3b46bcdd4e062971c",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "83bce20ce368d8237ae2f1d091e41b5eb63f94e1d57e9b16b7c5a599fa29b705",
              "ddcdaf48a828af428c840f5f14fd4f95fb973f7cba644c9cf1460cb4944c568d",
              "26f75287064289e0ca9562671af18a9ff8de83fa9aaeef3f3b21d0df1dfd775e",
              "53e31aef3b921d3b66ad64901012cdd0191c2cfb890e607a013ba4c96ddb4cc9",
              "83bce20ce368d8237ae2f1d091e41b5eb63f94e1d57e9b16b7c5a599fa29b705"
            ],
            "projectionHashesHash": "55589c18ebc53855bbdcbee189989e225dd581fb37b609acb66ba24814039e8c",
            "topologyHash": "8223289fce37e9cfc7812b86612b1e94e00eb999388f637df33b196b62203c4d",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "a82f88df69fe044a1c3e003f630c1f842e4c395df91e01f2d9807344a1c15328",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "3b2df5ce839ebcf068f5e09bdb9fda97042f8efd28e28cb0f94cdb5cda96a5f4",
            "projectionCount": 5,
            "projectionHashes": [
              "9a185180966fd81f659ee26be639a66b6621cdf4e2ea310c8b43f6f2ae92010b",
              "11ba0cc049ba70b796ce0abe1063735eecf2aa7cb49873a0c7639374ff5db563",
              "f80768d97941e580a736e08465ceb5d9895c28db1d5a6e9718813ea7fdb9a0e1",
              "21a8c5d8a99e7d02caea9f1a89153e35cf79d588070a20ccf61f5907a88ed47b",
              "9a185180966fd81f659ee26be639a66b6621cdf4e2ea310c8b43f6f2ae92010b"
            ],
            "projectionHashesHash": "b74f5d96c686bd3689f5575044107b92c6c19fd10afff59abf1937dae24c70dd",
            "topologyHash": "5ae85d1b26890cf0ae3a88651e79ba3ec3776209d1d07bcbecb79756c551244a",
            "totalElementCount": 35
          }
        }
      }
    },
    {
      "companionAuthority": {
        "authorityHash": "137aad6a9f32d45831d8180526339888b3e2b45fccbc20fb2dd86c61476b5c01",
        "geometryPolicy": {
          "minimumUserEpsilon": 0.05,
          "pixelEpsilon": 0.75,
          "policyHash": "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba",
          "version": "hk-viz-dependent-transition-geometry-policy.v1"
        },
        "phases": [
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 2
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "92e43244f99ee7c7ef8da9a1958b571f237a7a08b53c3bc1940899fb7a651f04",
            "phase": "pre",
            "publicStateHash": "35aaf831f0ee2ff2ae3f558ddb702f400cbcbf8b9279ed5c819070389358ec30",
            "rawSerializedPublicState": "{\"a\":2,\"b\":1,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 1,
            "stateSignature": "a=2|b=1",
            "stateSignatureHash": "6fa52b8b262224d46149cc388e0d54b2975a769c465b22063b7399e4369a0826",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "2"
                    ],
                    [
                      "data-viz-area",
                      "9"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "f6165b661f4fd2c264cc7589e9aa392d19616328fc8f889876738fd5916c72da"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "e5cb455909f8e59ffd08ae5b99743a605beb639f51021b19658c279b364e810c"
          },
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 10
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 9
              }
            ],
            "controlsHash": "f8ca3285ebbddf0f25849164d2a72f5c47e3acabcaeea3200422e843b8a2d02d",
            "phase": "clamp",
            "publicStateHash": "d4a9b79334ab95b84eed2981bd8485fb46f1d8ccdc5520553fe63134679028f2",
            "rawSerializedPublicState": "{\"a\":10,\"b\":9,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "a=10|b=9",
            "stateSignatureHash": "59f96f65dcac7290a1f9e6b534fd864b145e7fe1e0ef947d745b67bdeae8ad7f",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "361"
                    ],
                    [
                      "data-viz-b",
                      "9"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "82097df84cde8149c59996b75ca0de3e9d3c107176f1d1c5ed845036c5813d7e"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "c3a196747515ad9e799bf1aa1b03066b497331f363712d34f5ce080155947060"
          },
          {
            "controls": [
              {
                "controlId": "a",
                "descriptor": {
                  "controlId": "a",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 10,
                  "minimum": 2,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 10
              },
              {
                "controlId": "b",
                "descriptor": {
                  "controlId": "b",
                  "enabled": true,
                  "excludedValues": [],
                  "maximum": 9,
                  "minimum": 1,
                  "step": 1,
                  "visibility": "range",
                  "domainId": "identity-positive-a-gt-b-v1"
                },
                "value": 1
              }
            ],
            "controlsHash": "d2da4d2d5691c94fc70093795eeb0413389fb2163fdd28dae5712f3ef7349c2d",
            "phase": "expand",
            "publicStateHash": "6a3896743bf3dc0eb7c333c04b43c21c49e3c29c65a08500e3174532564a6601",
            "rawSerializedPublicState": "{\"a\":10,\"b\":1,\"activeMode\":\"square-sum\"}",
            "resetCountSincePreviousPhase": 0,
            "stateSignature": "a=10|b=1",
            "stateSignatureHash": "8abd5f0b763ff64ea3e34e769254699a0ec4446c4d0ca66afc5a4d944739ec90",
            "visibleElementAuthorities": {
              "en": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ],
              "zh-Hans": [
                {
                  "attributes": [
                    [
                      "data-viz-a",
                      "10"
                    ],
                    [
                      "data-viz-area",
                      "121"
                    ],
                    [
                      "data-viz-b",
                      "1"
                    ],
                    [
                      "data-viz-name",
                      "identity-square-whole"
                    ]
                  ],
                  "learnerVisible": true,
                  "paintedSubtree": {
                    "elementCount": 7,
                    "hash": "1e1a5180a1a918e098d6e76f21b2db3fa19aeed5a51096e1fc21680a4eaee47f"
                  },
                  "tagName": "g",
                  "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
              ]
            },
            "visibleElementAuthoritiesHash": "05cca210399928b1e3c670faecf4ce79aea1d778a3ef73ae1cbf57d4fb3b07b4"
          }
        ],
        "restoration": {
          "controls": [
            {
              "controlId": "a",
              "descriptor": {
                "controlId": "a",
                "enabled": true,
                "excludedValues": [],
                "maximum": 10,
                "minimum": 2,
                "step": 1,
                "visibility": "range",
                "domainId": "identity-positive-a-gt-b-v1"
              },
              "value": 6
            },
            {
              "controlId": "b",
              "descriptor": {
                "controlId": "b",
                "enabled": true,
                "excludedValues": [],
                "maximum": 9,
                "minimum": 1,
                "step": 1,
                "visibility": "range",
                "domainId": "identity-positive-a-gt-b-v1"
              },
              "value": 2
            }
          ],
          "controlsHash": "e6af1ab4d21907596408b8016c7a3399fb11dc9240e5b91ab18738572d1bfded",
          "publicStateHash": "088f194490b5f6fbbd25b2e9c3f0d3a18236b8acbc35251d947f631c4c7d18de",
          "rawSerializedPublicState": "{\"a\":6,\"b\":2,\"activeMode\":\"square-sum\"}",
          "resetClickCount": 1,
          "stateSignature": "a=6|b=2",
          "stateSignatureHash": "c508e37527c1e233bb0152114d124051deafe4f6f9a09ab800e819eb83c8fa56",
          "visibleElementAuthorities": {
            "en": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ],
            "zh-Hans": [
              {
                "attributes": [
                  [
                    "data-viz-a",
                    "6"
                  ],
                  [
                    "data-viz-area",
                    "64"
                  ],
                  [
                    "data-viz-b",
                    "2"
                  ],
                  [
                    "data-viz-name",
                    "identity-square-whole"
                  ]
                ],
                "learnerVisible": true,
                "paintedSubtree": {
                  "elementCount": 7,
                  "hash": "490265b55724439b1c7cee10fb270e7a17695362183e88630cb776cab8b7207a"
                },
                "tagName": "g",
                "textHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              }
            ]
          },
          "visibleElementAuthoritiesHash": "c56a96caa3863448214f649ddcd26f1f1d3120af4e80448698f74a530ff7456c"
        }
      },
      "domainId": "identity-positive-a-gt-b-v1",
      "labId": "identities-square-patterns",
      "modeId": "square-sum",
      "modePreparation": [
        {
          "groupId": "model",
          "modeId": "square-sum"
        }
      ],
      "planHash": "556659194fcd9528b4802160b1c2b49cb8a63e25e78187a30e23f6c9c8e6ab49",
      "projectionMatrixHash": "503775812b79a7d1fef460717c1bdde12cadb29adc8a14a051833b58db81b3d0",
      "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
      "sequenceId": "s3-identity-b-projects-a",
      "visibleMathProjectionTopologies": {
        "en": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "c8c5a14f6892eca2e6619fa43d868cb1f82a39ca12da1e1982ec210649d11c07",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "4594350520ff2643617b85a2460e5889b7008d167183b82cc894b0688d083d54",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "019b90261f3b540e3d440cb914f582586b447a68767f24f20d6ef65397b2a40a",
              "35134fe07b365f9880ea5d41ceee53fd148d38cb8c1622254a0325ff86098080",
              "e1d6945d346e03e1314cfb88ad604ead371a04977f04c84e5718aa889893f234",
              "4101d8a2b6b6b012c5f1cef72fce1489c8c759ef2f7c983f365bb579e40bedf8",
              "019b90261f3b540e3d440cb914f582586b447a68767f24f20d6ef65397b2a40a"
            ],
            "projectionHashesHash": "91192cf3a924d584d39076323b4bc4959c1e869ffa47f212acbaa45798ef8076",
            "topologyHash": "e9b1b6fb95aae2e987bac968841d8669ea12982d0f8945bb8d903737a6126e66",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "71807672f3054678eaa0559c30733eb16884fe38c67145fd82d636153540c5b4",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "69f92d13e1e2439fe8fdf0c1957a4953c7df81985592c3cba22e418551c8fe73",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "b843128622bcf5c15804370ef770e99af909b67dc74685e9bc40a06d89d82c1d",
              "a40d7c472b575eccd531ec98ffd663836ebe1e968db950fd21839fc035144b17",
              "316922fb08a6d3730cd19a0ff82016126d26482ddea73d3cf77f6a8256f24dd8",
              "f03bc7e890cf567cea941bdd6bb35a0f9c590c42291da28da843220678c7a46f",
              "b843128622bcf5c15804370ef770e99af909b67dc74685e9bc40a06d89d82c1d"
            ],
            "projectionHashesHash": "645efa68414b9c0581de9e7439836581588e335ef8c1c9f5efe1dda7466b6f96",
            "topologyHash": "804ec701a3aead4374f30174d201db4a00ffef4a326e952b9e89c06efa635f19",
            "totalElementCount": 35
          }
        },
        "zh": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "8ae838f8010852f726bf46ea17e69fa710a31874911c8096e25ab8fe3a5df3c7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "1dfe09589e6fd5f0ccb05c7be5a28632ed6077c57ba3dd26ec32293797bbb50c",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "1881a64db4438fa4d91ab7e1f1167abe4e86cbbdd5b945629e55d8d23111240e",
              "82e4a1c85144de47cb725e39c29261a876db6ab6bde69c43e8a23170dca83bed",
              "681298da2072a46f6237bc6a5e8b6ce378330123cd29f883ff356ac3e4ece398",
              "f5ff830bfc6b33d1d5d2160a87cae5191df15d35e139712deef04eba0496853c",
              "1881a64db4438fa4d91ab7e1f1167abe4e86cbbdd5b945629e55d8d23111240e"
            ],
            "projectionHashesHash": "00050a5faf0d2f0806a353330546a86995536ff22b17d82e5d2f16682f4a5d88",
            "topologyHash": "7508e2cd2575d92708cf31adfa649302ae478362d42e161de7b66fa4ae545103",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "6d98ee8ad15cdbdeb53f0dbfd70112c761d92b377720348e1ab277abe1c2180e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "6960ee727a48f7b99ede3d5d623872a2724f3cbe1e373f05a7f270dcd60c1c25",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "3498fbd5ad6da8cfad1010df00e3de921fe7cea2c4a8d3a71ebe1580e57d6cf8",
              "aa6a9d3959b77bb59b4664b655467aca7e6568a3d54a7d60f48bce35dde936b1",
              "4fba74268b384777f79dd1a5109598e44aca95519b24d6b4901555d8b481fdf5",
              "df848140ffe13b105429cd57b8a286172a44b2607c1a1e5d0a53c224685b7c6a",
              "3498fbd5ad6da8cfad1010df00e3de921fe7cea2c4a8d3a71ebe1580e57d6cf8"
            ],
            "projectionHashesHash": "0bfc45c58cd935d8ebd0abfd63da07adac9248bfde96114fe1d059672b1a40cf",
            "topologyHash": "4c002876334011773e187a589e029c658f34aef5709151eceb786b00ebbc17fc",
            "totalElementCount": 35
          }
        },
        "zh-Hans": {
          "dark": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 43,
                "hash": "ba669c2f0a5f1c291a08c31875b95220eb08e738ad00354969c8f1ad74bd226e",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "37224287c121d34c9c27818b162ecc07c1b8b678da9f6414fbd191910afc6120",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "83bce20ce368d8237ae2f1d091e41b5eb63f94e1d57e9b16b7c5a599fa29b705",
              "26f75287064289e0ca9562671af18a9ff8de83fa9aaeef3f3b21d0df1dfd775e",
              "ddcdaf48a828af428c840f5f14fd4f95fb973f7cba644c9cf1460cb4944c568d",
              "53e31aef3b921d3b66ad64901012cdd0191c2cfb890e607a013ba4c96ddb4cc9",
              "83bce20ce368d8237ae2f1d091e41b5eb63f94e1d57e9b16b7c5a599fa29b705"
            ],
            "projectionHashesHash": "e7b99f8512c98d918a7b9346d2e8a60dc35be5959f1b01f228a784602cde8b47",
            "topologyHash": "5457221ceb001bc97344b73e7d6af2570394cca2a8e87c93f643663f99e4da81",
            "totalElementCount": 35
          },
          "light": {
            "ancestryScaleSummaries": [
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              },
              {
                "chainCount": 14,
                "contractCount": 1,
                "entryCount": 42,
                "hash": "388a8363219089088ef8f5cb65e1ad9913a68a4b6899f8a5d03ba683e8f57ab7",
                "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
                "scaleWitnessCount": 3
              }
            ],
            "ancestryScaleSummariesHash": "3d2781946d6d76e971eaee4afb3511e3856ffab6fa73369a954245bd91fb5f3e",
            "elementCounts": [
              7,
              7,
              7,
              7,
              7
            ],
            "elementCountsHash": "a62d336e05d139595aa8cda492c1702aedf1e2c4ddcc84972b48b982bd4ca916",
            "projectionCount": 5,
            "projectionHashes": [
              "9a185180966fd81f659ee26be639a66b6621cdf4e2ea310c8b43f6f2ae92010b",
              "f80768d97941e580a736e08465ceb5d9895c28db1d5a6e9718813ea7fdb9a0e1",
              "11ba0cc049ba70b796ce0abe1063735eecf2aa7cb49873a0c7639374ff5db563",
              "21a8c5d8a99e7d02caea9f1a89153e35cf79d588070a20ccf61f5907a88ed47b",
              "9a185180966fd81f659ee26be639a66b6621cdf4e2ea310c8b43f6f2ae92010b"
            ],
            "projectionHashesHash": "ef95b1bf6a5043d19b30e705869a76fa48613f4256d8bc116f092df2388178e7",
            "topologyHash": "ae982372d5b1b80c76886ea91d38d6f5355e5cc74a14c32b2cd32aafbf5d422f",
            "totalElementCount": 35
          }
        }
      }
    }
]);

function assertDenseExactArray(label, value, expectedLength) {
  const expectedKeys = Array.from({ length: expectedLength }, (_, index) => String(index));
  if (
    !Array.isArray(value) ||
    value.length !== expectedLength ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(expectedKeys)
  ) {
    throw new Error(`${label} exact manifest array shape drifted.`);
  }
}

function assertExactPlainObject(label, value, expectedKeys) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${label} exact manifest object shape is invalid.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(value);
  if (
    JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys) ||
    actualKeys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !descriptor.enumerable ||
        descriptor.get !== undefined || descriptor.set !== undefined;
    })
  ) {
    throw new Error(`${label} exact manifest keys drifted.`);
  }
}

function assertNonemptyString(label, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} exact manifest string is invalid.`);
  }
}

function assertSha(label, value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} exact manifest digest is invalid.`);
  }
}

function assertFiniteManifestNumber(label, value) {
  if (!Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error(`${label} exact manifest finite number drifted.`);
  }
}

function assertBoundedManifestString(label, value, maximumBytes = 8_192) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > maximumBytes
  ) {
    throw new Error(`${label} exact manifest bounded string drifted.`);
  }
}

function assertCompanionVisibleElementAuthorities(label, value) {
  assertExactPlainObject(label, value, LANGUAGES);
  for (const language of LANGUAGES) {
    const elements = value[language];
    if (!Array.isArray(elements) || elements.length < 1 || elements.length > 8) {
      throw new Error(`${label}.${language} exact manifest visible authority count drifted.`);
    }
    assertDenseExactArray(`${label}.${language}`, elements, elements.length);
    elements.forEach((element, elementIndex) => {
      const elementLabel = `${label}.${language}[${elementIndex}]`;
      assertExactPlainObject(elementLabel, element, VISIBLE_AUTHORITY_KEYS);
      if (element.learnerVisible !== true) {
        throw new Error(`${elementLabel}.learnerVisible exact manifest drifted.`);
      }
      if (
        !Array.isArray(element.attributes) ||
        element.attributes.length < 1 ||
        element.attributes.length > 16
      ) {
        throw new Error(`${elementLabel}.attributes exact manifest count drifted.`);
      }
      assertDenseExactArray(
        `${elementLabel}.attributes`,
        element.attributes,
        element.attributes.length,
      );
      let previousName = null;
      element.attributes.forEach((tuple, tupleIndex) => {
        assertDenseExactArray(`${elementLabel}.attributes[${tupleIndex}]`, tuple, 2);
        assertBoundedManifestString(
          `${elementLabel}.attributes[${tupleIndex}][0]`,
          tuple[0],
          256,
        );
        if (typeof tuple[1] !== "string" || Buffer.byteLength(tuple[1], "utf8") > 256) {
          throw new Error(`${elementLabel}.attributes[${tupleIndex}][1] exact manifest string drifted.`);
        }
        if (previousName !== null && previousName >= tuple[0]) {
          throw new Error(`${elementLabel}.attributes exact manifest order drifted.`);
        }
        previousName = tuple[0];
      });
      assertExactPlainObject(
        `${elementLabel}.paintedSubtree`,
        element.paintedSubtree,
        PAINTED_SUBTREE_KEYS,
      );
      if (
        !Number.isSafeInteger(element.paintedSubtree.elementCount) ||
        element.paintedSubtree.elementCount < 1 ||
        element.paintedSubtree.elementCount > 320
      ) {
        throw new Error(`${elementLabel}.paintedSubtree exact manifest count drifted.`);
      }
      assertSha(`${elementLabel}.paintedSubtree.hash`, element.paintedSubtree.hash);
      assertBoundedManifestString(`${elementLabel}.tagName`, element.tagName, 256);
      assertSha(`${elementLabel}.textHash`, element.textHash);
    });
  }
}

function assertCompanionStageAuthority(
  label,
  stage,
  { expectedKeys, expectedReset, resetKey, sequenceId, stageId },
) {
  assertExactPlainObject(label, stage, expectedKeys);
  if (!Array.isArray(stage.controls) || stage.controls.length < 1 || stage.controls.length > 16) {
    throw new Error(`${label}.controls exact manifest count drifted.`);
  }
  assertDenseExactArray(`${label}.controls`, stage.controls, stage.controls.length);
  stage.controls.forEach((control, controlIndex) => {
    const controlLabel = `${label}.controls[${controlIndex}]`;
    assertExactPlainObject(controlLabel, control, CONTROL_KEYS);
    assertBoundedManifestString(`${controlLabel}.controlId`, control.controlId, 256);
    assertFiniteManifestNumber(`${controlLabel}.value`, control.value);
    assertExactPlainObject(`${controlLabel}.descriptor`, control.descriptor, DESCRIPTOR_KEYS);
    if (
      control.descriptor.controlId !== control.controlId ||
      typeof control.descriptor.enabled !== "boolean" ||
      !["range", "fixed"].includes(control.descriptor.visibility) ||
      (
        control.descriptor.domainId !== null &&
        typeof control.descriptor.domainId !== "string"
      )
    ) {
      throw new Error(`${controlLabel}.descriptor exact manifest identity drifted.`);
    }
    for (const key of ["maximum", "minimum", "step"]) {
      assertFiniteManifestNumber(`${controlLabel}.descriptor.${key}`, control.descriptor[key]);
    }
    if (
      !Array.isArray(control.descriptor.excludedValues) ||
      control.descriptor.excludedValues.length > 32
    ) {
      throw new Error(`${controlLabel}.descriptor.excludedValues exact manifest drifted.`);
    }
    assertDenseExactArray(
      `${controlLabel}.descriptor.excludedValues`,
      control.descriptor.excludedValues,
      control.descriptor.excludedValues.length,
    );
    control.descriptor.excludedValues.forEach((excluded, excludedIndex) =>
      assertFiniteManifestNumber(
        `${controlLabel}.descriptor.excludedValues[${excludedIndex}]`,
        excluded,
      )
    );
  });
  const expectedControlsHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      controls: stage.controls,
      kind: "dependent-transition-companion-controls",
      sequenceId,
      stageId,
    });
  assertSha(`${label}.controlsHash`, stage.controlsHash);
  if (stage.controlsHash !== expectedControlsHash) {
    throw new Error(`${label}.controlsHash exact manifest content drifted.`);
  }
  assertBoundedManifestString(
    `${label}.rawSerializedPublicState`,
    stage.rawSerializedPublicState,
    262_144,
  );
  let publicState;
  try {
    publicState = JSON.parse(stage.rawSerializedPublicState);
  } catch {
    throw new Error(`${label}.rawSerializedPublicState exact manifest JSON drifted.`);
  }
  if (
    !publicState ||
    typeof publicState !== "object" ||
    Array.isArray(publicState) ||
    Object.getPrototypeOf(publicState) !== Object.prototype ||
    JSON.stringify(publicState) !== stage.rawSerializedPublicState
  ) {
    throw new Error(`${label}.rawSerializedPublicState exact manifest canonical JSON drifted.`);
  }
  const expectedPublicStateHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      kind: "dependent-transition-companion-public-state",
      rawSerializedPublicState: stage.rawSerializedPublicState,
      sequenceId,
      stageId,
    });
  assertSha(`${label}.publicStateHash`, stage.publicStateHash);
  if (stage.publicStateHash !== expectedPublicStateHash) {
    throw new Error(`${label}.publicStateHash exact manifest content drifted.`);
  }
  assertBoundedManifestString(`${label}.stateSignature`, stage.stateSignature);
  const expectedStateSignatureHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      kind: "dependent-transition-companion-state-signature",
      sequenceId,
      stageId,
      stateSignature: stage.stateSignature,
    });
  assertSha(`${label}.stateSignatureHash`, stage.stateSignatureHash);
  if (stage.stateSignatureHash !== expectedStateSignatureHash) {
    throw new Error(`${label}.stateSignatureHash exact manifest content drifted.`);
  }
  if (stage[resetKey] !== expectedReset) {
    throw new Error(`${label}.${resetKey} exact manifest reset drifted.`);
  }
  assertCompanionVisibleElementAuthorities(
    `${label}.visibleElementAuthorities`,
    stage.visibleElementAuthorities,
  );
  const expectedVisibleHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      authorities: stage.visibleElementAuthorities,
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      kind: "dependent-transition-companion-visible-elements",
      sequenceId,
      stageId,
    });
  assertSha(
    `${label}.visibleElementAuthoritiesHash`,
    stage.visibleElementAuthoritiesHash,
  );
  if (stage.visibleElementAuthoritiesHash !== expectedVisibleHash) {
    throw new Error(`${label}.visibleElementAuthoritiesHash exact manifest content drifted.`);
  }
}

function assertCompanionAuthority(label, authority, sequenceId) {
  assertExactPlainObject(label, authority, COMPANION_AUTHORITY_KEYS);
  assertExactPlainObject(
    `${label}.geometryPolicy`,
    authority.geometryPolicy,
    GEOMETRY_POLICY_KEYS,
  );
  if (
    authority.geometryPolicy.minimumUserEpsilon !== 0.05 ||
    authority.geometryPolicy.pixelEpsilon !== 0.75 ||
    authority.geometryPolicy.version !== GEOMETRY_POLICY_VERSION
  ) {
    throw new Error(`${label}.geometryPolicy exact manifest policy drifted.`);
  }
  const expectedGeometryPolicyHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      kind: "dependent-transition-companion-geometry-policy",
      minimumUserEpsilon: authority.geometryPolicy.minimumUserEpsilon,
      pixelEpsilon: authority.geometryPolicy.pixelEpsilon,
      version: authority.geometryPolicy.version,
    });
  assertSha(`${label}.geometryPolicy.policyHash`, authority.geometryPolicy.policyHash);
  if (authority.geometryPolicy.policyHash !== expectedGeometryPolicyHash) {
    throw new Error(`${label}.geometryPolicy.policyHash exact manifest drifted.`);
  }
  assertDenseExactArray(`${label}.phases`, authority.phases, 3);
  authority.phases.forEach((phase, phaseIndex) => {
    const expectedPhase = ["pre", "clamp", "expand"][phaseIndex];
    if (phase.phase !== expectedPhase) {
      throw new Error(`${label}.phases[${phaseIndex}].phase exact manifest order drifted.`);
    }
    assertCompanionStageAuthority(`${label}.phases[${phaseIndex}]`, phase, {
      expectedKeys: PHASE_AUTHORITY_KEYS,
      expectedReset: phaseIndex === 0 ? 1 : 0,
      resetKey: "resetCountSincePreviousPhase",
      sequenceId,
      stageId: `phase:${expectedPhase}`,
    });
  });
  assertCompanionStageAuthority(`${label}.restoration`, authority.restoration, {
    expectedKeys: RESTORATION_AUTHORITY_KEYS,
    expectedReset: 1,
    resetKey: "resetClickCount",
    sequenceId,
    stageId: "post-sequence-restoration",
  });
  const expectedAuthorityHash =
    sha256HkVisualizationDependentTransitionManifestCanonical({
      contractVersion: SEQUENCE_SCHEMA_VERSION,
      geometryPolicy: authority.geometryPolicy,
      kind: "dependent-transition-companion-authority",
      phases: authority.phases,
      restoration: authority.restoration,
      sequenceId,
    });
  assertSha(`${label}.authorityHash`, authority.authorityHash);
  if (authority.authorityHash !== expectedAuthorityHash) {
    throw new Error(`${label}.authorityHash exact manifest content drifted.`);
  }
}

function compactProjectionTopologies(topologies) {
  return Object.fromEntries(LANGUAGES.map((language) => [
    language,
    Object.fromEntries(THEMES.map((theme) => {
      const {
        ancestryScaleSummariesHash,
        elementCountsHash,
        projectionCount,
        projectionHashesHash,
        topologyHash,
        totalElementCount,
      } = topologies[language][theme];
      return [theme, {
        ancestryScaleSummariesHash,
        elementCountsHash,
        projectionCount,
        projectionHashesHash,
        topologyHash,
        totalElementCount,
      }];
    })),
  ]));
}

export function assertExactHkVisualizationDependentTransitionSourcePlanManifest(value) {
  assertDenseExactArray("HK Visualization dependent-transition", value, 11);
  const sequenceIds = new Set();
  const planHashes = new Set();
  value.forEach((entry, index) => {
    const label = `HK Visualization dependent-transition exact manifest[${index}]`;
    assertExactPlainObject(label, entry, SOURCE_PLAN_KEYS);
    for (const key of ["domainId", "labId", "modeId", "sequenceId"]) {
      assertNonemptyString(`${label}.${key}`, entry[key]);
    }
    if (entry.schemaVersion !== SEQUENCE_SCHEMA_VERSION) {
      throw new Error(`${label}.schemaVersion exact manifest drifted.`);
    }
    assertCompanionAuthority(
      `${label}.companionAuthority`,
      entry.companionAuthority,
      entry.sequenceId,
    );
    assertSha(`${label}.planHash`, entry.planHash);
    assertSha(`${label}.projectionMatrixHash`, entry.projectionMatrixHash);
    assertDenseExactArray(
      `${label}.modePreparation`,
      entry.modePreparation,
      entry.modePreparation.length,
    );
    entry.modePreparation.forEach((item, itemIndex) => {
      const itemLabel = `${label}.modePreparation[${itemIndex}]`;
      assertExactPlainObject(itemLabel, item, MODE_PREPARATION_KEYS);
      assertNonemptyString(`${itemLabel}.groupId`, item.groupId);
      assertNonemptyString(`${itemLabel}.modeId`, item.modeId);
    });
    assertExactPlainObject(
      `${label}.visibleMathProjectionTopologies`,
      entry.visibleMathProjectionTopologies,
      LANGUAGES,
    );
    for (const language of LANGUAGES) {
      const byTheme = entry.visibleMathProjectionTopologies[language];
      assertExactPlainObject(
        `${label}.visibleMathProjectionTopologies.${language}`,
        byTheme,
        THEMES,
      );
      for (const theme of THEMES) {
        const topology = byTheme[theme];
        const topologyLabel =
          `${label}.visibleMathProjectionTopologies.${language}.${theme}`;
        assertExactPlainObject(topologyLabel, topology, TOPOLOGY_KEYS);
        for (const key of [
          "ancestryScaleSummariesHash", "elementCountsHash",
          "projectionHashesHash", "topologyHash",
        ]) {
          assertSha(`${topologyLabel}.${key}`, topology[key]);
        }
        assertDenseExactArray(
          `${topologyLabel}.ancestryScaleSummaries`,
          topology.ancestryScaleSummaries,
          5,
        );
        assertDenseExactArray(`${topologyLabel}.elementCounts`, topology.elementCounts, 5);
        assertDenseExactArray(`${topologyLabel}.projectionHashes`, topology.projectionHashes, 5);
        topology.ancestryScaleSummaries.forEach((summary, summaryIndex) => {
          const summaryLabel = `${topologyLabel}.ancestryScaleSummaries[${summaryIndex}]`;
          assertExactPlainObject(summaryLabel, summary, ANCESTRY_SCALE_SUMMARY_KEYS);
          if (
            summary.policyVersion !== ANCESTRY_SCALE_SUMMARY_POLICY_VERSION ||
            !Number.isSafeInteger(summary.contractCount) || summary.contractCount <= 0 ||
            summary.contractCount > 32 ||
            !Number.isSafeInteger(summary.chainCount) ||
            summary.chainCount < summary.contractCount ||
            !Number.isSafeInteger(summary.entryCount) ||
            summary.entryCount < summary.chainCount ||
            !Number.isSafeInteger(summary.scaleWitnessCount) ||
            summary.scaleWitnessCount !== summary.contractCount * 3
          ) {
            throw new Error(`${summaryLabel} exact manifest ancestry summary drifted.`);
          }
          assertSha(`${summaryLabel}.hash`, summary.hash);
        });
        topology.elementCounts.forEach((count, countIndex) => {
          if (!Number.isSafeInteger(count) || count <= 0) {
            throw new Error(`${topologyLabel}.elementCounts[${countIndex}] exact manifest count drifted.`);
          }
        });
        topology.projectionHashes.forEach((hash, hashIndex) => {
          assertSha(`${topologyLabel}.projectionHashes[${hashIndex}]`, hash);
        });
        if (
          topology.projectionCount !== 5 ||
          !Number.isSafeInteger(topology.totalElementCount) ||
          topology.totalElementCount < 5 ||
          topology.totalElementCount !==
            topology.elementCounts.reduce((sum, count) => sum + count, 0)
        ) {
          throw new Error(`${topologyLabel} exact manifest count drifted.`);
        }
        const expectedAncestryHash =
          sha256HkVisualizationDependentTransitionManifestCanonical({
            contractVersion: entry.schemaVersion,
            kind: "dependent-transition-visible-math-ancestry-scale-summaries",
            sequenceId: entry.sequenceId,
            summaries: topology.ancestryScaleSummaries,
          });
        const expectedElementCountsHash =
          sha256HkVisualizationDependentTransitionManifestCanonical({
            contractVersion: entry.schemaVersion,
            elementCounts: topology.elementCounts,
            kind: "dependent-transition-visible-math-element-counts",
            sequenceId: entry.sequenceId,
          });
        const expectedProjectionHashesHash =
          sha256HkVisualizationDependentTransitionManifestCanonical({
            contractVersion: entry.schemaVersion,
            hashes: topology.projectionHashes,
            kind: "dependent-transition-visible-math-projection-hashes",
            sequenceId: entry.sequenceId,
          });
        const expectedTopologyHash =
          sha256HkVisualizationDependentTransitionManifestCanonical({
            contractVersion: entry.schemaVersion,
            kind: "dependent-transition-visible-math-projection-topology",
            projections: PROJECTION_SOURCES.map((source, projectionIndex) => ({
              ancestryScaleSummary: topology.ancestryScaleSummaries[projectionIndex],
              elementCount: topology.elementCounts[projectionIndex],
              hash: topology.projectionHashes[projectionIndex],
              source,
            })),
            sequenceId: entry.sequenceId,
          });
        if (
          topology.ancestryScaleSummariesHash !== expectedAncestryHash ||
          topology.elementCountsHash !== expectedElementCountsHash ||
          topology.projectionHashesHash !== expectedProjectionHashesHash ||
          topology.topologyHash !== expectedTopologyHash
        ) {
          throw new Error(`${topologyLabel} exact manifest projection topology content drifted.`);
        }
      }
    }
    const recomputedMatrixHash =
      sha256HkVisualizationDependentTransitionManifestCanonical({
        contractVersion: entry.schemaVersion,
        kind: "dependent-transition-visible-math-projection-matrix",
        sequenceId: entry.sequenceId,
        topologies: compactProjectionTopologies(entry.visibleMathProjectionTopologies),
      });
    if (recomputedMatrixHash !== entry.projectionMatrixHash) {
      throw new Error(`${label}.projectionMatrixHash exact manifest content drifted.`);
    }
    if (sequenceIds.has(entry.sequenceId) || planHashes.has(entry.planHash)) {
      throw new Error(`${label} exact manifest identity or hash is duplicated.`);
    }
    sequenceIds.add(entry.sequenceId);
    planHashes.add(entry.planHash);
    if (
      JSON.stringify(entry) !==
      JSON.stringify(HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS[index])
    ) {
      throw new Error(`${label} exact manifest order, topology, or hash drifted.`);
    }
  });
}

assertExactHkVisualizationDependentTransitionSourcePlanManifest(
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS,
);

export const HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID =
  Object.freeze(Object.fromEntries(
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS.map((entry) => [
      entry.sequenceId,
      entry,
    ]),
  ));
