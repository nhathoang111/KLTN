package com.example.schoolmanagement.security;

import com.example.schoolmanagement.entity.User;
import com.example.schoolmanagement.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String path = request.getRequestURI();
        if (path == null) return true;
        return path.startsWith("/api/auth/")
                || "/".equals(path)
                || "/api/health".equals(path)
                || "/api/test".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            unauthorized(response, "Missing Authorization token");
            return;
        }

        String token = auth.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            unauthorized(response, "Missing Authorization token");
            return;
        }

        try {
            Jws<Claims> jws = jwtService.parse(token);
            Claims claims = jws.getBody();
            Integer userId = claims.get("uid", Integer.class);
            if (userId == null) {
                unauthorized(response, "Invalid token");
                return;
            }

            Optional<User> userOpt = userRepository.findByIdWithSchoolAndRole(userId);
            if (userOpt.isEmpty()) {
                unauthorized(response, "User not found");
                return;
            }

            User u = userOpt.get();
            String status = u.getStatus() != null ? u.getStatus().trim().toUpperCase(Locale.ROOT) : "ACTIVE";
            if (!"ACTIVE".equals(status)) {
                unauthorized(response, "User is inactive");
                return;
            }

            String roleName = u.getRole() != null && u.getRole().getName() != null
                    ? u.getRole().getName().trim().toUpperCase(Locale.ROOT)
                    : "GUEST";

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    u.getId(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + roleName))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JwtException ex) {
            unauthorized(response, "Invalid token");
        }
    }

    private static void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + escapeJson(message) + "\"}");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

