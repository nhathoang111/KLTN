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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().getName());
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPasswordHash(), Collections.singletonList(authority));
    }
}