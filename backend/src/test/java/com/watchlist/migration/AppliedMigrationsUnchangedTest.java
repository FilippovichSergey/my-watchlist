package com.watchlist.migration;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Flyway refuses to start when an applied migration's checksum changes — and the checksum covers
 * comments and whitespace, not just SQL. Once a migration has run against any database it is frozen;
 * this test pins those checksums so that an accidental edit fails the build with a clear message
 * instead of breaking every existing installation at startup. Add a new V{n} file instead.
 */
class AppliedMigrationsUnchangedTest {

    /** Version → checksum as recorded in flyway_schema_history of databases that ran it. */
    static final Map<String, Integer> APPLIED = Map.of(
            "V1__init.sql", -2048027621,
            "V2__import_watchlist.sql", -1583870730,
            "V3__import_watchlist_leftovers.sql", -2001885081,
            "V4__fix_my_youth.sql", -1915993479
    );

    @Test
    void appliedMigrationsStillHaveTheirRecordedChecksum() throws Exception {
        for (Map.Entry<String, Integer> migration : APPLIED.entrySet()) {
            assertThat(flywayChecksum(migration.getKey()))
                    .as("%s has already been applied to databases; do not edit it, add a new migration", migration.getKey())
                    .isEqualTo(migration.getValue());
        }
    }

    /** Same algorithm as Flyway's ChecksumCalculator: CRC32 over each line's UTF-8 bytes, terminators excluded. */
    static int flywayChecksum(String fileName) throws Exception {
        CRC32 crc32 = new CRC32();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("db/migration/" + fileName).getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            if (line != null) {
                if (line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }
                do {
                    crc32.update(line.getBytes(StandardCharsets.UTF_8));
                } while ((line = reader.readLine()) != null);
            }
        }
        return (int) crc32.getValue();
    }
}
