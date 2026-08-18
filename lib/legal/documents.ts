import { privacyPolicyVersion, termsOfServiceVersion } from "@/lib/legal/policyVersion";
import type { LocalizedText } from "@/types";

export type LegalSection = {
  id: string;
  heading: LocalizedText;
  paragraphs: LocalizedText[];
  bullets?: LocalizedText[];
};

export type LegalDocument = {
  slug: "privacy" | "terms";
  title: LocalizedText;
  intro: LocalizedText;
  version: string;
  sections: LegalSection[];
};

// NOTE FOR COUNSEL REVIEW
// ------------------------------------------------------------------
// The wording below is an engineering draft written to make the product's
// actual data behaviour explicit and reviewable. It is not legal advice and
// has not been reviewed by a qualified lawyer in any jurisdiction. Statements
// here are meant to describe what the software genuinely does today — if a
// statement stops being true, the code or the copy must change together.

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: { en: "Privacy Policy", zh: "私隱政策", zhHans: "隐私政策" },
  version: privacyPolicyVersion,
  intro: {
    en: "MAIS is a mathematics learning platform used by children. This policy explains what we collect, why, who can see it, and how a parent, guardian or school can get it back or have it deleted.",
    zh: "MAIS 是供兒童使用的數學學習平台。本政策說明我們收集哪些資料、收集原因、誰可以查看，以及家長、監護人或學校如何取回或刪除這些資料。",
    zhHans: "MAIS 是供儿童使用的数学学习平台。本政策说明我们收集哪些资料、收集原因、谁可以查看，以及家长、监护人或学校如何取回或删除这些资料。"
  },
  sections: [
    {
      id: "what-we-collect",
      heading: { en: "What we collect", zh: "我們收集的資料", zhHans: "我们收集的资料" },
      paragraphs: [
        {
          en: "We collect only what the learning product needs to work:",
          zh: "我們只收集學習產品運作所需的資料：",
          zhHans: "我们只收集学习产品运作所需的资料："
        }
      ],
      bullets: [
        {
          en: "Account details: display name, username, an optional email address, chosen grade and curriculum, and a securely hashed password.",
          zh: "帳戶資料：顯示名稱、用戶名稱、可選的電郵地址、所選年級和課程，以及經安全雜湊處理的密碼。",
          zhHans: "账号资料：显示名称、用户名、可选的邮箱地址、所选年级和课程，以及经安全哈希处理的密码。"
        },
        {
          en: "Learning records: practice answers, mistakes, lesson progress, mastery estimates and assignment submissions.",
          zh: "學習記錄：練習作答、錯題、課節進度、掌握程度估算和作業提交。",
          zhHans: "学习记录：练习作答、错题、课节进度、掌握程度估算和作业提交。"
        },
        {
          en: "AI tutor conversations: the questions a learner types to the AI tutor and the replies it gives.",
          zh: "AI 導師對話：學生向 AI 導師輸入的問題及其回覆。",
          zhHans: "AI 导师对话：学生向 AI 导师输入的问题及其回复。"
        },
        {
          en: "Guardian consent records: the name and relationship of the adult who consented, and when.",
          zh: "監護人同意記錄：給予同意的成年人姓名、關係及同意時間。",
          zhHans: "监护人同意记录：给予同意的成年人姓名、关系及同意时间。"
        }
      ]
    },
    {
      id: "why",
      heading: { en: "Why we collect it", zh: "收集原因", zhHans: "收集原因" },
      paragraphs: [
        {
          en: "Learning records exist to show a learner and their teacher what has been mastered and what needs more work, and to choose the next exercise. We do not sell personal information, we do not use it for behavioural advertising, and we do not build advertising profiles of children.",
          zh: "學習記錄用於向學生及其教師顯示已掌握和需要加強的內容，並據此選擇下一項練習。我們不會出售個人資料，不會將其用於行為廣告，也不會為兒童建立廣告檔案。",
          zhHans: "学习记录用于向学生及其教师显示已掌握和需要加强的内容，并据此选择下一项练习。我们不会出售个人资料，不会将其用于行为广告，也不会为儿童建立广告档案。"
        }
      ]
    },
    {
      id: "parental-consent",
      heading: { en: "Parental consent", zh: "家長同意", zhHans: "家长同意" },
      paragraphs: [
        {
          en: "A student account cannot be created without a parent, legal guardian, or authorised school confirming consent. We record who consented, their relationship to the learner, and the version of this policy in force at that moment.",
          zh: "未經家長、法定監護人或獲授權學校確認同意，不得建立學生帳戶。我們會記錄同意人、其與學生的關係，以及當時生效的本政策版本。",
          zhHans: "未经家长、法定监护人或获授权学校确认同意，不得创建学生账号。我们会记录同意人、其与学生的关系，以及当时生效的本政策版本。"
        },
        {
          en: "Consent can be withdrawn at any time by requesting deletion of the account.",
          zh: "可隨時透過要求刪除帳戶撤回同意。",
          zhHans: "可随时通过要求删除账号撤回同意。"
        }
      ]
    },
    {
      id: "who-can-see",
      heading: { en: "Who can see a learner's data", zh: "誰可查看學生資料", zhHans: "谁可查看学生资料" },
      paragraphs: [
        {
          en: "A learner sees their own records. A teacher sees the records of learners enrolled in their classes. A linked parent or guardian sees their own child's records. Platform administrators can access data for support and safety purposes. AI tutor messages are sent to a third-party language-model provider in order to generate a reply.",
          zh: "學生可查看自己的記錄；教師可查看其班級中已註冊學生的記錄；已連結的家長或監護人可查看自己子女的記錄。平台管理員可基於支援和安全目的存取資料。AI 導師訊息會傳送至第三方語言模型供應商以生成回覆。",
          zhHans: "学生可查看自己的记录；教师可查看其班级中已注册学生的记录；已关联的家长或监护人可查看自己子女的记录。平台管理员可基于支持和安全目的访问资料。AI 导师消息会发送至第三方语言模型供应商以生成回复。"
        }
      ]
    },
    {
      id: "your-rights",
      heading: { en: "Access, export and deletion", zh: "查閱、匯出和刪除", zhHans: "查阅、导出和删除" },
      paragraphs: [
        {
          en: "A signed-in account holder can download everything the platform holds about them as a JSON file, and can permanently delete their account. Deletion removes the account and the learning records, tutor conversations, submissions and rewards attached to it. Where a record belongs to somebody else and merely mentions the departing account, the reference is removed rather than the other person's record.",
          zh: "已登入的帳戶持有人可以 JSON 檔案下載平台持有的所有相關資料，並可永久刪除其帳戶。刪除會移除該帳戶及其學習記錄、導師對話、提交內容和獎勵。若某記錄屬於他人而僅提及被刪除的帳戶，我們會移除該引用，而非刪除他人的記錄。",
          zhHans: "已登录的账号持有人可以 JSON 文件下载平台持有的所有相关资料，并可永久删除其账号。删除会移除该账号及其学习记录、导师对话、提交内容和奖励。若某记录属于他人而仅提及被删除的账号，我们会移除该引用，而非删除他人的记录。"
        },
        {
          en: "A parent, guardian or school can ask an administrator to export or delete a child's account on their behalf.",
          zh: "家長、監護人或學校可要求管理員代為匯出或刪除子女的帳戶。",
          zhHans: "家长、监护人或学校可要求管理员代为导出或删除子女的账号。"
        }
      ]
    },
    {
      id: "retention",
      heading: { en: "How long we keep it", zh: "保留期限", zhHans: "保留期限" },
      paragraphs: [
        {
          en: "Learning records are kept for as long as the account exists. When an account is deleted the records are removed from the live system. Deletion requests are honoured promptly.",
          zh: "學習記錄在帳戶存續期間保留。帳戶刪除後，相關記錄將從線上系統移除。我們會盡快處理刪除要求。",
          zhHans: "学习记录在账号存续期间保留。账号删除后，相关记录将从在线系统移除。我们会尽快处理删除要求。"
        }
      ]
    },
    {
      id: "contact",
      heading: { en: "Contact", zh: "聯絡我們", zhHans: "联系我们" },
      paragraphs: [
        {
          en: "Questions about this policy, or a request to access or delete a child's data, should be sent to the platform operator. A named contact address must be published here before the platform is used by learners outside a pilot.",
          zh: "有關本政策的查詢，或查閱／刪除兒童資料的要求，請聯絡平台營運者。在試點以外的學生使用本平台之前，必須在此公布指定聯絡地址。",
          zhHans: "有关本政策的查询，或查阅／删除儿童资料的要求，请联系平台运营者。在试点以外的学生使用本平台之前，必须在此公布指定联系地址。"
        }
      ]
    }
  ]
};

