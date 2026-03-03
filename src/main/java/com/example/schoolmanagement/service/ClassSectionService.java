package com.example.schoolmanagement.service;

import com.example.schoolmanagement.entity.ClassSection;
import com.example.schoolmanagement.exception.ResourceNotFoundException;
import com.example.schoolmanagement.repository.ClassSectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClassSectionService {

    @Autowired
    private ClassSectionRepository classSectionRepository;

    public List<ClassSection> getAll() {
        return classSectionRepository.findAll();
    }

    public ClassSection getById(Integer id) {
        return classSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class section not found with id: " + id));
    }

    public List<ClassSection> getBySchoolId(Integer schoolId) {
        return classSectionRepository.findBySchoolId(schoolId);
    }

    public List<ClassSection> getByClassRoomId(Integer classRoomId) {
        return classSectionRepository.findByClassRoomId(classRoomId);
    }

    public List<ClassSection> getByTeacherId(Integer teacherId) {
        return classSectionRepository.findByTeacherId(teacherId);
    }

    public ClassSection save(ClassSection classSection) {
        return classSectionRepository.save(classSection);
    }
}
