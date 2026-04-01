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
}

