/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.School;
import com.example.schoolmanagement.repository.SchoolRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@SpringBootTest
class SchoolServiceTest {
    @Autowired
    private SchoolService schoolService;

    @MockBean
    private SchoolRepository schoolRepository;

    @Test
    void getAllSchools() {
        School school = new School();
        school.setName("Test School");
        when(schoolRepository.findAll()).thenReturn(Arrays.asList(school));
        List<School> schools = schoolService.getAllSchools();
        assertEquals(1, schools.size());
        assertEquals("Test School", schools.get(0).getName());
    }
}