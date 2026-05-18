package com.example.schoolmanagement.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ScheduleSchemaMaintenance implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ScheduleSchemaMaintenance.class);
    private static final String TEACHER_DATE_PERIOD_INDEX = "uk_schedule_teacher_date_period";
    private static final String TEACHER_ID_INDEX = "idx_schedules_teacher_id";

    private final JdbcTemplate jdbcTemplate;

    public ScheduleSchemaMaintenance(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        relaxScheduleTemplateOptionalForeignKeys();
        dropObsoleteTeacherDatePeriodIndex();
    }

    private void dropObsoleteTeacherDatePeriodIndex() {
        try {
            if (!indexExists(TEACHER_DATE_PERIOD_INDEX)) {
                return;
            }
            if (!indexExists(TEACHER_ID_INDEX)) {
                jdbcTemplate.execute("CREATE INDEX " + TEACHER_ID_INDEX + " ON schedules (teacher_id)");
                log.info("Created replacement schedule index {}", TEACHER_ID_INDEX);
            }
            jdbcTemplate.execute("ALTER TABLE schedules DROP INDEX " + TEACHER_DATE_PERIOD_INDEX);
            log.info("Dropped obsolete schedule index {}", TEACHER_DATE_PERIOD_INDEX);
        } catch (Exception ex) {
            log.warn("Could not update schedule indexes automatically: {}", ex.getMessage());
        }
    }

    private void relaxScheduleTemplateOptionalForeignKeys() {
        try {
            dropForeignKeysForColumn("schedule_templates", "teacher_id");
            dropForeignKeysForColumn("schedule_templates", "subject_id");
            dropForeignKeysForColumn("schedule_templates", "class_section_id");
        } catch (Exception ex) {
            log.warn("Could not relax schedule template foreign keys automatically: {}", ex.getMessage());
        }
    }

    private void dropForeignKeysForColumn(String tableName, String columnName) {
        jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.key_column_usage " +
                        "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? " +
                        "AND referenced_table_name IS NOT NULL",
                String.class,
                tableName,
                columnName
        ).forEach(constraintName -> {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP FOREIGN KEY " + constraintName);
            log.info("Dropped optional foreign key {} on {}.{}", constraintName, tableName, columnName);
        });
    }

    private boolean indexExists(String indexName) {
        Integer indexCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.statistics " +
                        "WHERE table_schema = DATABASE() AND table_name = 'schedules' AND index_name = ?",
                Integer.class,
                indexName
        );
        return indexCount != null && indexCount > 0;
    }
}
