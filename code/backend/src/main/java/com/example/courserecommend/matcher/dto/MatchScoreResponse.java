package com.example.courserecommend.matcher.dto;

import java.math.BigDecimal;

public record MatchScoreResponse(String strategy, BigDecimal score) {
}
