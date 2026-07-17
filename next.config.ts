import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR?.trim();
const tsconfigPath =
  process.env.NEXT_TSCONFIG_PATH?.trim() ||
  (distDir ? "tsconfig.json" : "tsconfig.next.json");
const studentLessonsPath = "/student/lessons";
const studentRoadmapPath = "/student/roadmap";
const studentPrimaryRoadmapPath = "/student/roadmap/primary";
const studentSecondaryRoadmapPath = "/student/roadmap/secondary";
const studentVisualizationToolsPath = "/student/tools/visualizations";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  skipMiddlewareUrlNormalize: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "three-stdlib"],
  async redirects() {
    return [
      {
        source: "/visualization-lab",
        destination: studentVisualizationToolsPath,
        permanent: true
      },
      {
        source: "/learning-path",
        destination: studentRoadmapPath,
        permanent: true
      },
      {
        source: "/primary-roadmap",
        destination: studentPrimaryRoadmapPath,
        permanent: true
      },
      {
        source: "/secondary-roadmap",
        destination: studentSecondaryRoadmapPath,
        permanent: true
      },
      {
        source: "/lesson",
        destination: studentLessonsPath,
        permanent: true
      },
      {
        source: "/lesson/:lessonSlug",
        destination: `${studentLessonsPath}/:lessonSlug`,
        permanent: true
      }
    ];
  },
  ...(distDir ? { distDir } : {}),
  ...(tsconfigPath ? { typescript: { tsconfigPath } } : {})
};

export default nextConfig;
