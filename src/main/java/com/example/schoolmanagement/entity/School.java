package com.example.schoolmanagement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "schools")
public class School {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String code;

    private String address; // Địa chỉ chi tiết (số nhà, tên đường)
    private String province; // Tỉnh/Thành phố
    private String district; // Quận/Huyện
    private String ward; // Phường/Xã
    private String phone;
    private String email;
    private String status;

    @Column(length = 2000)
    private String logo; // base64 or URL

    @Column(name = "establishment_year")
    private Integer establishmentYear;

    @Column(name = "management_type", length = 20) // PUBLIC (trường công) / PRIVATE (trường tư)
    private String managementType;

    @Column(name = "score_locked", nullable = false)
    private Boolean scoreLocked = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private Integer studentCount;
    @Transient
    private Integer teacherCount;
    @Transient
    private Integer parentCount;
    @Transient
    private Integer classCount;
    @Transient
    private Integer studentMaleCount;
    @Transient
    private Integer studentFemaleCount;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getWard() { return ward; }
    public void setWard(String ward) { this.ward = ward; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLogo() { return logo; }
    public void setLogo(String logo) { this.logo = logo; }

    public Integer getEstablishmentYear() { return establishmentYear; }
    public void setEstablishmentYear(Integer establishmentYear) { this.establishmentYear = establishmentYear; }

    public String getManagementType() { return managementType; }
    public void setManagementType(String managementType) { this.managementType = managementType; }

    public Boolean getScoreLocked() { return scoreLocked; }
    public void setScoreLocked(Boolean scoreLocked) { this.scoreLocked = scoreLocked; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getStudentCount() { return studentCount; }
    public void setStudentCount(Integer studentCount) { this.studentCount = studentCount; }
    public Integer getTeacherCount() { return teacherCount; }
    public void setTeacherCount(Integer teacherCount) { this.teacherCount = teacherCount; }
    public Integer getParentCount() { return parentCount; }
    public void setParentCount(Integer parentCount) { this.parentCount = parentCount; }
    public Integer getClassCount() { return classCount; }
    public void setClassCount(Integer classCount) { this.classCount = classCount; }
    public Integer getStudentMaleCount() { return studentMaleCount; }
    public void setStudentMaleCount(Integer studentMaleCount) { this.studentMaleCount = studentMaleCount; }
    public Integer getStudentFemaleCount() { return studentFemaleCount; }
    public void setStudentFemaleCount(Integer studentFemaleCount) { this.studentFemaleCount = studentFemaleCount; }
}