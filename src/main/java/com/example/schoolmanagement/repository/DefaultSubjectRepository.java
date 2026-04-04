package com.example.schoolmanagement.repository;

import com.example.schoolmanagement.entity.DefaultSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DefaultSubjectRepository extends JpaRepository<DefaultSubject, Integer> {
    List<DefaultSubject> findAllByOrderBySortIndexAsc();
}

