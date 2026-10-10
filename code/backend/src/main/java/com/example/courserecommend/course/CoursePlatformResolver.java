package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.repository.PlatformRepository;
import com.google.common.net.InternetDomainName;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
@RequiredArgsConstructor
public class CoursePlatformResolver {

    private final PlatformRepository platformRepository;
    private final CourseUrlPolicy courseUrlPolicy;

    public Platform resolve(String url, Long legacyPlatformId) {
        String host = courseUrlPolicy.requireValidHost(url);
        if (host.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "โดเมนของ URL ยาวเกิน 100 ตัวอักษร");
        }
        InternetDomainName domain;
        try {
            domain = InternetDomainName.from(host);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "โดเมนของ URL ไม่ถูกต้อง");
        }
        if (!domain.isUnderPublicSuffix()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาใช้โดเมนเว็บไซต์ที่จดทะเบียนได้");
        }
        String platformHost = domain.topPrivateDomain().toString();
        if (legacyPlatformId != null) {
            Platform selected = platformRepository.findById(legacyPlatformId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่พบ Platform ที่ระบุ"));
            courseUrlPolicy.requireAllowedUrl(url, selected);
            return selected;
        }

        Platform existing = platformRepository.findMatchingHost(host).stream()
                .filter(platform -> platform.getAllowedHost() != null && !platform.getAllowedHost().isBlank())
                .filter(platform -> courseUrlPolicy.matchesHost(host, platform.getAllowedHost()))
                .findFirst()
                .orElse(null);
        if (existing != null) return existing;

        String slug = "site-" + hash(platformHost);
        platformRepository.insertIfMissing(platformHost, slug, platformHost);
        return platformRepository.findByAllowedHost(platformHost)
                .orElseThrow(() -> new IllegalStateException("Platform creation failed"));
    }

    private String hash(String host) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(host.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 12);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
