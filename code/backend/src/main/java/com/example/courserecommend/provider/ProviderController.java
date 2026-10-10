package com.example.courserecommend.provider;

import com.example.courserecommend.provider.dto.CreateProviderRequest;
import com.example.courserecommend.provider.dto.MyProviderResponse;
import com.example.courserecommend.provider.dto.ProviderResponse;
import com.example.courserecommend.provider.dto.UpdateProviderRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/providers")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderService providerService;

    @PostMapping
    public ResponseEntity<ProviderResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateProviderRequest request) {
        ProviderResponse response = providerService.createProvider(authentication.getName(), request);
        URI location = URI.create("/api/v1/providers/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/me")
    public List<MyProviderResponse> findMine(Authentication authentication) {
        return providerService.findMyProviders(authentication.getName());
    }

    @GetMapping("/{id}")
    public ProviderResponse getById(@PathVariable Long id) {
        return providerService.getById(id);
    }

    @GetMapping("/slug/{slug}")
    public ProviderResponse getBySlug(@PathVariable String slug) {
        return providerService.getBySlug(slug);
    }

    @PutMapping("/{id}")
    public ProviderResponse update(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateProviderRequest request) {
        return providerService.updateProvider(authentication.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            Authentication authentication,
            @PathVariable Long id) {
        providerService.deleteProvider(authentication.getName(), id);
    }
}
