import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { productionLessonSeeds, type ProductionLessonSeed } from "@/data/lessons";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";
import { chinaLessonEnglishTranslationKey } from "@/data/chinaLessonEnglishTranslations";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import type { LocalizedText, Question, Topic } from "@/types";
import {
  cjkPattern,
  englishSurfaceLanguageFindings,
  hasBroadPseudoEnglishDiagnostic,
  hasCompleteGeneratedTermToken,
  hasGeneratedTermTokenPrefix,
  protectTranslationSource,
  validateRestoredTranslation,
  validateTranslation
} from "./china-lesson-english-translation-validation";

type TranslationEntry = {
  id: string;
  source: string;
  contexts: string[];
};

type ProviderTranslation = {
  id: string;
  en: string;
};

const projectRoot = path.resolve(__dirname, "..");
const configuredMapPath = argumentValue("--map-file");
const outputPath = configuredMapPath
  ? path.resolve(projectRoot, configuredMapPath)
  : path.join(projectRoot, "data/chinaLessonEnglishTranslations.json");
const temporaryOutputPath = `${outputPath}.tmp`;
const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);
const targetPublishers = new Set(["MAINLAND_BNU", "MAINLAND_HJB"]);

// A18/A09 adjudication snapshot, 2026-08-09. Each value is SHA-256 of
// `${source}\0${target}`. The source-derived id plus the full pair hash means
// any source or target change is revalidated instead of inheriting an old
// decision. These are parser limitations on translations confirmed correct.
const adjudicatedFalsePositivePairs = new Map<string, string>([
  ["t-039c901186b653d2", "17673b906bd444adb1540b06acbf8a3735ed69e6eba1dfec2ad519845a6f869d"],
  ["t-08180439b955ced1", "62a332b1a888b1316e3b3aab48a69c9844c7f617b0dd994bfad359471362c83b"],
  ["t-08d0da0b1508f3f7", "dda2877da4c864f49ca2c0270a9c08ead5ad1de2fced18180760b21e70b872c3"],
  ["t-09b40486b37c1543", "56a78f774a594a463a5361d58b858efb377927d7a7a35e287b174c5767ab76ed"],
  ["t-09c13ea031c2677b", "e8483886b5a67fc02cda766b4a14c3e43e2636ade675f1c6587720ce9ceb0c9d"],
  ["t-0d09af2c2b7819a1", "a84ff6b97046f80b17cde82103842906afb4b36490322359388d1908b9cfb31e"],
  ["t-12b79c9874699b1e", "c362858b06abe28c50644e44e8b1dfa02c20a44aff14d7eb09cb6d92bab7b54f"],
  ["t-12e345a10a426c11", "db543859175e46a7e2ca2aafea27cdfac0f874eea49eb96ad57021275f07be33"],
  ["t-139b96958ec6f5ba", "da51640d955d5d273fe8e9e14ca7e645ef7d25b3b273f113bb3d2c2d6bf7db92"],
  ["t-164075f092f20865", "0e0ef1869e2ab5452910af4763c0fb6d752777c14f793dc57b04a2cfc68341c0"],
  ["t-1685cafb5adae9a2", "9d946ced353250ea93318c378e7b2cd74bd37ed73dda587a297eed04da62a661"],
  ["t-1f7839fafd2caad1", "c6153494b5ad11591bf87940b7776bc1933b38a058b146359297338df8c55763"],
  ["t-236206927626ff71", "a4497907c6dfaf7a13218285595a169541080236ca7850b80a4524ce5c4a3784"],
  ["t-23deddf1a10459b9", "c992c911ad75156121ae636f663a7b1f2fb1003434ba918877749ae3c873975d"],
  ["t-264f7fb412f8a412", "545a8e7fefaa30de59f9c6b09d550f3cd34e23ece01c264943509a44bded1241"],
  ["t-270f05c771937fa5", "b847f1c2f7414ecc12790566f4898aaa7fa8bf43daf9ca6ff3cdeb89296d692e"],
  ["t-27dc18d434187e2a", "b265de3fecdee4f3ef571d9fa4e4d1969704b5f0d184dc9d25bbd3b1af092bc9"],
  ["t-2841f8f20bc65f67", "83ef78875522c58bc18d704517744ceca420af7a5029410bcd6444823e29c5ed"],
  ["t-2903aa7430c14568", "2b5e3c20d7dfbfea51de45954a501a66da4ff5cf34b42f3ccdd5b64b9416b587"],
  ["t-290582280737ef9c", "ed6ea6e0e87d99f6b8a2a4287c3af654500289078e730b7c75fe5daca728fecb"],
  ["t-292374947e28b99a", "ed0186812ccf56c22e3e09f2d8093e8afa516048f46d025a0f1784191a887b3c"],
  ["t-2bbc33313af7d29b", "9dac570cc5c86e4ca286a6259abd812fbcb25fe8aa0ade2e787bbf84aad15015"],
  ["t-2bf1895572b9fd09", "e282b2e783dc21b7ddb3e0418da184197bf73a65a86615e03dd6af7d8b27028e"],
  ["t-2cff0cdeb8076124", "7bcf77f98ab1613d62f45c351a320e70a1b8661ecd1a0e25b05e4acbd77bd85a"],
  ["t-2d3624bcced7327b", "fdaec41ff71802cd5757896fe7111708b8dfb8768ec5afbe95dd9d2fd5679832"],
  ["t-2f5064749b38991c", "f07014fc4d767efa2c04e375b007928e1d083af04996982c6f04d572814e7ede"],
  ["t-2ff3b3f23923fee2", "26efeaa0e971ccb9fdaa690fbe63b61a56b897f33b2786dfe2cb3900a43574cb"],
  ["t-30588f75819339d4", "e1ed1797e628f3b2049510d50648a8a57e44049785bb5e377e4702845a267caf"],
  ["t-32673b07d53ed9d2", "b7c479ec16d2f704b929264b4d01f9a557901675c3104d71c2331f0f22e7bba5"],
  ["t-3475cbb3b4cf6469", "6cbffb9530ff4e61fda547bedbb6b02fa65e17795876d08c0c555aa89ccaf1e3"],
  ["t-34ecaeda14445372", "0f4863a618f741837f14ec4962126c0207313d3e1af5f5092fe6db639ed042f3"],
  ["t-354a882248eda3c5", "903b0f921ae1d45b51adc5ba2028e42a97e45122d691cd3171e9d69a3d5b178b"],
  ["t-37f79b75948700d0", "0d167a5a0c77388a8844b64e81302c61525a1e88999c08d7419370037a30f150"],
  ["t-3b7aa4ab8c81cd88", "6cb039e169729417d006dd6e1ae7ab7620ca5640239ef466abdc2e69e4dcd844"],
  ["t-3e6463f597963af8", "356e497d07b4c8308cf5563d239de1951eaae9ff035d1efd44cff366d8968a5a"],
  ["t-3fea582834fe9505", "7076fbdf54e45c4a6d6970f372e9c9e7614bb5bf546e9434b0781e17fe2253f9"],
  ["t-40b9d6b0063ec85c", "e4213c5a4e118e1196120919c4978be64541a6c9952f7fe2853e6049188129e6"],
  ["t-433f3684c551e989", "c862ec1e3d30a0522d5b70411decedcc1f7ee50758b8d99306aa2bd4e2c3a246"],
  ["t-436b086dc8685fea", "f6eb879e0a434c7fe34d6d83841adfc3444b40a659edcb451b0ec4c8c4a07a5f"],
  ["t-44288d5656b8533f", "355d11440fc7237745394d97a1c8ec1af415eea3b12c87418c930f496531c8c2"],
  ["t-449f0098769644b9", "ab0763e939a889c85bd8cd996156cf9e4d90bb65d5d1c45ffef9c4c9d6ee9600"],
  ["t-44c4df22dceda99c", "83d191138ae2cfc543e95b74ab3b80d1a22a1ff7ce4de382fe6e1f769b51f56c"],
  ["t-466b5153c5f5326c", "6b440c4adc1306d222e7a0b11d135e44c5efb6026ccc89a7c8625786fbdeed46"],
  ["t-46ae04fae098e69f", "53718d79efc2cc8f27c8279ca343c4c5ca95bb3d45e45e784ed8086462d16611"],
  ["t-47ec427d2f9d8625", "8d7d57b65574726d447d197fa41b5916583553febe5d79639e4dd013d7a1b727"],
  ["t-4896323324445848", "3ff30260e8d59fe5ec8bc976a3b8c4ac9cfa74a372c96f629b6327936a0eceec"],
  ["t-49db8d1009ddeb68", "ff77e624633652877bb18b30900537d2b9f742cecf3da2161959a8e8f8c59ab3"],
  ["t-4a7df0ef46555502", "bd7080926b8d443b8c1fcdf7fe10552460bf821b25b7b2cdd162eb762d25d2ba"],
  ["t-4afcab4a0c163531", "0ced741b0cd461fbd91a147c43e2dddceaf170adf127a1ac2141156417bbca43"],
  ["t-4c5d11ca995b63c5", "fabfe3f477344c4575844a339ff28c1dee5dc1d03f30ace3415560591f5cc192"],
  ["t-4d65f8f51e5c4e5f", "6c4e2bcc3eb7d024dea70bf4058e558cf5bd49f8bd020a4e126e57c44b999ae9"],
  ["t-4f09ee363024d7e3", "9b0f7633688b7cafdfac514da23d9eb7a047540291ea83aa3225872fbe883393"],
  ["t-51b8982d0c4fdbac", "1f50af0e4625e2e6d7556ca9e437fd77fe6f3fe353630d26d25e78d1b6929c84"],
  ["t-52726194a02b990e", "a797e67f0adbcc1918cf0c2dc4f744934617b00d54535cd74e8559a2afc80a02"],
  ["t-534f10d6c817be11", "fbc39635d43844087d7bac207a34cbdf06c1f5f110b226cdec69768a4796e94d"],
  ["t-53f103317e77eae5", "8fd81b016e2f734f265b7e45fe91a0208fa9243581205a54493b754bb0b03be8"],
  ["t-54dcfa83dd1e8388", "64184b948e8e1bbfd070bdd5a4fecb3654e9046e0945e67bb61feca0c4abe929"],
  ["t-55a3b8ce76a78845", "055a071058f8e703b84490e8685229943246f4eb76795010730b25ed6eb55b35"],
  ["t-56b2d7f7529bf8f4", "0a0e360e7fb00c8a32f774529f3b0dd57adbcca6a07cc242919a9cdc782ce425"],
  ["t-570f827ceeeeb048", "527681eaf7d0adcf9f735eca0dbdd818af2c71d7fb8fb292f4d47eb3d5b04546"],
  ["t-58be4d4b913e609b", "60a66f4eaa74eb84fb375c5fd99bc3e9c14a81091ed2dee6ff587ba4aef76dba"],
  ["t-5ad0d65aec63f78f", "9e7758632add51e19f6ef1177651a9439daf7e0f0797b086e6e7ef1e30549b63"],
  ["t-5bdb64662c5240e0", "5133cb35aba1952deeb87890aa106203b2ff498730023dda1a6b87e4c8b86372"],
  ["t-61908a0ea6e09d6f", "cc1e6f14b7962bd705dfdf8a88888cb1034a1a769fa370c57aa1c606f5bb8983"],
  ["t-6462ea22e26746c7", "600e0e12087fd8927171a8926dfa410a02a8ea7dfa515778743e532a73686289"],
  ["t-64b58c98e7ee6fa1", "621f5ad04043188e53a205d2f0f9da45559bd7ee4e2fd800aad73b4d1515e84b"],
  ["t-690cad4c38b156d6", "bda39c0844ae4e41bd23871ca99858258a041e959134ac038810f26af051d25e"],
  ["t-6d4cd45ec49125f0", "4da606cb0b85bb3ed5c7dbb797bee3ce57dab02a291c31023e7d42a521ea01d9"],
  ["t-6d9f60e3089edd65", "ca20bc23f102157c34e43d485737762b98ac1b004754e85da024bc63ad264569"],
  ["t-702486a70fd348a9", "4d66402c6b2ff9a3286bf2ae5a57882da4afe756324a1b9d80e5646330b79c51"],
  ["t-7027ca568a705eba", "fb99463e0e22b3ad1a55cc148af3e3317dd2733b59e4cc918d3f037ec5ddc0be"],
  ["t-70cd8a08b751952c", "bf771ab4b6a8794d12fe6a791560fe668a5bf42e017c908a346db937e4f19940"],
  ["t-70db027cafdd5c27", "ea558288b5fc7a4e7d532997790dd0dc1ba50a131c04fed74854365b0010826d"],
  ["t-720f3d77177d24ea", "8585f1e074f3b02f1a73ad133c3f1aa0fa26d6ccb2ee04e28a14ea65d5c6dd7d"],
  // A18/A09 HJB manual audit, 2026-08-20. These current source-target
  // pairs are mathematically and linguistically correct; the validator
  // reports token-parser differences such as English unit words, articles,
  // equivalent geometry notation, or reordered but unchanged math.
  ["t-18ceba2162b11c6d", "b0e9ad5fd867607ebf9d0dfffbac15f1ec2da399add3a9fec0d6387185ab4354"],
  ["t-25ae4dffbdfa7296", "820d40ea79861a363ca6d1d38f2a2acddb7e0df20b835f8656b50ecf46484c87"],
  ["t-28f44f389d09b45c", "741254c72159ed40061e51bfe73b5329494f27a95b0187bdc89f3bcc6d41d1b5"],
  ["t-299c9a44a269ec21", "548d9ac96795bf06193d92915fd3e39562aae7de2c54e76189910ffdc0b8520e"],
  ["t-319cc21721cd5a85", "72b89abaaf31195794f7b9c0ce0cdd78238fd43301a5f6633afbb9cca4838203"],
  ["t-35a312fb54c6b985", "6bee9e767cdb6e7837ddda2b30b4605b429892498ce9edbc15f14fcb45f1b179"],
  ["t-3dadbc2d17889270", "f8c85354d4d9621e754455e19e36c725e23e7fc9792bd9ac952d96eb894655b8"],
  ["t-4802e976396259b6", "8692863ff52bf1f19451343ab888a3a5b93070c2e2cc96e914c78f8256a56d5b"],
  ["t-4826ca51fb64c253", "9cf5589a45ac2e2c8ea0967cf54268034d5fbc3e79ca08fb6587740250c3cba3"],
  ["t-4f71bbf0b7fb6884", "0b627cc0ef650a4fb4c96b23b2da46cd43b29823ed15e0aba58076edf5acc619"],
  ["t-580d99c871043966", "90a0f39963b4745f6fc100030e64600e23e8a29a110021eae4ce6cc9c0ef6d0b"],
  ["t-5fa2618e80a838fd", "303c8a6e678d7fe147261f77768d9d65010f074a33d9e4dd1dafe494cf6fab19"],
  ["t-5fda3dfbc8088a47", "d31c421e9f79a8b656ffdf98b9e62fdab9dfaebd17164fdf2b741d8059e288dc"],
  ["t-67de7baea85f810f", "041f7b0ee34005961fe66606b536a167714ba94d754fcc7424df21e6dadca753"],
  ["t-73668ce7f1ba41d2", "bd4b2178497e6cd53836d1e092b435031f01c6706b564cbc1d347eeda4f40d25"],
  ["t-74b6f4b6ab07e533", "fc6361f2f91579be7e392e34a6c1781a2564dbfc9dbac1080f34bd91d983a4de"],
  ["t-755465e859293a65", "9e51e7a95c6dd01c5e568ed9df1ca6114fc02df7b85a57abc190e746a5622c74"],
  ["t-7564304e818250f7", "6069f68c3ce03727b794c24d4afbe18d01ec676273f9c6e4a75f02e69e30fb73"],
  ["t-78c4cfb81002c3cc", "f735fd42d4db279009c8802b77e3285599e3166f71f77c153f597f1d6e267138"],
  ["t-7be14e2279586b77", "5ef2ef8be06dadf7b8d7a7c9e264542f8799eadffbc164efabb3aa9ec5bff428"],
  ["t-7d9e3f22f22144dd", "aa1f6e4964e3686207abf3ef9eada5f84aaca28daea0c3ea6cb215d936177d09"],
  ["t-86a49d4c82025a94", "1b9dee53b3b8f44ba607dc6a786bb495202ce2ee64aa7ac1ab7ebc32da234bb7"],
  ["t-87b4ee83471019cb", "eaf27c64a5bd63f50a33cb8a0a0d64142a1d569e287273897a668f09833903a1"],
  ["t-8804633fb4c0bda1", "d24ddbeb8ee49e6efe3c7f363735cd28368fe43861980282102543504baa8d1e"],
  ["t-89270071b31dbd5d", "2c7af1d73bd00e4c78cdfc377496d9363e32a40713f0bbdb3ce0723f647d5d58"],
  ["t-89972d9b80b038a5", "d3237f837e01ed968b871601b38ca39482dc93a483ffc6bf33d0a4e240b1ba27"],
  ["t-8a0eae89e3c64890", "d8b5c9f7e74914e83fb22cb5b3729eae91b43278f312250d12cc5276ad21eede"],
  ["t-8c52249403437631", "163b12a753be00de5424715d3170e5bb52aa4c2eebd3faf059df844e0c68e136"],
  ["t-900617e8fc0fa185", "c125f678c767a7e5bfd616595ecd167666385b645acb14b23524c8eca226ea64"],
  ["t-929b44fcec64fcb9", "87d04ac400b71b8db0ef757797894f3c5272d4ad1e82f5d64ac2aa5673c0a346"],
  ["t-a124deb97f8df1f6", "2724a1ff69909eadd2e9482e789e34fe8837f7b7893b90cf5bd324067b8b3275"],
  ["t-a66d0f00e177e481", "757f970730d357daa5642d37d17906b5445dd39ed6131f8c193df41a912e78fe"],
  ["t-ae6c1f5c2be654a0", "9607e72584858b9918acb1c201dd57880b9f14b0c015f984e6cafa69c98ca9ed"],
  ["t-b3d7fc89f7503fe1", "2436ba25f2eec8146fecd48adcc676cbbc5963788e6dbbb884ef0936d6636241"],
  ["t-bac453424281f943", "dc57a14e01351376dbae3b4dc1a6e52f5ef01bbdabf709b13ce46cbab298ee05"],
  ["t-bee8cdf10a1ec756", "86098f5d7027139a65db4b5b873763bfb5954f73ff5c0aa8488ae17063cbad5b"],
  ["t-c2da6fd1537e5d5c", "1786fb23edd35e6074fd62812b91921e353deadc3b5dffda63a4603169463bfe"],
  ["t-c7a624a6d35c3cc5", "41e7ce667be6ae77688999edf699cfe648e350427afaf98dc23047e00ca35129"],
  ["t-c87ef4c38b1bfbd0", "1664315171e97bb66526c65b8e45897465d3d8bba845f5cc05d072153bbfefbc"],
  ["t-c9532f7a95af7caa", "f3b20e0738afde9d28667a26682ebf41e372bdfcf82d92cc712de42640ca366e"],
  ["t-c9a9f5b9ffe0e6df", "1359894f117b457be0d788d6dc8bd85c1ef5d7c280e701a68f69765b135ddd46"],
  ["t-cd40cdbf016b7e5c", "6ce325a0579077ee2f588532802cfe7452e305128fe864a0e5082d07de8dde01"],
  ["t-d01b6db408f1449c", "450c46605182eb59058804a8a9467852d9eccf104f8f5d6fb1ec44f3c9510ea4"],
  ["t-d68556ca6d0f0e40", "4c0b23eaccdb9f5ad1e75a71aebc8be15081708789457ec1c114481ff02fb79d"],
  ["t-e03ae8bce544de40", "9b2c597ed4eafb9c3297a2c057740340555db899eaaec2092d68601d30f9c658"],
  ["t-e6be2a5b989229da", "bd714fca5f77cab254e699152c275e7afad8fea2241fb6f29e2ff3de0b213222"],
  ["t-e82e3d4d6dee375e", "006097f81cc5b9ba7d1d1a20258e3ad4a741967ab7b9d475898b6cc9d5c75f0c"],
  ["t-edab77b505e4b59f", "a5b01856daa081c95f909d3a1b29ac12944fd5a27904d788ca09b5ff04931ef5"],
  ["t-f6b4418628433f32", "30a554137f2c0738f6ded0f6ca088d7cdf75ddc93bd5c85c17e0a169aad3d3c2"],
  ["t-f71ebc06e36ac386", "dd0d131281ffb73cc49411f634b9ab208fe8bfebf74e5f97b87f64f5994eadd8"],
  ["t-fd1d5ead9e44505c", "6fbe19e14026ad5ef61914d6a3e543efa6318ca02e1f3d3c8c930072e89fba19"]
]);

