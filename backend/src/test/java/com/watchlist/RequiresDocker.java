package com.watchlist;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

/**
 * Docker-backed tests are optional on a developer machine without Docker but mandatory in CI
 * (GitHub Actions sets CI=true): there they stay enabled, so a missing Docker fails the build
 * instead of silently skipping the only tests that exercise the real database.
 */
public class RequiresDocker implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        if (DockerClientFactory.instance().isDockerAvailable()) {
            return ConditionEvaluationResult.enabled("Docker is available");
        }
        if (System.getenv("CI") != null) {
            return ConditionEvaluationResult.enabled("CI must run the database tests; without Docker they fail");
        }
        return ConditionEvaluationResult.disabled("Docker is not available; database tests are skipped outside CI");
    }
}
