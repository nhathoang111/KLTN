/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.service.SchoolService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(SchoolController.class)
class SchoolControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SchoolService schoolService;

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void listSchools() throws Exception {
        mockMvc.perform(get("/schools"))
                .andExpect(status().isOk())
                .andExpect(view().name("management/schools"));
    }
}