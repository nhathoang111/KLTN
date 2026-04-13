package com.example.schoolmanagement.service.aiquery;

import com.example.schoolmanagement.dto.ai.query.IntentResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class IntentParsingServiceTest {

    private final IntentParsingService parser = new IntentParsingService();

    @Test
    void parse_shouldNotTreatCountingAsStudentName_case1() {
        IntentResult r = parser.parse("10/2 có bao nhiêu học sinh học yếu Tin học");
        assertEquals("CLASS_SUBJECT_RISK_COUNT", r.getIntent());
        assertEquals("10/2", r.getEntities().get("className"));
        assertNotNull(r.getEntities().get("subjectName"));
        assertTrue(r.getEntities().get("subjectName").toLowerCase().contains("tin"));
        assertFalse(r.getEntities().containsKey("studentName"));
    }

    @Test
    void parse_case2() {
        IntentResult r = parser.parse("Lớp 10/2 có mấy học sinh yếu môn Tin học");
        assertEquals("CLASS_SUBJECT_RISK_COUNT", r.getIntent());
        assertEquals("10/2", r.getEntities().get("className"));
        assertNotNull(r.getEntities().get("subjectName"));
    }

    @Test
    void parse_case3() {
        IntentResult r = parser.parse("10/2 có bao nhiêu em dưới trung bình môn Tin học");
        assertEquals("CLASS_SUBJECT_RISK_COUNT", r.getIntent());
        assertEquals("10/2", r.getEntities().get("className"));
        assertNotNull(r.getEntities().get("subjectName"));
    }

    @Test
    void parse_case4() {
        IntentResult r = parser.parse("Môn Tin học lớp 10/2 có bao nhiêu học sinh yếu");
        assertEquals("CLASS_SUBJECT_RISK_COUNT", r.getIntent());
        assertEquals("10/2", r.getEntities().get("className"));
        assertNotNull(r.getEntities().get("subjectName"));
    }

    @Test
    void parse_case5() {
        IntentResult r = parser.parse("10A1 có bao nhiêu học sinh yếu Toán");
        assertEquals("CLASS_SUBJECT_RISK_COUNT", r.getIntent());
        assertEquals("10A1", r.getEntities().get("className"));
        assertNotNull(r.getEntities().get("subjectName"));
    }

    @Test
    void parse_alias_gvcn_shouldMapToHomeroomIntent() {
        IntentResult r = parser.parse("gvcn lớp 10a1 là ai");
        assertEquals("HOMEROOM_LOOKUP", r.getIntent());
        assertEquals("10A1", r.getEntities().get("className"));
    }

    @Test
    void parse_teacher_timetable_shouldUseTeacherTimetableIntent() {
        IntentResult r = parser.parse("tkb hôm nay của giáo viên Nguyễn Văn B");
        assertEquals("ASK_TEACHER_TIMETABLE", r.getIntent());
        assertEquals("Nguyễn Văn B", r.getEntities().get("teacherName"));
    }

    @Test
    void parse_parent_contact_shouldUseParentContactIntent() {
        IntentResult r = parser.parse("sdt phụ huynh học sinh Nguyễn Văn A là gì");
        assertEquals("ASK_PARENT_CONTACT", r.getIntent());
        assertEquals("Nguyễn Văn A", r.getEntities().get("studentName"));
    }

    @Test
    void parse_score_question_shouldExtractSemester() {
        IntentResult r = parser.parse("Điểm Toán của học sinh Nguyễn Văn A trong hk1 là bao nhiêu?");
        assertEquals("ASK_STUDENT_SUBJECT_SCORE", r.getIntent());
        assertEquals("1", r.getEntities().get("semester"));
        assertEquals("Toán", r.getEntities().get("subjectName"));
    }

    @Test
    void parse_unknown_shouldFallbackUnknown() {
        IntentResult r = parser.parse("Hệ thống này chạy bằng công nghệ gì?");
        assertEquals("UNKNOWN", r.getIntent());
    }

    @Test
    void parse_homeroom_question_shouldNotExtractTeacherName_caseAi() {
        IntentResult r = parser.parse("ai là GVCN của 10/5");
        assertEquals("HOMEROOM_LOOKUP", r.getIntent());
        assertEquals("10/5", r.getEntities().get("className"));
        assertFalse(r.getEntities().containsKey("teacherName"));
    }

    @Test
    void parse_homeroom_question_shouldNotExtractTeacherName_caseGiaoVienNao() {
        IntentResult r = parser.parse("lớp 10/5 do giáo viên nào chủ nhiệm");
        assertEquals("HOMEROOM_LOOKUP", r.getIntent());
        assertEquals("10/5", r.getEntities().get("className"));
        assertFalse(r.getEntities().containsKey("teacherName"));
    }

    @Test
    void parse_teacher_assignments_shouldExtractTeacherName() {
        IntentResult r = parser.parse("giáo viên Nguyễn Văn B dạy lớp nào");
        assertEquals("TEACHER_ASSIGNMENTS", r.getIntent());
        assertEquals("Nguyễn Văn B", r.getEntities().get("teacherName"));
    }
}

