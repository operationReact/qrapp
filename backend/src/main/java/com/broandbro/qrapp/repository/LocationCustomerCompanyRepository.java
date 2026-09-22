package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.LocationCustomerCompany;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LocationCustomerCompanyRepository extends JpaRepository<LocationCustomerCompany, Long> {
    Optional<LocationCustomerCompany> findByLocationIdAndCustomerCompanyId(Long locationId, Long customerCompanyId);

    @Query("select link.customerCompany from LocationCustomerCompany link " +
            "where link.location.id = :locationId and link.customerCompany.active = true " +
            "order by link.customerCompany.name")
    List<com.broandbro.qrapp.entity.CustomerCompany> findActiveCompaniesByLocationId(@Param("locationId") Long locationId);

    @Query("select link.customerCompany from LocationCustomerCompany link " +
            "where link.location.id = :locationId order by link.customerCompany.name")
    List<com.broandbro.qrapp.entity.CustomerCompany> findCompaniesByLocationId(@Param("locationId") Long locationId);

}
