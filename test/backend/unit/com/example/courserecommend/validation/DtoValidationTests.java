package com.example.courserecommend.validation;

import com.example.courserecommend.auth.dto.LoginRequest;
import com.example.courserecommend.auth.dto.RegisterRequest;
import com.example.courserecommend.fixture.TestFixtures;
import com.example.courserecommend.profile.dto.UpdateProfileRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class DtoValidationTests {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void validFixturesPassValidation() {
        assertThat(validator.validate(TestFixtures.validRegisterRequest())).isEmpty();
        assertThat(validator.validate(TestFixtures.validLoginRequest())).isEmpty();
        assertThat(validator.validate(TestFixtures.validUpdateProfileRequest())).isEmpty();
    }

    @Test
    void invalidRegistrationFieldsAreRejected() {
        RegisterRequest request = new RegisterRequest(
                "not-an-email",
                "short",
                " ");

        Set<ConstraintViolation<RegisterRequest>> violations =
                validator.validate(request);

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email", "password", "displayName");
    }

    @Test
    void blankLoginFieldsAreRejected() {
        LoginRequest request = new LoginRequest("", "");

        Set<ConstraintViolation<LoginRequest>> violations =
                validator.validate(request);

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email", "password");
    }

    @Test
    void oversizedProfileFieldsAreRejected() {
        UpdateProfileRequest request = new UpdateProfileRequest(
                "x".repeat(101),
                "b".repeat(1001));

        Set<ConstraintViolation<UpdateProfileRequest>> violations =
                validator.validate(request);

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("displayName", "bio");
    }
}