// These retained pairs were independently confirmed as content defects. An
// explicit repair may remove only pairs whose id and full pair hash still
// match this snapshot; a changed translation is retained and revalidated.
const confirmedInvalidPairs = new Map<string, string>([
  ["t-05db3dd9a9870380", "d72cb80f6602e67363a41dc9829a5eff3989f5c05b9853f293230dd222bb2010"],
  ["t-0942a319a62dffd0", "384f642b0d59d6add974ef5c6ed3463cc4d961294ff936d7ce003263a4286fff"],
  ["t-0bdce822375d8bce", "8414987a025629dddad3076c641293fc2509a3c508ac8f287dda8f241d136828"],
  ["t-0d63a0f87cab4413", "7f32cef3427091cea902424557bb768a3d69cfcbccfa85e9d62ae67ca2553841"],
  ["t-0e0ce74660913e7f", "5b1e93649276c3ded7e74740ba17f2a3d2fed66d3d45805e864de5c04b66e7bc"],
  ["t-10b797918dcc1486", "1bfcc281f71660fffb1d065610e7ea2f2f0636444aafac595f6de844e4c94184"],
  ["t-1a9b779bd2391aa3", "0c32f7cb2c0ebdc1bf7d0eebcf1b919dd16ae39bb3775e9672dac5bd96d97732"],
  ["t-1bd3cd7ff3142778", "dc2c7032e586336daca4569c2c6d084719251b34f1b76bd262e5daf9e57d7d23"],
  ["t-1bd998b77d91e357", "704c36c796a5d0342f62f05e248b8f1405425bb94973289d23f64ef54c9ed290"],
  ["t-1dd6c122778ada85", "d194e26abecbc2c807cc49c6dc9e3ea5f0034013bb618489df85561c6ddd4f17"],
  ["t-2667a0a9498b1cd3", "23825b5d75202544ddab500067634932deb1ed78cd6e0ed5d6fda4304177fcd2"],
  ["t-327a7bfc2b14e014", "8edd281a52efd42ae700f3b285aee9150eb918dc210e0a14d884f768bae61050"],
  ["t-3f0315403164005f", "223f01e6348b94b50320276c6635f82fa00ac110c61ead63b9f606140adfa906"],
  ["t-3f80ffe7b41da5da", "bac93994291e58b8d32f5f43794dbb0f705f27bb275aecd9ee5072b11e273659"],
  ["t-42786f3f8a0def7c", "f87445eb5b6172728b6f4ff1da482cdda9cd1ac47e54fae74a0cd9a3bc62fb06"],
  ["t-43faf0f7a6fc22e3", "70fbbb1ffc97cd6dc35379c416f330c4f6972b6a7db27a2e78d126ba919c8aeb"],
  ["t-4742f835e3fc0a22", "039bad2ab40001b2fee93fef748c854022b7291968d02fe256d4f0a0d9b336e4"],
  ["t-4744976125380a33", "e4fdd5c42555923a14eafb310bbec00bd22355c77d506d05311fbc49a61aa3c9"],
  ["t-49ba73df6520b578", "a17bf53f539975827038cd9212f41ac5b4d9e11c5393861328ae0f64ceddaca1"],
  ["t-4bcdd2645cbcd465", "899d395944e3589f038fe80b15d2e9186332c2aada4a44aed2b4b6b3858831ad"],
  ["t-50d6fe074b298c20", "560e62af02f0912db2d275e0321b09ce1e5a521614c972a72e3fbaa9ea318564"],
  ["t-51220e0a020b615b", "e5ba081dcc821ac5a6cf56dfa8ef02fbff62b09ab6eef4bd1c056a35d50db1f9"],
  ["t-67eaf2d49b285774", "c5ce7708c63a7c9a9f23e80e0a2b58de6163a32c9d04b4265cb6d5bf31eda9fc"],
  ["t-0b012ee45ca9ba33", "17185d501669dcf581b1eb753410280291592801d446a81d9f4c47c87785fc26"],
  ["t-135d9f4a135ea802", "8c7e2b60f53d72ae49ddf5f01f51a7ab1311f1df8a4c14974f549d3456efd784"],
  ["t-150e32a426ef6b8a", "a2c2e8223e0ce625a66517187bb28849b063e92424a78546b287679c929d4b02"],
  ["t-15a3b6fd06dfdb70", "df4df90e687674f2668e7dec5d79fa74e2843929fb24e75e2d24150698844616"],
  ["t-17b631e313c23d6f", "a388b9df11297425ba444f7518a9d65b922cb6aa0c78da6335dd3f2259b8802a"],
  ["t-199a577c3d23c7d2", "a05c8d62fac50b8f50fcc0de097ed73ada9b7fa582ea55dd4c45e4fc2c4298eb"],
  ["t-1d45f56bdc0f7ab7", "73f5ea37123cb729bab3ba8e3dc4b5bf7065903631b142cce470614f8e672d5b"],
  ["t-1db34907b40a0562", "f5c2480964aabb3dffb17691000c1c436413a94873bc897532df8fde469457a9"],
  ["t-20c69a26dc80e802", "411a7d249703a3286e22874438aef07b9894a06e9b1d05a8256ced81679c0115"],
  ["t-24b1717718a15b6a", "1d6ae0f18fdf62e8c08f1324183c9fa3e263763563b0e62998359a8e6d421cf1"],
  ["t-27a7c9bb7b94c12e", "fbaafdce4e45362893618440469a36a63b797df15c257474fedc1e8a30ac44a0"],
  ["t-329b783ad05da733", "85d62795ed01323e9d9f49c347cec82d4be7f1c1cd416d675023bbf891871cd2"],
  ["t-33f3cbb07d2598b1", "4a4802643db1100f3c29d510e70ce330be73a8610c83fd1f8d1e2f857304f270"],
  ["t-38b5dae6f0d2daea", "f8834a8b261eea001e705d4855696b2107b91f4cdc9d912561f5072d966ef638"],
  ["t-3b44ec293d91bb50", "c60dd39cb2d264c1eb4c0cfb73bb4464d2c5c51d27bf3951185ea78abdc323b0"],
  ["t-3c2e0c9f992e9801", "78e98e959eca91ada60a5eb56b98d98f42bd60f57c899901f88490bbdee9e156"],
  ["t-3d1f8a86001a3b90", "0cd6dec74f2d1beb1dc2cb3a45e8aaeb535f1215cb057481b36c19e3cacb9a6b"],
  ["t-452d38c9eb45ff1e", "294433947a5ed654eabd548fee1565a96cc05669d139dd06a0fd811602c80d4d"],
  ["t-50e62d7086047156", "a2baab0299d97518919c1c732da7beaf2c782fbde4de49610c97ea29f0fd7de2"],
  ["t-5703822d390f2951", "496c969a2347798f0809007c7dfd53be8109b6ea730081e5dceac3f60d817042"],
  ["t-5772c31157fb47c6", "09b5d6bb31aab6716f238cdabb93f188ee8a5d450a36b89669ffd4d6e04b48ec"],
  ["t-580d99c871043966", "e83e4e5a3942b04e92d7653403e1c4974ecfdc05fbd5cbfe3d774d922df4973f"],
  ["t-5a3e3a2733f6a9f6", "00960e5c79aaba940e8952dd3939e721004e4c36cfbac7a443e48e6a1e70a76e"],
  ["t-5dd39ba040fee369", "639e25c7a86a22f7eaef2f1dc003340aae78866fc060106e8976d6fe7f57f5d5"],
  ["t-5e12f12dd42ce9aa", "91e5bbe537c9b8a498be172bab5c451a27b155bfc177c82292e2bc170f0cc5d5"],
  ["t-604162c11cc2e6fc", "5d0842b1ab169f5b9da41ed0b5bc7213e7d797938579d4e03e772514481b39a7"],
  ["t-6213651e4dbac657", "06aeaa05cd4e1d770d4482961d5890a4d2cd9b4fb77ef0df56b2b372a731fff5"],
  ["t-64e636c65475a6aa", "a0ddd46dc3534e6491291666e20601592afc172a710039847323cd4da649658d"],
  ["t-66df1432fe5ea15e", "b6aa9db03e38d11fb8a54409d666a60dfc2911059783f888c04c1adff029e21d"],
  ["t-69558f531cfd08c6", "e39c608fb81c32d52ae95c327936c80d6a6cb3c855c8f7ee88dd4e61554df5f0"],
  ["t-6f6f43bfb9bd9966", "2a415ce98cffd513fad7b4f9ea3d4b46b711500b5c1a865a0e5cbe9c89fef36b"],
  ["t-0b43709454a2ff24", "3f733157116a84f0eb21332272255d8aba14544b861065347c74e03c540aaaa4"],
  ["t-0f7b5ab6ea22c7f6", "78ef88c5da9e5189d03ccaffeeb3dc8157825d811bae497d0d0015231e9b3028"],
  ["t-37a5a8cde919b45b", "0eb360be1b12524b6f0edb19fb835732e46c7c4412e25c851ec3142e850e605c"],
  ["t-3b8098c254a99507", "d217ca0ec30eea841c016aff552d2edacc6862651de78223b146e630782f75d1"],
  ["t-182c560ed4649de6", "35b75e46b414dbb8ccd4bab5758df14f0383a68072bcc578acdf9045b1d6e7b2"],
  ["t-444cb3ae598a6c99", "1f51cf82b509258b58815554548d551129e247708413ff9af2fb54edf3e50b65"],
  ["t-0e745ddd75a3b79c", "032a8416489c946b015cbee5fab2b3e3abcde6fc074ed577b384cb038e952875"],
  ["t-0f6b53e2615da799", "5d0cfb7d86b8810db329c88624d1510c09363a1790eb10afcb356e56959cf130"],
  ["t-06b6de662cf7d3e6", "c9bc8a11fe126b8b41ee8f0190b403874ad353734810f15eb48a30a4be783a09"],
  ["t-0c64482a95b53a2f", "f421b325ff2742bcf495c9f39a11cdda0887e0fc1ad35e9542e241fda9a114b4"],
  ["t-0cf7e2840fbd5310", "32fbcb9dbbfe21edb8f8b0f74b20e7456563e49def36855247bc3d3015d835a7"],
  ["t-5ec89900884fa83c", "2fc1c3f62ae0b17c504447b52acff6a22059297819c45981399e5c331d6f6f80"],
  ["t-24190bba5659f8b3", "26d02beb92892a69c41ffdd3f9b05f2373db85d57abccdb31f731c74aaf1b946"],
  ["t-5b37be68222af38c", "d035b4b28cabd52c54dee5d45c04e5f4e6a273d21a5d08b7ccf0a2a580fc1791"],
  ["t-0f12ed9787790c98", "e85cdd1933e155eceb7b8e722c970568782c82958a85055062a66ef71feacb2d"],
  ["t-615afd76cb9b6328", "fc0e2969b7c7d9b7ce8c176b68604e5872504624abad62b70850ec013b23662a"],
  ["t-3a07ff6e12a44d1e", "ab1336006e80dc3f4526a9bb175658dc65f3f3f6d555ef48fef9b63fa8f1f5b8"],
  ["t-08de3ffbf9e6cb16", "1ecce60db13c27a245ed863ca5374d9a7a2f13acf9df54d95371c54aa64c93e6"],
  ["t-03d2c6c873ac33cb", "b2569a3c102ea24fc0810552e1c56b4715a5b6f5e252214ea6a18c07a6423a42"],
  ["t-063628a0addc519d", "0b33ea3966ee2eb31c95f346be051a6cf3084449fca02715dc366ecce8cb58f9"],
  ["t-5371205a61c1f9c9", "8065ff2b57ab3f6e4ddef736417a3c6cab5934397a8e1511bad64a0c5f85680c"],
  ["t-4467f99985238ff9", "1c98f804e29dcca34682b9ae78116ab845b1b4ac50e984b519611feaf1e7a02d"],
  ["t-5aae6f26b3b7099f", "a3e8213d759e6c78b0772cbc4dac9d76fafd6dcc4d86dd1927118b9b05c200bd"],
  ["t-171f39157721e0f9", "dcb46cbb9b4c605a7142ee3755983ac016e04dca367c6d77bc79ba825c98507e"],
  ["t-60e7b95e9b8251cc", "63dc1ca96891bbf5f6b34a864a531fa0122e9da3181c0c06048a4a51d3d7e93a"],
  ["t-0683c9e0fbf2baa8", "29184a4175ce1d5d5562044f92efe615d71f8e19a79cfb3448008b8bdd2f7948"],
  ["t-02dadd6743b565f1", "ed0330a033b537b9800bc94b7099d32f6a0a97f49d81184b568308db35cb7e91"],
  ["t-1f1d9fd3c8a905bf", "3f5adb239338a46b310137339dfa12ff231dfa1874b7d960d40c7326e1536576"],
  ["t-41a074a397b8bbb5", "291160657664a82c68c4e5ba7ec329e31311e8647223138eb2f641f05f043294"],
  ["t-3bd96a42e2993bc3", "54b09781eeae327c8f20d5fa5d6f40e3e902b5fdff331e27545e5ca680169148"],
  ["t-504fbed3a4f0ec49", "0bfd450ab0b7bc435c64ba4c071c912e4636939d6fdc9334ce9e5e8b259fc583"],
  ["t-2dc293809ad43ff7", "579e22f295a4d9087588b32fa1ceba635478b9bfe7baa7dde14dbb8e15da11f4"],
  ["t-72f55f884ca46689", "babae14e9c5a29ba44be790593dea2fd8fa20c861209e6c63e78e5e239e4fdaf"],
  ["t-52ac0feddaba4b97", "01fa6c9af5bf1316500ac8411a6b5804540d4a884e662705bfcd48627b2d6668"],
  ["t-1aca6295d5b5b9cf", "6fdf07440233d232e6a89bbc791378a847d8f59bd6ed79a5ccf32f38e9a4d003"],
  ["t-22c223c90457e83b", "3d068f40a9ec9907996886c3fba7cb486c74e5331b9b870e1cc6907c71e41355"],
  ["t-6b6af959c0d3816e", "ee9e23fedcd0a9d41cc17290e06dd9d5c137c821a346f4ea2a1e5c8c7b039a18"],
  ["t-567583f7734e56a6", "e6797e5b0c01be3cb58e176ec253079733ab6470ff3dada3d396430f9b7ba54e"],
  ["t-2887851a2eafcf69", "f26afdb3442abd0bb826296bf35a900d96aa615efbb3b071b96fb1b5055dc38e"],
  ["t-350627b45c0fdb44", "2ccc1a3c427efb52bdd1e652282f62ac816a09bc3ea2c322db6ec7aa555e4b54"],
  ["t-1622da1b3c3a4337", "60dd4903b000d8dafac94b1d7de53be69fe0358fe68493b730f44c523f9dc831"],
  ["t-33c842381884a3df", "91458622d7b13b8a45e880f7adb7867eab1fb65053547eabb6efdf4b6aac5e45"],
  ["t-5dcadc3a139a08a9", "859bdcb76d8ff5d9dc446a9701e3f55afa0dac15d67dfef96a4ae23a9ef4a22d"],
  ["t-61bc9c9d729697df", "31b3c2b1d6b8bb8e952605b8d50c723dc7a14d25d02f4e0c69741ca76c251d4b"],
  ["t-37ac4c0e7213bbd8", "208b883448ed16f27d8cad8588e64db3eec669ce03018881b1d6d33b9998dc30"]
]);

