package com.example.schoolmanagement.controller;

import com.example.schoolmanagement.entity.Role;
import com.example.schoolmanagement.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleService roleService;

    @GetMapping
    public ResponseEntity<?> getRoles(@RequestParam(required = false) String userRole,
                                      @RequestParam(required = false) Integer schoolId) {
        List<Role> roles = roleService.getRolesFiltered(userRole, schoolId);
        return ResponseEntity.ok(Map.of("roles", roles));
    }

    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getRolesBySchool(@PathVariable Integer schoolId) {
        List<Role> roles = roleService.getRolesBySchool(schoolId);
        return ResponseEntity.ok(Map.of("roles", roles));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRole(@PathVariable Integer id) {
        Role role = roleService.getRoleById(id);
        return ResponseEntity.ok(role);
    }

    @PostMapping
    public ResponseEntity<?> createRole(@RequestBody Map<String, Object> roleData) {
        Role savedRole = roleService.createRole(roleData);
        return ResponseEntity.ok(Map.of(
                "message", "Role created successfully",
                "role", savedRole
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRole(@PathVariable Integer id, @RequestBody Map<String, Object> roleData) {
        Role updatedRole = roleService.updateRole(id, roleData);
        return ResponseEntity.ok(Map.of(
                "message", "Role updated successfully",
                "role", updatedRole
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRole(@PathVariable Integer id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(Map.of("message", "Role deleted successfully"));
    }
}
