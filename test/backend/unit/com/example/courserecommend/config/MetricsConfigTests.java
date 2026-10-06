package com.example.courserecommend.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class MetricsConfigTests {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(MetricsConfig.class);

    @Test
    void providesProcessLocalRegistryByDefault() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(MeterRegistry.class);
            assertThat(context.getBean(MeterRegistry.class)).isInstanceOf(SimpleMeterRegistry.class);
        });
    }

    @Test
    void usesExistingRegistryInsteadOfCreatingAnother() {
        var existingRegistry = new SimpleMeterRegistry();
        try {
            contextRunner.withBean("existingRegistry", MeterRegistry.class, () -> existingRegistry)
                    .run(context -> {
                        assertThat(context).hasSingleBean(MeterRegistry.class);
                        assertThat(context.getBean(MeterRegistry.class)).isSameAs(existingRegistry);
                    });
        } finally {
            existingRegistry.close();
        }
    }
}
