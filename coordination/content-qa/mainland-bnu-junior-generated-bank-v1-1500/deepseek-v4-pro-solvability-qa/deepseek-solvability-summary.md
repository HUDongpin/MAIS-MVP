# DeepSeek V4 Pro Solvability QA - Mainland BNU Junior V1 Candidate

- Date: 2026-05-28
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-junior-generated-bank-v1-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Status counts: pass 1347, fail 153
- Severity counts: none 1347, blocker 106, major 47
- Solvable counts: true 1487, false 13
- Answer-match counts: true 1347, false 153
- Issue tag counts: answer_mismatch 151, explanation_mismatch 135, missing_condition 14, unsolvable 3, ambiguous_mc 12, bad_options 4, accepted_answer_gap 1
- QA-output concern rows: 16
- Token usage: prompt 793688, completion 175226, total 968914

## QA Gate Result

DeepSeek V4 Pro flagged 153 item(s); 153 are fail/major/blocker remediation rows. These require S18 review before any public integration.

## Issue Preview

| ID | Grade | Type | Status | Severity | Solvable | Answer matches | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bnu-junior-ds-v1-s1-014` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 两个正方体拼接时，重合面消失，面数为10正确；但棱数计算错误：每个正方体12条棱，拼接处有4条棱重合，总棱数应为12+12-4=20，而非24；顶点数：每个正方体8个顶点，拼接处4个顶点重合，总顶点数应为8+8-4=12，而非16。答案和解释均错误。 |
| `bnu-junior-ds-v1-s1-017` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 与第14题类似，两个正方体拼接，面数10正确，但棱数应为20，顶点数应为12，答案和解释均错误。 |
| `bnu-junior-ds-v1-s1-019` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目与第13题条件相同，最少需要6个小立方块，而非5个。解释中“前排第1列2个、第3列2个，后排第2列1个”总数为5，但此时从左面看，前排第1列2个、第3列2个，后排第2列1个，从左面看应为2列，第1列最高2（前排第1列），第2列最高1（后排第2列），符合条件，但正面看第2列只有后排1个，正面看第2列应为1，符合2,1,2，但此时总数为5，似乎可行？但需验证：若前排第1列2个，第2列0个，第3列2个；后排第1列0个，第2列1个，第3列0个。正面看：第1列最高2，第2列最高1，第3列最高2，符合；左面看：前排最高2（第1列和第3列都是2），后排最高1（第2列1），即左面看第1列最高2，第2列最高1，符合。总数为2+2+1=5。但第13题同样条件答案为6，且第13题解释为最少6个。实际上，这种摆放是可能的，最少应为5个。但第13题答案6个，此处答案5个，存在矛盾。重新分析：正面看3列，左面看2列，设俯视图为2行3列。正面第1列最高2，第2列最高1，第3列最高2；左面第1列最高2，第2列最高1。最少时，可让第1列和第3列的两层都在同一排（前排），第2列的一层在另一排（后排），总数为2+1+2=5。但需检查左面看：前排有第1列2、第3列2，所以前排最高2；后排只有第2列1，最高1，左面看第1列最高2，第2列最高1，符合。因此最少5个是可行的。第13题答案6个是错误的，第19题答案5个正确。但第13题已通过，此处第19题答案5个，解释合理，应通过。然而，第13题答案6个，第19题答案5个，两者矛盾，需统一。实际上，最少应为5个。故第19题答案正确，第13题答案错误。但第13题已判pass，需修正。此处第19题答案5个，解释合理，应pass。 |
| `bnu-junior-ds-v1-s1-026` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目要求最短路线，解释中计算了三种路径：√185、13、√145，其中√145≈12.04最小，但答案却给出√185，与解释矛盾，答案错误。 |
| `bnu-junior-ds-v1-s1-028` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解释中得出3对面是4，因此与4相对的面是3，答案正确，但选项中有3，答案匹配。然而解释中“正方体相对面数字之和为7”是错误前提，题目未说明数字是1-6且相对面和为7，但根据相邻和可推导出正确结果，答案3正确。但解释逻辑有误，应基于条件推导。不过答案与选项匹配，且可解。但解释错误，应标记。 |
| `bnu-junior-ds-v1-s1-040` | S1 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 由正视图和左视图可确定最少需要5个小立方块，解释中计算2+1+2=5正确，但最终答案写6，前后矛盾。正确答案应为5。 |
| `bnu-junior-ds-v1-s1-137` | S1 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch, missing_condition | 题目未明确点C的位置，需分类讨论：C在AB延长线上时MN=7.5 cm；C在线段AB上时MN=3.5 cm。原答案仅给出一种情况，不完整。 |
| `bnu-junior-ds-v1-s1-138` | S1 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch, missing_condition | 射线OC在∠AOB外部有两种情况，∠BOC可能为50°或150°，原答案仅取较小角，但题目未限定，应给出两种可能。 |
| `bnu-junior-ds-v1-s1-142` | S1 | multiple-choice | fail | blocker | false | false | unsolvable, missing_condition, answer_mismatch | 点O为直线AB上一点，则∠AOB为平角180°，但题目说射线OC在∠AOB内部，且给出∠AOC=50°、∠BOC=30°，这与平角矛盾，条件冲突，无法求解。 |
| `bnu-junior-ds-v1-s1-172` | S1 | multiple-choice | fail | major | true | false | answer_mismatch, ambiguous_mc | 题目中“有一人植的树不足3棵”意味着最后一人可能植1棵或2棵，选项B（4x+16=6(x-1)+2）仅对应植2棵的情况，但若植1棵则方程应为4x+16=6(x-1)+1，题目未明确具体棵数，导致方程不唯一，选项B并非必然正确，且选项C（+3）不符合“不足3棵”。因此答案不唯一，选项设置不合理。 |
| `bnu-junior-ds-v1-s1-175` | S1 | multiple-choice | fail | major | true | false | answer_mismatch, ambiguous_mc | 与172题类似，“不足3棵”意味着最后一人可能植1棵或2棵，选项B（4x+20=5(x-1)+3）中+3表示最后一人植3棵，不符合“不足3棵”，因此选项B错误。其他选项也不正确，导致无正确选项。 |
| `bnu-junior-ds-v1-s1-178` | S1 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 解释中计算x=15时方案二费用为20+4.8×15=92元，方案一120元，方案二更省钱，但答案选项A却说“购买15本时方案一更省钱”，与解释矛盾。正确结论应为方案二更省钱，且费用相等时x=25，但选项A结论错误。选项B和D中费用相等时x=20错误，选项C结论正确但费用相等时x=20错误。因此所有选项均不正确。 |
| `bnu-junior-ds-v1-s1-193` | S1 | multiple-choice | fail | blocker | true | false | ambiguous_mc, bad_options, answer_mismatch | 选项C和D代入x=2均成立，导致题目有两个正确选项，不符合单选题唯一解的要求。题目本身可解，但选项设计有误，答案不唯一。 |
| `bnu-junior-ds-v1-s1-230` | S1 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch | 答案声称80~89分有7人，但解释中统计为8人，实际数据整理后80~89分有8人，答案与解释矛盾且错误。 |
| `bnu-junior-ds-v1-s1-257` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目计算正确结果为-3a^2，但答案给出-2a^5，解释中也错误得出-3a^2，答案与解释均不匹配。 |
| `bnu-junior-ds-v1-s1-276` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解析计算过程正确，结果为-2a^5b^3，但答案和acceptedAnswers均为-2a^3b^3，与解析矛盾，答案错误。 |
| `bnu-junior-ds-v1-s1-278` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。正确计算应为-3x^2，而非-2x^2。解释中最后一步得出-3x^2，与答案矛盾。 |
| `bnu-junior-ds-v1-s1-281` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。正确结果应为2a^5b^3，而非2a^4b^3。解释中得出2a^5b^3，与答案矛盾。 |
| `bnu-junior-ds-v1-s1-284` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。化简得2x-5，代入x=-1/2得-6，而非-3。解释中得出-6，与答案矛盾。 |
| `bnu-junior-ds-v1-s1-287` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch, accepted_answer_gap | 题目可解，但答案错误。另一边长为3a^2b+2ab^2-ab，周长为2(2ab+3a^2b+2ab^2-ab)=6a^2b+4ab^2+2ab。答案中多出2a^2b+2ab^2-2ab，且acceptedAnswers包含错误表达式。 |
| `bnu-junior-ds-v1-s1-292` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目计算(-2a^2)^3·(3ab^2)^2÷(a^3b)，正确结果为-72a^5b^3，但答案给出-72a^4b^3，解释中也错误地得出-72a^5b^3，答案与解释矛盾且均错误。 |
| `bnu-junior-ds-v1-s1-293` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目计算(-2a^2b)^3·(3ab^2)^2÷(-a^3b^4)，正确结果为72a^5b^3，但答案给出72a^3b^3，解释中得出72a^5b^3，答案与解释不一致且答案错误。 |
| `bnu-junior-ds-v1-s1-296` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目求∠EOD，由∠AOC=130°得∠AOD=50°，∠EOD=∠AOD-∠AOE=10°，但答案给出90°，解释中得出10°，答案与解释矛盾且答案错误。 |
| `bnu-junior-ds-v1-s1-307` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目求∠AOD，由OE⊥AB得∠AOE=90°，∠AOC=90°-55°=35°，∠AOD与∠AOC是邻补角，∠AOD=180°-35°=145°，但选项无145°。若考虑∠AOD与∠BOC对顶，∠BOC=90°+55°=145°，仍无匹配。检查解释：解释中计算了∠AOC=35°，但未求∠AOD，答案35°错误。正确应为∠AOD=180°-35°=145°或∠AOD=∠BOC=145°，但选项无145°。若∠COE=55°在∠AOE内部，则∠AOC=35°，∠AOD=145°；若∠COE在∠AOE外部，则∠AOC=90°+55°=145°，∠AOD=35°。题目未明确射线位置，但常见情况∠AOD=145°。选项无145°，故题目有误。 |
| `bnu-junior-ds-v1-s1-311` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目中∠AOE=30°，∠EOD=70°，则∠AOD=100°，对顶角∠BOC=100°，邻补角∠BOD=80°。MN⊥CD，∠MOD=90°，点M在AB上方，OM在∠BOD内部，∠BOM=∠MOD-∠BOD？错误。正确：∠BOD=80°，∠MOD=90°，若OM在∠BOD内部，则∠BOM=∠MOD-∠BOD=10°；若OM在∠BOD外部，则∠BOM=∠BOD+∠MOD=170°。解释中数值矛盾（∠AOE=20°，∠EOD=30°），且计算错误。答案40°与题目条件不符。 |
| `bnu-junior-ds-v1-s1-312` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 由对顶角得∠BOD=80°，邻补角∠AOD=100°，∠EOD=100°-35°=65°，答案应为65°，但给出的答案是45°，解释中也算出65°，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s1-315` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 答案应为95°，但题目给出15°，且解释中计算正确但答案错误，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s1-317` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 答案字段写为50°但推理得80°，解释正确但答案错误，acceptedAnswers包含80°但主答案错误。 |
| `bnu-junior-ds-v1-s1-320` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解释正确得∠BOE=115°，但答案字段为155°，答案错误。 |
| `bnu-junior-ds-v1-s1-325` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目中∠AOC=50°，但解释中错误地认为∠AOD=50°，实际∠AOD=180°-50°=130°，∠EOD=130°-35°=95°，与答案15°不符。题目条件与答案矛盾，无法得出15°。 |
| `bnu-junior-ds-v1-s1-327` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目与325题类似，但解释中正确计算出∠DOE=95°，而答案却为15°，答案与解释矛盾，且15°错误。 |
| `bnu-junior-ds-v1-s1-328` | S1 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解释中正确计算出∠EOD=35°，但答案却为75°，答案与解释不符，且75°错误。 |
| `bnu-junior-ds-v1-s1-332` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解释中正确推导出OE与OF不平行，但答案却为“平行”，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s1-336` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解释中正确计算出∠BOF=45°，但答案却为55°，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s1-339` | S1 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 题目求最大值与最小值的差，由3<x<13得最小4最大12，差为8，但答案给出10，解释中计算12-4=8却写差为8，答案与解释矛盾且错误。 |
| `bnu-junior-ds-v1-s1-426` | S1 | fill-in | fail | blocker | false | false | missing_condition, answer_mismatch, explanation_mismatch | 题目条件矛盾：直线l经过点B且垂直于线段AB，但AB竖直，故l应为水平线y=-1；而解释中却说l是水平线y=-1，但答案(2,-7)是点A关于y=-1的对称点，计算正确。然而题目要求“点C与点A关于直线l对称，且直线l经过点B且垂直于线段AB”，但线段AB的垂直平分线是y=2，并非y=-1。条件“直线l经过点B且垂直于线段AB”意味着l是过B且垂直于AB的直线，即y=-1，但此时l不是AB的垂直平分线，对称后A的对应点C不会与A关于l对称且满足某种关系？实际上，若l是y=-1，则A(2,5)关于y=-1的对称点为(2,-7)，但题目并未要求l是垂直平分线，仅要求l经过B且垂直于AB，这确实可以确定l为y=-1，对称点C为(2,-7)。但解释中说“线段AB竖直，中点为(2,2)。直线l为水平线y=-1。”这里中点(2,2)与l无关，解释有误导。更关键的是，题目条件“直线l经过点B且垂直于线段AB”与“点C与点A关于直线l对称”是自洽的，可解。但解释中出现了中点(2,2)这一无关信息，且未说明为何l是y=-1。然而，题目本身是可解的，答案(2,-7)正确。但解释存在瑕疵，可能引起误解。但审核标准要求判断是否可解、答案是否匹配。本题可解，答案匹配，但解释有瑕疵。根据规则，解释不匹配应标记。但解释中计算正确，只是多提了中点。严格来说，解释与答案一致，但逻辑不够清晰。考虑到解释中“直线l为水平线y=-1”正确，答案正确，可视为通过。但解释中“线段AB竖直，中点为(2,2)”是多余信息，可能误导。但整体上，答案和解释是匹配的。因此，我判定为pass，但可加warn。然而，题目条件“直线l经过点B且垂直于线段AB”直接给出l为y=-1，无需中点。解释中引入中点可能让学生困惑。但这不是错误。所以，我决定给pass。但再仔细看：解释中说“线段AB竖直，中点为(2,2)。直线l为水平线y=-1。”这两句之间没有逻辑联系，显得突兀。但答案正确。所以，我维持pass。 |
| `bnu-junior-ds-v1-s1-434` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。直线BC为x=4，点A(2,3)关于x=4的对称点应为(6,3)，而非(2,-1)。解析中也指出原答案错误并更正为(6,3)，但提供的answer仍为(2,-1)，与正确结果不符。 |
| `bnu-junior-ds-v1-s1-440` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。A'(2,-3)，B'(-4,5)，距离为√[(-4-2)²+(5+3)²]=√(36+64)=10，而非2√2。解析中也得出10，但提供的answer为2√2，与正确结果不符。 |
| `bnu-junior-ds-v1-s1-450` | S1 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 计算得CD=√40=2√10，但答案和acceptedAnswers均为2√5，解释中也错误得出2√10，答案与题目不匹配。 |
| `bnu-junior-ds-v1-s1-456` | S1 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 点C(2,-3)，点D(-2,-1)，直线AC为x=2，直线BD为y=-1，交点P为(2,-1)，但答案和acceptedAnswers均为(2,0)，解释中也错误得出(2,-1)，答案与题目不匹配。 |
| `bnu-junior-ds-v1-s1-485` | S1 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 选项B的概率为3/10=0.3，而非0.35，解释中称B概率0.3，但答案却选B，与频率0.35不匹配。最接近0.35的选项应为B（0.3），但题目要求“最有可能符合”，0.3与0.35仍有差距，且解释自相矛盾。实际上选项B概率0.3，选项A和D为0.5，C约0.167，B最接近但仍不精确，题目设计有瑕疵，但答案与解释不一致是主要问题。 |
| `bnu-junior-ds-v1-s2-012` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。由5²+12²=13²知△ABC为直角三角形，∠B=90°。在Rt△ABD中，AB=5，BD=4，由勾股定理得AD=√(5²+4²)=√41，而非√65。解释中计算过程正确但最终结果写错，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s2-013` | S2 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 三边满足5²+12²=13²，最长边AC为斜边，直角应为∠B，而非∠C。选项A正确，答案与解释均错误。 |
| `bnu-junior-ds-v1-s2-019` | S2 | multiple-choice | fail | blocker | true | false | ambiguous_mc, bad_options | 题目要求判断三角形ABD的形状，但选项A“直角三角形，因为AB²+BD²=AD²”需要先计算AD，而AD未知，无法直接判断；且选项B、C、D均不正确，但A的推理不完整，且题目未给出AD长度，学生无法直接验证。实际上，由已知可算得AD=√45，AB²+BD²=45=AD²，故A正确，但选项表述为“因为AB²+BD²=AD²”未提供AD值，导致选项不严谨，且其他选项错误，但A是唯一可能正确的，但严格来说，选项A的因果关系不成立，因为AD未知。因此，该题选项设计有缺陷，答案匹配但选项不严谨。 |
| `bnu-junior-ds-v1-s2-020` | S2 | short-answer | fail | blocker | false | false | missing_condition, answer_mismatch, explanation_mismatch | 题目中D在AC上，AD=4，但解释中却用BD²=AB²+AD²，这要求∠BAD=90°，但∠BAD并非直角，因为△ABC中∠B=90°，A点处不是直角。实际上，在Rt△ABC中，∠B=90°，AB=5，BC=12，AC=13，D在AC上，AD=4，则CD=9。要求BD，需用余弦定理或相似，不能直接用勾股定理。解释错误，答案错误，题目不可解（缺少条件或方法不当）。 |
| `bnu-junior-ds-v1-s2-031` | S2 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch, ambiguous_mc | 解释中正确指出∠B是直角，但答案却写“∠C是直角”，选项C对应∠A是直角，选项B对应∠C是直角，选项A对应∠B是直角。正确答案应为选项A，答案与解释矛盾，且选项设置导致答案不唯一。 |
| `bnu-junior-ds-v1-s2-066` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 由平方根互为相反数解得a=-2，平方根为-7和7，x=49，其立方根为³√49，不是4。答案错误。 |
| `bnu-junior-ds-v1-s2-069` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 由平方根互为相反数解得a=4/3，平方根为±7/3，正数为49/9，不是9。答案错误。 |
| `bnu-junior-ds-v1-s2-132` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 由两点求得一次函数为y=3x-1，与x轴交点A(1/3,0)，与y轴交点B(0,-1)，三角形AOB面积为1/2×|1/3|×|-1|=1/6，但答案为1，解释中也提到面积为1/6，答案与解释矛盾，且答案错误。 |
| `bnu-junior-ds-v1-s2-136` | S2 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 由两点求得k=2，b=2，k+b=4，但答案为6，解释中也算出k+b=4，答案与解释矛盾，且答案错误。 |
| `bnu-junior-ds-v1-s2-156` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。解析中正确计算出k=-2, b=0，k+b=-2，但答案误写为2。 |
| `bnu-junior-ds-v1-s2-157` | S2 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。解析中正确计算出x=1, y=2，x+y=3，但答案误写为2。 |
| `bnu-junior-ds-v1-s2-159` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。解析中正确计算出a=1, b=2，a-b=-1，但答案误写为0。 |
| `bnu-junior-ds-v1-s2-160` | S2 | multiple-choice | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案错误。解析中正确推导出a>3，但答案误写为a<-6。 |
| `bnu-junior-ds-v1-s2-183` | S2 | fill-in | fail | blocker | false | false | missing_condition, answer_mismatch, explanation_mismatch | 题目条件矛盾：已知每辆A型客车可坐45人，B型客车可坐30人，但后续条件要求求解座位数，且方程组3x+2y=195与2x+4y=210的解为x=45, y=30，与已知信息一致，但题目本身已给出座位数，导致条件冗余且问题不明确，无法构成有效求解。 |
| `bnu-junior-ds-v1-s2-186` | S2 | fill-in | fail | blocker | false | false | missing_condition, answer_mismatch | 题目已明确给出每辆A型客车可载45人、B型客车可载30人，却要求求解实际载客量，条件与问题矛盾，无法求解。 |
| `bnu-junior-ds-v1-s2-188` | S2 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 解为分数，但笔记本数量应为整数，不符合实际意义，答案与解释虽一致但题目本身存在逻辑缺陷。 |
| `bnu-junior-ds-v1-s2-192` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 答案应为3，但给出的答案是7，解释中计算过程得出a=3，答案与解释矛盾。 |
| `bnu-junior-ds-v1-s2-235` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch, ambiguous_mc | 条件①中∠EGB=60°与∠GHD=120°是同旁内角，互补可判定平行；条件③中∠BGH与∠DHF是同位角，相等可判定平行。题目要求选一个条件，但①和③均正确，答案③不唯一，且解释中错误否定①，导致答案与解释矛盾。 |
| `bnu-junior-ds-v1-s2-236` | S2 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | ∠AGE与∠CHF是同位角，同位角相等才平行，70°≠110°，且同位角互补不是判定定理，答案错误。 |
| `bnu-junior-ds-v1-s2-237` | S2 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件④中∠AGE=50°，∠CHG=130°，是同旁内角互补，可判定平行，答案遗漏④。 |
| `bnu-junior-ds-v1-s2-238` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件③中∠EGB=50°，∠CHF=130°，∠CHF与∠GHD是对顶角，得∠GHD=130°，与∠EGB不相等，不能判定平行。故只有①②正确，共2个。 |
| `bnu-junior-ds-v1-s2-239` | S2 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件④中∠BGH=80°，∠CHF=100°，∠CHF与∠DHG是对顶角，得∠DHG=100°，与∠BGH是同旁内角，互补，可判定平行。答案错误否定④。 |
| `bnu-junior-ds-v1-s2-240` | S2 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件④中∠BGH=80°，∠CHG=100°，是同旁内角互补，可判定平行，答案遗漏④。 |
| `bnu-junior-ds-v1-s2-242` | S2 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件③和④组合也可判定平行，答案仅给出一种组合，未覆盖所有可能，且解释中称其他组合无法推出平行，不准确。 |
| `bnu-junior-ds-v1-s2-243` | S2 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件③中∠BGH=110°，∠DHF=110°，∠DHF与∠CHG是对顶角，得∠CHG=110°，与∠BGH是内错角，相等，可判定平行。故①②③正确，共3个。 |
| `bnu-junior-ds-v1-s2-244` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件③中∠BGH=80°，∠DHF=100°，∠DHF与∠CHG是对顶角，得∠CHG=100°，与∠BGH是同旁内角，互补，可判定平行。故①③④正确，共3个。 |
| `bnu-junior-ds-v1-s2-247` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 解释中判定①②④正确，但③错误，应为2个，答案却为3个，与解释矛盾。 |
| `bnu-junior-ds-v1-s2-248` | S2 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch | 解释中条件①同旁内角互补可判定平行，条件④同旁内角互补也可判定，但答案仅②③，与解释矛盾。 |
| `bnu-junior-ds-v1-s2-250` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch | 解释中条件③通过等量代换可判定平行，但条件④不能，故应为2个，答案3个错误。 |
| `bnu-junior-ds-v1-s2-252` | S2 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 解释中条件①同旁内角互补可判定平行，但答案仅②③，遗漏①。 |
| `bnu-junior-ds-v1-s2-256` | S2 | multiple-choice | fail | major | true | false | answer_mismatch, explanation_mismatch, ambiguous_mc | 解释中条件①同位角相等可判定平行，但答案选②，且条件②同旁内角互补也可判定，导致多解，选项不唯一。 |
| `bnu-junior-ds-v1-s2-263` | S2 | short-answer | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件③中∠BGH与∠DHF是同旁内角，70°+110°=180°互补，可判定平行，解释错误称不互补；条件④中∠AGE与∠CHG是内错角，50°≠130°不相等，不能判定。因此能判定的有①和③，答案应为①③，但答案只给出①，与正确结论不符。 |
| `bnu-junior-ds-v1-s2-264` | S2 | fill-in | fail | major | true | false | answer_mismatch, explanation_mismatch | 条件①中∠AGE与∠CHG是同位角，65°+115°=180°互补不能判定平行，解释正确；条件②同位角相等可判定；条件③内错角不相等不能；条件④同旁内角互补可判定。故②④正确，答案②④匹配，但解释中①的判定理由错误（互补不能判定平行），但答案本身正确，然而解释存在错误，可能导致混淆。 |
| `bnu-junior-ds-v1-s2-273` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案应为110°，而提供的答案是110°，但解释中计算得出∠ADB=90°，∠ADC=90°，与答案矛盾。正确计算：∠B=∠C=70°，∠BAD=20°，∠ADB=180°-70°-20°=90°，∠ADC=180°-90°=90°，但答案写110°，解释也错误。实际∠ADC=110°？重新计算：∠B=∠C=70°，∠BAD=20°，在△ABD中，∠ADB=180°-70°-20°=90°，所以∠ADC=180°-90°=90°。但答案给出110°，解释也得出90°，自相矛盾。正确应为90°，但题目要求∠ADC，根据等腰三角形性质，AD是角平分线，也是高和中线？AB=AC，AD平分∠BAC，则AD⊥BC，所以∠ADB=90°，∠ADC=90°。因此答案应为90°，但提供的答案是110°，解释也错误。 |
| `bnu-junior-ds-v1-s2-281` | S2 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案与解析矛盾。解析正确得出∠ADC=125°，而答案误写为105°。 |
| `bnu-junior-ds-v1-s2-285` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目与281题相同，但答案140°错误，解析中错误假设AD=BD，实际应为BD=AB，正确∠ADC=125°。 |
| `bnu-junior-ds-v1-s2-287` | S2 | short-answer | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案110°错误，解析正确得出∠ADC=90°，答案与解析矛盾。 |
| `bnu-junior-ds-v1-s2-291` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目条件∠A=40°，但解析错误使用∠A=100°，导致答案30°错误。正确计算得∠DAC=60°。 |
| `bnu-junior-ds-v1-s2-294` | S2 | fill-in | fail | blocker | true | false | answer_mismatch, explanation_mismatch | 题目可解，但答案110°错误。正确计算：∠BAD=∠CAD=20°，DE⊥AB，DF⊥AC，四边形AEDF中∠A=40°，∠AED=∠AFD=90°，故∠EDF=360°-40°-90°-90°=140°。解释中虽得出140°，但答案写为110°，矛盾。 |

## Notes

- This run used local redacted DeepSeek provider configuration. No API key, request headers, raw prompts, or full provider transcripts are recorded.
- Safe BNU junior curriculum RAG, BNU assessment-pattern RAG, and shared zhongkao pattern cards were supplied as metadata-only context for grade/topic/style checks.
- This QA artifact does not edit candidate questions or promote public `data/questions.ts` entries.
