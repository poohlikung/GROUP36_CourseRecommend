package com.example.courserecommend.catalog.dto;

import com.example.courserecommend.domain.enums.PaymentType;

import java.math.BigDecimal;

public record CatalogPriceResponse(PaymentType paymentType, BigDecimal amount, String currency) {
}
