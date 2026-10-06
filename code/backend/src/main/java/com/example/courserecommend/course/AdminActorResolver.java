package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.User;

public interface AdminActorResolver {
    User requireAdmin();
}
