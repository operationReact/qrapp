package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CustomerCompanyRequest;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerCompanyService {
    private final CustomerCompanyRepository companyRepository;
    private final LocationRepository locationRepository;
    private final LocationCustomerCompanyRepository linkRepository;

    public List<CustomerCompany> listAll() {
        return companyRepository.findAllByOrderByNameAsc();
    }

    public List<String> locationNames(Long companyId) {
        return linkRepository.findLocationNamesByCustomerCompanyId(companyId);
    }

    public List<CustomerCompany> listActiveForLocation(Long locationId) {
        requireActiveLocation(locationId);
        return linkRepository.findActiveCompaniesByLocationId(locationId);
    }

    public List<CustomerCompany> listForLocation(Long locationId) {
        requireLocation(locationId);
        return linkRepository.findCompaniesByLocationId(locationId);
    }

    @Transactional
    public CustomerCompany create(CustomerCompanyRequest request) {
        return companyRepository.save(CustomerCompany.builder()
                .name(request.getName().trim())
                .active(request.getActive() == null || request.getActive())
                .build());
    }

    @Transactional
    public CustomerCompany update(Long id, CustomerCompanyRequest request) {
        CustomerCompany company = requireCompany(id);
        company.setName(request.getName().trim());
        if (request.getActive() != null) company.setActive(request.getActive());
        return companyRepository.save(company);
    }

    @Transactional
    public void assign(Long locationId, Long companyId) {
        Location location = requireActiveLocation(locationId);
        CustomerCompany company = requireActiveCompany(companyId);
        if (linkRepository.findByLocationIdAndCustomerCompanyId(locationId, companyId).isEmpty()) {
            linkRepository.save(LocationCustomerCompany.builder()
                    .location(location).customerCompany(company).build());
        }
    }

    @Transactional
    public void remove(Long locationId, Long companyId) {
        linkRepository.findByLocationIdAndCustomerCompanyId(locationId, companyId)
                .ifPresent(linkRepository::delete);
    }

    @Transactional(readOnly = true)
    public CustomerCompany validateRegistration(Long locationId, Long companyId) {
        requireActiveLocation(locationId);
        CustomerCompany company = requireActiveCompany(companyId);
        if (linkRepository.findByLocationIdAndCustomerCompanyId(locationId, companyId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer_company_not_available_for_location");
        }
        return company;
    }

    private CustomerCompany requireCompany(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "customer_company_not_found"));
    }

    private CustomerCompany requireActiveCompany(Long id) {
        return companyRepository.findById(id)
                .filter(company -> Boolean.TRUE.equals(company.getActive()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer_company_inactive_or_not_found"));
    }

    private Location requireLocation(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "location_not_found"));
    }

    private Location requireActiveLocation(Long id) {
        Location location = requireLocation(id);
        if (!Boolean.TRUE.equals(location.getActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "location_inactive");
        }
        return location;
    }
}
