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

    @Query("select link.location.name from LocationCustomerCompany link " +
            "where link.customerCompany.id = :companyId order by link.location.name")
    List<String> findLocationNamesByCustomerCompanyId(@Param("companyId") Long companyId);

    /** Delete all location-customer company mappings for a location. */
    @Modifying
    @Query("DELETE FROM LocationCustomerCompany l WHERE l.location.id = :locationId")
    void deleteByLocationId(@Param("locationId") Long locationId);
}
