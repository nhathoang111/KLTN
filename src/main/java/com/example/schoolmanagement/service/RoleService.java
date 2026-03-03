package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.Role;
import com.example.schoolmanagement.exception.BadRequestException;
import com.example.schoolmanagement.exception.ForbiddenException;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.RoleRepository;
import com.example.schoolmanagement.repository.SchoolRepository;
import com.example.schoolmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RoleService {
    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    public List<Role> getRolesFiltered(String userRole, Integer schoolId) {
        if ("SUPER_ADMIN".equals(userRole)) {
            return getAllRoles();
        }
        if ("ADMIN".equals(userRole) && schoolId == null) {
            return getRolesByName("ADMIN");
        }
        if ("ADMIN".equals(userRole) && schoolId != null) {
            return getRolesBySchool(schoolId);
        }
        throw new ForbiddenException("Access denied");
    }

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public List<Role> getRolesBySchool(Integer schoolId) {
        return roleRepository.findBySchoolId(schoolId);
    }

    public Role getRoleById(Integer id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }

    public Role findByNameAndSchool(String name, Integer schoolId) {
        return roleRepository.findByNameAndSchoolId(name, schoolId);
    }

    public boolean isRoleInUse(Integer roleId) {
        return userRepository.countByRoleId(roleId) > 0;
    }

    public Role saveRole(Role role) {
        return roleRepository.save(role);
    }

    public void deleteRole(Integer id) {
        getRoleById(id);
        if (isRoleInUse(id)) {
            throw new BadRequestException("Cannot delete role that is being used by users");
        }
        roleRepository.deleteById(id);
    }
    
    public List<Role> getRolesBySchoolAndName(Integer schoolId, String roleName) {
        return roleRepository.findBySchoolIdAndNamePattern(schoolId, roleName + "%");
    }
    
    public List<Role> getRolesByName(String roleName) {
        return roleRepository.findAllByName(roleName + "%");
    }

    private static Integer parseSchoolId(Object schoolIdObj) {
        if (schoolIdObj == null) return null;
        if (schoolIdObj instanceof Integer) return (Integer) schoolIdObj;
        if (schoolIdObj instanceof String) {
            String s = ((String) schoolIdObj).trim();
            if (s.isEmpty()) return null;
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid school ID format");
            }
        }
        return null;
    }

    public Role createRole(Map<String, Object> roleData) {
        Role role = new Role();
        role.setName((String) roleData.get("name"));
        role.setDescription((String) roleData.get("description"));
        Integer schoolId = parseSchoolId(roleData.get("schoolId"));
        if (schoolId != null) {
            role.setSchool(schoolRepository.findById(schoolId)
                    .orElseThrow(() -> new BadRequestException("Invalid school ID")));
        }
        String roleNameUpper = role.getName() != null ? role.getName().toUpperCase() : "";
        boolean isStandardRole = "ADMIN".equals(roleNameUpper) || "TEACHER".equals(roleNameUpper) || "STUDENT".equals(roleNameUpper);
        if (role.getSchool() != null) {
            Role existing = findByNameAndSchool(role.getName(), role.getSchool().getId());
            if (existing != null) {
                throw new BadRequestException(String.format(
                        "Tên phân quyền \"%s\" đã tồn tại trong trường này. Vui lòng chọn tên khác.", role.getName()));
            }
        } else {
            if (!isStandardRole) {
                boolean exists = getAllRoles().stream()
                        .anyMatch(r -> r.getName() != null && r.getName().equalsIgnoreCase(role.getName()) && r.getSchool() == null);
                if (exists) {
                    throw new BadRequestException(String.format(
                            "Tên phân quyền \"%s\" đã tồn tại trong hệ thống. Vui lòng chọn tên khác.", role.getName()));
                }
            }
        }
        try {
            return saveRole(role);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMessage();
            String name = (String) roleData.get("name");
            if (msg != null && (msg.contains("Duplicate entry") || msg.contains("UKofx66keruapi6vyqpv6f2or37"))) {
                throw new BadRequestException(String.format(
                        "Tên phân quyền \"%s\" đã tồn tại trong hệ thống. Vui lòng chọn tên khác.", name != null ? name : ""));
            }
            throw new BadRequestException("Tên phân quyền đã tồn tại. Vui lòng chọn tên khác.", e);
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg != null && (msg.contains("Duplicate entry") || msg.contains("UKofx66keruapi6vyqpv6f2or37"))) {
                String name = (String) roleData.get("name");
                throw new BadRequestException(String.format(
                        "Tên phân quyền \"%s\" đã tồn tại trong hệ thống. Vui lòng chọn tên khác.", name != null ? name : ""));
            }
            throw new BadRequestException("Không thể tạo phân quyền: " + (msg != null ? msg : "Lỗi không xác định"), e);
        }
    }

    public Role updateRole(Integer id, Map<String, Object> roleData) {
        Role role = getRoleById(id);
        if (roleData.containsKey("name")) role.setName((String) roleData.get("name"));
        if (roleData.containsKey("description")) role.setDescription((String) roleData.get("description"));
        return saveRole(role);
    }
}