export const termsOfService: LegalDocument = {
  slug: "terms",
  title: { en: "Terms of Service", zh: "服務條款", zhHans: "服务条款" },
  version: termsOfServiceVersion,
  intro: {
    en: "These terms cover use of the MAIS mathematics learning platform. By creating an account, or by consenting to a child's account, you agree to them.",
    zh: "本條款涵蓋 MAIS 數學學習平台的使用。建立帳戶或同意子女使用帳戶，即表示您接受本條款。",
    zhHans: "本条款涵盖 MAIS 数学学习平台的使用。创建账号或同意子女使用账号，即表示您接受本条款。"
  },
  sections: [
    {
      id: "accounts",
      heading: { en: "Accounts", zh: "帳戶", zhHans: "账号" },
      paragraphs: [
        {
          en: "A student account requires the consent of a parent, legal guardian or authorised school. Teacher accounts are for educators. You are responsible for keeping your password confidential and for activity on your account.",
          zh: "建立學生帳戶須經家長、法定監護人或獲授權學校同意。教師帳戶供教育工作者使用。您有責任保管密碼並對帳戶活動負責。",
          zhHans: "创建学生账号须经家长、法定监护人或获授权学校同意。教师账号供教育工作者使用。您有责任保管密码并对账号活动负责。"
        }
      ]
    },
    {
      id: "acceptable-use",
      heading: { en: "Acceptable use", zh: "合理使用", zhHans: "合理使用" },
      paragraphs: [
        {
          en: "Use the platform for learning and teaching. Do not attempt to access other people's accounts or data, disrupt the service, or use the AI tutor to produce harmful, abusive or unsafe content. Classroom discussion and tutor conversations are monitored for child-safety purposes.",
          zh: "請將平台用於學習和教學。請勿嘗試存取他人的帳戶或資料、干擾服務，或利用 AI 導師產生有害、辱罵或不安全的內容。基於兒童安全目的，課堂討論和導師對話會受到監察。",
          zhHans: "请将平台用于学习和教学。请勿尝试访问他人的账号或资料、干扰服务，或利用 AI 导师产生有害、辱骂或不安全的内容。基于儿童安全目的，课堂讨论和导师对话会受到监察。"
        }
      ]
    },
    {
      id: "ai-tutor",
      heading: { en: "About the AI tutor", zh: "關於 AI 導師", zhHans: "关于 AI 导师" },
      paragraphs: [
        {
          en: "The AI tutor is a study aid, not a teacher. It can be wrong. Its answers should be checked, and it must not be relied on for anything outside mathematics practice. Messages sent to it are processed by a third-party language-model provider.",
          zh: "AI 導師是學習輔助工具，並非教師，其回答可能有誤，應加以核實，且不應用於數學練習以外的用途。傳送給它的訊息會由第三方語言模型供應商處理。",
          zhHans: "AI 导师是学习辅助工具，并非教师，其回答可能有误，应加以核实，且不应用于数学练习以外的用途。发送给它的消息会由第三方语言模型供应商处理。"
        }
      ]
    },
    {
      id: "content",
      heading: { en: "Content and intellectual property", zh: "內容和知識產權", zhHans: "内容和知识产权" },
      paragraphs: [
        {
          en: "Lessons, questions and visualizations provided by the platform remain the property of their respective owners. Work a learner submits remains theirs; the platform stores it to provide the service to that learner, their teacher and their guardian.",
          zh: "平台提供的課節、題目和視覺化內容仍屬其各自擁有人所有。學生提交的作業仍屬學生所有；平台儲存這些內容，以便向該學生、其教師和監護人提供服務。",
          zhHans: "平台提供的课节、题目和可视化内容仍属其各自拥有人所有。学生提交的作业仍属学生所有；平台存储这些内容，以便向该学生、其教师和监护人提供服务。"
        }
      ]
    },
    {
      id: "availability",
      heading: { en: "Availability and changes", zh: "服務可用性和變更", zhHans: "服务可用性和变更" },
      paragraphs: [
        {
          en: "The service is provided as-is, without a guarantee of uninterrupted availability. We may change or discontinue features. If we make a material change to these terms or to the privacy policy, the version stamp on those pages changes and consent may be collected again.",
          zh: "本服務按現狀提供，不保證不間斷可用。我們可能變更或終止功能。若本條款或私隱政策有重大變更，相關頁面的版本標記將會更新，並可能需要重新取得同意。",
          zhHans: "本服务按现状提供，不保证不间断可用。我们可能变更或终止功能。若本条款或隐私政策有重大变更，相关页面的版本标记将会更新，并可能需要重新取得同意。"
        }
      ]
    },
    {
      id: "termination",
      heading: { en: "Ending your account", zh: "終止帳戶", zhHans: "终止账号" },
      paragraphs: [
        {
          en: "You may delete your account at any time from your account settings, which permanently removes your learning records. We may suspend an account that is being used to harm other learners.",
          zh: "您可隨時在帳戶設定中刪除帳戶，這將永久移除您的學習記錄。若帳戶被用於傷害其他學生，我們可能會將其停權。",
          zhHans: "您可随时在账号设置中删除账号，这将永久移除您的学习记录。若账号被用于伤害其他学生，我们可能会将其停权。"
        }
      ]
    }
  ]
};

export const legalDocuments = { privacy: privacyPolicy, terms: termsOfService } as const;
