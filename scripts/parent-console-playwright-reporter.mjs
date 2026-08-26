import {
  assertParentConsolePlaywrightExecution,
  normalizeParentConsolePlaywrightResult,
  parentConsolePlaywrightGroupNamesForFiles
} from "./parent-console-playwright-distribution.mjs";

export default class ParentConsolePlaywrightReporter {
  constructor() {
    this.finalResults = new Map();
    this.plannedGroupNames = null;
    this.planningError = null;
  }

  printsToStdio() {
    return true;
  }

  onBegin(_config, suite) {
    try {
      this.plannedGroupNames = parentConsolePlaywrightGroupNamesForFiles(
        suite.allTests().map((playwrightTest) => playwrightTest.location.file)
      );
    } catch (error) {
      this.planningError = error;
    }
  }

  onTestEnd(test, result) {
    const normalized = normalizeParentConsolePlaywrightResult({
      file: test.location.file,
      project: test.parent.project()?.name,
      title: test.title,
      actualStatus: result.status
    });
    this.finalResults.set(test.id, normalized);
  }

  onEnd(result) {
    try {
      if (this.planningError) throw this.planningError;
      const results = [...this.finalResults.values()];
      assertParentConsolePlaywrightExecution(results, this.plannedGroupNames);
      const passed = results.filter((instance) => instance.actualStatus === "passed").length;
      const skipped = results.filter((instance) => instance.actualStatus === "skipped").length;
      console.log(`Parent Playwright distribution verified: ${results.length} instances, ${passed} passed, ${skipped} explicit duplicate skips.`);
      return { status: result.status };
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return { status: "failed" };
    }
  }
}
