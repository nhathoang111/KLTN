/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@SpringBootTest
class UserServiceTest {
    @Autowired
    private UserService userService;

    @MockBean
    private UserRepository userRepository;

    @Test
    void getAllUsers() {
        User user = new User();
        user.setFullName("Test User");
        when(userRepository.findAll()).thenReturn(Arrays.asList(user));
        List<User> users = userService.getAllUsers();
        assertEquals(1, users.size());
        assertEquals("Test User", users.get(0).getFullName());
    }
}