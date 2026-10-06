package com.example.courserecommend.matcher;

public record MatchReason(String code, String message) {
    public MatchReason {
        if (code == null || code.isBlank() || message == null || message.isBlank()) {
            throw new IllegalArgumentException("A reason requires a code and a message");
        }
    }
}
