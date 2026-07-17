# S23 Promotion Decision - us-ca-math-k-g5-textbooks-v1

Decision: promoted to live lesson integration and production published.

Reason: S18 sampling approved the repaired K-5 textbook beta for integration, S05 integrated the 29 lesson seeds into the California lesson source, S11 route regression passed for the representative K lesson API/student route, and S22 local type/build/question-bank gates are green.

Production path: S22 avoided dirty-root publication by building a clean release slice from the previous production staging baseline plus the California K-5 runtime overlay. That clean slice built successfully and was published to Vercel production.

Deployment: `dpl_CV3Zi56yrp6MCazMSVboM5NeTckh`, `https://mais-de7ro799r-peter-dongpin-hu-s-projects.vercel.app`, aliased to `https://www.mais.hk` and `https://mais.hk`.
