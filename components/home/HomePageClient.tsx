"use client";

import Image, { type StaticImageData } from "next/image";
import { HeroSection } from "@/components/home/HeroSection";
import { PersonalizedPracticeMissionShowcase } from "@/components/practice/PersonalizedPracticeMissionShowcase";
import examReadinessIcon from "@/components/home/feature-icons/exam-readiness.png";
import geometryExplorerIcon from "@/components/home/feature-icons/geometry-explorer.png";
import interactiveGraphsIcon from "@/components/home/feature-icons/interactive-graphs.png";
import learnerProfileIcon from "@/components/home/feature-icons/learner-profile.png";
import mistakePatternReviewIcon from "@/components/home/feature-icons/mistake-pattern-review.png";
import practiceAdaptsIcon from "@/components/home/feature-icons/practice-adapts.png";
import progressSignalsIcon from "@/components/home/feature-icons/progress-signals.png";
import progressTrackingIcon from "@/components/home/feature-icons/progress-tracking.png";
import recommendedNextStepsIcon from "@/components/home/feature-icons/recommended-next-steps.png";
import stepByStepPracticeIcon from "@/components/home/feature-icons/step-by-step-practice.png";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { LocalizedText } from "@/types";

type HomeFeature = {
  title: LocalizedText;
  body: LocalizedText;
  icon: StaticImageData;
  iconClassName?: string;
};

type HomePageClientProps = {
  practiceQuestionTotal: number;
  visualizationLabCount: number;
};

const adaptiveLearning = {
  title: { en: "Personalized learning that responds to each student", zh: "回應每位學生的個人化學習", zhHans: "回应每位学生的个性化学习" },
  description: {
    en: "Personalized learning connects each student's grade, activity, mastery, and mistakes to recommend the right lesson, practice, and review path.",
    zh: "個人化學習會把學生的年級、活動、掌握度和錯題連起來，推薦合適的課堂、練習與重溫路徑。",
    zhHans: "个性化学习会把学生的年级、活动、掌握度和错题连起来，推荐合适的课堂、练习与重温路径。"
  }
};

const adaptiveFeatures: HomeFeature[] = [
  {
    title: { en: "Learner Profile", zh: "學生學習檔案" },
    body: { en: "Grade, recent activity, and mastery data shape the next step.", zh: "年級、近期活動與掌握度資料會共同決定下一步。" },
    icon: learnerProfileIcon
  },
  {
    title: { en: "Recommended Next Steps", zh: "智能下一步" },
    body: { en: "Lessons and topics surface around what the student is ready to learn.", zh: "課堂與課題會根據學生準備好學習的內容出現。" },
    icon: recommendedNextStepsIcon
  },
  {
    title: { en: "Practice That Adapts", zh: "練習自動調整" },
    body: { en: "Question difficulty and feedback respond to accuracy and mistakes.", zh: "題目難度與回饋會因應準確率和錯題而調整。" },
    icon: practiceAdaptsIcon
  },
  {
    title: { en: "Mistake Pattern Review", zh: "錯題模式整理" },
    body: { en: "Repeated errors become focused review targets instead of isolated marks.", zh: "重複出現的錯誤會整理成重點重溫目標。" },
    icon: mistakePatternReviewIcon
  },
  {
    title: { en: "Progress Signals", zh: "進度提示" },
    body: { en: "Students can see mastery, pace, and habits improve over time.", zh: "學生可以看見掌握度、節奏和習慣如何逐步改善。" },
    icon: progressSignalsIcon
  }
];

const features: HomeFeature[] = [
  {
    title: dictionary.home.features.graphs.title,
    body: dictionary.home.features.graphs.body,
    icon: interactiveGraphsIcon
  },
  {
    title: dictionary.home.features.geometry.title,
    body: dictionary.home.features.geometry.body,
    icon: geometryExplorerIcon
  },
  {
    title: dictionary.home.features.practice.title,
    body: dictionary.home.features.practice.body,
    icon: stepByStepPracticeIcon
  },
  {
    title: dictionary.home.features.progress.title,
    body: dictionary.home.features.progress.body,
    icon: progressTrackingIcon
  },
  {
    title: dictionary.home.features.readiness.title,
    body: dictionary.home.features.readiness.body,
    icon: examReadinessIcon
  }
];

function FeatureGrid({ items }: { items: HomeFeature[] }) {
  const { text } = useSettings();

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {items.map((feature) => (
        <article
          key={text(feature.title)}
          className="glass-panel group p-5 transition hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-md"
        >
          <div className="mx-auto h-[4.5rem] w-[4.5rem] transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
            <Image
              src={feature.icon}
              alt=""
              aria-hidden="true"
              className={`h-full w-full object-contain drop-shadow-[0_14px_22px_rgba(8,145,178,0.16)] ${feature.iconClassName ?? ""}`}
              sizes="72px"
            />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{text(feature.title)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(feature.body)}</p>
        </article>
      ))}
    </div>
  );
}

export function HomePageClient({ practiceQuestionTotal, visualizationLabCount }: HomePageClientProps) {
  const { t, text } = useSettings();

  return (
    <>
      <HeroSection practiceQuestionTotal={practiceQuestionTotal} visualizationLabCount={visualizationLabCount} />
      <section className="page-container pb-10 pt-16 sm:pb-12 sm:pt-20">
        <SectionHeader title={text(adaptiveLearning.title)} description={text(adaptiveLearning.description)} />
        <FeatureGrid items={adaptiveFeatures} />
      </section>

      <section className="page-container pb-16 pt-8 sm:pb-20 sm:pt-10">
        <SectionHeader title={t(dictionary.home.featureTitle)} description={t(dictionary.home.featureText)} />
        <FeatureGrid items={features} />
      </section>

      <section className="page-container pb-16 pt-2 sm:pb-20">
        <PersonalizedPracticeMissionShowcase />
      </section>
    </>
  );
}
