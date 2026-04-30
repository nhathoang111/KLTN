CREATE TABLE IF NOT EXISTS enrollment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NULL,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    school_id INT NULL,
    school_year_id INT NULL,
    status VARCHAR(30) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    event_note VARCHAR(500) NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_enrollment_history_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
    CONSTRAINT fk_enrollment_history_student FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT fk_enrollment_history_class FOREIGN KEY (class_id) REFERENCES classes(id),
    CONSTRAINT fk_enrollment_history_school FOREIGN KEY (school_id) REFERENCES schools(id),
    CONSTRAINT fk_enrollment_history_school_year FOREIGN KEY (school_year_id) REFERENCES school_years(id)
);

CREATE INDEX idx_enh_class_school_year ON enrollment_history (class_id, school_year_id);
CREATE INDEX idx_enh_student_school_year ON enrollment_history (student_id, school_year_id);
CREATE INDEX idx_enh_school_year_class ON enrollment_history (school_id, school_year_id, class_id);
CREATE INDEX idx_enh_event_created_at ON enrollment_history (event_type, created_at);
