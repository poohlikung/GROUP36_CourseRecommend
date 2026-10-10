package com.example.courserecommend.catalog;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
public class CatalogRatingRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public CatalogRatingRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<Long, RatingSummary> findPublishedRatings(List<Long> courseIds) {
        if (courseIds.isEmpty()) {
            return Collections.emptyMap();
        }

        String sql = """
                SELECT course_id, AVG(overall_score) AS average_rating, COUNT(*) AS review_count
                FROM reviews
                WHERE status = 'PUBLISHED' AND course_id IN (:courseIds)
                GROUP BY course_id
                """;

        List<RatingSummary> ratings = jdbcTemplate.query(
                sql,
                new MapSqlParameterSource("courseIds", courseIds),
                (resultSet, rowNumber) -> new RatingSummary(
                        resultSet.getLong("course_id"),
                        resultSet.getDouble("average_rating"),
                        resultSet.getLong("review_count")));

        return ratings.stream()
                .collect(Collectors.toMap(RatingSummary::courseId, Function.identity()));
    }

    public record RatingSummary(Long courseId, double averageRating, long reviewCount) {
    }
}
