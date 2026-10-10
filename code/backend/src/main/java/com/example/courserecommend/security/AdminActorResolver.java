package com.example.courserecommend.security;

import com.example.courserecommend.domain.entity.User;

public interface AdminActorResolver {
    User requireAdmin();
}