function translationPairFingerprint(source: string, target: string) {
  return createHash("sha256").update(source).update("\0").update(target).digest("hex");
}

function translationAdjudication(entry: TranslationEntry, target: string) {
  const fingerprint = translationPairFingerprint(entry.source, target);
  if (adjudicatedFalsePositivePairs.get(entry.id) === fingerprint) return "false-positive" as const;
  if (confirmedInvalidPairs.get(entry.id) === fingerprint) return "confirmed-invalid" as const;
  return "unadjudicated" as const;
}

type ExistingTranslationFailure = {
  id: string;
  source: string;
  contexts: string[];
  message: string;
  adjudication: "confirmed-invalid" | "unadjudicated";
};

function auditExistingTranslations(
  currentEntries: TranslationEntry[],
  existing: Record<string, string>
) {
  const failures: ExistingTranslationFailure[] = [];
  let automatedValidationFailureCount = 0;
  let adjudicatedFalsePositiveCount = 0;

  currentEntries.forEach((entry) => {
    const translated = existing[entry.source];
    if (!translated?.trim()) return;

    let automatedMessage: string | undefined;
    try {
      validateRestoredTranslation(entry, translated);
    } catch (error) {
      automatedValidationFailureCount += 1;
      automatedMessage = String(error instanceof Error ? error.message : error);
    }

    const adjudication = translationAdjudication(entry, translated);
    if (adjudication === "false-positive") {
      if (automatedMessage) adjudicatedFalsePositiveCount += 1;
      return;
    }
    if (adjudication === "confirmed-invalid") {
      failures.push({
        id: entry.id,
        source: entry.source,
        contexts: entry.contexts,
        message: automatedMessage ?? "Independent A18/A09 language and semantic QA confirmed this exact translation pair is invalid",
        adjudication
      });
      return;
    }
    if (automatedMessage) {
      failures.push({
        id: entry.id,
        source: entry.source,
        contexts: entry.contexts,
        message: automatedMessage,
        adjudication
      });
    }
  });

  return { failures, automatedValidationFailureCount, adjudicatedFalsePositiveCount };
}

