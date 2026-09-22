package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.CustomerCompany;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerCompanyRepository extends JpaRepository<CustomerCompany, Long> {
    List<CustomerCompany> findAllByOrderByNameAsc();
}
