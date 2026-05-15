package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Tag;
import com.broandbro.qrapp.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    public Optional<Tag> getTagById(Long id) {
        return tagRepository.findById(id);
    }

    public Optional<Tag> getTagByName(String name) {
        return tagRepository.findByName(name);
    }

    public Tag createTag(Tag tag) {
        return tagRepository.save(tag);
    }

    public Tag updateTag(Long id, Tag tag) {
        return tagRepository.findById(id)
                .map(existing -> {
                    if (tag.getName() != null) existing.setName(tag.getName());
                    return tagRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Tag not found with id: " + id));
    }

    public void deleteTag(Long id) {
        tagRepository.deleteById(id);
    }
}