function argumentValue(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const dryRun = process.argv.includes("--dry-run");
const validateExisting = process.argv.includes("--validate-existing");
const repairMap = process.argv.includes("--repair-map");
const applyRepair = process.argv.includes("--apply");
const pruneStale = process.argv.includes("--prune-stale");
const inspectEntryId = argumentValue("--inspect-entry");
const requestedLimit = Number.parseInt(argumentValue("--limit") ?? "0", 10);
const concurrency = Number.parseInt(argumentValue("--concurrency") ?? "3", 10);
const maxEntriesPerBatch = Number.parseInt(argumentValue("--batch-size") ?? "36", 10);
const maxSourceCharactersPerBatch = Number.parseInt(argumentValue("--batch-chars") ?? "12000", 10);
const streamProviderResponses = process.argv.includes("--stream");

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return false;
  const text = readFileSync(filePath, "utf8");
  const allowedKeys = new Set(["DEEPSEEK_API_KEY", "DEEPSEEK_API_URL", "DEEPSEEK_MODEL"]);
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || !allowedKeys.has(match[1]) || process.env[match[1]]) return;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  });
  return true;
}

function loadCredentialEnvironment() {
  const configured = process.env.MAIS_SECRET_ENV_PATH?.trim();
  const candidates = [
    configured,
    path.resolve(projectRoot, "../MAIS-MVP/.env.local"),
    "/Users/dongpinhu/Desktop/MAIS-MVP/.env.local"
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.some(loadEnvFile);
}

function targetTopic(topic: Topic | undefined) {
  return Boolean(topic?.publisher && targetPublishers.has(topic.publisher));
}

function practiceQuestionCandidates(seed: ProductionLessonSeed) {
  const byTopic = questions.filter((question) => question.topicId === seed.topicId);
  if (!seed.practiceQuestionIds?.length) return byTopic;
  const byId = new Map(questions.map((question) => [question.id, question]));
  return seed.practiceQuestionIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
}

function displayedPracticeQuestions(seed: ProductionLessonSeed) {
  const candidates = practiceQuestionCandidates(seed);
  const deduped = dedupePracticeQuestions(candidates) as Question[];
  if (deduped.length <= lessonPracticeQuestionLimit) return deduped;
  const selected = deduped.slice(0, lessonPracticeQuestionLimit);
  if (selected.some((question) => handwritingCapableQuestionTypes.has(question.type))) return selected;
  const handwritingQuestion = deduped.find((question) => handwritingCapableQuestionTypes.has(question.type));
  return handwritingQuestion
    ? [...selected.slice(0, lessonPracticeQuestionLimit - 1), handwritingQuestion]
    : selected;
}

type DisplayedEnglishSurfaceReference = {
  id: string;
  source: string;
  target: string;
  context: string;
  mapBacked: boolean;
};

const pseudoEnglishCategories = [
  "pseudo-times-surface",
  "pseudo-one-items",
  "pseudo-same-equal",
  "pseudo-can-can",
  "pseudo-none-number-items",
  "pseudo-part-separately",
  "pseudo-correct-of-is",
  "pseudo-in-requires"
] as const;

function collectDisplayedEnglishSurfaceReferences(existing: Record<string, string>) {
  const references: DisplayedEnglishSurfaceReference[] = [];

  function add(value: LocalizedText | undefined, context: string) {
    if (!value) return;
    const source = chinaLessonEnglishTranslationKey(value.zhHans ?? value.zh);
    if (!source || !cjkPattern.test(source)) return;
    const mappedTarget = existing[source]?.trim();
    references.push({
      id: `t-${createHash("sha256").update(source).digest("hex").slice(0, 16)}`,
      source,
      target: mappedTarget || value.en.trim(),
      context,
      mapBacked: Boolean(mappedTarget)
    });
  }

  productionLessonSeeds
    .filter((seed) => /^(?:bnu|hjb)-/u.test(seed.topicId))
    .forEach((seed) => {
      add(seed.title, `${seed.topicId}.title`);
      add(seed.description, `${seed.topicId}.description`);
      seed.blocks.forEach((block, blockIndex) => {
        add(block.title, `${seed.topicId}.blocks[${blockIndex}].title`);
        add(block.content, `${seed.topicId}.blocks[${blockIndex}].content`);
        block.items?.forEach((item, itemIndex) => {
          add(item, `${seed.topicId}.blocks[${blockIndex}].items[${itemIndex}]`);
        });
      });
      displayedPracticeQuestions(seed).forEach((question, questionIndex) => {
        const prefix = `${seed.topicId}.practice[${questionIndex}](${question.id})`;
        add(question.prompt, `${prefix}.prompt`);
        question.options?.forEach((option, optionIndex) => add(option, `${prefix}.options[${optionIndex}]`));
        add(question.explanation, `${prefix}.explanation`);
      });
    });

  return references;
}

function surfaceReferenceCount(references: DisplayedEnglishSurfaceReference[]) {
  const mapBackedReferenceCount = references.filter((reference) => reference.mapBacked).length;
  return {
    referenceCount: references.length,
    uniqueSourceCount: new Set(references.map((reference) => reference.source)).size,
    mapBackedReferenceCount,
    fallbackReferenceCount: references.length - mapBackedReferenceCount
  };
}

function surfaceLanguageSamples(references: DisplayedEnglishSurfaceReference[]) {
  const seen = new Set<string>();
  return references.flatMap((reference) => {
    if (seen.has(reference.source) || seen.size >= 12) return [];
    seen.add(reference.source);
    return [{
      id: reference.id,
      context: reference.context,
      provenance: reference.mapBacked ? "translation-map" : "fallback-English"
    }];
  });
}

function auditDisplayedEnglishSurfaces(existing: Record<string, string>) {
  const references = collectDisplayedEnglishSurfaceReferences(existing);
  const strictCompleteTermTokenReferences = references.filter((reference) => hasCompleteGeneratedTermToken(reference.target));
  const hardInvalidTermTokenReferences = references.filter((reference) => hasGeneratedTermTokenPrefix(reference.target));
  const broadDiagnosticReferences = references.filter((reference) => hasBroadPseudoEnglishDiagnostic(reference.target));
  const findingsByReference = references.map((reference) => ({
    reference,
    categories: englishSurfaceLanguageFindings(reference.target)
      .map((finding) => finding.category)
      .filter((category) => category !== "fallback-term-token")
  }));
  const highConfidencePseudoEnglishReferences = findingsByReference
    .filter((entry) => entry.categories.length > 0)
    .map((entry) => entry.reference);
  const highConfidencePseudoEnglishWithoutTermReferences = highConfidencePseudoEnglishReferences
    .filter((reference) => !hasGeneratedTermTokenPrefix(reference.target));
  const blockingReferences = references.filter((reference) => (
    hasGeneratedTermTokenPrefix(reference.target)
      || englishSurfaceLanguageFindings(reference.target).some((finding) => finding.category !== "fallback-term-token")
  ));
  const pseudoCategoryCounts = Object.fromEntries(pseudoEnglishCategories.map((category) => [
    category,
    surfaceReferenceCount(
      findingsByReference.filter((entry) => entry.categories.includes(category)).map((entry) => entry.reference)
    )
  ]));

  return {
    scope: "rendered BNU/HJB lesson title, description, block, and exact displayed-practice prompt/option/explanation fields",
    decision: blockingReferences.length ? "blocked-needs-translation-repair" : "surface-language-gate-green",
    mutationPolicy: "report-only; never eligible for retained-map repair without exact-pair A18/A09 adjudication",
    sourceFieldReferenceCount: references.length,
    uniqueSourceCount: new Set(references.map((reference) => reference.source)).size,
    strictCompleteTermToken: surfaceReferenceCount(strictCompleteTermTokenReferences),
    hardInvalidTermToken: surfaceReferenceCount(hardInvalidTermTokenReferences),
    broadDiagnostic: surfaceReferenceCount(broadDiagnosticReferences),
    highConfidencePseudoEnglish: surfaceReferenceCount(highConfidencePseudoEnglishReferences),
    highConfidencePseudoEnglishWithoutTerm: surfaceReferenceCount(highConfidencePseudoEnglishWithoutTermReferences),
    blockingUnion: surfaceReferenceCount(blockingReferences),
    pseudoCategoryCounts,
    mutationEligibleReferenceCount: 0,
    hardInvalidTermSamples: surfaceLanguageSamples(hardInvalidTermTokenReferences),
    highConfidencePseudoEnglishSamples: surfaceLanguageSamples(highConfidencePseudoEnglishWithoutTermReferences)
  };
}

function collectTranslationEntries(existing: Record<string, string>) {
  const collected = new Map<string, TranslationEntry>();

  function add(value: LocalizedText | undefined, context: string) {
    if (!value) return;
    const source = chinaLessonEnglishTranslationKey(value.zhHans ?? value.zh);
    if (!source || !cjkPattern.test(source) || existing[source]?.trim()) return;
    const current = collected.get(source);
    if (current) {
      if (current.contexts.length < 6 && !current.contexts.includes(context)) current.contexts.push(context);
      return;
    }
    collected.set(source, {
      id: `t-${createHash("sha256").update(source).digest("hex").slice(0, 16)}`,
      source,
      contexts: [context]
    });
  }

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  productionLessonSeeds.forEach((seed) => {
    const topic = topicById.get(seed.topicId);
    if (!targetTopic(topic)) return;
    add(seed.title, `${seed.topicId}.title`);
    add(seed.description, `${seed.topicId}.description`);
    seed.blocks.forEach((block, blockIndex) => {
      add(block.title, `${seed.topicId}.blocks[${blockIndex}].title`);
      add(block.content, `${seed.topicId}.blocks[${blockIndex}].content`);
      block.items?.forEach((item, itemIndex) => add(item, `${seed.topicId}.blocks[${blockIndex}].items[${itemIndex}]`));
    });
    displayedPracticeQuestions(seed).forEach((question, questionIndex) => {
      const prefix = `${seed.topicId}.practice[${questionIndex}](${question.id})`;
      add(question.topic, `${prefix}.topic`);
      add(question.prompt, `${prefix}.prompt`);
      question.options?.forEach((option, optionIndex) => add(option, `${prefix}.options[${optionIndex}]`));
      if (question.type !== "multiple-choice") {
        add(
          { en: question.answer, zh: question.answer, zhHans: question.answer },
          `${prefix}.answerDisplay`
        );
      }
      add(question.explanation, `${prefix}.explanation`);
      question.questionAssets?.forEach((asset, assetIndex) => {
        add(asset.alt, `${prefix}.assets[${assetIndex}].alt`);
        add(asset.caption, `${prefix}.assets[${assetIndex}].caption`);
      });
    });
  });

  return Array.from(collected.values()).sort((left, right) => left.id.localeCompare(right.id, "en"));
}

function batchesFor(entries: TranslationEntry[]) {
  const batches: TranslationEntry[][] = [];
  let current: TranslationEntry[] = [];
  let currentCharacters = 0;
  entries.forEach((entry) => {
    if (
      current.length &&
      (current.length >= maxEntriesPerBatch || currentCharacters + entry.source.length > maxSourceCharactersPerBatch)
    ) {
      batches.push(current);
      current = [];
      currentCharacters = 0;
    }
    current.push(entry);
    currentCharacters += entry.source.length;
  });
  if (current.length) batches.push(current);
  return batches;
}

function extractProviderJson(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/u);
  if (!match) throw new Error("Provider response did not contain a JSON object");
  return JSON.parse(match[0]);
}

