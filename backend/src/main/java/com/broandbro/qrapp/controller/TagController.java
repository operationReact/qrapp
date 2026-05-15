package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Tag;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.service.TagService;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;
    private final MenuRepository menuRepository;

    @GetMapping
    public ResponseEntity<List<Tag>> getAllTags() {
        List<Tag> tags = tagService.getAllTags();
        return ResponseEntity.ok(tags);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tag> getTagById(@PathVariable Long id) {
        return tagService.getTagById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<MenuItem>> getMenuItemsByTag(@PathVariable Long id) {
        // Verify tag exists
        if (!tagService.getTagById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        // Get all menu items for this tag
        List<MenuItem> items = menuRepository.findByTagId(id);
        return ResponseEntity.ok(items);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Tag> createTag(@Valid @RequestBody Tag tag) {
        tag.setId(null);
        Tag saved = tagService.createTag(tag);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Tag> updateTag(
            @PathVariable Long id,
            @Valid @RequestBody Tag tag) {
        try {
            Tag updated = tagService.updateTag(id, tag);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTag(@PathVariable Long id) {
        if (!tagService.getTagById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }
}

