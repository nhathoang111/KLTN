package com.example.schoolmanagement.security;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        java.util.List<User> users = userRepository.findAllByEmail(email);
        if (users.isEmpty()) {
            throw new UsernameNotFoundException("User not found: " + email);
        }
        if (users.size() > 1) {
            throw new UsernameNotFoundException("Email belongs to multiple schools: " + email);
        }
        User user = users.get(0);
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().getName());
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPasswordHash(), Collections.singletonList(authority));
    }
}