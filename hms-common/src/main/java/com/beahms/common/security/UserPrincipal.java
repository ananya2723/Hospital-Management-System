package com.beahms.common.security;

import java.util.UUID;

public class UserPrincipal {
    private String userId;
    private String role;
    private Long branchId;

    public UserPrincipal() {
    }

    public UserPrincipal(String userId, String role, Long branchId) {
        this.userId = userId;
        this.role = role;
        this.branchId = branchId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public UUID getUserIdAsUuid() {
        return userId != null ? UUID.fromString(userId) : null;
    }
}
