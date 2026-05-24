package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    Optional<User> findByToken(String token);

    /** Returns a page of user IDs — used by {@code UserPreferenceScheduler} for batched rebuilds. */
    @Query("SELECT u.id FROM User u ORDER BY u.id ASC")
    List<Long> findAllIds(Pageable pageable);
}
