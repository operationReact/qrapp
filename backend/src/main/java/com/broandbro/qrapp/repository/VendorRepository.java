package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByPhoneNumber(String phoneNumber);
}