type DeepSeekChoice = {
  delta?: { content?: string | null };
  finish_reason?: string | null;
  message?: { content?: string | null };
};

function assertCompletedProviderChoice(choice: DeepSeekChoice | undefined) {
  const finishReason = choice?.finish_reason;
  if (finishReason !== "stop") {
    throw new Error(`DeepSeek response ended with finish_reason=${String(finishReason ?? "missing")}`);
  }
}

async function readDeepSeekSseContent(response: Response) {
  if (!response.body) throw new Error("DeepSeek streaming response did not include a body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let content = "";
  let finishReason: string | null | undefined;
  let doneMarkerSeen = false;

  function consumeEvent(event: string) {
    const data = event
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /u, ""))
      .join("\n")
      .trim();
    // DeepSeek emits `: keep-alive` comments while a request is queued.
    if (!data) return;
    if (data === "[DONE]") {
      doneMarkerSeen = true;
      return;
    }
    const chunk = JSON.parse(data) as { choices?: DeepSeekChoice[] };
    const choice = chunk.choices?.[0];
    if (!choice) return; // Usage-only chunks legitimately have no choices.
    if (typeof choice.delta?.content === "string") content += choice.delta.content;
    if (choice.finish_reason != null) finishReason = choice.finish_reason;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    while (true) {
      const separator = buffered.match(/\r?\n\r?\n/u);
      if (!separator || separator.index == null) break;
      consumeEvent(buffered.slice(0, separator.index));
      buffered = buffered.slice(separator.index + separator[0].length);
    }
  }
  buffered += decoder.decode();
  if (buffered.trim()) consumeEvent(buffered);
  if (!doneMarkerSeen) throw new Error("DeepSeek streaming response ended before data: [DONE]");
  assertCompletedProviderChoice({ finish_reason: finishReason });
  return content;
}

