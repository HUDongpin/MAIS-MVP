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
    "planHash": "dc32ab0ea2af63b0771dd285e6f0557a96bf184013a06b76ac1d916527c2182a",
    "projectionMatrixHash": "380b2af309444ac244fcb312b6cd518f5a301e3304c158bde035786145544489",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p1-number-bond-known-part",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "fea019bf3ebe9461971c36c647baddce420c9ba996b1d906966e270b6a9df6c7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "fea019bf3ebe9461971c36c647baddce420c9ba996b1d906966e270b6a9df6c7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "fea019bf3ebe9461971c36c647baddce420c9ba996b1d906966e270b6a9df6c7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "fea019bf3ebe9461971c36c647baddce420c9ba996b1d906966e270b6a9df6c7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "fea019bf3ebe9461971c36c647baddce420c9ba996b1d906966e270b6a9df6c7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "c9efddebda71892e75f01de9b7cc32adad0badd11492154b33782961f83e5285",
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
            "776445dd16a73b33454bc4e8d85ad942955902bcf042bd548111c5b6d753dca3",
            "4e76b9273072f8b4b8a6c1728dcd66497d1928e5f6b763170effd8bde590507f",
            "caa5fa402013bbb79c7fc2c58f4b2834a74d4f54710b2b0f9796d5996ea8d683",
            "b8520869cae35c192447ae50613c57ed4f50d59c1dac8de2e873f8b8a918b52e",
            "776445dd16a73b33454bc4e8d85ad942955902bcf042bd548111c5b6d753dca3"
          ],
          "projectionHashesHash": "3b4fff9bbd03f71bee490a151016f496fbc888fad758ef7bb7eb4685894efc15",
          "topologyHash": "a5a4091370517ae000e4dd48af56e19386d1b3efc09d391e24022520b6351ecb",
          "totalElementCount": 175
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "f3d7779f99948b140f06b66512e52ff09b34989b100bc14bd2d9d136c6f34474",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "f3d7779f99948b140f06b66512e52ff09b34989b100bc14bd2d9d136c6f34474",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "f3d7779f99948b140f06b66512e52ff09b34989b100bc14bd2d9d136c6f34474",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "f3d7779f99948b140f06b66512e52ff09b34989b100bc14bd2d9d136c6f34474",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "f3d7779f99948b140f06b66512e52ff09b34989b100bc14bd2d9d136c6f34474",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "ea0887d2ab1ce341f02245f1531c5585d0787615f1c01aa76b5b2297629058ca",
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
            "24a175a05b54e6475a8cef64eb6c61c62810e6a4bc42f0d3a64dbb43f5ed90b1",
            "19ff20d25d25a27820cc42751d17d3adf4fff68b1151f7afaeb0325a079c7f20",
            "29189ac2870b2cf4bc25e67b21167c504e9e5988297853166b4a48b1d0a2293e",
            "dbc66df80bd06b72b00b6e350c163608df43fc6105fd50e3be7338daf03b30f8",
            "24a175a05b54e6475a8cef64eb6c61c62810e6a4bc42f0d3a64dbb43f5ed90b1"
          ],
          "projectionHashesHash": "d91c7e0dd394b0d9f2bb3a1243328a34c909358b4ddf61f68db8d23d876aa437",
          "topologyHash": "1a755c0c94fa05f7d5b79e69abcdf191161870685314fb15fc7a2aef10a93a4f",
          "totalElementCount": 175
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "080d0ce7deefff5358f3160f7f082a9f31193da04996a61ce745ebf08a62dfd7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "080d0ce7deefff5358f3160f7f082a9f31193da04996a61ce745ebf08a62dfd7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "080d0ce7deefff5358f3160f7f082a9f31193da04996a61ce745ebf08a62dfd7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "080d0ce7deefff5358f3160f7f082a9f31193da04996a61ce745ebf08a62dfd7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "080d0ce7deefff5358f3160f7f082a9f31193da04996a61ce745ebf08a62dfd7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "089614680933fceaea4e9d651e07089e7fbe88711ffff927af3a8ea529be856d",
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
            "918f9c4c3a94cb343e38fea96e6e7864cba3f08556886104e13c4dd8e51e1775",
            "902ab26bf7e0593e9112992439c4a015a3d17de977244ead9a4aead5576e550f",
            "1eab3c937f32444b7fd019f796ab30e990a4ddbb9288e97a1c1fec108dbb3fe0",
            "3a733e890d93e3cea51c4e21dfe459f0eca32e5491646390903b255b5a922a25",
            "918f9c4c3a94cb343e38fea96e6e7864cba3f08556886104e13c4dd8e51e1775"
          ],
          "projectionHashesHash": "6bdc3cdd9d46a46579cb33578bf8fd4c5c968ceee7617487cad1b8328984eb2d",
          "topologyHash": "6658caf48f6f59b9a3e5d8c689332d37e013ffa10b55e67049ac2a7f506f0415",
          "totalElementCount": 175
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "250334108229da43e8ba05d7b3fbd56d2cd5a9a2961937245af62d8f3cd3cb38",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "250334108229da43e8ba05d7b3fbd56d2cd5a9a2961937245af62d8f3cd3cb38",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "250334108229da43e8ba05d7b3fbd56d2cd5a9a2961937245af62d8f3cd3cb38",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "250334108229da43e8ba05d7b3fbd56d2cd5a9a2961937245af62d8f3cd3cb38",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "250334108229da43e8ba05d7b3fbd56d2cd5a9a2961937245af62d8f3cd3cb38",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "d056a89200e071f94d753e5f98846689533527c5b68e81ddce28ffe99a756e01",
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
            "0acb80f1dcc792daad9321e8850c55ad3a073d04b473233eb8091b88cf2c1615",
            "622ab8845bd00214ad752639e66e01e00a3a8840eb4bfd573bc3764b23333d89",
            "0aac1f87eb3e46bb9b177cfa12853fae59f03d78b5cfad1478cdd6b5185e1a8a",
            "e02d7c7d991266d46cd72ff30835d6eefdab5ca4a9b47d3e48af818e11789b45",
            "0acb80f1dcc792daad9321e8850c55ad3a073d04b473233eb8091b88cf2c1615"
          ],
          "projectionHashesHash": "7eb5daa27664418d31549c1453f4477fb52938a247034cf88b32f7578cd32348",
          "topologyHash": "4dfebc848a75794694584a945299218d01ced007ba65275388c226097b0cb7ce",
          "totalElementCount": 175
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "5dd275127fb2c0378664278268b05f87dba1c2bf1e5b2431db41fd08572e46c1",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "5dd275127fb2c0378664278268b05f87dba1c2bf1e5b2431db41fd08572e46c1",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "5dd275127fb2c0378664278268b05f87dba1c2bf1e5b2431db41fd08572e46c1",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "5dd275127fb2c0378664278268b05f87dba1c2bf1e5b2431db41fd08572e46c1",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 246,
              "hash": "5dd275127fb2c0378664278268b05f87dba1c2bf1e5b2431db41fd08572e46c1",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "dceb49167cb1947793ed9af09c8b34d31d3248b2b573407c1a710109b2035d13",
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
            "c1d4d9b7e4582b6063ea38a4bfbb4ca465c284557de369930545b249e496c459",
            "0df3e494f525043aad097ed9b605f300fc57b0bed2e7540ffe95c7e70c754c99",
            "d4d3a8cf2370809f98cbf36d40e357e12305c54c0f479f5fae00f383d7abf9f0",
            "c0975ae930bccd61404e3a162cdb272e0405ef0067e70692d41465893d2bcc5c",
            "c1d4d9b7e4582b6063ea38a4bfbb4ca465c284557de369930545b249e496c459"
          ],
          "projectionHashesHash": "08d2a6779fcac46d5a90c33b617b81d41d1ee2fe45e79e08ca0bf85d67f4eafa",
          "topologyHash": "9a625d6fb4fe8d16ec51ff626d0e8569e313dd8e2abc4eae129a280543d1d7ab",
          "totalElementCount": 175
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "1ecc7884679980b885f09750b916357b097f71ab0fae026bb8e64d458da1407c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "1ecc7884679980b885f09750b916357b097f71ab0fae026bb8e64d458da1407c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "1ecc7884679980b885f09750b916357b097f71ab0fae026bb8e64d458da1407c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "1ecc7884679980b885f09750b916357b097f71ab0fae026bb8e64d458da1407c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            },
            {
              "chainCount": 78,
              "contractCount": 6,
              "entryCount": 240,
              "hash": "1ecc7884679980b885f09750b916357b097f71ab0fae026bb8e64d458da1407c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 18
            }
          ],
          "ancestryScaleSummariesHash": "7d81369f16da21f5883a5b796bcd285108b0fc149747c5380edbe7f36bfbc3e2",
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
            "3b4e87f61be8d3eb39326acfbf422e2e13a6a3bc0f4f76f93c117f283c1f7508",
            "73acb3ec11213dbeb9139599ed89a575771786d0465dcfa29e4a0eca8c8ac00b",
            "49ce6eb99704ec8515cd0caa87b24fe5b1f4d2f4f5bfaa3dcc7c12db94e745fb",
            "d99b0dc05f019f27763cc53d685f6009f62987604a007d678ac806127a1d57db",
            "3b4e87f61be8d3eb39326acfbf422e2e13a6a3bc0f4f76f93c117f283c1f7508"
          ],
          "projectionHashesHash": "1430d2a04cdc0ba25346d8433b53f14333d34d2ba5b3159d9c312ad62e48d979",
          "topologyHash": "b2e668bd1734175cb8a181173e3a456a6afc533303dd7b58b004e7fc1a546376",
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
    "planHash": "21f956ba3b255be8340c7ff67be309b34730aab289589b4205cda4adf1e17bcb",
    "projectionMatrixHash": "627cdb326e5d8353b25a58c264bf2bca9cf9387264e46626dfec7266458290d4",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p1-add-step",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "946acd24435ef60ed429020675dcb83eb37673f75a16b2dfa635679e5c7112b0",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "946acd24435ef60ed429020675dcb83eb37673f75a16b2dfa635679e5c7112b0",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "d6fcd73b3f3b18e209a527c0e33aef3da82246a1fc9b41db8704cb182e5fad2b",
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
            "84b2ecf747e4fa934b9dc231e35d5e22d7f6f3086857e17698911e7ef6be7632",
            "286cf0e63d7b821ebeeacc9ea8311e5add66704bf787e0b79b1ffbb93a2f76e4",
            "c5b8ad42ac05c1b3e183ab846a0a3ec3c60c24a84d858cafebebd83f7e6939db",
            "83cee1fbc1d55258a9ec23f9413d26c85dc104ffcc4c218856eb11eadf7a6f60",
            "84b2ecf747e4fa934b9dc231e35d5e22d7f6f3086857e17698911e7ef6be7632"
          ],
          "projectionHashesHash": "699d94e938411bf519d621b6bebb3acaf0087be83aae99bf8771667d271d15ce",
          "topologyHash": "9e2e63e8b0a02e5f162d9ae33aeaa957ee1628276ca9ace09ec0544ecb15e735",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f0203dc4a90ad8cc9d34d06dfa4ce36045c70f4c239a6ee7a9fae32b74ece2d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f0203dc4a90ad8cc9d34d06dfa4ce36045c70f4c239a6ee7a9fae32b74ece2d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "e49c6e29ac8dbbe8a2f5e38ab7333b96abd44742bef10320efb488d956a56c75",
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
            "8476066db83671fa607a33520c038449e5a0f52a3984299502a923b22db84c1e",
            "f66df7c4ecfc1f347af0479388624770942be311c61e4e862107d4bc49b27a7b",
            "b9269c1e2e44ea72220bc8a4eef21fcef06742ccc330c8eb5b0fedf6bea82f65",
            "247572c4aa866b6679a8f458ef5ce6a9ca3283e48eff5a7a8e4b9e3aceb025d1",
            "8476066db83671fa607a33520c038449e5a0f52a3984299502a923b22db84c1e"
          ],
          "projectionHashesHash": "3155082c350f688c352b18b26780d5d93a596139c7878880c6ee8aad1544daa1",
          "topologyHash": "f6fd511f9ac682cb1948d3d09b5543a325336ee065d991516b4043f7f9d97493",
          "totalElementCount": 14
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "aa03f947e2d1789be46b36668997001c68bbf0c1527eb7548d2bfcdec0067c61",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "aa03f947e2d1789be46b36668997001c68bbf0c1527eb7548d2bfcdec0067c61",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "6bc71c4139b5a60f9c3513100a69641c9af7dfc5b1b0b5652bd58810a56be706",
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
            "129bc385f7c1cb4aa143b4dcc4057d1b1f1107548506a658090f3b67abe67b77",
            "579d6be4fd0ae309524b5bfc61a68fe33331d47d6553c88f528d64a3aec678ea",
            "23bf3d15ceb25e1d3ff17bd8b4ab7501a1a02f8fd6621bf001c33b9eebb7365b",
            "7607bec462c33caee1662b2a1dae75314e50ed6a0baffffef4a251f39aa9690c",
            "129bc385f7c1cb4aa143b4dcc4057d1b1f1107548506a658090f3b67abe67b77"
          ],
          "projectionHashesHash": "0ef3195c9ffa3547cf923edc4dd31fa232c2c40bf9d66bfaaa24565079ac6fb6",
          "topologyHash": "18c0f2a13414d230dad28cdc12b623b280666d3c7e12569aabb3dea65f20a907",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f1945f0b2c78e6b608b782c4948d7a132820e093ffff44f991e4e14abaaf9a09",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f1945f0b2c78e6b608b782c4948d7a132820e093ffff44f991e4e14abaaf9a09",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "32e4992554a72a761a3a28909829035ca40ba34b2cf07d984db8c1753e8a4d7b",
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
            "7bc0abf7dc64f9f9071906aff7bb81a736cba225f3c02be7cce88eb6f2fe6397",
            "cccb6026d9988f9f708e2f55f7f0667294ce8f8335c2dbcd7985d6957c7cda80",
            "17b5114892138ef89072603433fbefe7d37a70ab6ea4a0aa7b583f26433abfa4",
            "595ea901241fe8354082a4499a1033940ba869eaec46dc6e888fe92cccf9d2a2",
            "7bc0abf7dc64f9f9071906aff7bb81a736cba225f3c02be7cce88eb6f2fe6397"
          ],
          "projectionHashesHash": "b718d68a71b7d43aeb59048f8b000839cdb8647511ddb931fbae440a6f808a2b",
          "topologyHash": "c5479f2e042248c2db5fdac2c325db3ebe8c1dee6494ece8780c5c6aab4f7242",
          "totalElementCount": 14
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "b9240ac4adf3bdaa85ac55ef293f3df0cdc21e88bf8483a742eb543e349f91da",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "b9240ac4adf3bdaa85ac55ef293f3df0cdc21e88bf8483a742eb543e349f91da",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "bdcd88bcca05dc64791cc76c5b571ada0a624925798dc4628e85e9e66dd5b6d3",
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
            "410d15a83996950c0f536a9963134a107e4f20d66d50f7b873f98de7b1462e36",
            "e043818015d18c1e3924e70038d0f6b14e89d53896b4d995bcb235dcf346f97b",
            "d63e224c14513d01d38dbab84887ecf903c31ff636959115bd4c143f6d1edd96",
            "e12db51586b0c9ac9ce0894766b97ccd02ac103f56f567cc29b8f5c367979c9e",
            "410d15a83996950c0f536a9963134a107e4f20d66d50f7b873f98de7b1462e36"
          ],
          "projectionHashesHash": "0166b603581069bacb352d8b3e2e432ba4b2a4753b77c52841d7a0ccb1587ac9",
          "topologyHash": "589dda24170c0dcaf78b05b65de50440d23354242e834636d5ff9c19e2a99d49",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "6c5273c1ae9b71e73387c37ca95a8d420af64d5e2ad448c2d7a9da3488d632c6",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "6c5273c1ae9b71e73387c37ca95a8d420af64d5e2ad448c2d7a9da3488d632c6",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "4c57eac1a4a4aae6460ff10436f90e87dd1acc3b9d2f08ab82937e5e0dae5f8b",
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
            "96fa2b16d92a7c284f77d9e694e0c8d633561b6f110e376bebebd71c52e6262b",
            "af95808814f8cf193943be1368e524f254a47df86b581508745f385124c609a6",
            "f800bebe688bdc76011554ed7a313c5f910ad161f29f084e994d4a84b2731c34",
            "7d0cdb86de1062277bf69de1ab2dcdc0a1856bd9f44b13fb2ce0a5b76c5922be",
            "96fa2b16d92a7c284f77d9e694e0c8d633561b6f110e376bebebd71c52e6262b"
          ],
          "projectionHashesHash": "fce72edbe19e4f571ad3af3ebf944c92ebdab1147705b6837aeeb0eb18c130e1",
          "topologyHash": "fcfcddc9ffb78a2e5d3a2b97643af1ce3b376d9320ec94931458c47c34d7f14b",
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
    "planHash": "5931b42cfa76980d33b87db097ae04ea1b816355cfa781decaf9fbe88b2d4791",
    "projectionMatrixHash": "9a1dbd56801f11939a75738d78c329f97a01521cac77d3036efa7fa023dd62f3",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p1-subtract-step",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "946acd24435ef60ed429020675dcb83eb37673f75a16b2dfa635679e5c7112b0",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "946acd24435ef60ed429020675dcb83eb37673f75a16b2dfa635679e5c7112b0",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "4374a9f197e84bc08ad84428288d588d916fc1dbf24864edc39d252cd5ba1115",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "bb670bd752041538f331d692b88d28bdda2c1122974252e50f3095bb2ffe5964",
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
            "84b2ecf747e4fa934b9dc231e35d5e22d7f6f3086857e17698911e7ef6be7632",
            "95544078a790d05c18ca70e79bc8329303a30f5f701c05285820b541cd5d0136",
            "83cee1fbc1d55258a9ec23f9413d26c85dc104ffcc4c218856eb11eadf7a6f60",
            "c5b8ad42ac05c1b3e183ab846a0a3ec3c60c24a84d858cafebebd83f7e6939db",
            "84b2ecf747e4fa934b9dc231e35d5e22d7f6f3086857e17698911e7ef6be7632"
          ],
          "projectionHashesHash": "b03473b3b0f30f781c4c2b56913c5e8defe3964c240f740fd09dd0fb3588aeca",
          "topologyHash": "478249604ee0f2c03bee663c8eb1b6bf00a023d534c1a002bf03ed8344b83493",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f0203dc4a90ad8cc9d34d06dfa4ce36045c70f4c239a6ee7a9fae32b74ece2d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f0203dc4a90ad8cc9d34d06dfa4ce36045c70f4c239a6ee7a9fae32b74ece2d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "735cd730324121a74425dfdbb8087731fe420d7e8e40bc9dafa3a5cbed742bad",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "a923c56350b771ea8b0a57675dcdf148017e7959ece162a14260a6e4aac63905",
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
            "8476066db83671fa607a33520c038449e5a0f52a3984299502a923b22db84c1e",
            "bc794d54fad3123e2062d36d99f15a83ba4275216c98934397ebbd2b5f9947cf",
            "247572c4aa866b6679a8f458ef5ce6a9ca3283e48eff5a7a8e4b9e3aceb025d1",
            "b9269c1e2e44ea72220bc8a4eef21fcef06742ccc330c8eb5b0fedf6bea82f65",
            "8476066db83671fa607a33520c038449e5a0f52a3984299502a923b22db84c1e"
          ],
          "projectionHashesHash": "6f6a6c9e84890a7a23b7e28c0e18ab00466dd7c9ce2ead3e2f19ec8ec79dd118",
          "topologyHash": "9d7bcf52f273e33856900354c85aaa5d1ed0183d523148e8f5c35d264f5e669d",
          "totalElementCount": 14
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "aa03f947e2d1789be46b36668997001c68bbf0c1527eb7548d2bfcdec0067c61",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "aa03f947e2d1789be46b36668997001c68bbf0c1527eb7548d2bfcdec0067c61",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "32fef0a249bcdd2ff70e0b1ab5af2174390f11cb822a1de449ca69c07c1e23d3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "d5f51a6479d95842d07bcee9d291772fc1c832d497da00ee9f75fd40a765070a",
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
            "129bc385f7c1cb4aa143b4dcc4057d1b1f1107548506a658090f3b67abe67b77",
            "fdd5c06523cc1f2e516b01e37231703585b34d49696a0ecabc9052e8dd549f66",
            "7607bec462c33caee1662b2a1dae75314e50ed6a0baffffef4a251f39aa9690c",
            "23bf3d15ceb25e1d3ff17bd8b4ab7501a1a02f8fd6621bf001c33b9eebb7365b",
            "129bc385f7c1cb4aa143b4dcc4057d1b1f1107548506a658090f3b67abe67b77"
          ],
          "projectionHashesHash": "3e4f63eca997544ada2e101e28f9f3a7660004aae7448dc178a9fb78e924e9e9",
          "topologyHash": "19e91c046e448652028e75bcb52610043ee3265630585e4a3440a28d807acfbb",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f1945f0b2c78e6b608b782c4948d7a132820e093ffff44f991e4e14abaaf9a09",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "f1945f0b2c78e6b608b782c4948d7a132820e093ffff44f991e4e14abaaf9a09",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "73c05f4a279187625359e04afe8ecac3eed15bb87827f42b48b6f4d1babd1803",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "1ec0ec9cc5a3a1b78b48e1f008112fdb2f9bb7ecd96ac4190611b29793c72c83",
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
            "7bc0abf7dc64f9f9071906aff7bb81a736cba225f3c02be7cce88eb6f2fe6397",
            "82551f8d2afe5e77d8b287d99a9dde543817aea3afaafaea028a2c832365ea7b",
            "595ea901241fe8354082a4499a1033940ba869eaec46dc6e888fe92cccf9d2a2",
            "17b5114892138ef89072603433fbefe7d37a70ab6ea4a0aa7b583f26433abfa4",
            "7bc0abf7dc64f9f9071906aff7bb81a736cba225f3c02be7cce88eb6f2fe6397"
          ],
          "projectionHashesHash": "eed61deb8297da6ba2674bd7d04b5c8af1213ae75b766c96b809c03369413c50",
          "topologyHash": "3e14e330cbc7587c974546ceb630b97ab3c3db38c5e32b06fcb24a2eb578198e",
          "totalElementCount": 14
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "b9240ac4adf3bdaa85ac55ef293f3df0cdc21e88bf8483a742eb543e349f91da",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "b9240ac4adf3bdaa85ac55ef293f3df0cdc21e88bf8483a742eb543e349f91da",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "7e1fb775662eda65927175daa258453b60b91d2b2f61501d4025d43e86472cae",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "c3a7390067db261e843fc8482d95d7827fea3b79a9e6a2f13644b7c30c5ccac8",
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
            "410d15a83996950c0f536a9963134a107e4f20d66d50f7b873f98de7b1462e36",
            "047e6efd9eacb87df69c72ae902d3f99a66a084cdae6a55b7ba0f9460576538a",
            "e12db51586b0c9ac9ce0894766b97ccd02ac103f56f567cc29b8f5c367979c9e",
            "d63e224c14513d01d38dbab84887ecf903c31ff636959115bd4c143f6d1edd96",
            "410d15a83996950c0f536a9963134a107e4f20d66d50f7b873f98de7b1462e36"
          ],
          "projectionHashesHash": "e5f152b7bada711dbc105b59daec5210f7fbc86b2193410bdf822438961a58a0",
          "topologyHash": "3e03f108486371d189ff4c260d4482e9c9d41afdfaf8ba5ce03c78ad2d23cf24",
          "totalElementCount": 14
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "6c5273c1ae9b71e73387c37ca95a8d420af64d5e2ad448c2d7a9da3488d632c6",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "6c5273c1ae9b71e73387c37ca95a8d420af64d5e2ad448c2d7a9da3488d632c6",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "dc548c5b325bb3547943816280b0702ad36ce976876b0fa894c30622875ca885",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "3bd2e3ae165cb5804478d07c5a682115ebbbedbf2ab86f0be54fa53940e5dbdc",
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
            "96fa2b16d92a7c284f77d9e694e0c8d633561b6f110e376bebebd71c52e6262b",
            "f9bf5bf892b63d919cfb67fe31eb2b6d2b60d93727589a4a6bf13b8ebc1a7fca",
            "7d0cdb86de1062277bf69de1ab2dcdc0a1856bd9f44b13fb2ce0a5b76c5922be",
            "f800bebe688bdc76011554ed7a313c5f910ad161f29f084e994d4a84b2731c34",
            "96fa2b16d92a7c284f77d9e694e0c8d633561b6f110e376bebebd71c52e6262b"
          ],
          "projectionHashesHash": "832b7f4b83943fd0bb3186ff63c24704a0155ce778f3f391f2aab89d92e05b6f",
          "topologyHash": "90099c0c533c2984b8c894bd3595a3929ff50130cd00f9bbf0a5baf32f7913a8",
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
    "planHash": "fb0eb56bafbb02cac0346b0c030f878e81abe0b7d4ac41cace52a6c3d1586366",
    "projectionMatrixHash": "dd095cec1e11da0d3128c40a1d0a45275bf67ecfad0b67459b26a5bd0b846c6e",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p2-payment-at-least-price",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "1ac1adc9ecf49386e18420a737cff326b523ed91b5e29d35367400a7e289cb5c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "4e3605dcee6dc4231f50d015a47124d4dc0f00ece5d970c7720449ae8c91d4d8",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "4e3605dcee6dc4231f50d015a47124d4dc0f00ece5d970c7720449ae8c91d4d8",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "1ac1adc9ecf49386e18420a737cff326b523ed91b5e29d35367400a7e289cb5c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "1ac1adc9ecf49386e18420a737cff326b523ed91b5e29d35367400a7e289cb5c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "9488517d9e11a355c1890317fe9057fcd71f365835ca110943571a55b2fbfa9f",
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
            "cba529629f4d51ca773dbd9852789de1760c77ee7b2a952a0e44b88dd55f1a5d",
            "a2066d2d6e5741bb6a10a59ddcc93fadded23c00b702b004865bdb1da4793fa4",
            "d43440b2bf73f53efadcfd982f08d5e4ad3298051c7c959a0988e1862a960c6e",
            "f0c44c5e3c9e09dc65b52468b7dbd5431fcbc6fbfce19b94c98281ca8360142e",
            "cba529629f4d51ca773dbd9852789de1760c77ee7b2a952a0e44b88dd55f1a5d"
          ],
          "projectionHashesHash": "52ba3f0904f59c2a93e39ccdd16488be3ee44be2ee7fd477a8ef7158d39b7038",
          "topologyHash": "374cde54f6efdfbbb29517547f01fb0ebdb405c493707cf65118a0670973eba8",
          "totalElementCount": 28
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "d4e007c3c5ba9613a0f4aa63acfd6c0e1915909555f713d66804762d7a6876fb",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "32e5f6232a764f71f4b3ed5e7866dbbab4e65c51d776707e1325fc841578587e",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "32e5f6232a764f71f4b3ed5e7866dbbab4e65c51d776707e1325fc841578587e",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "d4e007c3c5ba9613a0f4aa63acfd6c0e1915909555f713d66804762d7a6876fb",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "d4e007c3c5ba9613a0f4aa63acfd6c0e1915909555f713d66804762d7a6876fb",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "ce1888d17eac089482b234ceb6b44e4dee061c249ed834d3d1a95f87411e0420",
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
            "dc29549a40b188ccb565b64d0edd20dfd739619cc64b47c95dfabe75d006e12e",
            "c72c8feddc83e89abaccf636884d12af0beb2ecc41abf1c65afa0cb0aebc0798",
            "28eeee4a5bafa12f10aa63edc9a5a5738b2afa4144a7393a05d8b22a1e89a4e3",
            "69428c32cc001d2a07ed56c7c5da9ef2edbf3c88a4d601c94fa520c521939992",
            "dc29549a40b188ccb565b64d0edd20dfd739619cc64b47c95dfabe75d006e12e"
          ],
          "projectionHashesHash": "cb6d06a07a7ab8e76be44ea7777b51c76d084df69b9d414113987c18324d80bf",
          "topologyHash": "59fe0db1d38445ed1537fabf546f09a78e22494f9aae3ddcfab10957fdca50a6",
          "totalElementCount": 28
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "0653c20bf6997660e74b51e03318d6c2d36ae6e01d4174a7f34fe06e9e66fd45",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "7963e463b3aa7a0f062343c3ee272c760945cb01ee4a088699748bfd7fbae4e8",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "7963e463b3aa7a0f062343c3ee272c760945cb01ee4a088699748bfd7fbae4e8",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "0653c20bf6997660e74b51e03318d6c2d36ae6e01d4174a7f34fe06e9e66fd45",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "0653c20bf6997660e74b51e03318d6c2d36ae6e01d4174a7f34fe06e9e66fd45",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "c36cde11edc55b6f4a5f86b1e2e1ef4b21e5460a7f49e41fd9a60b040b938109",
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
            "dddd5ebfd721adccbc58e9222b6927463bff5d17bf33e3f5bbec0717e87307f8",
            "00efa665f23f9abf1b9f34893dd05e6d75b0eaf4d7dc6cf93337248ad2422950",
            "0c3a0ed9251b3172c23a1965a634118ee2b1a03e688b15b781013c6abc015fe4",
            "1a22216f48ba2e16277923520bc16e0602ff5584049e9f5f4cc77b118efadc67",
            "dddd5ebfd721adccbc58e9222b6927463bff5d17bf33e3f5bbec0717e87307f8"
          ],
          "projectionHashesHash": "d9bacece2091ca55a8f291d68ec7e5270ce42ef9e26a569690ccd7d638ff707c",
          "topologyHash": "bfb78b4e85688b5f09022b5437edb4b7e8dc932d151042cf58aaba2df0d5a380",
          "totalElementCount": 28
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "9f9fa2157bdaa54593b797616170eed11144e24616c26d70c30c396cc64e07a4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "b50df6b064e8d079591accc2f342bcca826583ccd8456bd48bec59813e303875",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "b50df6b064e8d079591accc2f342bcca826583ccd8456bd48bec59813e303875",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "9f9fa2157bdaa54593b797616170eed11144e24616c26d70c30c396cc64e07a4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "9f9fa2157bdaa54593b797616170eed11144e24616c26d70c30c396cc64e07a4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "c4b73c6b1ccb9e52fbce41fbac19a547be1103021acfd0af8df94379c3ed0c6c",
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
            "b2d27ac56f28e0b08103f82f75eb78c9cb017f27d362ddfca850a9ca0c2f1297",
            "23448a6b80e2327e12ed0082e1de859276218a4ffce54452d71d9a6b69a88583",
            "171a5e825d5b29a876ba572c3f460cebba04e0b8a456432069ef00f9d1c38f7e",
            "1e157aca8a7d83bb63b5c183b0437b4004acf26389c6aff9243520044855368f",
            "b2d27ac56f28e0b08103f82f75eb78c9cb017f27d362ddfca850a9ca0c2f1297"
          ],
          "projectionHashesHash": "8ded0da2e3529ed3666818e5c8f5dd3bac8603d1b661b6de1626f59e76b771b6",
          "topologyHash": "3403a57b545b527ec2c399661df86bf5c746abbfc224f3e51b4e083fbccf220d",
          "totalElementCount": 28
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "3fecc746f4423cd7a159a81ddae86cfe2867aa21434bf23b57d430c0faf6f0f3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "5f99e5dd8061db6bc99c65def93cfe489ffcba757ab38f35ef4b5b2dd18bbf0d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 82,
              "hash": "5f99e5dd8061db6bc99c65def93cfe489ffcba757ab38f35ef4b5b2dd18bbf0d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "3fecc746f4423cd7a159a81ddae86cfe2867aa21434bf23b57d430c0faf6f0f3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "3fecc746f4423cd7a159a81ddae86cfe2867aa21434bf23b57d430c0faf6f0f3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "c8352f25c20527095d2ed18bce8895e431cf4e8b0e4502f06f73dadd778199fb",
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
            "6ed391e59ba7ec43745068cc29a7355be0d3d8b7708bba3d06aa4a34086d3d79",
            "f6683134a6f7caf10d3d3fac8922a4671d846b754f6eee872ee585cecb4919fe",
            "b1fcdec8258f1fd56fa78906916f5a140d8732cef137b42baff605fc2ec1f76b",
            "790f0b686bb8cd09b9dc343be4f06be015f87df1514eede5e640c1cc5daa6fbb",
            "6ed391e59ba7ec43745068cc29a7355be0d3d8b7708bba3d06aa4a34086d3d79"
          ],
          "projectionHashesHash": "fb05707531c01d091e0b35210fe43642f87ddddc1da13d1212e4e7565b818783",
          "topologyHash": "860f0da310bcd37eadd1c0e12c598467a544fa60257bc6b60c2d98bdc4861063",
          "totalElementCount": 28
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "37b40fbeb1d50fd11e6037617bb07718f0cb8886d10435fe37130c92c77338ce",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "b53e77b0ca4c9c379f5b40df300046f5b059a1cba9f8a77eb8f58d95dc3daf1a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 26,
              "contractCount": 2,
              "entryCount": 80,
              "hash": "b53e77b0ca4c9c379f5b40df300046f5b059a1cba9f8a77eb8f58d95dc3daf1a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 6
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "37b40fbeb1d50fd11e6037617bb07718f0cb8886d10435fe37130c92c77338ce",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "37b40fbeb1d50fd11e6037617bb07718f0cb8886d10435fe37130c92c77338ce",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "0aff8748ee13e1aebef0c13374c4b774f2aea543e54a70124663a98bcf8f1afa",
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
            "7fafab9fe3e72f237cadf74200001354a58d74f5207e03b15bb61db29871c962",
            "c505187e83d602251559860785bbc4cc257f63d7c163ec3a0d25e555867b6423",
            "bb54391df47486021d9fffe1c577fe5aa0978d1af1f74a5a0d92af961128e1c8",
            "c29eefbf74723a1fb5cf663d66f7de9e354c716e45aff9ec8714b6ca31e451a5",
            "7fafab9fe3e72f237cadf74200001354a58d74f5207e03b15bb61db29871c962"
          ],
          "projectionHashesHash": "7ed2e002778a88c2f59749cf87c170e3549625bba03541c7ad35f6c1832bda52",
          "topologyHash": "84b70fa7f2d4ebbfa2a40cab24eff0bf7ed5e1f54d559ca69c49560d02792420",
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
    "planHash": "0d732fdd401116ded301ffe5c61502af226d06274f3bf072174923cb14fcff43",
    "projectionMatrixHash": "8f4858d5957cd469d8ebfa6515457baf5c40d93c08314d69236742f4e09a5b97",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p4-divisor-within-number",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5add2f760ff812afd3f9b6c1b2d6d2bc3d07d0cd412daedce385d158f2c36098",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5add2f760ff812afd3f9b6c1b2d6d2bc3d07d0cd412daedce385d158f2c36098",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5add2f760ff812afd3f9b6c1b2d6d2bc3d07d0cd412daedce385d158f2c36098",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5add2f760ff812afd3f9b6c1b2d6d2bc3d07d0cd412daedce385d158f2c36098",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5add2f760ff812afd3f9b6c1b2d6d2bc3d07d0cd412daedce385d158f2c36098",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "4de33be32847a8558f2dc661ef681f22fd37a27b8fbd7edd27797dbda95f7f8c",
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
            "927578ccd0152da8c88fd0fe5dcb549706e9e974148b868a0b8fc4071a208d7c",
            "4e42371cde704f4bb782f49d3dc5bcab023590c2ca638511c72e2a44f0f832a7",
            "d401d1e4f641088dbc5239b9e56387791a551cca343b3d44d391a2d1bb16f2cf",
            "7111ac25131bd8ba30b047041380b4cdb7741f61bc587c7326f8e14855bc4e9a",
            "927578ccd0152da8c88fd0fe5dcb549706e9e974148b868a0b8fc4071a208d7c"
          ],
          "projectionHashesHash": "95a84fc78c40352c6530f448755379a003241e159755469adc68a41eac9ff14a",
          "topologyHash": "f3819169919f736409a6c8bbd6f158fd316887dc0989056f6a4fdec143f1c0c5",
          "totalElementCount": 98
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "985ade97fa6317f6b9d1c8a6a105f97cdb96a20a7193bd410e12b0a48f4b2715",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "985ade97fa6317f6b9d1c8a6a105f97cdb96a20a7193bd410e12b0a48f4b2715",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "985ade97fa6317f6b9d1c8a6a105f97cdb96a20a7193bd410e12b0a48f4b2715",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "985ade97fa6317f6b9d1c8a6a105f97cdb96a20a7193bd410e12b0a48f4b2715",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "985ade97fa6317f6b9d1c8a6a105f97cdb96a20a7193bd410e12b0a48f4b2715",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "39979f18a8b72ee92a359a293303d1a50292ba55f321068dd087c09e5f87a9df",
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
            "39cce48faf742a9aca714eed9e01a7a35cc0d0ab26d6362cae70b65d4c5b028a",
            "84feab473390aa94958593aff50cff832118a8dfa279718ef68f7f2ad5136ab3",
            "ff92a63874e412ecf617b0ca81daa82716e65205e41fb2eeaf7795f991e0a333",
            "7e6352999700c5d0863a4ce9e27fdfc25b82a18bdabc6ecd46926408578764f5",
            "39cce48faf742a9aca714eed9e01a7a35cc0d0ab26d6362cae70b65d4c5b028a"
          ],
          "projectionHashesHash": "c04972b535a7362f490f115b69b7b9c83df2d5eab2c586b8c12a0bfe1d695ae1",
          "topologyHash": "3e20cc41636b417ad312f18375f5d5932ce80e0f13b044004b0d86dc489343ad",
          "totalElementCount": 98
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5400f3cbf1b04b1c227f306f1424e01731eb014cd6e3c804f5bac20a657dfecd",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5400f3cbf1b04b1c227f306f1424e01731eb014cd6e3c804f5bac20a657dfecd",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5400f3cbf1b04b1c227f306f1424e01731eb014cd6e3c804f5bac20a657dfecd",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5400f3cbf1b04b1c227f306f1424e01731eb014cd6e3c804f5bac20a657dfecd",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "5400f3cbf1b04b1c227f306f1424e01731eb014cd6e3c804f5bac20a657dfecd",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "49bfb4fedf402bf5a329f543d520d8d3c03be9650fb78872686def8fe2309691",
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
            "4cd24dcb831ad3b97f67ef4be4b02f9672851b3d0967f2eb46851292d86b752f",
            "1e1dc43609a31445c73e0f1924cfe1afdb10608d3bef72711a65adb197d14e32",
            "ae6d351a82e257a9663f750015e26729c2a5ef29db4a44a4777297d1ff17a83d",
            "170bdc01fa0d791d75c6ce3b835383fd223d9ef04cfc65c76dd8986bbec207c0",
            "4cd24dcb831ad3b97f67ef4be4b02f9672851b3d0967f2eb46851292d86b752f"
          ],
          "projectionHashesHash": "d5473bd661632d176a7d44d05a674b46c6bd98cef9f98799fdc911154b205bce",
          "topologyHash": "1dc0acb4d2550206991d2ca6e962bf4528797f28703b85b8a0dd07b79f1bd5aa",
          "totalElementCount": 98
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "0c2dc7fc6aee9eba668632ed99576398b99c722fbf615200f247d5a29e6deae3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "0c2dc7fc6aee9eba668632ed99576398b99c722fbf615200f247d5a29e6deae3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "0c2dc7fc6aee9eba668632ed99576398b99c722fbf615200f247d5a29e6deae3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "0c2dc7fc6aee9eba668632ed99576398b99c722fbf615200f247d5a29e6deae3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "0c2dc7fc6aee9eba668632ed99576398b99c722fbf615200f247d5a29e6deae3",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "3d742676cf88a820d072b5af1ae638a50383dce1c3cedfaa23e72276b1ae6441",
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
            "7ebd0cec5832ede0dc278678c49b6fa76da66ec5aa942c5fc6a06bd88f691f13",
            "5eb17af273345cd111169a6760acb44709ea468071bfd82db575b2433ee3d2ae",
            "3e056918a1efd30d9201e89ce30b89f0f4c4d3dd3447582d7eb601af39b4a24f",
            "4c7bc2c3021bfc4da9f6720211d989a2e969d6accc1a625cbbe9dcba80b4b13f",
            "7ebd0cec5832ede0dc278678c49b6fa76da66ec5aa942c5fc6a06bd88f691f13"
          ],
          "projectionHashesHash": "ab63b6e784d83cca6ab5c35d2280627405244ac8c78de72360cbbc0dab696646",
          "topologyHash": "a10df197fa353e0e5ccb7d7e7877304c3b908491c1d423b8c1b61abe060fcf38",
          "totalElementCount": 98
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d03e781ae81321454d0aa1f320a34de495d23e91291b9d2caf271f46e4de2408",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d03e781ae81321454d0aa1f320a34de495d23e91291b9d2caf271f46e4de2408",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d03e781ae81321454d0aa1f320a34de495d23e91291b9d2caf271f46e4de2408",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d03e781ae81321454d0aa1f320a34de495d23e91291b9d2caf271f46e4de2408",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d03e781ae81321454d0aa1f320a34de495d23e91291b9d2caf271f46e4de2408",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "a0e9d83ba961939400d4f8bc8c87864a6941619e9442f2fc838ed2350eb5108f",
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
            "14765fa9f321c9e9c8378b0bac80c5267bf6cbf3a8edc8ff0f40feafc6e379ee",
            "12834effc33af164e7cd632cb10f9d414ed4bd30e0a65fffb3fde20ec64dc0d0",
            "ed7f9b1f220bebf33a6c51f1b98548ed22e3d0d63eb41240554387cda0b9872c",
            "6fbda5f5d67b5ef30e1993bf32c15e2602ae0e7fdc497643a9ec2594e991a300",
            "14765fa9f321c9e9c8378b0bac80c5267bf6cbf3a8edc8ff0f40feafc6e379ee"
          ],
          "projectionHashesHash": "4c37a9826d9e6544b9b9d1daa2d738d84c1f9cb0e26c84fda6e77af578cd0dd5",
          "topologyHash": "24cab7c395ba3a89e3d5ead2341c1139bf30cf91e981a18bc02c5536d1c55605",
          "totalElementCount": 98
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "2bf88915bc164cd013c754e63c61f8a10d0ace3bc6367da54859263bf8ead0d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "2bf88915bc164cd013c754e63c61f8a10d0ace3bc6367da54859263bf8ead0d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "2bf88915bc164cd013c754e63c61f8a10d0ace3bc6367da54859263bf8ead0d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "2bf88915bc164cd013c754e63c61f8a10d0ace3bc6367da54859263bf8ead0d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "2bf88915bc164cd013c754e63c61f8a10d0ace3bc6367da54859263bf8ead0d7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "7ba556d2b2aef220ddeb44be5f07e2a10ebcfa79ec951c0ed33cb67c2964922d",
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
            "ece4ad35bc8cf42aba44d1cf6a41fa1ee03e2dd38abc26b74c1068ab6107e793",
            "c781560646517b67b98f6642427e5f1ec74c7a456aeae28e4bf1adbc4d9b0c41",
            "0463a666c0007f43a3a43800f07539a69a1a750559e82d8398f723ba9aeae297",
            "df5a81604395ebdb920866c726e29486f5ddb05b510f488fc2e2bfcd155cf74b",
            "ece4ad35bc8cf42aba44d1cf6a41fa1ee03e2dd38abc26b74c1068ab6107e793"
          ],
          "projectionHashesHash": "ca5374e5db9dca189eabe94618a6e9414b7bca4c1d516789c31692f1bec5cbb5",
          "topologyHash": "461bfc6715c8fe76227a30e69ff1014bf48f7d7dd20aca4928329bbfd25bf448",
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
    "planHash": "27159db312270cf5592695e39c808cd6b659289094c50217f8fbf17b703361e7",
    "projectionMatrixHash": "9560fb22cd8629ca2013016274fdfdb587c7dd2c7cdc6e969737b8147bb10f6b",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p5-first-proper-fraction",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "6271551d3f6ddfb9a8cd8a705d40e8fa73f98fac676356f0c0e3b981e091ae87",
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
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416",
            "598838d5a2b2d3827494913286564eea52d47ad92d0573639eecbe459368ad86",
            "b3400742e3ce48c427508a04be035633115eab9bbeaf8e567679e99ccb0e391a",
            "d466654f2983b80aa1ea490634a65893d2d3af5d99e36d235fe58c9a89364829",
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416"
          ],
          "projectionHashesHash": "afcb76549b68627eebbdd79d65263c47c0f91a68eecf8bb9cf15e3097c3802f5",
          "topologyHash": "62ab9b1311f93ae1662e6bb82a9e31bd493a668d7cf8ec8118b143c60b167585",
          "totalElementCount": 360
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "1522a2f906775e0c150b270b986dd90f20c7b17a5cb053e9429920d11ef14c66",
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
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2",
            "6cf7e7230ac3d19a51fb0e29e149d5fb036124eb7c83df165632f8807854b552",
            "70f3bc1658c9fca445f6c43fc702c831a20ab2ab20f54409185ed04b8c677b3c",
            "00fb1a78fd2e1ac96e1e5cac2b8e2fbbf5f7678735f8a6cb1bcc3ba6eae47770",
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2"
          ],
          "projectionHashesHash": "8978d0a8d71b7c3ad82a3698e8cc5c4b25c61edd92f0b36cca7767ee1fe1b0d8",
          "topologyHash": "fec713a07a694307978df17fb561e3ec62e7b4c014a6e2632781032eed646ed6",
          "totalElementCount": 360
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "4ece928d9bf630cae622442070559b0ea48003c6c4086e643eedfcd1d3dcfb35",
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
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90",
            "ff7e93367834dd31ca9b5b49fd2f5cd4be5a4fcf783e3cae110b3c3242f3d0a8",
            "19773c1451794d702e8e5cdd64b13e0161947a4e3bd9bbdea8293b1184b601f0",
            "dda1de9b9250f569de152593b6bf7a8843778d9962891a52b2bc70f05bab6684",
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90"
          ],
          "projectionHashesHash": "a53ab31b7cc44d0bf89c0252e867268d6a15c3ead01318bc087910c4cb372dd0",
          "topologyHash": "b63fa60c6e1f25d222361ab50396dd342413e2b1e52d7866f62c856e7cfe7dcd",
          "totalElementCount": 360
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "edae7f7d555447f8fa67bca9222a865eba21b3173e1e8ca399a63f4ffe9cd583",
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
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e",
            "bb6ca71e9df51392166df71f774c32464aba3c5feea14136558ff52777cf8bb2",
            "321e5d27da381909040ba8af9f796f9413ce18cdcd3ece4dafd095076f50b1d1",
            "144cdfdae051d7b60e27d33fdb3f785c29a2a185a038d62a5f525487780eb13e",
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e"
          ],
          "projectionHashesHash": "3dbde6850b5d61062316823b93486ce64cf054446de45efcba5eb94e9cc4b1da",
          "topologyHash": "c7c21245fe9953683b5849978947ad55deeb4f1c1d9363fb14b2ad43df5fc3ae",
          "totalElementCount": 360
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "0dd0087b7c72f96b4c8ba1473b2cf1ea6d304e8f820616c0e7caca602d943e6e",
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
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b",
            "d0c5dd3fb0af3693c5c2c306a2da16b1fe181c017b85f78ebcd63afef4a1d121",
            "4a8e711fef15bfba3b934219760f53f1bc605dfb2b60eb94887d8e1605f0d93d",
            "2025b96afdbc1f3df455c7a319973f5177d80ae0cbecb50ceee484477cb65392",
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b"
          ],
          "projectionHashesHash": "e3930bacd7f081b4c7d3a74145c92a10732012f9a0e6369e25e83d275b3a65b0",
          "topologyHash": "d9a488a11370a62547f3fe03f101b90913568a85e72c8978e9c61c7e7b968d8c",
          "totalElementCount": 360
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "e694c093957f6d2681cb969725a7ec45ce118af93c5c08a7f1f7cd98d9945252",
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
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34",
            "378a14763d706d8fceb2cb8bc0efce591e86b3c230ced20b0a6587293fbd48a3",
            "a5cf953802135b68b509b0977a4afea8cdbe9f3e55b30f8a64c9670b46b923cb",
            "08b301936b745f296d0e608b4b20f0d0c698e2224c6d4ff11e0ac583c6d8bc7e",
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34"
          ],
          "projectionHashesHash": "32b47e5c7ad682ee1b517eb17db7219f69c33aeb0850f5f6259fa39d9b2986b4",
          "topologyHash": "bcb32505ffb5210ee8d8cdd00e8a4aa74a98c91235097bf4d5ad4ed1fc3a74dd",
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
    "planHash": "4b367625494a40e289a8e9ab18a384da6e0745224dfef94da8d209799163fb16",
    "projectionMatrixHash": "df72747d61064609796ef913577ee99137b961d55de5701409d75a8535e1c3ca",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p5-second-proper-fraction",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "da687029db184a22e84d39df5c47b7bb860a0cfb9e4f6b9642878b5730fd8ae0",
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
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416",
            "1f948f3aaaf00c593ed1c4e4f5e1b2b7f5d9581dae71e947ca3dc9338987e59a",
            "88742809d1f002adcccad7ef5a6bc4e98503451f62edf2161f3d7373b38e629c",
            "003d30498cbb05f01629e34fd131ef3de1cadbf4b0b8bdef7e0452a2f151a923",
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416"
          ],
          "projectionHashesHash": "c5fa015ada5e4115596f7881ab553700d58aa571cffa7f3b0a279b813b485531",
          "topologyHash": "47bcf7a818ba692502f792b8b3798d4ea3388299568bab67ac2ba9ab659084d7",
          "totalElementCount": 336
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "15d27eaa4dc4dcde41c6c2a87ba31f587b1c285854467dd377fcd824b42316a8",
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
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2",
            "50d9b4d24888eb6b582556f909283e525b6c31eb50b8dbc6ca5c40a24a2c25eb",
            "ac477dc463f19324a19687099034e57125cf55c2440bb49f25f3f2ebe50d31df",
            "61be2aba151f2e54f0c6501506f414d886bb192ce5d914f47a113d4ce0a5d2e0",
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2"
          ],
          "projectionHashesHash": "40169b9820df2a4ac098792d93ca2c203be8eba7d62be802b63d2597d3a49321",
          "topologyHash": "ac789981a4dba33ab760f57c956e7573f32fdc774b6eb658d17b0e5dede558f0",
          "totalElementCount": 336
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "61297bff03237fc66e7659a606c1173eaa7b9ed832267d0a9ea159aa5b992c3d",
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
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90",
            "7ad50fbfe75397910d63cb9cef0bc8aab09551efc68d25de38519c2d409cf4f9",
            "37bf4271b1cc1e3af0b6f85f1faa594b374fbaebd2aa562603a5b080bd7f44ee",
            "e59150f260e189aeae1279c12aeb95571c45538c48e9524fb3f6d4e7598edb78",
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90"
          ],
          "projectionHashesHash": "38352deda61764a1685df04c1f1e16f6619bf03c74241b6163e1afbf2867326d",
          "topologyHash": "901242317bd0a99b758ff00704a82746ab352568ea1ea3f9f1f2be49ddc9e0ca",
          "totalElementCount": 336
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "a06a81d5f59f3bb81e2fa37bb0c2f6f70ed9c62792918fe8dcd7fa13fa66b64f",
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
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e",
            "cf2169918fc55650ec78774120872efa6d4550f5f0c12a903e60e3bb6d132fcd",
            "6861abd414c6eab38693fb46e0d0531793f1797f5bcce1b96cf282a45f030e0a",
            "5bd7510b3676a794bcd4cdcfec2aed0a7050ce2f17f6525e023f51eb98956435",
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e"
          ],
          "projectionHashesHash": "b8188991206ea462e21c8fb30c94c041865f890bf5f974e98063a99f2b70ba55",
          "topologyHash": "33f10121ff926873a46d857e7c3897030ce10809643ce5ad5e672e44b5bbdc8b",
          "totalElementCount": 336
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "1f5b4b2646e4cd8a6b22c1ec974adb04c51da8a9df9d559977fb442ae84ed7de",
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
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b",
            "fcb5201c8e3552d9e0993ea267dbc9e482313e61b61c494477abbf0abc2f0272",
            "fa1f00f36f688df1b06589d53dc2ee01a238220eac65f46c9fce451e5f025484",
            "8b7b55fa4e7ec556d9d619031c0b919f416640d5139e22ab1d626daff8346242",
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b"
          ],
          "projectionHashesHash": "f3e130d08c8d5f0fe5afec5f727e0e25a9e83989ae3f132ccae5393cad6e02d0",
          "topologyHash": "83e39de6ab56185e10063c0447cc7f4df807b843f19d4f01f967a95177a70c52",
          "totalElementCount": 336
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "c647cb9959b894acc25d3b149a1d07c8dfa5bbac0e23e7668612cdfcefd80ec2",
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
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34",
            "e70f75352ea6151c2c400480220f2a773a4e368de91576adc4bbd9b422040574",
            "25fa8329c5986f0db6de9ee4397b14d46ab4f45ebda1d6f47370803d73d64eb8",
            "ad73c253761724869711d0af99cf96951ac991f43f5f4635f06718ba471e2ddd",
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34"
          ],
          "projectionHashesHash": "5af69acfee37c3d92bf9f2dbd541aa7962a8a55bfb27504c7d8f71bcb06a47ab",
          "topologyHash": "fb1f8bc7544524c0781665b42dfadcc1acae8b47858e354bf1c9a2ab1283bc42",
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
    "planHash": "43f206ae706174d1b37c0ab56058786062a2cf22ab46f7e62e6250349b2cb8ec",
    "projectionMatrixHash": "6cc345414fb8c8bd2487692b88549c224781c9cd4295ceafff2cd5b485014f4c",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p5-third-proper-fraction",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "6b8651bc36f393211e8fa977531baa895c8791a2c2c4e715d4829daeb4cc9709",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "831c371b0be42d7350b85ce92c17822926ab97997b80006ec33a431bd881e367",
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
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416",
            "a3d98b7cfe01fe937895cbef77235326c962ded92e0109aa800ff79d52b52d69",
            "059f67d97fe2c2661b6744e50c4d0326095933198c2d7fc96871cd22d990ce49",
            "41670182145c682281cecf0d0a1e4486a7d27dbbc0af836eafe27ff9d4aa6738",
            "f1c4b1431329d292f8a38bf5be690159ca372380f131546ee50baaf1fdfd3416"
          ],
          "projectionHashesHash": "f91d870b26f5b030373b8b8f90e87ca4a958fd949b23abfd82904557fa447397",
          "topologyHash": "71ca3ebc9673e0907e7cf81598d78b445bb85e72d6060c27a2b9e126f45982aa",
          "totalElementCount": 306
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "70d96595f632286d30cde3c8ce4262a5986136c37c6d74c541d544f297f4d9f9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "2e718637699f4e8b1f3a07a1199bc52460ea6eff81d9064768bef2004232f7f9",
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
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2",
            "b9494d9c3c1947005c830f64935ef685206fabbcea30fa191781f80f15473812",
            "3bfeaa72f362a6f9ead331753d24f66dc3689858fc6c2dfc4d9b9f37c387bf39",
            "c9a968278fa422aba08b63f488d41efad7b687c5aaa007b893d246d00e5d5a75",
            "3a58372308afa1bfa2fbce523283da782955776fe37ebe66424d689eb3c8f3d2"
          ],
          "projectionHashesHash": "f27f57efa5ec8ef4ad709a75d9e6dc0966d5ca72feb0cec58fb2b42fe2dcee26",
          "topologyHash": "81f30d4734b8a82a216b807b401140d36435225bb9925bbeea873d15699e434a",
          "totalElementCount": 306
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "98e8614a5038e767f9a44861807f3b1c44b2589cad8b9a3eb2bd39b01fef252a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "19b510332286b5e73963456cd6b6ba2e42114925eadeb139deb55f3c3b38959b",
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
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90",
            "544a4723a3ff7a8c5aba6854cbd6158041b95f774222c6b128c9f553aea6602c",
            "d011a3c4031dfc483c343a2c9edb86e592aff64cbb520e29996f47ea48397b19",
            "7bf94ff4fc746a353e7eaf3bdc66d64877324f5b722782f746ae734a573b2231",
            "ca5fa64dcecff3221fab9be66f86844feb409a9468ad9d3c44bbb8352b25aa90"
          ],
          "projectionHashesHash": "52e552b8d10feae9ad1472c7bf351cf69bbf337bcf17252eae9c815d9b22a8a8",
          "topologyHash": "981e6bc09f02d2b2e2733c6f3f7cae29c1ce5d3ecc0340c3a9076eb2f9c029fe",
          "totalElementCount": 306
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "074997f9af830e1f4235eabd63df4a80a09fac7d6e52b63571c6e3276864bd99",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "a9836c68619820a70014d03fa348dd2e3573d5294c2524e13e920fe44c6c4664",
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
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e",
            "50b92312dd9585e74945a3a302b8e4bc1a38416550565acf9e0d4af987d66226",
            "f12b66f52ba7299ea7273c5480da30f67a34d605d3248714b7d1abf64e576e42",
            "3afee42d6a97218f26bf1551858db3986229c4ef3a1b4e10e38c57690de52ade",
            "305b303d538b6dd0eae33c2130c5fd8d24f895257661bc0a9b114d8093664b5e"
          ],
          "projectionHashesHash": "af421028ceed09f61a726d073632e5c6d1149fec556e83f5ddb29c558bf1f147",
          "topologyHash": "fb5883332b508ab43a0aa258e386482f0b2169efaf58a5f56eb9dd8c43f1832d",
          "totalElementCount": 306
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 164,
              "hash": "405bdfe314b6a078f37951ccb17ad908611891e38beb8f4929a816e96bcad8ca",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "0914b617ac38099ed6871c7397f0d139e843eca9f8dd4ebbba08721419d359db",
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
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b",
            "bf985c0284899a58331c7d4d3ab60142b3f62e7aaab3515afd9d45a3315ad872",
            "cdcbe81ec8a3ffb5a42b88ed907ffbb6adf7d65ffb10cd18be59b7551935aded",
            "8414025472d4ed2e8a6aa7caafdba5561165afa94d98d5355dc33b2e5e1ac93b",
            "1c424d640224e6612c16b935be6c75a4e202b5d2bcdbb65b360790f04a129a0b"
          ],
          "projectionHashesHash": "a4a6e9ac4f9421b08deeee309a8e95de3fe3874d56c5c319b064cabf20bea6fc",
          "topologyHash": "c8f026a56e669078702c78b16246de605a16e313c342edced8d53fd0de1fbbfd",
          "totalElementCount": 306
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            },
            {
              "chainCount": 52,
              "contractCount": 4,
              "entryCount": 160,
              "hash": "6dbe047e038d59706302db23b7b653afb1a826435c7b74ca3a55ee8bb22f4383",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 12
            }
          ],
          "ancestryScaleSummariesHash": "2c5e83b4a012df004ecffb5fc83ddc0a8389a77805f55b70011c2979fdf875fb",
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
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34",
            "f963c8a637f896f235b134c401f43b0af79b1858572c53bc3ef9fc494c087a12",
            "4f07069f20b133084dd210b00b22bac81be48fd7ac3adeb04901bc629f1aa12f",
            "196c300ab3e6e83140982f1de703bab382f2e847253342e3d0e71e3dcb30e54f",
            "1cf46997ec670e1ea669ee84701ab6218ed81a6452887f6b27cce68516ffaf34"
          ],
          "projectionHashesHash": "ccaed6b463f935f100ce496e9eb5ffa6f0af5e62878696e5f88671a9b41cbc67",
          "topologyHash": "099b8650ab59ac661641126758dfae428378ba4d1adc80da6c00454fd5aa058f",
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
    "planHash": "7b055f3c4a6cedda4c6697a77c9e69b16e4560a930338ba9e9ec53adc492f529",
    "projectionMatrixHash": "7385a78d7fba8e89627aa4c41153843cbd3aaddfbd566b2a60d67f9c37f7d244",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "p5-visible-volume-layers",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "51764f40339dc9d7f404f3845dbee6f8d24b08cfbfbb3437162256e6c745b6f2",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "51764f40339dc9d7f404f3845dbee6f8d24b08cfbfbb3437162256e6c745b6f2",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "51764f40339dc9d7f404f3845dbee6f8d24b08cfbfbb3437162256e6c745b6f2",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "51764f40339dc9d7f404f3845dbee6f8d24b08cfbfbb3437162256e6c745b6f2",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "51764f40339dc9d7f404f3845dbee6f8d24b08cfbfbb3437162256e6c745b6f2",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "7764fb6a2b7317ed721df3b4b1dcb26a58d43337575e7e5fb2671bedbf7870ae",
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
            "7f0626a001b435e9ef728bbbdfd106ba715415926bd58a9df12c36df54e68d46",
            "3744671b9287d7c444c572fff989871f5b45e8d1b48b0bf161c56d193fccef38",
            "a29cb84fca5c6a648354fea5b088802e352f3d61733cb515dd6dd64cb194dfe4",
            "6b19e8c3f234af6b0f6fd4703af0124199b818595e61024a263d34b6c1490691",
            "7f0626a001b435e9ef728bbbdfd106ba715415926bd58a9df12c36df54e68d46"
          ],
          "projectionHashesHash": "c3b2251ab96533c693eb709472150fbecb720aad3df8ee11cabac13c19b21ead",
          "topologyHash": "1943f20bac9dd0b48dfa5a235f7c8ec3e01d36519596e0a283440324240940da",
          "totalElementCount": 645
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "8d351695dc6cedc85539b7561201d187947edb560f0a33343793cf2db4d7710c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "8d351695dc6cedc85539b7561201d187947edb560f0a33343793cf2db4d7710c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "8d351695dc6cedc85539b7561201d187947edb560f0a33343793cf2db4d7710c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "8d351695dc6cedc85539b7561201d187947edb560f0a33343793cf2db4d7710c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "8d351695dc6cedc85539b7561201d187947edb560f0a33343793cf2db4d7710c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "22c5de3e63236108e6323572e954741bf77d388569ead8f676275b3dad1e94f7",
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
            "ba46bb2df001c897e8d351bcfe2d512d257739a78b64eb324b789501e4cf75ce",
            "cda01db487715a68eb71c227195ef984f45665019dfd1f2dd10c0249ca5661a9",
            "d4604b8cc43a32039350edac1aa6a593c9b37765f0b1aad3c6bdb09480eac43a",
            "63be26905b88843a16fc8b75a7e396a1f8f47317b288c01036401d5b1b7661c0",
            "ba46bb2df001c897e8d351bcfe2d512d257739a78b64eb324b789501e4cf75ce"
          ],
          "projectionHashesHash": "83ac803b6e2f9913aee83cd3e19e92da97a9f2848a10b6c1bad2d20d8bb586b5",
          "topologyHash": "7cd5735ab96e9e6515f029ae06fb6298d216091a0fb53fcad88c976434d6acc8",
          "totalElementCount": 645
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "62fee100545dbd4cdbbe69bf5e71c4d9ec2ec765e424e42fc59ca37afd7266f4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "62fee100545dbd4cdbbe69bf5e71c4d9ec2ec765e424e42fc59ca37afd7266f4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "62fee100545dbd4cdbbe69bf5e71c4d9ec2ec765e424e42fc59ca37afd7266f4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "62fee100545dbd4cdbbe69bf5e71c4d9ec2ec765e424e42fc59ca37afd7266f4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "62fee100545dbd4cdbbe69bf5e71c4d9ec2ec765e424e42fc59ca37afd7266f4",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "8e3b7c5df6a4e6ee0910658de9fab43df4020c3e9440bd8d4ff46ab48ba4a6ce",
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
            "356591947b1fba05b4964a794654d50e313df8810f7316806193ec4f7e60645e",
            "f02ffecfc205b97d33d35aa5430525017f83e78152905b490c1a6ee341c0d1ca",
            "e386b3d91d2e876825cd45f47ed3cee222ea9603f0fbf51499fb01d3eabc6e70",
            "43a3c6840173ee1e7db4f4f6fd848c407cc49e98be21bd5c99381ed8ce4f0a40",
            "356591947b1fba05b4964a794654d50e313df8810f7316806193ec4f7e60645e"
          ],
          "projectionHashesHash": "6313c9fd2f3654eb2e58e8f3edcf964959986954982333f0a7a567f5052ffe3d",
          "topologyHash": "8e3e2d5120ecd14e66831d29eee5a87a1acf3c675793cc4062dfc8677ca52673",
          "totalElementCount": 645
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "ea9aeda718a1e9d1736c0520a48e9d8fbda2ea4d130caf7646695ffc1ae6ee3a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "ea9aeda718a1e9d1736c0520a48e9d8fbda2ea4d130caf7646695ffc1ae6ee3a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "ea9aeda718a1e9d1736c0520a48e9d8fbda2ea4d130caf7646695ffc1ae6ee3a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "ea9aeda718a1e9d1736c0520a48e9d8fbda2ea4d130caf7646695ffc1ae6ee3a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "ea9aeda718a1e9d1736c0520a48e9d8fbda2ea4d130caf7646695ffc1ae6ee3a",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "5cb2a0411bc27d28530b7ef5b652001e6718e1762de2e623a95d92525a61bef3",
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
            "ca79d96a7f59a513e2fc3146818d6bdd0889bdeb613592ffb5bead3ba4a79f15",
            "f871f30e7ec4728aca7712683bbb9d31c28a6cf12471e2bbe65527c22bfad9f6",
            "55a1c63f01d45cadc7c71af291aed71462b6d6f1c63c957f7e240444884c3faa",
            "57ff417f059423f999564fee382c3970ee08b0120d930796d12823eaf8f1a9dd",
            "ca79d96a7f59a513e2fc3146818d6bdd0889bdeb613592ffb5bead3ba4a79f15"
          ],
          "projectionHashesHash": "368417901420ee76684c0e391b2c3f27e5b68e1281931ab4d9a413dac107a489",
          "topologyHash": "df67165866e298956477073af9eb4cac8f60a53e27ccf4e4cd30175404f31b83",
          "totalElementCount": 645
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "2a13ee3b3c0a2d87ba43e10694c8e4eecba7964ffea86c3767c97a028bf7c983",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "2a13ee3b3c0a2d87ba43e10694c8e4eecba7964ffea86c3767c97a028bf7c983",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "2a13ee3b3c0a2d87ba43e10694c8e4eecba7964ffea86c3767c97a028bf7c983",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "2a13ee3b3c0a2d87ba43e10694c8e4eecba7964ffea86c3767c97a028bf7c983",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 123,
              "hash": "2a13ee3b3c0a2d87ba43e10694c8e4eecba7964ffea86c3767c97a028bf7c983",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "6cd4750f32b45bf7b18cd9867d279ae2d565ba9d1d939a10dce3a328589957ac",
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
            "4bf245958b369425c288e27a8ac5e0550c6a8f209316a84cfad80c6902741f0e",
            "bf8768d5c44d665427dd67a9acbd9cb75224005a40e18d6c4d8e3da5b25c0ece",
            "a973c97e7587f68277d19188a78670ecf18fe9e36c7ef0f3d03bd47a1ce72a11",
            "c34d79c505cf7ce7a79696e247f55b5960c95ed528dbd0f5e71f86212fc28bcd",
            "4bf245958b369425c288e27a8ac5e0550c6a8f209316a84cfad80c6902741f0e"
          ],
          "projectionHashesHash": "5aeceefb0436aee95fd76a18b159b3532ee2108372c8873c1cc523f581f99de9",
          "topologyHash": "6893d69345bf7f85545c237d4994f68894c0d6c8b4d68ff31fdb41936076cd2d",
          "totalElementCount": 645
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "400d8e47c7bbc8bbe862e1d2c1debe0f7b7c710260ab979a7883dcbd3189e51c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "400d8e47c7bbc8bbe862e1d2c1debe0f7b7c710260ab979a7883dcbd3189e51c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "400d8e47c7bbc8bbe862e1d2c1debe0f7b7c710260ab979a7883dcbd3189e51c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "400d8e47c7bbc8bbe862e1d2c1debe0f7b7c710260ab979a7883dcbd3189e51c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            },
            {
              "chainCount": 39,
              "contractCount": 3,
              "entryCount": 120,
              "hash": "400d8e47c7bbc8bbe862e1d2c1debe0f7b7c710260ab979a7883dcbd3189e51c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 9
            }
          ],
          "ancestryScaleSummariesHash": "cf21ab6ba423b213606250b8384a2da6ab5c3e462353ceb57f1d330a2c39ad63",
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
            "6625959a48a513aff3e72a3978dbdc1857ce30558599387347e0ac3e1b789334",
            "92d86c641f2d20212a8d4dbb8d526d544abb47d38175e9da037c10f8091735ac",
            "96e312b5f014a763207b8ec3b10de601e850db2b74a221888ed923807706ed21",
            "93428d0663995067d48fd1cd560fad54e47ebe661765c395694af735eeeb4596",
            "6625959a48a513aff3e72a3978dbdc1857ce30558599387347e0ac3e1b789334"
          ],
          "projectionHashesHash": "414f9eb95b327489ad2e0e1f625e89ea12c4afaeb3d7db08151343d148a7ecb2",
          "topologyHash": "af9dea4e6daeed0d9121f402bf57c2a16bb9df36bad0ce4cf5f5a3043bcdf637",
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
    "planHash": "a31a83200348d3269785eca2a0d1c841626bd244a3970532113918c9ec2859d2",
    "projectionMatrixHash": "48b7149b198548b4a1c0396531809c265429be5e0d49227239ea397c9ea69870",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "s3-identity-a-projects-b",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "7e4487c68987138b3fc80bd50035cba2dc6e6b9cdaa3a3358f22656083d4f657",
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
            "2b4fe5651ffa1972b7a63bffe36aac01b03a71416f14a6e1ce6e2bb6026fcb96",
            "d0e1e43b2f6af831400ea77a53eb3a932b53d4f5ef7882c6b018392120003b5b",
            "90bd658f4b0bd3256179be5c8b656d91952e149586c180763300cf11dc36dff0",
            "10ae62d9ddaa2b55e9a7e2b1ab958bcdc404be3b217c15e03b9c2543ae98d229",
            "2b4fe5651ffa1972b7a63bffe36aac01b03a71416f14a6e1ce6e2bb6026fcb96"
          ],
          "projectionHashesHash": "c9ed24ff4353cfeceb3d1e7c3c96793d4fe6beff36006d03aabdf47c1bf41861",
          "topologyHash": "e503385ddea641d823cf30ef5b9a193299e95daa83adff8c452d4e23f0aa81e6",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "f6b41f66f601cdeed8d07eb0367dd4169747b7f8db0371999fe0617e35c7b5a7",
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
            "98e543eaf6063335a393d4ddc5bf52a9f2ceed5dc80cf5a193a070af042f578d",
            "0856254f6add1ec5dddd2a09c6ed35fab238b9fada1ddd598a99efa9e3bf219a",
            "f26077dc424e7bcf6fae513857e91b89cee4939ff88fd34f08d319b262712f9d",
            "aac1fff8baf7970e51a94e9c9f827bbe6988702aa9e2492b05c23ee5f6ba2e00",
            "98e543eaf6063335a393d4ddc5bf52a9f2ceed5dc80cf5a193a070af042f578d"
          ],
          "projectionHashesHash": "50df2832c018e51abee561c43d02f86a571ede7beca9c55f26b1f2616443542e",
          "topologyHash": "3097469d4f1dcb521efdeae24f12c188b8e4d0300025019ea6375d88f52abac3",
          "totalElementCount": 35
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "1af258b883808e0a2d2c449f211305d7a8e62b23393b02f09b2ddb74319d9076",
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
            "5d77ecaad1703d2a79ad5a6197f343a888c0f479e29f7b2fc4faa77acd78a5f7",
            "5a4fc62f06f0789c3797e6378ce8afd8c97096c3826fa52693106a00f35a0712",
            "9f882aeefc543d61b18c4cc7fac8c4472bbc758d50dfe02cb899494ab4e1c007",
            "37a279f4d2a812611d9133c85a1de2442adfa2ebf0d3ed807fe9a9585111ccb1",
            "5d77ecaad1703d2a79ad5a6197f343a888c0f479e29f7b2fc4faa77acd78a5f7"
          ],
          "projectionHashesHash": "7b2878f7b62c07170ed1ded36e0fcf054c6d7ac3a2f42373a88f7fe462f310a8",
          "topologyHash": "fe5e2b4654e9ad2b50cf0aa737e2fb71cfeecdd793f05589adacc95396aa0568",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "f283ca1eadfc5287fb9c0b3ef8192a0ff9464fd79a8343d375df33eff075ed33",
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
            "f17e346a8b270651c43584d0ba172b1b8a275b1810429523283fbaf42cc1af73",
            "ff5517121a101eaf272abf1a299de1b8fea96e3631c27b2c4aa8f3726f7d10ba",
            "c0005bef114d59eabb9c46617f885448ecacc39665dd8e489644ca8eefe63127",
            "a4f0a2d68b66b3c67821ddb874c8e9f18a05e20a721d01a5bc45a1934ab37605",
            "f17e346a8b270651c43584d0ba172b1b8a275b1810429523283fbaf42cc1af73"
          ],
          "projectionHashesHash": "1eb5a946f57411f7ca72b0807972bc2969bbb945f40a04aa2a45a5b2048ae26f",
          "topologyHash": "55756668d21dfb2ad2dfa9d55c034ef95edef5bb1fc44fc6ff90d455db28cd58",
          "totalElementCount": 35
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "2231a643e14d0f9084250aed7ca4a3bbf18bc4f3007abe4f6894ba330a7e524b",
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
            "513d8174871b343466c6d819664409760d149b94573f1f123dcb2ea0369c7631",
            "ddc8b470c9f3b6aea7684940c19c78ffaffe093f283571feb034f66fae050ae7",
            "6b9e50c3637ab41fe944336aaf4d4386eaf85ec71bff810598e936c621cc6b9c",
            "7a33a6886d2cf20cca2e862d80e7975dc86ac3f7dfbc373c891f12dad6f753e2",
            "513d8174871b343466c6d819664409760d149b94573f1f123dcb2ea0369c7631"
          ],
          "projectionHashesHash": "13192bacc13f0188eeca4250d1fcb6eda7b9ab6809f4716e12f7069f285a5b4e",
          "topologyHash": "2974e9a53d0fb083974dd7bf2b56fbd7e621faf5be76911ad04da532aef6ff59",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "7af209b4f85115677dbc37df02a0683ce66611ae02eca542de2f62954690bcd1",
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
            "83170ef328f469815e147382ba2f46389117562cd823119db20ac422776dcfe6",
            "7805d163d09fd121e2cda6dfe318465a9bf50e611703a88f4b9d385f2398393a",
            "cf14183ca249712dbc624a64aa1a739698e73a41514b446d8d818bb33d52b5ce",
            "fbdc07e9618f4e66858c76ead79f2303a7e3b3f4be2bd49901ad405540ff62d5",
            "83170ef328f469815e147382ba2f46389117562cd823119db20ac422776dcfe6"
          ],
          "projectionHashesHash": "04121d98705d17f009f78df4a7c3133a8657a6d468f60940f20f9516e197b50d",
          "topologyHash": "524fac08d8ffb72b9be9769ebabc4bfdc6b89328e17ff7cfc1feb0209c268874",
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
    "planHash": "6f32b22f4af8fe60b6c6515f0e53a5f816015f2e7da74ace7525d88402cfbf19",
    "projectionMatrixHash": "9fda437eb4ad13900b93c4b4d87795c0af28079e9ad126949098638a6d44bef8",
    "schemaVersion": "hk-viz-dependent-transition-sequence.v8",
    "sequenceId": "s3-identity-b-projects-a",
    "visibleMathProjectionTopologies": {
      "en": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "e73d3fdd13b07cc20165611e2dd1ef3730edee0aff9fa5d79028327253a0119d",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "0e855a2b0ea3de296f9b51416a775d88c910b93fdaed22aca17aceb0e06a83e3",
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
            "2b4fe5651ffa1972b7a63bffe36aac01b03a71416f14a6e1ce6e2bb6026fcb96",
            "90bd658f4b0bd3256179be5c8b656d91952e149586c180763300cf11dc36dff0",
            "d0e1e43b2f6af831400ea77a53eb3a932b53d4f5ef7882c6b018392120003b5b",
            "10ae62d9ddaa2b55e9a7e2b1ab958bcdc404be3b217c15e03b9c2543ae98d229",
            "2b4fe5651ffa1972b7a63bffe36aac01b03a71416f14a6e1ce6e2bb6026fcb96"
          ],
          "projectionHashesHash": "3bcc0d62961f462522beda3bc472bb7c7eac3b5259078ceb1113a9a072b43561",
          "topologyHash": "eb40c7d58adffc54a1ac5cd572e0cc1d4efca45d90ed54a38c4778261b2d0349",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "25bf6c18ebc4b7f278bef0c85e47c5838fd60c15751181b82e87867dd68c9bc9",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "c02d2b7becaecfa80225a1a835a652fe2bd808709fda88c5d7eb8e582cba7f98",
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
            "98e543eaf6063335a393d4ddc5bf52a9f2ceed5dc80cf5a193a070af042f578d",
            "f26077dc424e7bcf6fae513857e91b89cee4939ff88fd34f08d319b262712f9d",
            "0856254f6add1ec5dddd2a09c6ed35fab238b9fada1ddd598a99efa9e3bf219a",
            "aac1fff8baf7970e51a94e9c9f827bbe6988702aa9e2492b05c23ee5f6ba2e00",
            "98e543eaf6063335a393d4ddc5bf52a9f2ceed5dc80cf5a193a070af042f578d"
          ],
          "projectionHashesHash": "0292ba5993cedf392f5764cf5449f658445669dde62194e7f325fd13ae48bd53",
          "topologyHash": "afd9d3a4c379748c386a6d7f701b839610cf89cdb81dc322232d7395dcd7d4ba",
          "totalElementCount": 35
        }
      },
      "zh": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "d8540e2686bb1848f1fab6c5cd75c5803dd4063dff139d62b96b4e5f7939608c",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "842f514d92c212769664dd28e32c610dd1d09aa9cb0b7313ac1996a628e6d9c4",
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
            "5d77ecaad1703d2a79ad5a6197f343a888c0f479e29f7b2fc4faa77acd78a5f7",
            "9f882aeefc543d61b18c4cc7fac8c4472bbc758d50dfe02cb899494ab4e1c007",
            "5a4fc62f06f0789c3797e6378ce8afd8c97096c3826fa52693106a00f35a0712",
            "37a279f4d2a812611d9133c85a1de2442adfa2ebf0d3ed807fe9a9585111ccb1",
            "5d77ecaad1703d2a79ad5a6197f343a888c0f479e29f7b2fc4faa77acd78a5f7"
          ],
          "projectionHashesHash": "eeb312abb5ce5b4163e1aa1f17190a281f2a0c8aae30f35058720e6d3d4f013c",
          "topologyHash": "675d23023840367b98edada80183c1201ce11a481f700eab8265c9d03a230179",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "a634bb4f4a5908068bc3064af36a5522241fb4e53ed8ff61e70abd4f1e827596",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "74d01b89dd7b5952ff04730310265ec944560d03f53de4fc817d3cffdcdbb8f8",
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
            "f17e346a8b270651c43584d0ba172b1b8a275b1810429523283fbaf42cc1af73",
            "c0005bef114d59eabb9c46617f885448ecacc39665dd8e489644ca8eefe63127",
            "ff5517121a101eaf272abf1a299de1b8fea96e3631c27b2c4aa8f3726f7d10ba",
            "a4f0a2d68b66b3c67821ddb874c8e9f18a05e20a721d01a5bc45a1934ab37605",
            "f17e346a8b270651c43584d0ba172b1b8a275b1810429523283fbaf42cc1af73"
          ],
          "projectionHashesHash": "3ab875cceeb160f222b48519b7a6b0b597ade6c2cc68caa98e442cb05e824ce0",
          "topologyHash": "62ccf098be8675ddf62780d378774fe85c8898a8187b29e48c38b6bc946a8f2d",
          "totalElementCount": 35
        }
      },
      "zh-Hans": {
        "dark": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 41,
              "hash": "a7e3552248f2d6a35cf9278e23e9b8af3e30a5016a23aba14bdba567ca1acfe7",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "51d01e542e5d650a6ad937d245c9108a649e89fe904f8ae540f5c35e347e8a3b",
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
            "513d8174871b343466c6d819664409760d149b94573f1f123dcb2ea0369c7631",
            "6b9e50c3637ab41fe944336aaf4d4386eaf85ec71bff810598e936c621cc6b9c",
            "ddc8b470c9f3b6aea7684940c19c78ffaffe093f283571feb034f66fae050ae7",
            "7a33a6886d2cf20cca2e862d80e7975dc86ac3f7dfbc373c891f12dad6f753e2",
            "513d8174871b343466c6d819664409760d149b94573f1f123dcb2ea0369c7631"
          ],
          "projectionHashesHash": "e5ead29cce39d04230a036348dbc68d5c9e36000695e445cc8f3493654813818",
          "topologyHash": "2c8df1c5813afe59ed41ea215cc42219ea26cf82b4f18f95bedb66fcf54b9e00",
          "totalElementCount": 35
        },
        "light": {
          "ancestryScaleSummaries": [
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            },
            {
              "chainCount": 13,
              "contractCount": 1,
              "entryCount": 40,
              "hash": "e3767a3f0a3e4807041bcf41120519fbec522a23d47ed890e2593987c9f1b668",
              "policyVersion": "visible-math-aggregate-ancestry-scale-summary.v1",
              "scaleWitnessCount": 3
            }
          ],
          "ancestryScaleSummariesHash": "8a55c76000ec55b761ee5c87ab420e361b6e510d169f3b379b34deed8f975e02",
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
            "83170ef328f469815e147382ba2f46389117562cd823119db20ac422776dcfe6",
            "cf14183ca249712dbc624a64aa1a739698e73a41514b446d8d818bb33d52b5ce",
            "7805d163d09fd121e2cda6dfe318465a9bf50e611703a88f4b9d385f2398393a",
            "fbdc07e9618f4e66858c76ead79f2303a7e3b3f4be2bd49901ad405540ff62d5",
            "83170ef328f469815e147382ba2f46389117562cd823119db20ac422776dcfe6"
          ],
          "projectionHashesHash": "ee1d46d6c21fd606a7a850fb4c237e2bf5b34f2675f5ff12dae976737d9ecab7",
          "topologyHash": "13169e6013a151cdc46ae8955ddb59ff747e9ea9be7a39fb2fd727d99fe7ec14",
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
