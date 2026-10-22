package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.ComboCardResponse;
import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.combo.repository.ComboRepository;
import com.broandbro.qrapp.entity.Location;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComboServiceImpl implements ComboService {

    private final ComboRepository comboRepo;
    private final ComboAvailabilityService availabilityService;

    @Override
    @Cacheable(cacheNames = "combos", key = "'public:' + #locationId")
    public List<ComboCardResponse> getPublicCombos(Long locationId) {
        List<Combo> combos = locationId != null
                ? comboRepo.findAllPublicByLocation(locationId)
                : comboRepo.findAllPublic();
        return combos.stream()
                .map(this::toCardResponse)
                .collect(Collectors.toList());
    }

    private ComboCardResponse toCardResponse(Combo c) {
        var avail = availabilityService.computeAvailability(c);
        List<String> names = c.getItems().stream()
                .map(i -> i.getMenuItem().getName()).collect(Collectors.toList());
        // By construction all of a combo's items share one location, so the
        // first item's location is authoritative for the combo as a whole.
        Long locationId = c.getItems().stream()
                .map(i -> i.getMenuItem().getLocation())
                .filter(Objects::nonNull)
                .map(Location::getId)
                .findFirst()
                .orElse(null);
        return new ComboCardResponse(
                c.getId(), c.getComboName(), c.getComboPrice(), c.getOriginalPrice(),
                c.getSavingsPercentage(),
                Boolean.TRUE.equals(c.getIsFeatured()),
                Boolean.TRUE.equals(c.getIsPreorderEligible()),
                avail, c.getComboType(), c.getImageUrl(), c.getTimeSlot(), names,
                locationId
        );
    }
}
