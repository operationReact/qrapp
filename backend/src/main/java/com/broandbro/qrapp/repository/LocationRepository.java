package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);
    List<Location> findByActiveTrueOrderByNameAsc();

    @Query("""
            select distinct l from Location l
            where (:active is null or l.active = :active)
              and (:state = '' or lower(l.stateUt) = :state)
              and (:city = '' or lower(l.city) = :city)
              and (:country = '' or lower(l.country) = :country)
              and (:customerCompanyId is null or exists (
                  select link.id from LocationCustomerCompany link
                  where link.location = l and link.customerCompany.id = :customerCompanyId
              ))
              and (:search = '' or
                   lower(l.name) like concat('%', :search, '%') or
                   lower(l.code) like concat('%', :search, '%') or
                   lower(coalesce(l.city, '')) like concat('%', :search, '%') or
                   lower(coalesce(l.stateUt, '')) like concat('%', :search, '%') or
                   coalesce(l.pinCode, '') like concat('%', :search, '%'))
            """)
    Page<Location> findForAdminFilters(@Param("active") Boolean active,
                                       @Param("state") String state,
                                       @Param("city") String city,
                                       @Param("country") String country,
                                       @Param("customerCompanyId") Long customerCompanyId,
                                       @Param("search") String search,
                                       Pageable pageable);

    @Query(value = "SELECT nextval('locations_global_code_seq')", nativeQuery = true)
    long nextGlobalCodeSequence();
}