async function readDeepSeekResponseContent(response: Response, stream: boolean) {
  if (stream) return readDeepSeekSseContent(response);
  // Reading the body can fail after fetch() resolves (for example, Undici's
  // `terminated` error), so this work stays inside translateBatch's retries.
  const payload = JSON.parse(await response.text()) as { choices?: DeepSeekChoice[] };
  const choice = payload.choices?.[0];
  assertCompletedProviderChoice(choice);
  return choice?.message?.content;
}

async function translateBatch(
  batch: TranslationEntry[],
  configuration: { apiKey: string; apiUrl: string; model: string; stream: boolean },
  attempt = 0,
  validationRetryReason?: string
): Promise<ProviderTranslation[]> {
  const providerIds = batch.map((_, index) => `item-${index + 1}`);
  let response: Response;
  try {
    response = await fetch(configuration.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${configuration.apiKey}`,
        ...(configuration.stream ? { Accept: "text/event-stream" } : {})
      },
      body: JSON.stringify({
        model: configuration.model,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        temperature: 0.05,
        max_tokens: 12000,
        stream: configuration.stream,
        messages: [
          {
            role: "system",
            content: [
              "You are a senior bilingual mathematics curriculum editor for a production digital-learning platform.",
              "Translate every Simplified Chinese source into natural, precise instructional English suitable for the stated school level.",
              "Preserve every Arabic number, decimal, fraction, variable, equation, mathematical symbol, unit value, and delimited LaTeX expression exactly.",
              "When the Chinese source expresses a number with Chinese numeral characters, spell that number with English words; never introduce an additional Arabic digit.",
              "Interpret Chinese measure words from the mathematical context instead of translating their standalone dictionary meaning. In particular, 下 after a count of jumps, skips, strikes, or repetitions is a count unit such as jumps or repetitions, never the spatial word below; similarly translate 本, 张, 枚, 次, 圈, and other classifiers as natural English units for the named object or action.",
              "When 正 is used as a tally mark in elementary data-recording content, describe each 正 as one group of five tally marks in English; never retain the Chinese character.",
              "The source may contain protected tokens such as ZXQTERMAQXZ, ZXQMATHBQXZ, or ZXQNUMCQXZ. Copy every protected token exactly once; do not edit, translate, duplicate, or omit it. Preserve the relative order of all MATH tokens. NUM tokens may move only when natural English prose reverses the source word order; never reorder numbers within an equation, ratio, coordinate, option, or other displayed mathematical expression. Place TERM tokens where natural English syntax requires.",
              "Preserve symbolic operators exactly. Never replace +, −, ×, ÷, =, inequalities, grouping, coordinates, or other mathematical notation with a different symbol or a word, and never add a second sign before a number.",
              "Use canonical bearings: 东偏北 is north of east, 东偏南 is south of east, 西偏北 is north of west, 西偏南 is south of west, 北偏东 is east of north, 北偏西 is west of north, 南偏东 is east of south, and 南偏西 is west of south.",
              "Use correct count-noun agreement and ordinal suffixes. Express multiplication mnemonics as natural facts such as six times six is thirty-six.",
              "When an Arabic digit 1 directly precedes a count noun, use the singular noun and a singular verb: 1 ball, 1 book, 1 hour, and 1 square; never 1 balls, 1 books, 1 hours, or 1 squares.",
              "Do not introduce capital A, B, C, or D as an English article, generic option label, group name, or object name unless the source contains that exact identifier. Rephrase with the, one, or a descriptive noun when an English article would create a new capital identifier.",
              "Preserve every standalone Latin mathematical identifier exactly, including lowercase variables such as a, b, d, f, i, l, m, n, r, x, and y and uppercase point, ray, line, and option labels. Do not replace, expand, silently omit, or invent an identifier.",
              "Never add a ratio colon, explanatory step number, grade number, group number, or repeated unit number that is not present in the source. Translate Chinese numeral words with English words and preserve the exact Arabic-number multiset.",
              "Use standard mathematical English: least or lowest common denominator, column method, natural grade/class names, natural calendar dates, and standard English values for Chinese 万, 亿, and 万亿 scales.",
              "Use standard English punctuation only. Do not emit fullwidth punctuation, malformed period-semicolon pairs, or raw Markdown emphasis.",
              "Do not solve, alter, simplify, add, or remove mathematical content. Preserve option meaning and the reasoning chain.",
              "Remove generator labels or internal workflow wording if a source accidentally contains them, while retaining the actual mathematical instruction.",
              "Return only one JSON object with key translations. Each item must contain exactly id and en. No Markdown and no Chinese characters in en."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              outputContract: { translations: [{ id: "same input id", en: "English translation" }] },
              rules: [
                "Return every input id exactly once and in the same order.",
                "Copy protected tokens exactly once. Keep protected MATH tokens in the same relative order. Move NUM tokens only for natural prose syntax, never inside a mathematical expression.",
                "Translate Chinese-character numerals with English words so the Arabic-number multiset stays exactly unchanged.",
                "Use clear age-appropriate mathematical English, not word-for-word machine phrasing.",
                "Resolve classifier and unit meaning from the whole source and the supplied lesson context; reject literal translations such as 140 below when 140下 counts an activity.",
                "Use canonical compass bearings, correct singular agreement and ordinals, natural multiplication facts, least/lowest common denominator, and column method.",
                "Use natural English dates, grade/class constructions, numeric scales, and ASCII/standard Unicode mathematical punctuation; return no raw Markdown.",
                "Do not mention QA, RAG, approval, source distance, integration, generators, or internal ids.",
                ...(validationRetryReason
                  ? [`A previous attempt failed validation: ${validationRetryReason}. Correct that exact invariant in this retry.`]
                  : [])
              ],
              entries: batch.map((entry, index) => ({
                id: providerIds[index],
                sourceZhHans: protectTranslationSource(entry.source).protectedSource,
                contexts: entry.contexts
              }))
            })
          }
        ]
      }),
      signal: AbortSignal.timeout(180000)
    });
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    }
    throw new Error(`DeepSeek network request failed after retries: ${String(error instanceof Error ? error.message : error)}`);
  }

  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.body?.cancel().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    }
    let safeText = "[response body unavailable]";
    try {
      safeText = (await response.text()).replaceAll(configuration.apiKey, "[REDACTED_API_KEY]").slice(0, 800);
    } catch {
      // Status and redacted endpoint context remain enough for a safe failure.
    }
    throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
  }

  let content: string | null | undefined;
  try {
    content = await readDeepSeekResponseContent(response, configuration.stream);
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    }
    throw new Error(
      `DeepSeek response transport failed after retries: ${String(error instanceof Error ? error.message : error)}`
    );
  }
  if (!content) {
    if (attempt < 2) return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    throw new Error("DeepSeek response did not include message content after retries");
  }
  let parsed: { translations?: ProviderTranslation[] };
  try {
    parsed = extractProviderJson(content) as { translations?: ProviderTranslation[] };
  } catch {
    if (attempt < 2) return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    throw new Error("DeepSeek response did not contain valid JSON after retries");
  }
  if (!Array.isArray(parsed.translations)) {
    if (attempt < 2) return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    throw new Error("DeepSeek response did not include translations[] after retries");
  }
  const expectedIds = providerIds;
  if (batch.length === 1 && parsed.translations.length === 1) {
    parsed.translations[0].id = expectedIds[0];
  }
  const actualIds = parsed.translations.map((entry) => entry.id);
  if (expectedIds.join("|") !== actualIds.join("|")) {
    if (attempt < 2) return translateBatch(batch, configuration, attempt + 1, validationRetryReason);
    throw new Error(
      `DeepSeek response ids did not match after retries; expected ${expectedIds.join("|")}, received ${actualIds.join("|")}`
    );
  }
  return parsed.translations;
}

function writeTranslations(translations: Record<string, string>) {
  const sorted = Object.fromEntries(Object.entries(translations).sort((left, right) => left[0].localeCompare(right[0], "zh-Hans")));
  const serialized = `${JSON.stringify(sorted, null, 2)}\n`;
  writeFileSync(temporaryOutputPath, serialized, { encoding: "utf8", mode: 0o600 });
  const staged = readFileSync(temporaryOutputPath, "utf8");
  if (staged !== serialized) throw new Error("translation-map staged re-read did not match the planned payload");
  JSON.parse(staged);
  renameSync(temporaryOutputPath, outputPath);
  const persisted = readFileSync(outputPath, "utf8");
  if (persisted !== serialized) throw new Error("translation-map persisted re-read did not match the planned payload");
}

async function main() {
  if (applyRepair && !repairMap) throw new Error("--apply requires --repair-map");
  if (pruneStale && !repairMap) throw new Error("--prune-stale requires --repair-map");
  if (applyRepair && pruneStale) {
    throw new Error("--apply removes confirmed-invalid translations only; stale pruning is report-only");
  }
  if (repairMap && validateExisting) throw new Error("Choose only one of --repair-map or --validate-existing");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) throw new Error("--concurrency must be 1-5");
  if (!Number.isInteger(maxEntriesPerBatch) || maxEntriesPerBatch < 1 || maxEntriesPerBatch > 60) throw new Error("--batch-size must be 1-60");
  if (!Number.isInteger(maxSourceCharactersPerBatch) || maxSourceCharactersPerBatch < 1000 || maxSourceCharactersPerBatch > 24000) {
    throw new Error("--batch-chars must be 1000-24000");
  }
  const existing = JSON.parse(readFileSync(outputPath, "utf8")) as Record<string, string>;
  const surfaceLanguageAudit = auditDisplayedEnglishSurfaces(existing);
  if (repairMap) {
    const currentEntries = collectTranslationEntries({});
    const currentSources = new Set(currentEntries.map((entry) => entry.source));
    const staleKeys = Object.keys(existing).filter((source) => !currentSources.has(source));
    const audit = auditExistingTranslations(currentEntries, existing);
    const confirmedInvalidEntries = audit.failures.filter((entry) => entry.adjudication === "confirmed-invalid");
    const unadjudicatedInvalidEntries = audit.failures.filter((entry) => entry.adjudication === "unadjudicated");
    const shouldApply = applyRepair && !dryRun;
    const planned = { ...existing };
    if (shouldApply) {
      const minimumCurrentSourceCount = 5000;
      const minimumExistingTranslationCount = 1000;
      if (currentEntries.length < minimumCurrentSourceCount || Object.keys(existing).length < minimumExistingTranslationCount) {
        throw new Error(
          `repair-map inventory safeguard refused apply: current=${currentEntries.length}/${minimumCurrentSourceCount}, existing=${Object.keys(existing).length}/${minimumExistingTranslationCount}`
        );
      }
      confirmedInvalidEntries.forEach((entry) => delete planned[entry.source]);
      const removalCount = Object.keys(existing).length - Object.keys(planned).length;
      const maximumRemovalCount = Math.max(100, Math.floor(Object.keys(existing).length * 0.25));
      if (removalCount > maximumRemovalCount) {
        throw new Error(
          `repair-map inventory safeguard refused ${removalCount} removals; maximum is ${maximumRemovalCount}`
        );
      }
      writeTranslations(planned);
      const reread = JSON.parse(readFileSync(outputPath, "utf8")) as Record<string, string>;
      if (Object.keys(reread).length !== Object.keys(planned).length) {
        throw new Error("repair-map persisted inventory count did not match the approved plan");
      }
    }
    process.stdout.write(`${JSON.stringify({
      mode: "repair-map-plan",
      applyRequested: applyRepair,
      pruneStaleRequested: pruneStale,
      dryRun,
      applied: shouldApply,
      currentSourceCount: currentEntries.length,
      existingTranslationCount: Object.keys(existing).length,
      automatedValidationFailureCount: audit.automatedValidationFailureCount,
      adjudicatedFalsePositiveCount: audit.adjudicatedFalsePositiveCount,
      invalidCandidateCount: audit.failures.length,
      confirmedInvalidCandidateCount: confirmedInvalidEntries.length,
      unadjudicatedInvalidCandidateCount: unadjudicatedInvalidEntries.length,
      invalidEntries: audit.failures.map(({ source: _source, ...entry }) => entry),
      staleCandidateCount: staleKeys.length,
      plannedInvalidRemovalCount: applyRepair ? confirmedInvalidEntries.length : 0,
      plannedStaleRemovalCount: 0,
      removedInvalidCount: shouldApply ? confirmedInvalidEntries.length : 0,
      removedStaleCount: 0,
      retainedTranslationCount: Object.keys(shouldApply ? planned : existing).length,
      surfaceLanguageAudit
    }, null, 2)}\n`);
    return;
  }
  if (validateExisting) {
    const currentEntries = collectTranslationEntries({});
    const missingEntries = currentEntries.filter((entry) => !existing[entry.source]?.trim());
    const audit = auditExistingTranslations(currentEntries, existing);
    const confirmedInvalidCount = audit.failures.filter((entry) => entry.adjudication === "confirmed-invalid").length;
    const unadjudicatedFailureCount = audit.failures.length - confirmedInvalidCount;
    process.stdout.write(`${JSON.stringify({
      mode: "validate-existing",
      currentSourceCount: currentEntries.length,
      translatedCurrentSourceCount: currentEntries.length - missingEntries.length,
      missingCount: missingEntries.length,
      missingSamples: missingEntries.slice(0, 20).map((entry) => ({ id: entry.id, contexts: entry.contexts })),
      automatedValidationFailureCount: audit.automatedValidationFailureCount,
      adjudicatedFalsePositiveCount: audit.adjudicatedFalsePositiveCount,
      failureCount: audit.failures.length,
      confirmedInvalidCount,
      unadjudicatedFailureCount,
      failures: audit.failures.map(({ source: _source, ...entry }) => entry),
      surfaceLanguageAudit
    }, null, 2)}\n`);
    if (missingEntries.length || audit.failures.length || surfaceLanguageAudit.blockingUnion.referenceCount) {
      process.exitCode = 1;
    }
    return;
  }
  const allPending = collectTranslationEntries(existing);
  if (inspectEntryId) {
    const entry = allPending.find((candidate) => candidate.id === inspectEntryId);
    process.stdout.write(`${JSON.stringify(entry ?? { id: inspectEntryId, status: "not-pending" }, null, 2)}\n`);
    return;
  }
  const pending = requestedLimit > 0 ? allPending.slice(0, requestedLimit) : allPending;
  const batches = batchesFor(pending);
  process.stdout.write(`${JSON.stringify({
    mode: dryRun ? "dry-run" : "translate",
    existingTranslations: Object.keys(existing).length,
    totalPendingTranslations: allPending.length,
    selectedTranslations: pending.length,
    batches: batches.length,
    hardInvalidFallbackTermReferenceCount: surfaceLanguageAudit.hardInvalidTermToken.fallbackReferenceCount,
    highConfidenceFallbackPseudoEnglishReferenceCount: surfaceLanguageAudit.highConfidencePseudoEnglish.fallbackReferenceCount,
    surfaceLanguageBlockerReferenceCount: surfaceLanguageAudit.blockingUnion.referenceCount,
    surfaceLanguageMutationEligibleReferenceCount: surfaceLanguageAudit.mutationEligibleReferenceCount
  })}\n`);
  if (dryRun || !pending.length) return;

  loadCredentialEnvironment();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiUrl = process.env.DEEPSEEK_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  if (!apiKey) throw new Error("DeepSeek credential is unavailable in the approved local environment source");
  const endpoint = new URL(apiUrl);
  const allowedPaths = new Set(["/chat/completions", "/v1/chat/completions"]);
  if (
    endpoint.protocol !== "https:"
    || endpoint.hostname !== "api.deepseek.com"
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || !allowedPaths.has(endpoint.pathname.replace(/\/$/u, ""))
  ) {
    throw new Error("Refusing a DeepSeek endpoint outside the official HTTPS chat-completions paths");
  }
  process.stdout.write(`${JSON.stringify({
    provider: "DeepSeek",
    model,
    endpointHost: endpoint.hostname,
    credential: "present-redacted",
    thinking: "disabled",
    transport: streamProviderResponses ? "sse" : "json"
  })}\n`);
  const providerConfiguration = {
    apiKey,
    apiUrl: endpoint.toString(),
    model,
    stream: streamProviderResponses
  };

  let nextBatchIndex = 0;
  let completedEntries = 0;
  const failedBatches: Array<{ batch: number; entryIds: string[]; reason: string }> = [];
  async function validateWithRetries(source: TranslationEntry, initialEnglish: string) {
    let candidate = initialEnglish;
    let validationError = "translation failed an unspecified validation rule";
    for (let validationAttempt = 0; validationAttempt < 3; validationAttempt += 1) {
      try {
        const restored = validateTranslation(source, candidate);
        if (translationAdjudication(source, restored) === "confirmed-invalid") {
          throw new Error(`${source.id}: refusing a confirmed-invalid translation pair`);
        }
        return restored;
      } catch (error) {
        validationError = String(error instanceof Error ? error.message : error);
        if (validationAttempt === 2) break;
        const retry = await translateBatch([source], providerConfiguration, 0, validationError);
        if (!retry[0]) throw new Error(`${source.id}: provider omitted the isolated retry result`);
        candidate = retry[0].en;
      }
    }
    throw new Error(`${source.id}: translation failed validation after two isolated retries: ${validationError}`);
  }

  async function worker(workerId: number) {
    while (nextBatchIndex < batches.length) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;
      const batch = batches[batchIndex];
      const result: Array<ProviderTranslation | undefined> = Array.from({ length: batch.length });
      const batchFailureIndexes = new Set<number>();
      try {
        const translated = await translateBatch(batch, providerConfiguration);
        translated.forEach((entry, index) => {
          result[index] = entry;
        });
      } catch (error) {
        process.stdout.write(`${JSON.stringify({
          worker: workerId,
          batch: batchIndex + 1,
          fallback: "isolated-entry-requests",
          reason: String(error instanceof Error ? error.message : error).slice(0, 240)
        })}\n`);
        // Preserve the configured provider-concurrency ceiling during recovery.
        // Each worker retries entries serially, and an irrecoverable entry no
        // longer discards its successfully translated siblings.
        for (let entryIndex = 0; entryIndex < batch.length; entryIndex += 1) {
          const entry = batch[entryIndex];
          try {
            const isolated = await translateBatch([entry], providerConfiguration);
            if (!isolated[0]) throw new Error("isolated batch returned no translation");
            result[entryIndex] = isolated[0];
          } catch (isolatedError) {
            batchFailureIndexes.add(entryIndex);
            failedBatches.push({
              batch: batchIndex + 1,
              entryIds: [entry.id],
              reason: String(isolatedError instanceof Error ? isolatedError.message : isolatedError).slice(0, 500)
            });
          }
        }
      }

      let completedInBatch = 0;
      for (let entryIndex = 0; entryIndex < batch.length; entryIndex += 1) {
        const source = batch[entryIndex];
        const translated = result[entryIndex];
        if (!translated || batchFailureIndexes.has(entryIndex)) continue;
        try {
          const english = await validateWithRetries(source, translated.en);
          existing[source.source] = english;
          completedInBatch += 1;
        } catch (error) {
          batchFailureIndexes.add(entryIndex);
          failedBatches.push({
            batch: batchIndex + 1,
            entryIds: [source.id],
            reason: String(error instanceof Error ? error.message : error).slice(0, 500)
          });
        }
      }
      if (completedInBatch > 0) {
        completedEntries += completedInBatch;
        writeTranslations(existing);
      }
      process.stdout.write(`${JSON.stringify({
        worker: workerId,
        batch: batchIndex + 1,
        batches: batches.length,
        status: batchFailureIndexes.size ? (completedInBatch ? "partial" : "deferred-after-retries") : "complete",
        completedInBatch,
        deferredInBatch: batchFailureIndexes.size,
        completedEntries,
        selectedTranslations: pending.length
      })}\n`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, (_, index) => worker(index + 1)));
  process.stdout.write(`${JSON.stringify({
    selectedTranslations: pending.length,
    completedEntries,
    deferredEntries: failedBatches.reduce((sum, batch) => sum + batch.entryIds.length, 0),
    failedBatches
  })}\n`);
  if (failedBatches.length) process.exitCode = 1;
}

main().catch((error) => {
  const message = String(error instanceof Error ? error.message : error);
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  process.stderr.write(`${apiKey ? message.replaceAll(apiKey, "[REDACTED_API_KEY]") : message}\n`);
  process.exitCode = 1;
});
